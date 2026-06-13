import hashlib
import uuid

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import distinct, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff, get_current_superuser, get_current_user, get_db
from app.cache import cache_del, cache_get, cache_get_int, cache_incr, cache_set
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.image_submission import ImageSubmission
from app.models.user import User
from app.schemas.calculator import CalculatorCreate, CalculatorPublic, CalculatorUpdate
from app.services.email import notify_calc_added, notify_calc_deleted, notify_calc_updated
from app.services.storage import upload_image

router = APIRouter(prefix="/calculators", tags=["calculators"])


async def _bust_list_cache() -> None:
    """Increment the list-cache version so all cached pages are immediately stale."""
    await cache_incr("calcs:v")


async def _with_counts(db: AsyncSession, calc: Calculator) -> CalculatorPublic:
    """Attach owner/want/variant counts to a single calculator."""
    owner_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.calculator_id == calc.id,
            CollectionEntry.status == "owned",
        )
    )
    want_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.calculator_id == calc.id,
            CollectionEntry.status == "wanted",
        )
    )
    variant_r = await db.execute(
        select(func.count(Calculator.id)).where(Calculator.parent_id == calc.id)
    )
    d = {c.key: getattr(calc, c.key) for c in calc.__table__.columns}
    d["owner_count"] = owner_r.scalar() or 0
    d["want_count"] = want_r.scalar() or 0
    d["variant_count"] = variant_r.scalar() or 0

    # If base has no images, inherit from the first variant that has images
    if not d["images"] and d["variant_count"] > 0:
        vi_r = await db.execute(
            select(Calculator.images).where(
                Calculator.parent_id == calc.id,
                func.json_array_length(Calculator.images) > 0,
            ).limit(1)
        )
        vi = vi_r.scalar_one_or_none()
        if vi:
            d["images"] = vi

    return CalculatorPublic.model_validate(d)


