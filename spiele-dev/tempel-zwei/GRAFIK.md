# Tempel der Zwei: Spielgrafik

16.11.2026, Branch `codex/tempel-grafik`, Ausgangspunkt `a6882642f`.

Die Spielwelt übernimmt die Basalt-, Kupfer-, Feuer- und Wasserformen des vorhandenen Covers. Drei kleine lokale Grafikmodule bauen echte 3D-Geometrie mit THREE r128. Keine neuen Dienste, Bildabrufe, Konten oder Modell-Downloads.

- `js/tempel-zwei/world.js`: Steinplatten, Tempelarchitektur und Umgebung. Sichtbare Architektur und unveränderte Kollisionsflächen sind getrennt; die vordere Wand verdeckt die Figuren nicht.
- `js/tempel-zwei/heroes.js`: eigene Steinwächter Ember und Aqua mit Elementzeichen, Visier, Glut-/Wasserformen, beweglichen Armen und Beinen sowie Bodenschatten. Die bisherigen fremden GLTF-Figuren und deren Ladeweg entfallen.
- `js/tempel-zwei/props.js`: verzierte, versenkbare Tore, runde Druckplatten, organische Ranken/Pflanze, Hebel, Impulssäulen und mechanisches Wächterauge. Interaktionsradien, Zustandsobjekte und Netzwerknachrichten bleiben bestehen.
- Gerichtetes warmes Licht und kühles Umgebungslicht modellieren die Formen. Vier nahe Fackellichter bleiben die Obergrenze; keine Echtzeitschatten oder Nachbearbeitung. Statische Geometrie wird nach Material zusammengefasst.
- Laufanimationen folgen auch der tatsächlichen Bewegung der entfernten Figur. Bei reduzierter Bewegung bleiben sie ruhig. Zielschilder geben Figuren in unmittelbarer Nähe Platz.

## Prüfung

Die vorhandenen Koop-/Solo-Prüfungen laufen gegen den tatsächlichen Vorschau-Server mit `_headers` auf Port8130. Nur ihre temporären Kopien erhalten die andere URL; die Tests selbst werden nicht verändert. Positionsfixtures verkürzen längere Wege. Zusätzlich gibt es eine Zweiclient-Aufnahme des ersten Siegels mit echten Tastatureingaben ohne Positionsfixtures.

Vorher-/Nachher-Bilder zeigen dieselben Blickpunkte bei1440×900. Die Leistungsprobe läuft separat bei960×540 mit SwiftShader und gleichem adaptivem Auflösungsregler. Sie misst die Cloud-Softwaredarstellung, keine echte Handy-GPU. Öffentliche Vermittlung, NAT und Safari sind damit nicht geprüft.

GEMESSEN: [33 Koop-Prüfungen](grafik/qa-results.json) und [22 Solo-/UI-Prüfungen](grafik/solo-results.json) grün, keine JavaScriptfehler. Vier neue Kammeransichten und ein Handybild angesehen. [Szenenprobe](grafik/szenen.json): keine GLB-Abrufe, beide Figuren sichtbar. Ein am rechten Handyrand abgeschnittenes Aqua-Namensschild wurde im Screenshot bestätigt und korrigiert: geringere aktive Kameraverschiebung im Hochformat und begrenzte Schildpositionen. [DOM-Gegenprobe360/390px](grafik/mobile-rand.json): beide Namen sichtbar und vollständig im Viewport.

| Software-Probe960×540, jeweils8s | Vorher | Nachher |
| --- | ---: | ---: |
| rAF/s | 29,8 | 28,6 |
| Median | 33,3ms | 33,3ms |
| 95.Perzentil | 50,0ms | 50,1ms |
| Renderverhältnis | 0,55 | 0,55 |
| Sichtbare Dreiecke am Messende | 28.486 | 28.598 |
| Drawcalls am Messende | 39 | 55 |

[Vorher-Probe](grafik/vorher-performance.json), [Nachher-Probe](grafik/nachher-performance.json). Mehr Architektur bei vergleichbarer begrenzter Framezeit; keine Beschleunigung oder Hardware-FPS belegt. Die Welt nutzt8 Materialbatches/14.148 Dreiecke. Ember und Aqua benötigen je8 Drawcalls inklusive Ring und Schatten sowie2.852/2.980 Dreiecke. Kein Zuwachs an Fackellichtern, keine nachträgliche Vollbildberechnung.

[Echte Zweiclient-Tastatureingabe](grafik/echte-eingabe.json): beide erreichen mit A/D/W das erste Siegel, Tor und Raum2 stimmen überein. Die zugehörige MP4-Aufnahme liegt im Workspace unter `/workspace/aban-spiele-analyse/tempel-grafik/spielvorschau.mp4`.

| Vergleich | Bild |
| --- | --- |
| Vorher, erste Kammer | [Vorher](grafik/vorher.webp) |
| Neue erste Kammer | [Nachher](grafik/nachher.webp) |
| Mechanischer Wächter | [Wächter](grafik/waechter.webp) |
| Hochformat nach Randkorrektur | [Handy](grafik/mobile.webp) |

Die WebP-Dateien sind reine Formatkonvertierungen der Browser-Screenshots, ohne Retusche. Die Veröffentlichung wird durch den tatsächlichen Hauptseitenlauf und einen HTTPS-Quellenvergleich belegt; lokale Prüfungen allein sind kein Live-Nachweis.
