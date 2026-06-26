@echo off
REM ============================================================================
REM  TAILSCALE-PC.bat  ·  oeffnet den Brave-CDP-Port 9222 fuers Tailscale-Netz,
REM  damit der VPS (100.66.29.36) deinen Browser fernsteuern kann.
REM  Doppelklick -> erlaubt Admin (noetig fuer netsh/Firewall). Sicher: nur Tailnet darf rein.
REM ============================================================================
REM --- Self-Elevate zu Admin ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Brauche Admin-Rechte - bitte im Popup auf "Ja" klicken...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

set PC_TS_IP=100.71.8.47

echo.
echo [1/3] Port-Weiterleitung 9222 (Tailnet -> Brave loopback)...
netsh interface portproxy delete v4tov4 listenaddress=%PC_TS_IP% listenport=9222 >nul 2>&1
netsh interface portproxy add    v4tov4 listenaddress=%PC_TS_IP% listenport=9222 connectaddress=127.0.0.1 connectport=9222
if %errorlevel% neq 0 ( echo FEHLER bei portproxy. & pause & exit /b )

echo [2/3] Firewall: 9222 nur fuer Tailnet (100.64.0.0/10) erlauben...
netsh advfirewall firewall delete rule name="TS-CDP-9222" >nul 2>&1
netsh advfirewall firewall add rule name="TS-CDP-9222" dir=in action=allow protocol=TCP localport=9222 remoteip=100.64.0.0/10

echo [3/3] Pruefe, ob Brave auf 9222 laeuft...
powershell -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9222/json/version' -Headers @{Host='127.0.0.1:9222'} -TimeoutSec 4; Write-Host 'Brave 9222 LAEUFT:' ($r.Content.Substring(0,60)) } catch { Write-Host 'WARNUNG: Brave antwortet NICHT auf 9222. Starte Brave mit --remote-debugging-port=9222 (z.B. CLOUD-AN.bat) und logg dich bei ads.tiktok.com ein.' }"

echo.
echo ============================================================================
echo  FERTIG. Der VPS kann jetzt http://%PC_TS_IP%:9222 erreichen.
echo  WICHTIG: Brave muss laufen (--remote-debugging-port=9222) + bei ads.tiktok.com eingeloggt.
echo ============================================================================
pause
