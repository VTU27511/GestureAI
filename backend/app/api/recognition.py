from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.gesture import Gesture
from app.models.recognition_log import RecognitionLog
from app.schemas.admin import RecognitionLogResponse, RecognitionLogCreate

router = APIRouter(prefix="/recognition", tags=["Recognition"])

@router.get("/logs", response_model=List[RecognitionLogResponse])
def get_my_recognition_logs(
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    STRICT USER ISOLATION: Normal users can only retrieve their own recognition logs.
    """
    logs = db.query(RecognitionLog, Gesture).join(
        Gesture, RecognitionLog.gesture_id == Gesture.id
    ).filter(
        RecognitionLog.user_id == current_user.id
    ).order_by(
        RecognitionLog.recognized_at.desc()
    ).limit(limit).all()

    return [
        RecognitionLogResponse(
            id=log.id,
            user_id=current_user.id,
            user_name=current_user.name,
            gesture_id=g.id,
            gesture_name=g.name,
            confidence=round(log.confidence * 100, 1),
            recognized_at=log.recognized_at
        )
        for log, g in logs
    ]

@router.post("/logs", status_code=status.HTTP_201_CREATED)
def record_recognition_event(
    req: RecognitionLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records a live recognition event for the current user.
    """
    # Verify gesture ownership
    gesture = db.query(Gesture).filter(
        Gesture.id == req.gesture_id,
        Gesture.user_id == current_user.id
    ).first()

    if not gesture:
        return {"status": "ignored"}

    new_log = RecognitionLog(
        user_id=current_user.id,
        gesture_id=gesture.id,
        confidence=req.confidence
    )
    db.add(new_log)
    db.commit()
    return {"status": "recorded", "log_id": new_log.id}