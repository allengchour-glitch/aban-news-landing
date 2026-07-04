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

## Owner
- ✅ **Autonom erledigt:** /pages/faq bereinigt (Deutschland + CHF 99 raus, CHF 50 + korrekte Zeiten, FAQ-Hub).
- ⏳ **Theme/User (können Skripte nicht):** Header-Announcement (CHF 65→50, 2-7→5-12 Werktage), shipping-policy (CHF 65→50), Judge.me hide-when-empty + DE-Lokalisierung.
