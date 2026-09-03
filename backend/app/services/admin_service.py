from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.models.gesture import Gesture
from app.models.training_session import TrainingSession
from app.models.training_sample import TrainingSample
from app.models.model import MLModel
from app.models.recognition_log import RecognitionLog
from app.schemas.admin import (
    AdminUserListItem,
    AdminStats,
    UserStatusUpdate,
    AdminGestureListItem,
    AdminTrainingListItem,
    AdminModelListItem,
    RecognitionLogResponse
)

def get_all_users(db: Session) -> List[AdminUserListItem]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        gesture_cnt = db.query(func.count(Gesture.id)).filter(Gesture.user_id == u.id).scalar() or 0
        session_cnt = db.query(func.count(TrainingSession.id)).filter(TrainingSession.user_id == u.id).scalar() or 0
        model_cnt = db.query(func.count(MLModel.id)).filter(MLModel.user_id == u.id).scalar() or 0
        total_samples = db.query(func.count(TrainingSample.id)).join(
            Gesture, TrainingSample.gesture_id == Gesture.id
        ).filter(Gesture.user_id == u.id).scalar() or 0

        results.append(
            AdminUserListItem(
                id=u.id,
                name=u.name,
                username=u.username,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                created_at=u.created_at,
                gesture_count=gesture_cnt,
                session_count=session_cnt,
                model_count=model_cnt,
                total_samples=total_samples
            )
        )
    return results

def get_user_details(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    gestures = db.query(Gesture).filter(Gesture.user_id == user_id).all()
    models = db.query(MLModel).filter(MLModel.user_id == user_id).all()
    active_model = next((m for m in models if m.is_active), None)

    enriched_gestures = []
    for g in gestures:
        samples_cnt = db.query(func.count(TrainingSample.id)).filter(
            TrainingSample.gesture_id == g.id
        ).scalar() or 0

        last_session = db.query(TrainingSession).filter(
            TrainingSession.gesture_id == g.id
        ).order_by(TrainingSession.started_at.desc()).first()

        status_str = "NOT TRAINED"
        if active_model:
            status_str = "TRAINED"
        elif samples_cnt > 0:
            status_str = "SAMPLES READY"

        enriched_gestures.append({
            "id": g.id,
            "name": g.name,
            "meaning": g.meaning,
            "speech_text": g.speech_text,
            "gesture_type": g.gesture_type,
            "object_name": g.object_name,
            "sample_count": samples_cnt,
            "status": status_str,
            "accuracy": round(active_model.accuracy * 100, 1) if active_model and active_model.accuracy else None,
            "model_version": active_model.version if active_model else None,
            "created_at": g.created_at,
            "last_trained": last_session.completed_at if last_session else (active_model.created_at if active_model else None)
        })

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at
        },
        "gestures": enriched_gestures,
        "models": [
            {
                "id": m.id,
                "model_type": m.model_type,
                "version": m.version,
                "accuracy": round(m.accuracy * 100, 1) if m.accuracy else None,
                "sample_count": m.sample_count,
                "is_active": m.is_active,
                "created_at": m.created_at
            }
            for m in models
        ]
    }

def update_user_status(db: Session, user_id: int, data: UserStatusUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = data.role

    db.commit()
    db.refresh(user)
    return user

def get_admin_stats(db: Session) -> AdminStats:
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_gestures = db.query(func.count(Gesture.id)).scalar() or 0
    total_samples = db.query(func.count(TrainingSample.id)).scalar() or 0
    total_models = db.query(func.count(MLModel.id)).scalar() or 0
    total_sessions = db.query(func.count(TrainingSession.id)).scalar() or 0
    total_recognitions = db.query(func.count(RecognitionLog.id)).scalar() or 0

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_gestures=total_gestures,
        total_samples=total_samples,
        total_models=total_models,
        total_sessions=total_sessions,
        total_recognitions=total_recognitions
    )

def get_all_gestures(db: Session) -> List[AdminGestureListItem]:
    gestures = db.query(Gesture, User).join(User, Gesture.user_id == User.id).order_by(Gesture.created_at.desc()).all()
    results = []
    for g, u in gestures:
        samples_cnt = db.query(func.count(TrainingSample.id)).filter(TrainingSample.gesture_id == g.id).scalar() or 0
        active_model = db.query(MLModel).filter(MLModel.user_id == u.id, MLModel.is_active == True).first()

        status_str = "NOT TRAINED"
        if active_model:
            status_str = "TRAINED"
        elif samples_cnt > 0:
            status_str = "SAMPLES READY"

        results.append(
            AdminGestureListItem(
                id=g.id,
                user_id=u.id,
                user_name=u.name,
                user_email=u.email,
                name=g.name,
                meaning=g.meaning,
                speech_text=g.speech_text,
                gesture_type=g.gesture_type,
                object_name=g.object_name,
                samples_count=samples_cnt,
                status=status_str,
                created_at=g.created_at,
                accuracy=round(active_model.accuracy * 100, 1) if active_model and active_model.accuracy else None,
                model_version=active_model.version if active_model else None
            )
        )
    return results

