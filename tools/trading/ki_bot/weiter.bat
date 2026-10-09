@echo off
REM Hebt Not-Aus und Pause auf.
if exist "%~dp0STOP" del "%~dp0STOP"
if exist "%~dp0PAUSE" del "%~dp0PAUSE"
echo Not-Aus und Pause aufgehoben. Der naechste Lauf handelt wieder.
pause
