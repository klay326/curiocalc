from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, distinct
import uuid

from app.api.deps import get_db, get_current_user, get_current_superuser
from app.models.user import User
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.schemas.calculator import CalculatorCreate, CalculatorUpdate, CalculatorPublic
from app.services.storage import upload_image

router = APIRouter(prefix="/calculators", tags=["calculators"])


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
    return CalculatorPublic.model_validate(d)


@router.get("", response_model=list[CalculatorPublic])
async def list_calculators(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search by make, model, or description"),
    calc_type: str | None = None,
    make: str | None = None,
    tag: str | None = None,
    decade: int | None = Query(None, description="Filter by decade, e.g. 1970"),
    sort: str = Query("make", description="make | year_introduced | rarity_score | weirdness_score | created_at"),
    order: str = Query("asc", description="asc | desc"),
    include_variants: bool = Query(False, description="Include variant/colorway entries (default: hide them)"),
    skip: int = 0,
    limit: int = Query(40, le=200),
):
    stmt = select(Calculator)

    # By default, only show canonical models (no parent) — keeps browse clean
    if not include_variants:
        stmt = stmt.where(Calculator.parent_id.is_(None))

    if q:
        stmt = stmt.where(or_(
            Calculator.make.ilike(f"%{q}%"),
            Calculator.model.ilike(f"%{q}%"),
            Calculator.description.ilike(f"%{q}%"),
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

    out = []
    for calc in calcs:
        owner_count, want_count = counts_map.get(calc.id, (0, 0))
        d = {c.key: getattr(calc, c.key) for c in calc.__table__.columns}
        d["owner_count"] = owner_count
        d["want_count"] = want_count
        d["variant_count"] = variants_map.get(calc.id, 0)
        out.append(CalculatorPublic.model_validate(d))
    return out


@router.get("/makes", response_model=list[str])
async def list_makes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(distinct(Calculator.make)).order_by(Calculator.make))
    return [row[0] for row in result.all()]


@router.get("/tags", response_model=list[str])
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Calculator.tags))
    tag_set: set[str] = set()
    for (tags,) in result.all():
        if tags:
            tag_set.update(tags)
    return sorted(tag_set)


@router.get("/related/{calc_id}", response_model=list[CalculatorPublic])
async def get_related(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    stmt = (
        select(Calculator)
        .where(Calculator.id != calc_id)
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
            {c.key: getattr(r, c.key) for c in r.__table__.columns} | {"owner_count": 0, "want_count": 0}
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


@router.post("", response_model=CalculatorPublic, status_code=status.HTTP_201_CREATED)
async def create_calculator(
    payload: CalculatorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    calc = Calculator(**payload.model_dump(), added_by_user_id=current_user.id)
    db.add(calc)
    await db.commit()
    await db.refresh(calc)
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
    await db.delete(calc)
    await db.commit()


@router.post("/{calc_id}/images", response_model=CalculatorPublic)
async def upload_calculator_image(
    calc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
