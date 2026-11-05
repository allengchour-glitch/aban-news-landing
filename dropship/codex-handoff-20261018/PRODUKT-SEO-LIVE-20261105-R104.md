# LuxeStyle R104 – Zwei weitere BRUDER-Produkte live korrigiert

Stand: 2026-11-05T21:30:14+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt Instagram, Threads und TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH` und YouTube `UCSfCEYjAsdOyYxyfTClXRZA` wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write.

## Quellenbindung

Die zwei Produkte wurden nicht aus dem Merchant-CSV textlich ergänzt. Artikelnummer, Shopify-SKU, GTIN und vorhandenes Produktbild wurden zuerst gegen die aktuellen offiziellen BRUDER-Seiten gebunden:

| Shopify-Produkt | Shopify-SKU / GTIN | Offizielle Quelle | Ergebnis |
|---|---|---|---|
| `15470028915073` | `fortura-062650` / `4001702626501` | [BRUDER bworld Forstwirtschaftsset 62650](https://www.bruder.de/shop/de/bworld-forstwirtschaftsset/62650) | Artikelnummer und GTIN stimmen exakt. Shop- und Herstellerbild zeigen dasselbe Set; die vom Hersteller erlaubte Variation der Figurenkleidung ist im Text offengelegt. |
| `15470029308289` | `fortura-063010` / `4001702630102` | [BRUDER Polizei-Quad mit Polizist und Ausstattung 63010](https://www.bruder.de/shop/de/polizei-quad-mit-polizist-und-ausstattung/63010) | Artikelnummer und GTIN stimmen exakt. Shop- und Herstellerbild zeigen dasselbe Quad mit Polizist. |

## Live korrigiert

| Produkt | Änderung | Bestätigter Schutz |
|---|---|---|
| `15470028915073` | Titel zu «BRUDER bworld Forstwirtschaftsset» präzisiert. Strukturierter Body mit belegtem Setinhalt, Herstellerempfehlung ab 4 Jahren und Kleinteilehinweis. SEO-Titel/-Beschreibung und ein vorhandener Bild-Alttext aktualisiert. Unbelegte produktbezogene Rabatt-, Zahlungs-, Rückgabe-, Schweizer-Lager- und Lieferclaims entfernt. | ACTIVE; Handle, Tags und Kategorie erhalten. Eine Variante, SKU, GTIN, CHF 36.90, Kaufbarkeit, tracked/`DENY`, Inventarzähler 45, Medien-ID/-URL und acht Publikationen unverändert. |
| `15470029308289` | BRUDER im Titel ergänzt und falsche «Polizistin» anhand Herstellerseite und Bild zu «Polizist» korrigiert. Strukturierter Body mit belegtem Fahrwerk, Ausstattung, Massstab 1:16, Massen 16 × 9,3 × 9,3 cm, Herstellerempfehlung ab 4 Jahren und Kleinteilehinweis. SEO-Titel/-Beschreibung und ein Bild-Alttext aktualisiert. | ACTIVE; Handle, Tags und Kategorie erhalten. Eine Variante, SKU, GTIN, CHF 36.90, Kaufbarkeit, tracked/`DENY`, Inventarzähler 16, Medien-ID/-URL und acht Publikationen unverändert. |

Je Produkt liefen genau ein `productUpdate` und ein `fileUpdate`, ohne `userErrors`, ohne Retry und ohne unklaren Write. Die Admin-Rücklesungen bestätigten alle Zielwerte und Schutzfelder. Beide Produktseiten und beide öffentlichen Produkt-JSONs lieferten HTTP 200. Titel, Alter, Warnhinweis und beim Quad die Masse waren öffentlich sichtbar.

Die unabhängige Schlussprüfung ergab **2/2 GO**. Der weiterhin global im HTML vorkommende Code `WELCOME10` stammt nicht aus den neuen Produktbeschreibungen; der Theme-Banner wurde nicht verändert.

## Fortschritt und offene Grenzen

Unter dem strengen Liveverfahren sind nun **34 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,06017 %**, gerundet rund **0,06 %**. **56’472** beziehungsweise rund **99,94 %** bleiben unter diesem Massstab offen. Der historische 56’630-ID-Queue-Scan ist keine aktuelle Qualitätsquote.

Im 29-Produkte-Scope des hochgeladenen Beschreibungs-CSV sind damit vier eindeutig zugeordnete Produkte bearbeitet. 25 zuordenbare Produkte sowie eine nicht sicher abbildbare Merchant-ID bleiben offen.

Die sieben R103-Overlay-Fälle bleiben blockiert. Vorhandene CJ-Ledger, PR 2896 und die R90/R91-Läufe enthalten keine exakte Varianten-SKU-/Farbe-/Mengen-/Medienbindung für diese sieben SKUs; es wurde deshalb kein Ersatzbild geraten und kein CJ-Workflow gestartet.

Keine Merchant-, Feed-, Länder-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt. Google-Neuverarbeitung bleibt unbekannt.
