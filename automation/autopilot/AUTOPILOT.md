# 🤖 Aban Autopilot Suite — die selbstlernende Automations-Maschine

> Ziel: aus **Lernen → Handeln → Verbessern** eine geschlossene Schleife machen, die (fast)
> ohne Klicks läuft. Alles über **GitLab-CI** (GitHub Actions ist gesperrt), no-op-safe, nur echte
> Daten, keine Halluzination. Eigentums-/Sicherheitsregeln aus `SHARED-MEMORY.md` gewahrt.

## Architektur (3 Schichten)
```
1) SAMMELN   learn_from_youtube.mjs        → youtube-learnings.md      (Trends, je Projekt via YT_PROJECT)
2) VERDICHTEN second_brain.mjs             → SECOND-BRAIN.md           (Konsens-Hashtags/Hooks/Keywords)
3) HANDELN    autopilot/*                   → Vorschläge & Reports      (Brain wird handlungsfähig)
```

## Status der 9 Automationen
| # | Automation | Tool | Status |
|---|---|---|---|
| 1 | ⭐ Auto-Reviews (Sterne → Conversion) | `automation/cj_reviews_import.mjs` | **gebaut** — als GitLab-Job einhängen |
| 2 | 🩹 Conversion-Leak-Radar (Shopify) | `autopilot/conversion_radar.mjs` | ✅ **LIVE (Phase 2)** — Job `shop-autopilot` |
| 3 | 🧹 Katalog-Hygiene (Marken/Safety→DRAFT) | `dropship/shop_audit.mjs` (+ Aktion) | **Audit gebaut**, Aktion auf User-Freigabe |
| 4 | 📌 Pinterest-Auto-Pin (Gratis-Traffic) | `automation/pinterest_publish.mjs` | **gebaut** — wartet auf Pinterest Standard-Access |
| 5 | 📝 Programmatic-SEO Shop-Guides | `autopilot/shop_seo_guides.mjs` | ✅ **LIVE (Phase 2)** |
| 6 | 🛒 Google-Merchant-Feed (Gratis-Listings) | `autopilot/merchant_feed.mjs` | ✅ **LIVE (Phase 2)** — Job `shop-autopilot` |
| 7 | 🔁 Trend → Produkt-Ideen | `autopilot/trend_to_products.mjs` | ✅ **LIVE (Phase 1)** |
| 8 | ✍️ Trends → Caption-Vorschläge | `autopilot/trends_to_captions.mjs` | ✅ **LIVE (Phase 1)** |
| 9 | 📊 Tages-Intelligence-Digest (Telegram) | `autopilot/intelligence_digest.mjs` | ✅ **LIVE (Phase 1)** |

## Phase 1 (jetzt live) — „das Gehirn wird handlungsfähig"
Reines Node, **kein API/Quota-Verbrauch**, läuft im günstigen GitLab-Job `autopilot-intel`:
- `trend_to_products.mjs` → **`PRODUKT-IDEEN.md`**: welche Trends der Shop noch nicht abdeckt → Sourcing-Signale.
- `trends_to_captions.mjs` → **`CAPTION-VORSCHLAEGE.md`**: gelernte Top-Hashtags × Produkte → fertige Captions (Vorschläge).
- `intelligence_digest.mjs` → **`TAGES-DIGEST.md`** (+ Telegram, falls Token gesetzt): alles auf einen Blick.
Ausgabe-Branch: `brain/intel` (nie `main`).

## Phase 2 (nächste Batch — Shopify-Read, ein Job mit SHOPIFY_*-Creds)
- `conversion_radar.mjs` — scannt Live-Produkte: fehlende Reviews/Ratings, FAILED-Bilder, fehlende SEO, schwache Produkte in Ad-Collections → Report + Telegram.
- `merchant_feed.mjs` — Shopify → Google-Merchant-Feed (XML) → kostenlose Shopping-Listings.
- `shop_seo_guides.mjs` — aus `good_products.csv` Ratgeber-Seiten generieren (organischer Such-Traffic).

## Ehrliche Grenze
Automationen optimieren — den Durchbruch bringen die **3 User-Klicks** (TikTok-Pixel, Conversion-Kampagne+Budget, AGB-Domain). Größter Gratis-Conversion-Hebel bleibt **#1 Reviews** (Sterne).
