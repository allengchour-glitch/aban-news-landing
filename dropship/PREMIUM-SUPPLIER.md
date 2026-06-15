# 🏆 Premium-Supplier & „höheres Niveau" — BigBuy & Alternativen (Research 2026-06-15)

> User-Auftrag: „bei BigBuy anmelden für Top-Produkte, LuxeStyle auf höheres Niveau". Ehrliche Analyse + Plan.
> Quellen: bigbuy.eu, dodropshipping.com, minea.com, Shopify App Store.

## BigBuy — Fakten
- **EU-Dropship-Grosshändler (Spanien)**, EU-Lager, 50+ Carrier, europäische/Marken-Produkte (hochwertiger als CJ-China).
- **Kosten: Ecommerce Pack €69/Monat + €90 einmalig Registrierung** (B2B-Abo). Shopify-Integration vorhanden.
- ✅ **Pro:** bessere Produktqualität, EU-Marken, EU-Versand (zuverlässiger als China), grosser Katalog.
- ⚠️ **Contra (wichtig!):** Reviews stark negativ — **doppelte Versandkosten bei 2+ Artikeln** (€10–15, frisst Marge),
  Sync-/Connector-Probleme, langsamer Support (Shopify-Carrier-App nur 1,1★). **CH ist NICHT EU** → Spanien→CH ist
  Cross-Border mit Zoll/Einfuhr-MWST (der EU-interne Tempo-Vorteil gilt für CH nur begrenzt).
- **Fazit:** hebt die Qualität (gut fürs „höhere Niveau"), aber **laufende Kosten + CH-Zoll + Marge-Risiko** bei 2-Artikel-Bestellungen. Bei **0 Verkäufen** ein Kostenrisiko.

## Ehrliche Empfehlung (Reihenfolge)
1. **Erst Traffic/Verkäufe validieren** (gratis Werbung + Pixel + die 48 neuen CJ-Produkte). Ein €69/Mt-Abo lohnt erst, wenn Umsatz da ist.
2. **Wenn Premium-Repositionierung gewünscht:** BigBuy gezielt für **5–10 Hero-Produkte** (Premium-Schmuck, Lederwaren, Beauty) nutzen — NICHT Voll-Katalog-Sync (wegen Versand-Doppelkosten). Marke „LuxeStyle Premium"-Linie.
3. **Alternativen prüfen** (oft bessere Shopify-Integration als BigBuy):
   - **Spocket** (EU/US-Lieferanten, schneller Versand, Top-Shopify-App) — gut für CH-nahe EU-Ware.
   - **Syncee** (riesiger EU/US-Marktplatz, gute Integration).
   - **Printful/Prodigi** (für die «Selbst-gestalten»-POD-Linie — Qualität + EU-Druck, schon im Workflow).
   - CH-Grosshändler (lokal, kein Zoll) für echte „Swiss"-Glaubwürdigkeit.

## Signup-Schritte (musst DU machen — Konto/Zahlung)
1. **bigbuy.eu** → „Become a seller / Dropshipping" → Konto mit **Geschäftsdaten** (Einzelfirma LuxeStyle CH, Adresse Belp).
2. **Ecommerce Pack** wählen (€69/Mt + €90). ⚠️ Zuerst Katalog + CH-Versandkosten/Zoll prüfen, BEVOR du zahlst.
3. **Shopify verbinden** (BigBuy-App / Integration).
4. **CH-Versand testen:** 1 Test-Produkt mit 2 Artikeln → reale Versandkosten + Lieferzeit nach CH prüfen (wegen Doppelkosten-Review).
5. Erst dann Hero-Produkte importieren (gezielt, mit sauberer Marge).

## Was ich dir abnehmen kann (sobald Konto da)
- BigBuy-Produkte genauso QA'en + anlegen wie die CJ-Importe (Bild-Check, deutsche Texte, CHF-Marge, in 6 Kanäle).
- Premium-Hero-Liste vorschlagen (welche BigBuy-Kategorien LuxeStyle aufwerten).

---
## 🏆 BigBuy Premium-Hero-Kategorien für LuxeStyle (Empfehlung 2026-06-15)
> BigBuys USP vs CJ: **echte Marken + EU-Lager + 24h-Versand**. Diese Kategorien heben LuxeStyle aufs nächste Level:

1. **🥇 Parfümerie / Marken-Parfum** — BigBuys Spezial-Katalog (Designer-/Marken-Düfte). DER Game-Changer:
   echte Marken = sofort Trust + hohe Marge + Wiederkauf. Markt-Research: Fragrance = ~8% Conversion (Top-Beauty-Konverter).
   ⚠️ CH-Vorsicht: Parfum = Flüssigkeit → Versand-Restriktionen + CH-Zoll/Einfuhr prüfen, bevor du listest.
2. **⌚ Marken-Uhren (Damen)** — anerkannte Marken, hoher gefühlter Wert, Premium-Accessoire. Klein, gut versendbar.
3. **💄 Marken-Kosmetik/Skincare** — echte Marken statt generische CJ-Beauty-Tools → glaubwürdige Beauty-Linie.
4. **👜 EU-Leder/Handtaschen** — Qualität über den PU-CJ-Taschen → „Premium"-Tasche-Linie.
5. **💍 Marken-Schmuck (S925/Edelstahl)** — bekannte EU-Schmuckmarken statt No-Name.

**NICHT für LuxeStyle:** Elektronik (HP/Acer…), Sex Shop, Toys, IT — off-brand fürs Mode/Lifestyle-Profil.

**Start-Taktik:** 1) Im Gratis-Browse Einkaufspreis + **CH-Versandkosten/Zoll** je Kategorie prüfen (v.a. Parfum).
2) Mit **Uhren oder Schmuck** anfangen (kein Flüssigkeits-/Zoll-Problem, leicht). 3) Parfum nur, wenn CH-Versand sauber.
4) Erst Ecommerce-Pack zahlen, wenn 2–3 Heroes mit guter CH-Marge feststehen. Dann gebe ich (mit API-Key) die Heroes ins
Shopify (QA + deutsche Texte + CHF-Marge + 6 Kanäle), als Kollektion **„LuxeStyle Premium"**.

