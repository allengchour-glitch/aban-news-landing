# 🏕️ BigBuy Outdoor-Import (2026-06-16)

**Auftrag User:** „housch me outdoor sache, kompletti usrüschtig … nimm eifach mach eifach."
CJ = leer für Outdoor (gab nur Schmuck-Müll zurück → verworfen). **Pivot auf BigBuy (EU-Lager =
viel bessere CH-Lieferung als China).**

## Quelle / Methode (für nächste Runde wiederverwenden)
- BigBuy-API, Token in `/tmp/bb_3x.py` (transient, NIE ins Repo).
- **Richtiger Outdoor-Root: `parentTaxonomy=19756` = „Sport und Außenbereich"** (+ `19661` Garten für Grill).
  ⚠️ `products.json` akzeptiert NUR Top-Roots — Leaf-Taxonomie-IDs (z.B. 17/32) geben 404.
- Taxonomie-Namen (für GEAR-Filter): `/tmp/bbtax.json` (flach, id→name). Hersteller: `/tmp/bbmfr.json`.
- Pro Produkt: `productinformation/{id}.json?isoCode=de` (dt. Name+Beschreibung) + `productimages/{id}.json`.
- GTIN (ean13): `catalog/product/{id}.json` → `ean13` (teils leer → feed_ready.mjs füllt nach).
- Skripte: `/tmp/bb_outdoor.py` (Suche+QA-Bilder) · `/tmp/create_outdoor.mjs` (Shopify-Anlage via client_credentials).
- **QA:** jedes Cover-Bild als Kontakt-Sheet angeschaut (asiat. Schrift/Watermark/Mismatch/Waffe). Äxte (Campingäxte)
  bewusst weggelassen (Meta/Google-Ad-Policy = Klingen/Waffen). Bosch-Thermometer (kein Outdoor) weggelassen.

## 12 angelegte Produkte (ACTIVE · 6 Kanäle · Bilder READY · condition=new · Kategorie sg/hg)
| BigBuy-ID | Shopify-ID | CHF | Titel |
|---|---|---|---|
| 1268867 | 15432133378433 | 54.90 | Camping-Gaskocher «Trekker» (Koffer) |
| 1139844 | 15432133411201 | 49.90 | Camping-Gaskocher «Kemper» (Kartusche) |
| 1225545 | 15432133443969 | 39.90 | Camping-Klapptisch «Trail» (Becherhalter) |
| 979544  | 15432133509505 | 59.90 | Camping-Klapptisch «Compact» (Alu) |
| 1066427 | 15432133607809 | 39.90 | Hängematte «Paradiso» (bunt) |
| 1236200 | 15432133640577 | 59.90 | Hängematte «Riviera» (2er-Set) |
| 1083388 | 15432133673345 | 24.90 | LED-Laterne «Boho» (Rattan, kabellos) |
| 989252  | 15432133706113 | 22.90 | Solar-Gartenfackel «Flame» |
| 1070211 | 15432133771649 | 59.90 | LED-Kerzen «Cosy» (3er, flammenlos) |
| 980901  | 15432133804417 | 34.90 | Klapp-Holzkohlegrill «Picknick» |
| 1269107 | 15432133869953 | 69.90 | Elektrogrill «Tavolo» (2400 W) |
| 1095030 | 15432133902721 | 24.90 | Grillmatte «No-Stick» (antihaft) |

## Offen / nächste Runde
- BigBuy-Outdoor in den ersten Seiten dünn → tiefer paginieren (pg↑) oder weitere GEAR-Begriffe
  (Schlafsack/Zelt/Trekkingrucksack waren selten/teuer >150). Evtl. eigene Kollektion „🏕️ Outdoor & Camping".
- 5/12 ohne GTIN → `feed_ready.mjs` (BIGBUY_TOKEN) füllt Barcodes nach.
- Eigene Produkt-Videos (render_price_reveal.sh) für die 12 nachziehen.
