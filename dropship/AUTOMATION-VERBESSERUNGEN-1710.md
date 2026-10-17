# LuxeStyle: Checkpoints und Fehlerbehandlung

## Auslöser und Verhalten

Ein bestätigter Post konnte bei einem späteren Fehler erneut geplant werden. Der Scheduler speichert deshalb vor dem mutierenden POST atomar `inflight` und jeden bestätigten Erfolg unmittelbar als `scheduled`, inklusive Metricool-ID/UUID. Unbekannte Antworten bleiben `uncertain`; Fehler vor dem POST lassen die Zeile `ready`. Bestehende CSV-Spalten und Notizen bleiben erhalten.

Der direkte Meta-Poster speichert diese Zustände pro Kanal. Erfolgreiche Kanal-IDs bleiben mit dem bisherigen Format kompatibel. IG-/Threads-Verarbeitungsfehler verhindern Publish. Eindeutige Graph-4xx-Ablehnungen bleiben wiederholbar; unbestätigte Publish-Antworten, 5xx und fehlende IDs blockieren die automatische Wiederholung. Beide Publisher verwenden eine exklusive Queue-Sperre.

Der CJ-Import hielt Produkte auch nach fehlgeschlagenen Judge.me-Imports für erledigt. Ein fsync-gesichertes Einzelbewertungs-Ledger speichert nun `sending`, `sent`, `failed` und `uncertain`. Teilfehler bleiben offen; bestätigte Einzelbewertungen werden beim nächsten Versuch übersprungen. Bei vorhandener Quell-ID besteht der Schlüssel aus Produkt, CJ-Produkt und dieser unveränderlichen ID. Nur ohne Quell-ID dient der Inhalt als Ersatz. Ein Import-Lock schützt zwei lokale Aufrufe. CJ-Erfolge ohne Daten und unbekannte Judge.me-2xx-Antworten werden nicht mehr als leeres Produkt bzw. bestätigter Import behandelt.

## GitHub Actions

- Metricool, Meta und CJ bleiben manuell. Keine Zeitpläne aktiviert.
- Publikationsworkflows starten standardmässig trocken und verlangen zusätzlich `approve_publish`.
- Metricool verwendet die verifizierte Marke `6227837`, User `4801419`, Europe/Zurich und standardmässig höchstens einen Post.
- Nach Teilfehlern werden Queue/Ledger gesichert: zuerst Wiederherstellungsartefakt, danach Git-Commit auf die ausgewählte Branch. Endgültige Push-/Rebasefehler schlagen fehl.
- CJ sichert alle drei Ledger: erledigte Produkte, zeitlich begrenzte Leer-Ergebnisse und Einzelbewertungen.
- Read-only PR-Tests verwenden keine Secrets und keine echten Plattformaufrufe.

## Prüfung und Grenzen

Die Checkpoint-Suiten prüfen Teilfehler, HTTP200-Fachfehler, verlorene Antworten, Hardexit, Schreibfehler, Queue-Sperren, Dry-Run und Wiederholung ohne doppelten bestätigten Kanal. Dazu bestehende Guard-, API-Helfer- und Rendererprüfungen. Die Rendererprüfung simuliert Befehle und erzeugt keinen fertigen Film.

Keine gemeinsame Transaktion zwischen Plattform und Git: Ein vollständig verlorener Runner vor Artefakt/Git-Push erfordert weiterhin einen manuellen Plattformabgleich. Je Inhalt einen zuständigen Publisher und eine kanonische Branch/Queue verwenden. Zwischen Metricool und direktem Meta-Poster existiert kein gemeinsamer Duplikatschlüssel. Nach Hardkill eine verbliebene `.lock` nur nach Prüfung des Prozesses und der unklaren Ergebnisse entfernen. Historische CJ-Produkt-Ledger lassen sich nicht rückwirkend in bestätigte Einzelimporte umwandeln.

Neue Shoptexte, eine responsive Bio-Seite und ein korrigierter Checkout-Mailflow sind zur Prüfung vorbereitet. Eine unveröffentlichte Shopify-Bio-Seite wurde angelegt. Die Klaviyo-Marketingdomain `send.luxestyle.ch` bleibt `pending`, DNS noch nicht gesetzt. Keine Bestandsregeln, Rabatte, Lieferantenbestellungen oder E-Mail-Sendungen durch diese Codeänderung ausgelöst. Kein neuer professioneller Film produziert; bestätigte Bewegungsaufnahmen fehlen.
