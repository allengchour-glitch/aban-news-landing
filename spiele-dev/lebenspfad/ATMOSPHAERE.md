# Lebenspfad · Atmosphäre und eigene Objekte · FREEZE

Abgeschlossen am16.11.2026. Für Parent/Claude Code: **Quellen und Belege sind
fertig; ab jetzt keine weiteren Änderungen durch diesen Agenten.** Keine
Commits, Pushes, Merges oder Veröffentlichung. Parent übernimmt die Integration
und Veröffentlichung nach Arena. Lokale Vorschau läuft auf Port8185.

Worktree `/workspace/aban-lebenspfad-atmosphaere`, Branch
`codex/lebenspfad-atmosphaere`, Basis
`c3088227d5f98ae703de20611e4ce829c52993f2`. Eigentümerauftrag: Landschaft/Licht
sichtbar verbessern und selbst passende Objekte erstellen. Später ausdrücklich
freigegeben: gezielte Erweiterung des Bauplatzplaners. Keine Änderungen an Arena,
Traumhaus, Minispielen, Shop oder Shared-Memory.

## Ergebnis

- Acht ruhige Kapitelpaletten stimmen Himmel, Fernnebel und vorhandenes
  Sonnen-/Hemisphärenlicht aufeinander ab. Warmes Seitenlicht zeichnet Figuren,
  Gebäude und Gelände deutlicher. Kamera und Grafikprofile bleiben erhalten.
- Zwei feste Bergzüge hinter dem Terrain staffeln den Hintergrund. Ihre unteren
  Flächen gehen in Horizontlicht über. In der normalen steilen Brettansicht wirkt
  vor allem das Licht; die Berge werden besonders in Fern-/Panoramaansichten sichtbar.
- Doppelte Sonnen und großer alter Regenbogen sind ersetzt. Der Himmelsverlauf
  ist korrekt sRGB-kodiert. Besonderheit r128: Nebel wird **nach** der Farbausgabe
  gemischt und erhält deshalb die passende Ausgabefarbe. Himmel ohne Tonemapping,
  Lichtfarben linear; keine pauschale Umstellung der bestehenden Materialien.
- Poincarés lokal erstellte Blender-GLBs sind integriert: Willkommenstor am Start,
  Erinnerungsbank mit Platz im Familienkapitel und Sternwarte im Lebensabend.
  Vorderseite+Z schaut zum jeweiligen Bezugsfeld, Fußboden liegt auf dem Terrain.
- Der vorhandene Bauplatzalgorithmus ist als `LPWorldSites.plan` zugänglich.
  Neue Plätze werden **nach** den32 bisherigen angelegt. Alte Positionen bleiben
  bytegleich. Terrainpads, Gewässerplanung und Vegetation erhalten die Reservierungen.
  Kleine zufällige Streudeko in diesen Flächen wird ausgeblendet; ihre bisherige
  kosmetische Ziehfolge bleibt gleich. Kein Eingriff in Spiel-RNG oder Regeln.
- Modellgrenzen werden nach dem Laden frisch gemessen. Übergröße wird abgelehnt,
  Ladefehler betreffen nur die Dekoration. Kein Decoder, keine externe Textur,
  kein neues Licht und kein zusätzlicher Renderpass.

SETZUNG: Nebel55–340 Einheiten. GEMESSEN: zwei Bergmeshes mit zusammen576
Dreiecken; Himmel528 Dreiecke. Die Bergshader mischen nur Farben, ohne
Textursamples, Transparenz, Schatten oder Beleuchtungsberechnung.

## Endgültige Objekte und Plätze

Alle Angaben GEMESSEN am finalen Export und nochmals im WebGL-Spiel geprüft.
Die endgültige Sternwarte hat **2.487** Dreiecke; frühere Zwischenwerte sind überholt.

| GLB unter `models/lebenspfad-eigen/` | Bytes | Dreiecke | Materialien/Meshes | Bezugsfeld |
| --- | ---: | ---: | ---: | ---: |
| willkommenstor.glb | 74.788 | 1.440 | 5/5 | 0 |
| erinnerungsplatz.glb | 88.580 | 1.588 | 5/5 | 98 |
| sternwarte.glb | 90.788 | 2.487 | 5/5 | 134 |

| Bauplatz | X | Z | reservierter Radius |
| --- | ---: | ---: | ---: |
| own:welcome | −162,9953 | −47,9813 | 3,6 |
| own:memories | 90,6260 | −15,9665 | 4,0 |
| own:observatory | 185,9161 | −13,3675 | 4,2 |

