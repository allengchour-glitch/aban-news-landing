# Bildformate je Plattform (23.09.2026)

Betreiber-Wunsch 23.09.: «Bilder auf höchstem Niveau». Paket «bildformate»: Produktbilder plattformgerecht
statt quadratisch. Alles unten ist gemessen, nicht geschätzt.

## Vorher gemessen

| Was | Menge | Befund |
|---|---|---|
| Wartende Bild-Posts `social/posts_image.csv` (status=ready) | 65 | 55 quadratisch (1:1), **0 im IG-Format 4:5**, 6 quer, 4 hoch; 41 mit kurzer Seite < 1080 px; **5 unter 600 px** (u. a. 209×666, 393×394, 428×434) |
| Alle Pinterest-Pins seit Juni (Metricool `getPins`, Originalbilder vermessen) | 138 | **0 im Pinterest-Format 2:3** |
| davon Bild-Pins 1:1 | 76 | 388 Impressionen = **5.1 je Pin** |
| davon Bild-Pins 4:5 | 27 | 378 Impressionen = **14.0 je Pin** |
| davon Video-Pins 9:16 | 26 | 12'036 Impressionen = **463 je Pin** |
| Die sechs zuletzt gepinnten Produkte (Hetzner-Quittungen + Ledger) | 6 | Hauptbild 5× 1:1 (786–1448 px), 1× 0.57 (790×1380) |

Die Zahlen je Format sind eine Beobachtung, kein Versuch: Datum, Produkt und Board sind nicht gleich verteilt.
Die Richtung stimmt mit Pinterests eigener Empfehlung überein (2:3, 1000×1500). **Der grösste Hebel sind
Video-Pins** (Faktor ~30 gegenüber Bild-Pins) — die 9:16-Reels liegen schon in `social/reels/`.

### Nebenbefund: Doppel-Pin
«Interaktives Katzenspielzeug mit rotierender Scheibe» steht **zweimal** auf Pinterest:
22.09. 14:57 vom Hetzner-Agenten (Quittung `auftraege/erledigt/pinterest-pin-2026-09-22-5.json`, Board
«Home & Geschenkideen»), 23.09. 18:55 von `metricool_pinterest_pin.mjs` (Metricool-Post 380861865, PUBLISHED,
Board «Geschenkideen Schweiz»). Ursache: das Metricool-Skript kannte nur sein eigenes Ledger (1 Zeile).

## Gebaut

### `automation/bild_formate.py`
Produktbild → Fassung je Plattform, **nichts wird beschnitten**:
- Quelle mit kurzer Seite **< 600 px → abgelehnt**, sonst Lanczos (nach Vergrösserung leicht nachgeschärft).
- 1–3 px Rahmenlinie der Lieferantenbilder wird vorher entfernt (sonst zieht die Erweiterung eine Linie).
- Motiv vollständig ins Zielfeld; freie Streifen je Kante weich erweitert: einfarbige Kante (≥96 % der
  Randpixel nah am Median) → genau diese Farbe; sonst gespiegelte Randzone, Unschärfe wächst mit dem Abstand
  zur Naht (r=3 an der Naht, voll ab 45 %), ganz aussen zur Mittelfarbe beruhigt.
- **Pinterest 1000×1500**: Bildfeld 1000×1230, darunter ruhiges Band in den Markenfarben (Anthrazit, Goldlinie,
  Creme): Produktname (max. 2 Zeilen, Schrift passt sich an) und «CHF xx.xx» bzw. «ab CHF xx.xx», wenn Varianten
  verschieden kosten. Klein «LUXESTYLE». Kein Rabatt, kein Code, keine Knappheit, keine Eigenschaft.
- **Instagram-Feed 1080×1350 (4:5)**: gleiches Verfahren, ohne Text (Preis steht in der Caption).
- JPEG progressiv ≤ 300 KB, atomar geschrieben. Manifest `social/pins/_index.tsv`: Preis min/max, Preistext,
  Quellbild (ohne `?v=`), Quellmass, Erweiterungsart, KB, SHA-1, Zeitpunkt.

