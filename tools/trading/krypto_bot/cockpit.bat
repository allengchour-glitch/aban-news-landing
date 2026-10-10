@echo off
chcp 65001 >nul
REM Krypto-Cockpit: Dashboard im Browser (http://127.0.0.1:8765) und Telegram-Steuerung (wenn TELEGRAM_BOT_TOKEN gesetzt).
REM Fenster schliessen = Cockpit aus. Die Bots laufen unabhaengig davon ueber krypto-auto.bat.
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
%PY% tools\trading\krypto_bot\cockpit.py
pause
