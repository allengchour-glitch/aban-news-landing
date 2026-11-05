# LuxeStyle R102 – Merchant-CSV-Auswertung und genauer Bildfix

Stand: 2026-11-05T20:36:02+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs erwarteten Kanälen wurden frisch passend gelesen.

## Vollständige CSV-Auswertung

Der Export `product_issues_2026-11-05_09-03-46.csv` hat 22’006 Datenzeilen, 10’628 eindeutige Item-IDs und 6’672 Shopify-Produktpräfixe. Alle IDs folgen `shopify_ZZ_<product>_<variant>`. Es gibt keine exakt doppelten Zeilen, Formeln, Geheimnisse oder eingebetteten Ausführungsanweisungen.

| Befund | Zeilen | Eindeutige IDs | Einordnung |
|---|---:|---:|---|
| CSS-Kapazitätsgrenze | 21’862 | 10’628 | Je 10’931 Zeilen Shopping Ads und Dynamic Remarketing, nur Schweiz; Konto-/Programmthema, kein Produktdatenfix |
| Personal-Hardship-Klassifikation | 70 | 42 | Nur Dynamic Remarketing; keine pauschale Produktsperre |
| Promotional overlay on image | 54 | 10 | Acht Produkte, Free Listings/Shopping Ads/Dynamic Remarketing |
| Pending | 6 | 1 | Verarbeitung offen; nicht verändert |
| Sexual interests plus Restricted adult | je 3 | je 2 | Nur Dynamic Remarketing; nicht auf andere Kanäle übertragen |
| Produktseite nicht erreichbar | 3 | 1 | Genau eine Variante, drei Traffic-Typen |
| Tobacco | 3 | 1 | Keine Richtlinienumgehung oder Umbenennung |
| Identity and belief | 2 | 1 | Nur Dynamic Remarketing |

Die 21’862 Kapazitätszeilen sind weder Produktfehlerquote noch Kataloggrösse. Aus ihnen wurde kein Produkt-, Feed- oder Kampagnenwrite abgeleitet.

## Gezielte Gegenproben

### Gemeldete unerreichbare Produktseite

`shopify_ZZ_15461980373377_55934240031105` ist aktuell ACTIVE. Die Variante «Beige · Gr. 23» kostet CHF 17.90, ist in Shopify kaufbar, ungetrackt und `CONTINUE`. Produkt-, Varianten- und französischer Pfad liefern HTTP 200; die kanonischen URLs passen und Google & YouTube ist publiziert. Der französische Pfad trägt weiterhin deutschen Titel/H1. Die tatsächlich an Google eingereichte URL und der damalige Crawlzustand fehlen im Export. Deshalb wurde weder URL noch Produkt verändert.

### Belegter Bildfehler und enger Fix

Beim ACTIVE-Produkt `15450832961921` war die gemeldete Variante `55889732993409` / SKU `CJ-CJJT149562615OL` («2 Stück in Pink-USB», CHF 24.90) ohne eigene Medienbindung. Das öffentliche Produkt-JSON bestätigte vor dem Write `featured_media=null`; dadurch blieb das allgemeine erste Produktbild relevant. Dieses zeigt einen grünen Ball mit grossem `*3`-Overlay und passt weder Farbe noch Menge der Variante.

Im selben Produkt war bereits das READY-Medium `69886967415169` vorhanden: 1200×1200, exakt zwei pinke Bälle auf Weiss, ohne Werbeoverlay. Genau dieses bestehende Medium wurde in einem `productVariantsBulkUpdate` ausschliesslich der betroffenen Variante zugeordnet. Die Mutation hatte keine `userErrors` und keinen Retry.

Admin-Readback und öffentliches Produkt-JSON bestätigen danach:

- Variantenmedienbindung `55889732993409` → `69886967415169`
- öffentliche `featured_media.id=69886967415169`
- Bild ist nur dieser Variante zugeordnet
- Titel, SKU, CHF 24.90, Kaufbarkeit, ungetracktes Inventar, `CONTINUE`, Status, Handle, Tags einschliesslich `rueckhol-0907` und sieben Publikationen blieben erhalten

Menge 0 bei ungetracktem `CONTINUE` ist weiterhin kein physischer Bestands- oder Lieferzeitbeleg.

## Offene Grenzen

Google-Neuverarbeitung, aktive Merchant-Source-ID und der tatsächlich eingereichte `image_link` bleiben unbekannt. Neun weitere Overlay-IDs bleiben offen. Besonders die gemeldete Drei-Pink-Variante wurde nicht auf ein Einproduktfoto umgebogen: Im geprüften Bestand fehlt ein belegtes sauberes Bild derselben Menge. Richtlinien- und Pending-Fälle wurden nicht umbenannt, entsperrt oder umgangen.

Der strenge Gesamtkatalog-Fortschritt bleibt bei 32 von 56’506 ACTIVE, rund 0,06 %. Dieser Lauf hat eine genaue Varianten-Medienbindung repariert, aber keine vollständige SEO-/Qualitätsprüfung eines weiteren Produkts abgeschlossen.

Nächster Schritt: Nach Google-Neuverarbeitung den exakten Merchant-Bild-/Quellenzustand dieser Variante lesen. Anschliessend die übrigen Overlay-IDs in kleinen, produktgetreuen Stapeln prüfen; CSS-Kapazitäts- und Richtlinienzeilen nicht als Anlass für Produkttextänderungen verwenden.
