# Editor «Selbst gestalten»: Vorlagenbild verzerrt (Theme-Regel `img{max-width:100%}`) — vorläufig behoben im MAIN-Theme

Besitzer 09.11.2026: «printeredt fehler beheben» (meine Auslegung: Fehler im Printful-Editor auf den «Selbst gestalten»-Seiten). Erster Teil: drei eingefrorene Sperrseiten (`../selbst-gestalten-fertig-0511/rollout-v63-direct/sperre-fix-0911/`, PR #3000). Zweiter Teil (dieser Ordner): ein Anzeigefehler, den die Mobilmessung des Prüfers fand und den ich selbst nachgemessen habe.

## Befund (GEMESSEN 09.11.2026, Playwright, Live-Seiten)
Der Editor legt unter die Gestaltungsfläche ein Vorlagenbild (`img.lsp6-tpl`, bei manchen Produkten zusätzlich `img.lsp6-bg`) und setzt dafür eine Inline-Breite in Prozent der Bühne. Zeigt die Bühne nur den Druckflächen-Ausschnitt, liegt die Breite über 100 % (Samsung 162,9 %). Die allgemeine Theme-Regel `img{max-width:100%}` klemmt die Breite, die Höhe bleibt: das Bild ist gequetscht und verschoben. Im Bild: beim T-Shirt zeigt die Bühne nur den linken Ärmel, der Druckrahmen liegt auf leerem Weiss; bei der Samsung-Hülle liegt der Gehäuse- und Kameraumriss schmal neben dem Rahmen.

**10 von 15 aktiven Seiten** waren betroffen (Desktop 1440 px und Handy 390 px, dieselben zehn): Shirt, Samsung-Hülle, Spiral-Notizbuch, Kiss-Cut-Aufkleber, Hardcase-iPhone, klassisches Unisex-T-Shirt, Alltags-Umhängetasche, Bio-Jutebeutel, Unisex-Hoodie, Unisex-T-Shirt. Unbetroffen (Ausschnitt = 100 %): Tasse, Keramik-Tasse, Mauspad, Allover-Stoffbeutel, Edelstahl-Trinkflasche. Die Produktvorschau (canvas) und die Druckdatei-Rechnung sind nicht betroffen, nur die Führungsgrafik; der Kauf war nie gesperrt. Beispiele Soll gegen Ist (Desktop): T-Shirt 991 × 991 statt 427 × 991, Samsung 696 × 696 statt 427 × 696, Umhängetasche 2550 × 2550 statt 427 × 2550.

## Änderung
`patch.mjs` fügt vor dem einzigen `</head>` von `layout/theme.liquid` (MAIN-Theme) einen Block ein, nur auf Produktseiten (`template.name == 'product'`):

```css
.lsp6-stage img.lsp6-bg,.lsp6-stage img.lsp6-tpl{max-width:none!important;max-height:none!important}
```

405 Zeichen, auf die Bühne des Editors begrenzt, keine Wirkung auf andere Bilder oder Seiten. Die eigentliche Korrektur gehört in den Editor (`.lsp6-bg,.lsp6-tpl{…max-width:none…}`); eine neue Editor-Version braucht aber den ganzen Rollout (neuer unveränderlicher Pfad, SRI, 16 Beschreibungen, Codex-Weg). Die Regel bleibt danach harmlos. Fundliste und fertige Änderungen für Codex: `../CODEX-EDITOR-FUNDE-0911.md`.

## Messung vor und nach (GEMESSEN)
- **Vor dem Einspielen, Desktop, alle 15 Seiten, je ein Aufruf mit und ohne eingefügte Regel:** 10 verzerrt ohne Regel, 0 mit Regel; Soll gleich Ist bei allen 15. Handy (Prüfer, 390 px): dieselben 10; eigene Nachmessung an Samsung, klassischem T-Shirt und Tasse: 356 × 580 statt 580 × 580, 356 × 762 statt 762 × 762, Tasse unverändert.
- **Live nach dem Einspielen (ohne eingefügte Regel, die echten Seiten, 09.11. ca. 06:50 bis 07:10 UTC):** alle 15 Seiten auf Desktop (1440 px) und Handy (390 px): Soll gleich Ist, **0 verzerrt, 0 Messfehler** (Beispiele Desktop: T-Shirt 991 × 991, Samsung 696 × 696, Umhängetasche 2550 × 2550; Handy: T-Shirt 826 × 826, Samsung 580 × 580, Umhängetasche 2124 × 2124).
- Sichtprüfung der Bilder vorher und nachher (T-Shirt Handy, Samsung Desktop): vorher gequetscht und verschoben, nachher füllt das Vorlagenbild den Druckrahmen.

## Einspielen und Rücknahme
```sh
node dropship/editor-vorlage-0911/apply.mjs               # Trockenlauf (Vorgabe)
LIVE=1 node dropship/editor-vorlage-0911/apply.mjs        # Sicherung, Schreiben, Rücklesen (bis 150 s), Storefront-Prüfung, Rückweg bei Fehler
ZURUECK=1 LIVE=1 node dropship/editor-vorlage-0911/apply.mjs   # nimmt den Block zurück (nur wenn theme.liquid noch genau dem eingespielten Stand gleicht)
node dropship/editor-vorlage-0911/test.mjs <pfad/zu/liquidjs>   # 17 Prüfungen (mit LiquidJS), Mutationsprobe 12 von 12
```
Die Sicherung liegt in `sicherung/layout__theme.liquid.vor` (md5 `cf5ee5a64ca940edf4120b09c073e58f`, 61 571 Zeichen). Exit-Codes stehen im Kopf von `apply.mjs`. Eingespielt am 09.11.2026 ca. 06:45 UTC in das MAIN-Theme «LuxeStyle – Schrift und Banner 02.11.2026» (`gid://shopify/OnlineStoreTheme/213013037447`): Rücklesen GLEICH, Produktseite HTTP 200 mit Block, Startseite HTTP 200 ohne Block, kein Liquid-Fehler.

## Grenzen
- Nur Chromium gemessen (Safari und echtes Handy ungemessen). Wirkung auf Käufe unbekannt.
- Wird ein anderes Theme veröffentlicht, fehlt der Block dort (die Regel steht nicht im Editor).
- Der Test deckt nur die reine Einfügelogik und das Rendern mit LiquidJS (nicht Shopify-Liquid); das echte Rendern wurde live nachgemessen. Er steht nicht in der CI (die geteilte `luxestyle-automation-tests.yml` ändern neun offene Entwürfe von Codex).
