# HyperFrames-Probe (Betreiber «ja» zur Empfehlung aus dem TikTok «Claude 5 besten Plugins», 28.09.2026)

**Was:** heygen-com/hyperframes (Apache-2.0, npm `hyperframes` 0.8.86): HTML + CSS + GSAP-Zeitleiste → deterministisches MP4.
Kein Plugin installiert — nur die CLI in `/tmp/hfprobe` (Telemetrie abgeschaltet), getrennt von allen Postern.
Vorlage: `automation/hyperframes/panda_probe/index.html`, Einrichtung: `automation/hyperframes/einrichten.sh`.

## Ergebnis (GEMESSEN)

| Fassung | Änderung | Meisterwerk-Tor | Gemini-Jury |
|---|---|---|---|
| v1 | 3 Szenen, langsamer Zoom | ✗ HOOK 2,62 · STILL 70 % | 8,67 ✓ |
| v3 | 5 Szenen, starker Zoom/Schwenk | ✓ Hook 5,38 · Still 0 % | 6,33 ✗ (Hook-Text im 1. Bild halb aufgebaut, «zu schlicht») |
| v4 | Hook ab Bild 0 voll, Goldstrich, grössere Karte | ✓ 3,27 | 9,33 ✓ → Wiederholung 7,17 ✗ (Streuung!) |
| v6 | Karte fährt von unten ein, nur Bilder MIT Handy (sitzender Panda raus) | ✓ Hook 6,43 · Still 10 % | **9,33 / 9,17 / 9,33 ✓ (3/3)** |

Zum Vergleich die wartenden Reels aus `make_reel.sh`: Jury 2,2–8,7, 23 von 35 durchgefallen.
Render: 10 s in 21–48 s auf 4 Kernen (Chromium-Headless aus /opt/pw-browsers), 4,5–6,5 MB.

## Was HyperFrames hier besser kann
- **Lieferantentext wegschneiden:** Die Produktbilder tragen unten englische Mass-Balken («12 cm long, 9 cm wide…»);
  die Karte zeigt das Bild bildschirmfüllend mit Ausschnitt oben — der Balken fällt aus dem Bild.
- **Typografie + Karten** (Playfair/Inter lokal, Preis-Karte, Fakten-Chips aus der ECHTEN Beschreibung) statt
  ffmpeg-Overlays; Emoji rendern korrekt (Noto Color Emoji) — ffmpeg machte daraus «□».
- **Bewegung nach Mass:** Einstieg, Zoom, Schwenk frei gesteuert → das Hook-Tor ist planbar erfüllbar.

## Fallen (GEMESSEN)
1. `/usr/local/bin/ffprobe` ist ein Python-Ersatz → «Audio duration normalization failed: no video stream» → echtes ffprobe.
2. Telemetrie standardmässig AN → `hyperframes telemetry disable`.
3. Wortweises Einblenden des Hooks = halber Text im ersten Bild → Jury «abgeschnitten». Hook ab Bild 0 voll lesbar.
4. Ein Karten-Zoom mit Ursprung unten schiebt die Karte in den Hook. Bewegung im ersten Bild: Einfahren von unten.
5. Produktvarianten: ein Bild ohne die Funktion (Panda ohne Handy) → Jury Stimmigkeit 2–4. Nur Bilder zeigen, die
   das Versprechen der Caption belegen.
6. **Die Jury streut** (dasselbe Video 9,33 → 7,17). Für Automatik: Mehrheit aus 3 Urteilen statt einem (offen).

## Nächster Schritt (nicht umgesetzt — Betreiber-Entscheid)
Einen «HyperFrames-Motor» neben den Reel-Motor stellen: je Produkt mit ≥ 3 guten Bildern (Jury-Bildcheck je Bild)
eine Komposition aus der Vorlage füllen (Hook aus Titel, Chips aus Beschreibung, Preis live), rendern, Tor + Jury (3×),
dann `reels_seed.csv` (ready). Kosten: nur Rechenzeit + ~0,3 Rp. Jury je Reel.
