#!/usr/bin/env bash
set -e

# Get absolute workspace root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=========================================="
echo " Starting GestureAI in GitHub Codespaces  "
echo "=========================================="

# 1. Install headless OpenCV & dependencies
echo "[1/4] Preparing backend environment..."
cd "$ROOT_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
fi
sed -i 's|DATABASE_URL=.*|DATABASE_URL=sqlite:///./gestureai.db|' .env
sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=*|' .env

echo "[2/4] Installing Python requirements..."
pip install -r requirements.txt
pip install opencv-python-headless

echo "[3/4] Initializing Database & Seed Users..."
python "$ROOT_DIR/scripts/init_db.py"

echo "[4/4] Launching Backend Server on port 8000..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
sleep 2

# Check if backend is alive
curl -s http://127.0.0.1:8000/ || true
echo ""
echo "Backend is live on port 8000!"

# 2. Setup Frontend
echo "[5/5] Launching Frontend on port 5173..."
cd "$ROOT_DIR/frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 5173