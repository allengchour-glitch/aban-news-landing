# Zweiter Merchant-Export: vollständiger lokaler Abgleich, 29.10.2026

**Die zweite Datei ist über den bereitgestellten Drive-Zugang jetzt vollständig lesbar.** Der frühere 32-MiB-Transferblock war real, ist aber kein aktueller Inhaltsblocker mehr. `product_issues_2026-10-29_13-19-04.csv`: 37’867’685 Bytes, SHA-256 `a69f34f30548c7aacc8775825bcefdf791a76b9df1d2d5d1601580f03d5bf9cf`. Keine Geschäfts-/API-Abfragen oder operativen Änderungen.

## Hauptergebnis

**96’530 Fehlerzeilen und 31’083 eindeutige Merchant-Item-IDs.** Alle IDs folgen `shopify_ZZ_<Produktsegment>_<Variantensegment>`, alle Zeilen Feedlabel `CHF_99383214465`, Sprache de, ONLINE. Der Dateiname belegt keine Exportzeitzone und das Feedlabel keine aktive Quellen-ID.

Es gibt **keine Preis- oder availability-Fehlertitel in dieser zweiten Auswahl**. Das ist kein Nachweis, dass die betroffenen Artikel allgemein fehlerfrei oder genehmigt wären. Die Datei ergänzt andere Fehlergruppen; sie ersetzt den ersten Preisfehlerexport nicht.

- 31’083 IDs tragen die Kapazitätsmeldung ausserhalb des CSS-Programms; 17’026 davon zusätzlich die Kapazitätsmeldung innerhalb des CSS-Programms. Die Mengen dürfen nicht addiert werden. 14’057 kommen hier nur im ausser-CSS-Set vor.
- 96’318 Zeilen tragen ELIGIBLE_LIMITED, 212 NOT_ELIGIBLE_OR_DISAPPROVED; alle 96’530 Fehlerzeilen SEVERITY_DISAPPROVED. Itemstatus und einzelne Fehler-Scope-Schwere sind unterschiedliche Felder.
- **Keine identischen Zeilendubletten**, keine doppelten Item-/Fehler-/Land-/Traffic-/Feedlabel-/Sprachschlüssel. Mehrfachzeilen bilden Fehler und Ausspielkontexte ab.

| Fehlertitel | Fehlerzeilen | Eindeutige Item-IDs |
|---|---:|---:|
| Over capacity for Shopping ads (in CSS program) | 34’052 | 17’026 |
| Shopping ads quota limit reached (outside of CSS program) | 62’166 | 31’083 |
| Personalized advertising: personal hardships | 140 | 70 |
| Personalized advertising: Sexual interests | 4 | 2 |
| Restricted adult content | 4 | 2 |
| Promotional overlay on image | 132 | 22 |
| Alcoholic beverages | 8 | 4 |
| Personalized advertising: legal restrictions | 8 | 4 |
| Adult-oriented content | 2 | 1 |
| Local Requirements | 6 | 1 |
| Tobacco products & related equipment | 6 | 1 |
| Personalized advertising: Identity and belief | 2 | 1 |

## Länder und Ausspielarten

| Traffic | Land | Feedlabel | Fehlerzeilen | Item-IDs |
|---|---|---|---:|---:|
| Shopping ads | Switzerland | CHF_99383214465 | 17’050 | 17’040 |
| Dynamic remarketing | Switzerland | CHF_99383214465 | 17’130 | 17’077 |
| Dynamic remarketing | Liechtenstein | CHF_99383214465 | 31’187 | 31’083 |
| Shopping ads | Liechtenstein | CHF_99383214465 | 31’111 | 31’083 |
| Free listings | Liechtenstein | CHF_99383214465 | 28 | 28 |
| Free listings | Switzerland | CHF_99383214465 | 24 | 24 |

Die **52 Free-listings-Zeilen betreffen 28 IDs**: 22 mit Bildüberlagerung (44 Länderzeilen), vier mit Alkoholhinweis (vier Zeilen), eine mit Local Requirements (zwei Zeilen) und eine mit Tabakhinweis (zwei Zeilen). Diese konkreten Free-listings-Befunde sind separat belegt; aus den Shopping-Ads-Kapazitätsmeldungen wird kein Gratis-Eintrag-Ausschluss abgeleitet.

## Vergleich mit dem ersten Preisfehlerexport

Der erste Export `product_issues_2026-10-29_13-18-02.csv` bleibt unverändert bei 20’343 Zeilen / 8’327 eindeutigen IDs: sämtliche IDs mit Preisfehler, 1’353 zusätzlich availability. Seine Feedlabel CH/DE und ID-Formen unterscheiden sich von der zweiten Datei.

**Exakte Item-ID-Schnittmenge: 0.** Die Vereinigung enthält 39’410 unterschiedliche ID-Zeichenketten; das ist weder die Zahl einzigartiger realer Produkte noch ein Gesamtkatalog-Nenner. Fehlende IDs beweisen keine Korrektur oder Löschung.

Die gesuchte Cordhosen-ID `15413245706625_14:691;5:4183#3xl` fehlt in Datei 2, ebenso jedes Item mit Produktpräfix `15413245706625`. Auch `15450835222913_1750786040342345726` und der Elefanten-Produktpräfix fehlen. **Damit liefert die zweite Datei weiterhin keine konkrete Quelle oder eingereichte URL zu den beiden gerade geprüften Preisfehlern.**

Eine begrenzte textuelle Präfixgegenprobe findet genau eine Überschneidung: `15413245510017` (Auto-Lufterfrischer). Im ersten Export existiert `15413245510017_16361786756345133009`, Titelende «black replenishment», mit Free-listings-Preisfehler. Im zweiten Export sind drei `shopify_ZZ_15413245510017_…`-IDs mit Ads-/Remarketing-Kapazitätsmeldungen enthalten; `shopify_ZZ_15413245510017_55749268537729` hat ebenfalls Titelende «black replenishment». Dies ist ein **konkreter Kandidat für spätere native Varianten-/Quellenzuordnung**, kein bewiesener Doppelpost, keine bestätigte doppelte Einreichung und keine bewiesene gleiche Quelle. Keine ID normalisieren oder löschen.

## Quellenfelder bleiben offen

Beide Dateien haben dieselben zwölf Spalten. **Datenquellen-ID, -name, -typ, Merchant-Konto-ID, eingereichte URL, Rohpreis/Währung, Rohavailability und itembezogene Verarbeitungszeit fehlen weiterhin.** Ein Feedlabel ist dafür kein Ersatz. Ohne diese Felder ist weder die Preisfehlerursache noch ein sicherer korrigierender Quellenwrite bestimmt.

Nächster enger Schritt bleibt der authentifizierte Einzelartikelabgleich der betroffenen Original-ID und ihres Rohdatensatzes. Optional bietet der oben dokumentierte gemeinsame Produktpräfix einen zusätzlichen genau begrenzten Vergleich der beiden ID-Formen. Keine Preisänderung, pauschale Quellenlöschung, DRAFT-Aktivierung, Änderung von Shopping-Ausschlüssen oder neue Kampagne daraus ableiten.

[Maschinenlesbare Zähl-/Schnittmengenbelege](CSV2-ABGLEICH-BELEGE.json). Berichtsstatus: vollständig lokal gemessen, keine aktuelle API-Gesamtmessung und keine bestätigte Google-Fehlerbehebung.
