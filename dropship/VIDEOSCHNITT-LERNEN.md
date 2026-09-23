# Videoschnitt lernen — Bericht (23.09.2026, nachgebessert nach drei Prüfberichten)

Betreiber: «lerne videos zu schneiden und sachen zu brauchen». Grundlage waren vier Lernberichte (Handwerk/Quellen, Labor
an 30 CJ-Quellen, Material-Inventur, Schnitt-Kritik an 61 Bestands-Reels). Daraus ist ein Schnitt-Motor mit Selbsttest
und Skill entstanden, geprüft an 4 echten CJ-Quellen gegen den heutigen Weg (`make_reel.sh`). Danach haben drei
unabhängige Prüfer (Bildjury, Technik, Code) den Motor geprüft; alle hohen und mittleren Befunde sind behoben und am
Ergebnis nachgemessen (§7).
Marken: **GEMESSEN** = hier selbst geprüft (Befehl/Zahl), **QUELLE** = fremde Angabe mit URL, **BEHAUPTUNG** = ungeprüft,
**SETZUNG** = gewählte Schwelle (an wenigen Quellen kalibriert, nicht bewiesen).
Vorrang bei Widerspruch: GEMESSEN vor QUELLE vor BEHAUPTUNG.

## 1. Kurzfassung

- **Gebaut:** `automation/reel/schnitt.py`. Er analysiert (Einstellungen, Kamerafahrten, Bewegung, Schärfe, Fremdtext und
  Fremdpreise, Schwarz- und Standbild-Strecken, Balken, dekodierbare Dauer), plant (Hook zuerst, Beat-Raster auf dem Kick,
  Layout, Band-Lage, Loop-Ende, Text-Takt, ganze Takte) und rendert (1080×1920, 25 fps bei 25-fps-Quellen, −14 LUFS).
  Danach prüft ein **Tor am Ergebnis**: Wer es nicht besteht, bekommt Exit 4 und keine Datei.
- **Selbsttest:** `automation/reel/schnitt_test.py` besteht **59/59** in 76 s, ohne Netz (vorher 38 Prüfungen, drei davon
  tautologisch).
- **Proben (nach Nachbesserung, GEMESSEN):**
  - alle Schnitte 0 Bilder neben dem Plan, jeder Schnitt auf oder höchstens 1 Bild vor dem Beat
  - p2, p3 und p3r: alle Schnitte im Kick-Fenster −100/+33 ms (9/9, 6/6, 6/6); p1 (hype2, Kick nur auf jedem 2. Schlag) 5/9
  - −14,0 bis −14,4 LUFS, True Peak −1,9 bis −3,4 dBTP
  - jede Einstellung höchstens einmal (Hook + nahtloses Ende zählen als ein Auftritt)
  - kein Karton im automatischen p3
  - p4 (eine 7-s-Kamerafahrt) wird mit Exit 3 abgelehnt statt umgestellt
- **Ehrlich eingeordnet:** Die **Videofläche** (nicht die «Produktfläche») beträgt 56–100 % statt 9–27 %. Unter Text und
  Plattform-Oberfläche liegen 8–25 % der Produkt-Energie.
  Beim **Ton** ist die Lautheit kein Vorteil, denn alt lag schon bei −14,2 bis −14,9 LUFS. Echte Unterschiede sind:
  - 48 kHz statt 96 kHz
  - Stereo statt teils mono
  - True Peak alt bis −0,8 dBTP
- **Grenze:** Chinesischen Text auf Verpackungen liest keine OCR. Ob das Produkt auf Bild 0 zu sehen ist, weiss der Motor
  nicht. Deshalb bleibt die Kontaktbogen-Sichtprüfung vor dem Posten Pflicht; dafür gibt es die Schalter `--sperren` und
  `--hook-ab`.
- **Nicht angefasst:** Den Reel-Motor habe ich nicht umgestellt. Die Schnittstelle (Exit 0/1/3/4, `--arbeitsordner`,
  `SCHNITT_TESSDATA`) steht im Kopf von `schnitt.py` und im Skill `videoschnitt`.

## 2. Was gelernt wurde (aus den vier Berichten, verdichtet)