@router.get("", response_model=list[CalculatorPublic])
async def list_calculators(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search by make, model, or description"),
    calc_type: str | None = None,
    make: str | None = None,
    tag: str | None = None,
    decade: int | None = Query(None, description="Filter by decade, e.g. 1970"),
    min_rarity: int | None = Query(None, description="Minimum rarity score (1-10)"),
    max_rarity: int | None = Query(None, description="Maximum rarity score (1-10)"),
    display_type: str | None = Query(None, description="Filter by display technology, e.g. LED"),
    sort: str = Query("make", description="make | year_introduced | rarity_score | weirdness_score | created_at"),
    order: str = Query("asc", description="asc | desc"),
    include_variants: bool = Query(False, description="Include variant/colorway entries (default: hide them)"),
    skip: int = 0,
    limit: int = Query(40, le=500),
):
    # Cache non-search requests (free-text search has too many distinct param combos)
    cache_key: str | None = None
    if not q:
        version = await cache_get_int("calcs:v")
        params_sig = f"{version}|{calc_type}|{make}|{tag}|{decade}|{min_rarity}|{max_rarity}|{display_type}|{sort}|{order}|{include_variants}|{skip}|{limit}"
        cache_key = "calcs:list:" + hashlib.md5(params_sig.encode()).hexdigest()
        hit = await cache_get(cache_key)
        if hit is not None:
            return [CalculatorPublic.model_validate(d) for d in hit]

    stmt = select(Calculator).where(Calculator.status == "approved")

    # By default, only show canonical models (no parent) — keeps browse clean
    if not include_variants:
        stmt = stmt.where(Calculator.parent_id.is_(None))

    if q:
        stmt = stmt.where(or_(
            Calculator.make.ilike(f"%{q}%"),
            Calculator.model.ilike(f"%{q}%"),
            Calculator.description.ilike(f"%{q}%"),
            Calculator.tags.cast(text("text")).ilike(f"%{q}%"),
            Calculator.display_type.ilike(f"%{q}%"),
            Calculator.country_of_origin.ilike(f"%{q}%"),
        ))
    if calc_type:
        stmt = stmt.where(Calculator.calc_type == calc_type)
    if make:
        stmt = stmt.where(Calculator.make.ilike(f"%{make}%"))
    if decade:
        stmt = stmt.where(
            Calculator.year_introduced >= decade,
            Calculator.year_introduced < decade + 10,
        )
    if tag:
        stmt = stmt.where(Calculator.tags.contains([tag]))
    if min_rarity is not None:
        stmt = stmt.where(Calculator.rarity_score >= min_rarity)
    if max_rarity is not None:
        stmt = stmt.where(Calculator.rarity_score <= max_rarity)
    if display_type:
        stmt = stmt.where(Calculator.display_type.ilike(f"%{display_type}%"))

    sort_col = {
        "make": Calculator.make,
        "year_introduced": Calculator.year_introduced,
        "rarity_score": Calculator.rarity_score,
        "weirdness_score": Calculator.weirdness_score,
        "created_at": Calculator.created_at,
    }.get(sort, Calculator.make)

    if order == "desc":
        stmt = stmt.order_by(sort_col.desc().nulls_last(), Calculator.make, Calculator.model)
    else:
        stmt = stmt.order_by(sort_col.asc().nulls_last(), Calculator.make, Calculator.model)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    calcs = result.scalars().all()

    if not calcs:
        return []

    calc_ids = [c.id for c in calcs]
    counts_r = await db.execute(
        select(
            CollectionEntry.calculator_id,
            func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned").label("owner_count"),
            func.count(CollectionEntry.id).filter(CollectionEntry.status == "wanted").label("want_count"),
        )
        .where(CollectionEntry.calculator_id.in_(calc_ids))
        .group_by(CollectionEntry.calculator_id)
    )
    counts_map = {row.calculator_id: (row.owner_count, row.want_count) for row in counts_r}

    # Batch variant counts
    variants_r = await db.execute(
        select(Calculator.parent_id, func.count(Calculator.id).label("cnt"))
        .where(Calculator.parent_id.in_(calc_ids))
        .group_by(Calculator.parent_id)
    )
    variants_map = {row.parent_id: row.cnt for row in variants_r}

    # For base calcs with no images, inherit from the first variant that has images
    imageless_variant_ids = [
        c.id for c in calcs if not c.images and variants_map.get(c.id, 0) > 0
    ]
    variant_image_map: dict = {}
    if imageless_variant_ids:
        vi_r = await db.execute(
            select(Calculator.parent_id, Calculator.images)
            .where(
                Calculator.parent_id.in_(imageless_variant_ids),
                func.json_array_length(Calculator.images) > 0,
            )
        )
        for row in vi_r:
            if row.images and row.parent_id not in variant_image_map:
                variant_image_map[row.parent_id] = row.images

    out = []
    for calc in calcs:
        owner_count, want_count = counts_map.get(calc.id, (0, 0))
        d = {c.key: getattr(calc, c.key) for c in calc.__table__.columns}
        d["owner_count"] = owner_count
        d["want_count"] = want_count
        d["variant_count"] = variants_map.get(calc.id, 0)
        if not d["images"] and calc.id in variant_image_map:
            d["images"] = variant_image_map[calc.id]
        out.append(CalculatorPublic.model_validate(d))

    if cache_key:
        await cache_set(cache_key, [p.model_dump(mode="json") for p in out], ttl=60)
    return out


@router.get("/random", response_model=CalculatorPublic)
async def get_random(db: AsyncSession = Depends(get_db)):
    """Return a random calculator (parent models only)."""
    result = await db.execute(
        select(Calculator)
        .where(Calculator.parent_id.is_(None))
        .order_by(func.random())
        .limit(1)
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="No calculators found")
    return await _with_counts(db, calc)


@router.get("/daily", response_model=CalculatorPublic)
async def get_daily(db: AsyncSession = Depends(get_db)):
    """Return the featured calc if one is pinned, else the daily rotating pick."""
    # Prefer admin-pinned calc
    featured_r = await db.execute(
        select(Calculator).where(Calculator.is_featured.is_(True)).limit(1)
    )
    calc = featured_r.scalar_one_or_none()

    if not calc:
        from datetime import date as _date
        day_num = (_date.today() - _date(2024, 1, 1)).days
        count_r = await db.execute(
            select(func.count(Calculator.id)).where(Calculator.parent_id.is_(None))
        )
        total = count_r.scalar() or 1
        offset = day_num % total
        result = await db.execute(
            select(Calculator)
            .where(Calculator.parent_id.is_(None))
            .order_by(Calculator.id)
            .offset(offset)
            .limit(1)
        )
        calc = result.scalar_one_or_none()

    if not calc:
        raise HTTPException(status_code=404, detail="No calculators found")
    return await _with_counts(db, calc)


