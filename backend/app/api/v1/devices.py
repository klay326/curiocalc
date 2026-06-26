from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.device_token import DeviceToken
from app.models.user import User

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceRegister(BaseModel):
    token: str
    platform: str = "ios"


@router.post("/register", status_code=status.HTTP_204_NO_CONTENT)
async def register_device(
    payload: DeviceRegister,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Upsert a device token — re-registering (e.g. after switching accounts) reassigns it to the current user."""
    r = await db.execute(select(DeviceToken).where(DeviceToken.token == payload.token))
    existing = r.scalar_one_or_none()
    if existing:
        existing.user_id = me.id
        existing.platform = payload.platform
    else:
        db.add(DeviceToken(user_id=me.id, token=payload.token, platform=payload.platform))
    await db.commit()


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(
    token: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    await db.execute(delete(DeviceToken).where(DeviceToken.token == token, DeviceToken.user_id == me.id))
    await db.commit()