| Befund | Marke | Folge für den Schnitt |
|---|---|---|
| TikTok-Sehdauer im Median 1,37 s (68 Videos), unabhängig von der Länge (ρ 0,18, p 0,15); IG im Median 2,69 s | GEMESSEN (Metricool/IG-Dump) | Die ersten 1,5 s entscheiden. Organisch 9–12 s |
| `make_reel.sh` liest START nie; jede Quelle beginnt bei 0 s (Karton, Titelkarte, Schwarz). 13–15 von 56–61 Reels sind in Sekunde 0–1 fast ein Standbild | GEMESSEN | Hook = stärkste Stelle, Quell-Intro gesperrt |
| 580-px-Band: Videofenster auf 9,1 % (9:16), 12,2 % (3:4), 16,2 % (1:1) und 27,1 % (16:9) der Fläche | GEMESSEN | Vollbild oder volle Breite |
| Erste Einstellung im Median 3,96 s; Schnitte zu 17 % auf dem Beat (Zufall 24 %) | GEMESSEN | Beat-Raster, erster Wechsel ≤ 1,3 s |
| Auf Bild 0 im Median 137 Zeichen (8,1 s Lesezeit bei 17 Z/s) | GEMESSEN | Bild 0 nur Marke + Hook, Rest gestaffelt |
| 16/58 Reels mit englischem Lieferantentext; ein Creator-Video mit Handle-Wasserzeichen in der Warteschlange | GEMESSEN | OCR je 1 s; Einstellung verwerfen oder textfrei zuschneiden |
| 56/61 Reels mit bitgleichem Tonbett (v1-Stücke ab 0 s) | GEMESSEN | Abwechslung über `musikWahl`, Einstieg auf dem Beat |
| 3/61 Reels mit sichtbarem Neustart durch `-stream_loop` | GEMESSEN | Keine Stelle zweimal; kurze Quelle ergibt ein kürzeres Reel |
| Meta 13.03.2026: Aneinanderreihen, Untertitel und Tempo ändern gelten nicht als Eigenleistung | QUELLE https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/ | Schnitt hebt die Sehdauer, nicht die Originalität; dafür braucht es Fakten-Grafik |
| 9:16 statt Letterbox +91 % Conversion; 21–34 s +280 % (Anzeigen) | BEHAUPTUNG (TikTok-Blog 2021, im Lernbericht zitiert, ohne URL) | Vollbild ja; Länge nur im Ads-Test |
| Punch-in, Pattern-Interrupt alle 2–3 s | BEHAUPTUNG (Creator-Blogs) | Sparsam: ≤ 1 je 3 s, nur an Sprungschnitten |

## 3. Was hier gemessen wurde (Bau, Proben, Nachbesserung, 23.09.2026 20:20–23:10 UTC)

### 3.1 Detektoren und Regeln (Fehler, die erst an echten Quellen sichtbar wurden)
1. **Schnitt-Erkennung.** `scene ≥ 0,2` (Labor 26/28, 0 Fehlalarme) übersieht Wechsel zwischen ähnlichen Blickwinkeln
   (p3 9,16 s: 0,167; p3 27,96 s: 0,194).
   - Ein reiner Median-Test (≥ 6× Umgebung) erzeugt bei Quellen mit doppelten Bildern Scheinschnitte (p1: 74 statt 21
     Einstellungen).
   - Ein ±3-Nachbartest fällt auf periodisches Ruckeln herein (Spitze alle 4 Bilder, p1 20,36–21,04 s je 0,09–0,13).
     Das gab einen Scheinschnitt, im Reel unsichtbar (Stärke 1,9).
   - **Regel jetzt:** relativ = ≥ 0,08, ≥ 6× Median (±12), ≥ 4× Maximum (±3) **und** ≥ 1,5× Maximum (±8). Damit
     bleibt p3 27,96 s erhalten (1,8×), p1 20,68 s (1,2×) und p4 4,72 s (≈ 1×) fallen raus.
   - Relativ erkannte Grenzen gelten als dieselbe Kamerafahrt: 0,4-s-Sprungregel, nur vorwärts.
2. **Farbgleicher harter Schnitt** (scene 0,088, Echo 0,0226): Das Fenster-Histogramm setzte die Grenze 4 Bilder zu früh.
   Deshalb wird an der scene-Spitze im ±0,4-s-Fenster verfeinert; die 6 Testgrenzen liegen auf 0,00 s genau.
3. **Fremdschrift in der Szene.** chi_sim liest die Spülmittel-Etiketten in p2 nicht: 0 Treffer in 22 Bildern.
   - Die Kanten-Heuristik schlägt dort an (67 %/25 % der Bilder), saubere Quellen liegen bei 0–14 %.
   - **Regel:** ≥ 20 % ohne Latein gilt als Verdacht.
   - Neu dazu: **Fremdpreise** ($12.99, ¥39,9, 49元, «50% OFF»). Ein einziger OCR-Treffer genügt. Gegenprobe:
     Preisschild «$3.99» und «¥39.9» in p1 werden jetzt per OCR gelesen (Grund «Fremdpreis»), vorher nur über Kanten.
4. **Layout und Band-Lage.**
   - 9:16 aus 3:4 (p1) verliert 19–21 % der Bildenergie; 9:16 aus 1:1 (p2) schneidet den runden Korb an.
   - **Regel (SETZUNG, n=4):** das schmalste Fenster mit ≤ 15 % Energie draussen (1:1 aus Querformat ≤ 25 %), höchstens
     2,7× vergrössert.
   - **Neu:** Das Band sitzt senkrecht dort, wo am wenigsten Produkt-Energie unter Kopfleiste, Hook, Infofeld und
     Plattform-Oberfläche liegt. Gewicht je Zeile = Deckkraft × Zeitanteil.
   - Verdeckte Energie p1/p2/p3: 25/21/8 % (fest auf y 820: 28/23/9 %).
