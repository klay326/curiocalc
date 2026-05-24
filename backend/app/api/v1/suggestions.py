from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.api.deps import get_db, get_current_user, get_current_superuser
from app.models.user import User
from app.models.calculator import Calculator
from app.models.suggestion import EditSuggestion
from app.schemas.suggestion import SuggestionCreate, SuggestionReview, SuggestionPublic
from app.schemas.calculator import CalculatorUpdate

router = APIRouter(tags=["suggestions"])


def _enrich(s: EditSuggestion, calc: Calculator | None, user: User | None) -> dict:
    return {
        "id": s.id,
        "calculator_id": s.calculator_id,
        "submitted_by_id": s.submitted_by_id,
        "submitted_by_username": user.username if user else None,
        "proposed_changes": s.proposed_changes,
        "reason": s.reason,
        "status": s.status,
        "reviewer_note": s.reviewer_note,
        "reviewed_at": s.reviewed_at,
        "created_at": s.created_at,
        "calculator_make": calc.make if calc else None,
        "calculator_model": calc.model if calc else None,
    }


@router.post("/calculators/{calc_id}/suggestions",
             response_model=SuggestionPublic,
             status_code=status.HTTP_201_CREATED)
async def submit_suggestion(
    calc_id: uuid.UUID,
    payload: SuggestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")

    # Validate that proposed_changes only contains valid CalculatorUpdate fields
    try:
        CalculatorUpdate(**payload.proposed_changes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid proposed changes: {e}")

    suggestion = EditSuggestion(
        calculator_id=calc_id,
        submitted_by_id=current_user.id,
        proposed_changes=payload.proposed_changes,
        reason=payload.reason,
    )
    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)
    return _enrich(suggestion, calc, current_user)


@router.get("/suggestions",
            response_model=list[SuggestionPublic])
async def list_suggestions(
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    stmt = select(EditSuggestion).order_by(EditSuggestion.created_at.desc())
    if status_filter:
        stmt = stmt.where(EditSuggestion.status == status_filter)
    result = await db.execute(stmt)
    suggestions = result.scalars().all()

    out = []
    for s in suggestions:
        calc_r = await db.execute(select(Calculator).where(Calculator.id == s.calculator_id))
        calc = calc_r.scalar_one_or_none()
        user_r = await db.execute(select(User).where(User.id == s.submitted_by_id)) if s.submitted_by_id else None
        user = user_r.scalar_one_or_none() if user_r else None
        out.append(_enrich(s, calc, user))
    return out


@router.patch("/suggestions/{suggestion_id}",
              response_model=SuggestionPublic)
async def review_suggestion(
    suggestion_id: uuid.UUID,
    payload: SuggestionReview,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(get_current_superuser),
):
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="status must be 'approved' or 'rejected'")

    result = await db.execute(select(EditSuggestion).where(EditSuggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    suggestion.status = payload.status
    suggestion.reviewer_id = reviewer.id
    suggestion.reviewer_note = payload.reviewer_note
    suggestion.reviewed_at = datetime.now(timezone.utc)

    if payload.status == "approved":
        calc_r = await db.execute(select(Calculator).where(Calculator.id == suggestion.calculator_id))
        calc = calc_r.scalar_one_or_none()
        if calc:
            for field, value in suggestion.proposed_changes.items():
                if hasattr(calc, field) and value is not None:
                    setattr(calc, field, value)

    await db.commit()
    await db.refresh(suggestion)

    calc_r = await db.execute(select(Calculator).where(Calculator.id == suggestion.calculator_id))
    calc = calc_r.scalar_one_or_none()
    user_r = await db.execute(select(User).where(User.id == suggestion.submitted_by_id)) if suggestion.submitted_by_id else None
    user = user_r.scalar_one_or_none() if user_r else None
    return _enrich(suggestion, calc, user)
