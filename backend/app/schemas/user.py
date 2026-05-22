import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: str
    display_name: str | None = None
    bio: str | None = None
    location: str | None = None
    website: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    location: str | None = None
    website: str | None = None


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str | None
    bio: str | None
    avatar_url: str | None
    location: str | None
    website: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserPublic):
    email: str
    is_verified: bool