5. **Rand an Schnitten.** 0,08 s je Seite liess von 1-s-Einstellungen 0,84 s übrig; 0,01/0,02 s genügen. Der Selbsttest
   prüft jedes Ausgabebild an einer Farbmarke: 0 Aufblitzer.
6. **Ton.** Die AAC-Kodierung hebt den True Peak unterschiedlich stark:
   - +0,6 dB bei hype2
   - +1,9 dB bei house2 ab 0,21 s: −0,63 dBTP im MP4 trotz Ziel −2,5
   - **Jetzt:** True Peak am fertigen MP4 messen. Liegt er über −1,5, wird der Ton neu gebaut (Limiter bei 192 kHz,
     AAC neu, Video per copy). Beim house2-Fall ergibt das −0,63 → −3,34 dBTP bei −14,34 → −14,47 LUFS.
7. **Beat-Phase.**
   - Tempo kommt aus CREDITS.txt, weil librosa sich irrt: hype2 161,5 statt ~146, liquid-dnb 87,6 statt 174, orchestra
     126 statt 88.
   - Die Phase wurde früher an librosa angeglichen. Bei house2 lag librosa selbst auf dem Offbeat, die Angleichung legte
     alle Schnitte zwischen die Kicks (0/14 im Fenster).
   - **Jetzt** entscheiden die Tiefton-Onsets (< 150 Hz) an Raster gegen Halbraster.
   - Alle 12 Stücke gemessen: Die mit klarem Kick liegen zu 100 % auf dem Raster (house1, house2, hype1–3), lounge-sax
     73 %, cinematic-house 61 %. Ohne klaren Kick bleibt der Kamm-Filter (liquid-dnb, hype-pro, orchestra, premium).
   - Schnittbild = letztes Bild auf oder vor dem Beat (abrunden). Gerundet lagen bei 25 fps 2/6 Schnitte +40/+45 ms
     hinter dem Kick.
8. **Loop-Naht.** Eine globale Referenz taugt nicht (blinkende LEDs, Zoom-Sprung 23,5 unter globalem p95 24,8). Referenz
   sind die Bildwechsel direkt um die Naht, und das nahtlose Ende bekommt nie einen Zoom.
9. **Intro-Zone.** Die Abwertung nur für den Hook genügte nicht: p3 zeigte das Auspacken als 2. Stück.
   - **Jetzt:** min(4 s, 12 %) ist für alle Stücke gesperrt, wenn der Rest für das Reel reicht (p1, p2, p3: ja).
10. **Wiederholung.** p3 zeigte dreimal «Tank aufsetzen», bei Quelle 9,8 s und 19,7 s.
    - Weder Zeit- noch Bildabstand erkennen das: 10 s auseinander, 64-px-MAD 29,0 bei Median 23,9 aller Paare ≥ 4 s.
    - **Regel:** Jede Einstellung kommt einmal vor. Hook und nahtloses Ende zählen als ein Auftritt.
    - Bei wenigen Einstellungen werden die Stücke länger (≤ 2,5 s). Eine Wiederholung gibt es nur, wenn das Reel
      sonst unter 8 s bliebe.
11. **Bildrate.** 25 → 30 fps verdoppelt jedes 5. Bild. Der Motor wählt jetzt 25 fps für 25/50-fps-Quellen:
    - p2: 16 % → 0 % Doppelbilder (Quelle 0 %)
    - p1: 36 % → 24 % (Quelle 25 %)
    - p3: 49 % → 36 % (Quelle 45 %)

### 3.2 Proben: neu gegen alt (gleiche Quelle, Musik, Einstieg, Titel; Preis live aus Shopify)

