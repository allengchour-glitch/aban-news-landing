# KI-Büro Design 16: Darstellung und aktueller Arbeitsstand

Stand 11.11.2026. Fortsetzung des Besitzerauftrags «stl schöner rendern», «büro mehr erledigen sachen anzeigen» und «keine direkten Links, nur live anzeigen». Die bisherigen Änderungen aus PR3114 werden im selben Entwurf weiterentwickelt.

## Ergebnis

Die Büroansicht zeigt konkrete Befunde statt eines Verzeichnisses externer Kontolinks. Arbeitsplatz, Raummonitor, Zentralmonitor und Textjournal verwenden vorhandene Quellzeilen. Das Journal zeigt ausdrücklich belegte Laufabschlüsse, letzte Meldungen und offene Prüfungen. Gleiche Lauf-IDs zählen nur einmal. Ein grüner Zustand allein beweist keinen Abschluss; erforderlich sind `completed`, `success` und eine gültige Abschluss-Quellzeit. Offene Ergebnisprüfungen stehen weiter unter Aufmerksamkeit. Ein technischer Lauf belegt keine Verkäufe, veröffentlichten Bewertungen oder Social-Beiträge.

Wesentliche Korrekturen:

- Die alte Arbeitsansicht ersetzte Befunde mit «GitHub/Workflow» durch allgemeine Hinweise und machte Social-Zeilen zu Linkkarten. Jetzt bleiben tatsächlicher Befund, Status, Ereignis und Messzeit erhalten.
- Der Produzent liefert zwölf Ablaufzeilen einschliesslich Bewertungsimporter. Der Browserleser erwartete elf und verwarf deshalb den gesamten Bericht. Der echte Produzentenbericht läuft jetzt durch denselben Leser. Gegenprobe mit dem bisherigen Leser schlägt erwartungsgemäss fehl.
- Optionale sichere Laufdaten (`lauf_status`, `lauf_ergebnis`, `lauf_ende`, `lauf_id`) werden weitergegeben. Fehlende Altformat-Felder bleiben ungeklärt und löschen einen früheren Abschlussnachweis. Fehlerantworten und ältere Messungen ersetzen keinen bestätigten Stand.
- Der Arbeitsstand braucht kein WebGL mehr: eine gemeinsame reine Datenfunktion bedient 3D, Handy-Start, 2D und Textjournal. Die Bildkontrolle ergänzte zwei Fehlerfälle: vom Gehäuse verdeckte Bildschirmfläche und Nachbarwände im vergrösserten Fokus. Im Fokus wird jetzt nur der echte Monitor mit seinem Gehäuse gezeichnet.

## Rendering

Näherungsweise lineare Lichtberechnung mit sRGB-Ausgabe, zurückhaltendes Fülllicht, materialabhängige Rauheit und Glanzlichter. Korrekte invers-transponierte Normalen bei nichtuniformer Skalierung, auch beim Backen. Winkelgewichtete Glättung erhält harte Kanten. Abgerundete Monitorgehäuse, grössere Zentrale und weiche statische Kontaktflächen ergänzen die Raumdarstellung. Kein neuer Renderdurchgang, keine Bibliothek, kein neues Fremdmodell. Keine Behauptung von Raytracing oder echtem Umgebungsverdeckungsschatten.

## GEMESSEN

| Gegenprobe | Ergebnis |
|---|---|
| Python-Tests des Bürobereichs | 70 bestanden, darunter echter 12er-Produzent gegen Browserleser, Altformat und 403/429/503-Erhalt |
| Erweiterte Monitorprüfung | 56 bestanden, einschliesslich konkreter Ergebnistexte, Abschlussnachweisen, Duplikaten, Datenalter, zwei Bildpunktproben und Handy/Desktop ohne WebGL |
| Kombiniertes Drei-Seiten-Dashboard | 80 Prüfungen bestanden im finalen Bau |
| Reine Rendererprüfung am aktuellen Code | 150 Transformationen; alle 21 Modelle mit 145329 Eckpunkten endlich und normalisiert; grösster Orthogonalitätsfehler 3,84e-8 |
| Browser mit aktuellen öffentlichen Quellbelegen | 1440×1000 und 390×844, native Uhr, 3D sichtbar, keine Seitenfehler oder Überbreite; zwölf Zeilen mit echter Quellzeit |
| JSON-Dokumentlimit | Alle zehn Dateien unter 250000 Byte; kombinierte `index.html` 236022 Byte, 3D-Code 207375 Byte |
| Grafikumfang in der Gesamtansicht | 791 Zeichenaufrufe, 597766 Dreiecke; Fokus zeichnet nur Monitor und Gehäuse |
| Lokale CI-Simulation nach Code-Commit | gestartet, durch `unshare: Operation not permitted` blockiert; kein grünes CI-Ergebnis behauptet |

Die kleine Quellenprüfung las neun unterschiedliche öffentliche GitHub-Ablaufquellen. Bei zwei gemeinsamen Quellen wurden die stabilen Lauf-IDs gezielt ergänzt, um Mehrfachanzeigen zu vermeiden. Nur bereinigte öffentliche Laufdaten in der Webansicht; keine privaten Konto- oder Kundendaten, keine neue Shopify-/Metricool-/Finanzabfrage. `updated_at` ist die von GitHub gelieferte Abschluss-Quellzeit, keine sekundengenaue Laufdauer. Der vorhandene Fünf-Minuten-Leser und der bestehende Berichtsablauf bleiben bestehen; keine neue Automation oder Frequenzänderung.

## Bereitstellung und Claude

Code und HTML tragen `campus-einheitlich-16`. Öffentliche `ki-buero.html` neu gebaut und aktuelle bereinigte Laufstände eingebettet, damit die Erstansicht nicht leer startet. Änderungen sind im bestehenden PR3114. Die GitHub-Prüfungen standen zuletzt weiter auf queued; keine ungeprüfte Zusammenführung oder Auslieferung. Das private Claude-Artefakt kann Codex hier nicht schreiben. Sein tatsächlicher Versionsstand ist nicht zurückgelesen.

Claude setzt die Darstellung im bestehenden Artefakt um: zuerst frische Dateiversionen und zwischenzeitliche private Links lesen, dann beide bestehenden Bauer ausführen:

```bash
node tools/buero/3d/bauen.mjs /tmp/ki-buero-design-16
python3 -I tools/buero/dashboard/bauen.py /tmp/ki-buero-design-16 --dokumente
```

Nur Darstellung mit Versionsbedingungen schreiben, kombinierte `index.html` zuletzt, jede Datei zurücklesen. Alle privaten Datensätze, «Offene Punkte» und «Suchanfragen» erhalten. Nie die rohe `seite.html` als `index.html` hochladen. Laufende Arbeitsdaten werden direkt im Büro angezeigt; keine neue Linkzentrale ergänzen. Upload und tatsächliche Kenntnisnahme erst mit Beleg als erledigt quittieren.
