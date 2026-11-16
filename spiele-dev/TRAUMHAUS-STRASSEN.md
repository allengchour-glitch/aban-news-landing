# Traumhaus: Strassenanschlüsse

Stand: 16.11.2026, Branch `codex/traumhaus-strassen-20261116`. Die unten aufgeführten lokalen Prüfungen sind abgeschlossen. Entwurfs-PR #3216 besteht; CI und Veröffentlichung stehen noch aus.

## Änderungen

QUELLE: Änderungen in `traumhaus.html` und `js/traumhaus-stadt.js`.

- **Hauptring:** Die vier Anschlüsse der Hauptstrassen erhalten passende Öffnungen im inneren Ringgehweg und in dessen Randlinien. Seitliche Gehwege und Bordsteine reichen jetzt bis zum Ring.
- **Bahnhof:** Parkplatz, Gehwegöffnungen und Randlinien verwenden dieselbe früh initialisierte Quelle `BAHNHOF_ZUFAHRT`. Dadurch entfällt auch der im Gegentest gefundene Startfehler durch zu spät verfügbare Parkplatzdaten. Ein gemeinsamer Asphaltbelag mit Trennlinie und Richtungspfeilen schliesst die Grasritze zwischen Ein- und Ausfahrt.
- **Strandzufahrt:** Die Pflanzenplatzierung berücksichtigt die Zufahrt samt Reserve; die betroffene Laterne steht neben der Fahrbahn. Die bestehenden Tiere auf der Zufahrt wurden in die vorhandene Bauernhofkoppel versetzt, ohne die Gesamtzahl oder Bewegungslogik zu ändern.
- **Schräge Zubringer:** Gehwege und Bordsteine werden an tatsächlichen fremden Fahrbahnflächen ausgeschnitten; das Kiesbankett erhält entsprechende Ausschnitte. Der Helfer arbeitet einmal beim Weltaufbau und erhält Normalen sowie Texturkoordinaten. Eigene Mittelstriche bleiben erhalten.
- **Nordstadt und Rennkurs:** Auch schmale Depot-, Garagen- und Servicezufahrten zählen als Kreuzungen. Mittelstriche halten Abstand zur ganzen Mündung; Überwege passen zur Fahrbahnbreite. Zyklische Endtangenten schliessen die Rennstreckennaht. Der Rennrandstein ist an der Zufahrt geöffnet.
- **Asphaltfarbe:** Der neue Belag ist an den bestehenden Asphalt angeglichen. Die Markierungen bleiben bei Nacht und Regen sichtbar.
- **Fahrzeugpause:** Bei Ergebnisanzeige, Stadtpanel, Karte und Renncountdown hält das Fahrzeug jetzt vollständig still. Der Gegentest hatte zuvor langsame Rückwärtsbewegung während der gesperrten Steuerung nachgewiesen.
- **Ortstafel am Nordring:** Das Schild ist aus der Bauernhoffahrbahn versetzt. Die Platzierungsprüfung berücksichtigt die gedrehte Modellhülle, benachbarte Fahrbahnen und Gebäudevolumen.

## Gemessene Prüfungen

Die folgenden Zahlen sind **GEMESSEN**. Netz, GPS und Fahrten wurden nach den Strassenänderungen erneut geprüft; der abschliessende Pausentest deckt die anschliessende Fahrzeugsperre ab.

