import asyncio
from collections import Counter

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calculator import Calculator

from app.api.deps import get_current_user, get_db, get_optional_user
from app.models.collection import CollectionEntry
from app.models.follow import Follow
from app.models.user import User
from app.schemas.user import UserMe, UserProfile, UserSearchEntry, UserUpdate
from app.services.storage import upload_image

router = APIRouter(prefix="/users", tags=["users"])


async def _to_search_entries(db: AsyncSession, rows, me: User | None) -> list[UserSearchEntry]:
    """rows: list of (User, owned_count) tuples."""
    user_ids = [u.id for u, _ in rows]
    following_ids: set = set()
    if me and user_ids:
        r = await db.execute(
            select(Follow.following_id).where(Follow.follower_id == me.id, Follow.following_id.in_(user_ids))
        )
        following_ids = {row[0] for row in r.all()}

    follower_counts: dict = {}
    if user_ids:
        r = await db.execute(
            select(Follow.following_id, func.count(Follow.id))
            .where(Follow.following_id.in_(user_ids))
            .group_by(Follow.following_id)
        )
        follower_counts = dict(r.all())

    return [
        UserSearchEntry(
            id=u.id, username=u.username, display_name=u.display_name, bio=u.bio,
            avatar_url=u.avatar_url, location=u.location, website=u.website, created_at=u.created_at,
            owned_count=owned_count, follower_count=follower_counts.get(u.id, 0),
            is_following=u.id in following_ids,
        )
        for u, owned_count in rows
    ]


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


@router.get("/search", response_model=list[UserSearchEntry])
async def search_users(
    q: str,
    db: AsyncSession = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    q = q.strip()
    if len(q) < 2:
        return []
    pattern = f"%{q}%"
    r = await db.execute(
        select(User, func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned"))
        .outerjoin(CollectionEntry, CollectionEntry.user_id == User.id)
        .where(
            User.is_active.is_(True),
            (User.username.ilike(pattern)) | (User.display_name.ilike(pattern)),
        )
        .group_by(User.id)
        .order_by(func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned").desc())
        .limit(20)
    )
    rows = [(u, count or 0) for u, count in r.all() if not me or u.id != me.id]
    return await _to_search_entries(db, rows, me)


@router.get("/suggested", response_model=list[UserSearchEntry])
async def suggested_users(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = 10,
):
    """Top collectors by owned count, excluding self and already-followed users."""
    following_r = await db.execute(select(Follow.following_id).where(Follow.follower_id == me.id))
    excluded = {row[0] for row in following_r.all()} | {me.id}

    r = await db.execute(
        select(User, func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned"))
        .outerjoin(CollectionEntry, CollectionEntry.user_id == User.id)
        .where(User.is_active.is_(True), User.id.notin_(excluded))
        .group_by(User.id)
        .order_by(func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned").desc())
        .limit(limit)
    )
    rows = [(u, count or 0) for u, count in r.all() if count]
    return await _to_search_entries(db, rows, me)


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


@router.get("/{username}/stats")
async def get_user_stats(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Public collection stats for any user."""
    user_r = await db.execute(select(User).where(User.username == username))
    user = user_r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    entries_r = await db.execute(
        select(CollectionEntry, Calculator)
        .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
        .where(
            CollectionEntry.user_id == user.id,
            CollectionEntry.visibility == "public",
        )
    )
    rows = entries_r.all()

    owned = [(e, c) for e, c in rows if e.status == "owned"]
    wanted = [(e, c) for e, c in rows if e.status == "wanted"]

    brand_counts = Counter(c.make for _, c in owned)
    decade_counts: Counter = Counter()
    for _, c in owned:
        if c.year_introduced:
            decade_counts[str((c.year_introduced // 10) * 10) + "s"] += 1

    condition_counts = Counter(e.condition for e, _ in owned if e.condition)
    tag_counts: Counter = Counter()
    for _, c in owned:
        for t in (c.tags or []):
            tag_counts[t] += 1

    prices = [e.acquired_price for e, _ in owned if e.acquired_price]
    rarity_scores = [c.rarity_score for _, c in owned if c.rarity_score is not None]
    weirdness_scores = [c.weirdness_score for _, c in owned if c.weirdness_score is not None]

    return {
        "owned_count": len(owned),
        "wanted_count": len(wanted),
        "total_value": round(sum(prices), 2) if prices else None,
        "avg_price": round(sum(prices) / len(prices), 2) if prices else None,
        "brand_counts": dict(brand_counts.most_common(15)),
        "decade_counts": dict(sorted(decade_counts.items())),
        "condition_counts": dict(condition_counts),
        "top_tags": [{"tag": t, "count": n} for t, n in tag_counts.most_common(20)],
        "avg_rarity": round(sum(rarity_scores) / len(rarity_scores), 1) if rarity_scores else None,
        "avg_weirdness": round(sum(weirdness_scores) / len(weirdness_scores), 1) if weirdness_scores else None,
    }
