@echo off
chcp 65001 >nul
REM Not-Aus: legt die Datei STOP an. Danach eroeffnet kein Bot mehr etwas; der Krypto-Pilot schliesst seine Futures-Positionen.
type nul > "%~dp0STOP"
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
set "PILOTDA="
if not "%BINANCE_FUTURES_API_KEY%"=="" set PILOTDA=1
if not "%PILOT2_API_KEY%"=="" set PILOTDA=1
if /i "%KRYPTO_PILOT2%"=="an" set PILOTDA=1
if exist "data\krypto-pilot2-bestand.json" set PILOTDA=1
if defined PILOTDA (
  echo Krypto-Pilot schliesst jetzt seine Positionen ^(Futures und bei Pilot 2.0 auch Spot^) ...
  %PY% tools\trading\krypto_bot\pilot.py --lauf
  if exist "data\krypto-pilot2-bestand.json" (
    echo Pilot 2.0: blieb ein Auftrag unklar, wartet er bis zu 11 Minuten auf Binance und schliesst danach nochmals ...
    %PY% tools\trading\krypto_bot\pilot.py --nachkontrolle
  )
)
echo.
echo Not-Aus aktiv. Pruefe das Ergebnis oben ^(bei einem Fehler: im Binance-Konto nachsehen^).
echo Alpaca-Positionen siehst du in der Alpaca-App. Wieder einschalten: weiter.bat
pause
