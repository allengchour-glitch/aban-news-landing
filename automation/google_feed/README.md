# Google-Merchant-Feed-Fixes (2026-07-10)

Aus Merchant-Center-Exports (product_issues + descriptions). mm-google-shopping-Metafelder,
die der Google&YouTube-Shopify-Channel als Feed-Attribute liest. Idempotent via Ledger in dropship/.

- `material_metafield.py` — extrahiert Material aus der Beschreibung → mm-google-shopping.material (443 Prod.)
- `agegender_metafield.py` — age_group=adult + gender (aus Tags) → mm-google-shopping.* (557 Prod.)
- `adult_pull_from_ads.mjs` — zieht eindeutig adulte Artikel aus Shop/TikTok/FB-IG/Google/Pinterest (Online-Store bleibt), Tag erotik+nicht-bewerben.

Offen (nur User / Merchant-Center-UI):
- Ziel-Land auf NUR Schweiz stellen → behebt 1698× "Missing shipping info" (Feed zielt auf DE u.a., Shop liefert nur CH).
- Pricing: 83% der 648 benchmarked Produkte sind teurer als Google-Benchmark (viele +50–143%, meist BigBuy-Werkzeug/Elektronik/Games mit CH-Versand-Last) → Draften oder Preis prüfen.
