@echo off
REM ========================================================================
REM  aban — 1-Klick-Deploy auf Cloudflare Pages (Projekt: abannews)
REM  Doppelklick genuegt. Baut _site/ neu und laedt es live auf abannews.com.
REM  Voraussetzung: Git (fuer bash) + einmal "npx wrangler@3 login" gemacht.
REM ========================================================================
cd /d "%~dp0"

echo.
echo [1/2] Baue Website (_site) ...
set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=C:\Program Files (x86)\Git\bin\bash.exe"
"%BASH%" build-pages.sh
if errorlevel 1 ( echo FEHLER beim Build. & pause & exit /b 1 )

echo.
echo [2/2] Deploye nach Cloudflare Pages (abannews) ...
call npx wrangler@3 pages deploy _site --project-name=abannews --branch=main
if errorlevel 1 ( echo FEHLER beim Deploy. Tipp: "npx wrangler@3 login" ausfuehren, dann erneut. & pause & exit /b 1 )

echo.
echo ============================================================
echo  FERTIG. Pruefe: https://abannews.com/suche  (ggf. ?neu=1 anhaengen)
echo ============================================================
pause
