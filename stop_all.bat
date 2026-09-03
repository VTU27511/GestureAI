@echo off
title Stop GestureAI
echo ===================================================
echo Stopping GestureAI Servers...
echo ===================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
echo.
echo All GestureAI servers have been stopped.
echo ===================================================
timeout /t 2
