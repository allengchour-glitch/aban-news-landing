# Lebenspfad: Landschaft und Umgebung

Benutzerauftrag vom 16.11.2026: Landschaft und Umgebung schöner gestalten.
Grundlage: `origin/main` 9899714f8, einschließlich veröffentlichter Lebenspfad-
Überarbeitung aus PR3179. Spiele-Veröffentlichung ist bereits freigegeben.

## Gestaltung

- Zusammenhängendes, leicht facettiertes Gelände mit Hügeln und gebogenen
  Übergängen zwischen acht Wiesen-, Sommer-, Herbst- und Winterpaletten.
  Ein kleines prozedurales Bodenkorn ersetzt glatte Kunststoffflächen.
- Baumgruppen aus asymmetrischen Laubbäumen, Blütenkronen und mehrstufigen Tannen;
  warme Herbstfarben und kühle Wintertöne. Niedrige Sträucher rahmen den Weg.
- Bestehende Teiche haben modellierte Ufer, Steine, Schilf und Seerosen.
  Ein zusätzlicher Teich mit Holzsteg liegt nahe der Kindheitsroute.
  Enten bleiben innerhalb der jeweiligen Wasserellipse; neue Wasserbewegung
  respektiert die Einstellung für reduzierte Bewegung.
- Zufällige Pastell-Streudekorationen und nahe, unbewegliche Wolken entfernt.
  Die Kapitelgebäude und spielbezogenen Landmarken bleiben vorhanden.
- Gebäude und Requisiten verwenden die tatsächliche Geländeoberfläche.
  Ein Höhensampler berücksichtigt die versetzten Terrain-Dreiecke, damit die
  analytische Höhenkurve nicht als abweichende Auflage verwendet wird.
- Felder, Nebenrouten und Bauwerke bleiben frei. Die Uferplatzierung verwendet
  dieselben Gebäudespezifikationen wie die Modell-Loader. Eine beim ersten
  Bilddurchgang bestätigte Haus-/Teichüberschneidung wurde so beseitigt.

Alle neuen Landschaftselemente entstehen lokal aus Geometrie und eigenem Hash.
Keine neuen Modelle, Downloads, Bibliotheken, bezahlten Dienste oder Änderungen
an Spielwertung, Spiel-Zufall und Netzwerkprotokoll. Neue Module tragen Inhalts-
Hashes. Statische Instanzen werden weiterhin vom vorhandenen Chunker geteilt.

## Prüfung

GEMESSEN mit echtem Three.js r128:

- Acht Terrain-Prüfgruppen: endliche Geometrie, echte Haupt-/Nebenrouten,
  interpolierte Bodenfreiheit, deterministische Farben, Wasserhöhen, Chunking,
  Cleanup und 50 Höhenvergleiche mit einem echten Raycaster.
- Sieben Vegetations-Prüfgruppen: freie Felder/Modellanker, deterministische
  Platzierung, Kronen innerhalb ihrer reservierten Fläche, 70/48 niedrige
  Sträucher für Desktop/Touch und korrekte Frustum-Grenzen.
- Fünf Ufer-Prüfgruppen: flacher und schräger Untergrund, Wasserpflanzen,
  Steg über der Wasserlinie, Pfosten bis zum Grund und echte Chunker-Kompatibilität.
- 16 Kapitelansichten bei 1280×800 und 390×844, zusätzlich Panorama. Keine
  ungültigen Vertices oder Browserfehler. Alle 175 Felder/Nebenrouten bleiben
  über dem Boden; keine Überschneidung neuer Teiche mit den 19 geladenen,
  geprüften Gebäude-/Requisitengruppen.
- Bestehender Layoutlauf erneut bestanden: fünf Bildschirmgrößen, 25 erreichbare
  HUD-Mittelpunkte, 15 freie Überlappungspaare und sieben Stand-/Gesten-Snapshots.
