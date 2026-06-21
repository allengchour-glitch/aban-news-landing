@echo off
REM Optional: installiert Stagehand (AI-Selektoren) + aktiviert AI-Browser-Wrapper. Einmal doppelklicken.
cd /d "%~dp0..\.."
echo Installiere @browserbasehq/stagehand (AI-Selektoren fuer robuste Browser-Bots)...
call npm i @browserbasehq/stagehand --no-audit --no-fund
echo.
echo Fertig. Wrapper automation/lib/ai-browser.mjs nutzt es ab jetzt (sonst Playwright-Fallback).
echo Voraussetzung: GROQ_API_KEY ODER GEMINI_API_KEY in luxe-secrets.ps1.
pause
