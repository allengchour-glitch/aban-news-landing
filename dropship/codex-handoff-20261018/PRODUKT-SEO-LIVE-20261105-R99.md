# LuxeStyle R99 – kontrollierter Katalog-Push

Stand: 2026-11-05T19:39:40+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** mit allen sechs erwarteten Kanalidentitäten wurden frisch passend gelesen. Metricool blieb ohne Write.

## Ergebnis

Genau drei ACTIVE-Produkte wurden auf einer exakten GID-Allowlist seriell aktualisiert. Je Produkt gab es einen `productUpdate` für Titel, belegbaren Body und SEO sowie einen `fileUpdate` ausschliesslich für bestehende READY-Bild-Alttexte. Alle sechs Mutationen meldeten keine `userErrors`; es gab keinen Retry. Nach jedem Produkt folgten vollständige Admin- sowie öffentliche HTML-/Produkt-JSON-Rücklesungen.

| Produkt | Live-Korrektur | Erhaltener Zustand |
|---|---|---|
| `15448913281409` | «Schwarzer Rucksack mit mehreren Fächern»; Material-/Herren-/Volumen-/Funktions- und Lieferclaims entfernt; 5 Alttexte | ACTIVE; 1 Variante CHF 60.90; 5 READY-Bilder; 7 Publikationen |
| `15493835751809` | «Dekorativer Kissenbezug in 27 Designs»; Material-/Mass-/Stickerei-/Pflege- und Lieferclaims entfernt; 28 Alttexte | ACTIVE; 27 Varianten CHF 16.90–19.90; 28 READY-Bilder; 6 Publikationen |
| `15493851480449` | «Farbiges Segment-Armband in 8 Varianten»; Material-/Mass-/Elastizitäts-/Komfort- und Lieferclaims entfernt; 13 Alttexte | ACTIVE; 8 Varianten zu CHF 16.90; 13 READY-Bilder; 6 Publikationen |

Die unabhängige Vorabprüfung ergab 3× GO. Die unabhängige Schluss-QA bestand **60/60** öffentliche Prüfungen, **3/3 GO** und **46/46** exakte Alttexte. Report-SHA-256: `5a1606459ec1b9324ab2ed9efde4d81bc16a668bceb33583814a92c621cf3643`. Geschützt blieben IDs, Handles, Status, Vendor, Typen, Kategorien, Tags, Optionen, 36 Varianten, SKUs, Barcodebasis, CHF-Preise, Kaufbarkeit, Inventarzähler, Tracking, `CONTINUE`, Medien-IDs/-URLs/-Reihenfolgen/-Bindungen, 19 Publikationsknoten und Nicht-SEO-Metafelder. Shopifys SEO-Spiegel änderten sich erwartungsgemäss.

Alle drei Variantenbestände sind ungetrackt mit `CONTINUE`; Shopify-Kaufbarkeit und Zähler 0 sind kein physischer Lieferantenbestand und kein Lieferzeitbeleg. `rueckhol-0907` blieb an allen drei Produkten erhalten; neue Social-Ausspielung bleibt blockiert.

## Fortschritt und offene Strukturarbeit

Der historische Snapshot mit 56’630 eindeutigen ACTIVE-IDs ist rund 100 % offline gescannt und priorisiert, aber nicht vollständig live korrigiert. Frisch exakt sind 56’506 ACTIVE und 87’774 Produkte aller Status. Unter dem strengen R82–R99-Verfahren sind 30 ACTIVE-Produkte vollständig live geprüft und korrigiert: **0,05309 %**, gerundet rund **0,05 %**; 56’476 beziehungsweise rund 99,95 % bleiben unter diesem Massstab offen. Die aktuelle Qualitäts- und Attributabdeckung bleibt unbekannt.

Offen bleiben die drei historischen Handles mit Leder-/Samt-/Harzbegriffen, die Leder-/Herren-Sortiertags beim Rucksack sowie geschützte Google-Shopping-Materialmetafelder bei Kissenbezug und Armband. Diese Felder wurden bewusst nicht pauschal verändert. Nächster sinnvoller Entwurf zur Freigabe: ein getrenntes redirect-/canonical-sicheres Struktur-Audit mit aktueller Collection-, Feed- und Rankinggegenprobe.

Keine Metricool-, Merchant-, Theme-, Flow-, DNS-, Budget-, Rabatt-, Versand-, Kunden-, Bestell- oder Renderänderung. Tageskennzahlen, Klaviyo und der beendete Kauf-Watch wurden nicht erneut abgefragt.
