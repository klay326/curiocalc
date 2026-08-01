import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.collection import CollectionEntry
from app.models.collection_goal import CollectionGoal
from app.models.user import User

router = APIRouter(prefix="/collection-goals", tags=["collection-goals"])


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    calc_ids: list[str] = []


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    calc_ids: list[str] | None = None
    completed: bool | None = None


async def _goal_with_progress(goal: CollectionGoal, owned_ids: set[str]) -> dict[str, Any]:
    calc_ids = goal.calc_ids or []
    owned_count = sum(1 for cid in calc_ids if cid in owned_ids)
    return {
        "id": str(goal.id),
        "title": goal.title,
        "description": goal.description,
        "calc_ids": calc_ids,
        "target_count": len(calc_ids),
        "owned_count": owned_count,
        "progress": owned_count / len(calc_ids) if calc_ids else 0.0,
        "created_at": goal.created_at,
        "completed_at": goal.completed_at,
    }


@router.get("")
async def list_goals(
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    goals_r = await db.execute(
        select(CollectionGoal)
        .where(CollectionGoal.user_id == me.id)
        .order_by(CollectionGoal.created_at.desc())
    )
    goals = goals_r.scalars().all()

    owned_r = await db.execute(
        select(CollectionEntry.calculator_id)
        .where(CollectionEntry.user_id == me.id, CollectionEntry.status == "owned")
    )
    owned_ids = {str(row[0]) for row in owned_r.all()}

    return [await _goal_with_progress(g, owned_ids) for g in goals]


@router.post("")
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
) -> dict[str, Any]:
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Title required")
    goal = CollectionGoal(
        user_id=me.id,
        title=body.title.strip(),
        description=body.description,
        calc_ids=[str(cid) for cid in body.calc_ids],
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    owned_r = await db.execute(
        select(CollectionEntry.calculator_id)
        .where(CollectionEntry.user_id == me.id, CollectionEntry.status == "owned")
    )
    owned_ids = {str(row[0]) for row in owned_r.all()}
    return await _goal_with_progress(goal, owned_ids)


@router.patch("/{goal_id}")
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
) -> dict[str, Any]:
    goal_r = await db.execute(
        select(CollectionGoal).where(CollectionGoal.id == goal_id, CollectionGoal.user_id == me.id)
    )
    goal = goal_r.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if body.title is not None:
        goal.title = body.title.strip()
    if body.description is not None:
        goal.description = body.description
    if body.calc_ids is not None:
        goal.calc_ids = [str(cid) for cid in body.calc_ids]
    if body.completed is True and not goal.completed_at:
        goal.completed_at = datetime.now(timezone.utc)
    elif body.completed is False:
        goal.completed_at = None

    await db.commit()
    await db.refresh(goal)

    owned_r = await db.execute(
        select(CollectionEntry.calculator_id)
        .where(CollectionEntry.user_id == me.id, CollectionEntry.status == "owned")
    )
    owned_ids = {str(row[0]) for row in owned_r.all()}
    return await _goal_with_progress(goal, owned_ids)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
) -> None:
    goal_r = await db.execute(
        select(CollectionGoal).where(CollectionGoal.id == goal_id, CollectionGoal.user_id == me.id)
    )
    goal = goal_r.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
