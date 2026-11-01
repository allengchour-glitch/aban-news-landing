# Vollständiger Printful-Importabgleich – 01.11.2026

Lokales, prüfbares Vorbereitungspaket. Es wurden keine Shopify-Produkte oder Varianten angelegt, keine Preise geändert und kein Workflow, Produktimport oder Deployment gestartet. Im anschliessenden autorisierten Arbeitsschritt wurde ein kontrollierter Bulk-Leseexport gestartet und dessen Abschluss bestätigt; die Ergebnisdatei ist durch den Connector gesperrt, siehe unten.

## Vollständigkeit und aktueller Bestand

| Nachweis | Ergebnis |
|---|---:|
| Modelle im aktuellen öffentlichen Printful-Hauptkatalog | 572 |
| Vollständig erhaltene Originalvarianten | 13’160 |
| Verifizierte rohe Quelldateien mit passendem SHA-256 | 572 |
| Varianten mit dokumentiertem USD-Basis-Einkaufspreis | 13’160 |
| Varianten mit direktem Materialfeld vom Anbieter | 6’924 |
| Shopify-Produkte mit `printful_personalized_product`, frisch gezählt | 491, EXACT |
| Davon ACTIVE | 477, EXACT |
| Detailliert gelesene Blankangebote der Selbstgestalten-Kollektion | 31 Produkte / 309 Shopify-Varianten |
| Zugeordnete Printful-Varianten in dieser Teilmenge | 302 |
| Printful-Varianten mit mehreren bestehenden Shopangeboten | 7 |

Die 491 sind ein Tag-Count, kein vollständiger Beweis für alle POD-Produkte. Das vorbereitete Bestandslesen berücksichtigt zusätzlich `wunschdesign`. Die 31 Blankangebote enthalten Materialgruppen aus 39 Printful-Modellen. Bei 12’858 Katalogvarianten wurde in dieser begrenzten Teilmenge kein Angebot gefunden; das bedeutet ausdrücklich **nicht**, dass sie im gesamten Shop fehlen. Es wurde keine unkontrollierte Massenpagination gestartet.

Nachtrag 01.11.2026, 01:08 UTC: Der frisch geprüfte gemeinsame Filter `printful_personalized_product OR wunschdesign` zählt **492 Produkte, EXACT**. Dies korrigiert nicht den vorigen 491er-Tag-Count, sondern erweitert den ausdrücklich abgefragten Umfang um `wunschdesign`.

Alle Original-IDs, tatsächlichen Farb-/Grössen-Kombinationen, Materialangaben, Bilder, Techniken, Druckdateitypen und Kategoriezuordnungen bleiben erhalten. Stabile Schlüssel: `printful:product:<id>` und `printful:variant:<id>`. Neue Shopify-IDs und SKU-Präfixe werden nicht geraten. Die 7 Mehrfachangebote bleiben als getrennte Angebote mit ihren echten Preisen erhalten; es gibt kein «letzter Preis gewinnt».

## Belegte Preisregel

Aktuelles Repository: `automation/lib/pod_preise.mjs`, Git-SHA `ae3ba13198ccb80979a5705e85ed22eed62b484e`.

- Bestehende Regel für neue Selbstgestalten-Varianten: Richtwert `max(Einkauf_CHF × 2.3, Einkauf_CHF + 12)`.
- Tatsächlicher Printful-Versand nach CH und modellierte Zahlungsgebühr `3.4 % + CHF 0.30` sind zusätzlich einzurechnen.
- Endpreis: kleinster Preis mit Endung `.90`, der Richtwert und mindestens CHF 12 rechnerischen Nettoertrag erfüllt. Bisherige Preisgrenze: CHF 149.90.
- USD/CHF 0.90 ist die vorhandene Kalkulationsvorgabe, kein heute beschaffter Wechselkurs. Unter CHF 50 rechnet die Regel mit CHF 7 Kundenversand bei Einzelkauf; ohne diesen Versandbeitrag fällt der Ertrag niedriger aus. Dies ist keine Zusage eines tatsächlich erzielten Gewinns.
- Öffentliche Versandgrenze CHF 50 und interne CHF 45 nach Rabatt wurden nicht geändert. Die Formel ist keine Freigabe, reale Checkout-Regeln zu überschreiben.

