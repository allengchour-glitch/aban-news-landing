# KI-Büro Design 15: Prüfung und Übergabe

Stand 11.11.2026, Codex. Auftrag des Besitzers: bessere Animationen, bessere Monitoranzeigen und ein ansprechenderes 3D-Büro. PR: https://github.com/allengchour-glitch/aban-news-landing/pull/3114

## Umsetzung

- Weiche Haltungswechsel (0,72 Sekunden), asynchrone Tippgruppen mit Pausen, ruhiger Kaffeeablauf, weiches Blinzeln und dezente Atembewegung. Gemessene Zustände bleiben die Quelle der Haltung. Eine animierte Figur beweist keinen aktuell arbeitenden Agenten.
- Sieben bestehende Pavillons mit eigenen Wandfarben, Akustiklamellen und warmen Lichtfugen. Steinwege, gestufter Sockel und offene Gartenterrasse mit Besprechungsecke und Wasserbecken. Wasserbewegung ist Dekoration.
- Arbeitsplatz- und Wandmonitore zeigen dieselben vorhandenen Quellzeilen mit eigenem Messalter. Jeder Raum trägt seinen eigenen Messzeitraum. Die Büro-Uhr ist neutral und getrennt vom Datenstand; falscher LIVE-Punkt, erfundene Kursgrafik und feste Dashboardzahlen entfernt. Statuswörter im Monitor: Okay, Prüfen, Fehler, Für dich, Alt.
- Fehlende, ungültige und zukünftige Messzeiten werden nicht grün. Der lokale Anzeige-Timer lässt Werte auch bei reduzierter Bewegung altern. Keine zusätzlichen Datenabrufe dadurch.
- Öffentlicher Bau: ungültigen Testzeit-Stub reproduziert und entfernt; native Browseruhr bleibt erhalten. Vorhandene öffentliche Statusberichte werden auch ohne beim Bau übergebenen Bericht über denselben Leser und im unveränderten Fünf-Minuten-Takt nachgeführt, nur bei sichtbarer Seite. Keine neue Automation, kein privater Kontozugang.

## GEMESSEN: Validierung

| Prüfung | Ergebnis |
|---|---|
| `python3 -m unittest discover -s tools/buero -p 'test_*.py'` | 68 Tests bestanden |
| `test_liveboard.js` mit finalem Design 15 | 49 Prüfungen bestanden: alle sieben Monitor-Klickziele, Kamera/Rückweg, Raumwechsel, Escape, Textfassung, Bildgeometrie, Cache und vier neue Datenalter-Gegenproben |
| Kombiniertes Dashboard `test_dashboard.mjs` | 80 Prüfungen bestanden |
| Figuren-Matrixprobe, tatsächliche Engine | 9000 Animationsbilder endlich; Haltungswechsel/Unterbrechungen stetig, reduzierte Posen reproduzierbar |
| Öffentliche Seite 1440×1000 und 390×844 | Version 15, endliche native Uhr, keine Seitenfehler oder Überbreite, 3D sichtbar; bei nachgestelltem Quellenfehler bleiben alle 15 eingebetteten Zeilen unbekannt |
| Öffentliche Bestandsdaten vor/nach Designwechsel | Alle 15 Zeilen inhaltlich unverändert |
| Dashboard-Dateien als JSON-Dokument | Alle zehn unter 250000 Byte; kombinierte `index.html` 237608 Byte, 3D-Code 199015 Byte, grösstes Modellpaket 236643 Byte |
| Grafikumfang bei Monitorprüfung | 735 Zeichenaufrufe und 594316 Dreiecke, unter den bisherigen Prüfgrenzen; keine Aussage über Bildrate auf echtem Handy |
| Syntax und `git diff --check` | bestanden |
| Vorgeschriebene CI-Simulation nach Code-Commit | gestartet, Umgebung blockiert `unshare: Operation not permitted`; kein grünes CI-Ergebnis daraus abgeleitet |

Browser: Chromium mit Software-WebGL. Das hiesige Chromium sperrt `file://`; bestehende Tests liefen über einen lokalen HTTP-Nachbau und einen temporären Startadapter, ohne Prüfbehauptungen abzuschwächen. Der erste Lauf hatte ausschliesslich einen lokalen Favicon404; nach Bereitstellung des Favicons bestanden alle 49 Prüfungen. Bilder sind Sichtkontrolle, kein Nachweis der privaten Artefakt-Ausführung.

Live-Gegenprobe der zwei öffentlichen Statusdateien aus dieser Umgebung: HTTP 403. Nicht als 404, leere Quelle oder Nullwerte ausgegeben. Private Shopify-/Metricool-/Finanzdaten wurden weder neu gelesen noch in Git geschrieben. Für private aktuelle Zahlen bleibt der bestehende Datenimport massgebend.

## Konkreter nächster Schritt für Claude

1. Aktuellen `main`-/PR-Stand und Dateien des bestehenden KI-Büro-Artefakts frisch lesen. Zwischenzeitliche Änderungen an privaten Monitorlinks und den zwei anderen Seiten erhalten.
2. Vollständige Darstellung bauen:

```bash
node tools/buero/3d/bauen.mjs /tmp/ki-buero-design-15
python3 -I tools/buero/dashboard/bauen.py /tmp/ki-buero-design-15 --dokumente
```

3. Nur Darstellungsdateien mit frischen Versionsbedingungen hochladen: 3D-Code, vorhandene Modellpakete, `kb-geldmanager.js`, `lx-offen.css|js`, `lx-suche.css|js`, dann kombinierte `index.html`. **`seite.html` niemals roh als `index.html` schreiben.** Keine Datensätze ersetzen. Private Daten, Messzeiten und Links erhalten.
4. Jede geschriebene Datei samt Version zurücklesen und gegen den fertigen Bau vergleichen. Im echten Artefakt alle drei Seiten, Monitorwechsel und reduzierte Bewegung prüfen. Erst danach den Upload als erledigt quittieren.

Codex hat hier keinen schreibbaren Claude-Artefaktzugang. Kenntnisnahme und privater Upload sind unbekannt. Der PR wurde als Entwurf angelegt; GitHub-Prüfungen standen zuletzt in der Warteschlange. Keine ungeprüfte Zusammenführung, kein Workflow-Dispatch, kein Deployment gestartet. Ein Code-Merge allein würde den privaten Upload nicht belegen.
