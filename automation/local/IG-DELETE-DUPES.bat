@echo off
cd /d "%~dp0"
echo === Instagram-Dubletten loeschen ===
echo Token holen: developers.facebook.com/tools/explorer (App LuxeStyle Social, User Token)
set /p TOKEN="Fuege dein Meta-Token ein und druecke Enter: "
echo.
echo --- VORSCHAU (loescht noch nichts) ---
node ig-delete-dupes.mjs %TOKEN%
echo.
set /p GO="Wirklich loeschen? (j/n): "
if /i "%GO%"=="j" node ig-delete-dupes.mjs %TOKEN% --go
pause
