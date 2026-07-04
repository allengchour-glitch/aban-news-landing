# 🔴 Ehrlichkeits-Audit Live-Shop (2026-07-04, Schwarm #4)

> Agent hat 6 Live-Seiten gefetcht. Echte Verstösse gegen „alles ehrlich" + „strikt CH". Priorisiert.

## 🔴 KRITISCH
1. **Gratis-Versand-Schwelle widerspricht sich VIERFACH:** Header „ab CHF 65" · faq-versand „CHF 50" · shipping-policy „CHF 65" · alte /pages/faq „CHF 99 + 4.90 Pauschale". → EINE Wahrheit = **CHF 50**.
   - ✅ **AUTONOM GEFIXT:** alte `/pages/faq` mit `create_faq_pages.mjs` überschrieben (CH-only, CHF 50, korrekte Zeiten, verlinkt die 5 Detail-FAQs). Deutschland + CHF-99-Block damit weg.
   - ⏳ **NOCH offen (Theme/User):** Header-Announcement-Snippet („ab CHF 65") + `/policies/shipping-policy` („CHF 65") auf CHF 50 ändern.
2. **„Deutschland/Österreich/EU" war LIVE** auf alter /pages/faq (internationale Versandtabelle) → Strikt-CH-Bruch. ✅ mit dem /pages/faq-Overwrite entfernt. (Home/Collections/policies hatten kein „Deutschland".)
3. **Lieferzeit unrealistisch/inkonsistent:** Header „2–7 Werktage" vs. Policies 5–14. Über-Versprechen. → **Header auf „5–12 Werktage"** angleichen (Theme/User).

## 🟡 MITTEL
4. **„No reviews" (englisch) flächendeckend** an Produkten → Trust-Killer + Sprach-Inkonsistenz. → Judge.me „hide when empty" + deutsche Lokalisierung (User/Judge.me-App). Reviews-Import bleibt User.
5. **compareAt/Streichpreise:** geprüft, plausibel (Schmuck 30-33 %, Home 7-8 %) — ✅ kein aufgeblähter Fake gefunden. Nur technisch prüfen, dass kein LEERER „Normaler Preis" ohne Betrag rendert (/collections/all).

## 🟢 OK
- Kein „Swiss Made" auf Produkten (nur „Schweizer Shop" + ehrliche Klarstellung „Produkte von internationalen Herstellern"). ✅
- Deutschland auf Home/Collections/policies nicht vorhanden. ✅

## Owner / STATUS
- ✅ **Autonom erledigt (Pages-API):** /pages/faq bereinigt (Deutschland + CHF 99 raus, CHF 50 + korrekte Zeiten, FAQ-Hub).
- ✅ **Autonom erledigt (Theme-Asset-API, `fix_theme_shipping.mjs`, 2026-07-04):**
  - `sections/header-group.json` (shopweiter Header): „ab CHF 65"→„ab CHF 50", „2–7 Werktage"→„5–12 Werktage" ✓ geschrieben.
  - `templates/index.json` (Homepage-Banner): „ab CHF 65"→„ab CHF 50", „Schweizer Qualität"→„geprüfte Qualität" ✓ geschrieben.
  - Versand-Policy: keine per-API-Policy vorhanden (Text kam aus dem Theme = miterfasst).
- ⏳ **Bleibt (embedded App-UI, per Port/2 Klicks):** Judge.me „hide when empty" — englisches „No reviews" an Produkten ausblenden (Judge.me → Settings → Widget → bei 0 Reviews ausblenden + DE-Lokalisierung). Reviews-Import = User.
- 🛠️ **Tool für künftige Theme-Ehrlichkeits-Fixes:** `fix_theme_shipping.mjs` (Voll-Scan mit Retry/Throttle = zuverlässig alle 211 Assets, exakte Strings, DRY/DUMP/SCAN) — Muster für weitere Theme-Text-Korrekturen per API.

## Nachtrag (Voll-Scan + Live-Verify 2026-07-04 spät)
- ✅ **Voll-Scan fand 2 übersehene Fundstellen:** `templates/product.json` + `templates/collection.json` hatten noch „ab CHF 65" → CHF 50 korrigiert.
  Damit ist „CHF 65" restlos aus dem GANZEN Shop (auch Produkt-/Kategorieseiten, wo gekauft wird).
- ✅ **Live-Verify (echtes HTML) bestätigt:** CHF 50, 5–12 Werktage, „geprüfte Qualität", /pages/faq CH-only — alles gerendert, kein CDN-Cache.
- ⚠️ **Homepage-Meta „…in die Schweiz und nach Deutschland" (nur meta/og/twitter-description, UNSICHTBAR):** verifiziert NICHT im Theme (211 Assets, 0 Treffer)
  und NICHT im Online-Store-Präferenzen-Feld (4 URLs + Nav-Klick, kein Feld). → wird von einer **App** gesetzt, wahrscheinlich **MetaShop (Instagram & Facebook)**
  oder ein SEO-App-Embed. **NUR USER/App-Setting:** in der betreffenden App die Meta-/og-Description von „und nach Deutschland" bereinigen. Reine SEO-Snippet-Kosmetik, keine sichtbare Seite betroffen.
