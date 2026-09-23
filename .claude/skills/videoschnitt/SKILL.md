---
name: videoschnitt
description: Immer wenn aus einem Lieferanten- oder Produktvideo (CJ, Shopify-Medium) ein Reel/Short/TikTok geschnitten, ein bestehendes Reel beurteilt oder make_reel.sh ersetzt werden soll - und vor jedem Posten eines Reels. Enthaelt die gemessenen Schnittregeln (erste 1,5 s, Hook, Beat auf dem Kick, Vollbild/Band, Fremdtext und Fremdpreise, Loop, Tor am Ergebnis), den Aufruf von automation/reel/schnitt.py, die ffmpeg-Fallen und die Pruefschritte am Kontaktbogen.
---

# Videoschnitt fuer LuxeStyle-Reels

**Werkzeug:** `automation/reel/schnitt.py` (Analyse -> Plan -> Render -> Tor, Entscheidungslog je Reel).
**Selbsttest vor jedem Einsatz nach Code-Aenderung:** `python3 automation/reel/schnitt_test.py` (59 Pruefungen, ~76 s, ohne Netz).
Hintergrund, Zahlen, Proben und die Pruefung vom 23.09.: `dropship/VIDEOSCHNITT-LERNEN.md`.
Marken: **GEMESSEN** = hier selbst geprueft (Befehl/Zahl im Bericht), **QUELLE** = fremde Angabe mit URL,
**BEHAUPTUNG** = ungepruefte Aussage, **SETZUNG** = gewaehlte Schwelle (an n Quellen kalibriert, nicht bewiesen).

## Warum (23.09.2026)

- TikTok-Sehdauer im Median **1,37 s** (68 Videos, Metricool). Sie haengt NICHT an der Laenge (4 s -> 1,16 s,
  15-30 s -> 1,49 s; Spearman rho 0,18, p 0,15). Entschieden wird in den ersten ~1,5 s. **GEMESSEN**
- Der alte Weg (`make_reel.sh`) spielt jede Quelle ab Sekunde 0 (die START-Variable wird nie gelesen), in einem
  580-px-Band: das **Videofenster** fuellt 9-27 % der Flaeche, die erste Einstellung dauert im Median 3,96 s, 17 % der
  Schnitte liegen auf dem Beat (Zufall 24 %). **GEMESSEN**
- Meta (13.03.2026): Clips aneinanderreihen, Untertitel, Rahmen und Tempo aendern zaehlen NICHT als Eigenleistung. **QUELLE**
  https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/

## Die Regeln (Reihenfolge = Wirkung auf die ersten 3 s)

