import uuid
from datetime import datetime
from pydantic import BaseModel


class SuggestionCreate(BaseModel):
    proposed_changes: dict
    reason: str | None = None


class SuggestionReview(BaseModel):
    status: str  # "approved" | "rejected"
    reviewer_note: str | None = None


class SuggestionPublic(BaseModel):
    id: uuid.UUID
    calculator_id: uuid.UUID
    submitted_by_id: uuid.UUID | None
    submitted_by_username: str | None = None
    proposed_changes: dict
    reason: str | None
    status: str
    reviewer_note: str | None
    reviewed_at: datetime | None
    created_at: datetime
    # denormalized for admin UI
    calculator_make: str | None = None
    calculator_model: str | None = None

    model_config = {"from_attributes": True}
