# Traumhaus: Strassenanschlüsse

Stand: 16.11.2026, Branch `codex/traumhaus-strassen-20261116`. Lokal umgesetzt; noch unveröffentlicht. Entwurfs-PR und abschliessende Gesamtprüfung stehen aus.

## Änderungen

QUELLE: Änderungen in `traumhaus.html` und `js/traumhaus-stadt.js`.

- **Hauptring:** Die vier Anschlüsse der Hauptstrassen erhalten passende Öffnungen im inneren Ringgehweg und in dessen Randlinien. Seitliche Gehwege und Bordsteine reichen jetzt bis zum Ring.
- **Bahnhof:** Parkplatz, Gehwegöffnungen und Randlinien verwenden dieselbe früh initialisierte Quelle `BAHNHOF_ZUFAHRT`. Dadurch entfällt auch der im Gegentest gefundene Startfehler durch zu spät verfügbare Parkplatzdaten. Ein gemeinsamer Asphaltbelag mit Trennlinie und Richtungspfeilen schliesst die Grasritze zwischen Ein- und Ausfahrt.
- **Strandzufahrt:** Die Pflanzenplatzierung berücksichtigt die Zufahrt samt Reserve; die betroffene Laterne steht neben der Fahrbahn.
- **Schräge Zubringer:** Gehwege und Bordsteine werden an tatsächlichen fremden Fahrbahnflächen ausgeschnitten; das Kiesbankett erhält entsprechende Ausschnitte. Der Helfer arbeitet einmal beim Weltaufbau und erhält Normalen sowie Texturkoordinaten. Eigene Mittelstriche bleiben erhalten.
- **Nordstadt und Rennkurs:** Auch schmale Depot-, Garagen- und Servicezufahrten zählen als Kreuzungen. Mittelstriche halten Abstand zur ganzen Mündung; Überwege passen zur Fahrbahnbreite. Zyklische Endtangenten schliessen die Rennstreckennaht. Der Rennrandstein ist an der Zufahrt geöffnet.
- **Asphaltfarbe:** Der neue Belag ist an den bestehenden Asphalt angeglichen; die abschliessende Nachtprobe steht noch aus.

## Gemessene Prüfungen

Die folgenden Zahlen sind **GEMESSEN**; Vorprüfungen ersetzen keinen erneuten Gesamtlauf des finalen Standes.

| Prüfung | Ergebnis und Einordnung |
| --- | --- |
| Netz-Vorprüfung | 16'776 Punkte ohne Wasser-, Gebäude- oder Baukollision. Der separat untersuchte Landring mit ungeprüftem Belag ist darin ausdrücklich nicht enthalten. |
| GPS-Vorprüfung | 80 Routen ohne ungültige Wegpunkte. |
| Fahrten der Vorprüfung | Kernrundfahrt 525,38 m und Nord-Ost-Verbindung 636,24 m; alle Ziele erreicht, kein Festfahren, keine JavaScript-Fehler. |
| Hauptring nach Korrektur | 180 Fahrbahn- und 56 Gehwegproben bestätigen die geöffneten Anschlüsse und fortgesetzten Seitenwege. |
| Strand nach Korrektur | 560 Proben; keine erlaubte Pflanzenplatzierung auf der geprüften Zufahrt und keine physische Blockade. |
| Bahnhof nach gemeinsamem Belag | Beide Zufahrten je 15,51 m bei 23 km/h gefahren, keine Stillstände oder JavaScript-Fehler. |
| Schnitthelfer | Zwei unabhängige Prüfungen: 9 Geometriefälle ohne Fehler sowie 32 Fälle mit insgesamt 15'808 Punktproben ohne Abweichung. Drehungen, Polygonrichtung, Überlagerungen, Normalen und Texturkoordinaten berücksichtigt. |
| Originalcode im VM-Gegentest | Überlagernde Gehweg- und Kiesschichten entfernt; benachbarter Gehweg und alle 16 eigenen Mittelstreifen erhalten. Objektzahl unverändert. |
| Stadtmodul | Bauplan und alle 148 Gebäudekollider identisch. 47'792 → 47'878 Dreiecke; unverändert 66 Mesh-/Instanzgruppen, keine zusätzlichen Materialien oder Texturen für diese Geometriekorrekturen. |
| Rennkurs | Nahtversatz 0,687 m → 0 m; Randsteintreffer im Raster der Einfahrt 128 → 0. Asphalt an den zuvor offenen Stellen per Raycast bestätigt. |
| Asphaltfarbe bei Tag | Gemessener RGB-Abstand der Vergleichsflächen 126 → 9,8 mit dem übernommenen Materialfarbwert `0x121216`. Dies belegt die Annäherung in dieser Beleuchtung. |

Lokale Belege liegen unter `/tmp/th-strassen-{gesamt,gps}-daten.json`, `/tmp/th-ring-rootfix2-agent.log`, `/tmp/th-strand-flora-agent-neu.log`, `/tmp/th-bahnhof-final-agent.log`, `/tmp/th-strassen-clip-{agent,review}.cjs`, `/tmp/th-strassen-real-agent.log` und `/tmp/th-strassen-vor-nach.json`. Diese temporären Dateien gehören nicht zum Repository.

## Noch offen

Die Nachtprobe der Asphaltfarbe und die Gesamtregression nach allen Änderungen laufen noch. Zusätzlich wurden drei bestehende Tiere auf der Strandzufahrt gefunden. Ihre Versetzung in die vorhandene Koppel ohne Änderung der Tierzahl oder Tierbewegungslogik wird noch geprüft; die obigen Kollisionsproben schliessen diese sichtbare Überlagerung nicht aus.

Veröffentlichung erst nach den erforderlichen grünen PR-Prüfungen und anschliessendem Live-Gegentest dokumentieren.

Browserprüfungen und Geometriezahlen belegen keine stabilen 60 FPS auf einem realen Handy. Eine solche Gerätemessung liegt weiterhin nicht vor.
