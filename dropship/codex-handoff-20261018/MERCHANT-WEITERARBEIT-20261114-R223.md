# Merchant weiterbearbeitet – R223, 14.11.2026

## Konkrete neue Bereinigung vorbereitet

Zwei alte Merchant-Angebote aus der vorhandenen API-Primärquelle10667445201 sind aktuell als landing_page_error abgelehnt:

| Angebot | Shopify-Gegenprobe | Exakter eingereichter Link |
|---|---|---|
| shopify_ZZ_15516154462593_56177866178945 – Smartwatch mit Kamera und GPS für Kinder | DRAFT, onlineStoreUrl=null, alte Variante fehlt | [HTTP404](https://luxestyle.ch/products/smartwatch-mit-kamera-und-gps-fur-kinder-669504?variant=56177866178945&country=CH&currency=CHF&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic) |
| shopify_ZZ_15516156395905_56177868177793 – i9L Kinder 4G Videoanruf-Uhr | DRAFT, onlineStoreUrl=null, alte Variante fehlt | [HTTP404](https://luxestyle.ch/products/i9l-kinder-4g-videoanruf-uhr-939264?variant=56177868177793&country=CH&currency=CHF&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic) |

Die Quelle wurde frisch als API/de/CHF_99383214465 gelesen; Quell-ID, Angebots-ID, Sprache und Feedlabel sind exakt gebunden. Vollständige Vorher-Datensätze und zwei konkrete delete_product-Requests sind im [Freigabepaket](MERCHANT-ALTE-ANGEBOTE-FREIGABE-20261114-R223.json) gesichert.

**Noch kein Merchant-Write in R223:** Die Einzel-Löschung aus einer API-Primärquelle entfernt das vollständige jeweilige Merchant-Produkt. Deshalb wurde dem Inhaber genau dieses Paar zur Bestätigung vorgelegt. Shopify-DRAFT-Produkte, neue Varianten, Preise und die gesamte Quelle sollen erhalten bleiben. Die aktuelle konkrete Paar-Bestätigung steht noch aus.

## Bestehende Bilder nicht erneut geändert

Vier gezielte Nagellack-Angebote derselben zwei Varianten frisch gelesen: Deutsch Modell1/6 weiter mit neuen Bildern und CH/LI-Freigaben; Französisch Modell1/6 ebenfalls mit textfreien Bildern und CH-Freigaben. Modell1 ohne Artikelfehler, Modell6 nur unit pricing measure / NOT_IMPACTED. Die französischen Zustände werden als vorhanden beobachtet, nicht als neue eigene Korrektur oder als nachgewiesene Folge von R222 ausgegeben.

## Weitere unabhängig erledigte Vorbereitung

Der [offizielle API-Vertragsabgleich](MERCHANT-AUTOFEED-VERTRAG-20261114-R223.json) bestätigt, dass Produkt-Insert/Update/Delete den Datenquellentyp API voraussetzen. Für den bekannten Workout-Preisfall aus AUTOFEED10678939025 wurde damit kein erlaubter Einzel-Löschweg belegt. Kein Delete an einer ungeeigneten Quelle, kein globaler Autofeed-Schalter und keine zusätzliche Supplemental-Quelle.

Französische Merchant-Texte und die französische Produktseite liefern aktuell noch deutsche Titel; die zwei Angebote sind trotzdem genehmigt. Eine [französische Textfassung](MERCHANT-FR-SPRACHENTWURF-20261114-R223.json) liegt als Entwurf vor. Vor einem späteren Textwrite müssen Storefront-Übersetzungen und Merchant-Texte konsistent zusammen geprüft werden. Keine Sprachänderung ausgeführt und kein neuer Google-Fehler daraus erfunden.

Die bestehende Grundpreis-Warnung wird ohne belegten Nettoinhalt nicht durch Verpackungsvolumen/Gewicht oder erfundene Mengenwerte gefüllt. Keine GTIN-Erfindung oder Änderung von identifierExists.

## Umfang

Sechs exakte Merchant-Ressourcen, zwei alte Shopify-Produkte/Varianten und eine Datenquelle gezielt geprüft. Das ist kein Katalogzensus. Keine neuen Tagesberichte, Kauf-Watch-, GSC- oder Klaviyo-Abfragen, Kundenansprache, Posts, Renders, Workflowstarts, neue Automation oder Änderung von Budgets, Rabatten, Versand, DNS oder Shop-Einstellungen. Keine globale0-Fehler-Behauptung. Gemeinsame Übergabe gespeichert bedeutet keinen bestätigten Claude-Empfang.