---
## 🔌 BigBuy-API-Recipe (gemappt 2026-06-15) — Token NUR transient/Secret, NIE ins Repo
Base: `https://api.bigbuy.eu` · Header `Authorization: Bearer <TOKEN>` (BigBuy → Mein Konto → API).
- Produkte je Kategorie: `GET /rest/catalog/products.json?parentTaxonomy=<TAXID>&page=1&pageSize=N`
  → {id, sku, ean13, wholesalePrice (EUR-EK), retailPrice, inShopsPrice, condition, active, images}
- Kategoriebaum (DE): `GET /rest/catalog/taxonomies.json?isoCode=de` (13082 Einträge, id+name)
- Name/Text (DE): `GET /rest/catalog/productinformation/<id>.json?isoCode=de`
- Bilder: `GET /rest/catalog/productimages/<id>.json` (cover: isCover=true, bevorzugt whiteBackground=true; cdnbigbuy.com)
- **Premium-Taxonomy-IDs:** 2588 Schmuck · 2657 Ohrringe · 2659 Statement-Ohrringe · 2614 Halsketten · 2681 Schmuck-Sets
  · 776 Geldbörsen · 2911 Handtaschen. (Uhren/Parfum/Kosmetik-IDs noch suchen.)
- **FILTER:** nur active=1 + condition NEW (KEINE REFURBISHED/USED — viel Refurb-Elektronik im Katalog!).
- **Preis:** CHF = wholesalePrice(EUR) × 2.3, auf .90 (Premium). ⚠️ retailPrice/taxRate sind EU-21%-MWST — für CH irrelevant, aber CH-Zoll/Versand bei Fulfillment prüfen.
- **Bezahl-Realität:** Pack Ecommerce €89/Mt + €89 Setup + €129 Shopify-Connector. Bei Import läuft nur Listing (kein Order-Cost); echte Kosten/Marge erst bei realer CH-Bestellung verifizieren.
