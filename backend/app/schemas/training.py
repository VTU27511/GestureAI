from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel
from app.models.training_session import TrainingStatus

class TrainingSessionCreate(BaseModel):
    gesture_id: int

class TrainingSessionResponse(BaseModel):
    id: int
    user_id: int
    gesture_id: int
    sample_count: int
    valid_samples: int
    invalid_samples: int
    status: TrainingStatus
    accuracy: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TrainingSampleCreate(BaseModel):
    gesture_id: int
    landmarks: Any
    hand_count: int = 1

class TrainingSampleResponse(BaseModel):
    id: int
    gesture_id: int
    landmarks: Any
    hand_count: int
    created_at: datetime

    class Config:
        from_attributes = True
