# R316 – Telegram-Meldungen und Metricool-Bildfehler

22.11.2026, Europe/Zurich. Pull Request 3256 ist auf main übernommen. Commit `d77c8e10418ac0eb9d6ab91572e8270e4a1fc538`. Alle sieben betroffenen Dateien wurden gegen den getesteten Stand zurückgelesen. Der erste reguläre Lauf mit dem neuen Meldestand steht aus.

## Metricool- und Bildbefund

Marke `6227837`, `Europe/Zurich` und alle sechs Identitäten bestätigt. Der Lauf vom 22.11. um 14:36 Uhr Europe/Zurich meldete vier Fehler und drei alte Entwürfe. Die erweiterte Abfrage ab 19.11. fand zusätzlich den Threads-Fall um 11:00 Uhr ausserhalb der 72-Stunden-Rückschau im Screenshot. [Workflow-Lauf im Screenshot](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/45028349189)

| Termin in Zürich | Kanal | Post-ID | UUID | Gegenprobe |
|---|---|---|---|---|
| 19.11. 11:00 | Threads | 425725415 | 2120727659527094958 | Bildabruf fehlgeschlagen |
| 19.11. 17:00 | Instagram | 425725555 | 4792908094992761420 | Facebook desselben Objekts veröffentlicht |
| 20.11. 17:00 | Instagram | 425726329 | 108318075245381964 | Facebook desselben Objekts veröffentlicht |
| 21.11. 14:00 | Threads | 426961960 | -325577156053548845 | Schmuckkästchen, Rechtebeleg für neue Ausspielung offen |
| 22.11. 11:00 | Threads | 426962312 | 7447187506709285656 | Christbaumdecke, Bildabruf fehlgeschlagen |

Alle fünf Fehler geben einen fehlgeschlagenen Medienabruf durch Meta an. Browser-, Facebook- und Threads-Abruf der markierten Shopify-URLs lieferte HTTP 200, `image/jpeg` und dekodierbare RGB-Dateien mit 1080 × 1350. Weitere fünf Karusselldateien wurden ebenfalls als lesbare JPEGs bestätigt. Alle fünf Postobjekte hatten `saveExternalMediaFiles=false`. Der derzeitige HTTP-Befund belegt Erreichbarkeit, die ursprüngliche Fehlerursache bleibt offen. Für zukünftige Medien einen autorisierten, lizenzierten Kandidaten vor der Freigabe über den vorgesehenen Plattform-Medienpfad testen. Die fünf fehlgeschlagenen Kanaleinträge wurden nicht wiederholt. Der veröffentlichte Facebook-Anteil beider IG-Fälle ist ein zusätzlicher konkreter Grund gegen eine Wiederholung des gesamten Postobjekts. Im Kalender 19.–29.11. war je ausgefallenem Kanal keine exakte Caption- oder Medien-URL-Dublette als veröffentlicht oder terminiert erkennbar. Die vollständige Historie und Rechte aller Medien bleiben offen.

| Bewusster Entwurf | Post-ID | UUID |
|---|---|---|
| Facebook und Instagram | 436691726 | 4464007380148308511 |
| TikTok | 436692567 | 1244897565051602488 |
| Pinterest | 436692585 | 1277216616076757571 |

Alle drei sind aktuell Entwürfe mit vergangener Zeit. Im Freigabelauf war zudem jeweils kein Video vorhanden. Keine Posts, Entwürfe oder Termine geändert.

## Umfang der Telegram-Korrektur

- Der Statuslauf führt alle Befunde im GitHub-Protokoll. Neue Kanalprobleme werden anhand UUID, Kanal, Termin und Status erkannt und in höchstens einer Statusmeldung gesammelt. Ein erstmaliger oder defekter Cache wird ohne Wiederholung der vorhandenen Befunde aufgebaut. Mehr als sechs neue Befunde werden zusammengefasst. Eine tatsächlich unklare Freigabemutation kann weiterhin eine eigene Stoppmeldung auslösen.
- Die Freigabe bezieht festgehaltene Entwürfe und erfolgreiche Planungen weiterhin in die GitHub-Zusammenfassung ein. Die bestehenden Planungs- und Qualitätstore sowie die Workflow-Trigger wurden im Diff geprüft.
- Der Shop-Autopilot protokolliert seine Routineausgabe in GitHub. Für direkte Skriptaufrufe bleibt ein ausdrücklicher Telegram-Opt-in. Das laufende Shopify-Verhalten wurde bei drei gemockten Varianten verglichen. [Autopilot-Lauf im Screenshot](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/44916406771)

Lokal wurden 158 Prüfungen und 63 von 63 Fehlervarianten bestätigt. Node-Syntax, drei gemockte Autopilot-Läufe und struktureller Vergleich der YAML-Trigger waren erfolgreich. Der Container verweigerte den Mount-Namespace der breiten lokalen CI-Simulation. Kein Live-Workflow gestartet oder Telegram-Test gesendet. [Pull Request 3256](https://github.com/allengchour-glitch/aban-news-landing/pull/3256)
