@echo off
chcp 65001 >nul
REM Krypto-Pilot (BTC + ETH Futures), ETH-Sammler (Sparplan) und KI-Trader (nur Schattenkonto), einmal pro Tag.
REM Standard: TESTNETZ (Spielgeld). Braucht kein Alpaca.
REM Mit Argument "auto" (Windows-Aufgabenplanung): ohne Pause am Ende, Ausgabe ins Logbuch data\krypto-auto.log.
REM Ein Absturz oder ein gescheiterter Selbsttest kommt aufs Handy (Telegram/ntfy) und ins Cockpit (Gesundheit).
setlocal
REM Emojis in der Ausgabe: ohne UTF-8 stuerzt Python beim Umleiten in eine Datei ab (Windows-Codepage cp1252).
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
if not exist data mkdir data
if /i "%~1"=="auto" if not "%~2"=="geloggt" (
  echo ===== %date% %time% =====>> "data\krypto-auto.log"
  call "%~f0" auto geloggt >> "data\krypto-auto.log" 2>&1
  exit /b
)
set PY=py
where py >nul 2>nul || set PY=python
set "FEHLER="
set "WARN="
REM Not-Aus hat Vorrang vor der Pause: schliessen muss auch bei ausgeschaltetem Auto-Handel gehen.
if exist "tools\trading\ki_bot\STOP" (
  echo Not-Aus ist aktiv: der Pilot schliesst nur noch seine Positionen ^(nichts Neues^). Weiterhandeln: weiter.bat
  if not "%BINANCE_FUTURES_API_KEY%"=="" call :schritt Pilot-Not-Aus pilot.py --lauf
  goto bilanz
)
if exist "tools\trading\ki_bot\PAUSE" (
  echo Auto-Handel ist aus ^(Pause^): nichts gehandelt, Positionen bleiben. Einschalten im Cockpit oder mit weiter.bat.
  %PY% tools\trading\krypto_bot\meldung.py --ok "Pause: nichts gehandelt"
  goto ende
)
echo Selbsttest ...
for %%T in (test_pilot test_sammler test_infos test_cockpit test_profit) do (
  %PY% tools\trading\krypto_bot\%%T.py > "data\selbsttest-%%T.log" 2>&1 || (
    echo Selbsttest %%T fehlgeschlagen - nichts gehandelt. Details: data\selbsttest-%%T.log
    %PY% tools\trading\krypto_bot\meldung.py --fehler "Selbsttest %%T fehlgeschlagen - nichts gehandelt (Details: data\selbsttest-%%T.log)" --push
    goto ende
  )
)
if not "%BINANCE_FUTURES_API_KEY%"=="" (
  call :schritt Krypto-Pilot pilot.py --lauf
) else (
  echo Krypto-Pilot uebersprungen: BINANCE_FUTURES_API_KEY fehlt.
)
if not "%BINANCE_API_KEY%"=="" (
  call :schritt ETH-Sammler eth_sammler.py --lauf
) else (
  echo ETH-Sammler uebersprungen: BINANCE_API_KEY fehlt.
)
if not "%ANTHROPIC_API_KEY%"=="" (
  call :schritt KI-Trader ki_trader.py --lauf
) else (
  echo KI-Trader uebersprungen: ANTHROPIC_API_KEY fehlt.
)
:bilanz
if defined FEHLER (
  %PY% tools\trading\krypto_bot\meldung.py --fehler "abgestuerzt:%FEHLER% - bitte Logbuch ansehen" --push
) else if defined WARN (
  %PY% tools\trading\krypto_bot\meldung.py --fehler "Warnung:%WARN% - Details kamen schon aufs Handy"
) else (
  %PY% tools\trading\krypto_bot\meldung.py --ok "alles gelaufen"
)
:ende
if /i not "%~1"=="auto" pause
goto :eof

:schritt
REM %1 Name, %2 Skript, %3 Argument. Rueckgabe: 0 ok, 3 Warnung (hat sich schon selbst gemeldet), sonst Absturz.
echo %~1 ...
%PY% tools\trading\krypto_bot\%2 %3
set RC=%errorlevel%
if "%RC%"=="0" goto :eof
if "%RC%"=="3" (set "WARN=%WARN% %~1") else (set "FEHLER=%FEHLER% %~1")
goto :eof
