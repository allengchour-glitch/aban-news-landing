@echo off
REM BIGBUY-PREMIUM.bat - Ein-Tap: holt neue Markenprodukte aus mehreren BigBuy-Kategorien
REM (Schmuck/Uhren/Beauty/Koerperpflege/Sport/Kleidung), legt sie ACTIVE + in allen Kanaelen an,
REM committet den Ledger. Braucht BIGBUY_TOKEN + Shopify-Creds in %USERPROFILE%\luxe-secrets.ps1.
cd /d "%~dp0\..\.."
powershell -ExecutionPolicy Bypass -File "automation\local\bigbuy-premium.ps1"
echo.
echo Fertig. Fenster schliessbar.
pause