[Objekt-Doku, Grenzen und Reproduktion](eigene-objekte/README.md),
[Export-Messwerte](eigene-objekte/messwerte.json),
[acht Gegenprüfungen des Objekt-Agenten](eigene-objekte/pruefung.json),
[Blender-Kontaktbogen](eigene-objekte/kontaktbogen.png).
Alle Einträge in `eigene-objekte/FREEZE.sha256` frisch nachgeprüft.
Higgsfield MCP / 3D Jutsu waren nicht angeschlossen. Ausschließlich lokale
Blender-Erstellung; keine Behauptung über ein Higgsfield-Konto oder einen Plattformlauf.

## Prüfung und echte Bilder

Vorher- und Nachherbilder tatsächlich angesehen, einschließlich Desktop,
Touch390×844, aller Kapitel, Panorama und Detailsprofil mit Schatten. Die erste
seitliche Objektplatzierung lag mobil außerhalb des Bildes; mit unveränderter
Kamera über den Planer korrigiert. Die finalen drei Objektzentren liegen bei
Desktop/Touch im normalen Bildausschnitt. Alle Modelle stehen auf dem Boden.

- Neue CPU-QA: acht Gruppen grün.175 Knoten/178 Kanten und32 alte Bauplätze
  bytegleich; alle neuen Kreise frei von Feldern, Wegen, anderen Bauwerken und
  Gewässern;72 Terrain-Raycasts an neuen Plätzen; deterministische Planung;
  30/60Hz-Farbübergang,0dt-Stillstand, Cleanup und Übergrößen-Gegenprobe.
- Bestehende CPU-QA grün: Terrain8, Pfad13, Wegdarstellung mit3.213 Raycasts,
  Bauplätze13, Vegetation7, Ufer5, statisches Batching11, Instanzabschnitte7 Gruppen.
- Finaler Landschaftslauf:16 Kapitelansichten,25 geladene Modellgruppen, keine
  ungültigen Vertices/Browserfehler. Alle175 Felder über dem Boden, keine
  Teich-/Modellüberschneidung. Kleinster konservativer Abstand geladener Modelle:
  1,5874 Einheiten zu Feldsockeln und2,5639 zu Verbindungen.
- Eigene Browser-QA: alle drei endgültigen GLBs geladen, Budgets/Bounds/Fußhöhe
  geprüft; keine Überschneidung mit sichtbaren bestehenden Objektgruppen.
  Detailsprofil mit Schatten bestanden. Keine JS-/Shader-/Konsolenfehler.
- Acht Kapitel × Desktop/Touch: vollständig vernebelte schwarze Fläche und
  Himmelshorizont haben **0 RGB-Abweichung** im tatsächlichen64×64-RenderTarget.
  Bewusst falsch linear kodierter Nebel schlägt erwartungsgemäß fehl
  (37–62 Kanalwerte Unterschied). Diese rote Gegenprobe ist beabsichtigt.
- Layout: fünf Bildschirmgrößen,25 erreichbare HUD-Mittelpunkte,15 freie
  Überlappungspaare, sieben Stand-/Gestenfixtures grün.
- Online-Replay:16 Würfe, neun Entscheidungen, zwei Gabelungen,26 Kontrollpunkte,
  31 RNG-Aufrufe. Alle26 Hashes und vollständiger Endzustand identisch zu
  `belege-charakter/lockstep.json`; End-Saat47926930. Transportattrappen,
  kein echter PeerJS-/Internet-/NAT-Test. Nach dem Replay wurden nur visuelle
  Platzierung/Streudeko und Belege finalisiert, keine Spiellogik.

| Vorher | Nachher |
| --- | --- |
| [Start](belege-atmosphaere/start-vorher.png) | [Start mit Tor](belege-atmosphaere/desktop-welcome.png) |
| [Panorama](belege-atmosphaere/panorama-vorher.png) | [Bergkulisse](belege-atmosphaere/panorama.png) |
| [Winter auf Touch](belege-atmosphaere/winter-handy-vorher.png) | [Sternwarte auf Touch](belege-atmosphaere/touch-observatory.png) |

Weitere finale Browserbilder: [Tor mobil](belege-atmosphaere/touch-welcome.png),
[Erinnerungsplatz mobil](belege-atmosphaere/touch-memories.png),
[Erinnerungsplatz Desktop](belege-atmosphaere/desktop-memories.png),
[Sternwarte Desktop](belege-atmosphaere/desktop-observatory.png),
[Licht mit Schatten](belege-atmosphaere/licht-schatten.png).
Kapitel-, Objekt- und Panoramaaufnahmen sind Positions-/Kamerafixtures,
keine gespielte Kampagne. Kein neuer kompletter Solo-Lebenslauf behauptet.

## Zeichenaufwand und Grenzen