Es ist keine neue Margenerfindung oder pauschale Preisfreigabe nötig. Die aktuellen variantenspezifischen CH-Versandangebote sowie Kosten der gewählten Technik, Druckflächen und Zusatzoptionen fehlen noch. Deshalb bleiben neue CHF-Verkaufspreise `null`; aktuelle Shopify-Verkaufspreise werden ausschliesslich am konkreten bestehenden Angebot dokumentiert. Einkaufspreise werden nicht als Shop-Verkaufspreise angezeigt.

57 Varianten aus 14 Modellen überschreiten bereits mit dem Basis-Einkauf den bisherigen Preisrichtwert von CHF 149.90. Sie bleiben im Manifest vollständig erhalten und werden als Konflikt markiert. Eine spätere Aufhebung dieser bestehenden Preisgrenze ist eine konkrete Geschäftsentscheidung; es wurde weder eine teurere Variante still entfernt noch ein nicht genehmigter Preis eingesetzt. Versand und Zusatzoptionen können weitere Varianten über die Grenze bringen.

## Weshalb der vorhandene Importweg nicht pauschal starten darf

Der aktuelle `pod_auswahl`-Writer bedient fünf Auswahlgruppen und stoppt bei 250 gelesenen Varianten beziehungsweise weiterer Seite. Drei Modelle überschreiten diese Lesebegrenzung: PF71 mit 628, PF438 mit 276 und PF586 mit 350 Varianten. Das Vorbereitungspaket enthält sie vollständig.

Der vorhandene Bestelladapter verarbeitet Druckdateiattribute als Vorder-/Rückseite und einen SKU-Suffix. Im Vollkatalog haben 402 Modelle zusätzliche echte Druckstellen, 106 keine gesicherte Vorderseitenzuordnung nach dem heutigen Adapter. Der Katalog enthält neun Techniken. Technik, optionale Zusatzkosten und sämtliche Druckstellen werden durch den bisherigen Adapter nicht vollständig weitergereicht. Das ist ein Code-/Zuordnungsbefund, kein Beweis einer bereits fehlgeschlagenen Kundenbestellung.

Die Freischaltung des Embedded Design Maker durch den Inhaber wird nicht erneut erfragt. Die Laufzeitanbindung und echte variantenspezifische Druckgeometrie sind in dieser Umgebung weiterhin nicht verifiziert.

## Lokale Sicherungen und Prüfung

`import_guards.mjs` besitzt keinen Netzwerkzugang und keinen Writer. Er prüft Identität, reale Preise, frische CH-Versandangebote, Zuordnung, SKU und Druckflächen. Fehlende Daten, Nullpreise, doppelte Shopify-SKUs oder unvollständiger Bestandsabgleich blockieren. Alle 13’160 Kandidaten sind im aktuellen Stand gesperrt; die strukturellen 668 Batches sind keine ausführbaren Schreibaufträge.

Die operative Aufteilung beträgt 50 Varianten pro Produkt-Batch. Das ist eine vorsichtige lokale Aufteilung und keine behauptete Shopify-Obergrenze. Frisch gelesenes Shopify-Schema und offizielle Dokumentation nennen aktuell 2’048 Varianten pro Produkt; die Dokumentation beschreibt auch bis zu 2’048 Varianten in `productVariantsBulkCreate`. Siehe `SHOPIFY-SCHEMA-REFERENCES.json`. Es wurde keine Mutation ausgeführt.

Sieben sinnvolle Prüfungen sind grün: vollständige 628er-Matrix von PF71, alle 13’160 IDs, blockierte fehlende Preis-/Versand-/Zuordnungsdaten, blockierter Nullpreis, globaler Stop bei doppelter Shopify-SKU, Stop bei doppelter Quell-ID und unvollständige Bestandsmenge. Alle 572 Raw-Hashes stimmen; `MANIFEST-VALIDATION.json` ist erfolgreich.

