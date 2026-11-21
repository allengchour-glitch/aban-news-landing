# R310 – Fünf veraltete Merchant-Angebote entfernt – 21.11.2026

Nach der konkreten Löschfrage im vorigen Lauf und der anschliessenden Fortsetzungsanweisung des Inhabers ausschliesslich die fünf dort genannten 404-Angebote von Schal, Winterhandschuhen und Ring aus der deutschen Shopify-API-Quelle entfernt.

Shopify `94368563585`, `luxestyle.ch`, CHF und Merchant `5797470070`, «LuxeStyle CH», frisch abgeglichen. Alle drei Shopify-Produkte waren `DRAFT` und im Google-Kanal abgewählt. Alle fünf konkreten Merchant-Ziel-URLs lieferten öffentlich HTTP 404. Google meldete vor der Löschung bei jedem Angebot `landing_page_error` für Shopping Ads und Free Listings in CH/LI. Die fünf Einträge lagen in der API-Hauptquelle `10667445201`, Sprache `de`, Feedlabel `CHF_99383214465`.

| Produkt | Entfernte Angebots-ID | Google-Rücklesung |
|---|---|---|
| Schal | `shopify_ZZ_15447889969537_56063730352513` | HTTP 404 |
| Schal | `shopify_ZZ_15447889969537_56063730549121` | HTTP 404 |
| Schal | `shopify_ZZ_15447889969537_56063730581889` | HTTP 404 |
| Winterhandschuhe | `shopify_ZZ_15447921066369_56052967244161` | HTTP 404 |
| Moissanit-Ring | `shopify_ZZ_15449171952001_55879851409793` | HTTP 404 |

Fünf getrennte Windsor-Löschbestätigungen. Der erste Rückleseversuch über HYPD lieferte bei zwei Angeboten einen allgemeinen Fehler und bei drei noch den bisherigen Datensatz. Daher anschliessend die exakten Google-Produktressourcen über die bestehende authentifizierte Leseprobe gegenlesen lassen. Um `2026-11-21T23:03:34Z` lieferten alle fünf Händlerangebote HTTP 404. Das aktive Kontrollangebot `shopify_ZZ_15447592272257_56063643877761` lieferte HTTP 200 auf derselben Quelle. Shopify-Daten wurden dabei nur gelesen. Vorzustand lokal in `/tmp/luxe-merchant-404-r310-predelete.json`, SHA-256 `8f429a406d5e1e7f7c0f3b4fd8d07a730229f134404fda43dfd2fe5071cd7b50`. [Direkter Google-Rücklesebeleg](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/44959863262/job/137016070082)

## Offene Merchant-Themen

- Shopping-Anzeigen im Preisvergleichsprogramm: Beim aktiven Kontrollangebot liefert Google weiterhin `item_limit_reached_ads_css` für die Schweiz. Die kostenlosen Einträge des Kontrollangebots sind für CH und LI freigegeben. Für das bestätigte Kontingent von 150’000 Angeboten bleibt der vorbereitete Antrag die Möglichkeit zur Erhöhung. [Antragstext](R309-MERCHANT-ANGEBOTE-20261121.md) · [Google-Formular](https://support.google.com/merchants/contact/additional_items?hl=de)
- Bilder: Die exakten offiziellen CJ-Originale für die grünen und gelben Zweierpacks der 470-ml-Sprühflasche geprüft. Beide enthalten Schrift, Masslinien und eingeblendete Funktionsbilder. Die geprüften Vorlagen erfüllen die Anforderungen für das Hauptbild nicht. [Offizielle Produktquelle](https://www.cjdropshipping.com/product/470ml-olive-oil-sprayer-dispenser-for-cooking-bbq-2-in-1-glass-oil-vinegar-soy-sauce-spray-kitchen-oil-bottle-for-air-fryer-p-1773973494024376320.html) · [Google-Bildanforderungen](https://support.google.com/merchants/answer/6324350?hl=de)

Die separate Readback-Option verwendet die bestehende manuelle Probe und ausschliesslich GET nach bestätigter Kontoidentität. Geprüfter Commit `30a3c1326c403a9263701ea0b3794694bd805733`, 35 lokale und 35 Runner-Tests grün. Keine Änderung an Standardbranch, Zeitplan, Shopify-Produktdaten oder Anzeigenbudget.
