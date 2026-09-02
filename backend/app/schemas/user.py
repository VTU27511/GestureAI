from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserBase(BaseModel):
    name: str
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserStats(BaseModel):
    total_gestures: int = 0
    total_samples: int = 0
    trained_models: int = 0
    recognition_sessions: int = 0
