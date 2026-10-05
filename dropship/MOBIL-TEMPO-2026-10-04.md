# Mobil & Tempo (Plan-Tag 11 vorgezogen) — 05.10.2026, 01:05–01:40 UTC

Betreiber-Auftrag 04.10. 22:17 UTC «fix 12 h lang alles». Bereich: Startseite + die 5 meistbesuchten Seiten in 390 px.

## Gemessen: welche Seiten
ShopifyQL `FROM sessions SHOW sessions GROUP BY landing_page_path SINCE -30d` (gql aus `kaufwille_zeile`):
`/products/abendkleid-sirene…` 230 · `/` 211 · `/products/2-teiliges-leinen-set…` 172 · `/products/abendkleid-aurora…` 158 ·
`/pages/influencer-partner` 18 · `/collections/halloween` 16. Gemessen wurden Startseite, die drei Kleider-Seiten und Halloween.

## Werkzeug
`automation/mobil_tempo_messen.mjs <url>` (neu, auf `tools/browser.mjs`, iPhone 390×844, DPR 2): scrollWidth + Elemente über
den Rand, Sticky/Fixed + Überlappung, Bilder im ersten Bildschirm mit `loading`/`fetchpriority`/`currentSrc`, LCP-Element
(PerformanceObserver), CLS, übertragene KB nach Typ, Skript-Hosts. Live-Stand per Admin-API (`theme.files`) gegengelesen;
unsere IP lieferte diesmal nach 45 s den neuen Stand (Marker im HTML). ⚠️ WebFetch wandelt die Seite in Markdown und sieht
weder `<link>`, `<video>` noch `srcset` — für Attribut-Fragen ist es blind (heute nachgewiesen: «keine video-Tags»).

## Befund VORHER (Zahlen, 390 px)
| Seite | scrollWidth | LCP | LCP-Element | übertragen | Bilder | Skripte |
|---|---|---|---|---|---|---|
| `/` | 390 | **5'232 ms** | `DIV.hero__media-grid` = **CSS-Hintergrund** `tati-model-hero-mobil.jpg` 333 KB (1080×1350, unverkleinert) | **6'818 KB**, davon **2'839 KB Video** `meisterwerk-0830-clean.mp4` (Sektion 18/25, y = 6'749) + 159 KB `luxestyle-pod-banner.mp4` | 2'313 KB, 414 `<img>`, 48 eager | 123 (58 extern) |
| Abendkleid Sirène | 390 | 1'628 ms | `IMG.product-media__image`, `fetchpriority=high`, kein lazy ✅ | 2'103 KB | 265 KB | 136 |
| Leinen-Set | 390 | 1'364 ms | dito ✅ | 2'174 KB | 299 KB | 135 |
| Abendkleid Aurora | 390 | 1'136 ms | dito ✅ | 2'160 KB | 241 KB | 136 |
| Halloween | 390 | 1'644 ms | `P` (Text) | 2'434 KB | 1'002 KB (32 Bilder à `width=832` für 189-px-Karten) | 128 |

- **Überbreite: 0 von 5 Seiten** (scrollWidth = 390, kein Element über den Rand).
- **Sticky-Überlappung: keine echte.** Header (55–115, z 8), Suchleiste `#luxsb-wrap` (115–180, z 4, nur Start/Kollektion),
  Cookie-Banner (fixed unten, z 99999), auf Produktseiten die Sticky-Kaufleiste. Einzige «Überlappung» ist `.menu-drawer__backdrop`
  (fixed, opacity 0, nur bei offenem Menü sichtbar) — kein Fehler.
- **LCP mit `loading=lazy`: 0 Fälle.** Produktseiten tragen `fetchpriority=high` auf dem Hauptbild.
- **Hero (Startseite):** Seit 30.09. ist Tati der Hero — als CSS-Hintergrund im Custom-Liquid-Block `lux_usp`, das Original-`<picture>`
  nur `visibility:hidden`. Folge: der Browser entdeckt das LCP-Bild erst beim Zeichnen (niedrige Priorität, 333 KB unverkleinert),
  und das unsichtbare Original-Hero-Bild (`luxestyle-hero-clean-mobil-v11.jpg?width=800`, 102 KB) lädt trotzdem mit `fetchpriority=high`.
- **Kartenbilder:** Horizons `sizes` sagt für Mobil «100vw» → `width=832` (152 KB), die Karte ist aber 234 px (Karussell) bzw. 189 px
  (Raster) breit = 468/378 Gerätepixel; die `srcset`-Stufen springen von 352 direkt auf 832. Safari kennt `sizes="auto"` nicht →
  dort betrifft es ALLE Kartenbilder, nicht nur die 16 eager.
- **Skripte:** 123–142 je Seite: 3× gtag (GT-WVRZQPLZ ×2, AW-18174567886), `fbevents.js` **zweimal**, Clarity, Gelato-Editor-Connector
  (auf jeder Seite, POD = heilig), Secomapp-Affiliate, Judge.me, `d1639lhkj5l89m.cloudfront.net`. Keines davon steht in `theme.liquid`
  — es sind App-Embeds/Kanal-Pixel/Customer-Events → Betreiber-Klick, nicht Theme.
- HTML der Startseite 2'740 KB entpackt (147 KB übertragen), 227 `<style>`-Tags, DCL ~10 s in unserem langsamen Proxy.

