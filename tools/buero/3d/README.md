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
| `kb3d-tex.js` | alle Texturen werden zur Laufzeit gezeichnet: Böden, Bildschirminhalte, Himmel, Tafel, Kärtchen, Bildchen, Arbeitsort-Schilder (`T.ortSchild`), **Liveboards** (`T.liveboard`, `T.liveboardUebersicht`) |
| `kb3d-props.js` | Kleinteile aus Quadern (Tischkram, Serverschrank, Paletten, Pflanzen, Kleinmöbel); Rückfall, wenn ein Modell fehlt |
| `kb3d-model.js` | liest die Modell-Pakete (`window.KB3D_PACK`), rechnet Normalen, Farbpalette, backt Gruppen zusammen |
| `kb3d-figur.js` | eigene runde Charaktere mit gemeinsamen Gelenken: Haltungen tippt, Kaffee, Hand am Kopf, Arme hoch, schläft; `jointLift` hellt Schultern und Ellbogen auf (Wert je Eckpunkt, im Shader `vL`) |
| `kb3d-world.js` | der Campus: sieben Pavillons mit Gassen (Raum-Koordinaten u/v, `ROOMS`, `huelle()`), je Raum Rückwand mit Liveboard-Rahmen (`liveBoard()`), Campusplatz mit Zentralmonitor, Pausengarten, Förderband, Lieferwagen an der Rampe, je Platz ein Arbeitsort-Schild (`W.ortTex`, Lage nach Blickrichtung), `W.updateLive` (Bilder der Bretter) |
| `kb3d-buero.js` | Zusammenbau: Kamera-Bedienung, Treffer, Beschriftungen, Bildchen, Schleife, Rückfälle (`K.Buero.supported/mount`), Modelle der Liveboards aus den Zeilen (`liveModelle`), Monitoransicht für alle Bretter (`monitor:<Raum>`, `monitorNext/Prev/Back`) |
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


### Verfeinerung der Arme

Die Arme verwenden durchgehende, verjüngte Ärmel mit Radiusprofil statt überlagerter Kugeln. Schulter, Ellbogen und Handgelenk sind schmaler; die Hände bestehen aus einer flacheren Handfläche, einem Daumen und angedeuteten Fingern. Ein durchgehend geformter Oberkörper glättet den Schulteranschluss. Die lokale Gelenkaufhellung ist auf höchstens 21 Prozent reduziert, damit die Gelenke keine hellen Kugeln bilden. Gelenkkoordinaten und Haltungen bleiben kompatibel.


### Verfeinerte Mitarbeiter und ruhigere Bewegungen

Die gemeinsame Designversion `campus-einheitlich-2` ergänzt kleinere Augen, feinere Hände, Stoffkragen, Ärmelbündchen und eine eigene kurze Frisur für die dritte Grundform. Arbeiten und Prüfen bewegen sich langsamer; Alarm hebt eine Hand ohne Springen. Die Ruhehaltung bleibt aufrechter. Bei reduzierten Bewegungen bleiben die Augen außerhalb der Schlafhaltung offen, statt zufällig mitten im Blinzeln stehenzubleiben.

Für Webansicht und Claude das vollständige aktuelle Designpaket übernehmen. Der Versionsschutz lehnt eine Mischung mit der vorigen Darstellung ab. Die Haltungen zeigen weiterhin nur den aus den geladenen Daten abgeleiteten Zustand; sie bestätigen keine neuen Fähigkeiten oder aktiven Hintergrundläufe.

### Fachrollen im gemeinsamen Design

`campus-einheitlich-3` ergänzt kompakte Fachteam-Karten an den vorhandenen Arbeitsplätzen und im Chefbüro. Analyse trägt Brille, Kommunikation Headset; Stofffarben unterscheiden Entwicklung, Analyse, Kommunikation, Logistik und Leitung. Die Rolle wird aus der Aufgabenverteilung gewählt; Haut, Haar und gemessene Haltung bleiben erhalten. Die zusätzliche Darstellung erzeugt keine neuen Hintergrund-Agenten. Webansicht und Claude erhalten dasselbe vollständige Designpaket; die fachlichen Planungsdaten stammen aus den Berichten.

