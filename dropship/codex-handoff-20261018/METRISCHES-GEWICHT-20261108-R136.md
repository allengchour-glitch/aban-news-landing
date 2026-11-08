# Lokaler Kandidat: metrisches Variantengewicht der Keramik-Tasse

Stand: 08.11.2026. Dieser Ordner ist ein lokaler Prüfstand. Es gab keinen Shopify-, Theme-, Produkt-, Warenkorb-, Checkout- oder Bestell-Write.

## Frische Quelle

- MAIN-Theme: `gid://shopify/OnlineStoreTheme/213013037447`
- `updatedAt`: `2026-11-07T19:56:09Z`
- Datei: `templates/product.json`
- MD5: `6b44c4493538e99f42d2397ae330a828`
- Produkt: `gid://shopify/Product/15422823465345`, Handle `keramik-tasse-selbst-gestalten`

Die MAIN-Logik rendert `{{ v.weight | weight_with_unit: v.weight_unit }}` einmalig. Deshalb bleibt die öffentliche Spezifikation beim Variantenwechsel auf `11.5 oz` stehen.

Aktuelle Admin-Gewichte und die serverseitigen Shopify-Grammwerte:

| Ausführung | Variante | Admin | Shopify `variant.weight` |
|---|---|---:|---:|
| 325 ml | `55777979629953` | 11.5 oz | 326 g |
| 444 ml | `55777979662721` | 16 oz | 454 g |
| 591 ml | `55777979695489` | 18.9 oz | 536 g |

## Kandidat

Der Diff ändert ausschliesslich `lux_spezifikationen.settings.custom_liquid`:

1. Nur beim exakten Tassen-Handle wird `variant.weight` als Grammwert ausgegeben.
2. Liquid erzeugt aus den tatsächlichen Produktvarianten eine ID→Gramm-Zuordnung; keine Werte werden aus Fassungsvermögen oder Titel geraten.
3. Ein enger Listener aktualisiert die Zelle bei der realen Variantenwahl und bei `variant:update`.
4. Alle anderen Produkte behalten unverändert `weight_with_unit: v.weight_unit`.

Dateien:

- `lux_spezifikationen.patch`: reviewbarer Blockdiff
- `main-product.candidate.json`: vollständiger lokaler Kandidat auf der frisch gelesenen MAIN-Datei
- `lux-variant-weight-runtime.js`: exakt getestete Browserlogik
- `test_metric_weight_candidate.mjs`: Browserprüfung
- `test-result.json`: Ergebnisbeleg

## Validierung

- JSON des vollständigen Kandidaten: gültig
- Semantischer Vergleich: ausser `lux_spezifikationen.settings.custom_liquid` identisch
- Mobilbrowser 375 px, echtes Live-Variantensystem: `326 g → 454 g → 536 g → 326 g`
- Jede Anzeige stimmte mit gewählter Radio-Variante und Warenkorb-Formular-ID überein
- `pageErrors=[]`
- 0 Cloudinary-Uploads, 0 `cart/add`, 0 Checkout-/Order-Anfragen

Der Kandidat wurde nicht in ein Theme geschrieben und ist nicht zur Veröffentlichung freigegeben.
