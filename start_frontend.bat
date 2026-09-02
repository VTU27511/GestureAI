@echo off
title GestureAI Frontend Server
echo ===================================================
echo Starting GestureAI Frontend (Vite) on port 5173...
echo ===================================================
cd /d "%~dp0frontend"
call npm.cmd run dev -- --host 0.0.0.0 --port 5173
pause