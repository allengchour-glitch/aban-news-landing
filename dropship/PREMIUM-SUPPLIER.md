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
## 🔌 BigBuy-API-Recipe (KORRIGIERT 2026-06-15 — vorherige Taxonomy-IDs waren falsch!) — Token NUR transient, NIE ins Repo
Base: `https://api.bigbuy.eu` · Header `Authorization: Bearer <TOKEN>` (BigBuy → Mein Konto → API).
- **⚠️ WICHTIGSTE LEHRE:** `products.json?parentTaxonomy=<ID>` akzeptiert NUR **Top-Level-Wurzeln** (grosse IDs wie
  19650, 19662, 19654). Eine Unterkategorie wie 2588/2657 wirft **404 „Taxonomy not parent with id"**. → Wurzel
  abfragen, dann **client-seitig** nach dem Produkt-Feld `category`/`taxonomy` filtern (Subtree-Set vorher aus dem
  Kategoriebaum berechnen). Skript-Vorlage: `/tmp/bb_collect.py` (Charge 2026-06-15, baut children-Map + descendants()).
- Produkte: `GET /rest/catalog/products.json?parentTaxonomy=<ROOT>&page=N&pageSize=200`
  → Array {id, sku, ean13, wholesalePrice (EUR-EK), retailPrice, condition, active, images(bool), category, taxonomy, manufacturer}
- Kategoriebaum (DE): `GET /rest/catalog/taxonomies.json?isoCode=de` (13082 Einträge: id, name, **parentTaxonomy**)
- **Name/Text (DE): `GET /rest/catalog/productinformation/<id>.json?isoCode=de` → gibt eine LISTE zurück → `[0].name` / `[0].description`** (NICHT Objekt!)
- Bilder: `GET /rest/catalog/productimages/<id>.json` → `{images:[{url, isCover, whiteBackground}]}` (cover: isCover=true; cdnbigbuy.com; meist sauberes Studio-Weiss)
- **Verifizierte Wurzeln + Subtrees:** Parfum/Beauty-Wurzel **19650** (Subtree Parfums=14091) · Schmuck-Wurzel **19662**
  (Subtree Schmuck=2588: Ringe 2590, Halsketten 2614, Ohrringe 2657, Sets 2681) · Taschen-Wurzel **19654** (gemischt →
  hart auf Handtaschen 2911/Strand 2910/Geldbörsen 776 filtern). Uhren: Subtree 5804/5849.
- **FILTER (hart):** nur active=1 + condition NEW (KEINE REFURBISHED/USED) + images=true. Bild trotzdem visuell QA'en.
- **Preis:** Marken-Schmuck CHF = EK(EUR) × ~2.3–3.0 auf .90 (hoher gefühlter Wert). **Marken-Parfum: NICHT ×2.3!**
  Kund:innen kennen D&G/Lancôme-Marktpreise → markt-nah kalkulieren (EK €26 D&G Light Blue 25ml → CHF 59.90; EK €55
  D&G The One 50ml → CHF 99.90). Sonst sieht es zu teuer/unseriös aus → Marge bei Marken-Parfum ist dünn (Trust/Traffic-Play).
- **Bezahl-Realität:** Listing kostet nichts; echte Order-Kosten + CH-Zoll/Versand (Spanien→CH ist Cross-Border!) erst bei realer Bestellung verifizieren. Parfum = Flüssigkeit → Versand-Restriktionen prüfen.

## ✅ ERSTE PREMIUM-CHARGE LIVE (2026-06-15) — 11 echte Marken-Produkte
Kollektion **„✨ LuxeStyle Premium"** (gid 688683942273) → Rule jetzt **tag EQUALS `bigbuy`** (vorher tag `premium` = 2307
Produkte, weil fast der ganze CJ-Katalog „premium" getaggt ist → war wertlos; jetzt sauber = nur diese 11). Alle ACTIVE,
Bild READY, `inventoryItem.tracked:false` (sofort kaufbar, availableForSale:true), in alle 6 Kanäle publiziert, vendor = echte Marke.
| Produkt | CHF | EK € | Typ |
|---|---|---|---|
| Dolce & Gabbana «Light Blue» EdT 25ml | 59.90 | 26.43 | Parfum |
| Dolce & Gabbana «The One» EdP 50ml | 99.90 | 55.04 | Parfum |
| Lancôme Miniatur-Set 4 Düfte | 69.90 | 38.29 | Parfum |
| Etat Libre d'Orange «Sous Le Pont Mirabeau» Unisex 100ml | 84.90 | 43.56 | Parfum (Niche) |
| Sensilis «Encore un Soir» EdT 100ml | 49.90 | 22.02 | Parfum |
| Radiant Damenring Edelstahl | 24.90 | 6.31 | Schmuck |
| Folli Follie Damen-Armreif | 34.90 | 10.91 | Schmuck |
| Police Herren-Armband Edelstahl | 49.90 | 18.18 | Schmuck |
| Guess Herrenring Edelstahl | 54.90 | 20.91 | Schmuck |
| Panarea Damenring | 74.90 | 30.68 | Schmuck |
| One Jewels Herren-Armband Schwarz | 89.90 | 40.69 | Schmuck |

**Tags je Produkt:** `bigbuy, premium, marke` + parfum/beauty/schmuck + damen/herren/unisex + ring/armband + geschenk.
5 Heroes (D&G ×2, Radiant, Police, Guess) sind in `automation/good_products.csv` für die Social-Rotation.
