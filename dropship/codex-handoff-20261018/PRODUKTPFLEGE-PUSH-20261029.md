# LuxeStyle – Produktpflege und begrenzter Merchant-Push, 29.10.2026

Stand: 09:06 Europe/Zurich. Task: `product-attribute-completeness`.

Der aktuelle Inhaberauftrag «pushe produkten saber mit nachtragen» wurde als enger Auftrag zur belegten Pflege bestehender Angaben und zum Push der bestehenden geprüften Merchant-Datenquelle bearbeitet. Die Merchant-Push-Genehmigung besteht bereits; ihr Umfang wurde nicht erweitert.

## Tatsächlich umgesetzt

| Produkt | Live-Änderung | Bestätigung |
|---|---|---|
| [Ladegerät Typ-C (EU-Standard)](https://luxestyle.ch/products/ladegerat-typ-c-eu-standard-613900) – 15447560520065 | Auswahlname «Farbe» → «Ausführung»; sechs Modellwerte unverändert | Native Mutation ohne userErrors; updatedAt 29.10., 09:03:13 Zürich; native und öffentliche Rücklesung HTTP 200 |
| [Schnüffel- und Quietsch-Plüschtier für Hunde](https://luxestyle.ch/products/schnuffel-und-quietsch-pluschtier-fur-hunde-618800) – 15446272016769 | Auswahlname «Farbe» → «Ausführung»; sieben bestehende Texte vereinheitlicht, darunter «Pink Elephant-21CM High» → «Rosa Elefant, 21 cm hoch» und «Orange Elephant-21CM High» → «Orangefarbener Elefant, 21 cm hoch» | Native Mutation ohne userErrors; updatedAt 29.10., 09:03:59 Zürich; native und öffentliche Rücklesung HTTP 200 |

Vorher-/Nachher-Gegenprobe: alle 13 Varianten-IDs, Optionswert-IDs, SKUs, Preise von CHF 15.90, Positionen und InventoryItem-Verknüpfungen erhalten. Tracking weiter false, inventoryPolicy CONTINUE, Bestandszähler 0 und availableForSale true. Daraus folgt keine belegte Lieferzeit oder Bestandszusage. Tags, Produktstatus ACTIVE, Beschreibung und öffentlich gelieferte Bilder blieben unverändert. Die Mutationen verwendeten ausschliesslich bestehende IDs und LEAVE_AS_IS, keine Add/Delete/Position-Argumente. 36 lokale Vorschlagsvergleiche bestanden; der separate GraphQL-Validator übersprang die Prüfung, die nativen Operationen liefen erfolgreich.

Es wurden keine neuen Material-, Mass- oder Leistungsangaben verifiziert oder ergänzt. Die bestehenden «21 cm» wurden lediglich sprachlich übernommen. Bestehende Beschreibungsaussagen sind durch diese Pflege nicht zusätzlich als qualitätsgeprüft bestätigt.

## Merchant-Push: genehmigt, technisch offen

Account `5797470070 / LuxeStyle CH` frisch bestätigt. Windsor bietet für den verbundenen Merchant-Account keine Push-/Fetch-Aktion. Die Datenquellen-Browserseite verlangt eine Google-Anmeldung; kein authentifizierter Schreibzugang und keine aktuelle Source-ID/Art/URL bestätigt. Daher kein Push, kein Ersatzfeed und keine pauschale Kanal-/Produktfreischaltung ausgeführt.

Gezielte Gegenprobe der gelieferten 28.10.-CSVs: neun von 13 exakten Varianten-IDs auffindbar (vier Ladegerät, fünf Plüschtier). 24 historische Problemzeilen betreffen Shopping-Ads-Quota/Kapazität, keine nachgewiesenen Attributfehler. Vier fehlende Treffer bleiben unbekannt. Feedlabel `CHF_99383214465` ist keine bestätigte Datenquellen-ID. Diese historischen Befunde erklären keinen aktuellen Free-Listings-Status; die Beschriftungskorrekturen lösen keine Quota-Zusage aus.

Vorhandene Repo-Helfer gegengeprüft: XML-Generator ist keine Merchant-Fetch-Funktion. Die gemischten Autopilot-Jobs enthalten weitere Aktionen und wurden nicht gestartet. Für diese zwei Produkte ergab die enge Caller-Prüfung keinen konkreten Rückwechsel durch die bekannten Optionsrunner. Laufzeit-/Parallelwriter und produktiver CJ-/Order-Sync wurden nicht vollständig geprüft; ID-Erhalt ist kein allgemeiner Sync-Test und kein verteilter Lock.

## Nächster Arbeitsschritt

Über die vorhandene authentifizierte Merchant-Verbindung genau die aktive Quelle und deren Art nachweisen. Bei Shopify-App-Quelle zunächst diese 13 Varianten gezielt auf aktualisierte Übernahme prüfen; bei bestätigter bestehender Fetch-Quelle nur deren bereits genehmigten isolierten Abruf ausführen und den Abrufstatus zurücklesen. Keine neue Quelle oder gemischten Workflow als Ersatz starten. Für Material-/Massnachpflege bleibt die exakte Lieferanten-/Modellquelle Voraussetzung; Der Material-r4-Runner und eine breite Anreicherung wurden nicht produktiv ausgeführt.

Social-Sperrtags (`rueckhol-0907`) erhalten. Keine weiteren Kennzahlen-, Flow- oder Bestellreports, keine Ads-/Budget-/Rabatt-/DNS-/Flowänderungen. Keine Verkäufe oder Google-Zulassung zugesagt. Claude-Kenntnisnahme bleibt unbekannt.

Beleg: [kuratierter Vorher-/Nachher-Nachweis](PRODUKTPFLEGE-PUSH-BELEGE-20261029.json). Der Nachweis enthält die genauen 13 Variantenbindungen und lokale Quellenhashes; kein Master-Publikationsregister.
