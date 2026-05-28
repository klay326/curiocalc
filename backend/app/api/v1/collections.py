from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import Any

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.schemas.collection import CollectionEntryCreate, CollectionEntryUpdate, CollectionEntryPublic
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

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(entry, field, value)

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
