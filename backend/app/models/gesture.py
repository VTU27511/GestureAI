import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class GestureType(str, enum.Enum):
    ONE_HAND = "ONE_HAND"
    TWO_HANDS = "TWO_HANDS"
    HAND_OBJECT = "HAND_OBJECT"

class Gesture(Base):
    __tablename__ = "gestures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    meaning = Column(String(255), nullable=False)
    speech_text = Column(String(255), nullable=False)
    gesture_type = Column(
        Enum(GestureType, name="gesture_type_enum", native_enum=False),
        default=GestureType.ONE_HAND,
        nullable=False,
        index=True
    )
    object_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="gestures")
    training_samples = relationship("TrainingSample", back_populates="gesture", cascade="all, delete-orphan")
    training_sessions = relationship("TrainingSession", back_populates="gesture", cascade="all, delete-orphan")
    models = relationship("MLModel", back_populates="gesture", cascade="all, delete-orphan")
    recognition_logs = relationship("RecognitionLog", back_populates="gesture", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Gesture id={self.id} name='{self.name}' user_id={self.user_id}>"
