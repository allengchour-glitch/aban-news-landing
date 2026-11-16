# Lebenspfad: lesbarer, persönlicher und sparsamer

Stand 16.11.2026. Benutzerauftrag: Lebenspfad verbessern, auch Einzelspieler;
Veröffentlichung der Spiele war bereits freigegeben.

## Spiel und Gestaltung

- Papierfarbene Menüs und Karten, ruhige Typografie, klare Bedienflächen und
  kompakte Handyansicht. Bestehende Auswahl für 1–4 Personen, Robo und Online-Räume
  bleibt erreichbar.
- Die Lebensreise zeigt den tatsächlichen Fortschritt, den nächsten Meilenstein
  und die letzte Erinnerung. Das Lebensbuch sammelt die vorhandene Biografie und
  Lebenspunkte. Auf kleinen Bildschirmen bleiben Fortschritt und Buchknopf sichtbar.
- Neue lokale Figuren sind anpassbar und altern sichtbar vom Kind bis zum Senior.
  Bereits gespeicherte und ausdrücklich ausgewählte Spezialfiguren bleiben erhalten.
- Figuren stehen auf den Felddeckeln statt darin. Bewegung und Gesten verwenden
  dieselbe Auflagehöhe; die Bodenschatten liegen über dem Deckel. Partner, Kinder
  und Hund folgen ebenfalls auf der jeweils höchsten Scheibe unter ihrer Position.
- Lokale Pause hält Simulation, Drehrad und Quiz-Frist an. Auch das Lesen des
  Lebensbuchs pausiert lokal. Online läuft die gemeinsame Runde beim Lesen weiter.
  Musik wird beim lokalen Pausieren angehalten.

## Grafikaufwand

Großes Terrain und statische instanzierte Vegetation sind in räumliche Abschnitte
geteilt. Three.js r128 kann unsichtbare Abschnitte damit auslassen. Kompatible
statische Brettteile werden gebündelt; bewegliche Felddeckel bleiben eigenständig.
Instanzmatrizen, Farben, Geometrie und Zufallsfolge bleiben erhalten. Wiederholte
Feldzeichen teilen ihre Texturen. Gelände-Farbwerte werden vor der Ausgabe korrekt
linearisiert; Tonemapping begrenzt helle Flächen.

Automatische Auflösung berücksichtigt langsame Frames und Software-Rendering.
Im Menü sind außerdem „Sparsam“ und „Volle Details“ wählbar und gespeichert.
„Volle Details“ erhält Schatten und die gedeckelte volle Auflösung.

GEMESSEN im Cloud-Browser mit Chromium/SwiftShader, 1280×800, DPR 1, gleicher
frischer Solo-Start, jeweils sechs Sekunden:

| Messwert | Ausgangsversion | Überarbeitung |
| --- | ---: | ---: |
| rAF/s | 2,87 | 12,50 |
| Median Frameabstand | 333,4 ms | 83,3 ms |
| 95. Perzentil | 416,6 ms | 100,0 ms |
| Dreiecke im letzten Bild | 124.964 | 53.406 |
| Zeichenaufrufe im letzten Bild | 211 | 302 |
| Renderverhältnis | 1,00 | 0,55 |
| GLB-Anfragen | 24 | 20 |

Das ist ein Vergleich der gesamten Überarbeitung, einschließlich reduzierter
Auflösung und ausgeschalteter Software-Schatten. Räumliche Abschnitte und die
native Figur erhöhen hier die Anzahl der Zeichenaufrufe; eine isolierte
Beschleunigung durch Batching wird nicht behauptet. Keine Zusage für physische
Handys oder 60 FPS. Messwerte und Bilder liegen unter [belege](belege/).

## Nachweise

- GEMESSEN: echter kurzer Solo-Lauf mit ausschließlich Bedienknöpfen, 19
  Würfelzügen und neun Kartenentscheidungen bis Feld 143. Spielstand nach Neuladen
  identisch fortgesetzt; regulärer Lebensabend, Biografie und Auswertung vorhanden;
  Statistik zählt genau einen Abschluss. Neues Leben danach bedienbar. Keine
  Positions-, Würfel- oder Zustandsfixtures in diesem Durchlauf.
- GEMESSEN: gezielte Modul-Fixtures mit echtem Three.js r128: elf Prüfgruppen
  für statisches Batching/Terrain und sieben für Instanzabschnitte. Geometrie,
  Normalen, UVs, Farben, Welttransformationen, Grenzen, Frustum und Cleanup geprüft.