| Prüfung | Ergebnis und Einordnung |
| --- | --- |
| Netz | 16'776 Punkte ohne Wasser-, Gebäude- oder Baukollision. Der separat untersuchte Landring mit ungeprüftem Belag ist darin ausdrücklich nicht enthalten. |
| GPS | 80 Routen ohne ungültige Wegpunkte. |
| Fahrten | Kernrundfahrt 525,38 m, Nord-Ost-Verbindung 636,24 m, Nordpark 292,84 m und Strandzufahrt 44,22 m; alle Ziele erreicht, kein Festfahren. Depotfahrt über 222,65 m abgeschlossen. |
| ÖV | 22 freie Halte, 3'613 Busproben ohne Blockade. Auf allen 5 Linien Einsteigen, Mitfahrt und freies Aussteigen bestätigt. |
| Rennfahrt | 16 Checkpoints über 2 Runden und 1'339,70 m abgeschlossen; kein Festfahren, keine Strafzeit. |
| Hauptring nach Korrektur | 180 Fahrbahn- und 56 Gehwegproben bestätigen die geöffneten Anschlüsse und fortgesetzten Seitenwege. |
| Strand nach Korrektur | 560 Proben; keine erlaubte Pflanzenplatzierung auf der geprüften Zufahrt und keine physische Blockade. |
| Bahnhof nach gemeinsamem Belag | Beide Zufahrten je 15,51 m bei 23 km/h gefahren, keine Stillstände oder JavaScript-Fehler. |
| Schnitthelfer | Zwei unabhängige Prüfungen: 9 Geometriefälle ohne Fehler sowie 32 Fälle mit insgesamt 15'808 Punktproben ohne Abweichung. Drehungen, Polygonrichtung, Überlagerungen, Normalen und Texturkoordinaten berücksichtigt. |
| Schnittkosten im geladenen Browser | 174 Aufrufe, 9 veränderte Meshes; insgesamt einmalig 9,90 ms, längster Aufruf 1,2 ms auf der Test-CPU. |
| Originalcode im VM-Gegentest | Überlagernde Gehweg- und Kiesschichten entfernt; benachbarter Gehweg und alle 16 eigenen Mittelstreifen erhalten. Objektzahl unverändert. |
| Stadtmodul | Bauplan und alle 148 Gebäudekollider identisch. 47'792 → 47'878 Dreiecke; unverändert 66 Mesh-/Instanzgruppen, keine zusätzlichen Materialien oder Texturen für diese Geometriekorrekturen. |
| Rennkurs | Nahtversatz 0,687 m → 0 m; Randsteintreffer im Raster der Einfahrt 128 → 0. Asphalt an den zuvor offenen Stellen per Raycast bestätigt. |
| Asphaltfarbe bei Tag | Gemessener RGB-Abstand der Vergleichsflächen 126 → 9,8 mit dem übernommenen Materialfarbwert `0x121216`. Dies belegt die Annäherung in dieser Beleuchtung. |
| Asphalt bei Nacht und Regen | Nacht, Tagesregen und Nachtregen geprüft, Markierungen sichtbar, keine JavaScript-Fehler. Beispiel Nacht: Asphalt RGB 46/38/32, Linie 129/124/119. Der unbeleuchtete Motorsportbelag ist bei Nachtregen sehr dunkel; Start- und Randmarkierungen bleiben lesbar. |
| Tiere und Vollweltabgleich | 8 Koppeltiere, davon 3 Kühe, 2 Schweine und 3 Hühner; Tierkästen im geladenen Browser innerhalb des Zauns, ohne Tor-/Trogüberlapp. Keine Tiere auf der Strandfahrbahn zum Messzeitpunkt. Originalbewegung mit tatsächlichen Modellabmessungen: 4 Läufe mit je 10'000 Schritten über je 200 Sekunden ohne Teleport oder Zaun-, Trog- und Strassenkontakt. |
| Fahrzeugpause | Zuvor 0,965 m Drift in 10 Sekunden. Danach 16 Browserfälle: 4 Sperrzustände bei 30/60/120 Hz jeweils 10 Sekunden, zusätzlich je ein Schritt mit 0,4 Sekunden. Position, Drehung und Geschwindigkeit bleiben exakt unverändert beziehungsweise null. Rückwärts- und Vorwärtsfahrt funktionieren nach Freigabe; normale Fahrphysik im Schrittvergleich unverändert. |
| Nordring-Ortstafel | Alle 23 untersuchten Schilder/Haltestellen erhalten, genau 1 Ortstafel versetzt. Gedrehte Modellhüllen gegen 195 Fahrbahnpolygone, Nachbarstrassen und 407 Gebäudevolumen geprüft. Konservative Hülle rund 1,91 m von der Bauernhofasphaltkante entfernt; im geladenen Browser rund 1,93 m, keine Fahrbahn- oder Gebäudekonflikte. Gegenbild bestätigt die Position. |

Lokale Hauptbelege: `/tmp/th-strassen-final-agent.log` für Netz/Fahrten, `/tmp/th-transport-isoliert-agent.log` für den erfolgreichen ÖV-/Renngegentest, `/tmp/th-strassen-fortsetzung.log` und `/tmp/th-asphalt-licht-auswertung.json` für Schnittkosten/Farbe, `/tmp/th-koppel-{agent.log,bounds.json}` für Tiere, `/tmp/th-fahrpause-final-agent.log` und `/tmp/th-fahrpause-normalvergleich.json` für die Fahrzeugpause sowie `/tmp/th-schilder-agent.log` und `/tmp/th-nordring-schild-final.json` für die Ortstafel. Frühere Schnitt- und Modulbelege liegen unter `/tmp/th-strassen-*`. Diese temporären Dateien gehören nicht zum Repository.

## Veröffentlichung und Grenzen

Die erfolgreichen Browserläufe einschliesslich der letzten Ortstafelkontrolle melden keine JavaScript-Fehler. Die Streckenprüfungen decken die beschriebenen Stichproben und Fahrten ab, keine vollständige Abnahme sämtlicher Stadtmöbel. Der Pausentest verwendet den echten Eingabe- und Fahrzeugcode ohne geladene GLB-Modelle und prüft deshalb keine Darstellung.

Veröffentlichung erst nach den erforderlichen grünen PR-Prüfungen und anschliessendem Live-Gegentest dokumentieren.

Browserprüfungen und Geometriezahlen belegen keine stabilen 60 FPS auf einem realen Handy. Eine solche Gerätemessung liegt weiterhin nicht vor.
