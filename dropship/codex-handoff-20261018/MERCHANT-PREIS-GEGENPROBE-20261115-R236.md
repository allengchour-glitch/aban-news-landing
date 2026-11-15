# Merchant-Preisgegenprobe – 15.11.2026 – R236

Die Verbindung und drei bestehende Preisfehler sind bestätigt; noch kein Merchant-Write oder bestätigter Fehlerabbau.

| Angebot | Tatsächliche Quelle | Aktueller Google-Befund | Gegenprobe / nächster Schritt |
|---|---|---|---|
|10073494240929787683 · Malen nach Zahlen – Gassen & Häuser|10678939025, AUTOFEED gemäss heutigem R233-Quellenprofil|Preis fehlt; Free Listings CH/LI disapproved|Produkt15497440854401 ACTIVE. 18 Varianten vollständig; öffentliches ProductGroup liefert alle18 richtigen CHF-Preise und SKUs. Variante im Merchant-Elternlink nicht ausgewählt; keinen beliebigen der Preise20.90/24.90/26.90 einsetzen.|
|10283932347178265394 · Primer & Sealer|10678939025, AUTOFEED gemäss heutigem R233-Quellenprofil|Preis fehlt; Free Listings CH/LI disapproved|Merchant-Link wählt exakt Variante56210226708865 / SKU CJMJ173930601AZ. Aktueller Shop- und öffentlicher Schema-Preis56.90CHF. Für diesen einen Fall ist die Preiszuordnung geklärt; legitimer Quelleneditor fehlt.|
|10784371818943082880 · Schmuckbox|10678939025, AUTOFEED gemäss heutigem R233-Quellenprofil|Preis fehlt; Free Listings CH/LI disapproved|Tatsächliche Quelle, URL und itemGroupId15496378417537 nun bekannt. Keine native Varianten-/Preisabfrage für diesen dritten Artikel, Preis bleibt unbekannt.|

Zwei öffentliche Seiten HTTP200; alle34 Variantenpreise und SKUs stimmen mit Shopify überein. Tracking ist bei allen34 aus, inventoryPolicy CONTINUE; das ist keine Lager- oder Lieferzeitgarantie. In den34 Schema-Offers steht InStock, aber es wurde kein Warenkorb-/Checkout-/Kaufablauf ausgelöst. Titel-Suchquery `status:active title:Gassen` fand zunächst0 Treffer; direkter Produkt-ID-Read lieferte das ACTIVE-Malset. Die Suchantwort beweist keine Nichtexistenz.

Die nach drei Offer-IDs gefilterte Windsor-Abfrage scheiterte mit MCP request timed out. Die unabhängigen drei HYPD-Einzelreads gelangen. Ein vierter HYPD-Read auf einen nur nach bekanntem Shopify-Format abgeleiteten API-Kandidaten endete INVALID_ARGUMENT; dessen Existenz bleibt unbekannt. Keine blinden Writer-Retries, Source-Anlage oder Regeländerung. Der verfügbare update_product-Writer kann API-Primär- oder korrekt verknüpfte API-Supplementalquellen bearbeiten; das ist kein Nachweis, dass die vorliegende AUTOFEED-Quelle beschreibbar ist.

Der konkrete Preis-Korrekturwert für das bestehende Primer-Angebot ist56.90CHF. Vor einer späteren Änderung Konto, Originalquelle, exakten Link/Variante, Preis und Diff erneut lesen; nur das belegte Preisfeld ändern und denselben Posten zurücklesen. Fehlende Unit-Pricing-Mengen sind derzeit NOT_IMPACTED und wurden nicht erfunden. Die anderen beiden Preise nicht aus einem Mindestpreis oder anderen Ausführungen ableiten. Aktuell kein Writeraufruf und kein Fehler als behoben gemeldet.

Theme214040805767 weiterhin UNPUBLISHED; seine Freigabe ist erfasst und muss nicht erneut eingeholt werden. Der legitime manuelle Publish-Schritt bleibt https://admin.shopify.com/store/luxestyle-ch/themes → «LuxeStyle – Kaufhinweis 15.11.2026» → «Veröffentlichen». Kein weiterer Publishversuch in R236.

Belege: [JSON](MERCHANT-PREIS-GEGENPROBE-20261115-R236.json), [Prüfliste](MERCHANT-DREI-ANGEBOTE-20261115-R236.csv). Keine aktuelle Vollkatalogquote oder vollständige18-Fehlergruppen-Zählung. Bestehende R234-Master-/Social-/Verkaufsentwürfe bleiben erhalten. Claude-Empfang unbekannt.
