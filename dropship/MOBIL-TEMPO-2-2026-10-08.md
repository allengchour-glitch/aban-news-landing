# Tag 11 «Tempo & Mobil»: Startseite lädt beim Öffnen 1,0 statt 9,4 MB Bilder (08.10.2026, 11:30–12:15 UTC)

Betreiber 08.10.: «mehr verbesserung». Plan-Punkt Tag 11 (`WEBSEITE-12-TAGE-PLAN.md`): Ladezeit und Bildgrössen der
Startseite und der Top-Seiten, mobile Darstellung. Messlatte: Messung vorher/nachher, keine Überbreite.
Vorrunde 04./05.10.: `MOBIL-TEMPO-2026-10-04.md`. Deren offener Punkt waren die Kollektions-Cover.

## GEMESSEN vorher (390 px, DPR 2, iPhone-Kennung, `tools/browser.mjs`, ohne zu scrollen, 11:36 UTC)

| Messgrösse | Wert |
|---|---:|
| übertragen gesamt | **10'817 KB** |
| davon Bilder | 9'658 KB |
| Bilder geladen (verschiedene Dateien) / `<img>` im DOM | **150 / 398** (der erste Bildschirm zeigt 2: Logo + Hero) |
| Bild-KB dieser 150 Dateien | 9'390 KB |
| Kartenbilder geladen | 132 (8'583 KB) |
| Kollektions-Cover geladen | 16 Dateien (719 KB) in 32 `<img>`, alle `loading="eager"`, Mobil `100vw` → `width=832` |
| LCP | 3'520 ms (Hero-Hintergrund, vorgeladen) |
| CLS · Überbreite | 0,04 · 0 (scrollWidth 390) |

Jede der 16 Karussell-Reihen lud sofort **8 Bilder**, auch die Reihe `pl_spass_gadgets` bei y = 8'790 px. Beispiel
`product_list_schweiz` (y = 5'579): 8 Bilder / 1'220 KB, jedes `width=832` für eine Karte von 172 px Breite.

## Ursache 1: Horizon lädt das ZWEITE Kartenbild sofort vor (≈ 7,7 MB)

Im Server-HTML haben alle Kartenbilder unterhalb der Reihen 1 bis 4 `loading="lazy"` (per curl geprüft). Im Browser fehlt das
Attribut bei genau einem Bild je Karte: beim **zweiten**. Das kommt aus `assets/product-card.js`:
`connectedCallback()` ruft bei jeder Karte in einem Karussell (Slideshow «isNested») `#preloadNextPreviewImage()` auf, und das
nimmt dem nächsten Bild das `lazy` weg. Das geschieht sofort und egal, wo die Karte steht. Das sichtbare Erstbild wartet weiter
korrekt, das verdeckte Zweitbild lädt. Ohne `lazy` ist `sizes="auto, …"` ungültig, deshalb lud der Browser `width=832`
(Ø 70 KB, bis 247 KB) für 172 px.

**GETAN** (`automation/mobil_tempo_patch_2.py`): Das Zweitbild lädt erst, wenn das Erstbild geladen ist (das lädt nur nahe am
Bildschirm). Als `sizes` bekommt es die gemessene Kartenbreite (172 px → `width=352`, Hero-Reihe 234 px → `width=480`). Der Zweck
des Originals bleibt erhalten, nämlich kein weisser Blitz beim Wischen oder Hover: vorgeladen wird weiterhin, aber nicht mehr blind.
**Vor dem Live-Schreiben getestet:** Die Datei wurde nur im Testbrowser ersetzt (Playwright `route`), der Shop war unverändert. Ergebnis
150 → 54 Bilddateien, 9'390 → 1'727 KB (die Cover waren im Test noch alt).

## Ursache 2: Kollektions-Cover immer eager (719 KB)

`snippets/resource-image.liquid` setzt bei den Layouts grid und carousel immer `loading="eager"`, mobil mit `100vw`. Die Sektion
`collection_list` steht an Position 7 (y ≈ 2'000 px). Wegen grid + carousel_on_mobile rendert sie doppelt: 16 Cover sichtbar,
16 mit `display:none`, alle 32 eager.
**GETAN:** Ab Sektion 3 (`section.index > 2`) lädt das Cover lazy mit `sizes="auto, …"`. Mobil gilt 50vw bei 2 Spalten, dazu
kommen srcset-Stufen 480 und 600. Die Sektionen 1–2 (Hero) bleiben eager.

Backups: `theme_backup/product-card.js.vor-tempo-2026-10-08`, `theme_backup/resource-image.liquid.vor-tempo-2026-10-08`.
Geschrieben 11:43 UTC, Rücklesen identisch. Live-HTML: 32/32 Cover `lazy` + `50vw`. Shopify liefert `product-card.js` verkleinert
aus (Kommentare entfernt, Marke darum nicht sichtbar); die neue Funktion `vorladen` steht drin, `last-modified` 11:43:06.

## GEMESSEN nachher (live, ohne Testersatz)

| Messgrösse | vorher | nachher |
|---|---:|---:|
| Bilddateien geladen beim Öffnen | 150 | **38** |
| Bild-KB beim Öffnen | 9'390 | **1'008** |
| Kartenbilder | 132 / 8'583 KB | **36 / 920 KB** |
| Kollektions-Cover | 16 / 719 KB | **0** (laden beim Scrollen) |
| übertragen gesamt (alle Ressourcen, `transferSize`) | 10'817 KB | **2'358 · 2'350 · 2'186 · 4'201 KB** (4 Läufe; der vierte fing nachladende lazy-Bilder im Vorlade-Abstand des Browsers ein) |
| CLS · Überbreite | 0,04 · 0 | **0,03 · 0** (scrollWidth 390) |
| ganze Seite durchgescrollt (16 Halte à 700 px) | 223 Bilder / 10'162 KB | **194 / 3'934 KB** |
| sichtbare Bilder leer nach dem Scrollen (2,5 s je Halt) | 0 von 85 (Original-Skript) | **0 von 85** |

**LCP** (Hero-Hintergrund, vorgeladen): vorher 3'520 ms (1 Lauf), nachher 4'264 · 2'160 · 2'316 · 2'408 ms. Über den Proxy hier stark
schwankend, darum nur als Tendenz lesen: Das Hero-Bild konkurriert nicht mehr mit ~150 gleichzeitigen Bild-Downloads.

Weitere Seiten (Wächter, 390 px, ohne Scrollen): `/collections/halloween` 9 von 81 Bildern / 242 KB, Produktseite
(Hundepullover) 7 Dateien / 285 KB: 5 Galeriebilder je 832 px für 390 px × DPR 2, korrekt. Die übrigen `<img>` sind
dieselben Dateien in der versteckten Desktop-Galerie und im Zoom; sie werden nicht zweimal übertragen.

## Wächter (neue Produkte, neue Reihen, Theme-Updates)

- `automation/startseite_bildlast.mjs`: Startseite 390 px ohne Scrollen. Gemessen werden geladene Bilddateien (jede URL einmal: die erste
  Fassung zählte Doppel-`<img>` derselben Datei mehrfach, die Produktseite schien 1'113 statt 285 KB schwer) und KB je Sektion; über der
  Grenze 60 Bilder / 3'000 KB kommt ⚠️. Bei 0 Bildern im DOM gibt es bis 3 Versuche, danach «unklar» und nie «0». Das wurde gemessen:
  `/collections/halloween` kam zweimal mit 0 `<img>` zurück. Ledger `dropship/_startseite_bildlast.tsv`.
- Aufseher (`fixer_keepalive.sh`) täglich: zuerst `mobil_tempo_patch_2.py` idempotent, denn ein Horizon-Update überschreibt
  `assets/product-card.js`, danach die Messung im Hintergrund.
- Neue Startseiten-Reihen (`homepage_katalog_rotation.py`) sind Karussell-Karten; sie fallen automatisch unter Patch 1.

## OFFEN
- **Startseite HTML 2,9 MB entpackt, 15'219 DOM-Knoten** (18 Reihen à 8 Karten mit je bis zu 4 Bildern). Das bremst das Parsen auf
  schwachen Handys. Weniger Reihen wären ein Betreiber-Entscheid (Startseiten-Inhalt).
- Messungen von unserer IP sind laut, weil der Proxy hier ~25 s Gesamtladezeit erzeugt. Die KB-Zahlen sind exakt (`transferSize`),
  die Millisekunden nur als Tendenz zu lesen.