| Probe | Quelle (CJ, Shop ACTIVE) | alt: make_reel.sh | neu vor Prüfung | neu nach Nachbesserung |
|---|---|---|---|---|
| p1 | Hundegeschirr-Set, 720×960 (3:4), 26,0 s, CHF 19.90, hype2 | Band 435×580 (12 %), ab 0 s, erster Schnitt 1,96 s, 96 kHz mono, TP −0,81 | Band 1080×1440 auf y 100, 11,5 s, Scheinschnitt bei Bild 271 (unsichtbar), Hook-Kasten über dem Gesicht | Band 1080×1442 auf y 200–1642 (verdeckt 25 %), 25 fps, 11,48 s, 10 Stücke, 9/9 exakt, Stärke ≥ 2,8, −14,39/−1,93, Naht 0,45, Gesicht unter dem Hook-Kasten |
| p2 | Abtropfkorb, 960×960, 22,0 s, CHF 19.90, lounge-sax | Band 580×580 (16 %), chinesische Etiketten 7,2–9,0 s | 4:5, 11,8 s, Bild 0 ohne Produkt, 17 % Doppelbilder | 4:5 1080×1352 auf y 180–1532 (verdeckt 21 %), 9,84 s, 10 Stücke, jede Einstellung 1×, 9/9 exakt, Kick 9/9, −14,05/−3,02, 0 % Doppelbilder; Bild 0: Tisch, Korb fährt bei 0,2 s herein (vorher 0,33 s) |
| p3 | Trinkbrunnen, 960×540, 57,1 s, CHF 44.90, cinematic-house | Band 1000×562 (27 %), beginnt mit dem Karton | 1:1, Karton bei 1,0–3,4 s, E6 dreimal | 1:1 auf y 310–1390 (verdeckt 8 %), 11,80 s, 7 Stücke, **kein Karton**, **jede Einstellung 1×**, Stücke bis 2,0 s, 6/6 exakt, Kick 6/6, −14,04/−3,42, Naht 0,39 |
| p3r | wie p3, `--hook-ab 44 --sperren 0-4.6` | — | Hund als Hook, Bandkante kriecht 1359→1391 px, E14 dreimal | Hund als Hook (Bewegung 0,5: Regel verletzt, im Log als erzwungen), Bandkante bei Drift **1386 px konstant**, jede Einstellung 1×, 6/6 exakt, Naht 0,37 |
| p4 | Katzenklettergerüst, 552×960, **6,96 s, eine Kamerafahrt** | 11 s `-stream_loop`, 0 Schnitte | 5,8 s, 4 umgestellte Teile («Ruckler»), kein CTA | **Exit 3**: «eine einzige Kamerafahrt mit nur 6,9 s sauberem Material (< 8 s)» → nächster Clip |

Bildjury-Punkte vor der Nachbesserung (8 Kriterien × 0–5): alt 71, neu 116 (p1 32, p2 30, p3 29, p4 25; p3r 32).
Nach der Nachbesserung hat keine neue Jury bewertet; die Kontaktbögen `kb_pN_neu.jpg` habe ich selbst angesehen.

Grenzfälle der Technik-Prüfung, neu gelaufen (`nach/gf/*.lauf.json`, CLI mit `--kein-cache`):
- **Exit 3 «nicht dekodierbar»** (vorher Exit 1): 0 Byte, Zufallsbytes, moov fehlt, nur Ton.
- **Abgebrochener Faststart:** Dauer = dekodierbar 13,73 s (Kopfzeile 26,04). Reel 8,2 s, 205/205 Bilder, Tor ok.
  Vorher: 234/345 Bilder bei Exit 0.
- **Stativ-Einstellung:** 0 Logos, 3 statische Kanten als «ruhige Quelle» verworfen, Reel 9,8 s, Tor ok. Vorher: Exit 3
  wegen «Logo».
- **Musik ausserhalb automation/music:** Exit 1, auch die 5-s-Musik und die Musik ohne Eintrag.
- **Kurze Quellen:** 4 s, 6,5 s und reines Standbild ergeben Exit 3.
- **Text- und Preisquellen:** text_voll, x3, preis_mitte und preis_yuan ergeben Exit 3 (Preise jetzt als «Fremdpreis»);
  text_unten, x1 und x2 ergeben Exit 0 mit Tor ok.
- **house2** (x1, quer_1080p): Schnitte −35 bis −65 ms vor dem Kick, 8/8 und 5/5 im Fenster (vorher 0/14).

Laufzeit mit `-threads 2`, ohne Cache (Wandzeit, GEMESSEN):
- x1 77 s (vorher 89 s; 53,7-s-Quelle mit 12 Text-Einstellungen)
- text_unten 70 s, quer_1080p 41 s, ohne_ton 41 s, x2 34 s
- Mit Analyse-Cache: 21–27 s je Probe
- Empfehlung für den Motor: timeout ≥ 180 s

## 4. Was gebaut wurde

| Datei | Inhalt |
|---|---|
| `automation/reel/schnitt.py` | `analyse()` · `plan()` · `render()` · `pruefen()` (Tor) · `kontaktbogen()` · CLI (`--analyse/--plan/--render/--kontaktbogen/--tessdata-holen/--dry`, `--sperren`, `--hook-ab`, `--zone meta`, `--arbeitsordner`), Exit 0/1/3/4, Entscheidungslog, Schnittstelle für `cj_video_reel_engine.mjs` im Dateikopf |
| `automation/reel/schnitt_test.py` | 59 Prüfungen an synthetischen Quellen (Grenzen, OCR liest wirklich, OCR-Ausfall, Schwarz, Standbild, Fremdtext, Fremdpreis, Aufblitzen, Beat auf dem Kick, Scheinschnitt durch Ruckeln, Takt, Tor, Rückfälle inkl. Kamerafahrt, 0-Byte, abgeschnittene Datei, Stativ, Querformat gerendert, Musikfehler, True-Peak-Nachregelung) |
| `.claude/skills/videoschnitt/SKILL.md` | Regeln mit Marken, Aufruf, Rezepte, 19 Fallen, Prüfschritte vor dem Posten |
| `dropship/VIDEOSCHNITT-LERNEN.md` | dieser Bericht |

