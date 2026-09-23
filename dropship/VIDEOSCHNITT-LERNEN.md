# Videoschnitt lernen — Bericht (23.09.2026)

Betreiber: «lerne videos zu schneiden und sachen zu brauchen». Grundlage waren vier Lernberichte (Handwerk/Quellen, Labor
an 30 CJ-Quellen, Material-Inventur, Schnitt-Kritik an 61 Bestands-Reels). Daraus ist ein Schnitt-Motor mit Selbsttest
und Skill entstanden, geprüft an 4 echten CJ-Quellen gegen den heutigen Weg (`make_reel.sh`).
Marken: **GEMESSEN** = hier selbst geprüft (Befehl/Zahl), **QUELLE** = fremde Angabe mit URL, **BEHAUPTUNG** = ungeprüft.
Vorrang bei Widerspruch: GEMESSEN vor QUELLE vor BEHAUPTUNG.

## 1. Kurzfassung

- **Gebaut:** `automation/reel/schnitt.py`. Er analysiert (Einstellungen, Bewegung, Schärfe, Fremdtext, Schwarz- und
  Standbild-Strecken, Balken), plant (Hook zuerst, Beat-Raster, Layout, Loop-Ende, Text-Takt) und rendert (1080×1920,
  30 fps, −14 LUFS). Jede Entscheidung steht mit Grund im Entscheidungslog.
- **Selbsttest:** `automation/reel/schnitt_test.py` besteht **38/38** in 48 s, ohne Netz.
- **Proben:** 4 CJ-Quellen, jeweils neu gegen alt gerendert. Die neuen Fassungen erfüllen alle diese Werte:
  - alle Schnitte **0 Bilder** neben dem Plan und damit auf dem Beat
  - −14,0 bis −14,4 LUFS, True Peak ≤ −1,9 dBTP
  - Loop-Naht nahtlos
  - Produktfläche 56–100 % statt 9–27 %
  - erster Wechsel nach 0,97–1,23 s statt 1,0–1,96 s bzw. nie
- **Grenze:** Chinesischen Text auf Verpackungen im Bild liest keine OCR (0 Treffer). Die Kontaktbogen-Sichtprüfung vor dem
  Posten bleibt deshalb Pflicht. Der Motor hat dafür die Rückgriffe `--sperren` und `--hook-ab`.
- **Nicht angefasst:** Den Reel-Motor habe ich nicht umgestellt. Die Schnittstelle ist dokumentiert
  (Kopf von `schnitt.py`, Skill `videoschnitt`).

## 2. Was gelernt wurde (aus den vier Berichten, verdichtet)

| Befund | Marke | Folge für den Schnitt |
|---|---|---|
| TikTok-Sehdauer im Median 1,37 s (68 Videos), unabhängig von der Länge (ρ 0,18, p 0,15); IG im Median 2,69 s | GEMESSEN (Metricool/IG-Dump) | Die ersten 1,5 s entscheiden. Organisch 9–12 s |
| `make_reel.sh` liest START nie; jede Quelle beginnt bei 0 s (Karton, Titelkarte, Schwarz). 13–15 von 56–61 Reels sind in Sekunde 0–1 fast ein Standbild | GEMESSEN | Hook = stärkste Stelle, nie Quellsekunde 0 |
| 580-px-Band: Produkt auf 9,1 % (9:16), 12,2 % (3:4), 16,2 % (1:1) und 27,1 % (16:9) der Fläche | GEMESSEN | Vollbild oder volle Breite |
| Erste Einstellung im Median 3,96 s; Schnitte zu 17 % auf dem Beat (Zufall 24 %) | GEMESSEN | Beat-Raster, erster Wechsel ≤ 1,3 s |
| Auf Bild 0 im Median 137 Zeichen (8,1 s Lesezeit bei 17 Z/s) | GEMESSEN | Bild 0 nur Marke + Hook, Rest gestaffelt |
| 16/58 Reels mit englischem Lieferantentext; ein Creator-Video mit Handle-Wasserzeichen in der Warteschlange | GEMESSEN | OCR je 1 s; Einstellung verwerfen oder textfrei zuschneiden |
| 56/61 Reels mit bitgleichem Tonbett (v1-Stücke ab 0 s) | GEMESSEN | Abwechslung über `musikWahl`, Einstieg auf dem Beat |
| 3/61 Reels mit sichtbarem Neustart durch `-stream_loop` | GEMESSEN | Keine Stelle zweimal; kurze Quelle ergibt ein kürzeres Reel |
| Meta 13.03.2026: Aneinanderreihen, Untertitel und Tempo ändern gelten nicht als Eigenleistung | QUELLE (about.fb.com/news/2026/03/…) | Schnitt hebt die Sehdauer, nicht die Originalität, dafür braucht es Fakten-Grafik |
| 9:16 statt Letterbox +91 % Conversion; 21–34 s +280 % (Anzeigen) | QUELLE (TikTok-Blog 2021) | Vollbild ja; Länge nur im Ads-Test |
| Punch-in, Pattern-Interrupt alle 2–3 s | BEHAUPTUNG (Creator-Blogs) | Sparsam: ≤ 1 je 3 s, nur an Sprungschnitten |

