@echo off
chcp 65001 >nul
title Hismith Servok Premium H2 — Local Launcher
cd /d "%~dp0"

:: Falls start_windows.bat im selben Ordner existiert, fuehre diese aus
if exist "%~dp0start_windows.bat" (
    call "%~dp0start_windows.bat"
    exit /b %ERRORLEVEL%
)

:: Eigenstaendiger Fallback (gleiche Logik wie start_windows.bat)
echo ===============================================================================
echo   HISMITH SERVOK PREMIUM H2 — OBSIDIAN KINETIC COCKPIT
echo   Lokaler 1-Klick Start via Node.js
echo ===============================================================================
echo.

netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Der lokale Server laeuft bereits auf Port 3000.
    echo [OK] Oeffne deinen Standard-Webbrowser...
    powershell -NoProfile -Command "Start-Process 'http://localhost:3000'" 2>nul || start "" "http://localhost:3000"
    exit /b 0
)

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Node.js wurde auf diesem PC nicht gefunden!
    echo Bitte installiere Node.js von https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Installiere Pakete (npm install)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [FEHLER] npm install fehlgeschlagen.
        pause
        exit /b 1
    )
)

echo [INFO] Starte lokalen Server auf Port 3000...
start "Hismith Servok Local Server" /min cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo [OK] Oeffne deinen Standard-Webbrowser...
powershell -NoProfile -Command "Start-Process 'http://localhost:3000'" 2>nul || start "" "http://localhost:3000"

exit
