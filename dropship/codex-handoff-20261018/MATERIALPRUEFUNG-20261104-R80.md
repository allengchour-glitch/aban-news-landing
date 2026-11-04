# Katzenhängematte: Materialprüfung am 04.11.2026 (R80)

Produkt: [Faltbare Katzenhängematte mit Saugnäpfen](https://luxestyle.ch/products/faltbare-katzenhangematte-mit-saugnapfen-639500), Shopify 16610153759111, erste Variante 67948229788039 / CJYD321170701AZ. Enger Einzelproduktbefund, kein Katalogscan.

## Aktueller Befund

- Shopify und die öffentliche Produktseite (HTTP 200, 16:22:05 UTC) zeigen im Fliesstext «aus Stoff gefertigt», im Detailblock «Material: Holz». Eine getrennte Zuordnung zu Bezug und Gestell fehlt.
- Die native Shopify-Kategorie lautet «Tiere & Tierbedarf > Haustierbedarf > Futter- & Wasserspender > Reisenäpfe», ID ap-2-14-6. Das Google-Shopping-Metafeld lautet ebenfalls «Animals & Pet Supplies > Pet Supplies > Pet Bowls, Feeders & Waterers». Beide passen fachlich nicht zu einer Katzenhängematte.
- Alle 11 aktuellen Produktmetafelder wurden ohne Pagination gelesen. Sie liefern keinen Material- oder CJ-Quellnachweis. Optionswörter wie Samt/Flausch belegen keine Faserzusammensetzung.
- Shop luxestyle.ch/CHF und Metricool Brand 6227837/Europe/Zurich samt sechs Kanalidentitäten frisch passend. Keine Planungs-/Kennzahlen-/Flow- oder Bestellabfrage für diese Materialfrage.

## Herkunft und Grenzen

Historischer Einzelproduktdatensatz in `/workspace/luxestyle-review/produkttexte-20261026/katalog/active-products.jsonl`, Stand updatedAt 2026-10-25T23:58:51Z, enthält bereits Stoff und Holz. `drafts-v1/blocked.jsonl` markiert denselben Artikel als BLOCKED_NEEDS_SOURCE und existing_source_preserved_not_verified. Damit ist Holz als gespeicherte Altangabe belegt, nicht als tatsächliche Zusammensetzung.

Vorhandene Helfer frisch auf main gelesen: `automation/lib/material.mjs` (Blob cf6a6b663000c0c108b064afcdf4ccd6ed543a8a), `cj_fetch.mjs` (50a16c3a3444f5c5ac1902464522f95d7ce1330f), `cj_token.mjs` (6afe9beab8c3c1a0ec80852e67c7a4b5d10c2cdf). Die Materiallogik überspringt bestehende Detailzeilen; das erklärt einen möglichen Fortbestand, keinen belegten ursprünglichen Erzeuger. Sie warnt vor Verwendung des groben CJ-Felds materialNameEn.

Aktuelle Laufzeit meldet keine bereitgestellten Secrets/Identitäten. Eine authentifizierte Lieferantenabfrage wurde deshalb nicht gestartet. Das beweist keinen fehlenden CJ-Connector oder fehlende GitHub-Secrets. Kein angeblich gesicherter Holzrahmen, keine erfundene Polyester-/Plüschzusammensetzung.

## Enger Korrekturentwurf

Bis zum artikel- und variantenbezogenen Lieferantenbeleg die pauschale Materialzeile «Holz» entfernen und den ungesicherten Materialteil im Satz neutralisieren:

- Vorher: «Sie ist aus Stoff gefertigt und für den ganzjährigen Gebrauch geeignet.»
- Entwurf: «Sie ist für den ganzjährigen Gebrauch geeignet.»
- Vorher: Detailzeile «Material: Holz».
- Entwurf: diese eine Materialzeile entfällt.

Dies ist nur ein Material-Diff. Andere bestehende Produktbehauptungen, insbesondere Masse, Traglast, Wärme-/Atmungseigenschaften und Lieferzeit, werden damit nicht verifiziert. Bezug, Gestell und Befestigung erst nach Originalbeleg getrennt benennen. Passende offizielle Katzenbett-Kategorie vor einer Kategorieänderung gezielt verifizieren; kein geratenes Kategorie-ID-Mapping.

## Status

Nur geprüft und dokumentiert; keine Produkt-, Kategorie-, Metafeld-, Feed-, Theme-, Social- oder Flowänderung. Keine Lieferanten-/Kundennachricht, kein Render oder Workflowstart. Frühere R79-Freigabeentwürfe bleiben unverändert. Diese Prüfung ist keine neue Rechte-/Qualitätsfreigabe und kein Umsatzbeleg.