@router.get("/brands", response_model=list[dict])
async def list_brands(db: AsyncSession = Depends(get_db)):
    """Return all brands with calc counts and a sample image."""
    hit = await cache_get("calcs:brands")
    if hit is not None:
        return hit

    # Counts in one query
    count_r = await db.execute(
        select(Calculator.make, func.count(Calculator.id).label("count"))
        .where(Calculator.parent_id.is_(None))
        .group_by(Calculator.make)
        .order_by(func.count(Calculator.id).desc())
    )
    brands: dict[str, dict] = {
        row.make: {"make": row.make, "count": row.count, "image": None, "flagship": None}
        for row in count_r
    }

    # Best image per brand in one query using DISTINCT ON (PostgreSQL)
    img_r = await db.execute(
        select(Calculator.make, Calculator.images, Calculator.model)
        .distinct(Calculator.make)
        .where(
            Calculator.parent_id.is_(None),
            func.json_array_length(Calculator.images) > 0,
        )
        .order_by(Calculator.make, Calculator.rarity_score.desc().nulls_last())
    )
    for row in img_r:
        if row.make in brands:
            brands[row.make]["image"] = row.images[0]
            brands[row.make]["flagship"] = row.model

    result = list(brands.values())
    await cache_set("calcs:brands", result, ttl=300)
    return result


@router.get("/makes", response_model=list[str])
async def list_makes(db: AsyncSession = Depends(get_db)):
    hit = await cache_get("calcs:makes")
    if hit is not None:
        return hit
    result = await db.execute(
        select(distinct(Calculator.make))
        .where(Calculator.parent_id.is_(None))
        .order_by(Calculator.make)
    )
    makes = [row[0] for row in result.all()]
    await cache_set("calcs:makes", makes, ttl=300)
    return makes


@router.get("/tags", response_model=list[str])
async def list_tags(db: AsyncSession = Depends(get_db)):
    hit = await cache_get("calcs:tags")
    if hit is not None:
        return hit
    result = await db.execute(
        select(Calculator.tags).where(Calculator.parent_id.is_(None))
    )
    tag_set: set[str] = set()
    for (tags,) in result.all():
        if tags:
            tag_set.update(tags)
    tags_list = sorted(tag_set)
    await cache_set("calcs:tags", tags_list, ttl=300)
    return tags_list


