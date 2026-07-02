import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_superuser, get_current_user, get_db
from app.cache import rate_limit_check
from app.models.comment import Comment
from app.models.report import Report
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportCreate(BaseModel):
    target_type: str  # "comment" | "user"
    comment_id: uuid.UUID | None = None
    reported_username: str | None = None
    reason: str


def _serialize(report: Report, reporter: User, reported_user: User | None, comment: Comment | None) -> dict:
    return {
        "id": str(report.id),
        "target_type": report.target_type,
        "reporter_username": reporter.username,
        "comment_id": str(report.comment_id) if report.comment_id else None,
        "comment_content": comment.content if comment else None,
        "reported_username": reported_user.username if reported_user else None,
        "reason": report.reason,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if not await rate_limit_check(f"rl:report:{me.id}", max_requests=10, window=3600):
        raise HTTPException(status_code=429, detail="Too many reports. Please slow down.")
    if payload.target_type not in ("comment", "user"):
        raise HTTPException(status_code=422, detail="target_type must be 'comment' or 'user'")
    if not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required")

    comment: Comment | None = None
    reported_user: User | None = None

    if payload.target_type == "comment":
        if not payload.comment_id:
            raise HTTPException(status_code=422, detail="comment_id is required")
        r = await db.execute(select(Comment).where(Comment.id == payload.comment_id))
        comment = r.scalar_one_or_none()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
    else:
        if not payload.reported_username:
            raise HTTPException(status_code=422, detail="reported_username is required")
        r = await db.execute(select(User).where(User.username == payload.reported_username))
        reported_user = r.scalar_one_or_none()
        if not reported_user:
            raise HTTPException(status_code=404, detail="User not found")
        if reported_user.id == me.id:
            raise HTTPException(status_code=400, detail="Cannot report yourself")

    report = Report(
        reporter_id=me.id,
        target_type=payload.target_type,
        comment_id=comment.id if comment else None,
        reported_user_id=reported_user.id if reported_user else None,
        reason=payload.reason.strip(),
        status="pending",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return _serialize(report, me, reported_user, comment)


@router.get("")
async def list_reports(
    status_filter: str = "pending",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    r = await db.execute(
        select(Report).where(Report.status == status_filter).order_by(Report.created_at.desc())
    )
    reports = r.scalars().all()

    reporter_ids = {rp.reporter_id for rp in reports}
    user_ids = {rp.reported_user_id for rp in reports if rp.reported_user_id} | reporter_ids
    comment_ids = {rp.comment_id for rp in reports if rp.comment_id}

    users_by_id: dict[uuid.UUID, User] = {}
    if user_ids:
        users_r = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_by_id = {u.id: u for u in users_r.scalars().all()}

    comments_by_id: dict[uuid.UUID, Comment] = {}
    if comment_ids:
        comments_r = await db.execute(select(Comment).where(Comment.id.in_(comment_ids)))
        comments_by_id = {c.id: c for c in comments_r.scalars().all()}

    result = []
    for rp in reports:
        reporter = users_by_id.get(rp.reporter_id)
        if not reporter:
            continue
        reported_user = users_by_id.get(rp.reported_user_id) if rp.reported_user_id else None
        comment = comments_by_id.get(rp.comment_id) if rp.comment_id else None
        result.append(_serialize(rp, reporter, reported_user, comment))
    return result


class ReportAction(BaseModel):
    action: str  # "dismiss" | "remove_content"


@router.patch("/{report_id}")
async def resolve_report(
    report_id: uuid.UUID,
    payload: ReportAction,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    r = await db.execute(select(Report).where(Report.id == report_id))
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != "pending":
        raise HTTPException(status_code=400, detail="Report already resolved")

    if payload.action == "remove_content":
        if report.comment_id:
            comment_r = await db.execute(select(Comment).where(Comment.id == report.comment_id))
            comment = comment_r.scalar_one_or_none()
            if comment:
                await db.delete(comment)
        elif report.reported_user_id:
            user_r = await db.execute(select(User).where(User.id == report.reported_user_id))
            target_user = user_r.scalar_one_or_none()
            if target_user:
                target_user.is_active = False
        report.status = "resolved"
    elif payload.action == "dismiss":
        report.status = "dismissed"
    else:
        raise HTTPException(status_code=422, detail="action must be 'dismiss' or 'remove_content'")

    report.resolved_at = datetime.utcnow()
    await db.commit()
    return {"status": report.status}
