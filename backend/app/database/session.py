import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load .env from backend root
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure resilient database engine with automatic SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def init_engine():
    global DATABASE_URL
    # 1. If explicit SQLite database specified
    if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False}), DATABASE_URL

    # 2. If custom PostgreSQL DATABASE_URL is configured (e.g. Render, Supabase, Neon, or .env)
    if DATABASE_URL:
        try:
            test_engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10, connect_args={"connect_timeout": 3})
            with test_engine.connect() as conn:
                pass
            return test_engine, DATABASE_URL
        except Exception as e:
            print(f"[Database Notice] Configured DATABASE_URL unreachable ({e}). Falling back to SQLite.")
            sqlite_url = "sqlite:///./gestureai.db"
            return create_engine(sqlite_url, connect_args={"check_same_thread": False}), sqlite_url

    # 3. If local PostgreSQL is available on laptop (port 5432)
    local_pg = "postgresql://postgres:ranjith@localhost:5432/gestureai_db"
    if not os.getenv("RENDER"):
        try:
            test_engine = create_engine(local_pg, pool_pre_ping=True, pool_size=5, max_overflow=10, connect_args={"connect_timeout": 3})
            with test_engine.connect() as conn:
                pass
            return test_engine, local_pg
        except Exception:
            print("[Database Notice] Local PostgreSQL (localhost:5432) not reachable. Falling back to SQLite.")

    # 4. Safe Default: Local SQLite database (works anywhere without external services)
    sqlite_url = "sqlite:///./gestureai.db"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False}), sqlite_url

engine, DATABASE_URL = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
