---
name: videoschnitt
description: Immer wenn aus einem Lieferanten- oder Produktvideo (CJ, Shopify-Medium) ein Reel/Short/TikTok geschnitten, ein bestehendes Reel beurteilt oder make_reel.sh ersetzt werden soll - und vor jedem Posten eines Reels. Enthaelt die gemessenen Schnittregeln (erste 1,5 s, Hook, Beat, Vollbild, Fremdtext, Loop), den Aufruf von automation/reel/schnitt.py, die ffmpeg-Fallen und die Pruefschritte am Kontaktbogen.
---

# Videoschnitt fuer LuxeStyle-Reels

**Werkzeug:** `automation/reel/schnitt.py` (Analyse -> Plan -> Render, Entscheidungslog je Reel).
**Selbsttest vor jedem Einsatz nach Code-Aenderung:** `python3 automation/reel/schnitt_test.py` (38 Pruefungen, ~45 s, ohne Netz).
Hintergrund, Zahlen und Proben: `dropship/VIDEOSCHNITT-LERNEN.md`.

## Warum (gemessen, 23.09.2026)

- TikTok-Sehdauer im Median **1,37 s** (68 Videos, Metricool). Sie haengt NICHT an der Laenge (4 s -> 1,16 s,
  15-30 s -> 1,49 s; Spearman rho 0,18, p 0,15). Entschieden wird in den ersten ~1,5 s. **GEMESSEN**
- Der alte Weg (`make_reel.sh`) spielt jede Quelle ab Sekunde 0 (die START-Variable wird nie gelesen), in einem
  580-px-Band: Das Produkt fuellt 9-27 % der Flaeche, die erste Einstellung dauert im Median 3,96 s, und 17 % der
  Schnitte liegen auf dem Beat (Zufall waere 24 %). **GEMESSEN**
- Meta (13.03.2026): Clips aneinanderreihen, Untertitel, Rahmen und Tempo aendern zaehlen NICHT als Eigenleistung. **QUELLE**
  https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/

## Die Regeln (Reihenfolge = Wirkung auf die ersten 3 s)

| # | Regel | Marke | Automat in schnitt.py |
|---|---|---|---|
| 1 | **Einstieg = staerkste Stelle, nie Quellsekunde 0** (kein Karton, Logo-Intro, Standbild). Bewegung 0-1 s >= 4/255, < 2 = Standbild | GEMESSEN | Hook-Suche ueber alle sauberen Fenster, getrimmtes Mittel der Bewegung, Intro-Zone min(4 s, 12 %) abgewertet, nie auf einem Sprung-Verdacht |
| 2 | **Erster Wechsel <= 1,3 s**, Einstellungen 0,8-2,5 s (Median-Ziel 1,2-1,6), >= 4 Einstellungen in 10 s | GEMESSEN/QUELLE | Beat-Raster: erstes Stueck `k_first` Schlaege <= 1,3 s |
| 3 | **Bild 0: nur Marke + Hook (<= 40 Zeichen)**; Titel/Preis ab ~2 s auf einem Schnitt; letzte ~2 s Preis + «Link in Bio» | GEMESSEN (137 Z. im Bestand) | 4 PNG-Ebenen (kopf/hook/info/cta) mit Zeitfenstern |
| 4 | **Produkt gross**: das schmalste Fenster, das <= 15 % der Bildenergie verliert (1:1 aus Querformat <= 25 %), Vergroesserung <= 2,7x; sonst volle Breite ueber Unschaerfe | GEMESSEN (Diagnosebogen p1/p2/p3) | `layout`-Entscheid im Log |
| 5 | **Kein Fremdmaterial**: >= 3 lateinische Woerter, @-Handle/URL, Fremdmarke, CJK-Paar oder eingebranntes Logo -> Einstellung weg (oder textfreies Fenster, per OCR nachgewiesen) | GEMESSEN | OCR je 1 s (eng; chi_sim je 2 s), Kanten-Heuristik |
| 6 | **Szenentext in fremder Schrift** (chinesische Verpackung) liest OCR NICHT (0 Treffer bei sichtbarem Etikett) -> Kanten-Heuristik >= 20 % ohne Latein = Verdacht; Rest per **Sichtpruefung** | GEMESSEN (p2) | `--sperren` fuer die Faelle, die nur das Auge sieht |
| 7 | **Schnitt auf den Beat**: Tempo aus CREDITS.txt (librosa irrt bei hype2, liquid-dnb, orchestra), Phase per Kamm-Filter, bei Halb-Versatz auf librosa-Phase (house2: 31 % -> 66 %), Einstieg auf den Beat einrasten | GEMESSEN | Raster-Guete im Log (`guete`, `phase_an_librosa`), Ergebnis 0 Bilder Versatz |
| 8 | **Keine Stelle zweimal** (kein `-stream_loop`); Stuecke derselben Einstellung springen >= 0,4 s; Quelle zu kurz -> Reel kuerzer (< 5 s -> ungeeignet) | GEMESSEN (3/61 sichtbare Neustarts) | Ueberlappungs-Pruefung = 0 |
| 9 | **Loop-Ende**: letztes Stueck = Material direkt VOR dem Hook (naht los); sonst 0,4-s-Ueberblendung aufs erste Bild; Ton max 0,15 s Ausblendung | GEMESSEN (Naht-MAD) / BEHAUPTUNG (Wirkung) | `loop_naht_ok` in der Pruefung |
| 10 | **Ton**: nur eigene Stuecke (keine CC-BY), Quellton immer verwerfen, 48 kHz Stereo, zweistufig -14 LUFS, TP-Ziel -2,5 (AAC hebt um ~0,6 dB) | GEMESSEN | Lautheit + TP im Ergebnis gemessen |
| 11 | Punch-in/Zoom sparsam: Drift 100->108 % nur fuer ruhige Stuecke, Punch 106 % nur an Sprungschnitten, <= 1 je 3 s; Tempo 1,5x hoechstens 2 Stuecke (Leerlauf) | BEHAUPTUNG / QUELLE (Meta: Tempo ist keine Eigenleistung) | `zoom`-Eintraege im Log |
| 12 | Laenge organisch 9-12 s; 21-34 s nur im Ads-Test | GEMESSEN / QUELLE | `--ziel` (Standard 12) |
| 13 | **Keine Stimme** (Hausregel); Eigenleistung kommt aus Text/Grafik mit Fakten (Mass, Material, Preis live) — nicht aus dem Schnitt | Hausregel / QUELLE | — (offen: Fakten-Ebene) |

