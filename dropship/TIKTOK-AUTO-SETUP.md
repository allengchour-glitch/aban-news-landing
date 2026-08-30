# TikTok-Autoposter auf dem PC — Einrichtung (einmalig, ~5 Minuten)

Das Skript `automation/local/tiktok-upload-auto.mjs` postet **einen** Beitrag pro Tag
automatisch: Video vom CDN + Marken-Musik (`luxe-premium.wav`) + geprüfte Caption →
Upload über deinen angemeldeten Browser. Es baut auf dem bewährten
`youtube-shorts-upload.mjs`-Muster auf (CDP Port 9222).

## Einmalige Einrichtung (PowerShell, im Repo-Ordner)

```powershell
cd $env:USERPROFILE\aban-news-landing
winget install Gyan.FFmpeg          # Musik-Schritt
npm init -y; npm i playwright-core  # Browser-Steuerung
```

**Browser mit Fernsteuerungs-Port starten** (Verknüpfung anlegen und DIESE benutzen):

```
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222
```

(Chrome geht genauso: chrome.exe mit demselben Schalter.) In diesem Browser einmal bei
tiktok.com als **@luxestyle.ch** anmelden — die Anmeldung bleibt erhalten.

## Probelauf (postet NICHTS)

```powershell
$env:DRY="1"; node automation\local\tiktok-upload-auto.mjs
```

→ lädt hoch, füllt die Caption, stoppt VOR dem Posten-Klick und legt Screenshots in
`tiktok-auto\` ab. Ansehen; wenn gut → ohne DRY laufen lassen.

## Täglich automatisch (Windows-Aufgabenplanung)

```powershell
schtasks /create /tn "LuxeStyle TikTok" /sc daily /st 17:30 /tr "cmd /c cd /d %USERPROFILE%\aban-news-landing && git pull --ff-only && node automation\local\tiktok-upload-auto.mjs >> tiktok-auto\log.txt 2>&1"
```

Das `git pull` holt vorher die frische Queue (die Cloud prüft täglich Preise und
ACTIVE-Status der beworbenen Produkte).

## Eingebaute Bremsen (nicht abschaltbar)

- **1 Beitrag pro Kalendertag** (Ledger `dropship/_tiktok_upload_done.txt` — nach dem
  Posten committen/pushen, damit die Cloud den Stand kennt)
- **`dropship/_TIKTOK_STOPP`** anlegen = alles steht sofort (wie `_SOCIAL_STOPP` für IG/FB)
- Beiträge mit `"frei": false` (Produkt nicht mehr ACTIVE) werden nie gepostet
- **Ohne ffmpeg wird nicht gepostet** — ein stummes Video schadet mehr als keins
- Nicht angemeldet / falscher Port → sauberer Abbruch mit Meldung

## Grenzen, ehrlich

- Der Trend-Sound aus der Commercial Music Library lässt sich nicht robust automatisieren —
  stattdessen kommt die **Marken-Musik** unters Video (Hausregel `VIDEO-PRAEFERENZEN.md`).
  Wer einen Trend-Sound will, postet den Beitrag von Hand (Punkt 12 im Cowork-Auftrag).
- TikTok kann die Studio-Oberfläche ändern; die Selektoren sind mehrfach abgesichert
  (`data-e2e` + Text in 3 Sprachen), aber ein UI-Umbau kann das Skript stoppen — es bricht
  dann sichtbar ab statt Unsinn zu klicken.
- Foto-Karussells postet das Skript bewusst NICHT (Slide-Reihenfolge + Sound-Pflicht im
  Karussell-Editor sind zu fragil) — Videos zuerst; 5 der 6 Queue-Beiträge haben eines.
