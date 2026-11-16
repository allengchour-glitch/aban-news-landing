# Traumhaus: Stadtbild

Stand: 16. November 2026. Branch: `codex/traumhaus-stadtbild-20261116`. Lokale Spielprüfung abgeschlossen; der Veröffentlichungsnachweis folgt im Projektbericht.

## Änderungen

Das Tageslicht erhält mehr gerichtetes Sonnenlicht und weniger gleichmässige Aufhellung. Der warme Farbfilm wird schwächer. Bei Regen wird die Belichtung des nächtlichen Grundlichts nicht länger zusätzlich abgedunkelt. Das Altstadtpflaster verwendet dieselbe ruhige Textur und denselben Massstab wie die übrigen Stadtplätze.

QUELLE: `js/traumhaus-stadt.js`. Die 148 bestehenden Gebäude des Stadtmoduls erhalten drei Fassadenfamilien: einzelne Fenster, breite Fensterbänder und vertikal gegliederte Fassaden mit Balkonen. Farblich abgestimmte Erdgeschosse, Eingänge, Gesimse sowie Dachterrassenflächen und ausgewählte Dachaufbauten machen die Häuser unterscheidbarer. Diese Dachdetails ergänzen die Architektur; sie sind keine neuen begehbaren Spielbereiche.

GEMESSEN: An 35 Kreuzungen und Einmündungen werden Fussgängerüberwege ergänzt. Mittellinien enden vor den Überwegen. Weisse Markierungen verwenden flache Geometrie statt dünner Kästen.

Das neue Modul `js/traumhaus-stadtbild.js` ergänzt Grün und Sitzmodule an bestehenden Stadtorten. Baum- und Bankteile werden zu gemeinsamen Grundmodellen verbunden und danach instanziert. Kleine Kontaktflächen am Boden kommen ohne neue Lichtquelle oder Schattenkamera aus; entfernte Gruppen werden ausgeblendet. QUELLE: Der Bauplan berücksichtigt zusätzlich acht Nordstadthöfe ausserhalb der Missions- und Nordparkflächen. Welche Bäume und Bänke tatsächlich Platz finden, entscheidet die Freiflächenprüfung. GEMESSEN im abschliessenden Regressionslauf: 39 Objekte an 20 Orten, davon 19 Bäume und 20 Bänke.

Die Platzierung erfolgt nach dem Modellaufbau und prüft Gebäudeflächen, Strassen, Schienen, Parkplätze, Wasser, Gelände, Passantenwege, Haltestellen und Missionsorte. Neben der Mitte werden Randpunkte und Abstände zu bereits gesetzten Objekten geprüft. Die tatsächlichen Grundrisse erhalten Kollider; die GPS-Raster werden anschliessend neu aufgebaut.

## Gemessener Modulvergleich

QUELLE: `/tmp/th-stadtbild-budget.txt`, Vergleich von `js/traumhaus-stadt.js` mit der Branchbasis. Identische Kamera, Beleuchtung und Boden im isolierten Chromium/WebGL-Render.

| Messwert | Vorher | Nachher |
| --- | ---: | ---: |
| Zeichenaufrufe der isolierten Ansicht | 61 | 60 |
| Materialien des Stadtmoduls | 9 | 9 |
| Gesamte Modulgeometrie, Dreiecke inklusive Instanzen | 42’676 | 47’792 |
| In der Vergleichsansicht gezeichnete Dreiecke | 35’382 | 42’066 |

GEMESSEN: Bauplan und alle 148 registrierten Gebäudekollider bleiben im Vergleich identisch. Die 1’108 weissen Markierungsinstanzen zeigen mit ihren Normalen nach oben; eine flache Markierung benötigt zwei statt zwölf Dreiecke. Der isolierte Vergleich meldete keine JavaScript-Fehler.

Diese Messung umfasst das Stadtmodul, nicht das gesamte Spiel und nicht die zusätzlichen Grün- und Sitzmodule. Die geringere Zahl an Zeichenaufrufen bei höherer Geometriezahl belegt keine bestimmte Bildrate. 60 FPS auf einem echten Handy sind damit nicht nachgewiesen.

## Spielprüfung

GEMESSEN in Chromium mit vollständig geladener Welt (`/tmp/th-stadtbild-regression-innenhof.log`):

- Fünf ÖV-Linien und alle 22 Haltestellen erreichbar; 3’613 Bus-Stichproben ohne neue Hindernisse.
- Strassen und Rennkurs auf jeweils drei Spuren, Gleisstreifen sowie feste Passantenwege ohne neue Hindernisse.
- GPS-Routen zu Depot, Garage, Technikpunkt und Nordpark vorhanden.
- Der Missionswagen fährt mit unveränderter Fahrzeugphysik 222,645 Meter über fünf Wegpunkte und schliesst die Überführung ab. Die Teststeuerung setzt Gas und Lenkung; entlang der Route wird nicht teleportiert.
- Keine JavaScript-Fehler.

GEMESSEN: Elf Modulprüfungen zu Freiraum, Objektgrenze, Instanzmatrizen und Entfernungsausblendung bestanden; zusätzlich der enge Innenhof und der vollständig gesperrte Hof geprüft. Die zwölf vorhandenen Missionsprüfungen bestehen. Beide Inline-Skripte und beide geänderten Module bestehen die Syntaxprüfung.

Altstadt, Nordstadt und Seepark wurden bei gleicher Kamera und Tageszeit verglichen, zusätzlich die Altstadt bei Regen am Tag und in der Nacht. Das ruhigere Pflaster und die zusätzliche Fassadengliederung sind sichtbar. An engen Hochhäusern verkürzt die bestehende Kollisionskamera den Blick weiterhin; sie wurde nicht verändert. Die Prüfung nutzt Software-WebGL, kein echtes Handy.
