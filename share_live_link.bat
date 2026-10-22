@echo off
title GestureAI - Live Share Link Generator
color 0b
echo ===================================================================
echo             GestureAI - Instant Live Public Link Generator
echo ===================================================================
echo.
echo Checking backend and frontend status...
echo.

:: 1. Check & start Backend (Port 8000)
netstat -ano | findstr ":8000 " >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Backend is not running. Starting FastAPI backend server...
    start "GestureAI Backend" cmd /c "%~dp0start_backend.bat"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Backend is already running on port 8000.
)

:: 2. Check & start Frontend (Port 5173)
netstat -ano | findstr ":5173 " >nul 2>&1
if %errorlevel% neq 0 (
    echo [2/3] Frontend is not running. Starting Vite frontend server...
    start "GestureAI Frontend" cmd /c "%~dp0start_frontend.bat"
    timeout /t 4 /nobreak >nul
) else (
    echo [2/3] Frontend is already running on port 5173.
)

echo.
echo ===================================================================
echo  Generating your instant HTTPS Shareable Link...
echo  (Camera, WebSockets, Telugu/Tamil/English voice will work on this link!)
echo ===================================================================
echo.
echo Choose your preferred sharing tunnel:
echo   [1] Pinggy SSH Tunnel  (Fastest, Instant HTTPS, No install needed)
echo   [2] Cloudflare Tunnel  (Ultra-secure, via npx untun)
echo   [3] Localtunnel        (Classic .loca.lt URL)
echo.
set /p choice="Enter option (1, 2, or 3) [Default: 1]: "

if "%choice%"=="2" goto cloudflare
if "%choice%"=="3" goto localtunnel

:pinggy
echo.
echo Connecting to Pinggy HTTPS tunnel on port 5173...
echo Copy the HTTPS link printed below and share it with anyone!
echo Keep this window OPEN while sharing. Press Ctrl+C to stop.
echo.
ssh -p 443 -R0:localhost:5173 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 a.pinggy.io
goto end

:cloudflare
echo.
echo Launching Cloudflare Tunnel on port 5173...
echo Copy the HTTPS link printed below and share it with anyone!
echo Keep this window OPEN while sharing. Press Ctrl+C to stop.
echo.
call npx --yes untun@latest tunnel http://localhost:5173
goto end

:localtunnel
echo.
echo Launching Localtunnel on port 5173...
echo Copy the HTTPS link printed below and share it with anyone!
echo Keep this window OPEN while sharing. Press Ctrl+C to stop.
echo.
call npx --yes localtunnel --port 5173
goto end

:end
pause