## 3. Was hier gemessen wurde (Bau und Proben, 23.09.2026 20:20–23:30 UTC)

### 3.1 Detektoren (Fehler, die erst an echten Quellen sichtbar wurden)
1. **Schnitt-Erkennung.** `scene ≥ 0,2` (Labor 26/28, 0 Fehlalarme) übersieht Wechsel zwischen ähnlichen Blickwinkeln:
   p3 bei 9,16 s hat den Wert 0,167, die Nachbarn liegen bei 0,02.
   - Folge: Der Hook landete genau auf dem Sprung, denn der Sprung zählte als «Bewegung». Das nahtlose Loop-Ende lag
     hinter einem Kamerawechsel (Naht-MAD 46,8 bei Median 2,6).
   - Ein reiner Median-Test (≥ 6× Umgebung) erzeugt bei Quellen mit doppelten Bildern Scheinschnitte: p1 hatte damit
     74 statt 21 Einstellungen, p4 (eine einzige Kamerafahrt) 7 Schnitte.
   - **Lösung:** relativer Test nur zusammen mit einem Nachbar-Test (±3 Bilder); Sprung-Verdacht (0,12–0,2) sperrt den
     Hook-Start; die Bewegung wird als getrimmtes Mittel gemessen, nicht als Median. Der Median fällt bei doppelten
     Bildern auf etwa 0.
2. **Farbgleicher harter Schnitt** (Selbsttest: gleiche Quelle, Farbe gedreht und gespiegelt). Er hat `scene` 0,088, das
   Echo-Bild danach 0,0226. Nur das Fenster-Histogramm sah ihn, und das setzte die Grenze 4 Bilder zu früh. **Lösung:**
   Histogramm-Grenzen werden an der scene-Spitze im ±0,4-s-Fenster verfeinert (Echo k+1 ausgenommen). Danach lagen alle
   6 Testgrenzen auf 0,00 s genau.
3. **Fremdschrift in der Szene.** Die chinesischen Spülmittel-Etiketten in p2 findet chi_sim nicht (conf ≥ 85, auch 2× vergrössert:
   0 Treffer in 22 Bildern). Die Kanten-Heuristik schlägt dort an (Einstellung 7: 67 %, Einstellung 8: 25 % der
   Bilder); saubere Quellen liegen bei 0–14 %. **Regel:** Textzeilen in ≥ 20 % der Bilder ohne lesbares Latein gelten
   als Verdacht. Den Kühlschrank mit Joghurt-Marke (20,7 s) fand nur das Auge (Kontaktbogen), dafür gibt es `--sperren`.
