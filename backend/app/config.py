from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # App
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "CurioCalc"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8081"]

    # Cloudflare R2
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "curiocalc-media"
    R2_PUBLIC_URL: str = "https://media.curiocalc.org"

    # Superuser seed
    FIRST_SUPERUSER_EMAIL: str = "admin@curiocalc.org"
    FIRST_SUPERUSER_PASSWORD: str = "changeme"


settings = Settings()
