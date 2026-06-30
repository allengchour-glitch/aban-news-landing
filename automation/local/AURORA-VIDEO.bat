@echo off
REM ========================================================================
REM  AURORA-VIDEO.bat — EIN Doppelklick = drehendes Aurora-Ketten-Video.
REM  Reine API (Veo/Gemini, Fallback fal). Startet Brave NICHT -> stoert die
REM  Kampagne nicht. Rendert + pusht das Video zu Claude. Kein Tippen noetig.
REM ========================================================================
title Aurora-Video (1 Klick)
cd /d "%~dp0..\.."
echo Hole aktuellen Stand...
git pull --rebase origin claude/luxestyle-product-CizQ6 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0aurora-video.ps1"
echo.
echo Wenn oben "ERLEDIGT" steht: schreib Claude  ->  video da
echo.
pause
