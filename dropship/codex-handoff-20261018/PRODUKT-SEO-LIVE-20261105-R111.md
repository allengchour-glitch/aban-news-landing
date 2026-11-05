# LuxeStyle R111 – zwei weitere Damenprodukte live korrigiert

Belegstand: 2026-11-05T23:19:32+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanälen wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write. Vor jedem Produktwrite wurden Remote-Heads, exakte Produkt-ID, Handle, SKU-Präfix und Shopify `updatedAt` erneut geprüft. `origin/main` stand auf `507e8c04d`; der jüngste Claude-Head `5b2f3515b` betrifft das interne 3D-Büro. Für beide R111-Produkte wurde über die Claude-Refs und PRs keine parallele Bearbeitung gefunden. Eine echte Claude-Empfangsquittung beziehungsweise ein gemeinsamer Live-Lock fehlt weiterhin und bleibt unbekannt.

## Live korrigiert

Produkt `16611701883271` wurde von **«Gradient Platform Sandalen mit Riemen – weiss/blau/pink»** auf **«Damen-Plateausandalen mit Schmetterlingsmuster»** präzisiert. Die zehn Bilder zeigen eine markant profilierte Plateausohle, einen silbern wirkenden Vorderriemen, einen gerafften Riemen mit buntem Schmetterlingsmuster und einen Fersenriemen mit Schnalle. Unbelegte PU-/PU-Leder-, Gummi-, Weichheits-, Komfort-, Gewichts-, Korean-, Sitz- und Zehenschutzangaben sowie produktbezogene Liefer-, Prüf-, Rückgabe- und Zahlungsclaims wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung sowie Pink, Blau oder Weiss und die Grössen 34–39. Alle zehn Bilder erhielten bildgenaue Alttexte. Drei pixelgleiche Bildpaare blieben erhalten, weil die später hinzugefügten Dateien als Variantenmedien gebunden sind.

Produkt `15524522754433` wurde von **«Loose Seaside Shirt mit Farbblock-Patch»** auf **«Damen-Langarmbluse mit pink-grünem Muster»** begrenzt. Die sieben Bilder zeigen eine Damenbluse mit pink-grünem abstraktem Muster, Kragen, durchgehender Knopfleiste und langen Ärmeln. Unbelegte Polyester-, Druck-/Färbungs-, Mass-, Gewichts-, Passform-, Strand-, Casual- und produktbezogene Lieferclaims wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung und die tatsächlich auswählbaren Grössen M–XXL. Sieben Bilder erhielten bildgenaue Alttexte; alle vier Varianten blieben an Medium `70777905185153` gebunden.

Es liefen insgesamt genau zwei `productUpdate` und zwei `fileUpdate`, ohne `userErrors`, Mutation-Retry oder unklaren Write. Nach allen gesendeten Writes wurden Admin sowie öffentliche HTML- und Produkt-JSON-Endpunkte zurückgelesen. Bei den Sandalen zeigte die erste öffentliche Rücklesung nach dem Produktwrite noch vollständig den alten CDN-Stand; bei der Bluse war nur das erste Produkt-JSON noch alt. Reine Lesewiederholungen mit Cache-Buster bestätigten anschliessend beide neuen Stände. Es gab keinen zweiten Produktwrite. Die unabhängige Schlussprüfung bestätigte beide Produkte, alle 17 Alttexte, 22 Varianten, sämtliche Varianten-Medienbindungen und die geschützten Admin-/Storefront-Felder mit 2/2 GO.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, 22 Varianten-IDs/SKUs, CHF 20.90 beziehungsweise CHF 26.90, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und 13 Publikationsknoten blieben erhalten. Bei den Sandalen bleibt Pink an Medium `77472634765703`, Blau an `77472634798471` und Weiss an `77472634831239` gebunden; alle vier Blusenvarianten bleiben an `70777905185153` gebunden. Mengen 0 sind bei diesen ungetrackten, weiter kaufbaren Varianten kein Ausverkaufsbeleg.

Eine sichtbare Fremdmarke wurde nicht festgestellt. Kleine Labeldetails und die kommerziellen Bearbeitungs- und Werberechte der Modelbilder sind im Produktdatensatz nicht belegt; daraus folgt keine neue Social-Freigabe. Die T-Shirt-Taxonomie der Bluse blieb bis zu einer getrennten Collection-/Template-/Merchant-Prüfung unverändert. Es wurde kein Social-Post und keine Änderung an Tags, Taxonomie, Publikationen oder Medienbindungen vorgenommen.

Der rein lesend geprüfte Hemd-Kandidat `15520242467201` wurde zurückgestellt: Drei von sieben Galeriebildern zeigen nicht auswählbare Farben beziehungsweise Muster, zwei Bildpaare sind pixelgleich. Das Produkt blieb unverändert und zählt nicht zum Fortschritt.

Unter dem strengen Liveverfahren sind **47 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,08318 %**, gerundet rund **0,08 %**. **56’459** beziehungsweise **99,91682 %**, gerundet rund **99,92 %**, bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Eigene öffentliche Schlussbelege:

- Sandalen HTML: `6b12576101c7a6953f95d3b9899acf94c4cec4d6c00bc8e9fc51087346a08655`
- Sandalen Produkt-JSON: `381bc253f2d1ddfbc53dbb1f763e232f9ca9f6fe0953de1576f6900522fc4246`
- Bluse HTML: `b03c113dec22001fc8573a07148d1d16c59d2704d5ed9410c23b3e9b3228ec53`
- Bluse Produkt-JSON: `3fba1fbb9097d8e257bc4ab079299f31485cfe2f4e799799ebe4cc2dd02489c8`

Unabhängige QA-Belege für die Sandalen; dynamisches HTML kann einen anderen Hash haben:

- HTML: `0d8f5ecb603b28da65adc64d16be269919a0176247e3cc1a21b6c90f037c7aca`
- Produkt-JSON: `381bc253f2d1ddfbc53dbb1f763e232f9ca9f6fe0953de1576f6900522fc4246`

Unabhängige QA-Belege für die Bluse; dynamisches HTML kann einen anderen Hash haben:

- HTML: `879caabc06ebf0a3bd570d52780cf8f29db5218e1e0b01c32abff35c51cc9722`
- Produkt-JSON: `3fba1fbb9097d8e257bc4ab079299f31485cfe2f4e799799ebe4cc2dd02489c8`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
