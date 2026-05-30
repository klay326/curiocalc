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
    theme: str = 'obsidian'


class UserUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    location: str | None = None
    website: str | None = None
    avatar_url: str | None = None
    theme: str | None = None


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
    is_superuser: bool
    is_curator: bool = False
    theme: str = 'obsidian'


class UserAdminUpdate(BaseModel):
    is_superuser: bool | None = None
    is_curator: bool | None = None
    is_active: bool | None = None


class UserAdminEntry(UserPublic):
    email: str
    is_superuser: bool
    is_curator: bool
    is_active: bool
    created_at: datetime


class UserProfile(UserPublic):
    owned_count: int = 0
    wanted_count: int = 0
    follower_count: int = 0
    following_count: int = 0
    is_following: bool = False
