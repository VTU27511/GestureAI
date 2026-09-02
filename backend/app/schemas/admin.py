from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
from app.models.gesture import GestureType
from app.models.training_session import TrainingStatus

class AdminUserListItem(BaseModel):
    id: int
    name: str
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    gesture_count: int = 0
    session_count: int = 0
    model_count: int = 0
    total_samples: int = 0

    class Config:
        from_attributes = True

class AdminStats(BaseModel):
    total_users: int = 0
    active_users: int = 0
    total_gestures: int = 0
    total_samples: int = 0
    total_models: int = 0
    total_sessions: int = 0
    total_recognitions: int = 0

class UserStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

class AdminGestureListItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    name: str
    meaning: str
    speech_text: str
    gesture_type: GestureType
    object_name: Optional[str] = None
    samples_count: int = 0
    status: str = "NOT TRAINED"
    created_at: datetime
    accuracy: Optional[float] = None
    model_version: Optional[str] = None

class AdminTrainingListItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    gesture_id: int
    gesture_name: str
    sample_count: int
    valid_samples: int
    invalid_samples: int
    model_type: Optional[str] = "Random Forest"
    accuracy: Optional[float] = None
    status: TrainingStatus
    started_at: datetime
    completed_at: Optional[datetime] = None

class AdminModelListItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    gesture_id: Optional[int] = None
    gesture_name: Optional[str] = None
    model_type: str
    version: str
    accuracy: Optional[float] = None
    sample_count: int
    is_active: bool
    created_at: datetime

class RecognitionLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    gesture_id: int
    gesture_name: str
    confidence: float
    recognized_at: datetime

    class Config:
        from_attributes = True

class RecognitionLogCreate(BaseModel):
    gesture_id: int
    confidence: float