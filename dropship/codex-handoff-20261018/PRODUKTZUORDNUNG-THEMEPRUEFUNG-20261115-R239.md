# Zwei Produktkorrekturen und Theme-Gegenprobe – R239

## Bestätigte Shopänderungen

| Produkt | Korrektur | Frische Rücklesung |
|---|---|---|
|[Moderne minimalistische Wandleuchte](https://luxestyle.ch/products/moderne-minimalistische-wandleuchte-622600),15491395846529|Produkttyp Aufbewahrung & Organizer→Beleuchtung; nur aufbewahrung/organizer entfernt|Native Vollrücklesung und öffentlicher Produkt-JSON HTTP200.21 Varianten/13 Medien unverändert.|
|[Französisch-stil Deckenleuchte mit Sand-Textur & Wellenrand](https://luxestyle.ch/products/franzosisch-stil-deckenleuchte-mit-sand-textur-617000),15460287250817|Derselbe minimale Produkttyp-/Tagdiff|Native Vollrücklesung und öffentlicher Produkt-JSON HTTP200.6 Varianten/7 Medien unverändert.|

Die fortgesetzte kleine Sortierkorrektur ist im bestehenden Inhaberauftrag `tech-category-structure-20261102` belegt. Historische Hinweise wurden vorabhängigen Änderungen live gegengeprüft; beide sind bisher nicht in R84–R87 korrigiert worden. Bilder zeigen tatsächlich Leuchten; keine neue Material-, Funktions- oder Mengenzusage. Passende aktuelle Shopify-Leafs hg-13-9-4 und hg-13-9-2 sowie Google-Kategorien blieben erhalten. Beide Produkte ACTIVE; `rueckhol-0907` unverändert, neue Social-Ausspielung gesperrt. Es wurden keine Bestand-/Lieferzeitversprechen gegeben. Öffentliche Verfügbarkeit21/21 beziehungsweise1/6 beschreibt nur die beobachteten Storefront-Flags.

Vor jedem Write wurde derselbe komplette Produktstand nochmals gelesen. Payload jeweils nur id,productType,tags; zwei serielle Writes mit userErrors=[], keine Retries. Nachher ausser productType,tags,updatedAt sämtliche gelesenen Felder identisch: Texte, SEO, Status, Handles, Varianten-IDs/Preise/SKUs/Barcodes/Policies/Tracking und alle20 Medien. Die moderne Barcode-Connection wurde nach einer vor Ausführung verworfenen deprecated-barcode-Abfrage vollständig gelesen; kein unbekannter Barcode als leer behandelt. Geschützte Vorher-/Nachher-Fingerprints sind in den Belegen gleich. Vollständige native Sicherungen bleiben lokal; keine Kunden-/Zahlungsdaten abgefragt.

Das ist keine Vollkatalogquote, keine Kontrolle aller Collection-Mitgliedschaften und kein Beleg für Googles Feedübernahme oder zusätzliche Verkäufe.

## Neues Theme-Prüftor

Theme214040805767 **unveröffentlicht**, MAIN213991391623. Die sieben zuvor freigegebenen Dateien haben dieselben aktuellen MD5-Werte. Zusätzlich bestätigt die native Shopify-Dateigegenprobe zwei neue Unterschiede gegenüber MAIN:

- `layout/theme.liquid`: Restbetrag statt Rabatt-Hochrechnung nun `Math.max(0,SCHWELLE-tot)`; Fortschrittsbreite nun auf total/SCHWELLE.
- `snippets/cart-summary.liquid`: statt der bisherigen Hochrechnung nun `5000 − cart.total_price`, mindestens0.

[Layout-Diff](THEME-VERSAND-LAYOUT-20261115-R239.diff) · [Warenkorb-Diff](THEME-VERSAND-CART-20261115-R239.diff) · [Rechengegenprobe](THEME-VERSAND-RECHENPROBE-20261115-R239.json).

Unter der ausdrücklich gesetzten Annahme10% auf den ganzen Warenkorb ergibt WarenwertCHF40/nettoCHF36 mit der neuen EmpfehlungCHF14 einen neuen NettowertCHF48.60. Die unveränderte UI-Bedingung>=CHF50 wäre damit noch nicht erreicht. Die alte Rechnung empfiehlt in diesem ModellCHF15.56 und erreicht gerundetCHF50. Ohne Rabatt wäre die neue DifferenzCHF10 exakt, die alte Rechnung zu hoch. Diese Beispiele entscheiden die echte Rabatt-/Versandpolitik nicht: aktuelle Checkoutregeln unbekannt, keine echte Cart-/Checkoutaktion. Die Inhabervorgaben öffentlicheCHF50/interneCHF45 nach Rabatt wurden nicht verändert.

Die Herkunft der zwei Themeänderungen ist unbekannt. Die frühere Sieben-Dateien-Freigabe bleibt erhalten; daraus keine Abnahme des erweiterten Theme-Stands ableiten. Vor Publish diese beiden Änderungen mit der aktuellen Rabatt-/Versandlogik prüfen. Keine automatische Rücknahme oder weitere Veröffentlichung durch Codex.

Die Shell-Dateiprüfung enthielt einen verworfenen Aufruf mit nicht unterstütztem`--` und mehrere ausdrücklich gedrosselte Aufrufe mit nichts ausgeführt/60Sekunden. Wartefristen eingehalten; keine Datenlücke als0/404 gewertet. Nach Ablauf der Frist wurden130 bekannte Layout-/Snippetpfade über den nativen Read-only-Dateiweg verglichen, beide Vollquellen und die neun aktuellen Datei-MD5s gezielt zurückgelesen. Beide neuen Diffpfade sind damit tatsächliche gespeicherte Shopify-Unterschiede. Die AGENTS.md der Werkzeugkopie ist kein zusätzlicher Shopinhalt.

Identitäten passen: luxestyle.ch/CHF/EuropeZurich; Metricool6227837/EuropeZurich und alle sechs erwarteten Kanäle. Keine neuen Socialposts, Mediauploads, Merchant-/Flow-/Budget-/DNS-/Versandeinstellungen, neuen Zeitpläne oder Kennzahl-/Bestellreports. Keine andere Marke bearbeitet. [Strukturierter Beleg](PRODUKTZUORDNUNG-THEMEPRUEFUNG-20261115-R239.json). Claude-Empfang unbekannt.
