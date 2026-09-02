from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.gesture import Gesture, GestureType
from app.models.training_sample import TrainingSample
from app.models.training_session import TrainingSession, TrainingStatus
from app.models.model import MLModel
from app.schemas.gesture import GestureCreate, GestureUpdate, GestureResponse

def _build_gesture_response(db: Session, gesture: Gesture) -> dict:
    sample_count = db.query(func.count(TrainingSample.id)).filter(
        TrainingSample.gesture_id == gesture.id
    ).scalar() or 0

    # Determine status: "TRAINED" if active MLModel exists, "TRAINING" if session in progress, else "NOT TRAINED"
    has_model = db.query(MLModel).filter(
        MLModel.gesture_id == gesture.id,
        MLModel.is_active == True
    ).first()

    has_active_session = db.query(TrainingSession).filter(
        TrainingSession.gesture_id == gesture.id,
        TrainingSession.status == TrainingStatus.IN_PROGRESS
    ).first()

    if has_model:
        training_status = "TRAINED"
    elif has_active_session:
        training_status = "TRAINING"
    elif sample_count > 0:
        training_status = "SAMPLES READY"
    else:
        training_status = "NOT TRAINED"

    return {
        "id": gesture.id,
        "user_id": gesture.user_id,
        "name": gesture.name,
        "meaning": gesture.meaning,
        "speech_text": gesture.speech_text,
        "gesture_type": gesture.gesture_type,
        "object_name": gesture.object_name,
        "created_at": gesture.created_at,
        "updated_at": gesture.updated_at,
        "samples_count": sample_count,
        "status": training_status
    }

def get_user_gestures(db: Session, user_id: int) -> List[dict]:
    # STRICT USER ISOLATION: Only fetch gestures where user_id matches
    gestures = db.query(Gesture).filter(
        Gesture.user_id == user_id
    ).order_by(Gesture.created_at.desc()).all()

    return [_build_gesture_response(db, g) for g in gestures]

def get_user_gesture(db: Session, gesture_id: int, user_id: int) -> dict:
    # STRICT USER ISOLATION: If gesture doesn't belong to this user, return 404
    gesture = db.query(Gesture).filter(
        Gesture.id == gesture_id,
        Gesture.user_id == user_id
    ).first()

    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found or access denied."
        )

    return _build_gesture_response(db, gesture)

def create_user_gesture(db: Session, user_id: int, data: GestureCreate) -> dict:
    # Validation: If HAND_OBJECT, object_name must be present
    if data.gesture_type == GestureType.HAND_OBJECT and not data.object_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Object Name is required when gesture type is HAND + OBJECT."
        )

    gesture = Gesture(
        user_id=user_id,
        name=data.name.strip(),
        meaning=data.meaning.strip(),
        speech_text=data.speech_text.strip(),
        gesture_type=data.gesture_type,
        object_name=data.object_name.strip() if data.object_name else None
    )
    db.add(gesture)
    db.commit()
    db.refresh(gesture)
    return _build_gesture_response(db, gesture)

def update_user_gesture(db: Session, gesture_id: int, user_id: int, data: GestureUpdate) -> dict:
    # STRICT USER ISOLATION
    gesture = db.query(Gesture).filter(
        Gesture.id == gesture_id,
        Gesture.user_id == user_id
    ).first()

    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found or access denied."
        )

    if data.name is not None:
        gesture.name = data.name.strip()
    if data.meaning is not None:
        gesture.meaning = data.meaning.strip()
    if data.speech_text is not None:
        gesture.speech_text = data.speech_text.strip()
    if data.gesture_type is not None:
        gesture.gesture_type = data.gesture_type
        if gesture.gesture_type == GestureType.HAND_OBJECT and not (data.object_name or gesture.object_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Object Name is required for HAND + OBJECT gesture type."
            )
    if data.object_name is not None:
        gesture.object_name = data.object_name.strip() if data.object_name else None

    db.commit()
    db.refresh(gesture)
    return _build_gesture_response(db, gesture)

def delete_user_gesture(db: Session, gesture_id: int, user_id: int) -> bool:
    # STRICT USER ISOLATION
    gesture = db.query(Gesture).filter(
        Gesture.id == gesture_id,
        Gesture.user_id == user_id
    ).first()

    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found or access denied."
        )

    db.delete(gesture)
    db.commit()
    return True
