from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.gesture import Gesture
from app.models.training_sample import TrainingSample
from app.models.training_session import TrainingSession
from app.models.model import MLModel
from app.models.recognition_log import RecognitionLog
from app.schemas.user import UserStats, UserProfileUpdate
from app.services.auth_service import hash_password, verify_password

def update_user_profile(db: Session, user: User, data: UserProfileUpdate) -> User:
    # 1. Update Name
    if data.name is not None:
        trimmed_name = data.name.strip()
        if len(trimmed_name) < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name must be at least 2 characters long.")
        user.name = trimmed_name

    # 2. Update Email
    if data.email is not None and data.email.lower().strip() != user.email:
        new_email = data.email.lower().strip()
        existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is already in use by another account.")
        user.email = new_email

    # 3. Update Password
    if data.new_password:
        if not data.current_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is required to set a new password.")
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password does not match.")
        if len(data.new_password) < 6:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters long.")
        user.password_hash = hash_password(data.new_password)

    db.commit()
    db.refresh(user)
    return user

def get_user_stats(db: Session, user_id: int) -> UserStats:
    total_gestures = db.query(func.count(Gesture.id)).filter(
        Gesture.user_id == user_id
    ).scalar() or 0

    # Total samples across all user gestures
    total_samples = db.query(func.count(TrainingSample.id)).join(
        Gesture, TrainingSample.gesture_id == Gesture.id
    ).filter(
        Gesture.user_id == user_id
    ).scalar() or 0

    trained_models = db.query(func.count(MLModel.id)).filter(
        MLModel.user_id == user_id,
        MLModel.is_active == True
    ).scalar() or 0

    recognition_sessions = db.query(func.count(RecognitionLog.id)).filter(
        RecognitionLog.user_id == user_id
    ).scalar() or 0

    return UserStats(
        total_gestures=total_gestures,
        total_samples=total_samples,
        trained_models=trained_models,
        recognition_sessions=recognition_sessions
    )
