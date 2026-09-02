import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class TrainingStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gesture_id = Column(Integer, ForeignKey("gestures.id", ondelete="CASCADE"), nullable=False, index=True)
    sample_count = Column(Integer, default=0, nullable=False)
    valid_samples = Column(Integer, default=0, nullable=False)
    invalid_samples = Column(Integer, default=0, nullable=False)
    status = Column(
        Enum(TrainingStatus, name="training_status_enum", native_enum=False),
        default=TrainingStatus.PENDING,
        nullable=False
    )
    accuracy = Column(Float, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="training_sessions")
    gesture = relationship("Gesture", back_populates="training_sessions")

    def __repr__(self):
        return f"<TrainingSession id={self.id} gesture_id={self.gesture_id} status='{self.status}'>"
