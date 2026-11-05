# LuxeStyle R112 – zwei weitere Produkte live korrigiert

Belegstand: 2026-11-06T00:08:11+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanalidentitäten wurden vor den Writes passend gelesen. Metricool blieb ohne Write. Vor jedem Produkt wurden aktuelle Claude-Code-Refs, PRs, exakte Produkt-ID, Handle, SKU-Präfix und Shopify `updatedAt` gegengeprüft. `origin/main` stand auf `f9c4b5f60`; der jüngste Claude-Head `35d562d2d` betrifft das interne 3D-Büro. Keine Überschneidung mit den beiden R112-Produkten gefunden; Claude-Empfangsquittung und gemeinsamer Live-Lock bleiben unbekannt.

## Live korrigiert

Produkt `15506878333313` wurde von **«Eliza Circle Frosch-Halskrause für Hunde»** auf **«Frosch-Halskrause für Haustiere»** begrenzt. Der neue Text nennt nur das sichtbare grüne Froschdesign, die Katzenabbildungen und die auswählbaren Grössen S–XL. Unbelegte Baumwoll-, Komfort-, Heilungs-, Operations-, Schutz-, Halsumfangs-, Ganzjahres-, Liefer- und Zahlungsclaims wurden entfernt. Fünf Bilder erhielten bildgenaue Alttexte.

Produkt `16604923298183` wurde von **«Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)»** auf **«Fünfteiliges Kostümset mit Blazer und Faltenrock»** präzisiert. Der neue Text nennt nur die fünf sichtbar enthaltenen Teile sowie S–3XL. Unbelegte Woll-, Material-, Gewichts-, Passform-, Anime-Nutzungs-, Liefer- und Zahlungsclaims wurden entfernt. Sieben Bilder erhielten bildgenaue Alttexte.

Es liefen genau zwei `productUpdate` und zwei `fileUpdate`, ohne `userErrors`, Mutation-Retry oder unklaren Write. Admin sowie öffentliche HTML- und Produkt-JSON-Seiten wurden nach den Writes zurückgelesen. Die unabhängige QA bestätigte beide Produkte, 12 Alttexte, 10 Varianten, alle Medienbindungen und 13 Publikationsknoten mit 2/2 GO.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, Varianten-IDs/SKUs, CHF-Preise, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und Publikationen blieben erhalten. Mengen 0 sind bei diesen ungetrackten, weiter kaufbaren Varianten kein Ausverkaufsbeleg.

Die kommerziellen Bearbeitungs- und Werberechte der Produktbilder sind nicht belegt; daraus folgt keine neue Social-Freigabe. Die Halskrause bleibt zusätzlich wegen der medizinischen Taxonomie für Social blockiert. Es wurde kein Social-Post erstellt oder terminiert.

Unter dem strengen Liveverfahren sind **49 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,08672 %**, gerundet rund **0,09 %**. **56’457** beziehungsweise **99,91328 %**, gerundet rund **99,91 %**, bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Öffentliche Schlussbelege:

- Halskrause HTML: `963960a02b0689559a5e7b21aa1296c8ca12c3f8202d306add1b92fc0af83d09`
- Halskrause Produkt-JSON: `6d65b5768ebcc6898d6b52dbb43b25b1e795474cde70a780667b1195d9536e58`
- Kostümset HTML: `9eb9b3f41b6f642b38ec3c389296e79f037e9cad2ce335dcbd961a859d323683`
- Kostümset Produkt-JSON: `30b49dcb49c69d7787698e9f29d15f29d2c854299553a7824b3f27f3b828e4ea`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
