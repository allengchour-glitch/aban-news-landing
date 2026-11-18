# Animation für YouTube Shorts lernen, Teil 2: Gestalten, Fallen, Übungen

Teil 1 (Format, Ablauf, Handwerkszeug): `LERNEN.md`.

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
- Klang der Musik zum Thema: Hörabnahme fehlt (hier gibt es kein Gehör); die Stimme (Piper, `de_DE-thorsten-high`) ist technisch geprüft (Dauer, Pegel, Einsätze), ob sie gut klingt und Wörter richtig betont, hat niemand von uns gehört. Bekannte kleine Schwäche des Beispiels: beim Übergang Tag → Goldlicht (ca. 26–29 s) wird der Himmel kurz grau.
- Die Sicherheitszonen-Prozente sind eine vorsichtige Annahme, keine YouTube-Vorgabe.

## 9. Strichmännchen und Stimme im Gleichschritt (Pia-Short)
Rezept des Referenzvideos: kleine Geschichte, jede Sprecherzeile beschreibt genau ihre Szene, eine Stimme, dieselbe Figur überall, Szenenlänge = Länge der Zeile.
- **Figur nach Vorbild** (Vorschaubilder gelesen): grosser runder weisser Kopf, wildes Kritzelhaar, dünne Glieder, weisse Handschuh-Hände, Schuhklumpen, geflicktes Gewand; gemalte Bilderbuch-Welt, gelbe Textschilder. `stickman.js`: `pose`, `gehen`, `ruehren`, `huepfen`, `mund` in zeitlicher Reihenfolge (sonst Fehlermeldung). Übung: `bausteine/06-stickman.html`.
- `projekte/vegan-pia/stimme.txt`: je Zeile `S1`, Sprechtext, optional Titel (TAB-getrennt). `stimme.sh` rechnet die Einsatzzeiten und schreibt `zeiten.js`; die Szene leitet Fenster, Titel und Ereignisse daraus ab.
- **Falle SVG-Position:** ein `transform`-Attribut wird von einer CSS-Animation auf demselben Element überschrieben. Aussen `<g transform>`, innen ein `<g>` animieren.
- **Falle Piper:** die Dauer schwankt von Lauf zu Lauf; Zeiten und Tonspur aus demselben Lauf (`bauen.sh`).
- **Falle Linter:** Sprechtext nur in `stimme.txt` (Anrede-Prüfung, Grenze 5000 Zeichen).
- **Falle Prozentzeichen:** `printf` liest «% d» als Formatangabe («18  0er»). Nie in den Formatstring setzen.
- **Falle Renderzeit:** ein SVG-Rauschfilter über der ganzen Szene kostete über zwei Drittel der Zeit; Korn als fertige PNG-Kachel unter den Himmel legen.
