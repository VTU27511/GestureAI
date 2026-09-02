from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.gesture import Gesture
from app.models.training_sample import TrainingSample
from app.models.training_session import TrainingSession
from app.models.model import MLModel
from app.models.recognition_log import RecognitionLog
from app.schemas.user import UserStats

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
