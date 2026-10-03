@echo off
REM Hebt den Not-Aus auf.
if exist "%~dp0STOP" del "%~dp0STOP"
echo Not-Aus aufgehoben. Starten mit start-auto.bat
pause
