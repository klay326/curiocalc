import uuid
from datetime import datetime
from pydantic import BaseModel


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
    external_refs: dict = {}
    tags: list[str] = []


class CalculatorCreate(CalculatorBase):
    pass


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
    external_refs: dict | None = None


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

    model_config = {"from_attributes": True}
