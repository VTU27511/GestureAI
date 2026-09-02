import sys
from pathlib import Path
import time
import uuid

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("  GESTUREAI AUTOMATED API TEST SUITE")
    print("==================================================")

    uid = uuid.uuid4().hex[:6]
    user_a_username = f"testuser_a_{uid}"
    user_a_email = f"user_a_{uid}@test.com"

    user_b_username = f"testuser_b_{uid}"
    user_b_email = f"user_b_{uid}@test.com"

    # 1. Health check
    print("\n[TEST 1] Testing Health Check...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("  [PASS] Health check returned 200 OK")

    # 2. Registration validation (password mismatch)
    print("\n[TEST 2] Testing Password Mismatch on Register...")
    r = client.post("/api/auth/register", json={
        "name": "Invalid User",
        "username": "invalid_user",
        "email": "invalid@test.com",
        "password": "password123",
        "confirm_password": "password456"
    })
    assert r.status_code == 422, f"Expected 422 for password mismatch, got: {r.status_code}"
    print("  [PASS] Password mismatch correctly rejected with 422")

    # 3. Register User A
    print("\n[TEST 3] Registering User A...")
    r = client.post("/api/auth/register", json={
        "name": "User Alpha",
        "username": user_a_username,
        "email": user_a_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    })
    assert r.status_code == 201, f"Failed registering User A: {r.text}"
    data_a = r.json()
    assert "access_token" in data_a, "No access token returned for User A"
    token_a = data_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print(f"  [PASS] User A registered successfully (id={data_a['user']['id']})")

    # 4. Login User A
    print("\n[TEST 4] Logging in User A with username and password...")
    r = client.post("/api/auth/login", json={
        "username": user_a_username,
        "password": "SecurePassword123!"
    })
    assert r.status_code == 200, f"Failed login for User A: {r.text}"
    print("  [PASS] User A logged in successfully")

    # 5. Register User B
    print("\n[TEST 5] Registering User B...")
    r = client.post("/api/auth/register", json={
        "name": "User Beta",
        "username": user_b_username,
        "email": user_b_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    })
    assert r.status_code == 201, f"Failed registering User B: {r.text}"
    token_b = r.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("  [PASS] User B registered successfully")

    # 6. Current User info
    print("\n[TEST 6] Testing /api/users/me...")
    r = client.get("/api/users/me", headers=headers_a)
    assert r.status_code == 200
    assert r.json()["username"] == user_a_username
    print("  [PASS] User A profile retrieved successfully")

    # 7. Create Gestures for User A
    print("\n[TEST 7] User A creates custom gestures...")
    # One Hand Gesture
    r = client.post("/api/gestures", headers=headers_a, json={
        "name": "PEACE_SIGN",
        "meaning": "Victory / Peace Sign",
        "speech_text": "Peace and Victory",
        "gesture_type": "ONE_HAND"
    })
    assert r.status_code == 201, f"Failed to create gesture: {r.text}"
    gesture_a = r.json()
    gesture_a_id = gesture_a["id"]
    assert gesture_a["name"] == "PEACE_SIGN"
    assert gesture_a["status"] == "NOT TRAINED"
    print(f"  [PASS] User A created gesture: PEACE_SIGN (id={gesture_a_id})")

    # Hand + Object Gesture
    r = client.post("/api/gestures", headers=headers_a, json={
        "name": "HOLDING_CUP",
        "meaning": "Hand holding a coffee cup",
        "speech_text": "Taking a coffee break",
        "gesture_type": "HAND_OBJECT",
        "object_name": "Coffee Cup"
    })
    assert r.status_code == 201
    print("  [PASS] User A created HAND + OBJECT gesture with object_name='Coffee Cup'")

    # 8. User A reads their gestures
    r = client.get("/api/gestures", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 2
    print(f"  [PASS] User A sees their 2 gestures")

    # 9. USER DATA ISOLATION TEST
    print("\n[TEST 9] *** USER DATA ISOLATION VERIFICATION ***")
    # User B lists gestures -> MUST BE 0!
    r = client.get("/api/gestures", headers=headers_b)
    assert r.status_code == 200
    assert len(r.json()) == 0, f"User B should see 0 gestures, saw: {len(r.json())}"
    print("  [PASS] User B cannot see User A's gestures in list (count = 0)")

    # User B attempts to access User A's gesture directly by ID -> MUST BE 404
    r = client.get(f"/api/gestures/{gesture_a_id}", headers=headers_b)
    assert r.status_code == 404, f"Expected 404 for unauthorized access, got: {r.status_code}"
    print(f"  [PASS] User B GET /api/gestures/{gesture_a_id} returned 404 (isolation enforced)")

    # User B attempts to update User A's gesture -> MUST BE 404
    r = client.put(f"/api/gestures/{gesture_a_id}", headers=headers_b, json={
        "name": "HACKED"
    })
    assert r.status_code == 404, f"Expected 404 for unauthorized update, got: {r.status_code}"
    print(f"  [PASS] User B PUT /api/gestures/{gesture_a_id} returned 404 (isolation enforced)")

    # User B attempts to delete User A's gesture -> MUST BE 404
    r = client.delete(f"/api/gestures/{gesture_a_id}", headers=headers_b)
    assert r.status_code == 404, f"Expected 404 for unauthorized delete, got: {r.status_code}"
    print(f"  [PASS] User B DELETE /api/gestures/{gesture_a_id} returned 404 (isolation enforced)")

    # 10. Update Gesture by Owner (User A)
    print("\n[TEST 10] User A updates their own gesture...")
    r = client.put(f"/api/gestures/{gesture_a_id}", headers=headers_a, json={
        "speech_text": "Updated speech: Peace on Earth"
    })
    assert r.status_code == 200
    assert r.json()["speech_text"] == "Updated speech: Peace on Earth"
    print("  [PASS] Gesture updated successfully by owner")

    # 11. Delete Gesture by Owner (User A)
    print("\n[TEST 11] User A deletes their gesture...")
    r = client.delete(f"/api/gestures/{gesture_a_id}", headers=headers_a)
    assert r.status_code == 204
    print("  [PASS] Gesture deleted successfully by owner")

    # Verify deletion
    r = client.get(f"/api/gestures/{gesture_a_id}", headers=headers_a)
    assert r.status_code == 404
    print("  [PASS] Verified gesture no longer exists")

    # 12. Admin Role & Access
    print("\n[TEST 12] Testing Role-Based Access (USER vs ADMIN)...")
    # Regular user attempting admin route -> MUST BE 403
    r = client.get("/api/admin/users", headers=headers_a)
    assert r.status_code == 403, f"Expected 403 for non-admin, got: {r.status_code}"
    print("  [PASS] Regular user blocked with 403 Forbidden on /api/admin/users")

    # Login as Admin
    r = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  [PASS] Admin logged in successfully")

    # Admin access to /api/admin/users
    r = client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    user_list = r.json()
    assert len(user_list) >= 2
    print(f"  [PASS] Admin can list all users ({len(user_list)} users found)")

    # Admin access to /api/admin/stats
    r = client.get("/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    stats = r.json()
    assert "total_users" in stats
    assert "total_gestures" in stats
    print(f"  [PASS] Admin stats retrieved: {stats}")

    print("\n==================================================")
    print("  ALL 12 TESTS PASSED PERFECTLY! 100% SUCCESS")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
