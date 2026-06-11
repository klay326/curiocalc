import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.cache import cache_del, cache_get, cache_set
from app.models.user import User
from app.schemas.user import UserCreate, UserMe
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.email import notify_new_user, send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=UserMe, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already taken")

    user = User(
        email=payload.email,
        username=payload.username,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        theme=payload.theme,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await notify_new_user(user.username, user.email)

    # Send email verification on signup
    token = secrets.token_urlsafe(32)
    await cache_set(f"email_verify:{token}", str(user.id), ttl=86400)
    await send_verification_email(user.email, token)

    return user


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = decode_token(payload.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=204)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    # Always return 204 to avoid email enumeration
    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        await cache_set(f"pwd_reset:{token}", str(user.id), ttl=3600)
        await send_password_reset_email(user.email, token)


@router.post("/reset-password", status_code=204)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user_id = await cache_get(f"pwd_reset:{payload.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    await cache_del(f"pwd_reset:{payload.token}")


# ── Email verification ────────────────────────────────────────────────────────

@router.post("/send-verification", status_code=204)
async def send_verification(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    token = secrets.token_urlsafe(32)
    await cache_set(f"email_verify:{token}", str(current_user.id), ttl=86400)
    await send_verification_email(current_user.email, token)


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email", status_code=204)
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    user_id = await cache_get(f"email_verify:{payload.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.is_verified = True
    await db.commit()
    await cache_del(f"email_verify:{payload.token}")
