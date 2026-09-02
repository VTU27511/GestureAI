import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    gestures = relationship("Gesture", back_populates="user", cascade="all, delete-orphan")
    history = relationship("RecognitionHistory", back_populates="user", cascade="all, delete-orphan")


class Gesture(Base):
    __tablename__ = "gestures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "HELP", "WATER"
    type = Column(String, nullable=False)  # "static" or "dynamic"
    hands = Column(String, nullable=False) # "one" or "two"
    requires_object = Column(Boolean, default=False)
    object_label = Column(String, nullable=True) # e.g., "cup", "bottle", "cell phone"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="gestures")
    samples = relationship("GestureSample", back_populates="gesture", cascade="all, delete-orphan")


class GestureSample(Base):
    __tablename__ = "gesture_samples"

    id = Column(Integer, primary_key=True, index=True)
    gesture_id = Column(Integer, ForeignKey("gestures.id", ondelete="CASCADE"), nullable=False)
    # Landmarks serialized as a JSON string.
    # For static: a single frame of landmarks.
    # For dynamic: a list of frames of landmarks.
    landmarks_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    gesture = relationship("Gesture", back_populates="samples")


class RecognitionHistory(Base):
    __tablename__ = "recognition_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    gesture_name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="history")
