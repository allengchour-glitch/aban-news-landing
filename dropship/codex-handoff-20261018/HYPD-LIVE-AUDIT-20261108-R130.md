# HYPD-Live-Audit – 08.11.2026, R130

## Verifizierte Verbindungen

- Google Search Console: `sc-domain:luxestyle.ch` und URL-Präfix `https://luxestyle.ch/`, beide `siteOwner`.
- Google Merchant Center: `LuxeStyle CH`, Shop-ID `5797470070`.
- Die Abfragen waren read-only. Kein Produkt-, Feed-, Shop-, Theme-, Anzeigen- oder Social-Write.

## Search Console

Finalisierte Webdaten vom 09.10.–05.11.2026 für `sc-domain:luxestyle.ch`: 65 Klicks, 10'949 Impressionen, CTR 0,59 %, durchschnittliche Position 53,11. Der vorherige Zeitraum lieferte keine Aggregatzeile und bleibt deshalb **unbekannt**, nicht null.

Die stärkste begrenzte Produktseite war `https://luxestyle.ch/products/rizinusol-wickel-wiederverwendbar-bauch-nacken` mit 156 Impressionen, 13 Klicks, CTR 8,33 % und Position 7,10. Die Suchanfrage «rizinusöl wickel schweiz» lieferte 9 Impressionen, 0 Klicks und Position 2,78. Konkreter, noch nicht angewendeter SEO-Titelentwurf:

> Rizinusöl-Wickel Schweiz: Bauch & Nacken | LuxeStyle

Die Seite ist laut URL-Prüfung indexiert, der Canonical stimmt und Crawling ist erlaubt. Fehlende `review`- oder `aggregateRating`-Felder werden nicht mit erfundenen Bewertungen ergänzt. `description`, `shippingDetails` und `hasMerchantReturnPolicy` dürfen nur aus verifizierten Shoprichtlinien ergänzt werden.

Die bekannte französische URL `https://luxestyle.ch/fr/products/elegantes-halterneck-kleid-639800` ist selbstkanonisch indexiert und führte in der Search-Console-Prüfung den deutschen Produktnamen «Elegantes Halterneck-Kleid». Eine auf 50 Zeilen begrenzte `/fr/`-Seitenabfrage war `truncated`; alle zurückgegebenen Zeilen hatten 0 Klicks. Das ist eine Teilmessung und keine Aussage über alle FR-URLs. Claudes bestehender Draft-PR2912/2916 bearbeitet die Noindex-Eindämmung; kein Doppelpatch.

Der Sitemap-Bericht meldete 112'508 Web- und 111'129 Bild-URLs als eingereicht sowie jeweils 0 indexiert. Da die Einzelprüfung gleichzeitig eine indexierte URL belegt, wird dieser Sitemap-Zähler als widersprüchlich beziehungsweise nicht interpretierbar verworfen, nicht als null indexierte Seiten.

## Merchant Center

`merchant_summarize_issues` las 5'000 Produkte und meldete `truncated=true`. Diese Stichprobe ist keine Katalogquote. Eine separate erste Seite mit `page_size=25` hatte einen `next_page_token`; 23 Zeilen trugen `image_unwanted_overlays`, zwei weitere eine andere Policy-Meldung. Der abweichende Summary-Wert von neun Overlay-Produkten ist deshalb kein Gesamtnenner.

Neun Varianten sind konkret an aktuelle Shopify-Produkte gebunden:

| Produkt | Produkt-ID | Varianten / Varianten-IDs | Belegter Bildgrund |
|---|---:|---|---|
| Hall Magnetic Rocker | 15433464381825 | PS5 67788517867911; PS4 67788517900679; XBOX 67788517933447; Switchpro 67788517966215; XBOX Elite Griff 67788518064519 | Texte wie «MATERIAL», «ABS», «Metal» und Massangaben |
| Painless Fast Nail Art Extension Set | 15445274919297 | Butterfly 304 56061669147009 | «POLY GEL SET», «30ML» und Produktbeschriftungen |
| 3-in-1 Magnetische Ladestation | 15447560978817 | Grau-Einzeln 56063588598145 | Uhranzeige und «Deep Space Gray» |
| Li-ion Akku & Ladegerät Set 3000mAh | 15447567040897 | 2 Stück 56063606096257; 4 Stück 56063606129025 | «USA Stock», USPS-Logo und «3000mAh Rechargeable» |

Alle vier Produktseiten antworteten mit HTTP 200 und waren in der gezielten Shopify-Gegenprobe kaufbar. Bildrechte, authentische textfreie Ersatzbilder und exakte Variantenbindung bleiben vor jedem Bildwrite zu belegen. Priorität hat das Entfernen der fremden USPS-/«USA Stock»-Darstellung durch ein verifiziertes Originalbild; keine KI-Ersatzgrafik und keine pauschale Feedänderung.

## Nächster freigabefähiger Schritt

1. Für genau die neun Varianten je ein authentisches, rechtegeprüftes, text- und logofreies Ersatzbild an Produktform, Farbe und Ausführung binden.
2. Vorher-Nachher-Diff pro Variante vorlegen; keine anderen Galeriepositionen oder Produktfelder ändern.
3. Nach Freigabe eng schreiben, Shopify öffentlich zurücklesen und anschliessend dieselben Offer-IDs in HYPD erneut prüfen.
4. Separat den oben formulierten Rizinusöl-SEO-Titel als einzelnen Produktdiff freigeben; keine Wirkung oder Verkäufe versprechen.
