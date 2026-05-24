from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.collection import CollectionEntry
from app.schemas.user import UserPublic, UserUpdate, UserMe, UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMe)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/{username}", response_model=UserProfile)
async def get_user(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    owned_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.user_id == user.id,
            CollectionEntry.status == "owned",
            CollectionEntry.visibility == "public",
        )
    )
    wanted_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.user_id == user.id,
            CollectionEntry.status == "wanted",
            CollectionEntry.visibility == "public",
        )
    )

    return UserProfile(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        location=user.location,
        website=user.website,
        created_at=user.created_at,
        owned_count=owned_r.scalar() or 0,
        wanted_count=wanted_r.scalar() or 0,
    )
