from fastapi import APIRouter
from app.api.v1 import auth, users, calculators, collections, suggestions

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(calculators.router)
api_router.include_router(collections.router)
api_router.include_router(suggestions.router)
