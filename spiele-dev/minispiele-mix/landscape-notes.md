# Mix: kurze Querformate

Nur `css/minispiele-mix-landscape.css` und diese Notizen gehören zu diesem Teilauftrag. Keine Änderungen an HTML, Spielcode, result.js, app.js oder anderen CSS-Dateien; kein Commit/Push.

## Einbindung durch Parent

- Root des aktiven Childs: `html.mix-embedded[data-mix-game="slug"]`.
- Neues Stylesheet **nach** `minispiele-mix-embedded.css` laden.
- **Nach dessen `load` einmal `window.dispatchEvent(new Event('resize'))` im Child auslösen**, nach angewandtem Layout (z. B. `requestAnimationFrame`). Die vorhandenen Handler von Pong, Elfmeter und Stapel-Turm müssen ihre Zeichenpuffer an das neue Layout anpassen. CSS allein kann keine Canvas-Zeichenpuffer ändern.
- Parent setzt `mix-has-bar` ausschließlich bei sichtbarer Shellbar; bei höchstens 450 px Framehöhe bleibt der Child-Unterbrechen-Knopf sichtbar und mindestens 44 px hoch.
- `body > footer` wird vom vorhandenen Embedded-CSS verborgen. Die separaten `#aban-recht`-Links von Pong und Stapel bleiben bestehen und liegen links außerhalb des Spielfelds.

## Grenzen der CSS-Regeln

Einziger Media-Query: `(max-height: 450px) and (min-width: 600px)`. Alle Regeln sind auf `html.mix-embedded[data-mix-game]` begrenzt, Layoutregeln zusätzlich auf die konkreten neun Slugs. Kein Body-Scale, kein pauschaler `.top`-Selektor, keine Änderungen an Spielerhälften anderer Spiele.

- Drei gewinnt, Memory und Simon: quadratisches DOM-Brett neben Titel, Status und Bedienung.
- Vier gewinnt: Canvas bleibt exakt 378 × 324 px. `sizeBoard()` verwendet 54 px pro Spalte; `handlePoint()` liest unskalierte X-Koordinaten. Kein Überschreiben seiner Inline-Größen.
- Elfmeter: Canvas behält 436:300; `setupCanvas()` liest die neue sichtbare Größe und rundet nur den DPR-Zeichenpuffer.
- Hoch/Tief: Karten bleiben 124 × 176 px; Tipps stehen darunter.
- Quiz: Frage, beide Buzzer und Antworten gleichzeitig sichtbar; Antwortliste als zweispaltiges Raster.
- Pong: explizite Grid-Höhe statt intrinsisch wachsender Flex-Bühne. Der vorhandene Resize-Handler bestimmt weiterhin `W/H` aus `cv.clientWidth/Height`; beide Touchhälften bleiben erhalten.
- Stapel-Turm: Canvas mindestens 300 px hoch, entsprechend `H = Math.max(300, r.height)`; seitliche Kopf-/Punkteanzeige schafft volle Höhe.

## QA

Messungen und Bildschirmbilder unter `/tmp/mix-landscape-qa/`. Ausschließlich Chromium-2D mit `--disable-gpu --disable-webgl`; aktive Mix-Frames über den Index auf Port 8184, nur Deckreihenfolge als Fixture. Vorher wird ausschließlich das neue Stylesheet unterdrückt; nachher wird der echte CSS-Dateiinhalt injiziert und der vorhandene Resize-Handler ausgelöst. Keine künstlichen Gewinne.

**GEMESSEN, 16.11.2026:** Der Abschlusslauf `final/result.json` prüft alle neun Spiele bei 640 × 360 CSS-Pixeln und DPR 2. Alle ausgewählten Spielfelder, Status-/Bedienflächen und Unterbrechen-Knöpfe liegen im sichtbaren Frame; Dokumentgröße jeweils 640 × 360, kein Restscroll. Keine JavaScript-Fehler. Der Parent-Loader mit `load` → rAF → `resize` ist inzwischen im Quellcode vorhanden; der Abschlusslauf verwendet weiterhin die erlaubte Injektion derselben CSS-Datei. Der anschließende echte Loader-Sweep aller 20 Spiele gehört zum Parent.

### Elementgrenzen

Alle Tabellenwerte **GEMESSEN**, CSS-Pixel, auf eine Nachkommastelle gerundet. `unten vorher` ist die Unterkante im ursprünglichen Layout ohne das neue Stylesheet. Nachher jeweils `(x, y, Breite, Höhe)`.

