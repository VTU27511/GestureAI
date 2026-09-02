#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Starting GestureAI in GitHub Codespaces  "
echo "=========================================="

# 1. Setup Backend
echo "[1/4] Configuring backend..."
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|DATABASE_URL=.*|DATABASE_URL=sqlite:///./gestureai.db|' .env
  sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=*|' .env
fi

echo "[2/4] Installing Python requirements..."
pip install -r requirements.txt

echo "[3/4] Initializing Database & Seed Users..."
python ../scripts/init_db.py

echo "[4/4] Launching Backend Server on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Setup Frontend
cd ../frontend
echo "Installing npm dependencies..."
npm install

echo "Starting Frontend Dev Server on port 5173..."
npm run dev -- --host 0.0.0.0 --port 5173