from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_admin
from app.models.user import User
from app.schemas.admin import (
    AdminUserListItem,
    AdminStats,
    UserStatusUpdate,
    AdminGestureListItem,
    AdminTrainingListItem,
    AdminModelListItem,
    RecognitionLogResponse
)
from app.schemas.user import UserResponse
from app.services.admin_service import (
    get_all_users,
    get_user_details,
    update_user_status,
    get_admin_stats,
    get_all_gestures,
    get_all_training_sessions,
    get_all_models,
    get_recognition_logs
)

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats", response_model=AdminStats)
def get_system_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_admin_stats(db)

@router.get("/users", response_model=List[AdminUserListItem])
def list_all_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_all_users(db)

@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_user_details(db, user_id)

@router.put("/users/{user_id}/status", response_model=UserResponse)
def modify_user_status(
    user_id: int,
    req: UserStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    updated = update_user_status(db, user_id, req)
    return UserResponse.model_validate(updated)

@router.get("/gestures", response_model=List[AdminGestureListItem])
def list_all_gestures(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_all_gestures(db)

@router.get("/training", response_model=List[AdminTrainingListItem])
def list_training_sessions(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_all_training_sessions(db)

@router.get("/models", response_model=List[AdminModelListItem])
def list_models(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_all_models(db)

@router.get("/logs", response_model=List[RecognitionLogResponse])
def list_recognition_logs(
    user_id: Optional[int] = Query(None),
    gesture_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return get_recognition_logs(db, user_id=user_id, gesture_id=gesture_id, limit=limit)