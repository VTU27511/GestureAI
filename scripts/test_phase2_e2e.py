import sys
import os
from pathlib import Path
import numpy as np

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.services.speech_service import SpeechEngine
from app.services.ml_service import MLService
from app.vision.normalizer import LandmarkNormalizer
from app.vision.landmark_extractor import LandmarkExtractor
from app.models.gesture import GestureType
from app.database.session import SessionLocal
from app.models.user import User

client = TestClient(app)

def run_phase2_tests():
    print("==================================================")
    print("  GESTUREAI PHASE 2 COMPUTER VISION & ML SUITE    ")
    print("==================================================")

    # 1. Login demo user
    print("\n[TEST 1] Logging in as demo user...")
    r = client.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token_demo = r.json()["access_token"]
    headers_demo = {"Authorization": f"Bearer {token_demo}"}
    print("  [PASS] Demo user authenticated successfully")

    # 2. Check active model endpoint
    print("\n[TEST 2] Checking GET /api/gestures/model/active...")
    r = client.get("/api/gestures/model/active", headers=headers_demo)
    assert r.status_code == 200
    data = r.json()
    assert data["has_active_model"] == True
    print(f"  [PASS] Active model returned: version {data.get('version')}, {data.get('accuracy')}% accuracy")

    # 3. Trigger model training endpoint
    print("\n[TEST 3] Triggering POST /api/gestures/train...")
    r = client.post("/api/gestures/train", headers=headers_demo)
    assert r.status_code == 200, f"Train failed: {r.text}"
    train_res = r.json()
    assert "version" in train_res
    assert "accuracy" in train_res
    print(f"  [PASS] Training endpoint completed: {train_res['version']} (Accuracy: {train_res['accuracy']}%)")

    # 4. Test normalizer invariance
    print("\n[TEST 4] Testing normalizer translation and scale invariance...")
    # Base 21 3D points
    base_points = np.random.uniform(0.2, 0.8, (21, 3)).astype(np.float32)
    vec1 = base_points.flatten()

    # Shift hand by +0.3 in X and +0.2 in Y (translation) and scale by 1.5x (distance)
    shifted_points = (base_points * 1.5) + np.array([0.3, 0.2, 0.0], dtype=np.float32)
    vec2 = shifted_points.flatten()

    norm1 = LandmarkNormalizer.normalize(vec1)
    norm2 = LandmarkNormalizer.normalize(vec2)

    diff = np.max(np.abs(norm1 - norm2))
    assert diff < 1e-4, f"Normalizer invariance failed, max diff = {diff}"
    print(f"  [PASS] Normalizer invariance verified (diff = {diff:.6f} < 1e-4)")

    # 5. Test speech engine duplicate suppression
    print("\n[TEST 5] Testing SpeechEngine duplicate prevention...")
    speech = SpeechEngine.get_instance()
    speech.reset_state()

    # Initial recognition of HELLO -> speaks
    s1 = speech.process_recognition("HELLO", "Hello there!", 0.95)
    assert s1 == True
    print("  [PASS] Initial recognition speaks successfully")

    # Repeated recognition in next frame -> suppressed
    s2 = speech.process_recognition("HELLO", "Hello there!", 0.95)
    assert s2 == False
    print("  [PASS] Duplicate within cooldown successfully suppressed")

    # Transition to THUMBS_UP -> speaks immediately
    s3 = speech.process_recognition("THUMBS_UP", "Great job!", 0.92)
    assert s3 == True
    print("  [PASS] Gesture transition speaks immediately")

    # Low confidence (< 85%) -> ignored
    s4 = speech.process_recognition("HELLO", "Hello", 0.70)
    assert s4 == False
    print("  [PASS] Low confidence (<85%) suppressed")

    # 6. Model user isolation
    print("\n[TEST 6] Testing Model Data Isolation...")
    # Register another user
    import uuid; uid = f"iso_{uuid.uuid4().hex[:6]}"
    r = client.post("/api/auth/register", json={
        "name": "Isolation User",
        "username": f"user_{uid}",
        "email": f"user_{uid}@test.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_other = r.json()["access_token"]
    headers_other = {"Authorization": f"Bearer {token_other}"}

    # New user should have NO active model (isolated from demo user's model)
    r = client.get("/api/gestures/model/active", headers=headers_other)
    assert r.status_code == 200
    assert r.json()["has_active_model"] == False
    print("  [PASS] User B cannot access User A's trained model (has_active_model=False)")

    print("\n==================================================")
    print("  ALL PHASE 2 TESTS PASSED! 100% OPERATIONAL     ")
    print("==================================================")

if __name__ == "__main__":
    run_phase2_tests()