## 5. Proben-Pfade (Scratchpad, nicht im Repo)

`/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/schnitt/`
- Proben neu: `proben/p1_neu.mp4`, `p2_neu.mp4`, `p3_neu.mp4`, `p3r_neu.mp4` (p4: Exit 3, `p4_neu_erg.json`)
- Proben vor der Nachbesserung: `proben/vor_nachbesserung/`; alt: `proben/pN_alt.mp4`
- Kontaktbögen: `proben/kb_pN_neu.jpg`, `kb_pN_alt.jpg`, Quellbögen `kb_p1/p3/p4_quelle.jpg`
- Entscheidungslogs: `proben/pN_neu_log.json` (Analyse + Plan + Prüfung)
- Nachbesserung: `nach/` (Grenzfälle `gf/`, Selbsttest-Log `selbsttest.log`, Messskripte `kickphase.py`,
  `kick_fps.py`, `nachmessen.py`, `statanteil.py`, `tp_probe.py`, Originale `schnitt_vorher.py`/`schnitt_test_vorher.py`)
- Prüfberichte: `jury/`, `technik/`

## 6. Offene Punkte

1. **Reel-Motor umstellen** (`cj_video_reel_engine.mjs`, gehört einem anderen Workflow):
   - Aufruf `schnitt.py --render … --arbeitsordner … --json` mit `SCHNITT_TESSDATA`; vorher einmal
     `--tessdata-holen /tmp/schnitt_tessdata`
   - Exit 3: nächster Clip; Exit 4: Ledger «schnitt-pruefung»; timeout ≥ 180 s
   - Eine **eigene Hook-Funktion** (Produktwort + Nutzen, ≤ 24 Zeichen), denn die heutigen HOOKS sind generisch und bis
     36 Zeichen lang (Bild 0 > 40 Zeichen ergibt Exit 1)
2. **Produkt auf Bild 0 und «Anwendung» als Hook** sind automatisch nicht gelöst (p2: Korb erst ab 0,2 s; p3: Montage
   statt «Hund trinkt»). Kandidat ist ein Vision-Check des Hook-Bildes; bis dahin Sichtprüfung und `--hook-ab`.
3. **Szenentext ohne Buchstaben** (Klappkalender «10» in p2) und chinesischer Szenentext bleiben der Sichtprüfung
   überlassen.
4. **Kick nur auf jedem 2. Schlag** (hype1–3): Bei p1 liegen 5/9 Schnitte auf einem Kick, die übrigen auf Schlägen
   dazwischen (Hi-Hat 8/9). Ob Stücke auf ganze Kick-Paare (0,82/1,64 s) die Sehdauer heben, ist ein A/B.
5. **Unsichtbare Schnitte** nach dem ersten (Stärke < 2,5) werden nur gemeldet: text_unten 1 von 9 (2,2). Das Tor greift
   nur beim ersten Schnitt, sonst würden ähnliche echte Einstellungen ganze Reels kosten.
6. **Eigenleistung (Meta 03/2026):** Der Schnitt allein ist keine Originalität; eine Fakten-Ebene fehlt noch (Masse,
   Material, Schritte 1-2-3).
7. **Wirkung messen:** A/B mit je 10 Reels neu gegen alt, **gleicher Hook-Text in beiden Armen** (die Proben nutzen den
   Produktnamen alt wie neu; sonst misst man den Text). Nach 48 h TikTok `averageTimeWatched` (Ziel > 3 s = SETZUNG) und
   IG `ig_reels_avg_watch_time`.
8. **Schwellen sind Setzungen** (Layout 15/25 %, Schrift-Verdacht 20 %, Sprung-Verdacht 0,12, ruhige Quelle 0,15,
   Schnittstärke 2,5, Kamerafahrt 8 s, Intro min(4 s, 12 %)). Nach 20–30 echten Läufen die Entscheidungslogs auswerten.
9. `luxe-liquid-dnb-electronic.wav` fehlt in CREDITS.txt. Der Motor lässt das Stück über die Rückfall-Tabelle zu und
   schreibt einen Lizenzhinweis ins Log; die Zeile muss der Betreiber-Workflow nachtragen, denn CREDITS.txt wurde hier
   nicht geändert.
10. **Speicher:** Die neuen Reels sind 3,2–4,8 MB gross (CRF 23, alt 3,4 MB). Die Ablage im Repo `social/reels/` wächst
    je Neu-Rendern.

## 7. Prüfung und Nachbesserung (23.09.2026)

Drei Prüfer haben geprüft:
- **Bildjury:** Kontaktbögen, eigene Messskripte; Urteil «besser» mit 71 → 116 Punkten
- **Technik:** Grenzfälle, Kick-Messung am Ausgabeton; 1 hoher, 5 mittlere Befunde
- **Code:** statisch; 1 hoher, 6 mittlere Befunde

