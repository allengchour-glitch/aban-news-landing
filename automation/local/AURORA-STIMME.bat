@echo off
REM ========================================================================
REM  AURORA-STIMME.bat — EIN Doppelklick = sexy/warme Damen-Stimme aufs
REM  Aurora-Video legen (ElevenLabs Charlotte) + zu Claude pushen.
REM  Startet Brave NICHT. Braucht ELEVENLABS_API_KEY in luxe-secrets.ps1.
REM ========================================================================
title Aurora-Stimme (1 Klick)
cd /d "%~dp0..\.."
echo Hole aktuellen Stand...
git pull --rebase origin claude/luxestyle-product-CizQ6 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0aurora-voice.ps1"
echo.
echo Wenn oben "ERLEDIGT" steht: schreib Claude  ->  stimme da
echo.
pause
