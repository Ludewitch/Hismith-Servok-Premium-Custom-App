@echo off
chcp 65001 >nul
title Hismith Servok Premium H2 Studio
cd /d "%~dp0"

echo ===============================================================================
echo   HISMITH SERVOK PREMIUM H2 — OBSIDIAN KINETIC COCKPIT
echo   Lokaler 1-Klick Start via Node.js
echo ===============================================================================
echo.

:: 1. Pruefen, ob der Server bereits aktiv auf Port 3000 laeuft
netstat -ano 2>nul | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Der lokale Server laeuft bereits auf Port 3000.
    echo [OK] Oeffne deinen Standard-Webbrowser...
    powershell -NoProfile -Command "Start-Process 'http://localhost:3000'" 2>nul || start "" "http://localhost:3000"
    exit /b 0
)

:: 2. Pruefen, ob Node.js installiert ist
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Node.js wurde auf diesem PC nicht gefunden!
    echo.
    echo Bitte lade die kostenlose Node.js LTS-Version herunter und installiere sie:
    echo --^> https://nodejs.org/
    echo.
    echo Starte diese Datei nach der Node.js-Installation einfach erneut.
    pause
    exit /b 1
)

:: 3. Pruefen, ob node_modules existieren (automatischer Erstinstall)
if not exist "node_modules\" (
    echo [INFO] Erstmaliger Start: Installiere erforderliche Pakete (npm install)...
    echo        Bitte einen kurzen Moment Geduld...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [FEHLER] Paket-Installation fehlgeschlagen. Bitte Internetverbindung pruefen.
        pause
        exit /b 1
    )
    echo [OK] Pakete erfolgreich installiert.
    echo.
)

:: 4. Server im Hintergrund minimiert starten
echo [INFO] Starte lokalen Server auf http://localhost:3000...
start "Hismith Servok Local Server" /min cmd /c "npm run dev"

:: 3 Sekunden warten, damit der Server initialisieren kann
timeout /t 3 /nobreak >nul

:: 5. Oeffnet direkt und ausschliesslich den vom Benutzer als Standard ausgewaehlten Webbrowser
echo [OK] Oeffne deinen Standard-Webbrowser...
powershell -NoProfile -Command "Start-Process 'http://localhost:3000'" 2>nul || start "" "http://localhost:3000"

exit