## Getan (Theme, minimal, Design unverändert) — `automation/mobil_tempo_patch.py` (DRY → `SCHARF=1`, idempotent)
Live-Dateien frisch geholt, Backups: `theme_backup/index.json.vor-mobil-tempo-2026-10-05`, `theme_backup/card-gallery.liquid.vor-mobil-tempo-2026-10-05`
(product-media.liquid: Originalzeile steht im Skript). Rücklesen nach `themeFilesUpsert`: 3/3 identisch.
1. **`templates/index.json` · `lux_usp`:** `<link rel="preload" as="image" fetchpriority="high">` für Mobil (`asset_img_url: '800x'`,
   201 KB statt 333 KB; media ≤ 749 px) und Desktop (media ≥ 750 px); Mobil-Hintergrund selbst auf die 800x-Ableitung. Block bleibt
   die einzige Stelle (Rücknahme = Block löschen, wie vom 30.09. vorgesehen).
2. **`index.json` · `lux_spotlight_video` + `banner_selbst_gestalten`:** `autoplay` raus, `preload="none"`, `data-lx-lazyplay`; 400 Byte
   Skript startet (preload auto, autoplay, play) sobald das Video 600 px vor dem Bildschirm steht. Poster bleibt.
3. **`snippets/card-gallery.liquid`:** bei `mobile_columns == 2` lautet der Mobil-Teil von `sizes` «60vw» statt «100vw».
4. **`snippets/product-media.liquid`:** `widths`-Stufen 480 und 600 ergänzt (zwischen 352 und 832).

## Nachgemessen (gleiches Werkzeug, 01:30 UTC)
| Messung | vorher | nachher |
|---|---|---|
| Startseite LCP | 5'232 ms | **2'812 ms** (LCP-Bild jetzt `…mobil_800x.jpg`, initiator `link` = Preload greift) |
| Startseite übertragen | 6'818 KB | **3'014 KB** (−56 %) |
| davon Video beim Laden | 2'998 KB | **0 KB** — nach Scroll zum Video: beide geladen, POD-Video spielt (`paused:false`); das 2,8-MB-Video meldet im Headless-Chromium `readyState 0` (kein H.264-Codec dort), Start ist ausgelöst (`preload auto`, Download 2'839 KB) |
| Startseite Bilder | 2'313 KB | 1'705 KB |
| eager-Kartenbild | `width=832` (152 KB) | **`width=480`** (52 KB), 8/8 Karten pl_trends, sizes «25.0vw, 60vw» |
| Halloween Bilder | 1'002 KB | **529 KB** (32 Bilder à 480 statt 832) |
| Halloween LCP | 1'644 ms | 2'480 ms — Text-LCP, DCL im selben Lauf 3'106 → 5'192 ms: Proxy-Schwankung, nicht der Patch (keine Änderung oberhalb) |
| Produktseite Sirène | LCP 1'628 ms, 265 KB Bilder | 1'404 ms, 265 KB (unverändert, wie erwartet) |
| scrollWidth alle Seiten | 390 | 390 |
| CLS Startseite | 0.001 | 0.03 (Cookie-Banner/Poster; unter 0.1 = gut) |

Ledger: `dropship/_mobil_tempo_messung_2026-10-05.tsv`, Screenshots `dropship/_mobil_tempo_start_{vorher,nachher}_2026-10-05.jpg`.

## Bewusst NICHT gemacht
- **Unsichtbares Original-Hero-`<picture>` (102 KB, fetchpriority high):** per CSS nicht abschaltbar (`display:none`-Bilder lädt Chrome
  trotzdem). Sauberer Weg: Tati-Bilder als Shop-Dateien (Grow-Plan, Speicher frei) in die Hero-Einstellungen `image_1`/`image_1_mobile`
  setzen, Hintergrund-Hack entfernen (Overlay-Richtung + Model-Credit bleiben). Ändert den Rücknahme-Weg vom 30.09. → eigene Runde/Betreiber-Ja.
- **8 eager-Karten je Reihe, nur ~1,6 sichtbar:** der Kartenindex ist im Snippet nicht verfügbar; mit 480 px kosten die 6 unsichtbaren
  jetzt ~300 KB statt ~900 KB.
- **2,8-MB-Spotlight-Video für ein 320-px-Fenster:** Neu-Encode (z. B. 720 px, ~800 KB) wäre ein Datei-Upload — nicht Theme.
- **2,7 MB HTML / 25 Reihen à 8 Karten / 227 `<style>`:** Struktur-Entscheid, kein Fehler.
- **Suchleiste + Header + Ankündigung = 180 von 844 px (21 %) auf Start/Kollektion:** Design-Entscheid 14.08. (nur Produktseite ausgeblendet).
- **Doppeltes `fbevents.js`, 3× gtag, Clarity, Secomapp, cloudfront:** App-Embeds/Customer Events — Betreiber-Klick (unten).
- Hetzner-Fenster (`storefront_wahrheit.mjs`) nicht bemüht: unsere IP lieferte bereits den neuen Stand, Admin-API ist die Wahrheit.

## Betreiber-Klicks
1. Shopify Admin → Einstellungen → Kundenereignisse / Apps → App-Embeds: prüfen, warum `fbevents.js` zweimal lädt (Facebook-Kanal + eigenes
   Pixel?) und ob Secomapp-Affiliate, Clarity und `d1639lhkj5l89m.cloudfront.net` noch gebraucht werden — jedes abgeschaltete Skript spart
   30–110 KB und Hauptthread auf dem Handy.
2. Optional: Tati-Hero als echtes Hero-Bild (siehe «bewusst nicht») — ein Ja genügt, der Rest geht per API.

## Wächter
`mobil_tempo_patch.py` ist idempotent und setzt die vier Patches wieder, falls der Theme-Editor («auto-generated … may be overwritten»)
oder ein Horizon-Update sie überschreibt; findet ein Patch seinen Anker nicht (z. B. Tati-Block bewusst gelöscht), lässt er die Datei
unangetastet und meldet es. Block für `fixer_keepalive.sh` steht im Workflow-Ergebnis.
