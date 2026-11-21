# R309 – Betroffene Merchant-Angebote geprüft – 21.11.2026

Nach Auftrag «mach alles» einen einzelnen, auf 25 Ergebnisse begrenzten Merchant-Reports-Aufruf für `SHOPPING_ADS` ausgeführt. Konto «LuxeStyle CH» `5797470070` und Shopify-Shop `94368563585` / luxestyle.ch bestätigt. Stichprobe um 23:44 Uhr Zürich.

| Gelieferter Problemcode | Zeilen in der Stichprobe | Befund |
|---|---:|---|
| `item_limit_reached_ads_css` | 13 | Alle 13 Varianten im nativen Shopify-Gegenlesen eindeutig zugeordnet, Produktstatus ACTIVE und im Google-Kanal publiziert. |
| `landing_page_error` | 5 | Vier bekannte Einträge für Schal und Winterhandschuhe. Zusätzlich altes Ring-Angebot `shopify_ZZ_15449171952001_55879851409793`; Produkt DRAFT, nicht im Google-Kanal, alte Variante fehlt und Google-Ziel-URL liefert HTTP 404. |
| `image_unwanted_overlays` | 7 | Sieben konkrete Öl-Sprühflaschen-Varianten, im Shopify-Read jeweils ohne eigenes Variantenbild. Ungeprüfte Bilder fremder Farben oder Packungsgrössen werden nicht zugeordnet. |

Die Stichprobe belegt den exakten Google-Code. Sie ist keine Gesamtzählung und keine Messung der 19’100 Meldungen aus der Oberfläche. Ein gezielter Einzel-Read bestätigt bei Angebot `shopify_ZZ_15447592272257_56063643877761` aus Quelle `10667445201`: `item_limit_reached_ads_css` betrifft die Schweiz bei Shopping Ads. Shopping Ads in Liechtenstein und Free Listings in der Schweiz und in Liechtenstein sind für dieses Beispiel freigegeben.

Die fünf 404-Angebote sind getrennte, klar eingegrenzte Feed-Reste aus der deutschen Shopify-API-Quelle. Vor einer dauerhaften Löschung wurde der konkrete Umfang zur Bestätigung vorgelegt. Aus diesen Fällen folgt keine gesicherte Aufhebung des Anzeigenlimits. Solange das bestätigte Kontingent von 150’000 besteht und die Auslastung nach Quelle fehlt, ist der Antrag im angemeldeten Konto die Möglichkeit zur Erhöhung. 

## Präzisierter Antragstext

> Merchant Center 5797470070, LuxeStyle CH, luxestyle.ch. Google bestätigt für ADS_EEA ein Produktlimit von 150’000 Angeboten. In «Überprüfung erforderlich» werden für die CSS-Shopping-Anzeigen 19’100 betroffene Produkte ausgewiesen (11,3 %). Eine begrenzte aktuelle API-Stichprobe bestätigt den Fehlercode item_limit_reached_ads_css bei aktiven Varianten. Beispiel: shopify_ZZ_15447592272257_56063643877761 aus Quelle 10667445201, Shopping Ads in der Schweiz betroffen, Free Listings weiterhin freigegeben. Bitte prüfen Sie eine Erhöhung für unser aktives Sortiment und nennen Sie, falls verfügbar, die aktuelle Kontingentbelegung je Produktquelle und Land.

## Nachweise

Eine zusätzliche manuelle Reports-Leseoption in der bestehenden Probe auf dem separaten Diagnosebranch, Commit `54434fb431e150fb87be7bbf50ca7734ea83ded3`. 32 lokale und 32 Runner-Tests grün. Reports-POST ist auf die einzelne Lesestichprobe begrenzt. Keine Änderung an Feed, Anzeigenkontingent, Zeitplan oder Standardbranch. [Live-Beleg](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/44958251931/job/137011071392) · [Google-Formular](https://support.google.com/merchants/contact/additional_items?hl=de)
