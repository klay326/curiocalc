import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.api.deps import get_db, get_current_user
from app.models.message import Message
from app.models.user import User
from app.models.calculator import Calculator

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
