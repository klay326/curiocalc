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
from app.services.push import send_push_to_user
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


async def _notify_wishers_for_sale(
    db: AsyncSession, calc_id: Any, calc: Any, seller: User
) -> None:
    """Notify users who want this calc that it's now for sale."""
    wishers_r = await db.execute(
        select(CollectionEntry.user_id)
        .where(
            CollectionEntry.calculator_id == calc_id,
            CollectionEntry.status == "wanted",
            CollectionEntry.user_id != seller.id,
        )
        .limit(50)
    )
    wisher_ids = [row[0] for row in wishers_r.all()]
    for wid in wisher_ids:
        db.add(Notification(
            user_id=wid,
            type="for_sale",
            actor_id=seller.id,
            actor_username=seller.username,
            actor_display_name=seller.display_name,
            actor_avatar_url=seller.avatar_url,
            calc_id=calc.id,
            calc_make=calc.make,
            calc_model=calc.model,
            body=f"@{seller.username} listed it for sale",
        ))
    if wisher_ids:
        await db.commit()
        for wid in wisher_ids:
            await send_push_to_user(
                wid, db,
                f"{calc.make} {calc.model} is for sale",
                f"@{seller.username} listed it",
                data={"url": f"/calculators/{calc.id}"},
            )


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

    if payload.status == "for_sale":
        calc_r = await db.execute(select(Calculator).where(Calculator.id == payload.calculator_id))
        calc = calc_r.scalar_one_or_none()
        if calc:
            await _notify_wishers_for_sale(db, payload.calculator_id, calc, current_user)

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

    await db.commit()

    # When a calc goes for sale, notify everyone who has it on their wishlist
    now_for_sale = entry.status == "for_sale" and not was_for_sale
    if now_for_sale:
        calc_r = await db.execute(select(Calculator).where(Calculator.id == entry.calculator_id))
        calc = calc_r.scalar_one_or_none()
        if calc:
            await _notify_wishers_for_sale(db, entry.calculator_id, calc, current_user)
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


@router.get("/trade-matches")
async def get_trade_matches(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Users who own something I want AND want something I own or have for sale."""
    my_wanted_r = await db.execute(
        select(CollectionEntry.calculator_id)
        .where(CollectionEntry.user_id == me.id, CollectionEntry.status == "wanted")
    )
    my_wanted_ids = [r[0] for r in my_wanted_r.all()]

    my_have_r = await db.execute(
        select(CollectionEntry.calculator_id)
        .where(CollectionEntry.user_id == me.id, CollectionEntry.status.in_(["owned", "for_sale"]))
    )
    my_have_ids = [r[0] for r in my_have_r.all()]

    if not my_wanted_ids or not my_have_ids:
        return []

    givers_r = await db.execute(
        select(CollectionEntry.user_id, CollectionEntry.calculator_id)
        .where(
            CollectionEntry.calculator_id.in_(my_wanted_ids),
            CollectionEntry.status.in_(["owned", "for_sale"]),
            CollectionEntry.user_id != me.id,
        )
    )
    takers_r = await db.execute(
        select(CollectionEntry.user_id, CollectionEntry.calculator_id)
        .where(
            CollectionEntry.calculator_id.in_(my_have_ids),
            CollectionEntry.status == "wanted",
            CollectionEntry.user_id != me.id,
        )
    )

    from collections import defaultdict
    giver_map: dict = defaultdict(list)
    for uid, cid in givers_r.all():
        giver_map[uid].append(cid)
    taker_map: dict = defaultdict(list)
    for uid, cid in takers_r.all():
        taker_map[uid].append(cid)

    mutual_ids = set(giver_map.keys()) & set(taker_map.keys())
    if not mutual_ids:
        return []

    users_r = await db.execute(select(User).where(User.id.in_(mutual_ids)))
    users_map = {u.id: u for u in users_r.scalars().all()}

    all_calc_ids = list({c for cids in list(giver_map.values()) + list(taker_map.values()) for c in cids})
    calcs_r = await db.execute(select(Calculator).where(Calculator.id.in_(all_calc_ids)))
    calcs_map = {c.id: c for c in calcs_r.scalars().all()}

    result = []
    for uid in mutual_ids:
        u = users_map.get(uid)
        if not u:
            continue

        def calc_info(cid, _map=calcs_map):
            c = _map.get(cid)
            return {"id": str(cid), "make": c.make, "model": c.model, "images": c.images or []} if c else None

        they_have = [x for x in (calc_info(c) for c in giver_map[uid]) if x]
        they_want = [x for x in (calc_info(c) for c in taker_map[uid]) if x]
        result.append({
            "user_id": str(uid),
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "they_have": they_have,
            "they_want": they_want,
        })

    return sorted(result, key=lambda x: len(x["they_have"]) + len(x["they_want"]), reverse=True)