### Modernes Chefbüro und Geldmanager-Wand

`campus-einheitlich-4` verwendet im Chefbüro helle Tischflächen, kühlere Bodenfarben, Akustikflächen und dezente Lichtleisten. Die große Wand zeigt qualitative Hinweise zur Kostenbasis und Pilotkalkulation, keine erfundenen Gewinne oder Kontowerte. Antippen öffnet den privaten Rechner. `bauen.mjs` schreibt zusätzlich `kb-geldmanager.js`; dieses eigene Dokument gehört zusammen mit HTML, 3D-Code und drei Modellpaketen ins vollständige Claude-Designpaket. Der Rechner selbst ist vom 3D-Modell unabhängig und funktioniert auch ohne WebGL.

### Campusplatz mit grosser Monitorwand

`campus-einheitlich-8` ergänzt einen21×6,4 grossen gemeinsamen Platz zwischen Hauptgebäude und Studios. Die drei Studios rücken um vier Welteinheiten nach hinten; Gänge und Raumkameras folgen. Zwei Sitzbereiche, Pflanzgefässe und ruhige Bodenfugen rahmen die freistehende Monitorwand. Keine neuen Modelle, Texturen von Drittanbietern oder Bibliotheken. Der Monitor teilt die vorhandene Infowand-Textur und zeigt Einträge, Stopps und alte Messungen aus den geladenen Daten. Antippen öffnet die vollständige Liste. Desktop-Knopf und mobile Raumauswahl führen direkt zum Campusplatz.

HTML und 3D-Code gemeinsam aktualisieren. Das Designpaket enthält keine privaten Bürodaten und darf bestehende Messstände in Claude nicht ersetzen. Lokal mit Software-WebGL bei1440px und390px geprüft; echte Handy-GPU-Leistung nicht gemessen.

### Spielartige Monitoransicht

`campus-einheitlich-9`: Ein Klick auf die zentrale Monitorwand fährt die Kamera frontal zum Bildschirm. Die Monitoransicht hat einen eigenen Zurück-Knopf, Vollbild und einen separaten Knopf zur Gesamtliste. Zurück oder Escape stellt die vorherige Kameraposition wieder her. Normale Raumwahl beendet die Monitoransicht. Grössenwechsel passen den Abstand an; reduzierte Bewegungen überspringen die Kamerafahrt. Keine neue Datenquelle oder Kontoaktion.

### Geschützte Rankinganzeige

`campus-einheitlich-10` ergänzt im Büro und der Monitorleiste den Link zur privaten Ranking-/SEO-Ansicht und einen direkten Chat-Auftrag. Der Link überträgt weder Zugangsdaten noch Suchmesswerte an die öffentliche Website. Google-Daten bleiben ein datierter, verzögerter Messstand. Der Knopf öffnet einen Auftrag und bestätigt keine Ausführung. Das gemeinsame Claude-Paket enthält dieselben Bedienelemente.


`campus-einheitlich-11` vergrößert die Arbeitsfläche auf bis zu112rem, die Desktopbühne auf80 Prozent der Fensterhöhe und die Handyansicht auf72 Prozent. Vier Statuskarten erklären die vorhandenen Messstände; Vollbild und Monitormodus blenden sie aus. Die private Rankingvorlage hat größere Zahlen, einen höheren Verlauf und Begriffserklärungen. Keine neuen Datenquellen oder automatischen Kontoaktionen.


`campus-einheitlich-12`: Nach echten Screenshots Büro vor Auftragsknöpfe gelegt, Statuskarten/Erklärung unter die Bühne verschoben und dunkle Kopfkarte einschließlich Messzeit lesbar gemacht. Mobile3D startet am Campusplatz mit an Hochformat angepasstem Abstand. Die leichte2D-Startansicht am Handy bleibt wählbar und unverändert als Standard; keine neue Datenquelle oder Kontoaktion.


