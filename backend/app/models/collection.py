import enum
import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CollectionStatus(enum.StrEnum):
    OWNED = "owned"
    WANTED = "wanted"
    FOR_SALE = "for_sale"
    TRADED_AWAY = "traded_away"


class Condition(enum.StrEnum):
    MINT = "mint"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class Visibility(enum.StrEnum):
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class CollectionEntry(Base):
    """A user's relationship to a specific calculator — owned, wanted, sold, etc."""
    __tablename__ = "collection_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    calculator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calculators.id", ondelete="CASCADE"), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(20), default=CollectionStatus.OWNED)
    condition: Mapped[str | None] = mapped_column(String(20))
    visibility: Mapped[str] = mapped_column(String(20), default=Visibility.PUBLIC)

    notes: Mapped[str | None] = mapped_column(Text)  # markdown, personal notes
    acquired_date: Mapped[date | None] = mapped_column(Date)
    acquired_price: Mapped[float | None] = mapped_column(Float)
    acquired_from: Mapped[str | None] = mapped_column(String(200))  # "eBay", "estate sale", etc.

    # Personal photos uploaded by the user (R2 URLs)
    photos: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="collection_entries")  # noqa: F821
    calculator: Mapped["Calculator"] = relationship(back_populates="collection_entries")  # noqa: F821
