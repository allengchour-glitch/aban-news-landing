# 🌐 Browser-Agent verbinden (Brave) → IG/FB autonom über Meta Business Suite

> Ziel: Claude bekommt Browser-Steuerung über DEINE eingeloggte Brave-Sitzung, um in der
> **Meta Business Suite** (erste-Party-UI, geringes Sperr-Risiko) IG/FB-Posts zu löschen/aufzuräumen.
> Funktioniert NUR auf dem **Desktop** (Mac/Windows/Linux) — nicht in der Web/Cloud-Session,
> weil dort dein Meta-Login fehlt. Es wird KEIN Passwort gespeichert; der Agent dockt nur an Brave an.

## Voraussetzungen
- **Claude Code Desktop-App** installiert.
- **Node.js 18+** (für `npx`).
- **Brave** installiert, und du bist bei **business.facebook.com** eingeloggt.

## Schritte
### 1) Brave komplett beenden
Wichtig: Sonst ignoriert Brave den Debug-Port. (macOS: Cmd+Q · Windows: alle Brave-Fenster schließen.)

### 2) Brave mit Debug-Port + eigenem Agent-Profil starten
Neuere Chromium-Versionen erlauben Remote-Debugging nur mit eigenem `--user-data-dir`:

**macOS:**
```
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 --user-data-dir="$HOME/brave-agent"
```
**Windows (CMD):**
```
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" ^
  --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
```
**Linux:**
```
brave-browser --remote-debugging-port=9222 --user-data-dir="$HOME/brave-agent"
```

### 3) In diesem Brave-Fenster bei Meta einloggen (einmalig)
Gehe auf **https://business.facebook.com** und logge dich ein (inkl. 2FA). Das Profil `brave-agent`
merkt sich den Login für die nächsten Male.

### 4) Playwright-MCP in Claude Code hinzufügen
```
claude mcp add playwright -- npx @playwright/mcp@latest --cdp-endpoint http://localhost:9222
```
(Alternativ in der MCP-Config eintragen: command `npx`, args `["@playwright/mcp@latest","--cdp-endpoint","http://localhost:9222"]`.)

### 5) Claude Code neu starten
Danach gibt es Browser-Tools (navigieren/klicken/tippen). Prüfen mit `/mcp` (zeigt „playwright").

### 6) Auftrag geben
„Geh in Meta Business Suite → Inhalte → lösche den Reel X → poste danach die Text-only-Version."
Claude steuert dann Brave und erledigt es. **Nur Meta Business Suite ansteuern, nicht instagram.com direkt.**

## Sicherheit / Hinweise
- Kein Passwort im Repo/Chat — der Agent nutzt nur die laufende Brave-Sitzung über Port 9222.
- Erste-Party-UI (Business Suite) statt privater IG-API → deutlich geringeres Sperr-Risiko.
- Port 9222 ist lokal; lass das Agent-Brave nur laufen, wenn du den Agenten nutzt.
- Offizielle IG-Graph-API kann Posts NICHT löschen — deshalb dieser Browser-Weg für „aufräumen".
