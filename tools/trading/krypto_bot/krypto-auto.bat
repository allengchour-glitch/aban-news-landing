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
REM (17. Pruefung W4) Modus "nachkontrolle": nur die Nachkontrolle von Pilot 2.0 - die zweite Aufgabe der Aufgabenplanung startet sie alle 10 Minuten und bei der Anmeldung.
REM Ohne Vermerk im Buch ist sie nach einer Sekunde fertig. (Kein Klammerblock: darin wuerde %PY% schon beim Einlesen ersetzt, also leer.)
if /i "%~1"=="nachkontrolle" goto :nachkontrolle_allein
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
REM Not-Aus: Datei STOP (stop.bat, Cockpit, /stop) oder Variable KI_BOT_STOP=1
set "NOTAUS="
if exist "tools\trading\ki_bot\STOP" set NOTAUS=1
if "%KI_BOT_STOP%"=="1" set NOTAUS=1
if defined NOTAUS (
  echo Not-Aus ist aktiv: der Pilot schliesst nur noch seine Positionen ^(nichts Neues^). Weiterhandeln: weiter.bat
  set "PILOTDA="
  if not "%BINANCE_FUTURES_API_KEY%"=="" set PILOTDA=1
  if not "%PILOT2_API_KEY%"=="" set PILOTDA=1
  if /i "%KRYPTO_PILOT2%"=="an" set PILOTDA=1
  if exist "data\krypto-pilot2-bestand.json" set PILOTDA=1
  if defined PILOTDA call :schritt Pilot-Not-Aus pilot.py --lauf
  REM Pilot 2.0: was der Not-Aus nicht sofort schliessen oder sichern konnte, holt die Nachkontrolle nach (wie stop.bat)
  if exist "data\krypto-pilot2-bestand.json" call :schritt Pilot-2.0-Nachkontrolle pilot.py --nachkontrolle
  goto bilanz
)
if exist "tools\trading\ki_bot\PAUSE" (
  echo Auto-Handel ist aus ^(Pause^): nichts gehandelt, Positionen bleiben. Einschalten im Cockpit oder mit weiter.bat.
  %PY% tools\trading\krypto_bot\meldung.py --ok "Pause: nichts gehandelt"
  goto ende
)
echo Selbsttest ...
for %%T in (test_pilot test_sammler test_infos test_cockpit test_profit test_calls test_pilot2_plan test_pilot2_live test_pilot2_streng test_testnetz_pruefung test_news_waechter) do (
  %PY% tools\trading\krypto_bot\%%T.py > "data\selbsttest-%%T.log" 2>&1 || (
    echo Selbsttest %%T fehlgeschlagen - nichts gehandelt. Details: data\selbsttest-%%T.log
    %PY% tools\trading\krypto_bot\meldung.py --fehler "Selbsttest %%T fehlgeschlagen - nichts gehandelt (Details: data\selbsttest-%%T.log)" --push
    goto ende
  )
)
set "PILOTLAUF="
if not "%BINANCE_FUTURES_API_KEY%"=="" set PILOTLAUF=1
if /i "%KRYPTO_PILOT2%"=="an" if not "%PILOT2_API_KEY%%BINANCE_API_KEY%"=="" set PILOTLAUF=1
if exist "data\krypto-pilot2-bestand.json" set PILOTLAUF=1
if defined PILOTLAUF (
  call :schritt Krypto-Pilot pilot.py --lauf
  REM Pilot 2.0: blieb ein Auftrag unklar, bis zu 11 Minuten nachfragen, dann Stops setzen (sonst sofort fertig)
  if exist "data\krypto-pilot2-bestand.json" call :schritt Pilot-2.0-Nachkontrolle pilot.py --nachkontrolle
) else (
  echo Krypto-Pilot uebersprungen: keine Schluessel ^(BINANCE_FUTURES_API_KEY oder Pilot 2.0^).
)
REM ETH-Sparplan nur mit ausdruecklicher Freigabe (Betrag gesetzt) - der Spot-Schluessel allein reicht nicht
if not "%ETH_SPARPLAN_BETRAG%"=="" (
  call :schritt ETH-Sammler eth_sammler.py --lauf
) else (
  echo ETH-Sammler uebersprungen: Sparplan nicht eingeschaltet ^(ETH_SPARPLAN_BETRAG fehlt^).
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

:nachkontrolle_allein
REM Lebenszeichen fuer die Ampel im Cockpit - die Aufgabe laeuft unsichtbar. Bei JEDEM Start, auch wenn gleich danach nichts zu tun ist.
>"data\krypto-nachkontrolle-lebt.txt" echo %date% %time%
if not exist "data\krypto-pilot2-bestand.json" goto :nk_ohne_buch
set PY=py
where py >nul 2>nul || set PY=python
REM 18. Pruefung W3: EIN Durchgang mit --einmal, der naechste Takt kommt in 10 Minuten - die lange Fassung hielt die Lauf-Sperre bis 11 Minuten und liess den Tageslauf ausfallen.
REM 18. Pruefung K5: Das Ergebnis steht in data\krypto-nachkontrolle-rc.txt, die Cockpit-Ampel wird bei einem Absturz rot. Die Umleitung steht VOR dem Befehl, damit eine Ziffer davor nie als Handle gilt.
%PY% tools\trading\krypto_bot\pilot.py --nachkontrolle --einmal >> "data\krypto-nachkontrolle.log" 2>&1
set "NKRC=%errorlevel%"
>"data\krypto-nachkontrolle-rc.txt" echo %date% %time% rc=%NKRC%
exit /b %NKRC%
:nk_ohne_buch
REM 19. Pruefung: ohne Buch gibt es nichts zu pruefen - der Rueckgabewert 0 ueberschreibt einen alten Absturz-Wert, sonst zeigte die Ampel bis zu 30 Minuten falsch Rot.
>"data\krypto-nachkontrolle-rc.txt" echo %date% %time% rc=0
exit /b 0

:schritt
REM %1 Name, %2 Skript, %3 Argument. Rueckgabe: 0 ok, 3 Warnung (hat sich schon selbst gemeldet), sonst Absturz.
echo %~1 ...
%PY% tools\trading\krypto_bot\%2 %3
set RC=%errorlevel%
if "%RC%"=="0" goto :eof
if "%RC%"=="3" (set "WARN=%WARN% %~1") else (set "FEHLER=%FEHLER% %~1")
goto :eof
