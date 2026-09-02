import sys
import os
import uuid
from pathlib import Path
import numpy as np

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.user import User
from app.models.gesture import Gesture, GestureType
from app.models.training_sample import TrainingSample
from app.services.ml_service import MLService

client = TestClient(app)

def run_prompt3_tests():
    print("==================================================")
    print("  GESTUREAI PROMPT 3: ADMIN + SECURITY + E2E TEST ")
    print("==================================================")

    db = SessionLocal()

    try:
        # 1. Register User A and User B
        uid = str(uuid.uuid4())[:8]
        user_a_data = {
            "name": f"Alice_{uid}",
            "username": f"alice_{uid}",
            "email": f"alice_{uid}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
        user_b_data = {
            "name": f"Bob_{uid}",
            "username": f"bob_{uid}",
            "email": f"bob_{uid}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }

        print("\n[TEST 1] Registering User A (Alice) and User B (Bob)...")
        r_a = client.post("/api/auth/register", json=user_a_data)
        assert r_a.status_code == 201, f"Alice reg failed: {r_a.text}"
        token_a = r_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        alice_id = r_a.json()["user"]["id"]

        r_b = client.post("/api/auth/register", json=user_b_data)
        assert r_b.status_code == 201, f"Bob reg failed: {r_b.text}"
        token_b = r_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        bob_id = r_b.json()["user"]["id"]
        print(f"  [PASS] Alice (id={alice_id}) and Bob (id={bob_id}) registered successfully")

        # 2. User A creates gestures
        print("\n[TEST 2] Alice creates custom gestures HELLO and THANK_YOU...")
        g1_res = client.post("/api/gestures", json={
            "name": "HELLO",
            "meaning": "Friendly greeting",
            "speech_text": "Hello there",
            "gesture_type": "ONE_HAND"
        }, headers=headers_a)
        assert g1_res.status_code == 201
        g1_id = g1_res.json()["id"]

        g2_res = client.post("/api/gestures", json={
            "name": "THANK_YOU",
            "meaning": "Gratitude sign",
            "speech_text": "Thank you very much",
            "gesture_type": "ONE_HAND"
        }, headers=headers_a)
        assert g2_res.status_code == 201
        g2_id = g2_res.json()["id"]
        print(f"  [PASS] Alice created gestures: HELLO (id={g1_id}) and THANK_YOU (id={g2_id})")

        # 3. User A adds synthetic samples & trains model
        print("\n[TEST 3] Generating samples and training model for Alice...")
        for g_id, g_pattern in [(g1_id, 1.0), (g2_id, 2.0)]:
            for _ in range(15):
                sample_pts = [{"x": float(np.sin(i * g_pattern)), "y": float(i * 0.05), "z": 0.0} for i in range(21)]
                s = TrainingSample(gesture_id=g_id, landmarks=sample_pts, hand_count=1)
                db.add(s)
        db.commit()

        train_res = client.post("/api/gestures/train", headers=headers_a)
        assert train_res.status_code == 200, f"Alice train failed: {train_res.text}"
        print(f"  [PASS] Alice trained model {train_res.json()['version']} (Acc: {train_res.json()['accuracy']}%)")

        # 4. Record a recognition log for Alice
        rec_res = client.post("/api/recognition/logs", json={
            "gesture_id": g1_id,
            "confidence": 0.965
        }, headers=headers_a)
        assert rec_res.status_code == 201
        print("  [PASS] Alice recorded personal recognition log event")

        # 5. STRICT USER ISOLATION TESTS
        print("\n[TEST 4] Testing Strict User Data Isolation (Bob vs Alice)...")
        # Bob cannot see Alice's gestures
        bob_gestures = client.get("/api/gestures", headers=headers_b).json()
        assert len(bob_gestures) == 0, f"Bob should have 0 gestures, got {len(bob_gestures)}"

        # Bob cannot GET Alice's gesture
        get_fail = client.get(f"/api/gestures/{g1_id}", headers=headers_b)
        assert get_fail.status_code == 404, f"Expected 404, got {get_fail.status_code}"

        # Bob cannot PUT Alice's gesture
        put_fail = client.put(f"/api/gestures/{g1_id}", json={"name": "HACKED"}, headers=headers_b)
        assert put_fail.status_code == 404, f"Expected 404, got {put_fail.status_code}"

        # Bob cannot DELETE Alice's gesture
        del_fail = client.delete(f"/api/gestures/{g1_id}", headers=headers_b)
        assert del_fail.status_code == 404, f"Expected 404, got {del_fail.status_code}"

        # Bob cannot load Alice's active model
        bob_model = client.get("/api/gestures/model/active", headers=headers_b).json()
        assert bob_model["has_active_model"] == False, "Bob should not have Alice's model"

        # Bob cannot see Alice's recognition logs
        bob_logs = client.get("/api/recognition/logs", headers=headers_b).json()
        assert len(bob_logs) == 0, f"Bob should have 0 logs, got {len(bob_logs)}"
        print("  [PASS] Strict user isolation verified across gestures, models, and recognition logs!")

        # 6. ADMIN AUTHORIZATION SECURITY
        print("\n[TEST 5] Testing Admin Role Protection (403 for regular users)...")
        for endpoint in ["/api/admin/stats", "/api/admin/users", "/api/admin/gestures", "/api/admin/training", "/api/admin/models", "/api/admin/logs"]:
            res = client.get(endpoint, headers=headers_a)
            assert res.status_code == 403, f"Expected 403 on {endpoint} for regular user, got {res.status_code}"
        print("  [PASS] Regular user blocked with 403 on all /api/admin/* endpoints")

        # 7. ADMIN PORTAL VERIFICATION
        print("\n[TEST 6] Admin login and platform inspection...")
        admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # Stats
        stats = client.get("/api/admin/stats", headers=headers_admin).json()
        assert stats["total_users"] >= 2
        assert stats["total_gestures"] >= 2
        assert stats["total_models"] >= 1
        print(f"  [PASS] Admin Stats verified: {stats}")

        # Users list
        users_list = client.get("/api/admin/users", headers=headers_admin).json()
        alice_entry = next((u for u in users_list if u["id"] == alice_id), None)
        assert alice_entry is not None
        assert alice_entry["gesture_count"] == 2
        assert alice_entry["total_samples"] == 30
        print(f"  [PASS] Admin saw Alice in users directory with 2 gestures and 30 samples")

        # User Detail inspection
        alice_detail = client.get(f"/api/admin/users/{alice_id}", headers=headers_admin).json()
        assert len(alice_detail["gestures"]) == 2
        assert alice_detail["gestures"][0]["name"] in ["HELLO", "THANK_YOU"]
        assert alice_detail["gestures"][0]["sample_count"] == 15
        assert alice_detail["gestures"][0]["status"] == "TRAINED"
        print(f"  [PASS] Admin inspected Alice's gesture breakdown with sample counts and status")

        # All Gestures
        all_gestures = client.get("/api/admin/gestures", headers=headers_admin).json()
        assert len(all_gestures) >= 2
        print(f"  [PASS] Admin retrieved all platform gestures ({len(all_gestures)} total)")

        # All Training Sessions
        training_sessions = client.get("/api/admin/training", headers=headers_admin).json()
        assert len(training_sessions) >= 1
        print(f"  [PASS] Admin retrieved all training sessions ({len(training_sessions)} total)")

        # All Models
        models_list = client.get("/api/admin/models", headers=headers_admin).json()
        assert len(models_list) >= 1
        print(f"  [PASS] Admin retrieved models registry ({len(models_list)} models)")

        # Recognition Logs
        logs_list = client.get("/api/admin/logs", headers=headers_admin).json()
        assert len(logs_list) >= 1
        print(f"  [PASS] Admin retrieved system recognition audit logs ({len(logs_list)} events)")

        # 8. ACCOUNT DEACTIVATION SECURITY
        print("\n[TEST 7] Testing Account Deactivation & Token Revocation...")
        # Admin disables Alice
        dis_res = client.put(f"/api/admin/users/{alice_id}/status", json={"is_active": False}, headers=headers_admin)
        assert dis_res.status_code == 200
        assert dis_res.json()["is_active"] == False

        # Alice attempts login while disabled -> 403
        login_disabled = client.post("/api/auth/login", json={"username": user_a_data["username"], "password": user_a_data["password"]})
        assert login_disabled.status_code == 403, f"Expected 403, got {login_disabled.status_code}"
        print("  [PASS] Disabled user login rejected with 403 Forbidden")

        # Alice attempts to use previously issued token -> 403
        me_disabled = client.get("/api/users/me", headers=headers_a)
        assert me_disabled.status_code == 403, f"Expected 403, got {me_disabled.status_code}"
        print("  [PASS] Existing token rejected with 403 Forbidden for deactivated user")

        # Admin re-enables Alice
        en_res = client.put(f"/api/admin/users/{alice_id}/status", json={"is_active": True}, headers=headers_admin)
        assert en_res.status_code == 200
        assert en_res.json()["is_active"] == True

        # Alice can log in again and data is intact
        login_restored = client.post("/api/auth/login", json={"username": user_a_data["username"], "password": user_a_data["password"]})
        assert login_restored.status_code == 200
        new_token_a = login_restored.json()["access_token"]
        new_headers_a = {"Authorization": f"Bearer {new_token_a}"}

        restored_gestures = client.get("/api/gestures", headers=new_headers_a).json()
        assert len(restored_gestures) == 2
        print("  [PASS] User account re-activated; all gestures and data preserved intact!")

        print("\n==================================================")
        print("  ALL PROMPT 3 TESTS PASSED! 100% SUCCESSFUL      ")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_prompt3_tests()