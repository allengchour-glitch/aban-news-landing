# R307 – Google bestätigt das CSS-Anzeigenlimit – 21.11.2026

Der Inhaber bat um die Korrektur der im Screenshot gemeldeten Shopping-Anzeigenkapazität. Shopify `94368563585` / luxestyle.ch und das Merchant-Konto `5797470070` / «LuxeStyle CH» abgeglichen.

Google bestätigt **150’000 Angebote** für `ADS_EEA` (Shopping-Anzeigen in Ländern des CSS-Programms). Der authentifizierte Nur-Lese-Aufruf lief um 22:41 Uhr Zürich. Google liefert in dieser API-Resource die Obergrenze. Die aktuelle Auslastung je Quelle ist darüber nicht abrufbar. Die 19’100 Betroffenen bleiben der Wert aus dem Inhaber-Screenshot. [Live-Lesebeleg](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/44952839947/job/136994343666) · [Google-API für Produktlimits](https://developers.google.com/merchant/api/reference/rest/quota_v1/accounts.limits)

Dafür eine einzelne manuelle Leseoption in der bestehenden Merchant-Probe auf dem separaten Branch `codex/luxestyle-merchant-css-read-20261121` getestet. Commit `288c0d7e80b64bab7cc03ae381e1d416aa7877cf`: drei geprüfte Dateien, 26 lokale und 26 Runner-Tests grün. Ein manueller Leseabruf, Default-Branch, bestehende Zeitpläne und Live-Feed unverändert. Der Reader prüft Konto und Scope und ruft die Quota-API nur mit GET auf. Die API bietet nur `get` und `list`. Das Formular zur Erhöhung erfordert eine Google-Anmeldung. 

Vier alte Shopify-Angebote aus der deutschen API-Quelle `10667445201` erneut geklärt. Beide Produkte stehen auf `DRAFT`, sind im Google-Kanal abgewählt und liefern öffentlich HTTP 404. Google meldet für die vier konkreten Angebote `landing_page_error`, keinen nachgewiesenen CSS-Kontingentfehler. Shopping-Anzeigen und Free Listings sind für diese Einträge in CH/LI abgelehnt. Die vier Angebote wurden nicht gelöscht.

| Google-Angebot | Shopify-Variante |
|---|---|
| `shopify_ZZ_15447889969537_56063730352513` | `56063730352513` |
| `shopify_ZZ_15447889969537_56063730549121` | `56063730549121` |
| `shopify_ZZ_15447889969537_56063730581889` | `56063730581889` |
| `shopify_ZZ_15447921066369_56052967244161` | `56052967244161` |

## Aktualisierter Antragstext

> Merchant Center 5797470070, LuxeStyle CH, luxestyle.ch. Die Merchant API bestätigt 150’000 Angebote für das Produktkontingent ADS_EEA. Unter «Überprüfung erforderlich» meldet Google 19’100 betroffene Produkte (11,3 %) für Shopping-Anzeigen im Rahmen des Programms für Preisvergleichsportale. Bitte prüfen Sie eine Erhöhung des CSS-Anzeigenkontingents für unser aktives Sortiment. Bitte bestätigen Sie ausserdem die aktuelle Anzahl der dem Kontingent angerechneten Angebote und, soweit verfügbar, deren Aufteilung nach Datenquelle und Zielland.

[Offizieller Antrag](https://support.google.com/merchants/contact/additional_items?hl=de) · [Vorherige Quellen- und Laufgegenprobe](R306-MERCHANT-ANZEIGENKONTINGENT-20261121.md)
