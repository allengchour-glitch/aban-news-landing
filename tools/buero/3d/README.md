# KI-Büro in 3D

Der Tab «Büro 3D» der KI-Büro-Seite (Dashboard, privat). Vier Räume als Modell, in jedem sitzen die Figuren der echten Automaten und Sitzungen an echten Schreibtischen.
Stand und Zahlen: `docs/KI-BUERO-SEITE.md`, Abschnitt «3D-Büro».

## Warum eine eigene Engine
Der Dashboard-Typ lässt als Skript nur **eigene Dateien des Dashboards** zu (jedes Dokument höchstens 256 KB). three.js von einem CDN fällt damit aus.
`kb3d-engine.js` ist darum eine kleine WebGL-Engine (Matrizen, Netzbauer, Kamera, Zeichner mit Farbpalette, flache Schatten, Bildtafeln). Keine Bibliothek, kein Netz.

## Dateien
| Datei | Aufgabe |
|---|---|
| `kb3d-engine.js` | Matrizen, Netzbauer (Quader, Zylinder, Kugel, Ring), Kamera, Zeichner, Treffer-Test |
| `kb3d-tex.js` | alle Texturen werden zur Laufzeit gezeichnet: Böden, Bildschirminhalte, Himmel, Tafel, Kärtchen, Bildchen, Arbeitsort-Schilder (`T.ortSchild`) |
| `kb3d-props.js` | Kleinteile aus Quadern (Tischkram, Serverschrank, Paletten, Pflanzen, Kleinmöbel); Rückfall, wenn ein Modell fehlt |
| `kb3d-model.js` | liest die Modell-Pakete (`window.KB3D_PACK`), rechnet Normalen, Farbpalette, backt Gruppen zusammen |
| `kb3d-figur.js` | eigene runde Charaktere mit gemeinsamen Gelenken: Haltungen tippt, Kaffee, Hand am Kopf, Arme hoch, schläft; `jointLift` hellt Schultern und Ellbogen auf (Wert je Eckpunkt, im Shader `vL`) |
| `kb3d-world.js` | das Gebäude: Böden, Wände, Fenster, Trennwände, die vier Räume, Förderband, Lieferwagen an der Rampe, je Platz ein Arbeitsort-Schild (`W.ortTex`, Lage nach Blickrichtung) |
| `kb3d-buero.js` | Zusammenbau: Kamera-Bedienung, Treffer, Beschriftungen, Bildchen, Schleife, Rückfälle (`K.Buero.supported/mount`) |
| `pack/glb2pack.mjs` | wandelt `models/*.glb` in Pakete um (Liste `LISTE`, je Modell Ziel-Dreiecke) |
| `bauen.mjs` | bündelt alles für das Dashboard |

## Bauen und ablegen
```
node tools/buero/3d/bauen.mjs <Ordner>        # schreibt kb3d-code.js und kb3d-pack-1..3.js (alle unter 256 KB)
```
Ablegen im Speicher des Dashboards: je Datei ein Dokument `files/<Name>` mit `{text, edit}` (zuerst die `kb3d-*`, **zuletzt** `index.html`, damit die Seite nie auf fehlende Dateien zeigt).
Grössen prüfen: das JSON-Dokument muss unter 262 144 Byte bleiben (Anführungszeichen werden im JSON doppelt gezählt). Die Seite selbst ist `tools/buero/seite.html`.

## Modelle (Herkunft)
Aus dem Ordner `models/` des Repos (Traumhaus-Spiel). **STL tragen keine Farben und keine Teile**, darum liest der Umwandler die GLB-Zwillinge derselben Modelle (gleiche Dreiecke, dazu Materialfarben und Teilestruktur).
21 Modelle, nach dem Verkleinern 48 443 Dreiecke: Menschen `th30_mensch_mann/_frau`, `th30_arbeiter` (in Gruppen Kopf, Augen, Rumpf, Arme, Beine), Schreibtisch, Bürostuhl, Sofa, Ladenregal, Empfangstheke, Küchenzeile, Pflanzkübel (`th11_*`), Lieferwagen `th7_lieferwagen`, Paketwagen `th41_gepaeckkarre`, Relaxsessel und Garderobe (`th2_*`), dazu sieben einfache Stücke (`th_sessel`, `th_buecherregal`, `th_pflanze`, `th_kuehlschrank`, `th_lampe`, `th_tisch`, `th4_muelleimer`).
Herkunftsvermerke: `models/TH5-ASSETS.md` (CC0 bzw. eigenproduziert, Generator-Skripte unter `tools/assets/`) und `models/ASSET-CREDITS.md` (Kenney Furniture Kit, CC0). **Für die sieben einfachen Stücke steht kein Vermerk in den Credit-Dateien**: vor einer öffentlichen Weitergabe klären (die Seite selbst ist privat).
Modelle mit Texturen (z. B. `th_laptop`, `th_wanduhr`) lässt der Umwandler weg (Textur und Glas werden übersprungen).

## Aufbau der Modell-Pakete
Je Modell: Box `b`, Palette `pal` (r, g, b, leuchtet) mit Namen `n`, Gruppen `g`, Teile `p = [Gruppe, Farbplatz, v0, vn, t0, tn]`, Daten `d` (base64: Eckpunkte als Int16, danach Dreiecke als Uint16).
Verkleinert wird je Teil durch Zusammenfassen von Eckpunkten in einem Raster (Vertex-Clustering), Teile unter 40 Dreiecken bleiben, Mindestgrösse je Teil 24. Die Farbe kommt zur Laufzeit aus einer Palette (Vertex-Shader), darum lassen sich Hemd, Hose, Haut, Haar, Schuhe und Möbelfarben je Figur und Platz ändern.

## Grenzen
- Nur im Nachbau gesehen (Chromium mit Software-WebGL), nicht im echten Dashboard auf einem Handy. Bildrate und Aufwärmzeit auf echten Handys sind ungemessen.
- Gemessen im Nachbau: Aufbau rund 150 ms, 437 Zeichenaufrufe und rund 230 000 Dreiecke je Bild, CPU rund 1,3 ms je Bild. Wird es zu langsam (Mittel über 40 Bilder über 42 ms), sinkt die Auflösung auf 1, dann entfallen die Schatten.
- Die Haltung einer Figur ist aus dem Alter des letzten Ereignisses abgeleitet (wie in 2D), kein Livesignal.


## Neue Figuren vom 07.11.2026

Die Figuren werden jetzt in `kb3d-figur.js` als eigene, runde Charaktere gebaut. Sie ersetzen die bisher gezeichneten Menschen aus den `th30_*`-GLB-Modellen. Kopf, Ohren, Nase, Augen mit Iris und Lichtpunkten, Frisuren, Hände, Kleidung und Schuhe entstehen aus glatten Grundkörpern. Drei Grundformen teilen Farbpalette und Gelenkkoordinaten; Haut, Haare und Kleidung variieren je Platz. Brille und Kopfhörer passen zum grösseren Kopf. Vorhandene Haltungen und Gelenkaufhellung bleiben aktiv.

Es kommen keine externen Assets oder Bibliotheken hinzu. Die alten Menschen bleiben im unveränderten Modellpaket enthalten, werden aber nicht mehr für die Figuren geladen. Zum Übertragen genügt das neu gebaute `files/kb3d-code.js`. Die Zahl der gezeichneten Dreiecke steigt; die bestehende Anpassung der Auflösung und Schatten bleibt aktiv. Darstellung und Haltungen wurden im lokalen Chromium-Nachbau angesehen, die Leistung auf einem echten Handy ist nicht gemessen.
