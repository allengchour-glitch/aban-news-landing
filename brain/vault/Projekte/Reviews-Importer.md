---
tags: [projekt, conversion, bereit]
quelle: CLAUDE.md
gelernt: 2026-09-07
status: wartet-auf-token
---
# Reviews-Importer — der billigste Conversion-Hebel

**518 von 529 cj-real-Produkten (98 %) haben keine Sterne und keine Reviews** (gemessen vom
`conversion_radar`, 27.06.). Sterne sind der stärkste bekannte Conversion-Hebel, den man ohne
Werbebudget bewegen kann.

## Das Werkzeug ist fertig und der Bug ist gefunden

`automation/cj_reviews_import.mjs` zieht echte CJ-`productComments` (≥ 4★), übersetzt per Gemini
ins Deutsche und reicht sie an Judge.me durch. Idempotent, Ledger `dropship/cj_reviews_done.txt`.

Der Importer war lange **kaputt** und hat eine falsche Naturkonstante ins Gedächtnis geschrieben —
die ganze Geschichte steht in [[Hypothese-mit-Datum]]. Behoben: beim Token-Holen sendet er jetzt
`password` (mit `apiKey` als Fallback), Token verifiziert, 566 Zeichen.

## Weitere Fixes im selben Durchgang

- Shopify-**Cursor-Pagination** statt hartem `first:LIMIT`
- Defaults `LIMIT` 25 → **250**, `PER` 6 → **8**
- Nicht-CJ-SKUs (`bb-`, `pf-`, `pod-`) werden übersprungen, spart CJ-Quota

## Warum die Reviews gut sind

Echte Käufer-Kommentare mit `score`, `commentDate`, `countryCode` und **Foto-URLs**
(`commentUrls`). Foto-Reviews konvertieren etwa doppelt so gut; der Importer reicht sie durch.

## Zum Scharfstellen fehlen nur Zugangsdaten

`JUDGEME_PRIVATE_TOKEN` (Judge.me → Settings → API), dazu
`SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`/`SHOPIFY_SHOP`, `CJ_EMAIL`/`CJ_API_KEY`,
optional `GEMINI_API_KEY`.

Lauf: erst `DRY_RUN=1`, dann scharf. `QUERY` gegebenenfalls auf den grossen Katalog weiten statt
nur `tag:cj-real`.

Grenzen: [[Fake-Reviews]] · [[CJ-AliExpress-Quell-ID]]
