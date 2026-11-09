# R161 – Zweite CJ-Webcam exakt gebunden und als deutscher Entwurf bereinigt

Stand: 09.11.2026, 23:09 Europe/Zurich

## Ergebnis

LuxeStyle wurde erneut als `luxestyle.ch` in CHF bestätigt. Shopify-Produkt `16700385853831` bleibt DRAFT, unpubliziert und ohne Storefront-URL. Die einzige Variante `68151215325575` führt weiterhin SKU `CJJD119966501AZ`, Preis CHF 19.90, `tracksInventory=false`, `inventoryPolicy=CONTINUE` und Menge 0. Daraus wurde keine Bestands- oder Lieferzusage abgeleitet.

Zwei eng begrenzte CJ-Lesevorgänge liefen am frisch gebundenen Main-Head `7827e64794f6a918b0c7a828e836138146494748`. Workflow und sieben ausführbare Dateien bestanden die eingebauten Hash-Prüfungen.

- [Run 42708633790](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/42708633790): exakter Produktlookup über `variantSku=CJJD119966501AZ`; PID `1411132898387562496`, Produkt-SKU `CJJD1199665`, Variantensatz vollständig, Identität verifiziert.
- [Run 42708855214](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/42708855214): exakter Inventory-Lookup über diese PID; Varianten-SKU `CJJD119966501AZ` an VID `1411148110746488832` gebunden. Nur CN-Werte: Gesamt-/Fabrikbestand 30'087, CJ-Bestand 0, Warehouse-Code 2; `inventoryPartial=false`, `countryAggregation=false`, Schweizer Lieferbarkeit unbekannt.

Jeder Lauf verwendete genau einen Auth- und Produktrequest; der zweite zusätzlich einen Inventoryrequest. Keine Suche, Pagination, Route, Retries, Importe oder Shopify-Writes durch die CJ-Läufe.

## Deutscher DRAFT-Text

Die fünf aktuellen Bilder wurden visuell geprüft. Sie zeigen eine schwarze Webcam, Halterung, Anschlusskabel sowie die Befestigung an Notebook oder Bildschirm. Sie belegen keine HD-Auflösung und keine «Smart»-Funktion. Deshalb wurden ausschliesslich die gesperrten DRAFT-Inhalte bereinigt:

- Titel: `USB-Webcam für Notebook und Bildschirm`
- deutsche Kurzbeschreibung mit den belegten Angaben USB 2.0, Schwarz, Lieferantengewicht 35 g und Lieferumfang 1 Kamera
- SEO-Titel und Meta-Beschreibung ohne HD-, Smart-, Rabatt- oder Lieferclaim
- fünf bildgenaue deutsche Alttexte

Frische Rücklesung bestätigte DRAFT, keine aktive Publikation, keine Storefront-URL, unveränderten Handle, alle Tags inklusive `grind-gehalten-0911`, CHF 19.90, gleiche Variante/SKU und unverändertes Inventory-Verhalten. Das Produkt wurde nicht aktiviert.

## Offene Sperren

Aktueller Frachtpreis, Lieferzeit, Schweizer Lieferbarkeit und produktspezifische kommerzielle Bildrechte bleiben unbekannt. CN-Fabrikbestand und Methodennamen sind keine Schweizer Bestands- oder Lieferzusage. Vor Aktivierung sind diese Nachweise sowie Preis-/Margenprüfung, Rechteprüfung, Tags und Storefront-Kaufbarkeit erneut produktgenau zu prüfen.

Keine Tageskennzahl-, GSC-, Klaviyo-, DNS-, Kauf-Watch- oder Merchant-Vollabfrage wurde wiederholt. Keine Kunden-, Rabatt-, Budget-, Flow-, DNS-, Merchant-, Social-, Theme-, Bestell-, Fulfillment- oder kostenpflichtige Renderänderung.
