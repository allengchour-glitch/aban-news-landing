@echo off
chcp 65001 >nul
REM Krypto-Pilot (BTC + ETH Futures) und ETH-Sammler (Sparplan), einmal pro Tag. Standard: TESTNETZ (Spielgeld).
REM Braucht kein Alpaca. Mit Argument "auto" ohne Pause am Ende (fuer die Windows-Aufgabenplanung).
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
if exist "tools\trading\ki_bot\STOP" (
  echo Not-Aus ist aktiv. Zum Weiterhandeln tools\trading\ki_bot\weiter.bat starten.
  goto ende
)
echo Selbsttest ...
%PY% tools\trading\krypto_bot\test_pilot.py >nul || (echo Selbsttest Pilot fehlgeschlagen - nichts gehandelt. & goto ende)
%PY% tools\trading\krypto_bot\test_sammler.py >nul || (echo Selbsttest Sammler fehlgeschlagen - nichts gehandelt. & goto ende)
%PY% tools\trading\krypto_bot\test_infos.py >nul || (echo Selbsttest Infos fehlgeschlagen - nichts gehandelt. & goto ende)
%PY% tools\trading\krypto_bot\test_cockpit.py >nul || (echo Selbsttest Cockpit/KI fehlgeschlagen - nichts gehandelt. & goto ende)
if not "%BINANCE_FUTURES_API_KEY%"=="" (
  echo Krypto-Pilot ^(BTC + ETH, Futures^) ...
  %PY% tools\trading\krypto_bot\pilot.py --lauf
) else (
  echo Krypto-Pilot uebersprungen: BINANCE_FUTURES_API_KEY fehlt.
)
if not "%BINANCE_API_KEY%"=="" (
  echo ETH-Sammler ^(Sparplan^) ...
  %PY% tools\trading\krypto_bot\eth_sammler.py --lauf
) else (
  echo ETH-Sammler uebersprungen: BINANCE_API_KEY fehlt.
)
if not "%ANTHROPIC_API_KEY%"=="" (
  echo KI-Trader ^(Claude, nur Schattenkonto^) ...
  %PY% tools\trading\krypto_bot\ki_trader.py --lauf
) else (
  echo KI-Trader uebersprungen: ANTHROPIC_API_KEY fehlt.
)
:ende
if /i not "%~1"=="auto" pause