GEMESSEN: Chromium/SwiftShader, DPR1, Sparsam-Profil mit festem Renderverhältnis
0,65, Schatten aus, gleiche Startkamera und ausgeschaltete Bewegung.
`renderer.info.render` beschreibt den jeweiligen Hauptbildpass.

| Profil | Aufrufe vorher → nachher | Dreiecke vorher → nachher |
| --- | ---: | ---: |
| Desktop1280×800 | 120 → 124 | 21.068 → 23.126 |
| echtes Touch-/Coarse-Profil390×844 | 112 → 118 | 15.168 → 17.061 |

Das ist eine Rendering-Gegenprobe der gesamten Gestaltung inklusive veränderter
Vegetationsreservierungen und neuer Objekte. **Keine isolierte FPS-Messung und
keine Beschleunigungsbehauptung:** parallel liefen Parent-2D-Tests und zeitweise
Blender-CPU-Rendering; rAF schwankte stark. Rohwerte bleiben transparent in den
JSON-Berichten. Neue Assets kosten zusammen254.156 Bytes sowie bis zu15
zusätzliche Modell-Draw-Calls, wenn alle drei sichtbar sind; Schatten kosten
weitere Arbeit. Keine Zusage für reale Handys, Safari oder60FPS.

`bash automation/ci_simulation.sh` versucht: Abbruch bei `mktemp -p "$HOME"`
wegen schreibgeschütztem `/home/agent`. Keine Umgehung. Zudem prüft dieses Werkzeug
nur eingecheckte Revisionen, nicht den WIP. Reale PR-/Deploymentprüfungen und
öffentlicher HTTPS-Vergleich gehören zum Parent-Veröffentlichungsschritt.
Keine TLS-Ausnahme und keine Installation. `node_modules` ist nur der erlaubte
Symlink auf `/tmp/aban-games-audit/node_modules`.

## Dateien, Wiederholung und Freeze

Produktquellen dieser Integration:
`lebenspfad.html`, `js/lebenspfad/atmosphere.js`, `js/lebenspfad/world-sites.js`.
Neue Prüfungen: `spiele-dev/lebenspfad/atmosphere-qa.cjs` und
`spiele-dev/lebenspfad/atmosphere-browser-qa.cjs`.
Dokumentation/Belege: diese Datei und `spiele-dev/lebenspfad/belege-atmosphaere/`.
Vom Objekt-Agenten: alle drei GLBs und `spiele-dev/lebenspfad/eigene-objekte/`.
Bestehende Tests wurden nicht verändert. Beide geänderten/neuen JS-Module tragen
frisch bestätigte Inhaltshashes in HTML.

[Finale Browserdaten](belege-atmosphaere/final.json),
[Geometrie](belege-atmosphaere/geometrie.json),
[gesamte Landschaft](belege-atmosphaere/landschaft.json),
[Detailsprofil](belege-atmosphaere/details.json),
[Layout](belege-atmosphaere/layout.json),
[Replay](belege-atmosphaere/lockstep.json),
[Replay-Vergleich](belege-atmosphaere/lockstep-vergleich.json),
[rote Nebelprobe](belege-atmosphaere/nebel-gegenprobe.json),
[Quell-/Assethashes](belege-atmosphaere/quellen.json),
[abschließende Freeze-Prüfsummen](belege-atmosphaere/FREEZE.sha256).

```bash
PORT=8185 node spiele-dev/neon-flug/server.cjs
node spiele-dev/lebenspfad/atmosphere-qa.cjs
LP_OUT=/tmp/lp-atmo node spiele-dev/lebenspfad/atmosphere-browser-qa.cjs
LP_QUICK=1 LP_GRAPHICS=details LP_OUT=/tmp/lp-atmo-details node spiele-dev/lebenspfad/atmosphere-browser-qa.cjs
# Erwartet rot: absichtlich falsche Nebelkodierung
LP_BAD_FOG=1 LP_OUT=/tmp/lp-atmo-rot node spiele-dev/lebenspfad/atmosphere-browser-qa.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers LP_BASE=http://127.0.0.1:8185 LP_OUT=/tmp/lp-land-final node spiele-dev/lebenspfad/landschaft-qa.cjs
```

Browser-QA nimmt `LP_BASE`, `LP_OUT`, optional `LP_HTML` für eine alte HTML-Datei,
`PLAYWRIGHT_MODULE` und `CHROMIUM_PATH`. Default-Chromium:
`/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome`. Server liefert echte
`_headers`; der Test injiziert ausschließlich QA-Hooks in Browserantworten.

**Restarbeit lokal: keine. Freeze-Grund: Auftrag fertig umgesetzt und geprüft.**
Offen beim Parent: Commit/CI/Veröffentlichung und gegebenenfalls Geräteprüfung.
