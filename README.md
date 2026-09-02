# GestureAI — Enterprise Multi-User Hand Gesture Recognition Platform

GestureAI is a real-time, multi-user custom hand gesture recognition platform engineered with **React**, **TypeScript**, **Vite**, **FastAPI**, **SQLAlchemy**, **PostgreSQL**, **OpenCV**, **MediaPipe**, **Scikit-learn**, and **Offline Windows SAPI Speech**.

The platform allows any user to define bespoke hand gestures, record training data via webcam with automatic landmark normalization, train isolated machine learning models, and recognize gestures with instantaneous offline spoken feedback. Administrators have complete visibility over user accounts, datasets, model artifacts, and platform-wide recognition logs.

---

## 1. System Requirements

* **Operating System**: Windows 10/11 (fully supported with native offline SAPI speech), Linux, or macOS
* **Python**: 3.10 or higher
* **Node.js**: v18 or higher (v24 LTS recommended)
* **PostgreSQL**: 14 or higher (PostgreSQL 18 tested and verified)
* **Hardware**: USB or integrated webcam (DirectShow supported)

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Tooling & Bundler**: Vite 5
- **Icons & UI**: Lucide React
- **Design System**: Cyber-slate modern responsive dark theme with CSS custom properties
- **Networking**: Axios (HTTP client with JWT interceptor) and native HTML5 WebSockets

### Backend
- **Framework**: FastAPI (high-performance async ASGI)
- **ORM & Database**: SQLAlchemy with PostgreSQL (`psycopg2-binary`)
- **Validation**: Pydantic v2
- **Authentication**: JWT (`python-jose`) with `bcrypt` password hashing
- **Computer Vision**: OpenCV (`cv2`) with DirectShow camera hardware access
- **Hand Tracking**: Google MediaPipe Hands (21 3D landmarks per hand)
- **Machine Learning**: Scikit-learn (`RandomForestClassifier`, 100 estimators) and NumPy
- **Speech Engine**: Offline Windows SAPI via `win32com.client` (daemonized background thread, 0ms latency, zero internet requirement)

---

## 3. Project Directory Structure

```
GestureAI/
├── frontend/                     # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/           # UI elements (GestureCard, StatusBadge, Modals, ProtectedRoute)
│   │   ├── pages/                # Auth, User Workspace, Admin Portal
│   │   │   ├── admin/            # AdminDashboard, AdminUsers, AdminUserDetail, AdminGestures, AdminTraining, AdminModels, AdminLogs
│   │   │   ├── auth/             # LoginPage, RegisterPage
│   │   │   └── user/             # UserDashboard, MyGestures, CreateGesture, GestureDetail, TrainingPage, RecognitionPage, ProfilePage
│   │   ├── layouts/              # Responsive Sidebar & Header DashboardLayout
│   │   ├── services/             # Axios API client, AdminService, GestureService, RecognitionService
│   │   ├── hooks/                # Auth context & React hooks
│   │   ├── types/                # Strict TypeScript interfaces
│   │   └── styles/               # Global CSS styling system
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint, CORS & WebSocket routing
│   │   ├── api/                  # Auth, Users, Gestures, Admin, Recognition & WebSockets
│   │   ├── database/             # SQLAlchemy engine & session dependency
│   │   ├── models/               # Database tables with FKs & cascades
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── services/             # Auth, MLService, SpeechEngine, AdminService, GestureService
│   │   └── vision/               # CameraManager, HandDetector, Normalizer, Extractor, ObjectDetector
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── trained_models/               # Serialized model artifacts (strictly isolated: user_{id}/active_model.pkl)
├── training_data/                # Raw landmarks datasets
├── scripts/
│   ├── init_db.py                # Database creation & initial seed script
│   ├── test_api.py               # Phase 1 automated test suite (12 test cases)
│   ├── test_ml_pipeline.py       # ML training, accuracy & prediction test
│   ├── test_phase2_e2e.py        # Phase 2 computer vision, ML & speech test suite
│   ├── test_prompt3_full.py      # Phase 3 admin, security, deactivation & isolation suite
│   └── recognition_terminal.py   # Standalone CLI recognition tool
├── recognition_terminal.py       # Root alias for CLI recognition tool
├── start_all.bat                 # One-click dual server launcher
├── start_backend.bat             # FastAPI backend launcher
├── start_frontend.bat            # Vite frontend launcher
└── README.md
```

