# 🤖 Eingeloggter Browser-Agent — Setup (für Posts löschen u. Ä.)

`agent.py` erweitert das öffentliche `browser.py` um **eingeloggte Aktionen**
(z. B. Instagram-/TikTok-Posts löschen), die die offiziellen APIs **nicht** können.

## Sicherheits-Prinzip (wichtig)
- **Keine Passwörter** im Code/Repo. Du loggst dich **einmal von Hand** ein
  (inkl. 2FA) → der Agent speichert nur die **Session-Cookies** unter
  `~/.luxe-browser/<profil>.json`.
- Diese Datei ist **wie dein Login** → **nie committen** (per `.gitignore` gesperrt).
- Läuft die Session ab → einfach `login` neu ausführen.

## Wo es läuft
Auf **deinem Rechner** (Mac/PC mit Bildschirm). Das Login braucht deine Hand —
die Cloud-Session (Claude) hat keinen Bildschirm und kann sich nicht selbst einloggen.

## Installation (einmalig)
```bash
cd tools/browser
pip install playwright
python3 -m playwright install chromium
```

## Ablauf
**1. Einmal einloggen** (öffnet sichtbaren Browser; du meldest dich an, dann ENTER):
```bash
python3 agent.py login instagram https://www.instagram.com/accounts/login/
python3 agent.py login tiktok    https://www.tiktok.com/login
```

**2. Session prüfen** (Screenshot der eingeloggten Profilseite):
```bash
python3 agent.py check instagram https://www.instagram.com/luxestyle.ch/ --out ig.png
```

**3. Aktion ausführen** — erst Probelauf (Screenshot, löscht NICHT), dann mit `--confirm`:
```bash
python3 agent.py ig-delete https://www.instagram.com/p/XXXX/            # DRY-RUN
python3 agent.py ig-delete https://www.instagram.com/p/XXXX/ --confirm  # löscht
python3 agent.py tiktok-delete https://www.tiktok.com/@luxestyle.ch/video/123 --confirm
```
Jede Löschaktion legt `*-before.png` / `*-after.png` ab → zur Kontrolle.

## Ehrliche Grenzen
- IG/TikTok mögen Automatisierung nicht (Bot-Schutz, AGB). **Konservativ** nutzen
  (Einzel-Aktionen, kein Sekundentakt) → sonst riskierst du eine Konto-Sperre.
- Selektoren (Buttons) ändern sich gelegentlich → wenn eine Aktion `*-fail.png`
  schreibt, kurz melden, dann passe ich die Selektoren an.

## Wenn die CLOUD-Session (Claude) selbst klicken soll
Dann braucht es einen **Cloud-Browser** (z. B. Browserbase) mit einem persistenten,
eingeloggten Context + API-Key als Secret. Aufwändiger + Bot-Schutz auf Cloud-IPs
ist strenger. Sag Bescheid, dann schreibe ich die Browserbase-Variante (`agent.py`
nutzt dann `connect_over_cdp(BROWSERBASE_URL)` statt lokalem Chromium).