4. **Layout.** Ein Diagnosebogen (Fenster auf den Mittelbildern aller Einstellungen) zeigte:
   - 9:16 aus 3:4 (p1) lässt 19–21 % der Bildenergie draussen und schneidet den Hund an.
   - 9:16 aus 1:1 (p2) schneidet den runden Korb in jeder Einstellung an (36 % draussen).
   - **Regel:** Genommen wird das schmalste Fenster mit ≤ 15 % Energie draussen (1:1 aus Querformat: ≤ 25 %) bei
     höchstens 2,7-facher Vergrösserung, sonst volle Breite.
   - Ein 3:4-Clip in voller Breite (1080×1440 ab y 100) füllt die sichtbare Zone 200–1440 trotzdem ganz aus.
5. **Rand an Schnitten.** Mit 0,08 s Rand je Seite blieben von 1-s-Einstellungen 0,84 s übrig. Kein 2-Schlag-Stück
   (0,98 s) passte, p2 schrumpfte auf 5,9 s. Mit 0,01/0,02 s Rand wird das Reel 11,8 s lang. Der Selbsttest prüft jedes
   Ausgabebild an einer Farbmarke gegen die geplante Einstellung: 0 Aufblitzer.
6. **Ton.** Die AAC-Kodierung hebt den True Peak um etwa 0,6 dB (Ziel −1,5 ergab −1,33 im MP4; Ziel −2,5 ergibt −1,93).
   Deshalb liegt das Ziel bei −2,5.
7. **Beat-Phase.** Der Kamm-Filter traf bei `luxe-house2` die offenen Hi-Hats: nur 31 % der librosa-Beats lagen auf dem
   Raster. Die Phase richtet sich jetzt nach librosa, danach waren es 66 %.
   - Tempo aus CREDITS.txt: librosa verschätzt sich bei hype2 (161,5 statt ~146), liquid-dnb (87,6 statt 174) und
     orchestra (126 statt 88).
   - Gut: 10 der 12 Stücke haben ≥ 90 % der librosa-Beats auf dem Raster.
   - Nicht belastbar: orchestra (14 %, kein klarer Schlag) und house2 (66 %, librosa selbst wechselt die Phase).
8. **Loop-Naht.** Eine globale Referenz taugt nicht:
   - Blinkende LEDs (p4) machen schon benachbarte Quellbilder um 15,9 verschieden.
   - Ein Zoom-Sprung (p3r, Drift auf Hook und Ende) ergab 23,5, das lag noch unter dem globalen p95 von 24,8.
   - **Lösung:** Referenz sind die Bildwechsel direkt um die Naht. Das nahtlose Ende bekommt nie einen Zoom.
   - p3r danach: Naht 0,39 bei Referenz 3,73.

### 3.2 Proben: neu gegen alt (gleiche Quelle, gleiche Musik und gleicher Einstieg, gleicher Titel, Preis live aus Shopify)

| Probe | Quelle (CJ, Shop ACTIVE) | alt: make_reel.sh | neu: schnitt.py |
|---|---|---|---|
| p1 | Hundegeschirr-Set, 720×960 (3:4), 26,0 s, 22 Einst., CHF 19.90, hype2 | Band 435×580 (12 % Fläche), ab 0 s, erster Schnitt 1,96 s, 6 Schnitte, 96 kHz mono, −15,1 LUFS, **TP −0,81** | volle Breite 1080×1440 (75 %), Hook bei Quelle 17,0 s, 11 Stücke, Median 1,23 s, Schnitte 10/10 exakt, −14,4 LUFS/−1,93 TP, nahtlos (0,47) |
| p2 | Abtropfkorb mit Deckel, 960×960, 22,0 s, 22 Einst., CHF 19.90, lounge-sax | Band 580×580 (16 %), 11 Schnitte aus der Quelle, zeigt die chinesischen Spülmittel-Etiketten | 4:5-Ausschnitt 1080×1350 (70 %), Einstellungen 7/8 (Etiketten) automatisch raus, 12 Stücke à 0,98 s, 11/11 exakt, −14,0/−2,87, Überblendung |
| p3 | Trinkbrunnen 1,5 L, 960×540, 57,1 s, 15 Einst., CHF 44.90, cinematic-house | Band 1000×562 (27 %), **beginnt mit dem Karton**, 8 Schnitte | automatisch: 1:1 1080×1080 (56 %), Hook = Montage bei 19,2 s, 9 Stücke, 8/8 exakt; **nach Sichtprüfung (p3r):** `--hook-ab 44 --sperren 0-4.6` → Hund am Brunnen zuerst, kein Karton, nahtlos (0,39) |
| p4 | Katzenklettergerüst, 552×960, **6,96 s, eine Kamerafahrt**, CHF 20.90, house1 | 11 s mit `-stream_loop` (Quelle läuft 1,6× durch), **0 Schnitte**, TP −1,4 | Vollbild 9:16 (100 %), 5,8 s ohne Wiederholung, 4 umgestellte Stücke (jeder Schnitt springt ≥ 0,4 s), 3/3 exakt, nahtlos (16,2 bei Referenz 17,4 = LED-Blinken) |

