import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_superuser, get_db, get_optional_user
from app.models.calc_request import CalculatorRequest
from app.models.user import User

router = APIRouter(prefix="/calc-requests", tags=["calc-requests"])


class CalcRequestCreate(BaseModel):
    make: str
    model: str
    year: int | None = None
    notes: str | None = None


class CalcRequestPublic(BaseModel):
    id: uuid.UUID
    make: str
    model: str
    year: int | None
    notes: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=CalcRequestPublic, status_code=201)
async def create_request(
    body: CalcRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    req = CalculatorRequest(
        make=body.make.strip(),
        model=body.model.strip(),
        year=body.year,
        notes=body.notes.strip() if body.notes else None,
        user_id=user.id if user else None,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/admin", response_model=list[CalcRequestPublic])
async def list_requests(
    status: str = "pending",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    stmt = select(CalculatorRequest).order_by(CalculatorRequest.created_at.desc())
    if status:
        stmt = stmt.where(CalculatorRequest.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/admin/{req_id}", response_model=CalcRequestPublic)
async def update_request(
    req_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    result = await db.execute(
        select(CalculatorRequest).where(CalculatorRequest.id == req_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if "status" in body and body["status"] in ("pending", "fulfilled", "declined"):
        req.status = body["status"]
    await db.commit()
    await db.refresh(req)
    return req
