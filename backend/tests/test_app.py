"""Basic smoke tests — verify the app imports and config loads cleanly."""


def test_settings_load():
    from app.config import settings
    assert settings.PROJECT_NAME
    assert settings.API_V1_PREFIX == "/api/v1"


def test_models_import():
    from app.models.calculator import Calculator
    from app.models.collection import CollectionEntry
    from app.models.message import Message
    from app.models.user import User
    assert Calculator.__tablename__ == "calculators"
    assert User.__tablename__ == "users"
    assert CollectionEntry.__tablename__ == "collection_entries"
    assert Message.__tablename__ == "messages"


def test_schemas_import():
    from app.schemas.calculator import CalculatorCreate, CalculatorPublic
    from app.schemas.user import UserMe, UserProfile
    assert CalculatorPublic
    assert CalculatorCreate
    assert UserMe
    assert UserProfile