@router.get("/batch", response_model=list[CalculatorPublic])
async def batch_get_calculators(
    ids: str = Query(..., description="Comma-separated calculator IDs"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch multiple calculators by ID in a single request."""
    id_list = []
    for raw in ids.split(","):
        raw = raw.strip()
        if raw:
            try:
                id_list.append(uuid.UUID(raw))
            except ValueError:
                pass
    if not id_list:
        return []

    result = await db.execute(select(Calculator).where(Calculator.id.in_(id_list)))
    calcs = result.scalars().all()
    if not calcs:
        return []

    calc_ids = [c.id for c in calcs]
    counts_r = await db.execute(
        select(
            CollectionEntry.calculator_id,
            func.count(CollectionEntry.id).filter(CollectionEntry.status == "owned").label("owner_count"),
            func.count(CollectionEntry.id).filter(CollectionEntry.status == "wanted").label("want_count"),
        )
        .where(CollectionEntry.calculator_id.in_(calc_ids))
        .group_by(CollectionEntry.calculator_id)
    )
    counts_map = {row.calculator_id: (row.owner_count, row.want_count) for row in counts_r}

    variants_r = await db.execute(
        select(Calculator.parent_id, func.count(Calculator.id).label("cnt"))
        .where(Calculator.parent_id.in_(calc_ids))
        .group_by(Calculator.parent_id)
    )
    variants_map = {row.parent_id: row.cnt for row in variants_r}

    imageless_variant_ids = [
        c.id for c in calcs if not c.images and variants_map.get(c.id, 0) > 0
    ]
    variant_image_map: dict = {}
    if imageless_variant_ids:
        vi_r = await db.execute(
            select(Calculator.parent_id, Calculator.images)
            .where(
                Calculator.parent_id.in_(imageless_variant_ids),
                func.json_array_length(Calculator.images) > 0,
            )
        )
        for row in vi_r:
            if row.images and row.parent_id not in variant_image_map:
                variant_image_map[row.parent_id] = row.images

    out = []
    for calc in calcs:
        owner_count, want_count = counts_map.get(calc.id, (0, 0))
        d = {c.key: getattr(calc, c.key) for c in calc.__table__.columns}
        d["owner_count"] = owner_count
        d["want_count"] = want_count
        d["variant_count"] = variants_map.get(calc.id, 0)
        if not d["images"] and calc.id in variant_image_map:
            d["images"] = variant_image_map[calc.id]
        out.append(CalculatorPublic.model_validate(d))
    return out


@router.get("/related/{calc_id}", response_model=list[CalculatorPublic])
async def get_related(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    stmt = (
        select(Calculator)
        .where(Calculator.id != calc_id)
        .where(Calculator.parent_id.is_(None))
        .where(or_(Calculator.make == calc.make, Calculator.calc_type == calc.calc_type))
        .order_by(
            (Calculator.make != calc.make).asc(),
            Calculator.year_introduced.desc().nulls_last(),
        )
        .limit(6)
    )
    result = await db.execute(stmt)
    related = result.scalars().all()
    return [
        CalculatorPublic.model_validate(
            {c.key: getattr(r, c.key) for c in r.__table__.columns} | {"owner_count": 0, "want_count": 0, "variant_count": 0}
        )
        for r in related
    ]


@router.get("/{calc_id}/variants", response_model=list[CalculatorPublic])
async def get_variants(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return all variant/colorway entries for a given parent calculator."""
    result = await db.execute(
        select(Calculator)
        .where(Calculator.parent_id == calc_id)
        .order_by(Calculator.year_introduced.asc().nulls_last(), Calculator.variant_label)
    )
    variants = result.scalars().all()
    return [
        CalculatorPublic.model_validate(
            {c.key: getattr(v, c.key) for c in v.__table__.columns}
            | {"owner_count": 0, "want_count": 0, "variant_count": 0}
        )
        for v in variants
    ]


@router.get("/rss")
async def rss_feed(db: AsyncSession = Depends(get_db)):
    """RSS feed of the 50 most recently added base calculators."""
    result = await db.execute(
        select(Calculator)
        .where(Calculator.parent_id.is_(None))
        .order_by(Calculator.created_at.desc())
        .limit(50)
    )
    calcs = result.scalars().all()

    def esc(s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    items = []
    for c in calcs:
        img_tag = f'<img src="{c.images[0]}" style="max-width:400px;"/>' if c.images else ""
        desc = esc(c.description or "")
        pub = c.created_at.strftime("%a, %d %b %Y %H:%M:%S +0000")
        items.append(
            f"  <item>\n"
            f"    <title>{esc(c.make)} {esc(c.model)}</title>\n"
            f"    <link>https://curiocalc.org/calculators/{c.id}</link>\n"
            f"    <description><![CDATA[{img_tag}<p>{desc}</p>]]></description>\n"
            f"    <pubDate>{pub}</pubDate>\n"
            f"    <guid isPermaLink=\"true\">https://curiocalc.org/calculators/{c.id}</guid>\n"
            f"  </item>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '  <channel>\n'
        '    <title>CurioCalc — New Calculators</title>\n'
        '    <link>https://curiocalc.org</link>\n'
        '    <atom:link href="https://api.curiocalc.org/api/v1/calculators/rss"'
        ' rel="self" type="application/rss+xml"/>\n'
        '    <description>Latest calculators added to the CurioCalc database</description>\n'
        '    <language>en-us</language>\n'
        '    <ttl>60</ttl>\n'
        + "\n".join(items) + "\n"
        '  </channel>\n'
        '</rss>'
    )
    return Response(content=xml, media_type="application/rss+xml; charset=utf-8")


@router.get("/{calc_id}/wiki-description")
async def fetch_wiki_description(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_staff),
):
    """Fetch a description for this calculator from Wikipedia (staff only)."""
    calc_r = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = calc_r.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    query = f"{calc.make} {calc.model}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "titles": query,
                    "prop": "extracts",
                    "exintro": "true",
                    "explaintext": "true",
                    "format": "json",
                    "redirects": "true",
                },
            )
            data = r.json()
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            if pid != "-1":
                extract = (page.get("extract") or "").strip()
                if extract:
                    # Trim to intro paragraph only
                    extract = extract.split("\n\n")[0].strip()[:800]
                    return {"description": extract, "title": page.get("title")}
    except Exception:
        pass
    return {"description": None, "title": None}


