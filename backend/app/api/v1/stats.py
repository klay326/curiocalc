from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from datetime import datetime, timedelta, timezone

from app.api.deps import get_db
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.user import User
from app.cache import cache_get, cache_set

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
async def get_stats(db: AsyncSession = Depends(get_db)):
    hit = await cache_get("stats:global")
    if hit is not None:
        return hit

    # Count only base models (parent_id IS NULL) — variants are part of the same model
    total_calcs   = (await db.execute(
        select(func.count(Calculator.id)).where(Calculator.parent_id.is_(None))
    )).scalar() or 0
    total_brands  = (await db.execute(select(func.count(distinct(Calculator.make))))).scalar() or 0
    total_users   = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_owned   = (await db.execute(
        select(func.count(CollectionEntry.id)).where(CollectionEntry.status == "owned")
    )).scalar() or 0
    with_images   = (await db.execute(
        select(func.count(Calculator.id)).where(
            func.json_array_length(Calculator.images) > 0
        )
    )).scalar() or 0
    with_desc     = (await db.execute(
        select(func.count(Calculator.id)).where(Calculator.description.isnot(None))
    )).scalar() or 0

    # Top 8 brands by calc count (base models only)
    top_brands_r = await db.execute(
        select(Calculator.make, func.count(Calculator.id).label("cnt"))
        .where(Calculator.parent_id.is_(None))
        .group_by(Calculator.make)
        .order_by(func.count(Calculator.id).desc())
        .limit(8)
    )
    top_brands = [{"make": row.make, "count": row.cnt} for row in top_brands_r]

    # Decade breakdown (base models only)
    decades_r = await db.execute(
        select(
            (func.floor(Calculator.year_introduced / 10) * 10).label("decade"),
            func.count(Calculator.id).label("cnt"),
        )
        .where(Calculator.year_introduced.isnot(None), Calculator.parent_id.is_(None))
        .group_by("decade")
        .order_by("decade")
    )
    decades = [{"decade": int(row.decade), "count": row.cnt} for row in decades_r]

    # Recent additions (last 8, base models only)
    recent_r = await db.execute(
        select(Calculator)
        .where(Calculator.parent_id.is_(None))
        .order_by(Calculator.created_at.desc())
        .limit(8)
    )
    from app.schemas.calculator import CalculatorPublic
    recent = [
        CalculatorPublic.model_validate(
            {c.key: getattr(r, c.key) for c in r.__table__.columns}
            | {"owner_count": 0, "want_count": 0, "variant_count": 0}
        ).model_dump(mode="json")
        for r in recent_r.scalars().all()
    ]

    result = {
        "total_calcs": total_calcs,
        "total_brands": total_brands,
        "total_users": total_users,
        "total_owned": total_owned,
        "with_images": with_images,
        "with_descriptions": with_desc,
        "top_brands": top_brands,
        "decades": decades,
        "recent": recent,
    }
    await cache_set("stats:global", result, 300)   # 5-min TTL
    return result


@router.get("/trending")
async def get_trending(db: AsyncSession = Depends(get_db)):
    hit = await cache_get("stats:trending")
    if hit is not None:
        return hit

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    from app.schemas.calculator import CalculatorPublic

    async def fetch_calcs(ids: list) -> list:
        if not ids:
            return []
        result = await db.execute(select(Calculator).where(Calculator.id.in_(ids)))
        calcs = {c.id: c for c in result.scalars().all()}
        out = []
        for cid in ids:
            c = calcs.get(cid)
            if c:
                try:
                    out.append(CalculatorPublic.model_validate(
                        {col.key: getattr(c, col.key) for col in c.__table__.columns}
                        | {"owner_count": 0, "want_count": 0, "variant_count": 0}
                    ).model_dump(mode="json"))
                except Exception:
                    pass
        return out

    # Most added to owned collections this week
    owned_r = await db.execute(
        select(CollectionEntry.calculator_id, func.count(CollectionEntry.id).label("cnt"))
        .where(CollectionEntry.created_at >= week_ago, CollectionEntry.status == "owned")
        .group_by(CollectionEntry.calculator_id)
        .order_by(func.count(CollectionEntry.id).desc())
        .limit(12)
    )
    trending_owned_ids = [row.calculator_id for row in owned_r]

    # Most wanted this week
    wanted_r = await db.execute(
        select(CollectionEntry.calculator_id, func.count(CollectionEntry.id).label("cnt"))
        .where(CollectionEntry.created_at >= week_ago, CollectionEntry.status == "wanted")
        .group_by(CollectionEntry.calculator_id)
        .order_by(func.count(CollectionEntry.id).desc())
        .limit(12)
    )
    trending_wanted_ids = [row.calculator_id for row in wanted_r]

    # Newest additions to the DB (base models only)
    new_r = await db.execute(
        select(Calculator)
        .where(Calculator.parent_id.is_(None))
        .order_by(Calculator.created_at.desc())
        .limit(12)
    )
    new_calcs_raw = new_r.scalars().all()
    new_calcs = []
    for c in new_calcs_raw:
        try:
            new_calcs.append(CalculatorPublic.model_validate(
                {col.key: getattr(c, col.key) for col in c.__table__.columns}
                | {"owner_count": 0, "want_count": 0, "variant_count": 0}
            ).model_dump(mode="json"))
        except Exception:
            pass

    trending_owned = await fetch_calcs(trending_owned_ids)
    trending_wanted = await fetch_calcs(trending_wanted_ids)

    result = {
        "trending_owned": trending_owned,
        "trending_wanted": trending_wanted,
        "new_this_week": new_calcs,
    }
    await cache_set("stats:trending", result, 180)  # 3-min TTL
    return result
