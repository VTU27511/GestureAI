from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base

class MLModel(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gesture_id = Column(Integer, ForeignKey("gestures.id", ondelete="SET NULL"), nullable=True, index=True)
    model_path = Column(String(500), nullable=False)
    model_type = Column(String(100), default="RANDOM_FOREST", nullable=False)
    version = Column(String(20), default="1.0.0", nullable=False)
    accuracy = Column(Float, nullable=True)
    sample_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="models")
    gesture = relationship("Gesture", back_populates="models")

    def __repr__(self):
        return f"<MLModel id={self.id} user_id={self.user_id} version='{self.version}'>"