---

## 4. Computer Vision & ML Pipeline

```
WEBCAM (OpenCV DirectShow)
            ↓
MEDIAPIPE HANDS (21 3D coordinates per hand)
            ↓
LANDMARK EXTRACTOR (Deterministic 63 or 126 features)
            ↓
NORMALIZER (Wrist translation & span scale invariance)
            ↓
USER-ISOLATED DATASET (PostgreSQL training_samples)
            ↓
RANDOM FOREST CLASSIFIER (100 estimators, stratified split)
            ↓
REAL-TIME INFERENCE (Probability evaluation)
            ↓
CONFIDENCE GATE (>= 85% threshold)
            ↓
OFFLINE WINDOWS SAPI SPEECH (Duplicate suppression & 2.0s cooldown)
```

### Normalization Mechanics
1. **Translation Invariance**: Wrist joint `landmark[0]` is subtracted from all 21 landmarks.
2. **Scale Invariance**: All relative coordinates are divided by `max(euclidean_distances)`.
*Result*: Hands are recognized identically whether positioned close, far, left, right, or centered in the camera frame.

---

## 5. Security & Multi-Tenant Data Isolation

1. **Authentication**: Signed JSON Web Tokens (JWT) using `HS256`. Passwords hashed with `bcrypt`.
2. **Strict User Isolation**:
   - Every gesture query verifies `user_id == current_user.id`.
   - Users cannot access, view, update, or delete another user's gestures (returns `404 Not Found`).
   - Models are serialized to isolated directories `trained_models/user_{id}/`. Users cannot load or predict using another user's model.
   - Recognition logs are private: users can only view their own history.
3. **Role-Based Access Control (RBAC)**:
   - All `/api/admin/*` endpoints strictly require `role == "ADMIN"`. Non-admin requests are rejected with `403 Forbidden`.
4. **Account Deactivation Security**:
   - When an administrator disables a user account (`is_active = False`), the user is immediately barred from logging in (`403 Forbidden`).
   - Existing active JWTs are rejected immediately upon token validation.
   - User datasets and trained models remain preserved in the database and are restored if re-activated.

---

## 6. How to Run GestureAI

### One-Click Startup (Recommended)
Double click:
```bash
start_all.bat
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **FastAPI API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Manual Startup
**Backend**:
```bash
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend**:
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 7. Default Credentials

| Role | Username | Password | Default Capabilities |
|---|---|---|---|
| **ADMIN** | `admin` | `admin123` | System Administration Center (`/admin`), User Management, Platform Gestures, Training Pipeline, Models Registry, Recognition Audit |
| **USER** | `demo` | `demo123` | Personal Gesture Dashboard, Fast Training Capture, Real-Time Recognition & Speech |

---

## 8. Standalone Terminal Recognition CLI

Run real-time gesture recognition directly in the terminal without opening a browser:
```bash
python recognition_terminal.py --user demo
# Or specify user by database ID:
python recognition_terminal.py --user 2
```
* Automatically loads the user's active model from `trained_models/user_{id}/active_model.pkl`.
* Displays real-time in-place status: FPS, detected gesture, confidence %, and spoken phrases.
* Synthesizes offline speech with native Windows SAPI.
* Press `Ctrl+C` or `q` in the camera window to safely release all webcam resources.

---

## 9. Automated Test Verification

All phases are backed by comprehensive automated test suites:

```bash
# 1. Foundation & Authentication Test Suite (12 tests)
.\backend\.venv\Scripts\python.exe .\scripts\test_api.py

# 2. Phase 2 Vision, ML & Offline Speech Test Suite
.\backend\.venv\Scripts\python.exe .\scripts\test_phase2_e2e.py

# 3. Phase 3 Admin Suite, Security & Isolation Test Suite
.\backend\.venv\Scripts\python.exe .\scripts\test_prompt3_full.py
```
**Test Pass Rate**: **100% across all suites**.