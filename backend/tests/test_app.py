"""Tests — smoke imports + HTTP endpoint tests via TestClient."""
import pytest
from fastapi.testclient import TestClient


# ── Smoke tests (no DB needed) ────────────────────────────────────────────────

def test_settings_load():
    from app.config import settings
    assert settings.PROJECT_NAME
    assert settings.API_V1_PREFIX == "/api/v1"


def test_models_import():
    from app.models.calculator import Calculator
    from app.models.calculator_like import CalculatorLike
    from app.models.collection import CollectionEntry
    from app.models.device_token import DeviceToken
    from app.models.message import Message
    from app.models.report import Report
    from app.models.user import User
    assert Calculator.__tablename__ == "calculators"
    assert User.__tablename__ == "users"
    assert CollectionEntry.__tablename__ == "collection_entries"
    assert Message.__tablename__ == "messages"
    assert CalculatorLike.__tablename__ == "calculator_likes"
    assert DeviceToken.__tablename__ == "device_tokens"
    assert Report.__tablename__ == "reports"


def test_schemas_import():
    from app.schemas.calculator import CalculatorCreate, CalculatorPublic
    from app.schemas.user import UserMe, UserProfile
    assert CalculatorPublic
    assert CalculatorCreate
    assert UserMe
    assert UserProfile
    # like_count is present
    assert "like_count" in CalculatorPublic.model_fields


def test_calculator_public_defaults():
    from app.schemas.calculator import CalculatorPublic
    import uuid
    from datetime import datetime
    p = CalculatorPublic(
        id=uuid.uuid4(),
        make="Casio",
        model="fx-7000G",
        calc_type="graphing",
        images=[],
        rarity_score=None,
        weirdness_score=None,
        is_verified=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert p.owner_count == 0
    assert p.want_count == 0
    assert p.variant_count == 0
    assert p.like_count == 0


# ── App startup / routing ─────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """TestClient with lifespan disabled — avoids needing a real DB for routing tests."""
    import os
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
    from app.main import app
    # Override lifespan to skip DB table creation
    app.router.lifespan_context = None  # type: ignore[assignment]
    return TestClient(app, raise_server_exceptions=False)


def test_openapi_schema(client: TestClient):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    schema = r.json()
    assert schema["info"]["title"]
    # Verify key routes are registered
    paths = schema["paths"]
    assert "/api/v1/calculators" in paths
    assert "/api/v1/users/me" in paths
    assert "/api/v1/stats" in paths


def test_unauthed_endpoints(client: TestClient):
    """Endpoints that require auth return 401/403, not 500."""
    protected = [
        "/api/v1/users/me",
        "/api/v1/collections/me",
        "/api/v1/messages/conversations",
    ]
    for path in protected:
        r = client.get(path)
        assert r.status_code in (401, 403, 422), f"{path} → {r.status_code}"


def test_report_schema():
    from app.models.report import Report
    assert hasattr(Report, "target_type")
    assert hasattr(Report, "reason")
    assert hasattr(Report, "status")


def test_calculator_like_unique_constraint():
    from app.models.calculator_like import CalculatorLike
    args = CalculatorLike.__table_args__
    constraint_names = [a.name for a in args if hasattr(a, "name")]
    assert "uq_calc_like" in constraint_names


def test_config_digest_secret():
    from app.config import settings
    # DIGEST_SECRET defaults to empty string (safe — cron endpoint rejects empty)
    assert isinstance(settings.DIGEST_SECRET, str)


def test_cache_module_imports():
    from app.cache import cache_get, cache_set, rate_limit_check
    assert callable(cache_get)
    assert callable(cache_set)
    assert callable(rate_limit_check)
