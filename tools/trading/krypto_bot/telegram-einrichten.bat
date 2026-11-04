@echo off
chcp 65001 >nul
REM Telegram einrichten (einmalig): verbindet das Krypto-Cockpit mit deinem privaten Telegram-Bot. Der Token wird unsichtbar eingegeben.
REM Danach das Cockpit-Fenster schliessen und cockpit.bat neu oeffnen.
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0\..\..\.."
set PY=py
where py >nul 2>nul || set PY=python
%PY% tools\trading\krypto_bot\telegram_einrichten.py
pause
