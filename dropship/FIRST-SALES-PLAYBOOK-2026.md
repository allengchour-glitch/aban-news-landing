# 🎯 First-Sales-Playbook CH 2026 (Recherche-Schwarm + echte Daten)

> Stand 2026-06-22. Zwei Recherche-Agenten + Shopify-Daten. Kern: **der kaufwillige Kanal (Search)
> verhungert, der Volumen-Kanal (Social) konvertiert nicht.** Hebel = Search/Google-Free-Listings wachsen.

## 📊 Daten-Beweis (Funnel nach Quelle, 30 Tage)
| Quelle | Sessions | Warenkorb | Käufe | ATC % |
|---|---|---|---|---|
| direct | 5238 | 16 | 1 | 0,3 % (Bot/Junk-lastig) |
| **social** | 1698 | **0** | **0** | **0 %** |
| **search** | 33 | 2 | 0 | **6 %** (beste Intent, ausgehungert) |

**Lehre:** Social = Reichweite ohne Kaufabsicht (nicht Sales-Kanal). Search = 6 % ATC bei 33 Sessions
→ wenn Search 10–20× mehr Volumen bekäme, kämen die ersten echten Käufe. **Priorität dreht sich:
weg von „mehr posten", hin zu Google-Free-Listings + SEO.**

## 🥇 Highest-ROI: Google Free Listings (gratis, kaufwillig, CH)
CH ist für Google Free Listings unterstützt (Shopping-Tab + Search/Images/Lens/Gemini). Neue Merchant-
Center-Konten sind auto-opt-in → Arbeit = Feed/Policy korrekt, nicht „einschalten".
Legende: **[H]** = einmaliger Google/Merchant-Center-Login (nur User) · **[API]** = cloud-machbar.

1. **[H] Google-&-YouTube-Kanal verbinden + Merchant Center auf CH/CHF/de-CH** — das Tor, das Free Listings über alle Google-Flächen anschaltet. Ohne korrekte CH-Settings zeigt Google nichts. *(wichtigster Schritt)*
2. **[H] Domain luxestyle.ch verifizieren + Free-Listings-Status „Aktiv (Schweiz)" prüfen.**
3. **[API] Misrepresentation vermeiden (Dropshipping-Suspendierungs-Grund #1):** Impressum/Rückgabe/Datenschutz/Versand live + Feed-Preis = Checkout-Preis (CHF, inkl. MwSt). Reviewer vergleichen Feed vs. Live-Seite.
4. **[API] GTIN/identifier:** BigBuy-EAN→`gtin`+`brand`+`mpn`; POD `identifier_exists:false` + Marke + SKU.
5. **[H] Versand- + Rückgabe-Policy im Merchant Center** (CH-Pflicht; fehlt = Listings/Sterne unterdrückt).
6. **[API] Vollständiges Product-JSON-LD** (Shopify-Default fehlt's): `aggregateRating` (Judge.me → Sterne in Google!), `brand`, `gtin`, `shippingDetails`, `hasMerchantReturnPolicy`. Doppeltes Schema (Theme+App) vermeiden.
7. **[API] hreflang `de-CH`, NIE de-DE** (sonst rankt Google dich für Deutschland = falscher Markt).
8. **[API] CH-Intent-Copy/Titel:** Marke+Modell+EAN in Titel/H1/Meta → Long-Tail-Queries gewinnen, wo Galaxus dünn ist.
9. **[H] Sitemap in Search Console + Indexierung anstoßen; Merchant-Diagnostics prüfen.**
10. **[H] Nach Fixes: Review im Merchant Center anfordern** (AI-Review ~2–12 h).

## 🛒 Conversion der bestehenden Besucher (parallel)
- **Hero-Range statt 1300 SKU:** Reviews/UGC auf 20–40 Gewinner konzentrieren (Trust > Auswahl). [API/Kuratierung]
- **Landing = Traffic-Quelle matchen:** Ad/Post → genau DIESE Produktseite, nie Home. [Theme/Cloud]
- **CH-Trust an PDP/Cart/Checkout:** CHF-Endpreis, TWINT-Logo, DE/Mundart, Rückgabe klar, CH-Kontakt. [Theme]
- **Mobile-first + Speed** (75 % Sales mobil; Gast-Checkout erzwingen). [Theme]

## 💸 Bezahlte Ads — ehrlich
Erst NACH Free-Listings/SEO. Paid verstärkt sonst die 0 %. Minimaler Test wenn Hero bewiesen konvertiert:
**CHF 10–15/Tag × 7 Tage, EIN Hero, auf „Add to Cart" optimiert, CH-only.** 0 ATC nach 7 T = Angebot/Preis-Wert ist das Problem, nicht Reichweite.

## ⚖️ CH-Recht
Echte Knappheit ok; **fake Countdown/„nur noch 2" = UWG-Verstoß.** Nur echte Lager-/Sale-Enddaten.

## ➡️ Nächste Aktionen
- **Cloud (ich, jetzt machbar):** JSON-LD/aggregateRating, GTIN-Mapping, de-CH-Konsistenz, CH-Copy, Hero-Kuratierung.
- **Nur User (1× Login, am PC):** Merchant-Center CH/CHF verbinden + Domain + Versand/Rückgabe + Review anfordern (Schritte 1,2,5,9,10).
- **VPS:** systematischer Feed/CAPI-Cron.

_Quellen: Shopify Help (Google channel/free listings), support.google.com/merchants (misrepresentation/identifiers/returns), ewm.swiss + incremys (hreflang de-CH), halothemes/convertcart/dodropshipping (CRO), Swiss Post/payabl (TWINT), ICLG Switzerland (UWG)._
