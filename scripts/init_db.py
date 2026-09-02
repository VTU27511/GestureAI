import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from app.database.base import Base
from app.database.session import DATABASE_URL
import app.models
from app.models.user import User, UserRole
from app.models.gesture import Gesture, GestureType
from app.services.auth_service import hash_password
from sqlalchemy.orm import sessionmaker

def ensure_database_exists():
    print("[1/3] Checking PostgreSQL database...")
    # Extract host, port, user, password from DATABASE_URL
    # Standard format: postgresql://postgres:ranjith@localhost:5432/gestureai_db
    try:
        import urllib.parse as urlparse
        url = urlparse.urlparse(DATABASE_URL)
        dbname = url.path[1:] if url.path else "gestureai_db"
        user = url.username or "postgres"
        password = url.password or "ranjith"
        host = url.hostname or "localhost"
        port = url.port or 5432

        # Connect to default 'postgres' db to check / create gestureai_db
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = %s;", (dbname,))
        exists = cur.fetchone()
        if not exists:
            print(f"Creating database '{dbname}'...")
            cur.execute(f'CREATE DATABASE "{dbname}";')
            print(f"Database '{dbname}' created successfully.")
        else:
            print(f"Database '{dbname}' already exists.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Warning during database verification: {e}")

def initialize_tables():
    print("[2/3] Creating tables in PostgreSQL...")
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")
    return engine

def seed_initial_data(engine):
    print("[3/3] Seeding initial admin and demo users...")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Check if Admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                name="System Administrator",
                username="admin",
                email="admin@gestureai.com",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("  Created Admin user: username='admin', password='admin123'")
        else:
            print("  Admin user already exists.")

        # Check if Demo User exists
        demo = db.query(User).filter(User.username == "demo").first()
        if not demo:
            demo = User(
                name="Demo User",
                username="demo",
                email="demo@gestureai.com",
                password_hash=hash_password("demo123"),
                role=UserRole.USER,
                is_active=True
            )
            db.add(demo)
            db.commit()
            db.refresh(demo)
            print("  Created Demo user: username='demo', password='demo123'")

            # Add sample gestures for Demo user
            sample_g1 = Gesture(
                user_id=demo.id,
                name="HELLO",
                meaning="Hello greeting with open palm",
                speech_text="Hello! Nice to meet you.",
                gesture_type=GestureType.ONE_HAND
            )
            sample_g2 = Gesture(
                user_id=demo.id,
                name="THUMBS_UP",
                meaning="Approval gesture with thumb raised",
                speech_text="Great job!",
                gesture_type=GestureType.ONE_HAND
            )
            sample_g3 = Gesture(
                user_id=demo.id,
                name="BOOK_READ",
                meaning="Hand holding a book or notebook",
                speech_text="Reading a book.",
                gesture_type=GestureType.HAND_OBJECT,
                object_name="Book"
            )
            db.add_all([sample_g1, sample_g2, sample_g3])
            db.commit()
            print("  Created sample gestures for Demo user.")
        else:
            print("  Demo user already exists.")

    except Exception as e:
        db.rollback()
        print(f"Error while seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    print("========================================")
    print(" GestureAI Database Initialization ")
    print("========================================")
    ensure_database_exists()
    engine = initialize_tables()
    seed_initial_data(engine)
    print("========================================")
    print("Database setup complete!")