`READONLY-BULK-QUERY.graphql` war die vorbereitete innere Leseabfrage. Im autorisierten Folgeschritt wurde eine eng ergänzte Fassung mit aktuellem `custom.print_file`, Kaufbarkeit und Bestandszähler ausgeführt; die genaue tatsächlich ausgeführte Query steht in `BULK-READ-PREFLIGHT.json` und im zurückgelesenen Job. Der separate Validator meldete «validation skipped»; der anschliessende Server hat den Lesejob angenommen und vollständig abgeschlossen.

## Kontrollierter Bulk-Leseexport – konkreter Zugriffsblocker

- Shop unmittelbar davor bestätigt: `gid://shopify/Shop/94368563585`, `luxestyle.ch`, CHF.
- Aktive Bulk-Queue vor Start leer, `hasNextPage=false`; kein bestehender Job wurde gestört oder abgebrochen.
- Genau ein Lesejob erstellt: `gid://shopify/BulkOperation/12890114032007`, Typ `QUERY`, erstellt `2026-11-01T01:08:16Z`, abgeschlossen `2026-11-01T01:08:22Z`.
- Frisch zurückgelesener Status: `COMPLETED`, kein Fehlercode, `rootObjectCount=492`, `objectCount=2146`, `fileSize=869210`. Der Root-Count stimmt mit dem vorherigen exakten 492er-Produktcount überein.
- Der Connector lehnt `BulkOperation.url` und `partialDataUrl` ausdrücklich ab: signierte Links, die Shopdaten herunterladen, werden durch `setup-mcp` nicht zurückgegeben (`INVALID_ARGUMENT`). Die erlaubte Rückleseabfrage ohne diese Felder war erfolgreich.
- Daher sind die Exportzeilen hier weiterhin **unbekannt**. Es ist kein vollständiger SKU-/Variantenabgleich möglich; aus dem Gesamt-Objektcount wird kein Variantencount erfunden. Es gab keinen Download über Umwege, keinen zweiten Exportjob und keine ersatzweise Massenpagination.
- Belege: `BULK-READ-PREFLIGHT.json`, `BULK-READ-SUBMISSION.json`, `BULK-READ-STATUS.json` (konkrete Connector-Ablehnung), `BULK-READ-STATUS-NO-LINKS.json` (bestätigter Abschluss).

## Nächster konkreter Schritt

Die Ergebnisdatei des **bereits abgeschlossenen** Lesejobs über einen legitimen, dafür freigegebenen Datenzugang verfügbar machen; den Job nicht blind erneut starten. Danach Hash, vollständige 492 Produktzeilen, Varianten-Elternbezug und eindeutige SKUs kontrollieren und das Manifest abgleichen. Parallel sind die vorhandenen Printful-Helfer mit legitimer Laufzeitanbindung für aktuelle CH-Versand- und Technikkosten zu verwenden. Erst daraus konkrete bestehende Angebote ergänzen oder neue Angebote planen. Ein anschliessender Import muss Plan-Diff, aktuelle Gegenprobe, eindeutige SKU-Zuordnung, vollständige Druckstellen, Checkpoint und Rücklesen je Produkt erhalten. Kein vorhandenes Angebot wird aus dem partiellen Abgleich überschrieben.

## Dateien

- `IMPORT-MANIFEST.json`: vollständige Modelle/Varianten und Quellen, inklusive Einkaufspreisen, Produktzuordnungen und Blockern.
- `VARIANT-RECONCILIATION.csv`: alle 13’160 Varianten als prüfbare Tabelle.
- `STRUCTURAL-BATCH-PLAN.json`: alle Varianten in stabilen Produkt-Batches, keine ausführbaren Mutationen.
- `MANIFEST-VALIDATION.json`, `SHOPIFY-SCOPE-READ.json`, `SOURCE-REFS.json`, `SHOPIFY-SCHEMA-REFERENCES.json`: Belege.
- `build_import_manifest.mjs`, `import_guards.mjs`, `import_guards.test.mjs`: lokale Wiedererzeugung und Sicherungen.

Die Quelldetails reichen vom 29.10.2026 bis 01.11.2026; 319 werden mit ihrem ursprünglichen Datum wiederverwendet. Beim Paketbau war kein Detail älter als das bestehende 72-Stunden-Tor. Das ersetzt vor späteren Änderungen keine neue Aktualitätsprüfung.