Sonderfälle (nur Plan):
- **x1:** Abtropfkorb-Clip _0, 53,7 s, mit englischen Untertiteln. Diesen Clip wählt der Motor heute («grösster Clip»).
  - 9 Einstellungen werden über einen textfreien Ausschnitt gerettet (Zoom 1,25–1,39×), jeweils per OCR und Heuristik
    auf dem Ausschnitt nachgewiesen.
  - 2 Einstellungen werden verworfen (Heuristik im Fenster), 38 s bleiben nutzbar.
- **x3:** Akupressurmatte mit Heilzusage im Bild → Exit 3: `UNGEEIGNET: kein sauberes Material (Fremdtext: 18
  lateinische Woerter (blood, circulation, …))`.
- **x2:** Sternen-Projektor, dunkel. Die Sternpunkte lösen bei 4 Einstellungen den Schrift-Verdacht aus. Das ist
  konservativ, am Kontaktbogen zu prüfen.

Laufzeit mit `-threads 2`:
- Analyse 4–40 s (davon OCR 3–24 s), einmalig, danach Cache.
- Plan ~1–5 s (librosa-JIT beim ersten Aufruf).
- Render 10–26 s für 6–12 s Reel. Zum Vergleich: `make_reel.sh` braucht 13 s.

## 4. Was gebaut wurde

| Datei | Inhalt |
|---|---|
| `automation/reel/schnitt.py` | `analyse()` · `plan()` · `render()` · `kontaktbogen()` · CLI (`--analyse/--plan/--render/--kontaktbogen/--dry`, `--sperren`, `--hook-ab`, `--zone meta`), Exit 0/3/1, Entscheidungslog `<out>.schnitt.json`, Schnittstelle für `cj_video_reel_engine.mjs` im Dateikopf |
| `automation/reel/schnitt_test.py` | 38 Prüfungen an synthetischen Quellen (Grenzen, Schwarz, Standbild, Fremdtext, Aufblitzen, Beat, Dauer, Auflösung, Lautheit, Rückfälle, Klickspur, sichere Zone) |
| `.claude/skills/videoschnitt/SKILL.md` | Regeln mit Marken, Aufruf, Rezepte, Fallen, Prüfschritte vor dem Posten |
| `dropship/VIDEOSCHNITT-LERNEN.md` | dieser Bericht |

Kernentscheidungen des Motors: Hook = stärkstes Fenster, bewertet nach getrimmter Bewegung, Schärfe und Helligkeit, mit
Bonus für Material davor (nahtloses Ende). Stücklängen folgen dem Beat-Raster: erster Wechsel ≤ 1,3 s, Basis ≈ 1,4 s,
Standbild-Dias ≤ 1,0 s. Die Reihenfolge folgt der Quelle, gute Einstellungen zuerst, nie zweimal dieselbe Einstellung
hintereinander.

Text läuft über die overlay.py-Bausteine (importiert, nicht geändert):
- 0 bis ~2 s: Marke + Hook
- dann Titel + Preis + Fusszeile
- letzte 2–3 s: Preis + «Link in Bio»

