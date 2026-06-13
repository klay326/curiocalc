import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.models.collection import CollectionEntry
from app.models.follow import Follow
from app.models.user import User
from app.schemas.user import UserMe, UserProfile, UserUpdate
from app.services.storage import upload_image

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


@router.post("/me/avatar", response_model=UserMe)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a profile avatar image — replaces any existing avatar."""
    url = await upload_image(file, folder=f"avatars/{current_user.id}")
    current_user.avatar_url = url
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/collection-photos", response_model=UserMe)
async def upload_collection_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a shelf/collection photo for the current user."""
    photos = list(current_user.collection_photos or [])
    if len(photos) >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 shelf photos allowed")
    url = await upload_image(file, folder=f"shelf/{current_user.id}")
    current_user.collection_photos = [*photos, url]
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me/collection-photos/{index}", response_model=UserMe)
async def remove_collection_photo(
    index: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a shelf photo by index."""
    photos = list(current_user.collection_photos or [])
    if index < 0 or index >= len(photos):
        raise HTTPException(status_code=404, detail="Photo not found")
    photos.pop(index)
    current_user.collection_photos = photos
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/{username}", response_model=UserProfile)
async def get_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    owned_r, wanted_r, follower_r, following_r = await asyncio.gather(
        db.execute(
            select(func.count(CollectionEntry.id)).where(
                CollectionEntry.user_id == user.id,
                CollectionEntry.status == "owned",
                CollectionEntry.visibility == "public",
            )
        ),
        db.execute(
            select(func.count(CollectionEntry.id)).where(
                CollectionEntry.user_id == user.id,
                CollectionEntry.status == "wanted",
                CollectionEntry.visibility == "public",
            )
        ),
        db.execute(
            select(func.count(Follow.id)).where(Follow.following_id == user.id)
        ),
        db.execute(
            select(func.count(Follow.id)).where(Follow.follower_id == user.id)
        ),
    )

    is_following = False
    if me and me.id != user.id:
        r = await db.execute(
            select(Follow.id).where(Follow.follower_id == me.id, Follow.following_id == user.id)
        )
        is_following = r.scalar_one_or_none() is not None

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
        follower_count=follower_r.scalar() or 0,
        following_count=following_r.scalar() or 0,
        is_following=is_following,
        collection_photos=user.collection_photos or [],
        showcase_ids=user.showcase_ids or [],
    )
