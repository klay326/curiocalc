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

VERB = {
    "owned": "added to collection",
    "wanted": "added to wishlist",
    "for_sale": "listed for sale",
}


def _render_digest(activity: list, for_sale: list[dict]) -> str:
    """Build a styled HTML email body."""
    rows = ""
    for entry, user, calc in activity[:15]:
        verb = VERB.get(entry.status, entry.status)
        url = f"https://curiocalc.org/calculators/{calc.id}"
        badge_color = {"owned": "#d97706", "wanted": "#6366f1", "for_sale": "#16a34a"}.get(entry.status, "#9ca3af")
        rows += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
            <span style="font-family:monospace;font-size:13px;color:#111827;font-weight:600;">@{user.username}</span>
            <span style="font-family:monospace;font-size:12px;color:#6b7280;"> {verb}</span><br>
            <a href="{url}" style="font-family:monospace;font-size:13px;color:#d97706;text-decoration:none;">
              {calc.make} {calc.model}
            </a>
            <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;font-family:monospace;font-weight:600;color:#fff;background:{badge_color};">{entry.status.replace('_',' ')}</span>
          </td>
        </tr>"""

    activity_section = f"""
    <h2 style="font-family:monospace;font-size:14px;color:#374151;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">
      Collector activity
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
    """ if rows else ""

    sale_rows = ""
    for item in for_sale:
        price = f" &mdash; <strong>${item['price']}</strong>" if item.get("price") else ""
        url = f"https://curiocalc.org/calculators/{item.get('calc_id', '')}"
        sale_rows += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <a href="{url}" style="font-family:monospace;font-size:13px;color:#d97706;font-weight:600;text-decoration:none;">
              {item['make']} {item['model']}
            </a>{price}<br>
            <span style="font-family:monospace;font-size:12px;color:#6b7280;">listed by @{item['seller']}</span>
          </td>
        </tr>"""

    sale_section = f"""
    <h2 style="font-family:monospace;font-size:14px;color:#374151;text-transform:uppercase;letter-spacing:0.08em;margin:24px 0 8px;">
      Wishlist items now for sale
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0">{sale_rows}</table>
    """ if sale_rows else ""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1c1917;padding:28px 32px;">
            <span style="font-family:monospace;font-size:20px;font-weight:700;color:#f59e0b;">Curio</span><span style="font-family:monospace;font-size:20px;font-weight:700;color:#ffffff;">Calc</span>
            <span style="font-family:monospace;font-size:12px;color:#78716c;margin-left:12px;">weekly digest</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            {activity_section}
            {sale_section}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-family:monospace;font-size:11px;color:#9ca3af;">
              You're receiving this because you have an account at
              <a href="https://curiocalc.org" style="color:#d97706;text-decoration:none;">curiocalc.org</a>.
              &nbsp;&middot;&nbsp;
              <a href="https://curiocalc.org/settings" style="color:#d97706;text-decoration:none;">Manage preferences</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def _build_digest_for(user: User, db: AsyncSession) -> dict | None:
    since = datetime.utcnow() - timedelta(days=7)

    following_r = await db.execute(select(Follow.following_id).where(Follow.follower_id == user.id))
    following_ids = [r[0] for r in following_r.all()]
    if not following_ids:
        return None

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
                "make": calc.make,
                "model": calc.model,
                "calc_id": str(calc.id),
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

    html = _render_digest(data["activity"], data["for_sale"])
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
    return await _dispatch_all(db)


@router.post("/send-all-cron")
async def send_all_digests_cron(
    secret: str,
    db: AsyncSession = Depends(get_db),
):
    """Called by the server cron job — verified by DIGEST_SECRET, no user auth required."""
    if not settings.DIGEST_SECRET or secret != settings.DIGEST_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    return await _dispatch_all(db)


async def _dispatch_all(db: AsyncSession) -> dict:
    users_r = await db.execute(select(User).where(User.is_active.is_(True)))
    users = users_r.scalars().all()

    sent = 0
    for user in users:
        if not user.notification_prefs.get("email_digest", True):
            continue
        if not user.email:
            continue
        data = await _build_digest_for(user, db)
        if not data:
            continue
        html = _render_digest(data["activity"], data["for_sale"])
        try:
            await _send_to(user.email, "Your CurioCalc weekly digest", html)
            sent += 1
        except Exception:
            pass

    return {"sent": sent, "total": len(users)}
