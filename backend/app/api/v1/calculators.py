from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import uuid

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.calculator import Calculator
from app.schemas.calculator import CalculatorCreate, CalculatorUpdate, CalculatorPublic
from app.services.storage import upload_image

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.get("", response_model=list[CalculatorPublic])
async def list_calculators(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search by make or model"),
    calc_type: str | None = None,
    skip: int = 0,
    limit: int = 40,
):
    stmt = select(Calculator)
    if q:
        stmt = stmt.where(or_(
            Calculator.make.ilike(f"%{q}%"),
            Calculator.model.ilike(f"%{q}%"),
        ))
    if calc_type:
        stmt = stmt.where(Calculator.calc_type == calc_type)
    stmt = stmt.offset(skip).limit(limit).order_by(Calculator.make, Calculator.model)

    result = await db.execute(stmt)
    return result.scalars().all()


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
    return calc


@router.get("/{calc_id}", response_model=CalculatorPublic)
async def get_calculator(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Calculator not found")
    return calc


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
    return calc


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
    return calc
