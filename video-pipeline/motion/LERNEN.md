# Animation für YouTube Shorts lernen — Motion Graphics mit HTML/CSS/SVG

Ziel: ein Short selbst bauen können, vom Skript bis zum fertigen MP4, ohne Videoschnittprogramm. Alles läuft lokal:
**HTML/SVG = Bild**, **Web Animations API = Bewegung**, **Chromium = Bildrenderer**, **ffmpeg = Video und Ton**.
Das fertige Beispiel steht in `projekte/frieden/` («Wie eine friedliche Welt aussieht», 35 s).

## 1. Das Format
- **9:16, 1080×1920, bis 3 Minuten**, quadratisch zählt auch (Quelle: mehrere Drittanbieter-Ratgeber 2026, z. B. hopperhq.com, riverside.com; die Hilfeseite von YouTube selbst wurde nicht gelesen). 30 fps reichen.
- **Sicherheitszone:** YouTube legt Titel, Kanalname und Knöpfe über das Bild. Drittquellen sagen nur «oben, unten und rechts Platz lassen», keine Zahlen. Unsere **Annahme**: unten 20 %, rechts 15 %, oben 8 % frei von Text. `node pruefe_sicherzone.mjs <szene.html>` prüft das für alle `.cap`-Titel. Hintergrundbilder dürfen bis an den Rand laufen.
- **Loop:** Shorts laufen in Schleife. Ist das letzte Bild fast gleich dem ersten, wirkt der Neustart nicht wie ein Schnitt (im Beispiel: Himmel, Sonne, Wolken, Blumen enden wie sie anfangen).

## 2. Der Ablauf (so entsteht jedes Short)
1. **Idee in einem Satz** und ein **Skript** in 4–6 Beats, je 4–7 s. Ein Beat = ein Bild = ein Satz Titel.
2. **Szenenplan** als Tabelle: Zeit, Bild, Bewegung (siehe `projekte/frieden/skript.md`).
3. **Szene in HTML/SVG bauen** (`szenen.html`). Zuerst Standbilder, dann Bewegung.
4. **Vorschau:** `node render.mjs szene.html --vorschau 0,3,9,16 --outdir ausgabe/vorschau` (Sekunden, in Sekunden Standbilder). Ansehen, korrigieren, wiederholen. Das ist die eigentliche Arbeitsschleife.
5. **Render:** `node render.mjs szene.html --out ausgabe/x.mp4` (stumm; ca. 2 Bilder/s, 35 s = rund 9 Minuten).
6. **Ton:** `bash mix.sh ausgabe/x.mp4 ausgabe/x-ton.mp4` (rotierende Mixkit-Musik, −22 LUFS; optional `STIMME_DATEI=`).
7. **Abnahme:** Sicherzone, Lesbarkeit auf dem Handy (Bild verkleinert ansehen), Loop-Naht (erstes und letztes Bild), Ton.

## 3. Das Grundgesetz: Zeit gehört dem Renderer
Eine Szene darf **nie** `setTimeout`, `requestAnimationFrame` oder CSS-Übergänge in Echtzeit benutzen. Jede Bewegung läuft über `motion.js` mit **absoluter Startzeit** (`t`) und Dauer (`d`). Der Renderer pausiert alle Animationen und setzt pro Bild `currentTime`. Folge: jedes Bild ist reproduzierbar, auch wenn das Rendern langsamer als Echtzeit läuft.

```js
const M = Motion;
M.at('#sonne', [{ transform: 'translateY(300px)' }, { transform: 'translateY(0)' }], { t: 0, d: 3, ease: M.EASE.inOut });
M.fertig(35);   // Gesamtdauer melden, sonst bricht render.mjs ab
```

## 4. Die Handwerkszeuge (jeweils mit einem Baustein zum Ausprobieren)
| Prinzip | Wozu | Baustein |
|---|---|---|
| **Staffelung** (`M.stagger`) | Dinge erscheinen nacheinander statt gleichzeitig: wirkt «gebaut» | `bausteine/01-text-staffeln.html` |
| **Zahl hochzählen** | Wert animieren, Text über CSS `counter()` schreiben | `02-zaehler.html` |
| **Parallax** (`M.loop`) | hintere Ebenen langsam, vordere schnell: Tiefe | `03-wellen-parallax.html` |
| **Wachsen + Überschwingen** (`M.EASE.back`) | Dinge «poppen», wirken lebendig | `04-baum-waechst.html` |
| **Linie zeichnen** (`M.zeichnen`) | Brücke, Regenbogen, Pfeile bauen sich auf | `05-bruecke-zeichnen.html` |
| **Entlang eines Weges gehen** | Position der Kurve in Stützpunkten ausrechnen (`P(u)` im Beispiel) und als Keyframes geben | `projekte/frieden/szenen.html`, Funktion `gehen` |
| **Ein-/Ausblenden** (`M.fenster`) | Szene sichtbar von t0 bis t1, mit Überblendung | `projekte/frieden/szenen.html` |

