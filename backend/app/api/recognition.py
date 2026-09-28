from typing import List, Optional
from pydantic import BaseModel
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


import os
from fastapi.responses import FileResponse

class SpeechTestRequest(BaseModel):
    text: Optional[str] = None
    lang: Optional[str] = "te"
    gender: Optional[str] = "female"


@router.post("/speech/test")
def test_speech(req: SpeechTestRequest):
    """
    Synthesizes fluent Telugu, Tamil, or English speech with Male/Female voice selection.
    Returns audio_base64 for immediate browser playback AND plays on host system.
    """
    from app.services.speech_service import SpeechEngine
    engine = SpeechEngine.get_instance()
    lang = req.lang or "te"
    gender = req.gender or "female"

    default_texts = {
        "te": "నమస్కారం! గెస్చర్ ఏఐ తెలుగు వాయిస్ అద్భుతంగా పనిచేస్తోంది.",
        "ta": "வணக்கம்! கெஸ்ச்சர் ஏஐ தமிழ் குரல் சிறப்பாக செயல்படுகிறது.",
        "en": "Hello! GestureAI speech synthesis is working properly."
    }

    raw_text = req.text or default_texts.get(lang, "Hello! Welcome to GestureAI.")
    utterance = engine.to_fluent_phrase("", raw_text, language=lang)
    audio_path, audio_b64 = engine.get_synthesized_audio(utterance, lang=lang, gender=gender)

    if audio_path:
        engine._play_audio_file(audio_path)

    return {
        "status": "ok",
        "spoken": utterance,
        "lang": lang,
        "gender": gender,
        "audio_base64": audio_b64
    }


@router.get("/speech/stream")
def stream_speech(text: str, lang: str = "te", gender: str = "female"):
    """
    Streams synthesized MP3 audio directly to browser HTML5 Audio player.
    """
    from app.services.speech_service import SpeechEngine
    engine = SpeechEngine.get_instance()
    utterance = engine.to_fluent_phrase("", text, language=lang)
    audio_path, _ = engine.get_synthesized_audio(utterance, lang=lang, gender=gender)
    if audio_path and os.path.exists(audio_path):
        return FileResponse(audio_path, media_type="audio/mpeg", filename=f"speech_{lang}_{gender}.mp3")
    return {"error": "Failed to synthesize speech"}