| # | Regel | Marke | Automat in schnitt.py |
|---|---|---|---|
| 1 | **Einstieg = staerkste Stelle, nie das Quell-Intro.** Intro-Zone min(4 s, 12 %) ist fuer ALLE Stuecke gesperrt, wenn der Rest fuer das Reel reicht (sonst nur fuer den Hook abgewertet). Bewegung 0-1 s >= 4/255, < 2 = Standbild; Uebergang am Start (unscharf, Bewegungsspitze in 0,2 s, > 12 = Wisch) abgewertet | GEMESSEN (p3 Karton 0-4 s; Bildjury) | `intro`- und `hook`-Eintrag im Log |
| 2 | **Erster Wechsel <= 1,3 s**; Stuecke 0,6-2,5 s (Mindeststueck = ceil(0,6 s / Schlag)); >= 4 Einstellungen in 10 s | GEMESSEN / SETZUNG (0,6 s) | `k_first`, `k_min` im Log |
| 3 | **Bild 0: nur Marke + Hook, <= 40 Zeichen (Pflicht, sonst Exit 1)**, Hook-Ziel <= 24 Zeichen; Titel/Preis ab ~2 s auf einem Schnitt; letzte ~2 s Preis + «Link in Bio»; **kurzes Reel (< 5 s nach dem Hook): «Link in Bio» im Infofeld statt Fusszeile — nie ein Reel ohne CTA** | GEMESSEN (137 Z. im Bestand) / Bildjury p4 | Ebenen kopf/hook/info/infocta/cta |
| 4 | **Produkt gross**: das schmalste Fenster, das <= 15 % der Bildenergie verliert (1:1 aus Querformat <= 25 %), Vergroesserung <= 2,7x; sonst volle Breite. **Band senkrecht dort, wo am wenigsten Produkt-Energie unter Kopfleiste, Hook, Infofeld und Plattform-Oberflaeche liegt** | GEMESSEN / SETZUNG (15/25 %, n=4) | `layout`, `band` (verdeckte Energie) |
| 5 | **Kein Fremdmaterial**: >= 3 lateinische Woerter, @-Handle/URL, Fremdmarke, CJK/Kana/Hangul-Paar, **Fremdpreis ($12.99, ¥39, 49元, 50% OFF — schon 1 Treffer)** oder eingebranntes Logo -> Einstellung weg (oder textfreies Fenster, per OCR ueber die ganze Einstellung nachgewiesen) | GEMESSEN | OCR je 1 s (eng; chi_sim je 2 s), Kanten-Heuristik |
| 6 | **OCR-Ausfall ist ein Fehler, kein «sauber»** (jeder eng-Aufruf gescheitert -> Exit 1). Ohne chi_sim: Hinweis im Log, `pruefung.cjk_ocr=false` | Code-Pruefung | `ocr.fehler_eng`, `cjk_ocr` |
| 7 | **Szenentext in fremder Schrift** (chinesische Verpackung) liest OCR NICHT -> Kanten-Heuristik >= 20 % ohne Latein = Verdacht; Rest per **Sichtpruefung** (`--sperren`) | GEMESSEN (p2) | — |
| 8 | **Schnitt auf den Kick**: Tempo aus CREDITS.txt; Phase per Kamm-Filter, dann **Tiefton-Onsets (< 150 Hz) an Raster vs. Halbraster** (umlegen ab 1,3x); Schnittbild = letztes Bild AUF oder VOR dem Beat (abrunden) | GEMESSEN (house2 0/14 -> alle Stuecke mit Kick 100 % auf dem Raster) | `kick_phase` im Log |
| 9 | **Keine Stelle zweimal, jede Einstellung einmal** (Hook + nahtloses Ende zaehlen als ein Auftritt); zu wenige Einstellungen -> laengere Stuecke (<= 2,5 s); Wiederholung nur, wenn das Reel sonst < 8 s bliebe | GEMESSEN (Bildjury p3: «Tank aufsetzen» dreimal) | `einstellung_max_auftritte` |
| 10 | **Eine Kamerafahrt** (Grenzen nur relativ erkannt = dieselbe Fahrt): < 8 s sauberes Material -> Exit 3; sonst nur vorwaerts springen (Zeitraffer), einmal zurueck, Ende nahtlos in den Hook | GEMESSEN (Bildjury p4: 25/40, «Ruckler») | `eine_fahrt` |
| 11 | **Loop-Ende**: letztes Stueck = Material direkt VOR dem Hook (nahtlos); sonst 0,4-s-Ueberblendung aufs erste Bild; ganze Takte (Schlaege % 4 = 0) | GEMESSEN (Naht-MAD) / BEHAUPTUNG (Wirkung) | `loop_naht_ok`, `takt_ok` |
| 12 | **Ton**: nur eigene Stuecke aus `automation/music/` mit CREDITS-Zeile (sonst Exit 1), Quellton immer verwerfen, 48 kHz Stereo, -14 LUFS, **True Peak am fertigen MP4 gemessen und nachgeregelt** (Limiter bei 192 kHz, Ton neu kodiert, Video copy) | GEMESSEN (AAC hob bis +1,9 dB) | `ton_nachregelung` in der Pruefung |
| 13 | Punch-in/Zoom sparsam: Drift 100->108 % nur fuer ruhige Stuecke, **nur im Fenster** (Bandkante steht), Punch 106 % nur an Sprungschnitten, <= 1 je 3 s; Tempo 1,5x hoechstens 2 Stuecke | BEHAUPTUNG / QUELLE (Meta) | `zoom`-Eintraege |
| 14 | **Bildrate**: 25 fps fuer 25/50-fps-Quellen (sonst 30) — keine eingefuegten Doppelbilder | GEMESSEN (p2: 16 % -> 0 %) | `fps` im Plan |
| 15 | Laenge organisch 9-12 s; 21-34 s nur im Ads-Test | GEMESSEN / BEHAUPTUNG (TikTok-Blog 2021, ohne URL) | `--ziel` (Standard 12) |
| 16 | **Keine Stimme** (Hausregel); Eigenleistung kommt aus Text/Grafik mit Fakten (Mass, Material, Preis live) — nicht aus dem Schnitt | Hausregel / QUELLE | — (offen: Fakten-Ebene) |

## Aufruf