**Easing in einem Satz:** `out` = schnell los, weich aus (Einblenden), `inOut` = weich an und ab (Kamera, Sonne), `back` = leicht überschwingen (Pop), `linear` = nur für Dauerbewegung wie Wolken. Bei mehr als zwei Keyframes gilt das Easing **je Abschnitt**; für ein Easing über die ganze Strecke `whole: true`.

## 5. Gestalten für den kleinen Bildschirm
- **Eine Aussage pro Beat.** Titel höchstens ~8 Wörter, Schrift ≥ 64 px, Titel auf einer halbtransparenten Fläche (Kontrast unabhängig vom Hintergrund).
- **Alle 2–3 s etwas Neues** (neue Bewegung, neues Element); lange Stillstände wirken wie ein Abbruchgrund. (Erfahrungswert; im Repo-Konzept `docs/YOUTUBE-NEUSTART-2026.md` steht, dass komplette Ansichten und Sehdauer zählen. Die Wirkung eines bestimmten Rhythmus ist hier **nicht gemessen**.)
- **Hook in den ersten 2–3 s:** die Frage oder Behauptung des Videos steht sofort da (im Beispiel ab 0,2 s).
- **Wenig Farben, flache Formen:** zwei bis vier Töne je Szene; Farbverlauf des Himmels trägt die Stimmung (Morgenrot → Tag → Goldlicht).
- **Nur Inhalte, die man darstellen darf:** keine Marken, keine echten Personen, keine Statistik ohne Quelle.

## 6. Fallen (alle beim Bau des Beispiels gemessen, nicht geraten)
1. **`pause()` wirkt verzögert.** Wer sofort danach `currentTime` setzt, bekommt Mischbilder (neue Sonne, alter Himmel). Fix in `render.mjs`: auf `animation.ready` warten und nach jedem Zeitsprung zwei Bildzyklen abwarten.
2. **Beendete Animationen werden «ersetzt» und entfernt**, wenn eine spätere dieselbe Eigenschaft überschreibt; danach lässt sich die Zeit nicht zurückspulen. Fix: `animation.persist()` (in `M.at` eingebaut).
3. **Zwei Animationen auf derselben Eigenschaft:** die spätere bekommt `fill: 'forwards'`, sonst überschreibt ihr Anfangswert die frühere schon vor ihrem Start (Herz, Sprechblase).
4. **`easing` auf der ganzen Kette** verzerrt lange Keyframe-Folgen. Deshalb setzt `M.at` Easing je Abschnitt.
5. **SVG-Drehpunkt:** `transform-box: fill-box; transform-origin: 50% 100%` setzen, sonst wächst alles aus der Ecke. Position über ein äusseres `<g transform>`, Animation auf einem inneren `<g>` (CSS-`transform` überschreibt das Attribut).
6. **Nur das Gesehene zählt:** nach jeder Änderung Standbilder ansehen. Der Fehler aus Punkt 1 war im Seitenzustand unsichtbar (alle Werte stimmten) und nur im Screenshot zu sehen.
7. **Schrift:** Inter muss im System liegen (`fc-list | grep Inter`); es gibt keinen Netzabruf beim Rendern.

## 7. Übungen (je 10–20 Minuten)
1. Baustein 01: eigenen Satz einsetzen, Staffelung `gap` ändern (0.05 / 0.25), Wirkung vergleichen.
2. Baustein 04: einen zweiten Baum mit Verzögerung 0.4 s ergänzen; `EASE.back` gegen `EASE.out` tauschen.
3. Baustein 05: eine zweite Brücke darüber zeichnen; Reihenfolge der Zeichnung ändern.
4. Neues Beat im Beispiel: ein Haus-Bau (`stagger` auf Wände, Dach «poppt»).
5. Eigenes 10-s-Short: ein Satz, eine Bewegung, ein Loop-Ende. Vorschau, Render, Mix.

## 8. Was hier nicht belegt ist
- Wie YouTube Reichweite für animierte Kurzvideos bewertet, und wie es mit massenproduzierten Clips umgeht: ungemessen.
- Klang der Musik zum Thema: Hörabnahme fehlt (hier gibt es kein Gehör); die Stimme (Piper) ist hier nicht installiert und nicht getestet.
- Die Sicherheitszonen-Prozente sind eine vorsichtige Annahme, keine YouTube-Vorgabe.