## Aufruf

```bash
# Analyse (idempotent, Cache <quelle>.schnitt.json): Einstellungen, Bewertung, Fremdtext, Balken, Ton
python3 automation/reel/schnitt.py --analyse QUELLE.mp4
# Plan ansehen (kein Render): Schnittliste + Entscheidungslog
python3 automation/reel/schnitt.py --plan QUELLE.mp4 --musik luxe-lounge-sax.wav --einstieg 8.0
# Rendern (Preis LIVE aus Shopify, Hook <= 24 Zeichen: Produktwort + Nutzen)
SCHNITT_TESSDATA=<ordner mit chi_sim.traineddata> python3 automation/reel/schnitt.py --render QUELLE.mp4 \
  --musik luxe-lounge-sax.wav --einstieg 8.0 --out /tmp/reelbuild/reel.mp4 \
  --titel "Frucht- und" --titel2 "Gemüseabtropfkorb mit Deckel" --preis "CHF 19.90" --hook "Abtropfkorb mit Deckel" --json
# Nach Sichtpruefung korrigieren
  --sperren "6.7-9.0,20.1-21.3"   # Quellsekunden, die nicht ins Reel duerfen (z. B. chinesische Verpackung)
  --hook-ab 44.0                  # Hook ab dieser Quellsekunde (z. B. «Anwendung» statt staerkster Bewegung)
  --zone meta                     # sichere Zone fuer Meta-Anzeigen (y 269-1248, x 65-1015) statt organisch (200-1440)
# Kontaktbogen (erste Sekunde in 6 Bildern + 1 Bild/s + letztes Bild, Linien bei y 200/1440)
python3 automation/reel/schnitt.py --kontaktbogen reel.mp4 --bogen-out bogen.jpg
```

Exit-Codes: **0** ok (letzte stdout-Zeile JSON mit `pruefung`) · **3** Quelle ungeeignet (`UNGEEIGNET: <Grund>` auf
stdout -> naechsten Clip des Produkts nehmen, NIE auf make_reel.sh zurueckfallen) · **1** Fehler.
Das Entscheidungslog liegt als `<out>.schnitt.json` neben dem Reel (NICHT ins Repo — das Repo ist oeffentlich und waechst
um jedes Blob; Proben nur im Scratchpad).

**Reel-Motor** (`automation/cj_video_reel_engine.mjs`, noch nicht umgestellt): Schnittstelle steht im Kopf von
`schnitt.py` — statt `make_reel.sh` `spawnSync('python3', ['automation/reel/schnitt.py','--render',src,'--musik',musik,
'--einstieg',String(mw.start),'--out',out,'--titel',z1,'--titel2',z2,'--preis',`CHF ${k.price.toFixed(2)}`,'--hook',hook,'--json'])`,
Status 3 -> naechster Clip.

## Rezepte (ffmpeg 7.0.2 static, gemessen)

- **Framegenaue Stuecke**: je Stueck eigener Eingang `-ss START -t LAENGE+0.6 -i quelle`, dann
  `setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop=8,trim=end_frame=n+3,<Geometrie>,setsar=1,fps=30,trim=end_frame=n`
  und `concat=...,fps=30`. Ohne `fps=30` nach concat: 25 fps, Schnitte bis 47 ms daneben; ohne Doppel-Trim:
  -1 Bild je Stueck (Labor). Ergebnis hier: alle Schnitte 0 Bilder Versatz (4 Proben + Selbsttest).
- **Zoom ohne Zittern**: `scale=2160:3840,zoompan=z='…':d=1:s=1080x1920:fps=30` (2x hochskaliert: rms 0,50 statt 1,05 px).
  Nie `crop` mit n/t in w/h (wird nur einmal ausgewertet).
