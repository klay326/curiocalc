import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, Text, JSON, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Calculator(Base):
    """
    Master catalog entry for a calculator model.
    Community-maintained — anyone can add or edit.
    """
    __tablename__ = "calculators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identity
    make: Mapped[str] = mapped_column(String(100), nullable=False, index=True)   # e.g. "Casio"
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # e.g. "fx-7000G"
    year_introduced: Mapped[int | None] = mapped_column(Integer)
    year_discontinued: Mapped[int | None] = mapped_column(Integer)

    # Classification
    calc_type: Mapped[str] = mapped_column(String(50), index=True)
    # scientific | graphing | financial | databank | novelty | printing |
    # pocket | desktop | programmable | watch | solar | mechanical | other

    display_type: Mapped[str | None] = mapped_column(String(50))
    # LED | LCD | VFD | nixie | fluorescent | none

    power_source: Mapped[str | None] = mapped_column(String(100))
    num_keys: Mapped[int | None] = mapped_column(Integer)
    country_of_origin: Mapped[str | None] = mapped_column(String(100))

    # Content
    description: Mapped[str | None] = mapped_column(Text)  # markdown
    fun_facts: Mapped[str | None] = mapped_column(Text)    # markdown, for the weird/quirky ones

    # Community metadata
    rarity_score: Mapped[float | None] = mapped_column(Float)   # 1–10, community-voted
    weirdness_score: Mapped[float | None] = mapped_column(Float) # 1–10, for bizarre calcs

    # Media — list of R2 URLs
    images: Mapped[list] = mapped_column(JSON, default=list)
    manual_url: Mapped[str | None] = mapped_column(String(500))

    # External references
    external_refs: Mapped[dict] = mapped_column(JSON, default=dict)
    # { "databank_id": "...", "calcs_quest_id": "...", "museum_url": "..." }

    tags: Mapped[list] = mapped_column(JSON, default=list)

    # Variants — self-referential relationship
    # parent_id points to the "canonical" model; NULL means this IS the canonical model
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calculators.id", ondelete="SET NULL"), nullable=True, index=True
    )
    variant_label: Mapped[str | None] = mapped_column(String(150))
    # e.g. "Silver Edition", "UK Version", "1996 Revision", "Target Exclusive"

    # Moderation
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    added_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    collection_entries: Mapped[list["CollectionEntry"]] = relationship(back_populates="calculator", lazy="dynamic")  # noqa: F821
    variants: Mapped[list["Calculator"]] = relationship(
        "Calculator",
        primaryjoin="Calculator.id == foreign(Calculator.parent_id)",
        lazy="select",
    )
