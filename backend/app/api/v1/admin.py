"""Admin-only endpoints — require superuser token."""
import csv
import io
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_superuser, get_db
from app.cache import cache_del, cache_incr
from app.config import settings
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.comment import Comment
from app.models.image_submission import ImageSubmission
from app.models.user import User
from app.schemas.calculator import CalculatorPublic
from app.schemas.user import UserAdminEntry, UserAdminUpdate

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

    # ── Calc stats (base models only — variants excluded) ────────────
    total_calcs = (await db.execute(
        select(func.count(Calculator.id)).where(Calculator.parent_id.is_(None))
    )).scalar() or 0
    calcs_week = (await db.execute(
        select(func.count(Calculator.id))
        .where(Calculator.created_at >= week_ago, Calculator.parent_id.is_(None))
    )).scalar() or 0
    calcs_month = (await db.execute(
        select(func.count(Calculator.id))
        .where(Calculator.created_at >= month_ago, Calculator.parent_id.is_(None))
    )).scalar() or 0

    # Recent calc additions (base models only)
    recent_calcs_r = await db.execute(
        select(Calculator.id, Calculator.make, Calculator.model, Calculator.created_at)
        .where(Calculator.parent_id.is_(None))
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

    # ── Calc types breakdown (base models only) ──────────────────────
    types_r = await db.execute(
        select(Calculator.calc_type, func.count(Calculator.id).label("cnt"))
        .where(Calculator.parent_id.is_(None))
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


@router.get("/users", response_model=list[UserAdminEntry])
async def list_users(
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q.lower()}%"
        from sqlalchemy import or_
        stmt = stmt.where(or_(
            func.lower(User.username).like(like),
            func.lower(User.email).like(like),
            func.lower(func.coalesce(User.display_name, '')).like(like),
        ))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserAdminEntry)
async def update_user_roles(
    user_id: uuid.UUID,
    payload: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_superuser),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent self-demotion
    if target.id == current_admin.id and payload.is_superuser is False:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin status")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(target, field, value)
    await db.commit()
    await db.refresh(target)
    return target


class MergeRequest(BaseModel):
    keep_id: uuid.UUID
    remove_id: uuid.UUID


@router.post("/calculators/merge")
async def merge_calculators(
    payload: MergeRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Merge two calculators: transfer all data from remove_id → keep_id, then delete remove_id."""
    if payload.keep_id == payload.remove_id:
        raise HTTPException(status_code=400, detail="Cannot merge a calculator with itself")

    keep_r = await db.execute(select(Calculator).where(Calculator.id == payload.keep_id))
    keep = keep_r.scalar_one_or_none()
    if not keep:
        raise HTTPException(status_code=404, detail="keep_id not found")

    remove_r = await db.execute(select(Calculator).where(Calculator.id == payload.remove_id))
    remove = remove_r.scalar_one_or_none()
    if not remove:
        raise HTTPException(status_code=404, detail="remove_id not found")

    # Re-parent variants of the duplicate to the keeper
    variants_r = await db.execute(
        select(Calculator).where(Calculator.parent_id == payload.remove_id)
    )
    for v in variants_r.scalars().all():
        v.parent_id = payload.keep_id

    # Move collection entries
    entries_r = await db.execute(
        select(CollectionEntry).where(CollectionEntry.calculator_id == payload.remove_id)
    )
    for e in entries_r.scalars().all():
        e.calculator_id = payload.keep_id

    # Move comments
    comments_r = await db.execute(
        select(Comment).where(Comment.calculator_id == payload.remove_id)
    )
    for c in comments_r.scalars().all():
        c.calculator_id = payload.keep_id

    # Merge images (add any unique images from remove to keep)
    merged_images = list(keep.images)
    for img in (remove.images or []):
        if img not in merged_images:
            merged_images.append(img)
    keep.images = merged_images

    # Merge tags
    merged_tags = list(set(keep.tags or []) | set(remove.tags or []))
    keep.tags = merged_tags

    # Fill in missing fields from remove
    for field in ("description", "fun_facts", "manual_url", "rarity_score",
                  "weirdness_score", "year_introduced", "year_discontinued",
                  "display_type", "power_source", "num_keys", "country_of_origin"):
        if not getattr(keep, field) and getattr(remove, field):
            setattr(keep, field, getattr(remove, field))

    await db.delete(remove)
    await db.commit()
    await db.refresh(keep)

    owner_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.calculator_id == keep.id, CollectionEntry.status == "owned"
        )
    )
    want_r = await db.execute(
        select(func.count(CollectionEntry.id)).where(
            CollectionEntry.calculator_id == keep.id, CollectionEntry.status == "wanted"
        )
    )
    variant_r = await db.execute(
        select(func.count(Calculator.id)).where(Calculator.parent_id == keep.id)
    )
    d = {c.key: getattr(keep, c.key) for c in keep.__table__.columns}
    d["owner_count"] = owner_r.scalar() or 0
    d["want_count"] = want_r.scalar() or 0
    d["variant_count"] = variant_r.scalar() or 0
    return CalculatorPublic.model_validate(d)


# ── Image submissions ─────────────────────────────────────────────────────────

class ImageReviewRequest(BaseModel):
    status: str  # "approved" or "rejected"
    reviewer_note: str | None = None


@router.get("/image-submissions")
async def list_image_submissions(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    stmt = (
        select(ImageSubmission, Calculator, User)
        .join(Calculator, ImageSubmission.calculator_id == Calculator.id)
        .outerjoin(User, ImageSubmission.submitted_by_id == User.id)
        .order_by(ImageSubmission.created_at.desc())
    )
    if status:
        stmt = stmt.where(ImageSubmission.status == status)
    rows = (await db.execute(stmt)).all()

    return [
        {
            "id": str(sub.id),
            "image_url": sub.image_url,
            "status": sub.status,
            "reviewer_note": sub.reviewer_note,
            "created_at": sub.created_at.isoformat(),
            "calculator_id": str(sub.calculator_id),
            "calculator_make": calc.make,
            "calculator_model": calc.model,
            "submitted_by_username": user.username if user else None,
        }
        for sub, calc, user in rows
    ]


@router.patch("/image-submissions/{submission_id}")
async def review_image_submission(
    submission_id: uuid.UUID,
    payload: ImageReviewRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = await db.execute(select(ImageSubmission).where(ImageSubmission.id == submission_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub.status = payload.status
    sub.reviewer_note = payload.reviewer_note

    if payload.status == "approved":
        calc_result = await db.execute(select(Calculator).where(Calculator.id == sub.calculator_id))
        calc = calc_result.scalar_one_or_none()
        if calc:
            calc.images = [*calc.images, sub.image_url]

    await db.commit()
    return {"id": str(sub.id), "status": sub.status, "reviewer_note": sub.reviewer_note}


# ── Featured calculator ───────────────────────────────────────────────────────

@router.post("/calculators/{calc_id}/feature", response_model=CalculatorPublic)
async def feature_calculator(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Pin a calculator as the featured calc (unfeatures any previously featured one)."""
    calc_r = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = calc_r.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    # Unfeature everyone else
    await db.execute(
        update(Calculator).where(Calculator.is_featured.is_(True)).values(is_featured=False)
    )
    calc.is_featured = True
    await db.commit()
    await db.refresh(calc)
    await cache_incr("calcs:v")
    d = {c.key: getattr(calc, c.key) for c in calc.__table__.columns}
    d["owner_count"] = 0
    d["want_count"] = 0
    d["variant_count"] = 0
    return CalculatorPublic.model_validate(d)


@router.delete("/calculators/{calc_id}/feature", status_code=204)
async def unfeature_calculator(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Remove the featured pin from a calculator."""
    await db.execute(
        update(Calculator).where(Calculator.id == calc_id).values(is_featured=False)
    )
    await db.commit()
    await cache_incr("calcs:v")


# ── CSV bulk import ───────────────────────────────────────────────────────────

_CSV_OPTIONAL_INT = {"year_introduced", "year_discontinued", "num_keys"}
_CSV_OPTIONAL_FLOAT = {"rarity_score", "weirdness_score"}
_CSV_OPTIONAL_STR = {"calc_type", "display_type", "power_source", "country_of_origin", "description", "fun_facts", "manual_url", "variant_label"}


@router.post("/calculators/import-csv")
async def import_calculators_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Bulk-import calculators from a CSV file. Required columns: make, model."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    created: list[str] = []
    skipped: list[str] = []
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        make = row.get("make", "").strip()
        model = row.get("model", "").strip()
        if not make or not model:
            errors.append(f"Row {i}: missing make or model")
            continue

        existing = await db.execute(
            select(Calculator).where(Calculator.make == make, Calculator.model == model)
        )
        if existing.scalar_one_or_none():
            skipped.append(f"{make} {model}")
            continue

        try:
            kwargs: dict = {"make": make, "model": model, "calc_type": "other"}
            for field in _CSV_OPTIONAL_INT:
                val = row.get(field, "").strip()
                if val:
                    kwargs[field] = int(val)
            for field in _CSV_OPTIONAL_FLOAT:
                val = row.get(field, "").strip()
                if val:
                    kwargs[field] = float(val)
            for field in _CSV_OPTIONAL_STR:
                val = row.get(field, "").strip()
                if val:
                    kwargs[field] = val
            if row.get("calc_type", "").strip():
                kwargs["calc_type"] = row["calc_type"].strip()
            tags_raw = row.get("tags", "").strip()
            if tags_raw:
                kwargs["tags"] = [t.strip() for t in tags_raw.split(",") if t.strip()]
            db.add(Calculator(**kwargs))
            created.append(f"{make} {model}")
        except Exception as exc:
            errors.append(f"Row {i} ({make} {model}): {exc}")

    if created:
        await db.commit()
        await cache_incr("calcs:v")
        await cache_del("calcs:brands", "calcs:makes", "calcs:tags")

    return {"created": len(created), "skipped": len(skipped), "errors": errors}


# ── Submission approval ────────────────────────────────────────────────────────

@router.get("/submissions", response_model=list[CalculatorPublic])
async def list_pending_submissions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = await db.execute(
        select(Calculator).where(Calculator.status == "pending").order_by(Calculator.created_at)
    )
    calcs = result.scalars().all()
    out = []
    for calc in calcs:
        pub = CalculatorPublic.model_validate(calc)
        out.append(pub)
    return out


@router.post("/calculators/{calc_id}/approve", response_model=CalculatorPublic)
async def approve_submission(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")
    calc.status = "approved"
    await db.commit()
    await db.refresh(calc)
    await cache_incr("calcs:v")
    await cache_del("calcs:brands", "calcs:makes", "calcs:tags")
    return CalculatorPublic.model_validate(calc)


@router.post("/calculators/{calc_id}/reject", status_code=204)
async def reject_submission(
    calc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")
    calc.status = "rejected"
    await db.commit()
    return Response(status_code=204)


@router.get("/email-status")
async def email_status(_: User = Depends(get_current_superuser)):
    """Return whether SMTP is configured and what sender address is set."""
    configured = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    return {
        "configured": configured,
        "smtp_host": settings.SMTP_HOST or None,
        "smtp_user": settings.SMTP_USER or None,
    }
