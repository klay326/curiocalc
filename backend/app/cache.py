"""Simple Redis cache helpers. All functions silently no-op if Redis is unavailable."""
import json
from typing import Any, Callable, Awaitable
import redis.asyncio as aioredis
from app.config import settings

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis | None:
    global _redis
    try:
        if _redis is None:
            _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        return _redis
    except Exception:
        return None


async def cache_get(key: str) -> Any | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def _json_default(obj: Any) -> Any:
    """Serialise types that standard json can't handle."""
    if hasattr(obj, "model_dump"):          # Pydantic v2 BaseModel
        return obj.model_dump(mode="json")
    return str(obj)                          # UUIDs, datetimes, etc.


async def cache_set(key: str, value: Any, ttl: int) -> None:
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(key, ttl, json.dumps(value, default=_json_default))
    except Exception:
        pass


async def cache_del(*keys: str) -> None:
    r = await _get_redis()
    if not r:
        return
    try:
        await r.delete(*keys)
    except Exception:
        pass


async def cached(key: str, ttl: int, fn: Callable[[], Awaitable[Any]]) -> Any:
    """Return cached value if available, otherwise call fn(), cache and return result."""
    hit = await cache_get(key)
    if hit is not None:
        return hit
    result = await fn()
    await cache_set(key, result, ttl)
    return result
