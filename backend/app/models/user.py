import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    display_name: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(String(100))
    website: Mapped[str | None] = mapped_column(String(500))

    theme: Mapped[str] = mapped_column(String(20), default='obsidian')
    collection_photos: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    showcase_ids: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')

    # Email notification opt-outs — missing key means enabled (default-on)
    notification_prefs: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}')

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_curator: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    collection_entries: Mapped[list["CollectionEntry"]] = relationship(back_populates="user", lazy="dynamic")  # noqa: F821
    image_submissions: Mapped[list["ImageSubmission"]] = relationship(back_populates="submitted_by", lazy="dynamic")  # noqa: F821