Jeden Befund habe ich zuerst selbst nachgemessen, dann behoben und am Ergebnis belegt. Selbsttest danach 59/59.

### 7.1 Hoch

| # | Befund (Prüfer) | Nachgeprüft | Massnahme | Nachweis (GEMESSEN) |
|---|---|---|---|---|
| H1 | Automatischer p3 zeigt Karton bei 1,0–3,4 s; die Intro-Zone schützte nur den Hook (Jury) | ja, Plan-Log E0/E1 bei 0,21–2,75 s | Intro min(4 s, 12 %) für alle Stücke gesperrt, wenn der Rest reicht; sonst nur Hook-Abwertung (Log) | p3 neu: kein Stück < 4,0 s, Kontaktbogen ohne Karton; p1/p2 ebenfalls gesperrt |
| H2 | Exit 0/ok trotz eigener Fehlmessung, abgeschnittene Quelle → 7,8-s-Reel ohne CTA (Technik) + Render meldet ok unabhängig von der Prüfung (Code) | ja, Code: `main()` wertete `pruefung` nie aus | (a) Analyse-Dauer = dekodierbare Bilder; (b) Tor in `pruefen()`: Format, Codec, Bildzahl, Versatz ±1, erster Schnitt sichtbar, −14 ±1 LUFS, TP ≤ −1,5, Naht, Zone; Verstoss → Datei weg, Exit 4 | abgebrochen_faststart: dekodiert 13,73 s statt Kopf 26,04, 205/205 Bilder, Tor ok; Selbsttest: manipulierter Plan (Bildzahl +10) → `ok=False` |
| H3 | OCR-Fehler werden verschluckt, Fremdtext-Filter fällt still auf Heuristik zurück (Code) | ja: `S.ocr(g,'xyz')` → `[]`; ohne tesseract-Binary still leer | `ocr()` gibt `None` + Zähler zurück; jeder eng-Aufruf gescheitert → RuntimeError (Exit 1); `ocr.eng` nur bei Erfolg; tessdata-Pfad per `shlex.quote` | ohne Binary: «OCR (eng) faellt bei jedem Aufruf aus: TesseractNotFoundError»; Pfad mit Leerzeichen liest «Everybody needs»; Selbsttest prüft, dass «lateinische Woerter» wirklich gelesen wurden |

### 7.2 Mittel

