@echo off
REM ========================================================================
REM  TIKTOK-TOKEN.bat - EIN Doppelklick: tauscht den auth_code in einen
REM  Marketing-API-Token, speichert ihn sicher in luxe-secrets.ps1 und
REM  testet ihn sofort. Kein Repo, kein Chat - Secrets bleiben lokal.
REM ========================================================================
title TikTok Token-Setup (1 Klick)
cd /d "%~dp0..\.."
git pull --rebase origin claude/luxestyle-product-CizQ6 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tiktok-token.ps1"
echo.
pause
