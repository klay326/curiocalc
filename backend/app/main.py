import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config import settings
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="The open-source calculator collection community",
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Serve locally-uploaded images when R2 is not configured
if not settings.R2_ACCOUNT_ID:
    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="uploads")


@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "curiocalc", "version": settings.VERSION}
