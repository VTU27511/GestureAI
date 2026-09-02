@echo off
title GestureAI Launcher
echo ===================================================
echo Starting GestureAI — Hand Gesture Recognition Platform
echo ===================================================
echo.
echo 1. Launching Backend server (FastAPI + PostgreSQL)...
start "GestureAI Backend" cmd /c "%~dp0start_backend.bat"
timeout /t 2 /nobreak >nul
echo 2. Launching Frontend server (Vite + React + TS)...
start "GestureAI Frontend" cmd /c "%~dp0start_frontend.bat"
echo.
echo Both servers started!
echo Open your browser at: http://localhost:5173
echo.
timeout /t 4