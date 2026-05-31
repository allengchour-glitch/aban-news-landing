# 📦 CJ-Import-Log — LuxeStyle CH

> Autonom via CJ-API importierte & live geschaltete Produkte.
> Tool: `dropship/cj_enrich.mjs` (Suche + Relevanzfilter + Detail-Anreicherung).

## Lauf 2026-05-31 — 4 Sommer-Winner LIVE

Alle: Vendor `LuxeStyle`, Status ACTIVE, publiziert in 6 Kanälen (Onlineshop, Shop,
TikTok, Meta, Google, Pinterest), Tags `cj-real, neu, sommer-2026`, Inventar untracked
(immer bestellbar). Versand aus CJ-China-Lager (~7–14 Tage; kein EU-Bestand für diese Artikel).

| Produkt | VK CHF | CJ-Kost | Marge | CJ-PID | Fulfillment-SKU |
|---|---|---|---|---|---|
| Elektrische Wasserpistole XL | 59.90 | $24.53 | ~2.8× | 2060570715068354561 | `CJYZ291559001AZ` |
| Bladeless Nackenventilator | 29.90 | $6.62 | ~5× | (neck fan) | `CJJT291608401AZ` |
| XXL Picknickdecke faltbar | 24.90 | $2.74–5.82 | ~4.9× | (picnic mat) | `CJYD291539501AZ` |
| Ice-Compress Mini-Ventilator | 27.90 | $5.99 | ~5.3× | (ice fan) | `CJGR291509001AZ` |
| Tragbarer Mini-Mixer 380 ml | 34.90 | $7.78 | ~4.5× | – | `CJ20240701115059212AZ` |
| LED Solar-Lichterkette XL | 19.90 | $2.00–5.59 | ~3.5–10× | 2605290904401606600 | `CJYD291508502BY` |
| Solar Camping-Laterne Vintage | 34.90 | $10.61 | ~3.3× | 2605290115061614000 | `CJJT291381201AZ` |
| Aufblasbarer Palmen-Sprinkler XXL | 64.90 | $28.00 | ~2.6× | 2060553527225798657 | `CJHD291547501AZ` |

**Storefront-Links:**
- https://luxestyle.ch/products/elektrische-wasserpistole-xl-akkubetrieben-vollautomatik-sommer-2026
- https://luxestyle.ch/products/bladeless-nackenventilator-usb-akku-5-stufen-flusterleise
- https://luxestyle.ch/products/xxl-picknickdecke-faltbar-wasserdicht-sandresistent-150-100-cm
- https://luxestyle.ch/products/ice-compress-mini-ventilator-mit-kuhlakku-tragbar-usb

### Bei eingehender Bestellung
Produkt in CJ über die **Fulfillment-SKU** (oben) bestellen → an Kundenadresse senden lassen.
Marge ist FX-bereinigt (USD→CHF ≈ 0,88) und nach CJ-Versand noch komfortabel.

### Aussortiert (Relevanzfilter / Qualität)
- *High Pressure Disinfection Spray Gun* — kein Spielzeug, off-theme.
- *Sterling Silver Fan-shaped Necklace* — Falschtreffer („fan"/„neck").
- *7-color LED Photon Face Mask* — nur 1 Produktbild, zu schwach für Hero. (Kandidat für später, wenn bessere Bilder.)

## ✅ Sicherheit (erledigt)
Der ursprüngliche CJ-API-Key stand in einem früheren Commit im Klartext. Er wurde am
**2026-05-31 rotiert** → alter Key ist ungültig (Leak in der Git-Historie damit entschärft).
Neuer Key nur noch als Env-Variable (`CJ_API_KEY`) übergeben — beide Scripte lesen
ausschliesslich aus der Umgebung. Empfehlung: Key zusätzlich als dauerhaftes Environment-Secret
hinterlegen, damit er in jeder Web-Session verfügbar ist.

## Lauf 2026-05-31 (Charge 2) — Aussortiert
- *Cross-border Microfiber Beach Towel* — Aufdruck „Frozen / Spider-Man" = **Marken-/Fälschungsrisiko**, nicht gelistet.
- *Motorcycle/Motocross Goggles* — keine Schwimmbrille, off-theme.
- *Puffy Umbrella Skirt* — Damenrock, Falschtreffer auf „umbrella".

## Erkenntnisse Keyword-Qualität
- Gut & sauber: `solar garden light`, `electric water gun`, `portable blender`, `inflatable ... sprinkler`.
- Vorsicht: Markenaufdrucke (Disney/Marvel etc.) in Towels/Kids-Artikeln → vor Listung prüfen.
- `swimming goggles`/`sun umbrella` liefern off-theme (Motocross-Brillen, Röcke) → präzisere Phrasen nötig.

## Nächste Keywords (Pipeline für mehr Importe)
`cj_enrich.mjs` → `KEYWORDS`-Liste erweitern. Gut funktioniert: präzise Substantiv-Phrasen
(„electric water gun", „neck fan"). Schlecht: generische Begriffe ohne klares Substantiv.
EU-Lager (`countryCode=DE`) liefert für virale Sommerware kaum Treffer → China-Lager nutzen.
