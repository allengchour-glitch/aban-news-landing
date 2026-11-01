# Bestellübergabe: lokale Schutzentwürfe, 01.11.2026

Auf «weiter» die beiden vorhandenen Aufgaben zur Printful-Auftragsidentität und zum CJ-SKU-Nachziehen fortgeführt. Status: lokal geprüft, als Reviewpaket gesichert; kein Merge, Deployment, Bestelllauf oder produktiver Fix. Interaktive Fortsetzung nach dem Morgenlauf, kein zusätzlicher geplanter Lauf.

Shop luxestyle.ch/CHF und Metricool 6227837/Europe/Zurich mit allen sechs erwarteten Kanalidentitäten frisch passend. Keine erneute Tageskennzahl-, Klaviyo- oder Kauf-Watch-Abfrage. Das Kaufziel bleibt ERREICHT, der Watch beendet. Die Social-/Film-, Website- und Merchant-Blocker aus dem Morgenpaket bleiben bestehen.

## Printful

Vorherfehler mit erfundenen Testdaten nachgestellt: Zwei Läufe erzeugten zwei Anbieteraufträge, obwohl vier Shopify-Markerschreibversuche abgewiesen wurden. Die alte Zusammenfassung meldete dennoch bestätigt. Es wurden keine echten Aufträge erzeugt.

Der Entwurf bindet eine stabile externe Auftrags-ID an Shop, Printful-Store und Bestellung. Ein neuer Auftrag setzt einen schon bestehenden, belegten Ready-Checkpoint voraus. Quellen- und Absichtshash binden Empfänger, Positionen, Dateien und confirm; eine Shopify-CAS-Reservierung muss frisch bestätigt sein. Unmittelbar vor dem Senden werden Quelle und eigener Claim erneut gelesen. Ein unklarer POST bleibt für erneutes Senden gesperrt; Folgeprüfungen gleichen den Anbieterauftrag ab. Bestehende Anbieteraufträge werden nur bei passender Identität zugeordnet. Fehlende Lieferdaten werden nicht erfunden. Unbekannte Designprüfung und abgeschnittene Positionslisten blockieren.

79 gemockte Prüfungen bestanden: 45 Adapterprüfungen und 34 Modul-Fälle. Unabhängiger Abschlussreview mit separaten Gegenfällen; nachträglich nur drei Kommentare geändert und als reiner Kommentardiff belegt. Eine isolierte Mutation des letzten Claim-Guards liess den passenden Test erwartungsgemäss fehlschlagen. Vier-Dateien-Patch exakt zurückgespielt. Anbieterstatus und «printful-synced» sind keine Zahlungs- oder Auslieferungsbestätigung.

## CJ

Vorherfehler an der tatsächlichen Quellfunktion nachgestellt: fehlende oder paginierte Suchantwort erlaubte einen Write; fehlende userErrors galten als Erfolg; nach Timeout konnte derselbe Prozess erneut senden.

Der Entwurf verlangt vollständige Produkt-/Varianten-/Suchantworten und genaue SKU-Zuordnung. Die Ziel-SKU wird vor dem Senden reserviert und nach den letzten Leseabfragen erneut geprüft. Erfolg erfordert eine passende fehlerfreie Quittung und frisches Rücklesen. Unklarer Write hält die Prozessreservierung. Zusätzlich spätes Reservierungs-Recheck im bereits vorbereiteten Preis-Pfad; keine neue Preisformel.

39 neue Szenarien, 121 Preis-/SKU-Assertions (119 bisherige plus zwei neue) und 89 bestehende Varianten-Assertions bestanden. Unabhängiger enger Review erfolgreich. Isoliertes Entfernen der Vollständigkeitsprüfung führte zum erwarteten Testfehler. Inkremental- und Gesamtpatch bytegenau zurückgespielt.

## Prüfgrenzen und nächste Arbeit

Gepinnter main: a431bf27d5e7af6b7f35ff9506380fee3f1c27a8, am selben Lauf frisch gegengeprüft. Beide Gesamtpatches enthalten ausdrücklich die ältere Vorbereitung vom 29.10.; sie ist kein produktiver Stand. Der separate CI-Diff schlägt lediglich zwei Testaufrufe im vorhandenen Workflow vor. Die bestehende Printful-Testanbindung umfasst die neuen Fälle bereits.

Geprüft unter Node 24.19.0. Node22 und vollständige CI sind unbestätigt; /opt/node22/bin/node fehlt. Der engere CLAUDE-Vorbehalt untersagt Prüfagenten Klonen/CI-Simulation; deshalb kein Start, keine Installation und kein Workflow-Dispatch. GraphQL-Vorprüfung meldete skipped, keine erfolgreiche Serveroperation behauptet.

Vor produktiver Übernahme: genaue Diffs erneut gegen aktuellen main prüfen, vollständige Node22-CI in geeigneter legitimer Umgebung abschliessen, Runtime-Zugänge und App-Berechtigungen belegen. Printful braucht einen ausdrücklich begrenzten Migrations-/Ready-Nachweis für vorhandene Aufträge; dieser Entwurf initialisiert nichts. Shopify-CAS und frische Gegenproben sind kein atomarer Lock über beide Systeme. Bei CJ bleibt die Reservierung prozesslokal; dauerhafte und prozessübergreifende Reservation/Reconciliation fehlt. Kein bestehendes Register zurückgesetzt. Druckflächen, Lieferantenbelege und der vollständige EDM-/Bestellfluss bleiben separat offen.

[Belege](SYNC-SCHUTZ-BELEGE-20261101.json) · [Printful-Gesamtpatch](PRINTFUL-IDEMPOTENZ-20261101.patch) · [CJ-Gesamtpatch](CJ-SKU-SCHUTZ-20261101.patch) · [CI-Reviewdiff](SYNC-CI-TESTS-20261101.patch).

Keine Shop-/Produkt-/Preis-/Feed-/Flow-/DNS-/Ads-/Socialänderung, keine Kundenansprache oder echte Bestellung. Versandgrenzen, Kundendomäne, übrige Aufgaben und Zeitplan erhalten. Claude-Kenntnisnahme unbekannt.