def get_all_training_sessions(db: Session) -> List[AdminTrainingListItem]:
    # Query training sessions or synthesize from gestures with samples
    sessions = db.query(TrainingSession, User, Gesture).join(
        User, TrainingSession.user_id == User.id
    ).join(
        Gesture, TrainingSession.gesture_id == Gesture.id
    ).order_by(TrainingSession.started_at.desc()).all()

    results = []
    for ts, u, g in sessions:
        results.append(
            AdminTrainingListItem(
                id=ts.id,
                user_id=u.id,
                user_name=u.name,
                gesture_id=g.id,
                gesture_name=g.name,
                sample_count=ts.sample_count,
                valid_samples=ts.valid_samples,
                invalid_samples=ts.invalid_samples,
                model_type="Random Forest",
                accuracy=round(ts.accuracy * 100, 1) if ts.accuracy else None,
                status=ts.status,
                started_at=ts.started_at,
                completed_at=ts.completed_at
            )
        )

    # If formal sessions table is empty, auto-populate from active gestures with samples
    if not results:
        gestures_with_samples = db.query(Gesture, User).join(User, Gesture.user_id == User.id).all()
        for g, u in gestures_with_samples:
            sample_cnt = db.query(func.count(TrainingSample.id)).filter(TrainingSample.gesture_id == g.id).scalar() or 0
            if sample_cnt > 0:
                active_model = db.query(MLModel).filter(MLModel.user_id == u.id, MLModel.is_active == True).first()
                from app.models.training_session import TrainingStatus
                results.append(
                    AdminTrainingListItem(
                        id=g.id,
                        user_id=u.id,
                        user_name=u.name,
                        gesture_id=g.id,
                        gesture_name=g.name,
                        sample_count=sample_cnt,
                        valid_samples=sample_cnt,
                        invalid_samples=0,
                        model_type=active_model.model_type if active_model else "Random Forest",
                        accuracy=round(active_model.accuracy * 100, 1) if active_model and active_model.accuracy else None,
                        status=TrainingStatus.COMPLETED if active_model else TrainingStatus.PENDING,
                        started_at=g.created_at,
                        completed_at=active_model.created_at if active_model else None
                    )
                )

    return results

def get_all_models(db: Session) -> List[AdminModelListItem]:
    models = db.query(MLModel, User).join(User, MLModel.user_id == User.id).order_by(MLModel.created_at.desc()).all()
    results = []
    for m, u in models:
        gesture_name = None
        if m.gesture_id:
            g = db.query(Gesture).filter(Gesture.id == m.gesture_id).first()
            if g:
                gesture_name = g.name

        results.append(
            AdminModelListItem(
                id=m.id,
                user_id=u.id,
                user_name=u.name,
                gesture_id=m.gesture_id,
                gesture_name=gesture_name or "Consolidated Model",
                model_type=m.model_type,
                version=m.version,
                accuracy=round(m.accuracy * 100, 1) if m.accuracy else None,
                sample_count=m.sample_count,
                is_active=m.is_active,
                created_at=m.created_at
            )
        )
    return results

def get_recognition_logs(
    db: Session,
    user_id: Optional[int] = None,
    gesture_id: Optional[int] = None,
    limit: int = 100
) -> List[RecognitionLogResponse]:
    query = db.query(RecognitionLog, User, Gesture).join(
        User, RecognitionLog.user_id == User.id
    ).join(
        Gesture, RecognitionLog.gesture_id == Gesture.id
    )

    if user_id:
        query = query.filter(RecognitionLog.user_id == user_id)
    if gesture_id:
        query = query.filter(RecognitionLog.gesture_id == gesture_id)

    logs = query.order_by(RecognitionLog.recognized_at.desc()).limit(limit).all()

    return [
        RecognitionLogResponse(
            id=log.id,
            user_id=u.id,
            user_name=u.name,
            gesture_id=g.id,
            gesture_name=g.name,
            confidence=round(log.confidence * 100, 1),
            recognized_at=log.recognized_at
        )
        for log, u, g in logs
    ]

def adopt_gesture(db: Session, admin_id: int, gesture_id: int) -> dict:
    source_gesture = db.query(Gesture).filter(Gesture.id == gesture_id).first()
    if not source_gesture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target gesture not found.")

    base_name = source_gesture.name
    existing = db.query(Gesture).filter(Gesture.user_id == admin_id, Gesture.name == base_name).first()
    target_name = base_name
    counter = 1
    while existing:
        target_name = f"{base_name} (Copy {counter})" if counter > 1 else f"{base_name} (Copy)"
        existing = db.query(Gesture).filter(Gesture.user_id == admin_id, Gesture.name == target_name).first()
        counter += 1

    adopted_gesture = Gesture(
        user_id=admin_id,
        name=target_name,
        meaning=source_gesture.meaning,
        speech_text=source_gesture.speech_text,
        gesture_type=source_gesture.gesture_type,
        object_name=source_gesture.object_name,
    )
    db.add(adopted_gesture)
    db.flush()

    source_samples = db.query(TrainingSample).filter(TrainingSample.gesture_id == gesture_id).all()
    copied_count = 0
    for s in source_samples:
        new_sample = TrainingSample(
            gesture_id=adopted_gesture.id,
            landmarks=s.landmarks,
            hand_count=s.hand_count if hasattr(s, 'hand_count') else 1
        )
        db.add(new_sample)
        copied_count += 1

    db.commit()
    db.refresh(adopted_gesture)

    return {
        "message": f"Successfully adopted gesture '{source_gesture.name}' into your library as '{target_name}'.",
        "gesture_id": adopted_gesture.id,
        "name": adopted_gesture.name,
        "copied_samples": copied_count
    }