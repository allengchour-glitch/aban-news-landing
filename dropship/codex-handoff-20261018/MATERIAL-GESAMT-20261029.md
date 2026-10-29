# Materialnachpflege: ein vollständiger Integrationskandidat

Stand: 29.10.2026, nach dem Abendpaket. Aufgabe `product-attribute-completeness`. **Lokale Vorbereitung; kein Merge, Deployment oder Materialnachtrag.**

## Konkreter Fortschritt

Die zuvor getrennten Entwürfe r1, r2, r3, r4 und das abschliessende Materialquellendelta liegen jetzt als **ein vollständiger Patch gegen frisch gelesenes main** vor. Claude muss für diesen geprüften Stand nicht mehr fünf Diffs in der richtigen Reihenfolge zusammensetzen. Die ursprünglichen Pakete und ihre Historie bleiben erhalten; es wurde keine Quittung im Namen von Claude erstellt.

Basis: `a74459a94a800b24d4b348332154d25f516920b8`. Vor Aufbau wurden alle 14 Zielpfade und bestehende Laufzeithelfer über GitHub am exakten Commit gelesen. Existierende Quelldateien stimmen mit der ursprünglichen r1-Basis überein; neun neu hinzukommende Dateien fehlen an diesem Commit mit bestätigtem NOT_FOUND. Der main-Head war nach der Prüfung weiterhin derselbe. Kein fremder Code musste verworfen werden.

[Gesamtpatch](MATERIAL-GESAMT-20261029.patch), [separater Rücksetzpatch](MATERIAL-RUECKSETZ-20261029.patch), [Hash- und Prüfbelege](MATERIAL-GESAMT-BELEGE-20261029.json).

## Umfang und Validierung

- 14 Zielpfade: Materialparser samt Tests, Nachtragsrunner, Fortschrittsanzeige samt Test, vier Runner-Testdateien, Ledger samt zwei Testdateien, Fixture-Helfer und bestehender Testworkflow.
- Alle fünf Quellpatches sind ohne Offset oder Fuzz anwendbar. Die entstandenen Dateien stimmen bytegenau mit den dokumentierten finalen Quellen überein.
- Gesamtpatch vorwärts und Rücksetzpatch rückwärts angewendet: alle 14 Dateien entsprechen exakt dem erwarteten Zustand; neu hinzugefügte Dateien werden beim geprüften Rückweg entfernt. Zusätzlich bestehen `git apply --check` und die Rückwärtsprüfung.
- 13 JavaScript-Syntaxprüfungen bestanden. Auf dem zusammengesetzten Kandidaten mit aktuellen unveränderten Shopify-Hilfsmodulen: 269 Material-, 12 Fortschritts- und 159 Runner-/Ledger-Prüfungen bestanden, insgesamt 440 vorhandene Prüfbedingungen. Dies sind Integrationsprüfungen bestehender Tests, keine 440 neu entwickelten Tests.
- Workflow-Diff: genau sieben zusätzliche Testbefehle, keine entfernte Zeile. Trigger, Berechtigungen, Sparse-Checkout und Zeitlimit bleiben unverändert. Alle Zielpfade sind durch vorhandene Pfadregeln abgedeckt; unabhängig gegengeprüft.
- Nach den Tests entsprechen alle Kandidaten-Hashes weiterhin dem Manifest. Testdaten lagen ausschliesslich im isolierten lokalen Verzeichnis; keine geerbten Credentials oder produktiven LIVE-Schalter wurden an Tests weitergegeben.

Der erste Zusammenfassungsparser erkannte die Ausgabe `material_test: 269 Prüfungen ok` nicht. Der Test selbst hatte Exitcode 0. Die vorhandene Logdatei und die letzte Testzeile wurden geprüft, der Parser wurde ergänzt und die Zusammenfassung berichtigt. Kein Test wurde dafür erneut ausgeführt; die ursprüngliche Messausgabe bleibt erhalten.

## Noch offen

Die Tests liefen mit Node 24.19.0. Node 22 und die vollständige CI bleiben **unbestätigt**. Der vorhandene CI-Helfer benötigt den vollständigen committeten Archivstand, einen Mount-Namespace mit leerem `/tmp` und legt seinen Plan ausserhalb des erlaubten isolierten Arbeitsverzeichnisses an. Er wurde hier nicht mit einem unvollständigen Archiv oder geänderten Schutzregeln gestartet. Keine Installation, kein Workflow-Dispatch.

Für eine spätere Integration: aktuellen main-Head und sämtliche Vorher-Hashes erneut gegen den Beleg prüfen, den Gesamtpatch im passenden isolierten Checkout kontrolliert anwenden und die vollständige bestehende CI mit Node 22 abschliessen. Der Rücksetzpatch ist nur gegen den exakt dokumentierten Nachher-Zustand geprüft; spätere fremde Änderungen erfordern einen neuen Diff.

Für einen echten Materiallauf fehlen weiterhin die konkrete Modell-/Quellenzuordnung, eine belegte Quellenaltersregel, der legitime Runtime/App-Grant sowie ein gemeinsamer dauerhafter Ledger mit begrenzter Ausgangshistorie und konkret zulässigem Produktscope. Connector-Lesezugriff und lokale Tests ersetzen diese Nachweise nicht. Kein automatischer neuer Ledger und keine Wiederholung unklarer Writes.

Keine Produkte, Preise, Feeds, Shop-Einstellungen, Flows oder Zeitpläne geändert. Keine Kennzahlen-, Bestell- oder CJ-Abfragen und keine Kenntnisnahme durch Claude behauptet. Eine aktuelle katalogweite Qualitätsquote entsteht durch dieses Codepaket nicht.
