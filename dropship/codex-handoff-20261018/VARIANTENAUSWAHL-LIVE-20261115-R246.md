# R246 – Produktdetails direkt bei der Variantenauswahl

Prüfstand: 15.11.2026, ca. 20:37 Europe/Zurich. Ausdrücklicher Auftrag: «prodikt details, auch bei variantwn auswahl».

| Produkt | Jetzt in der Auswahl | Abgrenzung |
|---|---|---|
| [Wandleuchte](https://luxestyle.ch/products/moderne-minimalistische-wandleuchte-622600) | «Lichtausführung» getrennt von «Gehäusefarbe»; «Weisslicht» in Schweizer Schreibweise. | Dieselben 21 Kombinationen aus drei Lichtausführungen und sieben Gehäusefarben. Keine neue Kelvin- oder Anschlusszusage. |
| [Deckenleuchte](https://luxestyle.ch/products/franzosisch-stil-deckenleuchte-mit-sand-textur-617000) | «Lichtfunktion» mit «Stufenlos dimmbar» und «3 Lichtfarben» statt englischer Funktionen unter «Farbe». | Übersetzungen der konkreten Quellvarianten. Grössen 20/30/40 cm unverändert; keine Interpretation als Durchmesser, kein zusätzliches Steuerungszubehör zugesichert. |
| [620er-Konsole](https://luxestyle.ch/products/retro-8-bit-mini-konsole-mit-620-spielen-613200) | «Ausführung», deutsche Europa-/Australien-Bezeichnung und B4-Controller-Stückzahlen. «Umfang prüfen» steht direkt an den B4-Auswahlen. | B4 weder pauschal als komplettes Konsolenset noch als reines Zubehör bezeichnet. Keine weiteren US-/UK-Varianten aus der Quelle hinzugefügt. |
| [Sternenlicht-Projektor](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544) | «Modell und Ausstattung»; USB bei A/B/C/G, 18 Musikstücke bei F und «ohne Fernbedienung» bei G direkt im Modellnamen. | Alle Angaben anhand der sieben einzelnen A–G-Quellvarianten; D/E-Textwerte erhalten. Keine Gesamt-Packliste auf jedes Modell übertragen. |

## Tatsächliche Writes und Schutz

Fünf Änderungen bestehender Optionsdatensätze plus vier dazu passende Beschreibungsanpassungen: **neun bestätigte native Writes**. Fünf Feldnamen und 14 vorhandene Werte umbenannt; Shopify aktualisierte damit automatisch 24 Variantentitel. Strategie LEAVE_AS_IS, keine Option, kein Optionswert und keine Variante hinzugefügt oder gelöscht. userErrors jeweils leer, keine Schreibwiederholung oder unklarer Write.

**Alle 40 Varianten, 28 Optionswert-IDs und 39 Medienreferenzen erhalten.** Varianten-IDs, SKUs/Barcodes, Preise, Bilder, Tracking, Inventar/Policies, Status, Sperrtags, Taxonomie und SEO unverändert. Die Kombinationen bleiben an dieselben IDs und SKUs gebunden. Ursprüngliche öffentliche Kaufbarkeitsflags in der Stichprobe erhalten: 34 true, sechs false. Das ist kein physischer Lagerbeleg.

Vor jeder Mutation vollständige frische Gegenprobe und konkreter Diff; danach vollständige native Rücklesung gegen den exakt vorhergesagten Feld-Diff. Das bestehende Bildauswahl-Element nutzt die neuen Produktdaten automatisch; kein Theme-Code geschrieben.

## Öffentliche und mobile Prüfung

Alle vier Produktseiten und ihre Produkt-JSONs HTTP 200. Neue Auswahltexte und passende Beschreibungen bestätigt; alle 40 Variantenwerte stimmen mit der nativen Rücklesung überein. Öffentliches Produkt-JSON ausser den erlaubten Options-/Variantentiteln und Beschreibungen vorher/nachher hashgleich. H1, echte öffentliche SEO-Titel, Meta-Beschreibungen und Self-Canonicals erhalten.

Mobil im echten Browser bei gemessenen **390 × 844 Pixeln** geprüft. Kein horizontaler Überlauf. Drei Auswahlwechsel ausgeführt, ohne Warenkorb oder Checkout:

| Wechsel / Auswahl | Bestätigte Varianten-ID im Kauf-Formular | Angezeigter Preis |
|---|---|---|
| Projektor F → G über die vorhandene Bildauswahl | 68122445480327 | CHF 35.90 |
| Wandleuchte Weiss → Orange, Lichtausführung Weisslicht | 67841336213895 | CHF 24.90 |
| B4-Controller 1 → 2 Stück | 56053717205377 | CHF 20.90 |
| Deckenleuchte: 3 Lichtfarben / 20 cm gelesen | 56069482447233 | CHF 48.90 |

Die URLs wechselten bei den drei Aktionen ebenfalls auf die richtige stabile Varianten-ID. Alle sieben Projektor-Bildkarten einschliesslich des langen G-Textes und alle sieben Farbtexte der Wandleuchte waren sichtbar und vollständig umbrochen. Die nativen Feldsets sind dort absichtlich verborgen, weil die vorhandene Bildauswahl sie bedient; dies wurde anhand des bestehenden Skripts und der tatsächlichen Interaktionen gegengeprüft. Kein vermeintlicher Auswahlverlust durch einen vorschnellen Rollback.

## Quellen, Gegenproben und Fortsetzung

Vier aktuelle CJ-Quellen an bestehende SKUs und Optionen gebunden; unabhängige günstige Offline-Prüfung der Übersetzungen und Modellangaben. Der separate Schema-Validator übersprang; native Tools validierten die tatsächlichen Mutationen bei Ausführung.

Eine unvollständige lokale Feldsubstitution liess zunächst Optionswert-IDs im geplanten Vollread aus. Vor jedem Write bemerkt, Query korrigiert und neue vollständige Baselines erstellt. Die erste öffentliche Titelprüfung der Deckenleuchte verglich einen nativen null-SEO-Titel mit dem vom Theme abgeleiteten Titel. Vorher-/Nachher-HTTP-Titel waren identisch; Vergleich offline korrigiert, kein weiterer Write. Ein abgelaufener Browserlauf meldete 410; eine neue Sitzung lieferte die bestätigten Mobilprüfungen und wurde danach beendet.

Gamepad-/Powerbank-Zuordnung aus R245, B4-Packumfang, genaue Spielelisten und elektrische Detailangaben bleiben teilweise offen. Keine Varianten auf Verdacht angelegt oder verbunden. Der vorhandene Detailstandard gilt ausdrücklich auch für Auswahlfelder; nächste kleine Gruppe nach Quellen und tatsächlichen Auswahlunterschieden bearbeiten.

Shop luxestyle.ch/CHF/Europe/Zurich und Metricool 6227837 samt sechs Kanälen frisch passend. Keine neuen Kennzahl-, GSC-, Flow-, Umsatz- oder Bestellreports. Kauf-Watch beendet. Keine Social-, Merchant-, Verbindungs-, Preis-, Rabatt-, Budget-, Versand-, DNS- oder Flowänderung, keine Kundenansprache oder bezahlten Renders. Theme-Werkzeuge nur lesend verwendet; zwei schon vorher vorhandene Pending-Dateien nicht angefasst, kein Commit/Publish oder Umgehen der Theme-Beschränkung. Claude-Code-Kenntnisnahme unbekannt.

[Belege](VARIANTENAUSWAHL-BELEGE-20261115-R246.json) · [Konkreter Diff](VARIANTENAUSWAHL-DIFF-20261115-R246.patch) · [40 Varianten vorher/nachher](VARIANTENAUSWAHL-ZUORDNUNG-20261115-R246.csv) · [Optionsplan](VARIANTENAUSWAHL-TEXTE-20261115-R246.json).
