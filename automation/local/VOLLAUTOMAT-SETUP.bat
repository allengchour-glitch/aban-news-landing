@echo off
REM ========================================================================
REM  LuxeStyle — BOT PERFEKT EINRICHTEN (1x doppelklicken, kein Admin noetig).
REM  Registriert Windows-Tasks, die die Skripte DIREKT starten —
REM  KEIN Cloudflare-Worker / KEIN KV-Limit / KEIN Listener-Poll / KEIN git-pull
REM  -> kein Git-Lock, laeuft stabil. Voraussetzung: PC an + brave-agent eingeloggt.
REM
REM  Plan (User: mehrmals analysieren/chatten/folgen, weniger selber posten):
REM    11:00 + 18:00  -> POST   (1 Reel + tutti/anibis + lernen)
REM    13:00 16:00 20:00 -> ENGAGE (Follower + DMs/Kommentare + FB-Gruppen + lernen)
REM    Sonntag 12:00  -> WEEKLY (entfolgen + FB-Gruppen beitreten)
REM ========================================================================
set PS=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0VOLLAUTOMAT.ps1"

schtasks /create /tn "LuxeBot-Post-AM"   /sc daily /st 11:00 /f /rl LIMITED /tr "%PS% -Mode post"
schtasks /create /tn "LuxeBot-Post-PM"   /sc daily /st 18:00 /f /rl LIMITED /tr "%PS% -Mode post"
schtasks /create /tn "LuxeBot-Engage-1"  /sc daily /st 13:00 /f /rl LIMITED /tr "%PS% -Mode engage"
schtasks /create /tn "LuxeBot-Engage-2"  /sc daily /st 16:00 /f /rl LIMITED /tr "%PS% -Mode engage"
schtasks /create /tn "LuxeBot-Engage-3"  /sc daily /st 20:00 /f /rl LIMITED /tr "%PS% -Mode engage"
schtasks /create /tn "LuxeBot-Weekly"    /sc weekly /d SUN /st 12:00 /f /rl LIMITED /tr "%PS% -Mode weekly"

echo.
echo  FERTIG! 6 Tasks angelegt. Der Bot laeuft ab jetzt automatisch (PC muss an sein).
echo  Test sofort:  powershell -ExecutionPolicy Bypass -File "%~dp0VOLLAUTOMAT.ps1" -Mode engage
echo  Log:  automation\local\vollautomat.log
echo.
pause