`campus-einheitlich-13` ergänzt den geschützten Metricool-Monitor in Werkzeugen und Monitorleiste. Die generische Vorlage `../metricool_monitor.html` enthält nur einen Platzhalter. Echte Kanal-/Kalenderwerte bleiben außerhalb des Repositorys und auf der bestehenden privaten Büro-Seite. Geplante Einträge, publizierte Inhalte und Reichweite sind getrennt; kein Dauersync oder Publisher.


## Liveboards und sieben Pavillons (Design campus-einheitlich-14, 10.11.2026)

Auftrag des Besitzers: in jedem Büro ein grosser Monitor mit Dashboard-Inhalt, dazu viel grössere, weniger enge Räume. Gesamtbeschreibung, Messwerte und Grenzen: `docs/KI-BUERO-SEITE.md`, Abschnitt «Liveboards und grössere Räume».

- **Raum-Koordinaten:** jeder Raum wird mit `beginRoom(name)` … `endRoom()` in eigenen Koordinaten gebaut (u nach Osten, v nach Süden, Ursprung an der nordwestlichen Aussenecke; Grösse `K.ROOM_SIZE` = 10,4 × 8,0 m). Die Plätze stehen in `SEATS` mit `u`/`v`; die Weltkoordinaten (`x`, `z`) rechnet das Modul aus `ROOMS` aus. Aufrufe von `P.serverRack` (schreibt in die LED-Netze) und der Platz des Besitzers stehen ausserhalb des Raum-Blocks in Weltkoordinaten.
- **Der Platz des Besitzers kommt zuletzt in `SEATS`** (die Seite nimmt immer den letzten Platz für ihn).
- **Warum Pavillons:** die Kamera sitzt im Südosten (`az` 0 bis 1,5), sichtbar sind nur Nord- und Westwände. Jeder Raum hat deshalb eine eigene hohe Nordwand (3,8 m) und davor eine Gasse von 3,4 m, damit die Wand den Raum dahinter nicht verdeckt.
- **Liveboard:** `liveBoard(name, uc)` baut Rahmen und Bild-Fläche (4,8 × 2,4 m, Textur 1024 × 512 ohne Mip-Stufen) und legt `W.live[name]` an (`c` Mitte, `w`, `h`, Pick-Quader `mn`/`mx`). `W.updateLive(modelle)` zeichnet ein Bild nur neu, wenn sich der Inhalt (JSON des Modells) ändert. Die Modelle baut `liveModelle()` in `kb3d-buero.js` aus den Einträgen der Seite (`ents`: Name, Zustand, Ereignistext, Frische 0 bis 1, Sonderzahl) und der Schweizer Uhrzeit (neu gezeichnet, sobald die Minute wechselt).
- **Zentralmonitor:** `W.overview` und `W.campusPanel`, breites Brett (6,4 × 3,2 m) bei z = 11, Bild `T.liveboardUebersicht`.
- **Monitoransicht:** `cmd('monitor:<Raum>')` oder `cmd('monitor:Zentral')`; die Kamera zielt auf `c` des Bretts (`az` 0, `el` 0,22 beziehungsweise 0,08 beim Zentralmonitor, damit Figuren den unteren Rand nicht verdecken), Beschriftungen, Marken und Sprechblasen sind aus. `cfg.onMonitorMode(an, name)` meldet den Namen an die Seite.
- **Prüfhilfen für Tests:** `made.debug.live()`, `.monitor()`, `.project(x, y, z)`, `made.liveModelle()`, `made.W`, `made.R`.
- **Prüfung:** `../pruefung/test_liveboard.js` (39 Prüfungen) und `../pruefung/mutation_liveboard.py` (17 absichtliche Fehler).

