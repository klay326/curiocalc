import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.cache import rate_limit_check
from app.models.calculator import Calculator
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/messages", tags=["messages"])


class MessageCreate(BaseModel):
    recipient_username: str
    body: str
    calc_id: uuid.UUID | None = None


class MessagePublic(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_username: str
    sender_display_name: str | None
    sender_avatar_url: str | None
    recipient_id: uuid.UUID
    recipient_username: str
    recipient_display_name: str | None
    calc_id: uuid.UUID | None
    calc_make: str | None
    calc_model: str | None
    body: str
    read: bool
    created_at: str

    model_config = {"from_attributes": True}


def _serialize(msg: Message, sender: User, recipient: User) -> dict:
    return {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "sender_username": sender.username,
        "sender_display_name": sender.display_name,
        "sender_avatar_url": sender.avatar_url,
        "recipient_id": str(msg.recipient_id),
        "recipient_username": recipient.username,
        "recipient_display_name": recipient.display_name,
        "calc_id": str(msg.calc_id) if msg.calc_id else None,
        "calc_make": msg.calc_make,
        "calc_model": msg.calc_model,
        "body": msg.body,
        "read": msg.read,
        "created_at": msg.created_at.isoformat(),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if not await rate_limit_check(f"rl:message:{me.id}", max_requests=30, window=300):
        raise HTTPException(status_code=429, detail="Too many messages. Please slow down.")

    recipient_r = await db.execute(select(User).where(User.username == payload.recipient_username))
    recipient = recipient_r.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    if not payload.body.strip():
        raise HTTPException(status_code=422, detail="Message body cannot be empty")

    calc_make = calc_model = None
    if payload.calc_id:
        calc_r = await db.execute(select(Calculator).where(Calculator.id == payload.calc_id))
        calc = calc_r.scalar_one_or_none()
        if calc:
            calc_make, calc_model = calc.make, calc.model

    msg = Message(
        sender_id=me.id,
        recipient_id=recipient.id,
        calc_id=payload.calc_id,
        calc_make=calc_make,
        calc_model=calc_model,
        body=payload.body.strip(),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return _serialize(msg, me, recipient)


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Group all messages by the other participant — one row per conversation."""
    r = await db.execute(
        select(Message).where(
            or_(Message.sender_id == me.id, Message.recipient_id == me.id),
        ).order_by(Message.created_at.desc())
    )
    messages = r.scalars().all()
    messages = [
        m for m in messages
        if not ((m.sender_id == me.id and m.deleted_by_sender) or (m.recipient_id == me.id and m.deleted_by_recipient))
    ]

    other_ids: set[uuid.UUID] = set()
    for m in messages:
        other_ids.add(m.recipient_id if m.sender_id == me.id else m.sender_id)

    if not other_ids:
        return []

    users_r = await db.execute(select(User).where(User.id.in_(other_ids)))
    users_by_id = {u.id: u for u in users_r.scalars().all()}

    conversations: dict[uuid.UUID, dict] = {}
    for m in messages:
        other_id = m.recipient_id if m.sender_id == me.id else m.sender_id
        other = users_by_id.get(other_id)
        if not other:
            continue
        if other_id not in conversations:
            conversations[other_id] = {
                "username": other.username,
                "display_name": other.display_name,
                "avatar_url": other.avatar_url,
                "last_body": m.body,
                "last_created_at": m.created_at.isoformat(),
                "last_from_me": m.sender_id == me.id,
                "unread_count": 0,
            }
        if m.recipient_id == me.id and not m.read:
            conversations[other_id]["unread_count"] += 1

    return sorted(conversations.values(), key=lambda c: c["last_created_at"], reverse=True)


@router.get("/thread/{username}")
async def get_thread(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Full chronological message history with one other user; marks their messages as read."""
    other_r = await db.execute(select(User).where(User.username == username))
    other = other_r.scalar_one_or_none()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    r = await db.execute(
        select(Message).where(
            or_(
                (Message.sender_id == me.id) & (Message.recipient_id == other.id),
                (Message.sender_id == other.id) & (Message.recipient_id == me.id),
            )
        ).order_by(Message.created_at.asc())
    )
    messages = r.scalars().all()
    messages = [
        m for m in messages
        if not ((m.sender_id == me.id and m.deleted_by_sender) or (m.recipient_id == me.id and m.deleted_by_recipient))
    ]

    unread_ids = [m.id for m in messages if m.recipient_id == me.id and not m.read]
    if unread_ids:
        for m in messages:
            if m.id in unread_ids:
                m.read = True
        await db.commit()

    return [_serialize(m, me if m.sender_id == me.id else other, other if m.sender_id == me.id else me) for m in messages]


@router.get("/inbox")
async def inbox(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = 50,
):
    r = await db.execute(
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .where(Message.recipient_id == me.id, Message.deleted_by_recipient == False)  # noqa: E712
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = r.all()
    recipient = me  # we are the recipient in inbox
    result = []
    for msg, sender in rows:
        result.append(_serialize(msg, sender, recipient))
    unread = sum(1 for msg, _ in rows if not msg.read)
    return {"unread": unread, "messages": result}


@router.get("/sent")
async def sent(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = 50,
):
    r = await db.execute(
        select(Message, User)
        .join(User, User.id == Message.recipient_id)
        .where(Message.sender_id == me.id, Message.deleted_by_sender == False)  # noqa: E712
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = r.all()
    result = []
    for msg, recipient in rows:
        result.append(_serialize(msg, me, recipient))
    return result


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(
        select(func.count(Message.id)).where(
            Message.recipient_id == me.id,
            Message.read == False,  # noqa: E712
            Message.deleted_by_recipient == False,  # noqa: E712
        )
    )
    return {"count": r.scalar() or 0}


@router.patch("/{message_id}/read", status_code=204)
async def mark_read(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(select(Message).where(Message.id == message_id))
    msg = r.scalar_one_or_none()
    if not msg or msg.recipient_id != me.id:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.read = True
    await db.commit()


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(select(Message).where(Message.id == message_id))
    msg = r.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id == me.id:
        msg.deleted_by_sender = True
    elif msg.recipient_id == me.id:
        msg.deleted_by_recipient = True
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Hard-delete if both sides deleted
    if msg.deleted_by_sender and msg.deleted_by_recipient:
        await db.delete(msg)
    await db.commit()
