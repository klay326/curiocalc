import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class CommentCreate(BaseModel):
    content: str
    rating: int | None = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        if len(v) > 2000:
            raise ValueError("Comment too long (max 2000 chars)")
        return v

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class CommentPublic(BaseModel):
    id: uuid.UUID
    calculator_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    display_name: str | None
    content: str
    rating: int | None
    like_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
