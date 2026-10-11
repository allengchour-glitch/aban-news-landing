@echo off
chcp 65001 >nul
REM KI-Bot vollautomatisch ueber Alpaca. Standard: PAPIERKONTO (Spielgeld).
REM Echtes Geld nur mit ALPACA_PAPER=false UND KI_BOT_ECHTGELD="JA, MIT ECHTEM GELD".
REM Aufgabenplanung: "start-auto.bat auto" = ohne Pause und der Tageswaechter endet nach 8 Stunden (sonst blockiert der
REM Lauf von gestern den von heute: Windows startet eine Aufgabe nicht, solange die alte noch laeuft).
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
set "WARTE=pause"
set "DAUER="
if /i "%~1"=="auto" (
  set "WARTE=cd ."
  set "DAUER=--stunden 8"
)
if "%ALPACA_KEY_ID%"=="" (
  echo Es fehlt ALPACA_KEY_ID. Siehe tools\trading\ki_bot\README.md, Abschnitt "Vollautomatisch".
  %WARTE%
  exit /b 1
)
if exist "%~dp0STOP" (
  echo Not-Aus ist aktiv. Zum Weiterhandeln weiter.bat starten.
  %WARTE%
  exit /b 1
)
if exist "%~dp0PAUSE" (
  echo Auto-Handel ist aus ^(Pause^). Einschalten im Cockpit oder mit weiter.bat.
  %WARTE%
  exit /b 1
)
echo Selbsttest ...
%PY% tools\trading\ki_bot\test_ki_bot.py || (echo Selbsttest fehlgeschlagen - nichts gehandelt. & %WARTE% & exit /b 1)
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
%PY% tools\trading\ki_bot\signale.py --dauer --minuten 15 --broker alpaca %DAUER%
%WARTE%
