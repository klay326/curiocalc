import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class CalculatorBase(BaseModel):
    make: str
    model: str
    year_introduced: int | None = None
    year_discontinued: int | None = None
    calc_type: str
    display_type: str | None = None
    power_source: str | None = None
    num_keys: int | None = None
    country_of_origin: str | None = None
    description: str | None = None
    fun_facts: str | None = None
    manual_url: str | None = None
    external_refs: list[dict] = []
    tags: list[str] = []

    @field_validator("external_refs", mode="before")
    @classmethod
    def coerce_external_refs(cls, v):
        """Tolerate {} stored as dict instead of [] — treat it as empty list."""
        if isinstance(v, dict):
            return list(v.values()) if v else []
        return v or []

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_tags(cls, v):
        if isinstance(v, dict):
            return []
        return v or []
    # Variants
    parent_id: uuid.UUID | None = None
    variant_label: str | None = None


class CalculatorCreate(CalculatorBase):
    images: list[str] = []
    rarity_score: float | None = None
    weirdness_score: float | None = None


class CalculatorUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    year_introduced: int | None = None
    year_discontinued: int | None = None
    calc_type: str | None = None
    display_type: str | None = None
    power_source: str | None = None
    num_keys: int | None = None
    country_of_origin: str | None = None
    description: str | None = None
    fun_facts: str | None = None
    tags: list[str] | None = None
    external_refs: list[dict] | None = None
    images: list[str] | None = None
    rarity_score: float | None = None
    weirdness_score: float | None = None
    parent_id: uuid.UUID | None = None
    variant_label: str | None = None


class CalculatorPublic(CalculatorBase):
    id: uuid.UUID
    images: list[str]
    rarity_score: float | None
    weirdness_score: float | None
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    # computed fields
    owner_count: int = 0
    want_count: int = 0
    variant_count: int = 0  # number of known variants (0 for variants themselves)

    model_config = {"from_attributes": True}
