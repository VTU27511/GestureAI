from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.gesture import GestureType

class GestureBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Gesture Name (e.g., HELLO)")
    meaning: str = Field(..., min_length=1, max_length=255, description="Meaning / Description")
    speech_text: str = Field(..., min_length=1, max_length=255, description="Speech text spoken on recognition")
    gesture_type: GestureType = Field(default=GestureType.ONE_HAND)
    object_name: Optional[str] = Field(None, max_length=100, description="Required if HAND_OBJECT")

class GestureCreate(GestureBase):
    pass

class GestureUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    meaning: Optional[str] = Field(None, min_length=1, max_length=255)
    speech_text: Optional[str] = Field(None, min_length=1, max_length=255)
    gesture_type: Optional[GestureType] = None
    object_name: Optional[str] = None

class GestureResponse(GestureBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    samples_count: int = 0
    status: str = "NOT TRAINED"

    class Config:
        from_attributes = True

class GestureDetailResponse(GestureResponse):
    pass
