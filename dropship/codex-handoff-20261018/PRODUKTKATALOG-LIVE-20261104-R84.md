# LuxeStyle Produktkatalog: kontrollierter Live-Stapel R84

Stand: 04.11.2026, Europe/Zurich

Dieser Lauf setzt den katalogweiten Prüfauftrag in einem begrenzten, vollständig rückgelesenen Fünferstapel fort. Der historische Katalog enthält 56’630 eindeutige Produkt-IDs; diese Zahl ist keine aktuelle Live-Qualitätsquote. Der gesamte Katalog ist noch nicht bereinigt.

Shopify wurde vor den Änderungen frisch als LuxeStyle / `luxestyle.ch` / CHF verifiziert. Metricool Brand `6227837`, Zeitzone `Europe/Zurich` und die sechs bekannten Kanalidentitäten passten ebenfalls. Es gab keine Social-, Merchant-, Theme-, Flow-, DNS-, Rabatt-, Budget- oder Versandänderung.

## Bestätigte Live-Änderungen

| Produkt | Korrektur | Bestätigter Zustand |
|---|---|---|
| 15448534122881 | Titel und Text auf sichtbare Auswahl begrenzt; Kategorie auf «Einteilige Badeanzüge» gesetzt; Produkttyp auf «Damen-Bademode» gesetzt; zwei falsche Jumpsuit-Tags entfernt; SEO neutralisiert | ACTIVE, CHF 17.90–18.90, fünf Varianten kaufbar, `CONTINUE`, nicht getrackt, sechs Bilder, `rueckhol-0907` erhalten |
| 15454092558721 | Neutraler Titel/Text; Kategorie auf «Interaktives Spielzeug» gesetzt; falschen Tag `hund` entfernt; unbelegte Material-/Betriebsclaims aus Text und SEO entfernt | ACTIVE, CHF 44.90, eine Variante kaufbar, `CONTINUE`, nicht getrackt, sechs Bilder, Rabatt- und Rückhol-Tags erhalten |
| 15509968880001 | Unbelegte Aussagen zu 304er Edelstahl, 300 Mikron, Sterilität, Sicherheit und Beständigkeit entfernt; Titel/Text/SEO auf sichtbare Bauform und zwei angebotene Grössen begrenzt | ACTIVE, CHF 23.90, zwei Varianten kaufbar und je mit Bild gebunden, `CONTINUE`, nicht getrackt, `rueckhol-0907` erhalten |
| 15493277024641 | Produkttyp von «Werkzeug & Heimwerken» auf den bestehenden Katalogtyp «Küche & Bar» korrigiert | ACTIVE, offizieller Leaf «Kaffee- & Espressomaschinen», CHF 90.90, drei Varianten kaufbar, Bilder/Tags/Text unverändert, `rueckhol-0907` erhalten |
| 15454415389057 | Produkttyp von «Aufbewahrung & Organizer» auf den bestehenden Katalogtyp «Küche & Bar» korrigiert | ACTIVE, offizieller Leaf «Vakuumierer», CHF 14.90, zwei Varianten kaufbar, Bilder/Tags/Text unverändert, `rueckhol-0907` erhalten |

Alle fünf Mutationen meldeten keine `userErrors`. Nach jeder Mutation wurden Produkt, Status, Beschreibung, Produkttyp, Tags, Taxonomie, SEO, Medien und alle Varianten mit SKU, Preis, Kaufbarkeit, Inventory-Policy und Tracking frisch über Shopify zurückgelesen. Keine Pagination blieb offen. Die öffentlichen Produktseiten antworteten in der unabhängigen HTML-Gegenprobe mit HTTP 200. Bei den drei Textkorrekturen waren die neuen Titel/Texte/SEO vorhanden und die entfernten Altsätze nicht mehr vorhanden.

Beim ersten direkten Shell-Abruf des Badeanzugs antwortete der Zugangsweg einmal mit HTTP 502. Dieser Fehler wurde nicht als 404 oder leere Seite gewertet und der Write nicht wiederholt. Die anschliessende unabhängige Live-Gegenprobe lieferte HTTP 200 und bestätigte den neuen öffentlichen HTML-Stand.

## Bewusst nicht geändert

Produkt 15483793244545, automatischer Seifenspender, bleibt blockiert: Galerie und Varianten mischen verschiedene Geräte, Einzel-/Mehrstückausführungen sowie Akku- und 4×AAA-Angaben. Produkt 15512184586625, Alkoholmeter, bleibt blockiert: technische Skalen, Messbereich, Setbestandteile und Zuordnung sind ohne SKU-spezifische Lieferantenquelle nicht sicher.

Für keines der fünf zuerst geprüften P0-Produkte wurde lokal eine unabhängige SKU-spezifische CJ-/Lieferantenquelle gefunden. Unbekannte Materialien, Masse, Leistung, Kompatibilität, Lieferzeiten und Rechte wurden nicht ergänzt. Alle fünf geänderten Produkte tragen weiterhin `rueckhol-0907`; neue Social-Ausspielung bleibt deshalb gesperrt.

## Nächster kontrollierter Stapel

Die nächsten Kandidaten sind Nudelmaschine 15495105184129, Eisraspler 15448963645825 und Wandlampe 15454472012161. Sie benötigen vor jedem Write einen vollständigen aktuellen Read mit Varianten, Bildern, Tags, Taxonomie, Storefront und Quellenlage. Die zwei quellenblockierten P0-Produkte bleiben separat offen.

Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt. Es wurde kein vollständiger Katalogabschluss behauptet.
