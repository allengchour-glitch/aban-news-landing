# LuxeStyle R109 – zwei weitere Schuhprodukte live korrigiert

Belegstand: 2026-11-05T22:39:29+01:00. Unabhängige Schlussprüfung: **2/2 GO**.

Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanälen wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write. Vor jedem Produkt wurden die aktuellen Remote-Heads, die exakten Produkt-IDs, Handles und SKU-Präfixe sowie Shopify `updatedAt` erneut geprüft. In aktuellen Claude-Code-Änderungen wurde keine parallele Bearbeitung dieser beiden R109-Produkte gefunden. Der aktuelle beobachtete `origin/main` war `859132ed6`; der jüngste Claude-LuxeStyle-Branch `origin/claude/luxestyle-selbst-gestalten-0511` auf `24d3d192a` betrifft andere Arbeit. Eine echte Claude-Empfangsquittung beziehungsweise ein gemeinsamer Live-Lock fehlt weiterhin und bleibt unbekannt.

## Live korrigiert

Produkt `16639115329927` wurde von **«Herren-Freizeitschuhe aus Kunstleder»** auf **«Herren-Loafer mit Zierschnalle»** begrenzt. Die aktuelle Galerie zeigt niedrig geschnittene Schlupfschuhe in Schwarz oder Braun mit Zierschnalle, sichtbaren Nähten und profilierter Sohle. Material-, Verschleiss-, Rutschfestigkeits-, Komfort-, Geschäftstermin-, Keilabsatz-, Nur-Grösse-39-, Gewichts- und produktbezogene Liefer-/Zahlungsangaben waren nicht hinreichend belegt und wurden entfernt. Der neue Text nennt nur die sichtbare Gestaltung sowie Schwarz/Braun und 39–44. Neun Bilder erhielten bildgenaue Alttexte.

Produkt `15524874355073` wurde von **«Herren-Sneaker mit Schnürung»** auf **«Herren-Sneaker mit Schnürung und Musterdetails»** präzisiert. Der neue Text nennt nur sichtbare Schnürung, farbige Musterdetails, die profilierte Sohle sowie Dunkelblau/Khaki/Hellblau und 39–44. Sport-, Kunstleder-/Leder-, Mesh-/Atmungsaktivitäts-, Gummi-, Viscose-, Rutschfestigkeits-, Absatzhöhen-, Schnitttiefen-, Nur-Grösse-39-, Gewichts- und produktbezogene Liefer-/Zahlungsangaben wurden entfernt. Acht Bilder erhielten bildgenaue Alttexte. Die Varianten-Medienbindungen wurden zurückgelesen: Dunkelblau → `70800702538113`, Khaki → `70800702570881`, Hellblau → `70800702603649`.

Es liefen genau zwei `productUpdate` und zwei `fileUpdate`, ohne `userErrors`, Mutation-Retry oder unklaren Write. Nach jedem gesendeten Write wurden Admin sowie öffentliche HTML- und Produkt-JSON-Endpunkte zurückgelesen. Beide Schlussseiten antworteten mit HTTP 200. Die unabhängige Schlussprüfung bestätigte beide Produkte, alle 17 Alttexte und die Varianten-Medienbindungen mit GO.

## Schutzfelder und Grenzen

ACTIVE-Status, Handles, Produkttypen, Kategorien, Tags, Optionen, 30 Varianten-IDs/SKUs, CHF-Preise, Kaufbarkeit, ungetracktes `CONTINUE`, Mengen 0, Medien-IDs/-URLs/-Bindungen und zwölf Publikationsknoten blieben erhalten. Mengen 0 sind bei diesen ungetrackten, weiter kaufbaren Varianten kein Ausverkaufsbeleg.

Auf den Sneakern ist `GUO CHAO` sichtbar. Beim Loafer sind eine V-förmige Kennzeichnung und ein unklarer Innensohlen-Schriftzug sichtbar. Authentizität sowie kommerzielle Bearbeitungs- und Werberechte sind bei beiden Produkten unbekannt. Beide bleiben deshalb für neue Social-Ausspielung blockiert. Es wurde keine Markenbehauptung, kein Social-Post und keine Änderung an Tags oder Publikationen vorgenommen.

Unter dem strengen Liveverfahren sind **43 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,07610 %**, gerundet rund **0,08 %**. **56’463** beziehungsweise rund **99,92 %** bleiben offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Eigene öffentliche Schlussbelege:

- Loafer HTML: `e49566324f6a94bafdc94b912a6425ea8a57b8bc0b517232a7b38b6af72a3fb4`
- Loafer Produkt-JSON: `ebca631618f0f003e5d491ed2e0463ab97472e1d904238a393b2fb055040a3bf`
- Sneaker HTML: `8061dc28be9457d0f8eb013d96f25ababddb2f0767ab39a8fe3a9012dc659ae5`
- Sneaker Produkt-JSON: `251f27b2d4e8399b6267202042c099d7b4078b576f4256694b67f89a24590fb2`

Unabhängige QA-Belege; dynamisches HTML kann einen anderen Hash haben:

- Loafer HTML: `1acb66fa01e47b4085ea0344282de1a1a29243edfffdf674ce7bbb9a753db50c`
- Loafer Produkt-JSON: `ebca631618f0f003e5d491ed2e0463ab97472e1d904238a393b2fb055040a3bf`
- Sneaker HTML: `c0f49c235b4479965130cc3c0e11798ede788d67a8a7fdb05a003c6ba6f1c6e5`
- Sneaker Produkt-JSON: `251f27b2d4e8399b6267202042c099d7b4078b576f4256694b67f89a24590fb2`

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
