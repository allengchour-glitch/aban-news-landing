# Prisma Rallye

Die bisher endlose Ausweichfahrt bekommt einen abgeschlossenen Rallyemodus:
Spur und Pol für 18 Tore kombinieren, drei Ladungen als Boost einsetzen und
mindestens acht Resonanzen bis zum Ziel sichern. Drei Sektoren mit anderen
Torfolgen, Bronze/Silber/Gold und getrennt gespeichertes Rennprofil.
Endlos-Training, alter Distanzrekord und Stationsprotokoll bleiben erreichbar.
Entwurfswerte sind SETZUNG, keine aus Nutzerdaten abgeleitete Balance.

## Prüfung

```sh
node spiele-dev/prisma-racer/race-test.cjs
node spiele-dev/prisma-racer/landscape-test.cjs
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
node spiele-dev/prisma-racer/browser-qa.cjs
```

GEMESSEN: neun Regelgruppen grün. Frameunabhängige Torüberquerungen,
Spur-/Polfehler, Ladung/Boost, Mindestqualifikation, Medaillen, idempotentes
Ergebnis, beschädigte Speicherdaten und getrennter Endlosmodus.

GEMESSEN: fünf Geometriegruppen grün. Originale Hügel-/Streckenformeln und
GLB-Transformationen werden aus dem HTML ausgeführt. Echte THREE-r128-Geometrie,
4.032 GLB-Dreiecke und 972 zusätzliche Raycasts. Die Ringöffnung liegt außerhalb
des gesamten sichtbaren Straßenkorridors; zufällige Hügel bleiben selbst bei
maximaler Größe und beliebiger Y-Drehung außerhalb. Der gesicherte Altstand
scheitert an vier dieser fünf Prüfungen. Dieselben vier Fehler sind außerdem
am ursprünglichen Repository-Stand `da8cd75352e1e5f9b7962fb5c3cd43f205b12159`
reproduziert. Das ist kein Bild-/Nebel-/FPS-Nachweis.

GEMESSEN im Browser: kompletter Drei-Sektor-Botlauf mit echten Tastaturereignissen,
18 Resonanzen und sechs aktivierten Boosts; Pause, einmaliges Profil, echter Reload,
Endlos-Wechsel und drei Touch-Formate. Der vollständige Fahrtest kontrolliert nur
rAF-Zeit und schaltet den Renderer aus; er setzt keine Spielerpositionen.
Eine getrennte Seite verwendet Originalrendering für Desktop-/Touch-Bilder.
Die Bildfixture pausiert die Welt und blendet lediglich die Pausekarte aus.
Das Ergebnis enthält 15 Prüfbedingungen; finale Rohbelege im gemeinsamen
[Arcade-Prüfordner](../arcade-einzigartig/README.md).

## Bestätigte Fehler und Korrekturen

Der erste Bot starb trotz elf passender Tore an dicht konkurrierenden
Zufallsbarrieren. Rallye-Hindernisse stehen nun außerhalb der Pflichtlinien
und mit Abstand zu Toren; Endlos behält die Zufallsstrecke. Ein Zieleinlauf
mit weniger als acht Resonanzen qualifiziert nicht; bloßes Rollen gewinnt nicht.

Die Bildprüfung zeigte grüne Hügel quer auf der Straße. Deren zufällige
X-Position durfte im Fahrbahnkorridor liegen. Sie stehen nun abwechselnd auf
beiden Seiten. Der GLB-Ring hatte zwar ein freies Zentrum, aber seine bisherige
Skalierung verkleinerte es in die sichtbare Straße hinein. Seine horizontale
Öffnung ist vergrößert; das Panorama bleibt fest. Diese beiden Fehler wurden
mit Originalgeometrien auch am alten HTML reproduziert.

Licht/Bloom und Helmhalo sind reduziert, die Instrumente werden nur ungefähr
zwölfmal pro Sekunde aktualisiert; Änderungen und Ergebnisse erscheinen sofort.
Tore und Zielbanner nutzen wiederverwendete Geometrien ohne zusätzliche Lichter.
Daraus wird keine gemessene Verbesserung der FPS auf einem physischen Handy
abgeleitet. Dies ist ein Solospiel, kein neu hinzugefügter Online-Koop.