```bash
# einmalig: chinesische OCR-Daten (2,4 MB, nie ins Repo) — dann SCHNITT_TESSDATA=/tmp/schnitt_tessdata setzen
python3 automation/reel/schnitt.py --tessdata-holen /tmp/schnitt_tessdata
# Analyse (idempotent, Cache <quelle>.schnitt.json bzw. im --arbeitsordner)
python3 automation/reel/schnitt.py --analyse QUELLE.mp4
# Plan ansehen (kein Render): Schnittliste + Entscheidungslog
python3 automation/reel/schnitt.py --plan QUELLE.mp4 --musik luxe-lounge-sax.wav --einstieg 8.0
# Rendern (Preis LIVE aus Shopify; LUXESTYLE + Hook <= 40 Zeichen, Ziel Hook <= 24: Produktwort + Nutzen)
SCHNITT_TESSDATA=/tmp/schnitt_tessdata python3 automation/reel/schnitt.py --render QUELLE.mp4 \
  --musik luxe-lounge-sax.wav --einstieg 8.0 --out /tmp/reelbuild/reel.mp4 --arbeitsordner /tmp/reelbuild/schnitt \
  --titel "Frucht- und" --titel2 "Gemüseabtropfkorb mit Deckel" --preis "CHF 19.90" --hook "Abtropfkorb mit Deckel" --json
# Nach Sichtpruefung korrigieren
  --sperren "6.7-9.0,20.1-21.3"   # Quellsekunden, die nicht ins Reel duerfen (z. B. chinesische Verpackung)
  --hook-ab 44.0                  # Hook ab dieser Quellsekunde (z. B. «Anwendung» statt staerkster Bewegung)
  --zone meta                     # sichere Zone fuer Meta-Anzeigen (y 269-1248, x 65-1015) statt organisch (200-1440)
# Kontaktbogen (erste Sekunde in 6 Bildern + 1 Bild/s + letztes Bild, Linien bei y 200/1440)
python3 automation/reel/schnitt.py --kontaktbogen reel.mp4 --bogen-out bogen.jpg
```

Exit-Codes: **0** ok (Tor bestanden, letzte stdout-Zeile JSON mit `pruefung.ok = true`) · **3** Quelle ungeeignet
(`UNGEEIGNET: <Grund>` -> naechsten Clip nehmen, NIE auf make_reel.sh zurueckfallen; auch kaputter Download) ·
**4** Tor am Ergebnis gescheitert (`PRUEFUNG: …`, Datei geloescht, Log bleibt -> Reel verwerfen, Clip merken) ·
**1** Fehler (u. a. Musik: nicht in automation/music, keine CREDITS-Zeile, < 6 s ab Einstieg; Bild 0 > 40 Zeichen).
Das Entscheidungslog liegt als `<out>.schnitt.json` (oder im `--arbeitsordner`) — nach dem Posten loeschen, nie ins Repo.

**Reel-Motor** (`automation/cj_video_reel_engine.mjs`, noch nicht umgestellt): Schnittstelle im Kopf von `schnitt.py` —
statt `make_reel.sh` `spawnSync('python3', ['automation/reel/schnitt.py','--render',src,'--musik',musik,'--einstieg',
String(mw.start),'--out',out,'--titel',z1,'--titel2',z2,'--preis',`CHF ${k.price.toFixed(2)}`,'--hook',hook,
'--arbeitsordner','/tmp/reelbuild/schnitt','--json'], {timeout: 300000, env: {...process.env, SCHNITT_TESSDATA: '/tmp/schnitt_tessdata'}})`;
Status 3 -> naechster Clip, 4 -> Ledger «schnitt-pruefung». Die heutigen HOOKS des Motors sind generisch und bis 36 Zeichen
lang — die Umstellung braucht eine eigene Hook-Funktion (Produktwort + Nutzen, <= 24 Zeichen).

## Rezepte (ffmpeg 7.0.2 static, gemessen)

- **Framegenaue Stuecke**: je Stueck eigener Eingang `-threads 2 -ss START -t LAENGE+0.6 -i quelle`, dann
  `setpts=PTS-STARTPTS,fps=F,tpad=stop_mode=clone:stop=8,trim=end_frame=n+3,<Geometrie>,setsar=1,fps=F,trim=end_frame=n`
  und `concat=...,fps=F`. Ohne `fps` nach concat: Schnitte bis 47 ms daneben; ohne Doppel-Trim: -1 Bild je Stueck.
  Ergebnis: alle Schnitte 0 Bilder Versatz (4 Proben + Selbsttest).
- **`-threads` gilt je Eingang/Ausgang** (AVCodecContext-Option): vor JEDES `-i` und vor die Ausgabe; `-filter_threads`
  (global) fuer `-vf`-Graphen, `-filter_complex_threads` fuer den Render-Graphen.
