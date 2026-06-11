import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = 30,
):
    r = await db.execute(
        select(Notification)
        .where(Notification.user_id == me.id)
        .order_by(desc(Notification.created_at))
        .limit(limit)
    )
    items = r.scalars().all()
    unread = sum(1 for n in items if not n.read)
    return {
        "unread": unread,
        "notifications": [_serialize(n) for n in items],
    }


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    from sqlalchemy import func
    r = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == me.id, Notification.read == False)  # noqa: E712
    )
    return {"count": r.scalar() or 0}


@router.post("/mark-read", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == me.id, Notification.read == False)  # noqa: E712
        .values(read=True)
    )
    await db.commit()


@router.delete("/{notification_id}", status_code=204)
async def dismiss(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == me.id
        )
    )
    n = r.scalar_one_or_none()
    if n:
        await db.delete(n)
        await db.commit()


def _serialize(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "type": n.type,
        "read": n.read,
        "actor_username": n.actor_username,
        "actor_display_name": n.actor_display_name,
        "actor_avatar_url": n.actor_avatar_url,
        "calc_id": str(n.calc_id) if n.calc_id else None,
        "calc_make": n.calc_make,
        "calc_model": n.calc_model,
        "body": n.body,
        "created_at": n.created_at.isoformat(),
    }
