import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EditSuggestion(Base):
    """Community-submitted edit suggestions for calculator entries."""
    __tablename__ = "edit_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    calculator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calculators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # The proposed changes as a dict matching CalculatorUpdate fields
    proposed_changes: Mapped[dict] = mapped_column(JSON, default=dict)
    reason: Mapped[str | None] = mapped_column(Text)

    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reviewer_note: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    calculator: Mapped["Calculator"] = relationship("Calculator")  # noqa: F821
    submitted_by: Mapped["User | None"] = relationship("User", foreign_keys=[submitted_by_id])  # noqa: F821