| # | Befund (Prüfer) | Nachgeprüft | Massnahme | Nachweis (GEMESSEN) |
|---|---|---|---|---|
| M1 | Drift-Zoom skaliert das ganze Komposit, Bandkante kriecht 1359→1391 px (Jury) | ja, Filtergraph: zoompan nach overlay | zoompan nur auf dem Fenster (2× hochskaliert, Bandgrösse), dann overlay | p3r Hook mit Drift: Bandunterkante 1386/1386/1386/1386 px (Bild 0/10/20/letztes) |
| M2 | p4: kein CTA, Titel/Preis erst ab 2,9 s (Jury) | ja, cta [5,806; 5,806] | kurzes Reel (< 5 s nach dem Hook): Infofeld-Variante mit «Link in Bio · luxestyle.ch» statt Fusszeile | Selbsttest: kurzes Reel `info_variante='cta'`; p1–p3r mit eigenem CTA-Block ≥ 1,48 s |
| M3 | p4: Sprungschnitte innerhalb einer Kamerafahrt, hätte Exit 3 sein sollen (Jury) | ja, p4 = eine Fahrt, Grenze bei 4,72 s war Scheinschnitt | Kamerafahrt-Ketten; eine Fahrt < 8 s → Exit 3; ≥ 8 s → nur vorwärts, einmal zurück | p4 → Exit 3 (6,9 s); Selbsttest 10-s-Fahrt: 0 Rücksprünge in der Mitte; eine_einstellung (12 s): vorwärts, Tor ok |
| M4 | Infobalken liegt über dem Produkt; «Produktfläche» ignoriert Überdeckung (Jury) | ja, Band fest auf y 820 | Band-Lage nach verdeckter Energie (Deckkraft × Zeitanteil); Kennzahlen `energie_unverdeckt`, `videoflaeche`; Bericht sagt «Videofläche» | verdeckt p1 25 % (fest: 28 %), p2 21 % (23 %), p3 8 % (9 %); **teilweise**: ein 3:4-Band (1442 px) passt nicht in die freie Zone 480–1170 |
| M5 | p2: Bild 0 ohne Produkt (Wischbewegung als «stärkste Stelle») (Jury) | ja, Quelle 9,64–9,80 s leerer Tisch | Hook-Abwertung: Bewegung > 12 (Wisch), Spitze in den ersten 0,2 s, unscharfes erstes Bild, erste 0,25 s nach einem Schnitt | Hook 9,65 → 9,78 s, Korb ab 0,2 s statt 0,33 s im Bild; **teilweise** — Produkt-Erkennung fehlt (§6.2) |
| M6 | Dieselbe Einstellung mehrfach (p3 E6 dreimal, p3r E4/E14) (Jury) | ja; dazu gemessen, dass weder Zeit- noch Bildabstand die Wiederholung erkennen (29,0 vs. Median 23,9) | jede Einstellung einmal (Hook + nahtloses Ende = 1); wenige Einstellungen → längere Stücke ≤ 2,5 s; Wiederholung nur, wenn das Reel sonst < 8 s bliebe | p1, p2, p3, p3r: `einstellung_max_auftritte` = 1, `einstellungen_wiederholt` = [] |
| M7 | luxe-house2: alle Schnitte auf dem Offbeat (Technik) | ja, 12 Stücke: house2 mit librosa-Angleichung Kick 0 %/100 % Halbraster | Phase nach Tiefton-Onsets (< 150 Hz) an Raster/Halbraster (umlegen ab 1,3×), keine librosa-Angleichung; Schnittbild abrunden | house2 Kick 100 % auf dem Raster; x1 8/8, quer_1080p 5/5 im Fenster (vorher 0/14); Selbsttest: Kick + lautere Offbeat-Hi-Hat → Raster auf dem Kick |
| M8 | True Peak −0,63 dBTP nach AAC wird durchgelassen (Technik) | ja, nachgebaut: −14,34 LUFS / −0,63 dBTP | TP am MP4 messen, bei > −1,5 Limiter @192 kHz + AAC neu (Video copy), bis 3 Runden; Tor | −0,63 → −3,34 dBTP, −14,47 LUFS (Selbsttest-Fall) |
| M9 | Scheinschnitte durch periodisches Ruckeln → unsichtbare Schnitte, die `pruefen()` als exakt meldet (Technik) | ja, p1 Bild 271 Stärke 1,9 | ±8-Nachbartest (≥ 1,5×), Kamerafahrt-Regel, `schnitt_staerke` je Schnitt im Ergebnis, erster Schnitt < 2,5 → Tor; Versatz mit Gleichstand-Toleranz | p1: Scheinschnitt weg (21 statt 22 Einstellungen), alle Schnitte der 4 Proben Stärke ≥ 2,8; Selbsttest: Ruckel-Muster → kein Schnitt |
| M10 | Stativ-Clip mit einer Einstellung als «Logo» verworfen (Technik) | ja, Anteil ruhiger Pixel 0,499 gegen 0,000–0,022 bei Mehr-Einstellungs-Quellen | ruhige Quelle (> 0,15): statische Box nur mit OCR, Schrift-Kanten oder in einer Ecke | eine_einstellung: 0 Logos, 3 verworfen, Reel Tor ok; Selbsttest-Stativ: 0 Logos |
| M11 | Musik ohne Eintrag: falsches Tempo, kein Tor auf Beat-Güte, irreführendes Log (Technik) | ja | Pfad muss in automation/music liegen, Name in CREDITS (ORIGINAL) oder Rückfall-Tabelle (mit Lizenzhinweis); ohne Tempo und Rastergüte < 60 % → Exit 1; Log nennt die echte Einstiegsquelle | musik_ohne_eintrag / musik_5s → Exit 1 vor der Analyse; Selbsttest: fremder Pfad → MusikFehler |
| M12 | CJK-OCR fehlt im Motorbetrieb; Cache ignoriert die OCR-Konfiguration (Code) | ja, Fingerabdruck ohne OCR | Fingerabdruck mit `ocr`/`cjk`; `--tessdata-holen`; Log «CJK-OCR aus» und `pruefung.cjk_ocr`; Schnittstelle setzt `SCHNITT_TESSDATA` | `--tessdata-holen` lädt 2'469'156 Byte (identisch mit der Labor-Datei), zweiter Aufruf ohne Download |
| M13 | Hook-Länge: Schnittstelle verspricht ≤ 24, Motor liefert bis 36 Zeichen (Code) | ja, HOOKS bis 36 | Bild 0 > 40 Zeichen → Exit 1; > 24 → Hinweis im Log; Schnittstellen-Text korrigiert (eigene Hook-Funktion nötig) | CLI-Prüfung vor dem Plan |
| M14 | Fremdpreise und kurzer Fremdtext nicht erkannt (Code) | ja, Regex-Lücke | Preis-Muster (Währungszeichen, Codes, 元/円, «% OFF» über Nachbarwort), Kana/Hangul | Selbsttest: 3/3 Preisformen, «$12.99» per echter OCR; preis_mitte/preis_yuan → «Fremdpreis» |
| M15 | Rest-Verlängerung greift wegen Rundung fast nie, Schläge kein Vielfaches von 4 (Code) | ja, `t` ungerundet vs. `_r(t)`, 1e-6-Vergleich | `benutzt` gerundet, Toleranz 1e-3; ganze Takte: erst verlängern (1–2 Schläge), sonst kürzen, sonst ein Mittelstück weglassen | alle 4 Proben `takt_ok`; Selbsttest «ganze Takte» |
| M16 | `-threads 2` wirkt nur auf den ersten Eingang (Code) | ja, `ffmpeg -h full`: AVCodecContext-Option | `-threads` vor jedem `-i` und vor der Ausgabe; `-filter_threads` in Analyse-Graphen | Code |

