@echo off
title LuxeStyle - Eleven Music Klick-Starter
REM ========================================================================
REM  LuxeStyle — Musik generieren mit ElevenLabs "Eleven Music" (kommerziell-cleared).
REM  1 Doppelklick: nimmt ELEVENLABS_API_KEY aus luxe-secrets.ps1, erzeugt einen
REM  modernen Track nach reels\eleven-sample.mp3 zum Anhoeren. Kein Tippen, kein git.
REM ========================================================================
cd /d "%~dp0..\.."
echo Erzeuge modernen Track (ElevenLabs)...
powershell -ExecutionPolicy Bypass -Command ". \"$env:USERPROFILE\luxe-secrets.ps1\"; if(-not $env:ELEVENLABS_API_KEY){Write-Host 'Kein ELEVENLABS_API_KEY in luxe-secrets.ps1 — bitte dort setzen.'; exit 1}; node automation/eleven-music.mjs 'modern upbeat swiss pop, energetic and trendy, punchy clean mix for a fashion reel' 30 reels/eleven-sample.mp3 --instrumental"
echo.
echo  Fertig: reels\eleven-sample.mp3  -> anhoeren. Gefaellt's? Dann mach ich's zum Standard fuer alle Reels.
pause