Die Zone wird geprüft (organisch y 200–1440, Fusstexte x ≤ 940; Meta 269–1248 / 65–1015).

## 5. Proben-Pfade (Scratchpad, nicht im Repo)

`/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/schnitt/proben/`
- Neu: `p1_neu.mp4`, `p2_neu.mp4`, `p3_neu.mp4` (automatisch), `p3r_neu.mp4` (nach Sichtprüfung), `p4_neu.mp4`
- Alt: `p1_alt.mp4` … `p4_alt.mp4`
- Kontaktbögen: `kb_pN_neu.jpg`, `kb_pN_alt.jpg`, `kb_p3r_neu.jpg`, Quellbögen `kb_p1/p3/p4_quelle.jpg`
- Entscheidungslogs: `pN_neu_log.json` (Analyse + Plan + Prüfung), `pN_neu_erg.json`
- Diagnosen: `diag_p1.png`, `diag_p2.png` (Fensterwahl), `p2_verdacht.jpg` (chinesische Etiketten), `p3_neu_naht.jpg`, `p4_naht.jpg`
- Quellen: `quellen/*.mp4` (per curl von CJ, Referer gesetzt), Runner `lauf.sh`

## 6. Offene Punkte

1. **Reel-Motor umstellen** (`cj_video_reel_engine.mjs`): Statt `make_reel.sh` soll er `schnitt.py --render … --json`
   aufrufen. Bei Exit 3 den nächsten Clip versuchen und die Clips vorab nach API-Metadaten sortieren (hochkant, 8–30 s,
   Material-Bericht). Das gehört einem anderen Workflow und wurde hier nicht geändert.
2. **Sichtprüfung bleibt Pflicht.** Szenentext in fremder Schrift wird nur teilweise erkannt (2 von 3 Stellen in p2).
   Ohne Bild-Modell geht es nicht automatisch; Kandidat ist ein Vision-Check des Kontaktbogens vor dem Posten.
3. **Hook = Anwendung** statt stärkster Bewegung: automatisch nicht lösbar (p3: Montage schlägt «Hund trinkt»).
   Heute greift `--hook-ab` nach Sichtprüfung. Offen ist, ob «letztes Drittel der Quelle» als Vorrang taugt; das ist
   eine BEHAUPTUNG und braucht Messung an mehr Quellen.
4. **Kick gegen Beat:** Bei hype1/2/3 liegt die Tiefton-Energie auf dem Halbraster, librosa und der Motor schneiden auf
   das andere Raster. Welche Phase die Sehdauer hebt, ist offen (A/B).
5. **Eigenleistung (Meta 03/2026)**: Der Schnitt allein ist keine Originalität. Eine Fakten-Ebene (Masse, Material aus dem
   Faktenblock, Schritte 1-2-3) fehlt noch.
6. **Wirkung messen:** A/B mit je 10 Reels neu gegen alt, nach 48 h TikTok `averageTimeWatched` (Ziel > 3 s) und IG
   `ig_reels_avg_watch_time`. Bis dahin ist «besser» eine Aussage über die Form, nicht über die Sehdauer.
7. **Schwellen mit n = 4 Quellen kalibriert:** Layout 15/25 %, Schrift-Verdacht 20 %, Sprung-Verdacht 0,12. Nach 20–30
   echten Läufen die Entscheidungslogs auswerten.
8. `luxe-liquid-dnb-electronic.wav` fehlt in CREDITS.txt (Material-Bericht). Der Motor nutzt 174 BPM aus der
   Rückfall-Tabelle. Die Lizenzzeile muss nachgetragen werden.
9. **Speicher:** Neue Reels sind mit CRF 23 grösser (p1 4,6 MB gegen 3,4 MB alt). Bei Ablage im Repo wachsen die Blobs
   (Inventur: 262 MB Historie). Eine Ablage ausserhalb des Repos wäre sinnvoll.
