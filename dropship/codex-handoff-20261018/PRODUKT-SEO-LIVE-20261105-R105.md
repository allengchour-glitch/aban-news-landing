# LuxeStyle R105 – Zwei weitere Varianten-Widersprüche live korrigiert

Stand: 2026-11-05T21:42:22+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs bekannten Kanälen wurden vor den Writes frisch passend gelesen. Metricool blieb ohne Write.

## Live korrigiert

| Produkt | Belegter Fehler | Änderung | Geschützte Felder |
|---|---|---|---|
| `15500282003841` | Titel, Body, SEO und alle Alttexte nannten Beige; aktuelle 18 Varianten führen ausschliesslich Milchweiss, Himmelblau und Lavendel-Lila in XS–2XL. Material- und Passformtext war ohne exakte Lieferantenquelle. | Titel zu «Ärmelloses Maxikleid in drei Farben», strukturierter Body nur aus aktuellen Optionen und sichtbarer Form, neue SEO-Felder und 11 bildgenaue Alttexte. Beige-, Material-, Passform-, Lieferzeit- und Zahlungsclaims entfernt. | ACTIVE; Handle, Vendor, Produkttyp, Kategorie, Tags, Optionen, 18 Varianten/IDs/SKUs, CHF 22.90–26.90, Kaufbarkeit, untracked/`CONTINUE`, Mengen 0, 11 Medienbindungen und 6 Publikationen erhalten. |
| `16638316020103` | Titel/SEO nannten Grau/gray, obwohl die 16 aktuellen Varianten nur Weiss oder Schwarz in 38–45 führen. Knie-Schutz, Material, Gewicht, Rutschfestigkeit und Höhenerhöhung waren ohne exakte Quelle. | Titel zu «Herren-Fitnessschuhe in Weiss oder Schwarz», neutraler Options-/Bildtext, neue SEO-Felder und 7 bildgenaue Alttexte. Unbelegte Schutz-, Material-, Gewichts-, Funktions-, Lieferzeit- und Zahlungsclaims entfernt. | ACTIVE; Handle, Vendor, Produkttyp, Kategorie, Tags, Optionen, 16 Varianten/IDs/SKUs, CHF 50.90, Kaufbarkeit, untracked/`CONTINUE`, Mengen 0, 7 Medienbindungen und 6 Publikationen erhalten. |

Je Produkt liefen genau ein `productUpdate` und ein `fileUpdate`. Es gab keine `userErrors`, keinen Retry und keinen unklaren Write. Vollständige Admin-Rücklesungen bestätigten Zieltexte und Schutzfelder. Beide öffentlichen HTML-Seiten und beide Produkt-JSONs lieferten HTTP 200 und zeigten die neuen Titel sowie die aktuellen Variantenwerte. Die unabhängige Schlussprüfung ergab **2/2 GO**; beide Canonicals zeigen weiter auf die unveränderten Handles.

## Quellen- und Qualitätsgrenze

Für die drei geprüften R105-Kandidaten wurde keine exakte CJ-Lieferantenquelle im vorhandenen Repo/Ledger gefunden. Deshalb wurden keine Materialien, Gewichte, Passformen, Schutzwirkungen, Lieferzeiten oder Funktionsversprechen ergänzt. Zulässig waren nur aktuelle Shopify-Optionswerte und visuell bestätigte Produktmerkmale. Handles mit historischen Farbwörtern blieben für URL-Stabilität unverändert.

Unter dem strengen Liveverfahren sind nun **36 von 56’506 ACTIVE-Produkten** vollständig geprüft und korrigiert: **0,06371 %**, gerundet rund **0,06 %**. **56’470** beziehungsweise rund **99,94 %** bleiben unter diesem Massstab offen. Der historische Queue-Scan ist keine aktuelle Qualitätsquote.

Keine Merchant-, Feed-, Versand-, Theme-, Social-, Flow-, DNS-, Budget-, Rabatt-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt. Google-Neuverarbeitung bleibt unbekannt.
