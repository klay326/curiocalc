"""
Apple Push Notification service (APNs) over HTTP/2, signed with a .p8 auth key.
Configure via env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY, APNS_TOPIC, APNS_USE_SANDBOX
"""
import logging
import time

import httpx
from jose import jwt

from app.config import settings

logger = logging.getLogger(__name__)

_token_cache: dict[str, tuple[str, float]] = {}


def _get_jwt() -> str:
    """APNs auth-key JWTs are valid up to 1 hour — cache and refresh every 50 minutes."""
    cached = _token_cache.get("token")
    if cached and time.time() - cached[1] < 50 * 60:
        return cached[0]

    token = jwt.encode(
        {"iss": settings.APNS_TEAM_ID, "iat": int(time.time())},
        settings.APNS_AUTH_KEY,
        algorithm="ES256",
        headers={"kid": settings.APNS_KEY_ID},
    )
    _token_cache["token"] = (token, time.time())
    return token


async def send_push(device_token: str, title: str, body: str, data: dict | None = None) -> bool:
    """Fire a single push notification. Returns False (and logs) on failure — never raises."""
    if not (settings.APNS_KEY_ID and settings.APNS_TEAM_ID and settings.APNS_AUTH_KEY):
        logger.debug("APNs not configured — skipping push: %s", title)
        return False

    host = "api.sandbox.push.apple.com" if settings.APNS_USE_SANDBOX else "api.push.apple.com"
    url = f"https://{host}/3/device/{device_token}"
    payload = {
        "aps": {
            "alert": {"title": title, "body": body},
            "sound": "default",
        },
        **(data or {}),
    }
    headers = {
        "authorization": f"bearer {_get_jwt()}",
        "apns-topic": settings.APNS_TOPIC,
        "apns-push-type": "alert",
        "apns-priority": "10",
    }

    try:
        async with httpx.AsyncClient(http2=True, timeout=10.0) as client:
            r = await client.post(url, json=payload, headers=headers)
        if r.status_code != 200:
            logger.warning("APNs push failed (%s): %s", r.status_code, r.text)
            return False
        return True
    except Exception:
        logger.exception("APNs push failed for token %s…", device_token[:12])
        return False


async def send_push_to_user(user_id, db, title: str, body: str, data: dict | None = None) -> None:
    """Send a push to every registered device for a user. Import-local to avoid circular imports."""
    from sqlalchemy import select

    from app.models.device_token import DeviceToken

    r = await db.execute(select(DeviceToken.token).where(DeviceToken.user_id == user_id))
    tokens = [row[0] for row in r.all()]
    for token in tokens:
        await send_push(token, title, body, data)
