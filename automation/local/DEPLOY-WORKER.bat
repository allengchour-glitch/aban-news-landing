@echo off
REM ========================================================================
REM  LuxeStyle — Cloudflare-Worker aktualisieren (Doppelklick, kein Tippen).
REM  Holt die neueste Version + deployt. Nutzen, wenn der Worker-Code geaendert wurde.
REM ========================================================================
cd /d "%~dp0..\cloudflare\luxe-poster"
echo Hole Updates...
git pull origin claude/luxestyle-product-CizQ6
echo Deploye Worker...
wrangler deploy
echo.
echo Fertig. Loeschen vom Handy:  https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%%2B^&cleanup=2026-06-10
pause
