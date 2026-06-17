@echo off
REM ============================================================================
REM  aban — AUTO-DEPLOY (unbeaufsichtigt, fuer Windows-Aufgabenplanung)
REM  Holt main, baut _site, deployt Pages + beide Worker. Kein "pause", kein
REM  Nachfragen (npx --yes). Log: deploy-auto.log im Repo-Root.
REM  Einrichten (1x):
REM   schtasks /create /tn "aban-auto-deploy" /tr "%~f0" /sc minute /mo 15 /f
REM ============================================================================
cd /d "%~dp0"
set "ROOT=%~dp0"
echo ===== %date% %time% ===== >> "%ROOT%deploy-auto.log"

git pull origin main >> "%ROOT%deploy-auto.log" 2>&1

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=C:\Program Files (x86)\Git\bin\bash.exe"
"%BASH%" build-pages.sh >> "%ROOT%deploy-auto.log" 2>&1

call npx --yes wrangler@3 pages deploy _site --project-name=abannews --branch=main >> "%ROOT%deploy-auto.log" 2>&1

cd /d "%ROOT%workers\site-brain"
call npx --yes wrangler deploy >> "%ROOT%deploy-auto.log" 2>&1
cd /d "%ROOT%workers\inserate-brain"
call npx --yes wrangler deploy >> "%ROOT%deploy-auto.log" 2>&1
cd /d "%ROOT%"

echo ----- fertig %date% %time% ----- >> "%ROOT%deploy-auto.log"
