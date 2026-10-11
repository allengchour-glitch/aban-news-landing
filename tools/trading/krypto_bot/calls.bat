@echo off
chcp 65001 >nul
REM Telegram-Calls mitlesen (deine Gruppen, nur lesen): neue Calls ins Schattenkonto bzw. kopieren (CALLS_MODUS).
REM Einrichten: siehe Kopf von calls_leser.py (my.telegram.org, setx TELEGRAM_API_ID/HASH, --login, TELEGRAM_CALL_GRUPPEN).
REM Fenster offen lassen. Stuerzt der Leser ab (Netz weg), startet er nach 60 Sekunden neu. Beenden: Fenster schliessen.
setlocal
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
:neu
%PY% tools\trading\krypto_bot\calls_leser.py --live
echo Leser beendet ^(Fehlercode %errorlevel%^). Neustart in 60 Sekunden - Fenster schliessen zum Beenden.
timeout /t 60 /nobreak >nul
goto neu
