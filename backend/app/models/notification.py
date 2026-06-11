import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # "follow" | "comment"
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Denormalized actor info — no extra join needed when listing
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_username: Mapped[str | None] = mapped_column(String(50))
    actor_display_name: Mapped[str | None] = mapped_column(String(100))
    actor_avatar_url: Mapped[str | None] = mapped_column(String(500))

    # Optional calc context (for comment notifications)
    calc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("calculators.id", ondelete="SET NULL"), nullable=True)
    calc_make: Mapped[str | None] = mapped_column(String(100))
    calc_model: Mapped[str | None] = mapped_column(String(100))

    body: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
