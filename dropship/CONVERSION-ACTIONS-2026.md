# 🛒 Conversion-Actions 2026 (cloud-/API-umsetzbar, kein Theme-Code)

> Engpass (Daten): viel Social-Traffic, ABER Mobile-ATC 0.13 % vs Desktop 1.2 % (9×-Leak), ~0 Reviews,
> ~0 Käufe. Bottleneck = **Trust + Mobile-Kaufabsicht**, nicht Traffic. Alles via Shopify-Admin-API /
> Content / SEO / Metafelder. Strikt CH (CHF, DE+FR).

## Zuerst (Trust, diese Woche)
1. **PDP-Beschreibung = Mobile-First-Benefit-Block** (Vorlage in `descriptionHtml` einbacken, theme-unabhängig):
   1-Zeilen-Benefit-Hook → ✓-Bullets (Material/Anlass/Fit/Pflege) → Trust-Zeile → Detail+cm-Tabelle.
   Batch via `enrich_apparel_descriptions.mjs`/`feed_polish.mjs` (idempotent, MAX/Lauf).
2. **CH-Trust-Zeile auf ALLE Produkte + Collections:** `📦 Gratis Versand ab CHF 65 · 🇨🇭 ganze Schweiz · 💳 TWINT/Karte/PayPal · ↩️ 14 Tage Rückgabe`.
3. **Review-Engine (legal):** Judge.me + `reviews-import.mjs` (nur echte ≥4★) + Klaviyo-Post-Purchase-Review-Flow (kein Sentiment-Incentiv). Nie Fake-Reviews.
6. **Leere Meta-Beschreibungen füllen** (DE, 150–160 Z, Keyword zuerst + CTA): `[Produkt] CHF [Preis] – [Benefit]. Gratis Versand ab CHF 65, 14 Tage Rückgabe. Jetzt in der Schweiz bestellen.`

## Dann (SEO/AOV)
5. **Meta-Titel** product-first: `Damen [Typ] [Merkmal] | CHF [Preis]` (40–60 Z, unique).
9. **Bundle-Collections** („Komplett-Look Kleid+Schmuck", „Geschenk-Set bis CHF 50") via `create-collection`/Shopify Bundles; Gratis-Versand-Schwelle ~25 % über AOV.
10. **Cross-Sell-Metafelder** (`complementary_products`/related) hand-kuratiert (Kleid→Schmuck→Tasche).
12. **Collection-SEO** + granulare Sub-Collections (Anlass/Material/Preis) via Tag-Regeln.

## Dann (Tiefe)
4. **Product-JSON-LD-Metafelder** (`reviews.rating`/`rating_count`, CHF-Offer) sicherstellen → Rich-Snippets.
7. **Ehrliche Scarcity** nur bei echtem Lager (`inventoryQuantity`), kein Fake-Timer (CH-UWG).
8. **Echte, datierte CHF-Rabatte** (`discountCodeBasicCreate`, echtes `endsAt`).
11. **FR-Übersetzungen** (`translationsRegister`) für `descriptionHtml`/SEO/Collections (CH = DE+FR).

> Quellen u. a.: Shopify Fashion-CRO 2026, Cartylabs PDP, FTC Fake-Review-Rule, Swiss Post Payment, Growth Suite Scarcity. Vollständige Liste im Session-Verlauf.
