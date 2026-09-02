from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Auth Schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Gesture Schemas
class GestureCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: str = Field("static", description="'static' or 'dynamic'")
    hands: str = Field("one", description="'one' or 'two'")
    requires_object: bool = False
    object_label: Optional[str] = None

class GestureResponse(BaseModel):
    id: int
    name: str
    type: str
    hands: str
    requires_object: bool
    object_label: Optional[str]
    created_at: datetime
    sample_count: int

    class Config:
        from_attributes = True

# Sample Schemas
class SampleCreate(BaseModel):
    # Serialized JSON of landmarks
    landmarks_json: str

# History Schemas
class HistoryResponse(BaseModel):
    id: int
    gesture_name: str
    confidence: float
    timestamp: datetime

    class Config:
        from_attributes = True

# Metrics
class SystemStats(BaseModel):
    cpu_percent: float
    ram_percent: float
    ram_used_mb: float
    loaded_models: List[str]
