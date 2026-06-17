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

## Runde 2 (tiefer, pg=40, Preis bis €300) — +12 Produkte
Skript `/tmp/bb_outdoor2.py` (excl. Runde-1-IDs) + `/tmp/create_outdoor2.mjs` (Config `/tmp/cfg2.json`).
QA: 2 verworfen (Kinder-Teepee statt Camping-Zelt + Box statt Kompass = Mismatch).
| BigBuy-ID | Shopify-ID | CHF | Titel |
|---|---|---|---|
| 1099721 | 15432177648001 | 79.90 | Camping-Faltbett «Nomad» |
| 1237803 | 15432177680769 | 59.90 | Isomatte «Terra» 4er-Set |
| 1090964 | 15432177713537 | 44.90 | Luftmatratze «Cloud» |
| 1144064 | 15432177746305 | 59.90 | Camping-Laterne «Black Diamond» |
| 1100035 | 15432177779073 | 24.90 | Kühlbox «Retro» 5 L |
| 1096760 | 15432177811841 | 24.90 | Kühltasche «Voyage» 21 L |
| 1153197 | 15432177844609 | 39.90 | Camping-Toilette «Trek» |
| 1200653 | 15432177877377 | 29.90 | Velo-Flaschenhalter «Topeak» |
| 1207270 | 15432177910145 | 49.90 | Camping-Gaskocher «Solo» |
| 1231841 | 15432177942913 | 89.90 | Outdoor-Stimmungslampe «Lumi» |
| 1105965 | 15432177975681 | 49.90 | Yoga- & Fitnessmatte «Flow» |
| 1236498 | 15432178008449 | 99.90 | Camping-Feldbett «Basecamp» 2er |

**→ Total 24 Outdoor-Produkte, alle in Kollektion „Reise & Outdoor".**

## Offen / nächste Runde
- Echte grosse Camping-Zelte (4-Mann) sind bei BigBuy teuer/selten (Treffer waren Kinder-Teepees) → ggf. CJ/AliExpress.
- Einige ohne GTIN → `feed_ready.mjs` (BIGBUY_TOKEN) füllt Barcodes nach.
- Eigene Produkt-Videos (render_price_reveal.sh) für die 24 nachziehen.