@router.get("/{calc_id}/also-owned", response_model=list[CalculatorPublic])
async def get_also_owned(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Calculators most frequently co-owned by collectors who own this one."""
    owners_sub = (
        select(CollectionEntry.user_id)
        .where(
            CollectionEntry.calculator_id == calc_id,
            CollectionEntry.status == "owned",
        )
        .scalar_subquery()
    )
    rows_r = await db.execute(
        select(CollectionEntry.calculator_id, func.count().label("cnt"))
        .where(
            CollectionEntry.user_id.in_(owners_sub),
            CollectionEntry.calculator_id != calc_id,
            CollectionEntry.status == "owned",
        )
        .group_by(CollectionEntry.calculator_id)
        .order_by(func.count().desc())
        .limit(6)
    )
    ids = [row.calculator_id for row in rows_r]
    if not ids:
        return []
    result = await db.execute(
        select(Calculator)
        .where(Calculator.id.in_(ids))
        .where(Calculator.parent_id.is_(None))
    )
    calcs = {c.id: c for c in result.scalars().all()}
    return [
        CalculatorPublic.model_validate(
            {col.key: getattr(calcs[cid], col.key) for col in calcs[cid].__table__.columns}
            | {"owner_count": 0, "want_count": 0, "variant_count": 0}
        )
        for cid in ids if cid in calcs
    ]


@router.post("", response_model=CalculatorPublic, status_code=status.HTTP_201_CREATED)
async def create_calculator(
    payload: CalculatorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_staff = current_user.is_superuser or current_user.is_curator
    calc_status = "approved" if is_staff else "pending"
    calc = Calculator(**payload.model_dump(), added_by_user_id=current_user.id, status=calc_status)
    db.add(calc)
    await db.commit()
    await db.refresh(calc)
    if is_staff:
        await notify_calc_added(calc.make, calc.model, str(calc.id), current_user.username)
        await _bust_list_cache()
        await cache_del("calcs:brands", "calcs:makes", "calcs:tags")
    return await _with_counts(db, calc)


@router.get("/{calc_id}", response_model=CalculatorPublic)
async def get_calculator(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")
    return await _with_counts(db, calc)


@router.patch("/{calc_id}", response_model=CalculatorPublic)
async def update_calculator(
    calc_id: uuid.UUID,
    payload: CalculatorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(calc, field, value)

    await db.commit()
    await db.refresh(calc)
    await notify_calc_updated(calc.make, calc.model, str(calc.id), current_user.username)
    await _bust_list_cache()
    await cache_del("calcs:brands", "calcs:makes", "calcs:tags")
    return await _with_counts(db, calc)


@router.delete("/{calc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calculator(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")
    make, model = calc.make, calc.model
    await db.delete(calc)
    await db.commit()
    await notify_calc_deleted(make, model, current_user.username)
    await _bust_list_cache()
    await cache_del("calcs:brands", "calcs:makes", "calcs:tags")


@router.post("/{calc_id}/images", response_model=CalculatorPublic)
async def upload_calculator_image(
    calc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    url = await upload_image(file, folder=f"calculators/{calc_id}")
    calc.images = [*calc.images, url]

    await db.commit()
    await db.refresh(calc)
    return await _with_counts(db, calc)


@router.post("/{calc_id}/submit-image", status_code=204)
async def submit_image_for_review(
    calc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any logged-in user can submit a photo for staff review."""
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    url = await upload_image(file, folder=f"submissions/{calc_id}")
    submission = ImageSubmission(
        calculator_id=calc_id,
        submitted_by_id=current_user.id,
        image_url=url,
    )
    db.add(submission)
    await db.commit()
