# LuxeStyle Produkt-Prüfwarteschlange – 04.11.2026

Vollständige, deduplizierte Offline-Warteschlange für den belegten historischen ACTIVE-Export. Sie enthält jedes der 56’630 Produkte genau einmal. Sie ist kein aktueller Shopify-Vollscan, keine Live-Fehlerquote und keine Schreibfreigabe.

## Ergebnis

- Produkte: **56’630**
- P0 Sofortige Evidenz-/Complianceprüfung: **154**
- P1 Priorisierte Datenprüfung: **3’982**
- P2 Routinemässige aktuelle Prüfung: **52’494**
- `autoFixAllowed=true`: **0**

P0/P1/P2 ordnen die aktuelle Gegenprüfung. Sie behaupten nicht, dass ein historischer Kandidat heute noch unverändert live oder definitiv falsch ist. Auch P2-Produkte ohne spezifischen Treffer sind nicht als fehlerfrei zertifiziert.

## Grösste Signalgruppen

| Signalgruppe | Produkte |
|---|---:|
| `delivery_and_trust_claims` | 53’926 |
| `social_guard` | 24’389 |
| `material_and_components` | 2’841 |
| `baseline_review` | 2’326 |
| `title_variant` | 681 |
| `rights_review` | 591 |
| `merchant_product_data` | 260 |
| `taxonomy` | 170 |
| `measurement_scope` | 142 |
| `discoverability_identity` | 138 |
| `policy_and_age_review` | 77 |
| `merchant_policy_review` | 47 |
| `copy_quality` | 42 |
| `claim_contradiction` | 38 |
| `merchant_account_or_scope` | 34 |

## Sichere Arbeitsweise

1. Nur kleine explizite Live-Stapel lesen; der erste deterministische 50er-Stapel liegt separat vor.
2. Pro Produkt vollständige Varianten, SKUs, Preise, Bilder, Tags, Tracking/Policy, Storefront und offizielle Taxonomie lesen.
3. Material, Masse, Funktion, Kompatibilität, medizinische Aussagen und Rechte gegen eine echte modell-/variantenbezogene Quelle prüfen.
4. Erst danach einen minimalen Felddiff erstellen. Kein Queue-Eintrag erlaubt automatische Änderungen.
5. Historische Merchant-Zeilen nach aktiver Quelle, Zielland, Sprache und Marketingmethode getrennt halten.

## Dateien

- `PRODUCT-REVIEW-QUEUE.jsonl` – 56’630 Zeilen – SHA-256 `6761955345d87513d9d5ce3fc1cd14fa9f5629ad853d26eb0fc21face6c98746`
- `PRODUCT-REVIEW-QUEUE.jsonl.gz` – komprimierte, inhaltsgleiche Warteschlange – SHA-256 `12e1ee0244ba502249904a5070887c9377dd80f222157d0d8f57eaf2f4151fc0`
- `LIVE-BATCH-01-50.json` – SHA-256 `b5fd8186aedb99ecfb1a27c3749d06e42624e2052cf8767d3f8d166a370f8159`
- `SUMMARY.json` – maschinenlesbare Definitionen, Abdeckung und Zähler
- `build_product_review_queue.py` – reproduzierbarer Builder
