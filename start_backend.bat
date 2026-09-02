@echo off
title GestureAI Backend Server
echo ===================================================
echo Starting GestureAI Backend (FastAPI) on port 8000...
echo ===================================================
cd /d "%~dp0backend"
"%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause