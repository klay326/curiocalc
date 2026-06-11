import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.notification import Notification
from app.models.user import User
from app.schemas.collection import (
    CollectionEntryCreate,
    CollectionEntryPublic,
    CollectionEntryUpdate,
)
from app.services.storage import upload_image

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/me", response_model=list[CollectionEntryPublic])
async def get_my_collection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CollectionEntry).where(CollectionEntry.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/users/{username}", response_model=list[CollectionEntryPublic])
async def get_user_collection(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(CollectionEntry).where(
            CollectionEntry.user_id == user.id,
            CollectionEntry.visibility == "public",
        )
    )
    return result.scalars().all()


@router.post("", response_model=CollectionEntryPublic, status_code=status.HTTP_201_CREATED)
async def add_to_collection(
    payload: CollectionEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = CollectionEntry(**payload.model_dump(), user_id=current_user.id)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=CollectionEntryPublic)
async def update_collection_entry(
    entry_id: uuid.UUID,
    payload: CollectionEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CollectionEntry).where(CollectionEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    was_for_sale = entry.status == "for_sale"
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(entry, field, value)

    # When a calc goes for sale, notify everyone who has it on their wishlist
    now_for_sale = entry.status == "for_sale" and not was_for_sale
    if now_for_sale:
        calc_r = await db.execute(select(Calculator).where(Calculator.id == entry.calculator_id))
        calc = calc_r.scalar_one_or_none()
        if calc:
            wishers_r = await db.execute(
                select(CollectionEntry.user_id)
                .where(
                    CollectionEntry.calculator_id == entry.calculator_id,
                    CollectionEntry.status == "wanted",
                    CollectionEntry.user_id != current_user.id,
                )
                .limit(50)
            )
            for (wisher_id,) in wishers_r.all():
                db.add(Notification(
                    user_id=wisher_id,
                    type="for_sale",
                    actor_id=current_user.id,
                    actor_username=current_user.username,
                    actor_display_name=current_user.display_name,
                    actor_avatar_url=current_user.avatar_url,
                    calc_id=calc.id,
                    calc_make=calc.make,
                    calc_model=calc.model,
                    body=f"@{current_user.username} listed it for sale",
                ))

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_collection(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CollectionEntry).where(CollectionEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)
    await db.commit()


@router.post("/{entry_id}/photos", response_model=CollectionEntryPublic)
async def upload_entry_photo(
    entry_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CollectionEntry).where(CollectionEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    url = await upload_image(file, folder=f"collection/{entry_id}")
    entry.photos = [*entry.photos, url]

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}/photos/{index}", response_model=CollectionEntryPublic)
async def delete_entry_photo(
    entry_id: uuid.UUID,
    index: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CollectionEntry).where(CollectionEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")
    photos = list(entry.photos)
    if index < 0 or index >= len(photos):
        raise HTTPException(status_code=400, detail="Invalid photo index")
    entry.photos = [p for i, p in enumerate(photos) if i != index]
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/wanted", response_model=list[dict[str, Any]])
async def get_wanted_listings(db: AsyncSession = Depends(get_db)):
    """Public wishlist items — community demand board."""
    result = await db.execute(
        select(CollectionEntry, User, Calculator)
        .join(User, User.id == CollectionEntry.user_id)
        .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
        .where(
            CollectionEntry.status == "wanted",
            CollectionEntry.visibility == "public",
        )
        .order_by(CollectionEntry.created_at.desc())
        .limit(200)
    )
    rows = result.all()
    out = []
    for entry, user, calc in rows:
        out.append({
            "entry_id": str(entry.id),
            "calculator_id": str(calc.id),
            "make": calc.make,
            "model": calc.model,
            "images": calc.images,
            "calc_type": calc.calc_type,
            "year_introduced": calc.year_introduced,
            "notes": entry.notes,
            "wisher_username": user.username,
            "wisher_display_name": user.display_name,
            "wisher_avatar": user.avatar_url,
            "wanted_since": entry.created_at.isoformat(),
        })
    return out


@router.get("/for-sale", response_model=list[dict[str, Any]])
async def get_for_sale_listings(db: AsyncSession = Depends(get_db)):
    """All public for-sale listings with basic calculator + seller info."""
    result = await db.execute(
        select(CollectionEntry, User, Calculator)
        .join(User, User.id == CollectionEntry.user_id)
        .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
        .where(
            CollectionEntry.status == "for_sale",
            CollectionEntry.visibility == "public",
        )
        .order_by(CollectionEntry.created_at.desc())
        .limit(100)
    )
    rows = result.all()
    out = []
    for entry, user, calc in rows:
        out.append({
            "entry_id": str(entry.id),
            "calculator_id": str(calc.id),
            "make": calc.make,
            "model": calc.model,
            "images": calc.images,
            "calc_type": calc.calc_type,
            "year_introduced": calc.year_introduced,
            "condition": entry.condition,
            "notes": entry.notes,
            "acquired_price": entry.acquired_price,
            "seller_username": user.username,
            "seller_display_name": user.display_name,
            "seller_avatar": user.avatar_url,
            "listed_at": entry.created_at.isoformat(),
        })
    return out
