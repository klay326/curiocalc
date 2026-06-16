import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.trade_offer import TradeOffer
from app.models.user import User

router = APIRouter(prefix="/trade-offers", tags=["trade-offers"])


class TradeOfferCreate(BaseModel):
    to_username: str
    offering_ids: list[str]
    requesting_ids: list[str]
    message: str | None = None


class TradeOfferAction(BaseModel):
    action: str


def _serialize(offer: TradeOffer, from_user: User, to_user: User) -> dict:
    return {
        "id": str(offer.id),
        "from_user_id": str(offer.from_user_id),
        "to_user_id": str(offer.to_user_id),
        "from_username": from_user.username,
        "from_display_name": from_user.display_name,
        "to_username": to_user.username,
        "to_display_name": to_user.display_name,
        "offering_ids": json.loads(offer.offering_ids),
        "requesting_ids": json.loads(offer.requesting_ids),
        "message": offer.message,
        "status": offer.status,
        "created_at": offer.created_at.isoformat(),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_offer(
    payload: TradeOfferCreate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(select(User).where(User.username == payload.to_username))
    recipient = r.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    if recipient.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot send offer to yourself")
    if not payload.offering_ids and not payload.requesting_ids:
        raise HTTPException(status_code=422, detail="Offer must include at least one calculator")

    offer = TradeOffer(
        from_user_id=me.id,
        to_user_id=recipient.id,
        offering_ids=json.dumps(payload.offering_ids),
        requesting_ids=json.dumps(payload.requesting_ids),
        message=payload.message,
        status="pending",
    )
    db.add(offer)
    await db.commit()
    await db.refresh(offer)
    return _serialize(offer, me, recipient)


@router.get("/count")
async def pending_count(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(
        select(TradeOffer).where(
            TradeOffer.to_user_id == me.id,
            TradeOffer.status == "pending",
        )
    )
    offers = r.scalars().all()
    return {"pending_received": len(offers)}


@router.get("")
async def list_offers(
    direction: str = "all",
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if direction == "sent":
        condition = TradeOffer.from_user_id == me.id
    elif direction == "received":
        condition = TradeOffer.to_user_id == me.id
    else:
        condition = or_(TradeOffer.from_user_id == me.id, TradeOffer.to_user_id == me.id)

    r = await db.execute(
        select(TradeOffer).where(condition).order_by(TradeOffer.created_at.desc())
    )
    offers = r.scalars().all()

    user_ids = set()
    for o in offers:
        user_ids.add(o.from_user_id)
        user_ids.add(o.to_user_id)

    users_r = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_by_id = {u.id: u for u in users_r.scalars().all()}

    result = []
    for o in offers:
        from_user = users_by_id.get(o.from_user_id)
        to_user = users_by_id.get(o.to_user_id)
        if from_user and to_user:
            result.append(_serialize(o, from_user, to_user))
    return result


@router.patch("/{offer_id}")
async def respond_to_offer(
    offer_id: uuid.UUID,
    payload: TradeOfferAction,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(select(TradeOffer).where(TradeOffer.id == offer_id))
    offer = r.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    action = payload.action
    if action in ("accept", "decline"):
        if offer.to_user_id != me.id:
            raise HTTPException(status_code=403, detail="Only the recipient can accept or decline")
        if offer.status != "pending":
            raise HTTPException(status_code=400, detail="Offer is no longer pending")
        offer.status = "accepted" if action == "accept" else "declined"
    elif action == "withdraw":
        if offer.from_user_id != me.id:
            raise HTTPException(status_code=403, detail="Only the sender can withdraw")
        if offer.status != "pending":
            raise HTTPException(status_code=400, detail="Offer is no longer pending")
        offer.status = "withdrawn"
    else:
        raise HTTPException(status_code=422, detail="action must be accept, decline, or withdraw")

    await db.commit()
    await db.refresh(offer)

    from_r = await db.execute(select(User).where(User.id == offer.from_user_id))
    from_user = from_r.scalar_one()
    to_r = await db.execute(select(User).where(User.id == offer.to_user_id))
    to_user = to_r.scalar_one()
    return _serialize(offer, from_user, to_user)
