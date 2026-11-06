# R116 – beschleunigter, kontrollierter Katalogbatch

Zeitpunkt: 06.11.2026, 13:10 Uhr Europe/Zurich. Shopify wurde als **LuxeStyle / luxestyle.ch / CHF / Schweiz** bestätigt. Dieser Lauf änderte acht eindeutig abgegrenzte ACTIVE-Produkte. Er ist kein Abschluss des Gesamtkatalogs.

## Live geändert

| Produkt | Belegter neuer Fokus | Schutz- und Rücklesestatus |
|---|---|---|
| `15481260048769` | Magnetisches Smartwatch-Ladegerät mit Trageschlaufe; fünf aktuelle Farben | 5 Varianten, CHF 14.90, 20 Alttexte, 7 Publikationen |
| `15448930812289` | Kabelloser Lockenstab; fünf aktuelle Farben und sichtbare Zubehöransichten | 5 Varianten, CHF 18.90–19.90, 8 Alttexte, 8 Publikationen |
| `15449512903041` | Damenbluse mit Brusttaschen und ausgestellten Ärmeln | 15 Varianten, CHF 15.90–16.90, 8 Alttexte, 7 Publikationen |
| `15449576767873` | Herrenpullover in 2-in-1-Optik mit Hemdkragen | 15 Varianten, CHF 22.90–23.90, 8 Alttexte, 7 Publikationen |
| `15460665393537` | Mobiler 4G-LTE-Router; nur sichtbare Ansichten und abgebildetes Zubehör | 1 Variante, CHF 49.90, 5 Alttexte, 8 Publikationen |
| `15448075829633` | Damen-T-Shirt mit dem tatsächlich sichtbaren Weihnachtsmotiv 2025 | 96 Varianten, CHF 14.90–15.90, 20 Alttexte, 7 Publikationen |
| `15449475514753` | Schwarzer Herren-Hoodie mit Hai- und Ankermotiv | 8 Varianten, CHF 15.90–18.90, 2 Alttexte, 7 Publikationen |
| `15449474793857` | Herren-Pullover mit Kontrastkragen und kurzem Reissverschluss; falsche Kapuzenbezeichnung entfernt | 24 Varianten, CHF 16.90–18.90, 8 Alttexte, 7 Publikationen |

Alle acht Produkte erhielten belegte Titel-, Beschreibungs-, SEO- und Alttextkorrekturen. Unbelegte Material-, Leistungs-, Komfort-, Lieferzeit-, Rabatt-, Prüf- und Bestandsbehauptungen wurden nicht übernommen. Handles, Status, Vendor, Produkttypen, Kategorien, Tags, Optionen, Varianten-IDs, SKUs, CHF-Preise, Inventarzähler, Tracking, `CONTINUE`, Medien-IDs/-URLs/-Reihenfolgen/-Bindungen und Publikationen blieben unangetastet. Alle Produkte tragen weiterhin `rueckhol-0907`; dieser Tag blockiert neue Social-Ausspielung.

## Write- und QA-Beleg

Acht `productUpdate` und neun erfolgreiche `fileUpdate` führten zu 79 finalen Alttexten; ein Alttext wurde nach der unabhängigen Sprachprüfung nochmals grammatikalisch präzisiert. Beim letzten Produkt schrieb der kombinierte Aufruf die Produktfelder erfolgreich, während `fileUpdate` acht veraltete Medien-IDs klar als nicht vorhanden zurückwies. Danach wurden die aktuellen Medien-IDs frisch gelesen und genau ein enger `fileUpdate` nur für diese acht Alttexte erfolgreich ausgeführt. Das war kein unklarer Write und kein blinder Retry.

Die abschliessende Admin-Gegenprobe und eine unabhängige Schlussprüfung bestätigten acht ACTIVE-Produkte, exakte neue Titel, Bodies und SEO-Felder, 169 Varianten, eindeutige SKUs, unveränderte Preise, `tracked=false`, `inventoryPolicy=CONTINUE`, Mengen 0, 79 erreichbare Bilder mit Alttext sowie `rueckhol-0907`. Eine gemeinsame öffentliche Gegenprobe bestätigte für alle acht Produktseiten und Produkt-JSONs HTTP 200, passende IDs/Handles/Canonicals/Titel, 169/169 verfügbare Varianten und korrekte Bildzahlen. Die zwei verlinkten Kollektionen antworteten ebenfalls HTTP 200. Root-QA und unabhängige QA: **8/8 GO**.

Claude-PR #2907 wurde frisch bis Head `193f3397090f6db24d896cc19ad104753d1608cd` geprüft. Seine 43 konkreten Produkt-IDs überschneiden sich mit keinem der acht R116-Produkte. Ein gemeinsamer Live-Lock oder Claude-Receipt bleibt unbekannt; deshalb wurde jedes Produkt unmittelbar vor dem Write frisch gelesen.

## Fortschritt und offene Fälle

Der strenge Livefortschritt steigt von 53 auf **61 von 56’506 ACTIVE-Produkten**, entsprechend **0,10795 %**, gerundet **0,11 %**. Damit bleiben **56’445** beziehungsweise rund **99,89 %** unter diesem strengen Massstab offen. Das ist keine Aussage, dass alle übrigen Produkte fehlerhaft sind.

Produkt `15454069555585` blieb ohne Write: Die Pixel-5A-Variante ist aktuell an ein sichtbar als Pixel 4A bezeichnetes Bild gebunden; eine korrekte Ersatzbindung ist ohne Lieferanten-/SKU-Beleg nicht bestimmbar. Adult-, Medizin- und weitere Policy-Fälle wurden ebenfalls nicht als Schnellkorrekturen verwendet. Beim Router bleiben der fachfremde Produkttyp und historische Tags separat strukturell zu prüfen; beim Herren-Pullover bleiben alter Hoodie-Handle und Sortiertags bis zu einer Redirect-/Collection-/Merchant-Gegenprobe erhalten. Das Weihnachtsmotiv 2025 wurde wahrheitsgemäss benannt, ist 2026 aber saisonal veraltet und benötigt für eine neue Saison echte neue Motive statt erfundener Aktualisierung. Drei Modeprodukte haben weiterhin keine variantenbezogenen Bildbindungen; die Galerien sind intakt, eine sichere neue Zuordnung fehlt.

Keine Metricool-, Klaviyo-, Merchant-, Feed-, Theme-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen und der beendete Kauf-Watch wurden nicht wiederholt.
