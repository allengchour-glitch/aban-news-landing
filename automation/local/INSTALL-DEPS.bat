@echo off
REM ========================================================================
REM  LuxeStyle — EINMALIG nach frischem git clone (z.B. C:\luxe).
REM  Installiert playwright-core (das brauchen ALLE Browser-Tools:
REM  TikTok-Upload, Follower, Kampagne, tutti/anibis, DMs, IG-Delete).
REM  --no-save => package.json bleibt unveraendert (kein git-Konflikt).
REM ========================================================================
cd /d "%~dp0..\.."
echo Aktueller Ordner: %CD%
echo Installiere playwright-core (leicht, kein Browser-Download)...
call npm install playwright-core --no-save
echo.
if exist "node_modules\playwright-core" (
  echo  FERTIG! playwright-core ist installiert.
  echo  Jetzt: START.bat offen lassen und im Chat "dry" sagen.
) else (
  echo  FEHLER: playwright-core nicht gefunden. Ist Node/npm installiert? ^(node -v^)
)
echo.
pause
