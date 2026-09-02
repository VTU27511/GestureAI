import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to SQLite in the local workspace directory to avoid background RAM/CPU overhead.
# Allow PostgreSQL via environment variable (DATABASE_URL) if specified.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./signbridge.db")

# SQLite adjustments for multithreading in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
