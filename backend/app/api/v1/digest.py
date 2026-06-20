from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.follow import Follow
from app.models.user import User
from app.services.email import _send_to

router = APIRouter(prefix="/digest", tags=["digest"])


async def _build_digest_for(user: User, db: AsyncSession) -> dict | None:
    since = datetime.utcnow() - timedelta(days=7)

    # People I follow
    following_r = await db.execute(select(Follow.following_id).where(Follow.follower_id == user.id))
    following_ids = [r[0] for r in following_r.all()]
    if not following_ids:
        return None

    # Their activity in the past week
    activity_r = await db.execute(
        select(CollectionEntry, User, Calculator)
        .join(User, User.id == CollectionEntry.user_id)
        .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
        .where(
            CollectionEntry.user_id.in_(following_ids),
            CollectionEntry.visibility == "public",
            CollectionEntry.created_at >= since,
        )
        .order_by(desc(CollectionEntry.created_at))
        .limit(20)
    )
    activity = activity_r.all()
    if not activity:
        return None

    # New calcs added to my wishlist that are now for sale
    my_wanted_r = await db.execute(
        select(CollectionEntry.calculator_id).where(
            CollectionEntry.user_id == user.id,
            CollectionEntry.status == "wanted",
        )
    )
    my_wanted_ids = [r[0] for r in my_wanted_r.all()]

    new_for_sale: list[dict] = []
    if my_wanted_ids:
        for_sale_r = await db.execute(
            select(CollectionEntry, User, Calculator)
            .join(User, User.id == CollectionEntry.user_id)
            .join(Calculator, Calculator.id == CollectionEntry.calculator_id)
            .where(
                CollectionEntry.calculator_id.in_(my_wanted_ids),
                CollectionEntry.status == "for_sale",
                CollectionEntry.visibility == "public",
                CollectionEntry.created_at >= since,
            )
            .limit(5)
        )
        for entry, seller, calc in for_sale_r.all():
            new_for_sale.append({
                "make": calc.make, "model": calc.model,
                "seller": seller.username,
                "price": entry.acquired_price,
            })

    return {"activity": activity, "for_sale": new_for_sale}


@router.post("/send-me")
async def send_my_digest(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Send the weekly digest to the current user on demand."""
    data = await _build_digest_for(me, db)
    if not data:
        return {"sent": False, "reason": "Nothing to report — follow some collectors first"}

    activity = data["activity"]
    for_sale = data["for_sale"]

    lines = ["<h2 style='font-family:monospace'>Your CurioCalc Week</h2>"]
    lines.append("<h3 style='font-family:monospace'>Activity from people you follow</h3><ul>")
    for entry, user, calc in activity[:15]:
        verb = {"owned": "added to collection", "wanted": "added to wishlist", "for_sale": "listed for sale"}.get(entry.status, entry.status)
        lines.append(f"<li><b>@{user.username}</b> {verb}: <a href='https://curiocalc.org/calculators/{calc.id}'>{calc.make} {calc.model}</a></li>")
    lines.append("</ul>")

    if for_sale:
        lines.append("<h3 style='font-family:monospace'>Wishlist items now for sale</h3><ul>")
        for item in for_sale:
            price = f" — ${item['price']}" if item['price'] else ""
            lines.append(f"<li><b>{item['make']} {item['model']}</b> listed by @{item['seller']}{price}</li>")
        lines.append("</ul>")

    lines.append("<p style='font-family:monospace;color:#888;font-size:12px'>You're receiving this because you have an account at curiocalc.org. <a href='https://curiocalc.org/settings'>Manage preferences</a></p>")

    html = "\n".join(lines)
    await _send_to(me.email, "Your CurioCalc weekly digest", html)
    return {"sent": True}


@router.post("/send-all")
async def send_all_digests(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Admin-only: send weekly digest to all active users."""
    if not me.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser only")

    users_r = await db.execute(select(User).where(User.is_active.is_(True)))
    users = users_r.scalars().all()

    sent = 0
    for user in users:
        data = await _build_digest_for(user, db)
        if not data:
            continue
        activity = data["activity"]
        for_sale = data["for_sale"]

        lines = ["<h2 style='font-family:monospace'>Your CurioCalc Week</h2>"]
        lines.append("<h3 style='font-family:monospace'>Activity from people you follow</h3><ul>")
        for entry, u, calc in activity[:10]:
            verb = {"owned": "added to collection", "wanted": "added to wishlist", "for_sale": "listed for sale"}.get(entry.status, entry.status)
            lines.append(f"<li><b>@{u.username}</b> {verb}: <a href='https://curiocalc.org/calculators/{calc.id}'>{calc.make} {calc.model}</a></li>")
        lines.append("</ul>")
        if for_sale:
            lines.append("<h3 style='font-family:monospace'>Wishlist items now for sale</h3><ul>")
            for item in for_sale:
                price = f" — ${item['price']}" if item['price'] else ""
                lines.append(f"<li><b>{item['make']} {item['model']}</b> listed by @{item['seller']}{price}</li>")
            lines.append("</ul>")
        lines.append("<p style='font-family:monospace;color:#888;font-size:12px'>You're receiving this because you have an account at curiocalc.org. <a href='https://curiocalc.org/settings'>Manage preferences</a></p>")

        try:
            await _send_to(user.email, "Your CurioCalc weekly digest", "\n".join(lines))
            sent += 1
        except Exception:
            pass

    return {"sent": sent, "total": len(users)}


@router.post("/send-all-cron")
async def send_all_digests_cron(
    secret: str,
    db: AsyncSession = Depends(get_db),
):
    """Called by the server cron job — verified by DIGEST_SECRET, no user auth required."""
    if not settings.DIGEST_SECRET or secret != settings.DIGEST_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")

    users_r = await db.execute(select(User).where(User.is_active.is_(True)))
    users = users_r.scalars().all()

    sent = 0
    for user in users:
        data = await _build_digest_for(user, db)
        if not data:
            continue
        activity = data["activity"]
        for_sale = data["for_sale"]

        lines = ["<h2 style='font-family:monospace'>Your CurioCalc Week</h2>"]
        lines.append("<h3 style='font-family:monospace'>Activity from people you follow</h3><ul>")
        for entry, u, calc in activity[:10]:
            verb = {"owned": "added to collection", "wanted": "added to wishlist", "for_sale": "listed for sale"}.get(entry.status, entry.status)
            lines.append(f"<li><b>@{u.username}</b> {verb}: <a href='https://curiocalc.org/calculators/{calc.id}'>{calc.make} {calc.model}</a></li>")
        lines.append("</ul>")
        if for_sale:
            lines.append("<h3 style='font-family:monospace'>Wishlist items now for sale</h3><ul>")
            for item in for_sale:
                price = f" — ${item['price']}" if item['price'] else ""
                lines.append(f"<li><b>{item['make']} {item['model']}</b> listed by @{item['seller']}{price}</li>")
            lines.append("</ul>")
        lines.append("<p style='font-family:monospace;color:#888;font-size:12px'>You're receiving this because you have an account at curiocalc.org. <a href='https://curiocalc.org/settings'>Manage preferences</a></p>")

        try:
            await _send_to(user.email, "Your CurioCalc weekly digest", "\n".join(lines))
            sent += 1
        except Exception:
            pass

    return {"sent": sent, "total": len(users)}
