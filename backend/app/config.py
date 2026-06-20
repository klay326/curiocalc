
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Cloudflare R2 (optional — leave blank to use local disk storage)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "curiocalc-media"
    R2_PUBLIC_URL: str = "https://media.curiocalc.org"

    # Local disk storage (used when R2 is not configured)
    LOCAL_STORAGE_PATH: str = "/app/uploads"
    LOCAL_STORAGE_URL: str = "https://api.curiocalc.org"

    # Superuser seed
    FIRST_SUPERUSER_EMAIL: str = "admin@curiocalc.org"
    FIRST_SUPERUSER_PASSWORD: str = "changeme"

    # Email notifications
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    NOTIFICATION_EMAIL: str = "klay.adams326@gmail.com"

    # Digest cron secret (for the /digest/send-all-cron endpoint)
    DIGEST_SECRET: str = ""


settings = Settings()
