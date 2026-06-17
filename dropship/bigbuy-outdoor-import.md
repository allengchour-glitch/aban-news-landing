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

## Runde 3 — Garten & Balkon (Root 19661 „Garten") — +12 Produkte
Skript `/tmp/bb_garden.py` + `/tmp/create_garden.mjs` (Config `/tmp/cfg3.json`). Kategorie hg (Heim & Garten).
Neue Smart-Kollektion **„🌿 Garten & Balkon"** (`gid://shopify/Collection/688740663681`, Regel Tag=garten, publiziert).
| BigBuy-ID | Shopify-ID | CHF | Titel |
|---|---|---|---|
| 283501 | 15432179253633 | 49.90 | Springbrunnen «Zen» |
| 1141683 | 15432179286401 | 84.90 | Gartenbrunnen «Cascada» 3 Säulen |
| 1268847 | 15432179319169 | 49.90 | Feuerschale «Inferno» |
| 517826 | 15432179351937 | 49.90 | Stirnlampe «Varta Sports H30R Pro» |
| 1117513 | 15432179384705 | 69.90 | Camping-Laterne «Trail» 4er-Set |
| 690609 | 15432179417473 | 59.90 | Anzucht-Gewächshaus «Sprout» 8er |
| 1188742 | 15432179450241 | 74.90 | Pop-up-Gewächshaus «Bloom» |
| 619689 | 15432179483009 | 69.90 | Garten-Pavillon «Sole» 3×3 m |
| 870216 | 15432179515777 | 24.90 | Bypass-Gartenschere «Cellfast» |
| 510008 | 15432179548545 | 24.90 | Garten-Handhacke «Stocker» |
| 901917 | 15432179581313 | 29.90 | Balkon-Sichtschutz «Privato» |
| 408137 | 15432179614081 | 29.90 | Bambus-Sichtschutz «Natura» 1×5 m |

**→ Session-Total: 36 neue Produkte (24 Outdoor + 12 Garten), alle ACTIVE/6 Kanäle/QA'd/Kategorie/condition.**

## Runde 4 — Haus & Küche (Root 19656) — +12 Produkte
Skript `/tmp/bb_kitchen.py` + `/tmp/create_kitchen.mjs` (`/tmp/cfg4.json`). Kategorie hg. In Kollektion „Küche & Kochen".
QA verworfen: 2× „x12"-Grosspack (Mehrstück-Falle: Rattankorb + Gläser).
| BigBuy-ID | Shopify-ID | CHF | Titel |
|---|---|---|---|
| 1294490 | 15432181088641 | 89.90 | Kapsel-Kaffeemaschine «Espresso» |
| 1276212 | 15432181121409 | 64.90 | Milchaufschäumer «Barista» |
| 1284566 | 15432181154177 | 129.90 | Premium-Milchaufschäumer «Jura» |
| 1260909 | 15432181219713 | 69.90 | Allesschneider «Chef» |
| 1214948 | 15432181285249 | 39.90 | Aufbewahrungsboxen «Dots» 3er |
| 1248733 | 15432181318017 | 29.90 | Aufbewahrungsbox «Roll» m. Rädern |
| 1236285 | 15432181383553 | 34.90 | Frischhaltedosen-Set «Fresh» |
| 1259673 | 15432181416321 | 29.90 | Kupfer-Becher «Mule» 4er |
| 1235598 | 15432181449089 | 69.90 | Ofenform-Set «Zenker» 2-tlg |
| 1284510 | 15432181481857 | 27.90 | Edelstahl-Bratpfanne «Castey» |
| 1215840 | 15432181514625 | 22.90 | Antihaft-Bratpfanne «Monix Green» |
| 1228244 | 15432181547393 | 24.90 | Spülen-Abtropfsieb «Clean» |

**→ Session-Total: 48 neue Produkte (24 Outdoor + 12 Garten + 12 Küche), alle ACTIVE/6 Kanäle/QA'd/Kategorie/condition.**

## Runde 5 — 🔌 Elektriker & Installation (Root 19651/19657/19653) — +13 Produkte
User: „Arbeitskollegen sind Elektriker, alles für Elektriker." Skript `/tmp/bb_elektro.py` + `/tmp/create_el.mjs` (`/tmp/cfg_el.json`). Kategorie ha (Heimwerker), vendor=echte Marke (Merchant-korrekt), GTIN/custom_product. Neue Smart-Kollektion **„🔌 Elektriker & Installation"** (`688748200321`, Tag=elektriker, publiziert).
QA verworfen: Ceys «Agua Stop» (Wasser-Reparaturband ≠ Isolierband), Bosch «Drahtrolle» (Rasentrimmer-Faden!), Mobilis (Handyhülle, Mismatch), Auto-Ladegeräte, 80L-Boiler.
| Marke | Produkt | CHF |
|---|---|---|
| Workpro | Wasserpumpenzange / Seitenschneider / Kombizange ×2 / Auto-Abisolierzange | 16.90–27.90 |
| NWS (DE) | Profi-Wasserpumpenzange · Flachrundzange | 49.90–59.90 |
| JOKARI | Automatik-Abisolierzange Sensor | 119.90 |
| Bosch | VDE-Kabelschneider 1000 V | 99.90 |
| Grip-on | Gripzange selbstklemmend | 54.90 |
| EDM | Kabeltrommel 4-fach | 34.90 |
| F-line | Kabelkanal-Set 5er | 14.90 |
| OBO Bettermann | Nagel-Kabelschellen | 16.90 |

**→ Session-Total: 61 neue Produkte (24 Outdoor + 12 Garten + 12 Küche + 13 Elektriker).**
