# Merchant-Availability R168

Stand: 2026-11-10T12:09:32+01:00

## Freigabe und Ergebnis

Der Inhaber hat den in R167 exakt beschriebenen Merchant-Schritt freigegeben: Beim Angebot `13331643115375957532` in Datenquelle `10678939025` sollte der aktuelle Shopify-Wert `availableForSale=true` als `in_stock` abgebildet und danach genau dieses Angebot zurückgelesen werden.

Die unmittelbar vor dem vorgesehenen Write ausgeführte Gegenprobe zeigte den Zielzustand bereits vollständig. Merchant Center `5797470070` meldet für `accounts/5797470070/products/de~CH~13331643115375957532` das Attribut `availability=IN_STOCK`. Die frühere Beanstandung `item_missing_required_attribute` für `availability` ist nicht mehr vorhanden. Ein weiterer Write hätte keinen fachlichen Diff erzeugt und wurde deshalb nicht ausgeführt.

Es ist unbekannt, wann oder durch welchen bestehenden Ablauf der Zielzustand erreicht wurde. R168 leitet daraus keine Codex-, Connector- oder Verkaufsverursachung ab.

## Frische Identitäts- und Produktgegenprobe

- Shopify: `LuxeStyle`, `luxestyle.ch`, CHF, Schweiz.
- Merchant Center: `LuxeStyle CH`, ID `5797470070`.
- Angebot: `13331643115375957532`, Sprache `de`, Feedlabel `CH`.
- Datenquelle: `accounts/5797470070/dataSources/10678939025`.
- Merchant-Verfügbarkeit: `IN_STOCK`.
- Merchant-Preis: CHF 15.90.
- Shopify-Produkt `15500960530817`: ACTIVE und öffentlich erreichbar.
- Variante `56110933803393`, SKU `CJ-2410060358241610800`: CHF 15.90, `availableForSale=true`, `inventoryPolicy=CONTINUE`, Bestandsverfolgung deaktiviert.

Eine zweite enge Merchant-Rücklesung und eine unabhängige Gegenprüfung bestätigten denselben Zustand.

## Verbleibende Beanstandung

Free Listings sind für die Schweiz freigegeben. Für Liechtenstein bleibt die getrennte Beanstandung `missing_shipping_no_shipping_service_defined_for_country` bestehen. Die erteilte Freigabe umfasste keine Versand-, Länder-, Preis-, Produktstatus- oder Kontoeinstellung. Deshalb wurde diese Beanstandung nicht verändert.

## Writes und Grenzen

- Merchant-/Feed-Write: 0; gewünschter Zielzustand war vor dem Write bereits vorhanden.
- Shopify-Write: 0.
- Versand-, Preis-, Länder- oder Produktstatusänderung: 0.
- Metricool-, Klaviyo-, Kunden-, DNS-, Theme-, Budget-, Rabatt- oder Renderänderung: 0.
- Ranking- und Verkaufswirkung: unbekannt.
- Claude-Code-Kenntnisnahme: `unknown_no_claude_receipt`.

[LUXESTYLE_R168_20261110]
