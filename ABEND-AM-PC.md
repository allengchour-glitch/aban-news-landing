# 🌙 Abend am PC — Klick-Liste (18.06.2026)

> Alles Doppelklick, kein Tippen. Reihenfolge einhalten. Ordner: `automation\local\`

## 1) Worker neu deployen  →  `DEPLOY-WORKER.bat`
Bringt **2 frische Sachen live**:
- 🐛 **Posting-Fix**: Worker postete via Cron nie (POST_HOURS passten nicht zum Cron) → jetzt **2×/Tag 11:00 + 19:00 CH**.
- 🆕 **Neue Queue** (34 Posts, 0 verbotene Produkte, Gewinner-Hooks zuerst).

→ Doppelklick `DEPLOY-WORKER.bat`, warten bis „Fertig".

## 2) Autopilot/Listener starten  →  `START.bat`
Startet den PC-Listener (Brave-Port 9222) + registriert die Cycles (Posten/Analyse/Follower).
→ Doppelklick `START.bat`. Brave öffnet sich mit Debug-Port.

## 3) TikTok-Kampagne vorbereiten (350 CHF)
- Im geöffneten **Brave** auf **ads.tiktok.com einloggen** (war zuletzt nicht eingeloggt = Grund, warum der Kampagnen-Bot keine Screenshots machte).
- Dann sag mir hier kurz **„dry"** → ich fahre `campaign-dry` (klickt sich durch, OHNE zu starten, macht Screenshots).
- Ich prüfe die Selektoren/Screenshots → wenn sauber, sagst du **„go"** → `campaign-go` startet die Kampagne mit hartem **350-CHF-Cap**, Ziel = Traffic, Schweiz/Frauen 18–34.

## 4) (Optional) Verbotene Alt-Posts auf IG löschen  →  über Listener
5 alte Botox/Serum/Öl-Posts liegen in `ig-delete-queue.txt` → der Listener räumt sie über den Browser weg.

---
### ✅ Danach läuft autonom (ohne dich):
- IG/FB posten 11:00 + 19:00 CH (Worker-Cron)
- TikTok posten + analysieren + Follower (PC-Cycles, weil PC läuft)
- Kommentare/DMs beantworten
- Gehirn lernt weiter, Queue füllt sich selbst nach

### 🔒 Bringt erst Käufe (nur du):
- TikTok-Kampagne scharf (Schritt 3) · Wallrath-Credit-Antwort abwarten · `wrangler deploy` (Schritt 1)
