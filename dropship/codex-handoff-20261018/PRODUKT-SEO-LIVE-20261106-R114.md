# LuxeStyle R114 – zwei BRUDER-Spielsets live präzisiert

Belegstand: 2026-11-06T07:20:37+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanalidentitäten wurden frisch passend gelesen. Vor jedem Produkt wurden aktuelle Claude-Code-Refs, exakte Produkt-ID, Handle, SKU und Shopify `updatedAt` gegengeprüft. `origin/main` stand zuletzt auf `9257012a9`; der jüngste Claude-Head `d31e288a2` betrifft das Katalogfenster. Es gab keine parallele redaktionelle Bearbeitung dieser Produkte. Claude-Empfangsquittung und gemeinsamer Live-Lock bleiben unbekannt.

## Live korrigiert

Produkt `15470033633665` **«bworld Mountainbike mit Radfahrerin»** erhielt eine klar gegliederte Beschreibung mit dem bildsichtbaren Setinhalt, Artikelnummer 63111, Spielidee und der durch ein offizielles BRUDER-Manual belegten Altersempfehlung ab vier Jahren. Der ungeklärte Rabattclaim `WELCOME10` wurde aus der Produkt-Metabeschreibung entfernt. Drei Bilder erhielten bildgenaue Alttexte.

Produkt `15470017970561` **«BRUDER bworld Kajak mit Figur»** erhielt eine klar gegliederte Beschreibung mit dem bildsichtbaren roten Kajak, Figur, Helm, Weste, Doppelpaddel und schwarzer Abdeckung sowie Artikelnummer 63155. Schwimmfähigkeit, Material, Alter, Sicherheitswarnung und Masse wurden nicht übernommen, weil die aktuelle Hersteller-Einzelseite nicht mehr erreichbar ist. Der ungeklärte Rabattclaim wurde aus der Produkt-Metabeschreibung entfernt. Drei Bilder erhielten bildgenaue Alttexte.

Genau zwei `productUpdate` und zwei `fileUpdate` wurden erfolgreich gesendet, ohne Shopify-`userErrors`, Mutation-Retry oder unklaren Write. Nach jedem gesendeten Write wurden Admin sowie öffentliche HTML- und Produkt-JSON-Seiten zurückgelesen. Zwei ungültige Schutzfeld-Leseabfragen wurden von der Schemaprüfung vor dem Versand an Shopify abgelehnt und lösten keinen Write aus. Die unabhängige QA bestätigte 2/2 GO.

## Quellen, Schutzfelder und Grenzen

Die aktuelle BRUDER-Einzelproduktseite zu beiden Artikeln ist nicht mehr erreichbar. Artikel 63111 und die Altersempfehlung ab vier Jahren sind im offiziellen BRUDER-Manual belegt. Artikel 63155 und das rote Kajak mit Figur sind im offiziellen BRUDER-Katalog 2022 belegt; der Live-Text wurde zusätzlich auf die sechs geprüften Shopify-Bilder begrenzt. Die in Shopify gespeicherten Barcodes wurden nicht als herstellerseitig bestätigte GTIN ausgegeben.

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, Varianten-IDs/SKUs, Barcodes, CHF-Preise, Kaufbarkeit, `tracked=true`, `DENY`, Mengen 32 beziehungsweise 72, Medien-IDs/-URLs und je sieben bestätigte Publikationen blieben erhalten. Die kommerziellen Bearbeitungs- und Werberechte der Bilder sind unbekannt; es erfolgte kein Social-Write.

Unter dem bisherigen Katalognennwert sind **53 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,09380 %**, gerundet rund **0,09 %**. **56’453** beziehungsweise **99,90620 %**, gerundet rund **99,91 %**, bleiben offen. Der Nenner wurde in R114 nicht erneut katalogweit gezählt; der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Öffentliche Schlussbelege:

- Mountainbike HTML: `bbccfba9292773cb04c10ae8b99929426f0fdcf846e0cda55fc9eb503da5da75`
- Mountainbike Produkt-JSON: `24a301f5aa763eebb84bba5a6b0a229719ec761c922cfcd5d37612cb74eb4fd7`
- Kajak HTML: `9a9af72dd14239afbe1937daf51b03b96166d64e99b8aa935adfab716814a822`
- Kajak Produkt-JSON: `ad90a6065be507fed7e8c9f253a1d31491bc5c72d01998c1299dc32a08db7e61`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Metricool-Kennzahlen, Klaviyo und der beendete Kauf-Watch wurden in diesem Kataloglauf nicht abgefragt.
