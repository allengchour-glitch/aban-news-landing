# LuxeStyle R100 – CSV-gestützter Produktbeschreibungs-Fix

Stand: 2026-11-05T20:02:52+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt sechs erwarteten Kanälen wurden frisch passend gelesen. Metricool blieb ohne Write.

## CSV-Befund

Der hochgeladene Merchant-Export enthält 32 Datenzeilen, 29 eindeutige zuordenbare Shopify-Produkte und eine nicht sicher abbildbare Merchant-ID. Er nennt nur das fehlende Detail «Mindestalter» beziehungsweise «Âge», liefert aber keinen Alterswert. 28 Zeilen sind als Französisch markiert, enthalten jedoch deutsche Beschreibungen; 24 Zeilen enthalten den Rabattcode `WELCOME10`. Die CSV wurde deshalb als Kandidatenliste, nicht als Sachquelle verwendet.

## Live korrigiert

| Produkt | Beleg und Änderung | Erhaltener Zustand |
|---|---|---|
| `15470017380737` | BRUDER Artikel 62702 und GTIN 4001702627027 stimmen mit Shopify-SKU, Barcode und Bildern überein. Neuer Titel «BRUDER bworld Feuerwehrstation mit Feuerwehrmann», Body mit belegtem Setinhalt und Herstellerempfehlung ab 4 Jahren, neue SEO-Felder und 4 Alttexte. | ACTIVE; 1 Variante CHF 47.90; tracked/DENY; Shopify-Zähler 18 / online verkaufbar 18; 4 READY-Bilder; 7 Publikationen. Keine Lieferzeit- oder Lagerherkunftszusage. |
| `15470032945537` | BRUDER Artikel 62250 und GTIN 4001702622503 stimmen mit Shopify-SKU, Barcode und Bildern überein. Neuer Titel «BRUDER bworld UPS Paketshop mit Figur», Body mit belegtem Setinhalt, Herstellerempfehlung ab 4 Jahren und offiziellem Kleinteilehinweis, neue SEO-Felder und 4 Alttexte. | ACTIVE; 1 Variante CHF 32.90; tracked/DENY; Shopify-Zähler 49 / online verkaufbar 49; 4 READY-Bilder; 7 Publikationen. Keine Lieferzeit- oder Lagerherkunftszusage. |

Offizielle Quellen: [Feuerwehrstation 62702](https://www.bruder.de/shop/de/bworld-feuerwehrstation-mit-feuerwehrmann/62702) und [UPS-Paketshop 62250](https://www.bruder.de/shop/de/bworld-ups-paketshop-mit-figur/62250).

Je Produkt liefen genau ein `productUpdate` und ein `fileUpdate`, ohne `userErrors` und ohne Retry. Die alten unbelegten Rabatt-, Zahlungs-, Rückgabe- und Liefertexte wurden aus der Produktbeschreibung und den Produkt-SEO-Feldern entfernt. Der globale Rabattbanner des Themes wurde nicht verändert.

Die unabhängige Vorabprüfung ergab 2× GO. Die unabhängige Schluss-QA bestand **40/40** öffentliche Kontrollen, **2/2 GO** und **8/8** exakte Alttexte. IDs, Handles, Status, Kategorie, Tags, Optionen, Varianten, SKUs, Barcodes, CHF-Preise, Kaufbarkeit, Inventar, Tracking, `DENY`, Medienstruktur, Bindungen und 14 Publikationsknoten blieben erhalten. Judge.me spiegelte den neuen Titel und die deutsche Nullbewertungsanzeige; Zahl und Durchschnitt blieben 0.

## Fortschritt und Grenzen

Frisch exakt sind 56’506 ACTIVE und 87’774 Produkte aller Status. Unter dem strengen Liveverfahren sind nun 32 ACTIVE-Produkte vollständig geprüft und korrigiert: **0,05663 %**, gerundet rund **0,06 %**; 56’474 beziehungsweise rund **99,94 %** bleiben unter diesem Massstab offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Im CSV-Scope bleiben 27 eindeutig zuordenbare Produkte sowie eine nicht sicher zuordenbare Merchant-ID offen. Ein dritter Kandidat wurde bewusst nicht geschrieben, weil die vermutete aktuelle Herstellerseite HTTP 404 lieferte. Die Shopify-Texte der zwei Produkte sind korrigiert; die Merchant-Diagnose gilt erst nach einer späteren Google-Neuverarbeitung als behoben. Die `fr`/Deutsch-Abweichung ist ein separater Feed-/Sprachbefund und wurde nicht mit erfundenem französischem Text verdeckt.

Keine Metricool-, Merchant-, Theme-, Flow-, DNS-, Budget-, Rabatt-, Versand-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
