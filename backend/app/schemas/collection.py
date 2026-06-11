import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.collection import CollectionStatus, Condition, Visibility


class CollectionEntryBase(BaseModel):
    calculator_id: uuid.UUID
    status: CollectionStatus = CollectionStatus.OWNED
    condition: Condition | None = None
    visibility: Visibility = Visibility.PUBLIC
    notes: str | None = None
    acquired_date: date | None = None
    acquired_price: float | None = None
    acquired_from: str | None = None


class CollectionEntryCreate(CollectionEntryBase):
    pass


class CollectionEntryUpdate(BaseModel):
    status: CollectionStatus | None = None
    condition: Condition | None = None
    visibility: Visibility | None = None
    notes: str | None = None
    acquired_date: date | None = None
    acquired_price: float | None = None
    acquired_from: str | None = None


class CollectionEntryPublic(CollectionEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    photos: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
