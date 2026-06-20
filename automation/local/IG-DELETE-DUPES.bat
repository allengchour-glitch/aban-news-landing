@echo off
REM IG-DELETE-DUPES.bat - loescht die 2 obersten IG-Dubletten (Berg-Tee) ueber dein eingeloggtes Brave,
REM mit Vorher/Nachher-Screenshots, und pusht die Screenshots, damit Cloud-Claude kontrollieren kann.
cd /d "%~dp0..\.."
echo Stelle Brave-Debug-Port 9222 sicher...
powershell -ExecutionPolicy Bypass -Command "$o=Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue; if(-not $o){$b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not(Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; Get-Process brave -EA SilentlyContinue|Stop-Process -Force -EA SilentlyContinue; Start-Sleep 3; Start-Process $b -ArgumentList '--remote-debugging-port=9222','--user-data-dir=%USERPROFILE%\brave-agent'; Start-Sleep 18}"
echo.
echo WICHTIG: Im Brave-Fenster (Profil brave-agent) bei instagram.com mit @luxestyle.ch eingeloggt sein!
echo Loesche die 2 obersten Posts (Berg-Tee-Dubletten), 3. bleibt...
node automation/local/ig-delete-dupes.mjs
git add automation/local/ig-delete-shots/* 2>nul
git commit -m "ig-delete: Vorher/Nachher-Screenshots zur Kontrolle" 2>nul
git push origin claude/luxestyle-product-CizQ6 2>nul
echo.
echo Fertig. Screenshots gepusht - Cloud-Claude kann pruefen.
pause
