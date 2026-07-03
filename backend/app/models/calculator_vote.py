import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CalculatorVote(Base):
    """Community rarity/weirdness votes. One row per user per calculator."""
    __tablename__ = "calculator_votes"
    __table_args__ = (UniqueConstraint("user_id", "calculator_id", name="uq_calc_vote"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    calculator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calculators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)    # 1–10
    weirdness_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 1–10
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
