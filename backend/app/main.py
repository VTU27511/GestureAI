import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.api.ws import router as ws_router
from app.database.base import Base
from app.database.session import engine
from app.vision.camera import CameraManager
import app.models

# Load environment
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="GestureAI Platform API",
    description="Real-time multi-user custom hand gesture recognition backend API",
    version="1.0.0"
)

# CORS Configuration
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router and WebSockets Router
app.include_router(api_router)
app.include_router(ws_router)

@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Startup Warning] Could not auto-create tables: {e}")

@app.on_event("shutdown")
def on_shutdown():
    # Release camera hardware cleanly
    try:
        CameraManager.get_instance().release()
        print("[Shutdown] Camera released cleanly.")
    except Exception as e:
        print(f"[Shutdown Error] {e}")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GestureAI API",
        "version": "1.0.0",
        "vision": "MediaPipe + OpenCV Active",
        "speech": "Offline Windows SAPI Active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)