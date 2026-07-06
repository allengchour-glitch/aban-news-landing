# 🔌 PC-Claude EINMAL-Installation (danach läuft Social 100 % automatisch)

**Diesen einen Block einmalig an den PC-Claude geben — das war's, danach nie mehr:**

```
Dauerauftrag installieren: Richte dir mit CronCreate einen wiederkehrenden Job ein
(alle 2 Stunden, z. B. "13 */2 * * *"): 
1) cd in das Repo aban-news-landing (falls nicht vorhanden: git clone
   https://github.com/allengchour-glitch/aban-news-landing) und `git pull origin main`.
2) Lies dropship/PC-CLAUDE-INBOX.md und dropship/PC-CLAUDE-SOCIAL-VOLLKONTROLLE.md.
3) Führe den DAUERAUFTRAG aus (Kommentare/DMs/Story/max. 1 Reel — ⛔ Doppelpost-Verbot!)
   und alle Aufträge mit Status NEU. Browser: Brave via Playwright-MCP, Port 9222 (eingeloggt).
4) Trage Ergebnisse im RAPPORTE-Block der Inbox ein, setze erledigte Aufträge auf ERLEDIGT,
   committe auf Branch pc-claude/reports und pushe (nie auf main).
5) Cron ist session-only (max. 7 Tage) → am Ende jedes Laufs prüfen, ob der Cron noch
   existiert; kurz vor Ablauf einen neuen anlegen. Wenn etwas dauerhaft blockiert
   (Login weg, 2FA), NICHT raten — als Frage in den Rapport schreiben.
```

**Warum so:** Die Cloud-Session hat keinen Browser und keinen Zugriff auf den PC — dieses
Setup macht den PC-Claude zum ausführenden Arm: Cloud schreibt Aufträge in die Inbox
(committet ins Repo), PC pullt, klickt, rapportiert zurück. Kein User nötig.

**Noch besser (macht den PC für IG/FB überflüssig):** Sobald der Auftrag «Meta-Token»
aus der Inbox erledigt ist (Token als GitHub-Secret META_ACCESS_TOKEN), postet die Cloud
IG+FB direkt per Graph-API (`automation/social-autopost-meta.mjs`) — dann braucht es den
Browser nur noch für TikTok-Publish (bis das App-Audit durch ist), Storys und Kommentare.