- Zweiclient-Lockstep-Replay erneut bestanden: 16 Würfe, neun Entscheidungen,
  zwei Gabelungen und 26 gleiche Kontrollpunkte. Transportattrappen;
  kein echter PeerJS-/Internet-Verbindungstest. Alle 26 Kontrollpunkt-Hashes,
  der finale Kartenzustand und die gesamte Spiel-RNG-Sequenz entsprechen außerdem
  dem vorherigen veröffentlichten Stand; End-Saat 47926930.
- Echter kurzer Solo-Lauf mit Touch-Browserkontext erneut bis zum Lebensabend:
  18 Würfe, zehn Entscheidungen, Save/Reload identisch fortgesetzt, Abschluss
  genau einmal gezählt und neues Leben danach bedienbar. Keine Positions- oder
  Zustandsfixtures in dieser gesonderten Kampagne; keine Browserfehler.

Kapitel- und Panoramaaufnahmen verwenden ausdrücklich Positions-/Kamerafixtures.
Sie sind kein Nachweis eines vollständigen Spielverlaufs. Bilder und Messwerte:
[belege-landschaft](belege-landschaft/).

## Grafikaufwand und Grenzen

GEMESSEN in Chromium/SwiftShader, 1280×800, DPR1, Auto-Profil, Renderverhältnis
0,55, Schatten aus, jeweils sechs Sekunden auf dem Startfeld nach den Ansichten:

| Messwert | Vorher | Nachher |
| --- | ---: | ---: |
| rAF/s | 13,70 | 12,09 |
| Median Frameabstand | 66,7 ms | 83,3 ms |
| 95. Perzentil | 100,0 ms | 100,1 ms |
| Zeichenaufrufe im letzten Bild | 271 | 243 |
| Dreiecke im letzten Bild | 52.375 | 47.231 |

Weniger sichtbare Geometrie bedeutet hier keine gemessene Beschleunigung:
Der Software-Renderer ist im Median langsamer. Die Gestaltung wurde verbessert;
eine höhere Bildrate oder physische Handy-Leistung wird nicht behauptet.
Terrain: 20.480 Dreiecke, 583.340 Byte Attribute/Indizes plus 16.384 Byte Bodentextur.
Vegetation verwendet vier Instanz-Materialgruppen; Touch erzeugt weniger Bäume
und Sträucher. Bestehende Grafikprofile und Auflösungsregelung bleiben erhalten.

Öffentliche Chromium-Aufrufe sind in dieser Cloud-Umgebung durch deren
Zertifikatsvertrauen blockiert. Keine TLS-Ausnahme oder Vertrauensänderung.
Echte Mobilgeräte, Safari, NAT, Voice-Chat und Internet-Koop hier nicht geprüft.

## Wiederholen und Veröffentlichung

Vorschau: `PORT=8150 node spiele-dev/neon-flug/server.cjs`.

```sh
node spiele-dev/lebenspfad/terrain-qa.cjs
node spiele-dev/lebenspfad/scenery-qa.cjs
node spiele-dev/lebenspfad/waterside-qa.cjs
PLAYWRIGHT_MODULE=playwright node spiele-dev/lebenspfad/landschaft-qa.cjs
```

Browserpfad über `PLAYWRIGHT_BROWSERS_PATH`, Vorschau über `LP_BASE`, Belege über
`LP_OUT` wählbar. `LP_HTML` lädt für einen getrennten Vergleich die vorherige HTML-
Originaldatei. Layout- und Lockstep-Aufrufe stehen in VERBESSERUNGEN.md.

`ci_simulation.sh` wurde versucht; sein `mktemp -p "$HOME"` scheitert im
schreibgeschützten `/home/agent`. Keine Umgehung und kein lokaler Gesamt-CI-Pass.
Reale PR-Prüfungen, Hauptseitenlauf und anschließender HTTPS-Quellenvergleich
werden getrennt kontrolliert. Keine Shop-/Social-/Konto-/Secret-Änderung.
