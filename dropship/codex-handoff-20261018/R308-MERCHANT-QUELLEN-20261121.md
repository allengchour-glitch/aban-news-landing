# R308 – Merchant-Quellen hinter dem CSS-Kontingent – 21.11.2026

Nach Inhaberauftrag «weiter fix» eine aktuelle, vollständige Seite der Quellenkonfiguration für «LuxeStyle CH» (`5797470070`) mit dem bestehenden manuellen Nur-Lese-Zugang abgefragt. Ergebnis vom 21.11.2026, 22:49 Uhr Zürich. Vier Quellen, kein weiterer Seitentoken.

| Quelle | Typ | Sprache | Zielländer | Aktive Hauptziele |
|---|---|---|---|---|
| 10667445201 | Shopify-API-Hauptquelle | DE | CH, LI | Shopping Ads, Free Listings und Display Ads |
| 10762220830 | Shopify-API-Hauptquelle | FR | CH | Shopping Ads, Free Listings und Display Ads |
| 10668966945 | Promotionsquelle | EN | In der Antwort nicht geliefert | Keine Produktziele in der Antwort |
| 10795447118 | API-Ergänzungsquelle | In der Antwort nicht geliefert | In der Antwort nicht geliefert | Keine Produktziele in der Antwort |

Die frühere AUTOFEED-Quelle `10678939025` erscheint in der aktuellen vollständigen Quellenliste nicht. Kein unerwartetes Zielland in den beiden Hauptquellen. Die gemeinsame Feed-Kennung `CHF_99383214465` und unterschiedliche Sprachcodes belegen keine doppelten Einreichungen. Die Quellenliste enthält keine Zahl der dem CSS-Kontingent angerechneten Angebote. Die Obergrenze aus R307 beträgt 150’000. Die im Inhaber-Screenshot gezeigten 19’100 Betroffenen bleiben ein eigener Befund.

## Umsetzungspfad

Die beiden Hauptquellen versorgen derzeit sowohl Anzeigen als auch kostenlose Einträge. Es gibt in der frischen Quellenkonfiguration keine zusätzliche Hauptquelle und kein falsches Zielland, das sich gezielt als Ursache abstellen lässt. Eine Angebotsbereinigung kann erst nach Zuordnung konkreter Altangebote zu ID, Sprache, Quelle und Shopify-Status bewertet werden. Google dokumentiert das Entfernen über die ursprüngliche Datenquelle als Weg, Platz freizugeben. Ein Anzeigen-Ausschluss ist keine belegte sofortige Entlastung des Kontingents.

Die Konto-Erhöhung kann nur über das angemeldete Google-Formular beantragt werden. Für die Bereinigungsvariante fehlt der Export der betroffenen Angebote aus «Produkte ansehen» für genau diese Meldung. Zuordnungsschlüssel: Angebots-ID, Sprache, Feed-Label, Datenquelle, Land und Problemcode. Der Export ist ein Lese- und Prüfbeleg und keine Freigabe zum Löschen. [Google-Hilfe zum Produktlimit](https://support.google.com/merchants/answer/14968709?hl=de) · [Antragstext mit bestätigter Obergrenze](R307-MERCHANT-CSS-LIMIT-20261121.md)

## Technischer Nachweis

Bestehende manuelle Merchant-Probe auf dem separaten Diagnosebranch um eine einzelne Quellen-GET-Option erweitert. Commit `a588097577087cb4990bfc26e563b69eda9bb080`, drei geprüfte Dateien. 29 lokale und 29 Runner-Tests grün. Konto- und Ressourcenprüfung, keine Weiterleitungen, maximal zehn Quellenzeilen, maskierte Nutzdaten. Ein manueller Leselauf. Keine Feed-Schreiboperation, Kontingentänderung, Änderung am Standardbranch oder Zeitplan. [Live-Quellenbeleg](https://github.com/allengchour-glitch/aban-news-landing/actions/runs/44953499917/job/136996412367) · [API-Schema](https://developers.google.com/merchant/api/reference/rest/datasources_v1/accounts.dataSources/list)
