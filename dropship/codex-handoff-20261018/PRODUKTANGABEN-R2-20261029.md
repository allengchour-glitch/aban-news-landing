# Produktangaben: Folgepaket r2

Stand 29.10.2026, Europe/Zurich. Reviewpaket derselben Aufgabe product-attribute-completeness, Revision 2. Vorgänger r1 bleibt erhalten. Aktuelle Grundlage main b708c809c2b9ef074bf48999fdfe5b28d0ee3bbe; dieses Paket ist weder gemergt noch deployt oder im Shop ausgeführt.

## Konkrete zusätzliche Korrektur

Der bisherige Runner konnte bei atomarer metafieldsSet-Ablehnung einen Teil des Stapels als geschrieben zählen. Bei unklaren Netzwerkantworten wiederholte der HTTP-Helfer Mutationen. Der enge Folgepatch verwirft nun bei userErrors den ganzen Stapel, stoppt unbekannte Schreibantworten ohne Retry und liest nach angenommener Mutation alle betroffenen Produkt-IDs zurück, bevor weitere Stapel zulässig wären. API-Annahme, frisch bestätigte Werte, Fehler, Unbekanntes, Abweichungen und nicht bearbeitete Kandidaten bleiben getrennt. Der gemeinsame HTTP-Helfer bleibt unverändert; nur dieser Schreibaufruf setzt versuche:1.

Die aktuelle offizielle Shopify-Dokumentation bestätigt die atomare Semantik: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet . Die angefragte historische API-Dokumentation leitete auf latest weiter; eine Versionsvalidierung der alten Runner-Konfiguration ist nicht belegt. Der GraphQL-Validator meldete validation skipped. Kein echter Mutationsaufruf wurde zur Prüfung ausgelöst.

GEMESSEN: Gegen r1 scheitern 18 der 20 neuen Batchprüfungen. Auf dem integrierten Kandidaten sind 190 Material-, 12 Fortschritts-, 16 Plan- und 20 Batchprüfungen grün, zusammen 238. Die bisherigen 218 sind erneut geprüfter Bestand, keine zusätzlich neu entwickelten Prüfungen. Syntax und Workflow-YAML geprüft. Vollständiger Patch auf lokaler Kopie der gepinnten Basis angewendet; alle acht Zieldateien bytegleich zum Kandidaten. Eine unabhängige statische Gegenlese fand keine zusätzliche materielle Regression.

Der zusätzliche CI-Start mit unveränderter Simulation unter isoliertem Netzwerk scheiterte bereits vor Skripteintritt: unshare: Operation not permitted. Keine vollständige CI-Ausführung und kein CI-Grün. Node 24.19.0 verwendet, Node22 nicht vorhanden; HOME unverändert, keine echten Zugänge vererbt. Isolierte Fixture-Pfade verwendet, keine fremden /tmp-Dateien in diesem Folgeprüflauf.

## Geltungsbereich der Dateien

CODEPAKET-PRODUKTANGABEN-R2-20261029-1.json und -2.json enthalten zusammen acht Vorher-/Nachher-Zielpfade mit Hashes. PRODUKTANGABEN-KORREKTUREN-R2-20261029.patch ist der vollständige Patch gegen die gepinnte Basis; PRODUKTANGABEN-R1-ZU-R2-20261029.patch ist nur die Folgeänderung. Wer r1 bereits übernommen hat, prüft den Folgepatch und den dann aktuellen Dateistand. Kein blindes Anwenden beider Patches.

Das ältere Kooperationspaket R3 ist ein anderer Aufgabenbereich. Sein Workflow kann parallel geändert sein: Die drei zusätzlichen Testzeilen sind als enge Hunks auch auf einer separaten Kopie des Kooperations-Workflows geprüft; dessen Original blieb unverändert. Bei Integration diese Hunks abgleichen, keinen vollständigen Workflow aus diesem Paket über fremde Änderungen kopieren. Im Validierungsbeleg ist der konkrete Workflowhunk gespeichert.

## Offene Voraussetzungen

Keine Live-Freigabe durch dieses Paket. Frische Vorher-Gegenprobe/compareDigest, Quellenalterprüfung, historische API-Version und dauerhaftes Inflight-/Unknown-Register mit sicherer Wiederaufnahme über Prozessgrenzen fehlen. Ein Prozessabbruch vor Abschluss des zusammenfassenden Ledgers bleibt möglich. Plan und Zähler sind kein tatsächlich bestätigter Rücksetzbeleg. Unklare Fälle müssen vor einem weiteren Lauf gezielt abgeglichen werden.

## Vier aktuelle Produkte und Verkaufsziel

Ergänzend wurden vier ausgewählte Produkte mit Bildern, Varianten und technischer Kaufbarkeit live geprüft. Drei Beschreibung-/SEO-Diffs sind sachlich vorbereitet, bleiben aber publishable=false. Exakte Modell-/Lieferzuordnung und materialbezogene Produktnamen fehlen. Tech-Hero-Setinhalt und rosa/grüner Roller-Konflikt haben Priorität. Einzelheiten stehen in VIER-PRODUKTE-VERKAUFSGRUNDLAGEN-20261029.md; Rohbelege sind auf genau diese Produkte begrenzt.

Der neue Inhaberwunsch «bis 1 Kauf» ist als Ziel mit Beginn 29.10.2026 00:46:11 Europe/Zurich dokumentiert. Das einmalig vollständig geprüfte Fenster bis 00:52:05 enthält keinen passenden neuen bezahlten Nicht-Testkauf. Kein künstlicher Kauf und keine Kundendaten in der Übergabe. Keine Aussage über spätere Käufe oder eine kausale Verkaufswirkung. Vorhandener Zeitplan und bisherige Kennzahlgrenzen bleiben unverändert.

## Zusammenarbeit

Claude bleibt Koordinator. r2 behält taskId und den tatsächlichen Vorgängerhash. Der lokal vorhandene, geprüfte Übergabehelfer kontrolliert Paket und Quelldateien. Eine fehlende Quittung bedeutet unbekannte Kenntnisnahme, keine direkte Sitzungsverbindung und keine produktive Integration. Nach Speichern sind Git-SHAs und Inhalte frisch zurückzulesen.
