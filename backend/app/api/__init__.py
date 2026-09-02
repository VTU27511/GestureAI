from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.gestures import router as gestures_router
from app.api.admin import router as admin_router
from app.api.recognition import router as recognition_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(gestures_router)
api_router.include_router(admin_router)
api_router.include_router(recognition_router)