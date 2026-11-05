# LuxeStyle R110 – zwei weitere Oberteile live korrigiert

Belegstand: 2026-11-05T22:51:56+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanälen wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write. Vor jedem Produkt wurden Remote-Heads, exakte Produkt-IDs, Handles, SKU-Präfixe und Shopify `updatedAt` erneut geprüft. `origin/main` blieb `859132ed6`; der jüngste Claude-LuxeStyle-Head `e04ce11a0` betrifft andere Arbeit. Für die beiden R110-Produkte wurde keine parallele Claude-Code-Bearbeitung gefunden. Eine echte Claude-Empfangsquittung beziehungsweise ein gemeinsamer Live-Lock fehlt weiterhin und bleibt unbekannt.

## Live korrigiert

Produkt `16613732450695` wurde von **«Lockeres Männershirt aus Cord – japanischer Retro-Stil»** auf **«Herren-Overshirt in Cordoptik mit Brusttaschen»** begrenzt. Die 13 Bilder zeigen ein langärmliges Overshirt mit Kragen, Knopfleiste, zwei Brusttaschen mit Patten und gerippter Cordoptik. Baumwolle, weiches Material, Bügelfreiheit, lockere Passform, japanischer Retro-Stil, Gewicht, Nur-Grösse-M sowie produktbezogene Liefer-/Zahlungsclaims waren nicht belegt und wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung sowie Grau/Grün/Braun/Aprikose und M–XXXL. 13 Bilder erhielten bildgenaue Alttexte. Die vier Farb-Medienbindungen blieben unverändert.

Produkt `15524522623361` wurde von **«Off-Shoulder Shirt mit Pflanzen-Print»** auf **«Damen-Off-Shoulder-Shirt mit Pflanzenmuster»** präzisiert. Die sechs Bilder zeigen einen elastisch gerafften Off-Shoulder-Ausschnitt, lange Ärmel und ein schwarzes Pflanzenmuster auf hellem Grund. Polyester, Raglan-Stil, lockerer Sitz, Apricot als Produktoption, Patchwork, Commuter-/Alltagseignung, Nur-Grösse-S, Gewicht sowie produktbezogene Liefer-/Zahlungsclaims wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung und S–XL. Sechs Bilder erhielten bildgenaue Alttexte; Bild 5 ist die Rückansicht, Bild 6 ist eine separate Datei mit demselben Motiv wie Bild 4.

Es liefen genau zwei `productUpdate` und zwei `fileUpdate`, ohne `userErrors`, Mutation-Retry oder unklaren Write. Nach jedem gesendeten Write wurden Admin sowie öffentliche HTML- und Produkt-JSON-Endpunkte zurückgelesen. Beide finalen Storefronts antworteten mit HTTP 200. Die unabhängige Schlussprüfung bestätigte beide Produkte, alle 19 Alttexte und die geschützten Varianten-/Medienbindungen mit 2/2 GO.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, 24 Varianten-IDs/SKUs, CHF-Preise, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und 13 Publikationsknoten blieben erhalten. Mengen 0 sind bei diesen ungetrackten, weiter kaufbaren Varianten kein Ausverkaufsbeleg.

Die T-Shirt-Taxonomie des Overshirts bleibt trotz sichtbarer Overshirt-Form bis zur getrennten Collection-/Template-/Merchant-Prüfung unverändert. Am Overshirt sind kleine, nicht lesbare Etiketten sichtbar; bei den Damenbildern sind kommerzielle Bearbeitungs- und Werberechte der Modelbilder im Produktdatensatz nicht belegt. Daraus folgt keine neue Social-Freigabe. Es wurde kein Social-Post und keine Änderung an Tags, Taxonomie oder Publikationen vorgenommen.

Unter dem strengen Liveverfahren sind **45 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,07964 %**, gerundet rund **0,08 %**. **56’461** beziehungsweise rund **99,92 %** bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Öffentliche Schlussbelege:

- Overshirt HTML: `b04db30fb208d69e636f774d59c89dfbd4bc8c47b67d33f1213b227fd7384e79`
- Overshirt Produkt-JSON: `5d240bc855f7a09e969b05a15e1bce126b13c74336ee84b2c0bb810269b79dfd`
- Off-Shoulder-Shirt HTML: `1f1b3c7f2088fc10671be0623b23a287f44047e1b4874971ccbb6b28830b8eec`
- Off-Shoulder-Shirt Produkt-JSON: `ba2a9beafb519513bbb42297c179985c4ae7ad2647fdbcc1ba2ca599c31cf080`

Unabhängige QA-Belege; dynamisches HTML kann einen anderen Hash haben:

- Overshirt HTML: `946c3d67bbb1002413bf87df685325e9e213fbb2210efd84e6c740b2460ad036`
- Overshirt Produkt-JSON: `5d240bc855f7a09e969b05a15e1bce126b13c74336ee84b2c0bb810269b79dfd`
- Off-Shoulder-Shirt HTML: `4a21084e00f1148dafa6b525e14d26f761fd73ae1b64ba0cad607c77b88704ec`
- Off-Shoulder-Shirt Produkt-JSON: `ba2a9beafb519513bbb42297c179985c4ae7ad2647fdbcc1ba2ca599c31cf080`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
