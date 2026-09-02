from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.model import MLModel
from app.models.training_sample import TrainingSample
from app.models.gesture import Gesture
from app.schemas.gesture import GestureCreate, GestureUpdate, GestureResponse
from app.services.gesture_service import (
    get_user_gestures,
    get_user_gesture,
    create_user_gesture,
    update_user_gesture,
    delete_user_gesture
)
from app.services.ml_service import MLService

router = APIRouter(prefix="/gestures", tags=["Gestures"])

@router.get("", response_model=List[GestureResponse])
def list_gestures(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # USER DATA ISOLATION: Only returns gestures belonging to current_user
    return get_user_gestures(db, current_user.id)

@router.post("", response_model=GestureResponse, status_code=status.HTTP_201_CREATED)
def create_gesture(
    req: GestureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_user_gesture(db, current_user.id, req)

@router.post("/train")
def train_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train machine learning classifier for all gestures belonging to current user.
    """
    return MLService.train_user_model(db, current_user.id)

@router.get("/model/active")
def get_active_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve active ML model metadata for current user.
    """
    active = db.query(MLModel).filter(
        MLModel.user_id == current_user.id,
        MLModel.is_active == True
    ).first()

    if not active:
        return {"has_active_model": False}

    return {
        "has_active_model": True,
        "model_id": active.id,
        "version": active.version,
        "accuracy": round(active.accuracy * 100, 1) if active.accuracy else None,
        "sample_count": active.sample_count,
        "model_type": active.model_type,
        "created_at": active.created_at
    }

@router.delete("/{gesture_id}/samples", status_code=status.HTTP_204_NO_CONTENT)
def clear_gesture_samples(
    gesture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset training samples for a gesture owned by current user.
    """
    gesture = db.query(Gesture).filter(
        Gesture.id == gesture_id,
        Gesture.user_id == current_user.id
    ).first()

    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found or access denied."
        )

    db.query(TrainingSample).filter(TrainingSample.gesture_id == gesture_id).delete()
    db.commit()
    return None

@router.get("/{gesture_id}", response_model=GestureResponse)
def get_gesture(
    gesture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # USER DATA ISOLATION: 404 if not found or belongs to another user
    return get_user_gesture(db, gesture_id, current_user.id)

@router.put("/{gesture_id}", response_model=GestureResponse)
def update_gesture(
    gesture_id: int,
    req: GestureUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # USER DATA ISOLATION: 404 if not found or belongs to another user
    return update_user_gesture(db, gesture_id, current_user.id, req)

@router.delete("/{gesture_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gesture(
    gesture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # USER DATA ISOLATION: 404 if not found or belongs to another user
    delete_user_gesture(db, gesture_id, current_user.id)
    return None