- **Zoom ohne Zittern**: `scale=2W:2H,zoompan=z='…':d=1:s=WxH:fps=F` (2x hochskaliert: rms 0,50 statt 1,05 px).
  Im Band-Modus **nur auf das Fenster** anwenden, dann `overlay` auf den Unschaerfe-Grund — sonst kriecht die Bandkante.
  Nie `crop` mit n/t in w/h (wird nur einmal ausgewertet).
- **Musik**: `-ss EINSTIEG -i musik` sitzt sampelgenau; loudnorm messen, dann `linear=true` mit den Messwerten; danach
  True Peak AM MP4 messen und bei > -1,5 dBTP `aresample=192000,alimiter=limit=…:level=false,aresample=48000` + AAC
  neu, Video per `-c:v copy`.
- **Kontaktbogen exakt**: `select='eq(n\,0)+eq(n\,6)+…',-fps_mode passthrough` — `fps=1` waehlt Bilder bis 1 s zu spaet.
- **Stream-Daten**: PyAV (`import av`), nie `/usr/local/bin/ffprobe` (Python-Ersatz, liefert nur die Dauer).
- **Text in Testquellen**: PNG als eigener Eingang `-loop 1 -framerate 25 -t D -i text.png` + `overlay=…:shortest=1` —
  nie `movie=PFAD` im Filtergraph (Pfad ungeschuetzt; ohne `-t`/`shortest` fror die Testquelle ab 8 s ein).

## Fallen (teuer gelernt)

1. **scene > 0,2 verpasst Wechsel zwischen aehnlichen Blickwinkeln** (p3 9,16 s: 0,167; 27,96 s: 0,194). Relativer Test:
   >= 0,08, >= 6x Median (+-12), >= 4x Maximum der +-3 **und >= 1,5x Maximum der +-8 Nachbarbilder**.
2. **Periodisches Ruckeln** (Spitze alle 4 Bilder, p1 20,36-21,04 s je 0,09-0,13) ueberlistet einen +-3-Nachbartest ->
   Scheinschnitt, im Reel unsichtbar (Staerke 1,9). Deshalb der +-8-Test oben — und relativ erkannte Grenzen gelten als
   **dieselbe Kamerafahrt** (0,4-s-Sprungregel, nur vorwaerts).
3. **Doppelte Bilder** (jedes 2. Bild gleich, scene 0,000): reiner Median-Test -> Scheinschnitte (p1 74 statt 21
   Einstellungen), Median der Bewegung ~0 -> getrimmtes Mittel.
4. **Farbgleicher harter Schnitt**: scene 0,088 -> nur das Fenster-Histogramm sieht ihn, 4 Bilder zu frueh -> mit der
   scene-Spitze im +-0,4-s-Fenster verfeinern.
5. **OCR liest Szenentext nicht** (chinesisches Etikett, Joghurt-Marke): 0 Treffer -> Kanten-Heuristik + `--sperren`.
   Ziffern ohne Waehrung (Klappkalender «10») bleiben fuer die Automatik unsichtbar.
6. **Stumme OCR-Fehler**: `except: return []` machte den Fremdtext-Filter blind (fehlendes tesseract, Pfad mit
   Leerzeichen). Jetzt `None` + Zaehler; der tessdata-Pfad geht per `shlex.quote` an pytesseract (das zerlegt per shlex).
7. **Stativ-Clip = Logo-Fehlalarm**: in einer ruhigen Quelle ist jede Szenenkante «statisch» (Tischkante, Sandale).
   Anteil ruhiger Pixel: Mehr-Einstellungs-Quellen 0,000-0,022, Stativ/Einzelfahrt 0,30-0,50 -> ab 0,15 zaehlt eine
   statische Box nur mit OCR-Buchstaben, Schrift-Kanten oder in einer Ecke.
8. **Kantenenergie zieht zu Mustern** (Pulli-Buchstaben statt Hundegeschirr): Kanten 35 % + Bewegung 65 %, Mitte 0,4.
9. **Rand 0,08 s an jedem Schnitt** macht aus 1-s-Einstellungen 0,84 s -> 0,01/0,02 s genuegen.
10. **testsrc2** hat oben links einen Zeitstempel (wird zum «Logo») und bewegt sich kaum -> groesser erzeugen,
    wegschneiden, `scroll` dazu.