Aufruf:
```
python3 automation/bild_formate.py <handle> …                 # Pinterest + IG, Daten aus Shopify
python3 automation/bild_formate.py --posts-ready 10           # IG-4:5 für wartende Bild-Posts (Name = Zeilen-ID)
python3 automation/bild_formate.py --url URL --name N [--titel T --preis 25.90]
DRY=1 …  (misst und rendert im Speicher, schreibt nichts) · OUT_DIR=… · --bogen /pfad/bogen.jpg · --formate pin
```

### `automation/metricool_pinterest_pin.mjs`
- **Doppel-Pin-Schutz:** «schon gepinnt» = eigenes Ledger ∪ Hetzner-Quittungen ∪ **Plattform** (Metricool
  `getPins` 365 Tage + geplante Pinterest-Posts ±30 Tage, Handle aus dem Pin-Link). Gemessen: Ledger 1,
  Quittungen +5, Plattform 152 Pins → +22, zusammen 28 Handles. Ist die Plattform nicht lesbar, **kein Pin**
  (Exit 1, der Autopilot versucht es später wieder). Kanarienvogel: `PRUEF_HANDLE=interaktives-katzenspielzeug-mit-rotierender-s-627400 DRY=1` → «GILT ALS GEPINNT».
- **2:3-Fassung:** genommen nur wenn (a) Manifest-Preis = Shop-Preis (min und max), (b) Manifest-Hauptbild =
  aktuelles Hauptbild, (c) raw-URL auf `claude/luxestyle-status-tztnn1` HTTP 200 liefert **und** (d) ihre SHA-1
  dem Manifest entspricht. Sonst Rohbild wie bisher, mit Grund im Log. Alle vier Wege getestet (lokaler Server:
  2:3 genommen; Preis-Kopie abweichend → Rohbild; SHA abweichend → Rohbild; nicht gepusht → «raw HTTP 404»).
- `NUR_LISTE=n` druckt die nächsten n Kandidaten (für das Vorrendern), pinnt nicht.
- Board **«Hund & Katze»** für Haustier-Ware (greift erst, wenn das Board existiert; bis dahin Fallback
  «Geschenkideen Schweiz» wie bisher). Muster mit Kanarienvögeln: Katzenaugen-Brille, «Hundert», Samt-Halsband,
  Napfkuchen bleiben draussen; Wassernapf, Kratzbaum, Hundeleine, Futterspender gehen rein.
- Ledger-Zeile trägt neu eine 6. Spalte `bild=2:3` / `bild=roh` (Ampel liest nur Spalte 1, bleibt kompatibel).

## Beispiele (lokal, nicht gepostet)
Die fünf nächsten Pin-Kandidaten (`NUR_LISTE=5`), je Pinterest + IG, alle ≤ 145 KB:
2-in-1-Glätteisen (1920 px, Farbe), USB-Heizkissen (800 px, oben Spiegel/unten Farbe), Gesichtsbürste
(600 px, Rahmen entfernt), LED-Streifen (780 px, unten Spiegel), Bodenstativ mit Ringlicht (800 px, Farbe).
Kontaktbogen per Auge geprüft: Motiv vollständig, keine harte Naht, Preis/Name lesbar.

## Board anlegen (nicht gemacht — Entscheid)
Die Metricool-API **kann** Boards anlegen (Swagger `POST /v2/scheduler/boards/pinterest?brandId=6227837`,
Schema `Board{name*, description, privacy}`). Heute 15 Boards, keins für Haustiere. Vorschlag:
`{"name":"Hund & Katze","description":"Futterspender, Spielzeug und Zubehör für Hund und Katze – LuxeStyle, kleiner Schweizer Shop.","privacy":"PUBLIC"}`.

## Offen
- Push von `social/pins/` nötig, sonst bleibt der Pin beim Rohbild (so gewollt).
- Vorrendern im Autopilot: `python3 automation/bild_formate.py $(NUR_LISTE=3 node automation/metricool_pinterest_pin.mjs)`
  täglich, dann `social/pins/` pushen.
- IG-4:5 für den Bild-Poster: Dateien liegen unter `social/pins/ig45/`; den Poster umzustellen ist nicht Teil dieses Pakets
  (Datei gesperrt).
- Lieferantenbilder mit englischem Werbetext (z. B. Seifenspender «contact free») bleiben auch in der 2:3-Fassung sichtbar —
  gehört zur Bildtext-Prüfung, nicht zur Formatierung.
