from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class TrainingSample(Base):
    __tablename__ = "training_samples"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    gesture_id = Column(Integer, ForeignKey("gestures.id", ondelete="CASCADE"), nullable=False, index=True)
    landmarks = Column(JSON, nullable=False)
    hand_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    gesture = relationship("Gesture", back_populates="training_samples")

    def __repr__(self):
        return f"<TrainingSample id={self.id} gesture_id={self.gesture_id} hand_count={self.hand_count}>"