- **Musik**: `-ss EINSTIEG -i musik` sitzt sampelgenau; loudnorm messen, dann `linear=true` mit den Messwerten.
- **Kontaktbogen exakt**: `select='eq(n\,0)+eq(n\,6)+…',-fps_mode passthrough` — `fps=1` waehlt Bilder bis 1 s zu spaet.
- **Stream-Daten**: PyAV (`import av`), nie `/usr/local/bin/ffprobe` (Python-Ersatz, liefert nur die Dauer).

## Fallen (teuer gelernt)

1. **scene > 0,2 verpasst Wechsel zwischen aehnlichen Blickwinkeln** (p3 9,16 s: 0,167). Der Hook landete genau auf dem
   Sprung (Sprung = «Bewegung»), das nahtlose Ende lag hinter einem Kamerawechsel. Loesung: getrimmtes Mittel der
   Bewegung, Sprung-Verdacht 0,12-0,2 als Hook-Sperre, Naht im Ergebnis messen.
2. **Doppelte Bilder** (jedes 2. Bild gleich, scene 0,000): ein reiner Median-Test macht daraus Scheinschnitte (p1 74 statt
   21 Einstellungen) und ein Median der Bewegung faellt auf ~0. Nachbar-Test (+-3 Bilder) und getrimmtes Mittel.
3. **Farbgleicher harter Schnitt** (Farbe gedreht, Helligkeit gleich): scene 0,088 -> nur das Fenster-Histogramm sieht ihn,
   und das legt die Grenze 4 Bilder zu frueh -> mit der scene-Spitze im +-0,4-s-Fenster verfeinern.
4. **OCR liest Szenentext nicht** (chinesisches Spuelmittel-Etikett, Joghurt-Marke im Kuehlschrank): chi_sim conf >= 85,
   auch 2x hochskaliert: 0 Treffer. Kanten-Heuristik fand 2 von 3 Einstellungen, die dritte nur das Auge -> `--sperren`.
5. **Kantenenergie zieht zu Mustern** (Pulli-Buchstaben statt Hundegeschirr): Kanten 35 % + Bewegung 65 %, Mitte-Vorliebe
   0,4 — und lieber volle Breite als ein Anschnitt (3:4 als 1080x1440 deckt die sichtbare Zone 200-1440 ganz).
6. **Rand 0,08 s an jedem Schnitt** macht aus 1-s-Einstellungen 0,84 s -> kein 2-Schlag-Stueck passt; 0,01/0,02 s genuegen
   (der Selbsttest prueft jedes Ausgabebild gegen seine Soll-Einstellung: 0 Aufblitzer).
7. **testsrc2** hat oben links einen Zeitstempel (wird zum «Logo») und bewegt sich kaum (gilt als Standbild) -> groesser
   erzeugen, wegschneiden, `scroll` dazu.
8. **Randlinien** (1-px-Rahmen, 10-px-Streifen) sind keine Logos: duenne Boxen ignorieren, 2 px Rand immer weg.
9. **tessdata**: `github.com/…/raw` liefert ueber den Proxy 378 Byte Fehler-JSON; `raw.githubusercontent.com/tesseract-ocr/
   tessdata_fast/main/chi_sim.traineddata` (2'469'156 Byte). `OMP_THREAD_LIMIT=1` setzen.
10. **Zoom an der Loop-Naht**: Drift auf Hook UND Ende gibt einen Zoom-Sprung (Naht-MAD 23,5 statt 0,4) -> das nahtlose Ende
    bekommt nie einen Zoom. Die Naht-Pruefung vergleicht mit den Bildwechseln UM die Naht (blinkende LEDs sind kein Fehler).
11. **Intro-Abwertung kostet manchmal einen guten Einstieg** (p2: Deckel in der Hand bei 1,05 s) -> am Kontaktbogen pruefen,
    ggf. `--hook-ab`.

## Pruefschritte vor dem Posten (Pflicht)

1. Exit 0 und in `pruefung`: `frames == frames_soll`, alle `schnitt_versatz_frames` in -1..1, `lufs` -14 +-1,
   `true_peak <= -1.5`, `loop_naht_ok`, `text.zone_ok`.
2. **Kontaktbogen per Read ansehen** (erste Sekunde + 1 Bild/s): Zeigt Bild 0 das Produkt in Bewegung? Irgendwo
   Fremdtext, chinesische Verpackung, Fremdlogo, Creator-Handle? -> `--sperren` bzw. `--hook-ab`, neu rendern.
   Zeigt das Reel die ANWENDUNG (Hund trinkt, Korb im Einsatz) oder nur Aufbau/Auspacken? -> `--hook-ab`.
3. Preis im Bild = Shopify-Preis jetzt (nie aus dem Kopf); Hook passt zum Produkt (Produktwort, keine Heilzusage).
4. Keine Stimme, Musik eigenes Stueck, nicht dasselbe Stueck wie die letzten drei Reels (Motor: `_musik_verlauf.txt`).
5. Nach 48 h messen: TikTok `averageTimeWatched` (Ziel > 3 s), IG `ig_reels_avg_watch_time` (ms!) — A/B je 10 Reels.
