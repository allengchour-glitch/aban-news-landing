@echo off
chcp 65001 >nul
REM KI-Bot vollautomatisch ueber Alpaca. Standard: PAPIERKONTO (Spielgeld).
REM Echtes Geld nur mit ALPACA_PAPER=false UND KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD".
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
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
%PY% tools\trading\ki_bot\test_ki_bot.py || (echo Selbsttest fehlgeschlagen - nichts gehandelt. & pause & exit /b 1)
echo Tages-Depot (einmal pro Tag, ein zweiter Lauf am selben Tag aendert nichts) ...
%PY% tools\trading\ki_bot\bot.py --lauf --broker alpaca
echo Krypto-Bot (einmal pro Tag) ...
%PY% tools\trading\krypto_bot\krypto.py --lauf
if not "%BINANCE_FUTURES_API_KEY%"=="" (
  echo Krypto-Pilot ^(Futures, einmal pro Tag^) ...
  %PY% tools\trading\krypto_bot\pilot.py --lauf
)
if not "%ETH_SPARPLAN_BETRAG%"=="" (
  echo ETH-Sammler ^(Sparplan, kauft nur wenn faellig^) ...
  %PY% tools\trading\krypto_bot\eth_sammler.py --lauf
)
echo Daytrading-Waechter laeuft. Fenster schliessen = Bot aus. Not-Aus: stop.bat
%PY% tools\trading\ki_bot\signale.py --dauer --minuten 15 --broker alpaca
pause
