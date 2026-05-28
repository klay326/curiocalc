"""Admin-only endpoints — require superuser token."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_superuser
from app.models.user import User
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    now = datetime.utcnow()
    today_start  = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago     = now - timedelta(days=7)
    month_ago    = now - timedelta(days=30)

    # ── User stats ───────────────────────────────────────────────────
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    users_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )).scalar() or 0
    users_week = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )).scalar() or 0
    users_month = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )).scalar() or 0

    # Recent signups
    recent_users_r = await db.execute(
        select(User.id, User.username, User.email, User.created_at, User.is_superuser)
        .order_by(User.created_at.desc())
        .limit(20)
    )
    recent_users = [
        {
            "id": str(row.id),
            "username": row.username,
            "email": row.email,
            "created_at": row.created_at.isoformat(),
            "is_superuser": row.is_superuser,
        }
        for row in recent_users_r
    ]

    # ── Calc stats ───────────────────────────────────────────────────
    total_calcs = (await db.execute(select(func.count(Calculator.id)))).scalar() or 0
    calcs_week = (await db.execute(
        select(func.count(Calculator.id)).where(Calculator.created_at >= week_ago)
    )).scalar() or 0
    calcs_month = (await db.execute(
        select(func.count(Calculator.id)).where(Calculator.created_at >= month_ago)
    )).scalar() or 0

    # Recent calc additions
    recent_calcs_r = await db.execute(
        select(Calculator.id, Calculator.make, Calculator.model, Calculator.created_at)
        .order_by(Calculator.created_at.desc())
        .limit(10)
    )
    recent_calcs = [
        {
            "id": str(row.id),
            "make": row.make,
            "model": row.model,
            "created_at": row.created_at.isoformat(),
        }
        for row in recent_calcs_r
    ]

    # ── Collection stats ─────────────────────────────────────────────
    total_entries = (await db.execute(select(func.count(CollectionEntry.id)))).scalar() or 0
    entries_week  = (await db.execute(
        select(func.count(CollectionEntry.id)).where(CollectionEntry.created_at >= week_ago)
    )).scalar() or 0

    # Top collectors (by owned count)
    top_collectors_r = await db.execute(
        select(
            User.username,
            User.display_name,
            func.count(CollectionEntry.id).label("owned"),
        )
        .join(CollectionEntry, CollectionEntry.user_id == User.id)
        .where(CollectionEntry.status == "owned")
        .group_by(User.id, User.username, User.display_name)
        .order_by(func.count(CollectionEntry.id).desc())
        .limit(10)
    )
    top_collectors = [
        {"username": row.username, "display_name": row.display_name, "owned": row.owned}
        for row in top_collectors_r
    ]

    # Most collected calculators
    most_collected_r = await db.execute(
        select(
            Calculator.id,
            Calculator.make,
            Calculator.model,
            func.count(CollectionEntry.id).label("total"),
        )
        .join(CollectionEntry, CollectionEntry.calculator_id == Calculator.id)
        .where(CollectionEntry.status == "owned")
        .group_by(Calculator.id, Calculator.make, Calculator.model)
        .order_by(func.count(CollectionEntry.id).desc())
        .limit(10)
    )
    most_collected = [
        {"id": str(row.id), "make": row.make, "model": row.model, "total": row.total}
        for row in most_collected_r
    ]

    # ── Calc types breakdown ─────────────────────────────────────────
    types_r = await db.execute(
        select(Calculator.calc_type, func.count(Calculator.id).label("cnt"))
        .group_by(Calculator.calc_type)
        .order_by(func.count(Calculator.id).desc())
    )
    calc_types = [{"type": row.calc_type, "count": row.cnt} for row in types_r]

    return {
        "users": {
            "total": total_users,
            "new_today": users_today,
            "new_this_week": users_week,
            "new_this_month": users_month,
            "recent": recent_users,
        },
        "calculators": {
            "total": total_calcs,
            "added_this_week": calcs_week,
            "added_this_month": calcs_month,
            "recent_additions": recent_calcs,
            "by_type": calc_types,
        },
        "collections": {
            "total_entries": total_entries,
            "new_this_week": entries_week,
            "top_collectors": top_collectors,
            "most_collected": most_collected,
        },
    }