| Spiel / Element | unten vorher | Rechteck nachher | unten nachher |
|---|---:|---|---:|
| Drei gewinnt `#board` | 574 | (276, 16, 328, 328) | 344 |
| Drei gewinnt `#resetBtn` | 736 | (30, 296,1, 220, 44) | 340,1 |
| Vier gewinnt `#board` | 541 | (247, 18, 378, 324) | 342 |
| Memory `#board` | 679 | (276, 16, 328, 328) | 344 |
| Elfmeter `#cv` | 602,2 | (239,1, 20, 377,9, 260) | 280 |
| Elfmeter `.controls` | 730,2 | (228, 286, 400, 54) | 340 |
| Hoch/Tief `.cardrow` | 508 | (275, 46, 340, 176) | 222 |
| Hoch/Tief `.buttons` | 592 | (275, 249,2, 340, 48) | 297,2 |
| Simon `#board` | 600 | (276, 16, 328, 328) | 344 |
| Quiz Frage | 371 | (208, 12, 420, 87,8) | 99,8 |
| Quiz Buzzer | 539,2 | (208, 133,8, 420, 48) | 181,8 |
| Quiz Antworten nach Buzzern | – | (208, 189,8, 420, 96) | 285,8 |
| Pong `#cv` | 460 | (214, 12, 414, 336) | 348 |
| Stapel-Turm `#cv` | 452 | (208, 12, 420, 336) | 348 |

**GEMESSEN:** Bedienelemente mindestens 44 × 44 px; Memory-Karten 76 × 76, Drei-gewinnt-Zellen mindestens 97,3 × 97,3, Simon-Pads 160 × 160. Quiz-Antworten 206 × 44, Elfmeter-Zonen 128 × 54. Unterbrechen-Höhe 44, bei Hoch/Tief original 46. Hit-Tests der Mittelpunkte: kein aktives Bedienelement verdeckt. Canvas-Spalten von Vier gewinnt bleiben gemäß Quellcode 54 px breit.

**GEMESSEN, DPR 2:** Canvas-Zeichenpuffer Vier gewinnt 756 × 648, Elfmeter 756 × 520, Pong 828 × 672, Stapel-Turm 840 × 672. Das entspricht den sichtbaren Größen mit DPR-Rundung; keine gestreckte alte Zeichenfläche nach Resize.

### Eingaben und weitere Formate

**GEMESSEN, echte Touch-Eingaben:** Letzte Drei-gewinnt-Zelle gesetzt und zurückgesetzt; letzte Memory-Karte aufgedeckt; Vier gewinnt in Spalte 0/6 gespielt und Farben im Canvas geprüft (Mitte leer); Schützen-/Torwartwahl startet Elfmeter-Schuss; Hoch/Tief zeigt neue Karte/Feedback; unteres rechtes Simon-Pad verarbeitet Eingabe; Quiz-Buzzer plus richtige Antwort vergibt einen Punkt; beide Pong-Hälften verarbeiten Touch; Stapel-Turm setzt je einen Block für beide Spieler. Alle neun Unterbrechen-Knöpfe führen ohne Matchpunkte zurück. Details in `final/result.json` unter `actions`.

**GEMESSEN:** `long-final/result.json` ersetzt die Namen im Label durch jeweils 20 breite Buchstaben (W/M); auch dann passen bei 640 × 360 alle neun Spiele ohne Scrollen. Keine Namen werden abgeschnitten. `edges/result.json` belegt zusätzlich 600 × 360 und 800 × 450 ohne Überlauf; danach wurden nur die Abstände von Drei gewinnt sowie Elfmeter-/Stapel-Textgrößen weiter verkleinert und bei 640 × 360 erneut geprüft.

### Vorgesehener Restscroll

Bei 640 × 360 keiner. Bei noch kürzeren Frames bleibt Scrollen zugelassen, statt Touchflächen oder die Canvas-Geometrie zu stauchen: Vier gewinnt benötigt 348 px Gesamthöhe (324 px Canvas plus zweimal 12 px Rand); Stapel-Turm benötigt mindestens 324 px (300 px Canvas plus Rand). Lange Texte können in extrem kurzen Frames zusätzlichen Scroll erzeugen. Unterhalb 600 px Breite und oberhalb 450 px Höhe greift diese Datei überhaupt nicht; dort bleiben die vorhandenen Seitenlayouts und Scrollwege zuständig.

Messdateien/Bilder: `/tmp/mix-landscape-qa/final/` (Vorher/Nachher, Quiz-Antworten, Touch/DPR), `/tmp/mix-landscape-qa/long-final/` (lange Namen), `/tmp/mix-landscape-qa/edges/` (weitere Formate), `/tmp/mix-landscape-qa/short-final/` (abschließende kurze Canvas-Frames). Runner liegen ausschließlich unter `/tmp/mix-landscape-qa/`, nicht im Repository. Keine GPU-, WebGL- oder FPS-Aussage.

**Freeze:** Nach Abschluss dieses begrenzten Teilauftrags keine weiteren Änderungen. Keine Commits, kein Push. Nur die beiden zugewiesenen Dateien geschrieben.
