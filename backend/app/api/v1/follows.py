import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.follow import Follow
from app.models.collection import CollectionEntry
from app.models.calculator import Calculator
from app.schemas.user import UserPublic

router = APIRouter(tags=["follows"])


@router.post("/users/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    db.add(Follow(follower_id=me.id, following_id=target.id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()  # already following — treat as no-op


@router.delete("/users/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    r = await db.execute(
        select(Follow).where(Follow.follower_id == me.id, Follow.following_id == target.id)
    )
    follow = r.scalar_one_or_none()
    if follow:
        await db.delete(follow)
        await db.commit()


@router.get("/users/{username}/followers", response_model=list[UserPublic])
async def list_followers(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    r = await db.execute(
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == user.id)
        .order_by(desc(Follow.created_at))
    )
    return r.scalars().all()


@router.get("/users/{username}/following", response_model=list[UserPublic])
async def list_following(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    r = await db.execute(
        select(User)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == user.id)
        .order_by(desc(Follow.created_at))
    )
    return r.scalars().all()


@router.get("/feed")
async def get_feed(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = 40,
    skip: int = 0,
):
    """Recent collection activity from users I follow."""
    following_ids_r = await db.execute(
        select(Follow.following_id).where(Follow.follower_id == me.id)
    )
    following_ids = [row[0] for row in following_ids_r.all()]

    if not following_ids:
        return []

    r = await db.execute(
        select(CollectionEntry, User, Calculator)
        .join(User, User.id == CollectionEntry.user_id)
        .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
        .where(
            CollectionEntry.user_id.in_(following_ids),
            CollectionEntry.visibility == "public",
        )
        .order_by(desc(CollectionEntry.created_at))
        .limit(limit)
        .offset(skip)
    )
    rows = r.all()

    return [
        {
            "id": str(entry.id),
            "status": entry.status,
            "condition": entry.condition,
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat(),
            "user": {
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
            },
            "calculator": {
                "id": str(calc.id),
                "make": calc.make,
                "model": calc.model,
                "calc_type": calc.calc_type,
                "images": calc.images or [],
                "year_introduced": calc.year_introduced,
            },
        }
        for entry, user, calc in rows
    ]
