@echo off
chcp 65001 >nul
title Desktop-Verknüpfung erstellen
cd /d "%~dp0"

echo ===============================================================================
echo   HISMITH SERVOK PREMIUM H2 — DESKTOP-VERKNUEPFUNG ERSTELLEN
echo ===============================================================================
echo.

set "TARGET_BAT=%~dp0start_windows.bat"
if not exist "%TARGET_BAT%" (
    if exist "%~dp0Hismith_Servok_Studio.bat" set "TARGET_BAT=%~dp0Hismith_Servok_Studio.bat"
)
set "WORKING_DIR=%~dp0"
set "SHORTCUT_NAME=Hismith Servok Premium Studio.lnk"

echo [1/2] Erstelle Windows Desktop-Verknuepfung...
echo       Ziel: "%TARGET_BAT%"
echo       Arbeitsverzeichnis: "%WORKING_DIR%"
echo.

:: PowerShell Shortcut-Erstellung: Ziel ist direkt start_windows.bat im Arbeitsverzeichnis.
:: Beim Doppelklick auf die Verknuepfung startet Windows start_windows.bat,
:: faehrt den Server hoch und oeffnet sofort deinen Standard-Webbrowser!
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = [System.IO.Path]::Combine($desktop, '%SHORTCUT_NAME%'); $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; $s.WindowStyle = 1; $s.IconLocation = '%SystemRoot%\System32\shell32.dll,14'; $s.Description = 'Startet Hismith Servok Premium Studio und oeffnet deinen Standard-Webbrowser'; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo ===============================================================================
    echo [ERFOLG] Die Desktop-Verknuepfung wurde erfolgreich erstellt!
    echo ===============================================================================
    echo.
    echo  Icon auf deinem Desktop: "%SHORTCUT_NAME%"
    echo.
    echo  Was passiert beim Doppelklick auf die Desktop-Verknuepfung?
    echo   1. Der lokale Server wird automatisch gestartet (falls nicht bereits aktiv).
    echo   2. Dein persoenlicher Standard-Webbrowser oeffnet sich automatisch auf http://localhost:3000.
    echo   3. Du musst start_windows.bat NICHT mehr manuell im Ordner suchen!
    echo.
) else (
    echo ===============================================================================
    echo [HINWEIS] Automatische PowerShell-Erstellung fehlgeschlagen.
    echo ===============================================================================
    echo Tipp: Klicke im Explorer mit der rechten Maustaste auf "start_windows.bat",
    echo       waehle "Senden an" -^> "Desktop (Verknuepfung erstellen)".
    echo.
)

echo.
pause