### 7.3 Niedrig (erledigt, wo billig)

- **25→30 fps Doppelbilder** (Jury): Der Plan nimmt 25 fps bei 25/50-fps-Quellen. p2 hat damit 0 % statt 16 % Doppelbilder.
- **Nicht lesbare Quelle Exit 1 statt 3** (Technik): jetzt Exit 3 «nicht dekodierbar».
- **Zu kurze Musik beschuldigt die Quelle** (Technik): jetzt Exit 1 (MusikFehler).
- **Tautologische Tests** (Technik/Code):
  - Die Überlappung wird aus den Stücken nachgerechnet.
  - Das Querformat wird gerendert.
  - Der Beat wird an einer Kick/Hi-Hat-Spur geprüft.
  - Die Raster-Prüfung heisst ehrlich «Plan».
- **Laufzeit x1 89 s** (Technik): Der Textfenster-Nachweis nimmt 3–10 Proben über die ganze Einstellung. x1 braucht jetzt
  77 s. Empfehlung timeout ≥ 180 s.
- **Textfenster-Nachweis nur 8 s und ohne Mindestproben** (Code): jetzt über die ganze Einstellung, mindestens 3 gelesene
  Proben.
- **SKILL/Kopf/Code-Widersprüche** (Code):
  - TP-Angabe angeglichen.
  - «nie Quellsekunde 0» heisst jetzt «nie im Quell-Intro».
  - Stücke 0,6–2,5 s.
  - Zuschnitt-Anteil wird berechnet.
  - Reels liegen in `social/reels`, Logs nicht im Repo.
  - `fuss_rechts` 930.
  - Die Band-Lage folgt aus Zone und Energie.
- **Neben-Dateien** (Code): `--arbeitsordner` für Analyse-Cache, Beat-Cache, Temp und Log; `hashlib` entfernt.
- **Musik nur per Namensliste** (Code): Pfad- und CREDITS-Prüfung.
- **Einstieg-Log irreführend** (Code): Das Log nennt jetzt die echte Quelle; kaputtes `_einstiege.json` ergibt einen
  Fehler.
- **Standbild beginnt ein Abtastbild zu spät** (Code): Der Lauf wird vorgezogen. Selbsttest: Einfrieren beginnt ≤ 3,65 s.
- **Zahlen ohne URL, falsche Marken** (Code):
  - Meta-URL vollständig.
  - TikTok-Blog 2021 als BEHAUPTUNG (ohne URL).
  - Schwellen als SETZUNG.
  - «Videofläche» statt «Produktfläche».
- **`movie=` im Test** (Code): Das Text-PNG ist ein eigener Eingang.
- **Tonvorteil kleiner als berichtet** (Jury): §1 nennt nur Samplerate, Stereo und True Peak.
- **Hook-Text identisch zu alt** (Jury): Das ist für einen fairen Vergleich gewollt. Im A/B gilt der gleiche Hook-Text in
  beiden Armen (§6.7).
- **Hook-Balken über dem Gesicht** (Jury, p1): Die Band-Lage rechnet Kopfleiste und Hook mit. p1 zeigt das Gesicht jetzt
  unter dem Hook-Kasten (Kontaktbogen).

### 7.4 Nicht oder nur teilweise umgesetzt (mit Grund)

- **p3r: Hook verletzt die eigene Bewegungsregel, Produkt am Bildrand** (Jury, niedrig).
  - Umgesetzt: Die Regelverletzung steht jetzt im Log (`hook_bewegung_ok=false`, «per --hook-ab erzwungen»).
  - Offen: Ein Fenster auf «Produkt + Tier» bräuchte Objekterkennung.
- **Szenentext ohne Buchstaben** (Technik, niedrig): Ziffern ohne Währung bleiben für die Automatik unsichtbar. Die
  Sichtprüfung bleibt Pflicht (Skill, Prüfschritt 2).
- **Hook > 24 Zeichen als Fehler** (Code-Vorschlag):
  - Umgesetzt: Hart geprüft wird die gemessene Regel «Bild 0 ≤ 40 Zeichen».
  - Offen: 24 Zeichen ist eine SETZUNG und bleibt ein Hinweis.
- **Unsichtbare Schnitte nach dem ersten ins Tor** (Technik-Vorschlag):
  - Umgesetzt: Sie werden gemeldet.
  - Offen: Ins Tor kommen sie nicht, denn echte Schnitte zwischen ähnlichen Einstellungen würden sonst ganze Reels
    verwerfen (text_unten: 1 von 9 mit Stärke 2,2).