11. **Randlinien** (1-px-Rahmen, 10-px-Streifen) sind keine Logos: duenne Boxen ignorieren, 2 px Rand immer weg.
12. **tessdata**: `github.com/…/raw` liefert ueber den Proxy 378 Byte Fehler-JSON -> `--tessdata-holen` nimmt
    raw.githubusercontent.com und prueft die Groesse (> 1 MB). `OMP_THREAD_LIMIT=1` setzen.
13. **Zoom an der Loop-Naht**: Drift auf Hook UND Ende gibt einen Zoom-Sprung (Naht-MAD 23,5) -> nahtloses Ende ohne Zoom.
14. **Beat-Phase nie an librosa angleichen**: bei luxe-house2 lag librosa selbst auf dem Offbeat; die Angleichung legte
    ALLE Schnitte zwischen die Kicks (0/14 im Fenster, +177..+227 ms). Der Kick (Tiefton) entscheidet.
15. **Schnittbild runden verschiebt nach hinten**: das Fenster ist schief (-100/+33 ms). Raster-Punkt liegt ~20 ms hinter
    dem Kick-Onset; gerundet bei 25 fps landeten 2/6 Schnitte +40/+45 ms hinter dem Kick -> abrunden.
16. **AAC hebt den True Peak unterschiedlich stark** (+0,6 dB bei hype2, +1,9 dB bei house2 ab 0,21 s) — ein festes
    Ziel reicht nicht, gemessen wird am MP4.
17. **Kopfzeile != Datei**: ein abgebrochener Faststart-Download meldet 26 s, dekodierbar sind 13,6 s -> Dauer = Zahl der
    dekodierten Bilder; plus Tor (Bildzahl) am Ergebnis.
18. **Wiederholte Handlung sieht keine Zahl**: p3 zeigte zweimal «Tank aufsetzen» bei Quelle 9,8 s und 19,7 s — 10 s
    Abstand, Bildabstand 29,0 bei Median 23,9 aller Paare. Deshalb: jede Einstellung nur einmal.
19. **Intro-Abwertung nur fuer den Hook reicht nicht** (p3 zeigte den Karton als 2. Stueck) -> Intro fuer alle sperren.

## Pruefschritte vor dem Posten (Pflicht)

1. Exit 0 heisst: das Tor hat bestanden (Format, Bildzahl, Schnittversatz -1..1, erster Schnitt sichtbar, -14 +-1 LUFS,
   True Peak <= -1,5, Loop-Naht, Zone). Exit 4 nie «nochmal versuchen», sondern Ursache im Log lesen.
2. **Kontaktbogen per Read ansehen** (erste Sekunde + 1 Bild/s): Zeigt Bild 0 das Produkt? (Die Automatik erkennt das
   Produkt nicht — p2 Bild 0 zeigt den Tisch, der Korb faehrt erst bei 0,2 s herein.) Irgendwo Fremdtext, chinesische
   Verpackung, Fremdlogo, Creator-Handle, Preisschild? -> `--sperren` bzw. `--hook-ab`, neu rendern.
   Zeigt das Reel die ANWENDUNG (Hund trinkt, Korb im Einsatz) oder nur Aufbau? -> `--hook-ab`.
3. `pruefung.cjk_ocr` false? -> chinesischen Text nur per Auge ausgeschlossen: Kontaktbogen besonders streng lesen.
4. Preis im Bild = Shopify-Preis jetzt (nie aus dem Kopf); Hook passt zum Produkt (Produktwort, keine Heilzusage).
5. Keine Stimme, Musik eigenes Stueck, nicht dasselbe Stueck wie die letzten drei Reels (Motor: `_musik_verlauf.txt`).
6. Nach 48 h messen: TikTok `averageTimeWatched` (Ziel > 3 s — SETZUNG), IG `ig_reels_avg_watch_time` (ms!) — A/B je 10
   Reels, gleicher Hook-Text in beiden Armen (sonst misst man den Text, nicht den Schnitt).

## Pruefung und Nachbesserung (23.09.2026, Kurzfassung)

Drei Pruefer (Bildjury, Technik, Code) fanden 3 hohe und 17 mittlere Befunde; alle hohen und mittleren sind behoben
und am Ergebnis nachgemessen — Tabelle Befund -> Massnahme -> Nachweis in `dropship/VIDEOSCHNITT-LERNEN.md` §7.
Kern: Tor am Ergebnis (Exit 4), Kick-Phase, True Peak am MP4, dekodierbare Dauer, OCR-Fehler sichtbar, Intro fuer alle
Stuecke, jede Einstellung einmal, Kamerafahrt-Regel, Band nach verdeckter Energie, Zoom im Fenster, CTA immer, 25 fps.