- GEMESSEN: zwei instrumentierte Online-Clients mit identischer Saat und
  geordneten echten Spielaktionen: 16 Würfe, neun Entscheidungen einschließlich
  zweier Weggabelungen, 26 identische Kontrollpunkte. Kartenoptionen, Kartenfolge,
  Saat und Spielzustand stimmen überein; nur die Animationszeit wird ausgeklammert.
  Regeln und Lebensbuch unterbrechen die Online-Simulation nicht. Dies ist ein
  Lockstep-Replay mit Transportattrappen, kein PeerJS-/WebRTC-Verbindungstest.
- Nachgestellter Ausgangsfehler: Menü offen, Spielzeit 1,13 → 4,85 und Figur
  Feld 0 → 3. Gegenprobe nach Korrektur: Spielzeit, Feld und Würfelphase unverändert.
  Das Quiz wird als gesonderte Timer-Fixture geöffnet; Würfel/Pause werden über
  echte Schaltflächen bedient. Kein Anspruch, alle zufälligen Lebensläufe abzudecken.
- GEMESSEN: sieben gezielte Pause-/Grafikprüfungen, einschließlich einer über die
  volle Quiz-Frist hinaus geöffneten Pause, anschließender Zeitüberschreitung,
  Musik und aller drei gespeicherten Grafikprofile; keine Browserfehler.
- Familie als Geometrie-Fixture mit Partner, Kind und Hund: drei Meilensteinfelder
  und Boden außerhalb des Bretts. Unterkanten liegen nach Korrektur über der
  tatsächlichen Auflage; wartende Personen schweben nicht. Gegenprobe am alten
  Original scheitert mit Partnerunterkante 0 statt Feldoberfläche 0,63.
- GEMESSEN im abschließenden kanonischen Layoutlauf: 25/25 HUD-Mittelpunkte
  erreichbar bei 360×640, 390×844, 640×360, 844×390 und 1280×800. Lebensbuch jeweils
  tatsächlich geöffnet und geschlossen. Sieben Stand-/Gesten-Snapshots: vier
  Altersstufen, erhöhtes Hauptpfadfeld, aktive und tatsächlich beendete Geste.
  Nach Gestenende stehen die Schuhe wieder auf dem Deckel. Zusätzliche separate
  4K-HUD-Messung: fünf erreichbare Bedienelemente. Keine Browserfehler.
- Letzte Handy-Gegenprobe: Hinweis/Buch, Bedienhilfe/Fußlinks und
  Würfelknopf/Fußlinks überschnitten sich bei 360×640. Korrigierte Abstände und
  kompakte Querformatanordnung bestehen alle 15 Paarprüfungen in den fünf
  Testgrößen; der zuvor verwendete CSS-Stand schlägt mit drei Überschneidungen fehl.

Browser-Prüfungen verwenden die tatsächlichen Server- und CSP-Header.
Keine Zertifikatsausnahmen oder Vertrauensspeicheränderungen. Reale Internet-Räume,
Mobilfunk/NAT, Voice-Chat und physische Safari-/Handygeräte sind hier nicht geprüft.
Stand-Fixtures prüfen den nativen Toon; Spezialfiguren und Auto-Insassen wurden
hier nicht gesondert geometrisch vermessen.
Kein Eingriff in Shop, Social, Konten, Secrets oder bezahlte Dienste.

## Wiederholen

Vorschau aus dem Repository starten:

```sh
PORT=8150 node spiele-dev/neon-flug/server.cjs
node spiele-dev/lebenspfad/static-batches-qa.cjs
node spiele-dev/lebenspfad/instance-chunks-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/solo-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/pause-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/lockstep-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/layout-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/familie-qa.cjs
```

Playwright und dessen Chromium müssen installiert sein; `PLAYWRIGHT_MODULE` und
`PLAYWRIGHT_BROWSERS_PATH` können auf vorhandene Installationen zeigen.
Solo/Pause erlauben `LP_BASE` und `LP_OUT`, Replay `BASE` und `REPORT`.
Layout erlaubt `LP_BASE_URL` und `LP_QA_OUT`. Familie erlaubt ebenfalls `LP_BASE`
und `LP_OUT`; `LP_HTML` lädt für die rote Gegenprobe eine alte Originaldatei.

`bash automation/ci_simulation.sh` wurde versucht, startet hier aber wegen
`mktemp -p "$HOME"` im schreibgeschützten `/home/agent` nicht. Keine Umgehung und
kein lokaler Gesamt-CI-Erfolg behauptet. Reale PR-Prüfungen, Hauptseiten-Deployment
und anschließender HTTPS-Quellenvergleich werden gesondert kontrolliert.
