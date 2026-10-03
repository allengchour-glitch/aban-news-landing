@echo off
chcp 65001 >nul
REM KI-Bot vollautomatisch ueber Alpaca. Standard: PAPIERKONTO (Spielgeld).
REM Echtes Geld nur mit ALPACA_PAPER=false UND KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD".
cd /d "%~dp0\..\..\.."
if "%ALPACA_KEY_ID%"=="" (
  echo Es fehlt ALPACA_KEY_ID. Siehe tools\trading\ki_bot\README.md, Abschnitt "Vollautomatisch".
  pause
  exit /b 1
)
if exist "%~dp0STOP" (
  echo Not-Aus ist aktiv. Zum Weiterhandeln weiter.bat starten.
  pause
  exit /b 1
)
echo Selbsttest ...
python tools\trading\ki_bot\test_ki_bot.py || (echo Selbsttest fehlgeschlagen - nichts gehandelt. & pause & exit /b 1)
echo Tages-Depot (einmal pro Tag, ein zweiter Lauf am selben Tag aendert nichts) ...
python tools\trading\ki_bot\bot.py --lauf --broker alpaca
echo Daytrading-Waechter laeuft. Fenster schliessen = Bot aus. Not-Aus: stop.bat
python tools\trading\ki_bot\signale.py --dauer --minuten 15 --broker alpaca
pause
