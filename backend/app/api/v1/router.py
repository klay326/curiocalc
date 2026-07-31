from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    calc_requests,
    calculators,
    collections,
    comments,
    devices,
    digest,
    follows,
    messages,
    notifications,
    reports,
    stats,
    suggestions,
    trade_offers,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(calculators.router)
api_router.include_router(collections.router)
api_router.include_router(suggestions.router)
api_router.include_router(stats.router)
api_router.include_router(admin.router)
api_router.include_router(comments.router)
api_router.include_router(follows.router)
api_router.include_router(notifications.router)
api_router.include_router(messages.router)
api_router.include_router(trade_offers.router)
api_router.include_router(digest.router)
api_router.include_router(reports.router)
api_router.include_router(devices.router)
api_router.include_router(calc_requests.router)
