@echo off
title GestureAI Launcher
echo ===================================================
echo Starting GestureAI — Hand Gesture Recognition Platform
echo ===================================================
echo.
echo 1. Launching Backend server (FastAPI + AI Engine)...
start "GestureAI Backend" cmd /c "%~dp0start_backend.bat"

echo 2. Launching Frontend server (Vite + React UI)...
start "GestureAI Frontend" cmd /c "%~dp0start_frontend.bat"

echo 3. Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo 4. Opening GestureAI in your browser...
start http://localhost:5173

echo.
echo ===================================================
echo GestureAI is now running!
echo You can minimize this window.
echo To stop everything, double-click stop_all.bat.
echo ===================================================
timeout /t 3