# Startseite entschlacken — Plan + Skeptiker (13.10.2026)

Quelle: Workflow wf_70daf042-636 (Messung, Plan, Gegenprüfung). Umsetzung erst nach Abschluss der laufenden Theme-Arbeiten (Kauf-Strecke, CH-Lager-Warenkorb).

## Plan
# Umbauplan Startseite luxestyle.ch (Stand 13.10.2026, ca. 20:30 UTC, nur gelesen)

Grundlage sind die drei Messspuren und eigene Nachmessungen von heute Abend:
- Theme-Dateien über die Admin-API (MAIN 187533001089)
- ein curl-Abruf: 2'891'154 B, processing 1'228 ms, render 838 ms
- `tools/browser.mjs` mit 390 px und 1280 px

Arbeitsdateien liegen in `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/startseite/plan/` (die grossen Dateien sind gelöscht). Im Shop und im Theme ist nichts geändert.

## 1. Lage

Die Startseite liefert 2,89 MB ungepacktes HTML mit 832 Links und 151 Überschriften. Die versteckte H1 «LuxeStyle» steht im Header, die sichtbare Hero-Zeile ist nur eine h2. Die drei grössten Gewichtsposten (GEMESSEN):
- **Die 15 Produktreihen:** 2'161 KB, das sind 74,7 %, mit 120 Karten à ~16,5–18 KB.
- **Das zweimal gerenderte Menü im Header:** 265 KB (9,2 %) und 365 der 832 Links, auf jeder Seite.
- **Der Head:** 204 KB (7,1 %), vor allem Shopify-Pixel-Loader und Judge.me.

In jeder Karte steckt Ballast, den am Handy (77 % der Sitzungen) niemand sieht, alles GEMESSEN:
- **Bild-Folien 3–4 und Pfeile:** 372 KB. Horizon schaltet die Kartengalerie im Reihen-Karussell ab: `assets/slideshow.js` Z.563 `this.disabled = this.isNested || this.disabled`. 106 von 120 Galerien stehen auf `disabled="true"`, bei 390 und 1280 px ist kein einziger Pfeil-Knopf sichtbar.
- **Das Häkchen-SVG des Schnellkaufs:** 120 × inline, zusammen 221 KB.
- **Versteckte Zoom-out-Titel:** 120 `<h3>`.
- **Links mit `?variant=`:** 360.

Diese Posten lassen sich entfernen, ohne Reihen, Karten oder sichtbare Funktionen zu verlieren.

## 2. Massnahmen (nach Ersparnis × Sicherheit)

### Gilt für alle Massnahmen
- **Vor jeder Änderung die Live-Datei holen.** `sections/header.liquid` und `layout/theme.liquid` hat heute um 20:14 UTC jemand anderes geändert, `snippets/product-card.liquid` um 16:26. Die md5-Ausgangswerte (13.10. ca. 20:20 UTC):

  | Datei | md5 | geändert |
  |---|---|---|
  | `blocks/_product-card-gallery.liquid` | `d91d1fd21e4b10468830f672a8eb7603` | 06.08. |
  | `snippets/card-gallery.liquid` | `5a655a359f404d9606ec175b58688615` | 05.10. |
  | `snippets/product-card.liquid` | `b987b77e7e10c1120fc2235cbd1b9abe` | 13.10. 16:26 |
  | `blocks/product-title.liquid` | `9ee3c7a5be06c816e1d65c76b1725073` | – |
  | `snippets/add-to-cart-button.liquid` | `f916546f9c1b168332c1b09ab12b8bee` | – |
  | `sections/header.liquid` | `d9a47e9c747f0ccbe1d0ae1f393c27b5` | 13.10. 20:14 |
  | `layout/theme.liquid` | `f8b5a086f239df40c0d1a0f0e87867cc` | 13.10. 20:14 |
  | `snippets/header-drawer.liquid` | `c5f1e1b8a808116df2c6a050aba7dd94` | – |
  | `snippets/localization-form.liquid` | `35fb4e23013ff4b1fa74744ecd3988bd` | – |
  | `templates/index.json` | `981f0be5929332a8b1195497e0fd0566` | 13.10. 18:10 |

- **Liquid-Änderungen (Massnahmen 1, 2, 3, 5, 7, 9, Teil von 10)** über ein neues, idempotentes Skript `automation/startseite_schlank_patch.py`, gebaut nach dem Muster von `mobil_tempo_patch.py`:
  - Marke `lx-schlank-2026-10-14` in jeder Datei, Modi `--pruefen` und `SCHARF=1`.
  - Jeder Anker wird mit `assert count==1` geprüft.
  - Backup nach `theme_backup/<pfad>.schlank-<datum>` plus Zeile in `theme_backup/SCHLANK-MD5.tsv` mit md5 vorher und nachher.
  - Täglich aus `fixer_keepalive.sh` direkt hinter `mobil_tempo_patch` (Z.~1855). Überschreibt ein Horizon-Update die Dateien, kommt der Patch am nächsten Tag wieder.
  - Zuerst auf einer Theme-Kopie (themeDuplicate plus Vorschau) messen, erst dann MAIN.
- **Änderungen an `templates/index.json` (Massnahmen 4, 6, 8, Teil von 10)** nur einmal und schlüsselgenau schreiben, ohne Text-Ersatz:
  - Nicht zwischen 02:15 und 02:40 UTC (Rotation) und nicht, während `mobil_tempo_patch` läuft. Beide lesen die Datei live und schreiben sie ganz zurück.
  - Diese Änderungen bekommen **kein** automatisches Zurücksetzen, sonst kämpft der Patch gegen Änderungen des Betreibers im Theme-Editor. Der Wächter (§5) meldet stattdessen.
- **Rückweg:**
  - Liquid: Backup per `themeFilesUpsert` zurückspielen, danach den md5-Ausgangswert prüfen.
  - index.json: mit `startseite_schlank_patch.py --zurueck` nur die geänderten Schlüssel zurücksetzen. Ein ganzes Backup zurückspielen hiesse, die Tagesrotation und fremde Patches mit zurückzudrehen.
- **Falle:** Der erste Abruf nach jedem `themeFilesUpsert` liefert HTTP 500 (Neukompilierung, Journal 14.09.). Darum erst nach 10–20 s messen.
- **Rotation:** Keine Massnahme der Stufe A blendet eine Reihe aus oder ändert `max_products` oder `layout_type`. `homepage_katalog_rotation.py` braucht deshalb keine Änderung.
  - Sie ändert nur die Einstellungen `collection`, `max_products` und `layout_type` der Reihen sowie `order` (Z.112–150).
  - Die Rücklese-Prüfung (Z.280, `"max_products": 8` ≥ 17) bleibt erfüllt.

### Schritt 0: Messgerät zuerst
Den Wächter aus §5 bauen und den Ausgangswert ins Ledger schreiben: 2'825 KiB, 832 Links, 151 Überschriften, H1 versteckt mit 9 Zeichen. `anat.py` und `messen.mjs` liegen nur im Scratchpad und gehen verloren.

### Stufe A: ohne Betreiber-Entscheid, keine Reihe und keine Karte weniger

**1. Kartengalerie im Karussell: nur Folie 1–2, keine Pfeile**
- **Änderung** in `snippets/card-gallery.liquid`:
  - Z.113–118: Gilt `section.settings.layout_type == 'carousel'`, dann `max_visible_slide_count = 2`.
  - Z.108–110: Im selben Fall `show_arrows = false`.
  - Die Bedingung entspricht genau dem Fall, in dem Horizon die Galerie per JS abschaltet. Sie wirkt deshalb auch in Karussells anderer Seiten.
- **Ersparnis** (GEMESSEN am HTML): Folien 3–4 sind 227'066 B mit 115 `<img>`, Pfeile 145'348 B in 116 Blöcken. Zusammen **−372 KB und −115 img**. DOM-Knoten: VERMUTUNG ~−1'000.
- **Für Besucher:**
  - Handy: keine Änderung, weil Wischen in der Galerie schon heute gesperrt ist.
  - Desktop: Beim Hover springt die Karte auf Folie 2 (GEMESSEN, Folie 0 → 1, weil `select()` nur das interne `#disabled` prüft). Folie 2 bleibt erhalten.
  - Die eine nicht gesperrte Karte zeigte Pfeile, ein Klick wechselte das Bild aber nicht.
- **Risiko:** niedrig. `mobil_tempo_patch.py` ankert in card-gallery nur an den sizes-Blöcken (Z.~45–60), nicht an Z.108–118.
- **Schreiber:** keine Anpassung nötig.
- **Prüfung:**
  - Admin-API: Marke vorhanden, Anker genau 1×.
  - browser.mjs 390 px: `slideshow-slide` je Karte ≤ 2 und 0 `slideshow-arrows`.
  - browser.mjs 1280 px: Hover zeigt Folie 2.
  - Kollektion `/collections/hype-jetzt` (Raster): weiter bis zu 3 Folien mit Pfeilen.
  - Produktseite mit Empfehlungs-Karussell: Karten werden sauber angezeigt.

**2. Zoom-out-Titel nur im Kollektionsraster, als `<p>`**
- **Änderung** in `blocks/_product-card-gallery.liquid` Z.37–48:
  - Block nur bei `template.name == 'collection' or template.name == 'search'` rendern.
  - Dort `<h3 class="h4">` (Z.40, Z.42) durch `<p class="h4">` ersetzen. base.css stylt nur über die Klasse `.h4` (Spur 1).
- **Ersparnis:** **−120 Überschriften (151 → 31)**, −20'279 B, ~−780 Wörter (GEMESSEN). Auf Kollektionsseiten zusätzlich −24 h3.
- **Für Besucher:** nichts, der Block ist ausserhalb der Zoom-out-Ansicht immer `display:none`.
- **Risiko:** sehr niedrig. Kein Skript schreibt diese Datei.
- **Prüfung:**
  - HTML: 0 × `product-grid-view-zoom-out--details` auf `/`.
  - Kollektion: Zoom-out-Schalter testen, Titel und Preis erscheinen.

**3. Kartenlinks ohne `?variant=` auf der Startseite**
- **Änderung:** Gilt `template.name == 'index'`, dann `product.url` statt `selected_or_first_available_variant.url`. Betroffene Stellen:
  - `snippets/product-card.liquid` Z.38/75
  - `snippets/card-gallery.liquid` Z.181 und Z.198
  - `blocks/product-title.liquid` Z.12
  - Kollektionen bleiben, wie sie sind, weil Filter dort eine Variante vorwählen.
- **Ersparnis:** Parameter-Links **364 → 4** (GEMESSEN: 360 × `?variant=`), −8 KB.
- **Für Besucher:** keine Änderung. Die Produktseite wählt ohne Parameter selbst die erste verfügbare Variante.
- **Risiko:** niedrig. `product-card.js` Z.311–319 setzt die href nur bei einem Farbmuster-Wechsel neu, und auf der Startseite gibt es keine Farbfelder.
- **Prüfung:** 0 × `?variant=` im HTML von `/`. browser.mjs: Tipp auf eine Karte öffnet die Produktseite mit vorausgewählter Variante.

**4. Sichtbare H1 im Hero, versteckte Header-H1 weg, Gliederung h1 › h2**
- **Änderung:**
  - (a) `sections/header.liquid` Z.334–336: Die versteckte `<h1 class="visually-hidden">{{ shop.name }}</h1>` streichen. Sie erscheint nur auf `index`.
  - (b) In `index.json` › `hero_jVaWmY` einen neuen Textblock `text_h1` anlegen: type_preset `paragraph`, Abstände wie bei `text_fakten`, in `block_order` vor `text_YLPk4p`, Inhalt die H1 aus §3.
  - (c) `text_YLPk4p`: `<h2>Premium-Style.<br>Schweizer Shop.</h2>` wird zu `<p>…</p>`. Das Aussehen bleibt gleich, weil base.css Z.766 `.text-block.h2 > *` jedes Kind-Element stylt.
  - (d) `text_fakten`: die dritte Zeile («Gratis ab CHF 50 · 30 Tage Rückgabe · Klarna & TWINT») entfernen. Sie wiederholt die USP-Kacheln direkt darunter, die im ersten Bildschirm sichtbar sind.
  - (e) In allen 18 product-list-Sektionen bei `static-header` › `_product-list-text` den Text `<h3>{{ closest.collection.title }}</h3>` durch `<h2>…</h2>` ersetzen. Das Aussehen bleibt, denn das Preset `h4` stylt jedes innere Tag.
- **Ersparnis:** 0 KB. Überschriften nach Massnahme 2: 31 → 30. H1: 1, sichtbar, 67 Zeichen, statt 9.
- **Für Besucher** (GEMESSEN im Testbrowser): Die Zeile über der grossen Schlagzeile kostet 59 px, die gestrichene Zeile 3 spart 45 px. Netto **+14 px Hero-Höhe** bei 390 und 360 px: Reihe 1 rückt von y = 739 auf 753. Am Desktop +6 px.
- **Risiko:** niedrig.
  - Die Rotation fasst Hero und Textblöcke nicht an.
  - `mobil_tempo_patch.py` nutzt `hero_jVaWmY` nur als CSS-Selektor in `lux_usp`.
  - `google_org_richtlinien.py` ankert in header.liquid an der JSON-LD-Zeile «url», nicht an der H1.
  - `automation/add_hero_schweiz.mjs` (nur manuell) würde den Hero überschreiben und darf nicht gestartet werden.
- **Prüfung:**
  - WebFetch `/`: die erste Überschrift ist der H1-Satz.
  - HTML: genau 1 `<h1`, ohne `visually-hidden`.
  - browser.mjs 390 px: Lesbarkeit der kleinen Zeile auf dem Hero-Bild per Screenshot prüfen, Hero-Höhe ≤ 470 px.

**5. srcset der Kartenbilder kürzen**
- **Änderung:** `snippets/card-gallery.liquid` Z.166: dem Aufruf `render 'product-media'` `widths: '240, 352, 480, 600, 832, 1200'` mitgeben. Heute sind es 10 Stufen bis 3840 w; eine Karussell-Karte ist höchstens 450 px breit.
- **Ersparnis:** **−95'376 B** (GEMESSEN durch Kürzen der srcset-Strings der 231 Bilder in Folie 1–2).
- **Für Besucher:** keine Änderung. Auch bei 2-facher Pixeldichte reichen 1'200 w für 450 px.
- **Risiko:** niedrig. `mobil_tempo_patch.py` ankert an der widths-Standardzeile in `product-media.liquid` und nicht an Z.166. Der Parameter überschreibt den Standard und enthält 480 und 600.
- **Prüfung:** Bilder im Desktop-Raster der Kollektionsseite scharf, `startseite_bildlast` ohne Ausreisser.

**6. Kategorie-Liste nur einmal rendern**
- **Änderung:** `index.json` › `collection_list_hREdj9.settings.layout_type` von `grid` auf `carousel` stellen. Den Weg `carousel_on_mobile=false` NICHT nehmen: am Handy entstünde ein Raster mit 8 Zeilen.
- **Ersparnis:** −55 bis −61 KB, −16 Links, −16 `<img>`, ~−190 DOM-Knoten (GEMESSEN: Rasterkopie 54'882 B mit `hidden--mobile`).
- **Für Besucher:**
  - Desktop: Karussell statt Raster mit 4 Spalten.
  - Handy: weiter ein Karussell. Die Kartenbreite kann sich aber ändern, denn die Handy-Kopie nutzt `--column-count-mobile:1` und `60cqw`, das Karussell nimmt die Sektionseinstellungen (`resource-list.liquid` Z.142–176). Darum Screenshots vorher und nachher vergleichen und notfalls `mobile_card_size` setzen.
- **Risiko:** niedrig. Die Rotation fasst nur product-list an. `theme/swap_catrot.mjs` (manuell) würde die Sektion ersetzen und darf nicht gestartet werden.
- **Prüfung:** HTML enthält 0 × `data-testid="collections-list-grid"`. Screenshot bei 390 px.

**7. Häkchen-SVG des Schnellkaufs einmal statt 120×**
- **Änderung:**
  - `snippets/add-to-cart-button.liquid` Z.61–66: `{{ 'icon-checkmark-burst.svg' | inline_asset_content }}` durch einen leeren Platzhalter-Span ersetzen.
  - In `layout/theme.liquid` neben dem vorhandenen Sprite `lx-icon-atc` (Z.241) einmal `<template id="lx-burst">` mit dem SVG ablegen, dazu ein kleines Skript.
  - Das Skript setzt bei `pointerdown` und `focusin` auf einem `.add-to-cart-button` eine Kopie des Templates in den Platzhalter, falls dort noch keine steckt.
  - Kein `<use>`: Laut Journal 14.09. bricht das die Animation der inneren Pfade.
- **Ersparnis:** **−220'680 B** (GEMESSEN), ~−2'500 DOM-Elemente (Spur 2). Wirkt auf jeder Seite mit Karten.
- **Für Besucher:** gleich. Die Schnellkauf-Knöpfe bleiben (GEMESSEN: 120 von 120 sichtbar bei 390 px).
- **Risiko:** mittel, ein Kaufhebel. Die Animation muss im echten Warenkorb laufen.
  - `pod_designzwang.py` patcht `quick-add.liquid`, nicht diese Datei.
  - Die Wächter, die `theme.liquid` lesen (`warenkorb_einig`, `versandschwelle_rabatt`, `popup_tor_wache`), haben andere Anker. Vorher `--pruefen` laufen lassen.
- **Prüfung:**
  - HTML: genau 1 × `checkmark-burst` auf `/`.
  - browser.mjs 390 px: auf einer Karte «Hinzufügen» tippen. Erwartet: Warenkorb +1, Häkchen sichtbar.
  - Dasselbe auf der Produktseite und in der Warenkorb-Schublade.
  - Danach den Testartikel entfernen.

**8. «30 Tage Rückgabe» als `<strong>` entdoppeln**
- **Änderung:**
  - `index.json` › `lux_usp.custom_liquid`: Kachel 2 und Kachel 5 zusammenlegen zu «30 Tage Rückgabe – gemäss Rückgabebedingungen» (mit Link).
  - Kachel 5 streichen oder durch eine Zusage ersetzen, die ein Wächter abdeckt, etwa «CH-Lager: 2–3 Werktage» (gedeckt von `kassen_lieferdatum_wache`, nicht «1–2»).
  - Zusammen mit Massnahme 4d sinkt die Zahl.
- **Ersparnis:** `<strong>` mit «30 Tage Rückgabe» **4 → 2** (USP einmal, Trust einmal), Textvorkommen 9 → 7. Etwa 0,3 KB.
- **Risiko:** niedrig. `mobil_tempo_patch.py` erkennt `lux_usp` an seiner Marke und ankert nur an Preload- und Style-Zeilen.
- **Prüfung:** Das Muster `<strong>[^<]*30 Tage` kommt ≤ 2× vor. Screenshot der USP-Zeile bei 390 px.

**9. Titellink der Karte auf der Startseite ohne `<a>`**
- **Änderung:** `blocks/product-title.liquid` Z.9–15: Gilt `template.name == 'index'`, den `<p role="heading">` ohne das umschliessende `<a ref="productTitleLink">` ausgeben.
  - Pflicht-Ref ist nur `productCardLink` (`product-card.js` Z.106).
  - Ein Klick auf den Titel führt über `navigateToProduct` (Z.494–533) zur Produktseite.
- **Ersparnis:** **−120 Links** und −120 doppelte Ankertexte (Overlay-Link und Titel trugen denselben Text). Etwa −15 KB (VERMUTUNG).
- **Für Besucher:** Antippen geht weiter. Langes Drücken oder Mittelklick «in neuem Tab» geht nur noch auf dem Bild.
- **Risiko:** mittel. Darum erst nach den Massnahmen 1–8 und einzeln nachmessen.
- **Prüfung:** Antippen des Titels öffnet das Produkt (browser.mjs bei 390 und 1280 px). 2 Links je Karte.

**10. Kleinkram**
- **Lokalisierung** (`snippets/localization-form.liquid`): Die 4 versteckten h2 (ids `drawer-/dropdown-CountryLabel` und `…LanguageLabel`) werden zu `<span class="visually-hidden">` mit derselben id, damit aria-labelledby bleibt. «Country/Region» übersetzen. Das spart −4 Überschriften.
- **JSON-LD:** Die beiden Organization-Blöcke vereinheitlichen, «LuxeStyle CH» gegen «LuxeStyle». Erst prüfen, an welchem Anker `google_org_richtlinien.py` hängt.
- **Suchleiste** in `header-group.json` › `lux_searchbar`: `'<a href="/search?q='`-Strings durch DOM-API ersetzen. Das spart −2 «dynamische» Links.
- **Optional «Alle anzeigen»** (15×) beschriften mit «Alle {{ closest.collection.title }}». Ob das Feld eine dynamische Quelle annimmt, ist VERMUTUNG; zuerst auf der Theme-Kopie testen.

**11. Leerraum in der Menü-Schublade (optional, wirkt nur auf das Messgerät der App)**
- **Änderung:** `snippets/header-drawer.liquid`: Liquid-Tags in den Schleifen auf `{%- -%}` umstellen, nur Leerraum, mit Diff-Pflicht.
- **Ersparnis:** −96 KB ungepackt auf **jeder** Seite (GEMESSEN 95'919 B Leerraum). Gzip aber nur ca. −3 KB.
- **Risiko:** mittel, denn das ist eine Horizon-Kerndatei (Konflikt bei Updates). Darum zuletzt, und nur wenn die App-Zahl wichtig bleibt.

**Erwartete Summe nach Stufe A** (Massnahmen 1–10; Summe der gemessenen Einzelposten, nicht zusammen nachgemessen):

| Kennzahl | heute | nach Stufe A | mit Massnahme 11 |
|---|---|---|---|
| HTML ungepackt | 2'893 KB | ca. 2'100 KB (−27 %) | ca. 2'000 KB |
| Links | 832 | ca. 694 | ca. 694 |
| davon mit Parameter | 364 | 2 | 2 |
| Überschriften | 151 | ca. 26 | ca. 26 |
| H1 | 1 versteckt, 9 Zeichen | 1 sichtbar, 67 Zeichen | gleich |
| `<strong>` «30 Tage Rückgabe» | 4 | 2 | 2 |
| `<img>` | 406 | ca. 275 | ca. 275 |
| DOM-Knoten | – | ca. −3'500 (VERMUTUNG) | – |

Reihen 15 à 8, Damenmode auf Platz 1, Trends auf Platz 2 und der Schnellkauf bleiben unverändert. Serverzeit: VERMUTUNG leicht weniger (weniger Liquid je Karte), vorher und nachher mit Server-Timing messen.

### Stufe B: braucht einen Betreiber-Entscheid, nicht HTML-Gewicht allein

**12. Clarity nur einmal laden** (grösster Tempo-Hebel am Handy, kein HTML-Thema)
- Web-Pixel 2744844673 («advanced DOM events») trennen oder abschalten, das App-Embed `clarity_js` behalten.
- Wirkung im Testbrowser (GEMESSEN): längster Task 3,2–3,8 s → 0,59–0,72 s, Tipp-Wartezeit bis 3,5 s → 0,9 s.
- Ein Betreiber-Klick unter Einstellungen → Kundenereignisse.
- Danach 24 h prüfen, ob Clarity die Startseiten-Sitzungen weiter aufzeichnet. Das braucht der Dauerauftrag «Clarity-Befunde» vom 05.10.

**13. Menü entdoppeln oder kürzen**
- Heute 190 Einträge.
- Doppelte Ziele in der Schublade: 175 Links, davon 163 verschiedene. Im Desktop-Menü: 190 Links, 171 verschiedene.
- Doppel streichen: ca. −31 Links seitenweit.
- Kürzen auf ~40 Einträge (Vorschlag vom 28.09., nicht freigegeben): VERMUTUNG ca. −200 KB und −270 Links auf jeder Seite.

**14. Reihen messbar machen, bevor über sie entschieden wird**
- Heute gibt es keine Klickzahl je Reihe: ShopifyQL kennt nur die Landeseite, GA4 ist nicht verbunden. Ersatzmass: 14 von 15 Reihen hatten in 30 Tagen zusammen 8 Landungen und in 90 Tagen 0 Bestellungen; das ist aber keine Startseiten-Zuordnung.
- **Vorschlag:** In `lux_usp` ein kleines Skript, das bei einem Tipp auf eine Karte `clarity('event', 'reihe_<sektions-id>')` sendet. Keine URL-Parameter, damit keine neuen dynamischen Links entstehen.
- Bei 91 Startseiten-Sitzungen in 14 Tagen nach 2–4 Wochen auswerten.
- Erst dann entscheiden: Reihen ohne Klicks ab Bildschirm 6 auf `disabled` setzen oder beim Scrollen nachladen.
  - `disabled` versteht die Rotation (Z.131), und die Prüfung in Z.280 bleibt erfüllt, weil der Schlüssel `max_products` stehen bleibt.
  - Nachladen hiesse eigener JS-Code, Gefahr von Layout-Verschiebungen und mehr Aufwand.

**Tempo-Beifang, nicht HTML:** Das versteckte Hero-`<img>` (`luxestyle-hero-clean-mobil-v11.jpg`, 85 KB, `fetchpriority=high`) lädt neben dem eigentlich angezeigten tati-Hintergrundbild, das zugleich das LCP-Element ist. Erst messen, wie die Hero-Höhe ohne `<picture>` aussieht, dann entscheiden.

## 3. H1-Vorschlag

**«LuxeStyle – dein Schweizer Online-Shop für Mode, Beauty & Geschenke»** (67 Zeichen)

- **Darstellung:** kleine Zeile über der unveränderten grossen Schlagzeile «Premium-Style. Schweizer Shop.». Die Schlagzeile wird zum `<p>` mit Preset h2.
- **Inhalt:** Marke, Sortiment und Schweiz in einem natürlichen Satz. Bewusst nicht «aus der Schweiz», weil der Hero selbst sagt, dass der grösste Teil der Ware aus Asien kommt.
- **Eindeutigkeit:** genau eine H1 auf der Seite. Die versteckte Header-H1 entfällt, das Logo (`<a>` mit `<img>`) ist und bleibt keine H1.
- **Ausweichvariante ohne zusätzliche Höhe:** `<h1>Mode &amp; Beauty.<br>Schweizer Shop.</h1>` direkt in `text_YLPk4p`. 29 Zeichen, gemessen 2 Zeilen bei 390 und 360 px, Hero bleibt 450 px. Die Marke fehlt dann.

## 4. Bewusst NICHT geändert

- **Reihen:** Zahl (15), 8 Karten je Reihe, Reihenfolge (Damenmode Platz 1, Trends Platz 2), Wechsel-Pool und Saisonlogik der Rotation. Keine Reihe fällt weg, solange keine Klickdaten vorliegen (Massnahme 14).
- **Schnellkauf auf den Karten:** bleibt ein Kaufhebel (120 von 120 Knöpfen am Handy sichtbar). Nur das 120× gleiche SVG wird entdoppelt.
- **Folie 2 der Kartengalerie:** bleibt für das Hover-Bild am Desktop.
- **5'092 Wörter:** kein Fehler an sich. Sie sinken durch Massnahme 2 von selbst (ca. −780 Wörter, die versteckten Titel-Kopien). Es wird kein Text gekürzt und keiner aufgefüllt.
- **Rückgabe-Hinweis:** bleibt als Vertrauenssignal je einmal im Ankündigungsband, in der USP-Kachel, im Trust-Text und im Footer, nicht pro Karte und nicht doppelt.
- **Menü-Inhalt und Kategorie-Auswahl:** Betreiber-Entscheid (Massnahme 13).
- **Head-Skripte:** Judge.me-Einstellungen und Shopify-Pixel-Loader gehören App bzw. Plattform.
- **Leerraum in allen Horizon-Dateien:** gzip spart nur 24 KB; Ausnahme ist die optionale Massnahme 11.
- **Kundenstimmen, Spotlight-Video und Banner «Selbst gestalten»:** Inhalt bleibt.
- **5 Produkte in zwei Reihen** (Sneaker in «fur-ihn» und «schuhe-sneaker"): bleiben. Die Rotation wählt die Kataloge, eine Zusammenführung bringt wenig.

## 5. Wächter gegen neue Aufblähung

**Gastgeber:** `automation/startseite_bildlast.mjs`. Es lädt die Startseite schon täglich mit 390 px und iPhone-Kennung, gestartet aus `fixer_keepalive.sh` Z.1864–1870, und führt das Ledger `dropship/_startseite_bildlast.tsv`. Es braucht also keinen neuen Start und keinen zusätzlichen Abruf.

**Erweiterung:**
- Aus `const resp = await p.goto(…)` den Rohtext `await resp.text()` nehmen, also das HTML, das auch die SEO-App sieht. Daraus zählen:
  - KB
  - `<a … href>`
  - `<h[1-6]`
  - `<h1>`: Anzahl, Textlänge, Klasse `visually-hidden`
  - `?variant=`
  - `<product-card`
  - `processing` aus dem Server-Timing
- Ausgabe als zweite Zeile, zum Beispiel:
  `STARTSEITE: 2'1xx KB · 694 Links (2 mit Parameter) · 26 Ü · H1 «LuxeStyle – …» (67) · 124 Karten · proc 9xx ms`
- Ledger `dropship/_startseite_gewicht.tsv`.

**Grenzen:**
- Ab Schritt 0 als Ausgangswert nur messen und protokollieren.
- Nach Stufe A gemessener Wert + ~10 %: Melden bei mehr als 2'350 KB, mehr als 760 Links, mehr als 35 Überschriften, mehr als 10 × `?variant=` oder mehr als 128 Karten.
- Ausserdem immer, wenn die Seite nicht genau eine H1 hat, die H1 kürzer als 20 Zeichen ist oder versteckt.
- Zusätzlich `startseite_schlank_patch.py --pruefen`: meldet «Marke fehlt», wenn ein Horizon-Update eine gepatchte Datei überschrieben hat.

**Selbsttest (`--selbsttest`), Kanarienvögel:**
- Dasselbe abgerufene HTML wird dreimal manipuliert:
  - eine Reihe doppelt eingefügt
  - `<h1 class="visually-hidden">X</h1>` zusätzlich
  - 120 × `?variant=1` angehängt
- Jede Manipulation muss einen Befund auslösen, das unveränderte HTML darf keinen auslösen.

**Ampel:** In `automation/betreiber_ampel.py` neben `startseiten_optik()` (Z.839) eine Funktion `startseiten_gewicht()` anlegen. Sie liest die letzte Ledger-Zeile und zeigt nur dann eine ⚠️-Zeile, wenn eine Grenze verletzt ist oder das Ledger älter als 48 h ist («Wächter steht»).

**Cache-Vorbehalt:** Unsere IP kann eine alte Kopie bekommen (CLAUDE.md, 19.08.). Für die Zählung der Struktur ist das tragbar. Ein Befund zur H1 oder ein Sprung von mehr als 20 % wird vor dem Melden mit einem zweiten Abruf und mit WebFetch bestätigt.
## Gegenprüfung (Skeptiker)
# Skeptiker-Prüfung: Umbauplan Startseite luxestyle.ch (13.10., ca. 20:50 UTC, nur gelesen)

**Grundlage, alles heute Abend gemessen:**
- **Theme-Dateien:** Die md5 aller 10 Ausgangsdateien aus dem Plan stimmen mit dem Live-Stand überein (Abruf über die Admin-API).
- **curl-Abruf 20:3x:** 2'891'154 B, processing 1'069 ms, render 813 ms, Theme 187533001089, `pageType index`.
- **DOM-Simulation im Testbrowser:** `tools/browser.mjs` mit 390 und 1280 px. Ich habe dabei Tags nur im Testbrowser ausgetauscht, am Shop ist nichts geändert.
- **HTML-Simulation:** `sim.py` wendet die Liquid-Massnahmen von Stufe A auf das Live-HTML an.
- **Skripte:** `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/startseite/skeptiker/` (`slides.py`, `sim.py`, `probe*.mjs`). Die grossen Dateien sind gelöscht.

## Kurzurteil

Der Plan ist in der Richtung richtig. Fünf Behauptungen halten der Prüfung aber nicht stand:

1. **Massnahme 4(c) und 4(e): «Das Aussehen bleibt gleich» ist falsch.**
   - In `layout/theme.liquid` Z.117 steht die Regel `ls-serif-headings`: `h1, h2, .h0, .h1, .h2 … { font-family: "Iowan Old Style", … serif !important }`.
   - Die Hero-Schlagzeile wird als `<p>` von Serif zu Inter.
   - Die 15 Reihentitel werden als `<h2>` von Inter zu Serif.
2. **Massnahme 1: Die Ersparnis ist um rund 64 KB zu hoch angesetzt.**
   - Bei den Pfeilen sind die 15 Navigationspfeile der Reihen mitgezählt. Der Patch entfernt sie nicht, und das soll er auch nicht.
   - Bei den Folien sind die versteckten Variantenfolien mitgezählt. Die bleiben mit dem Patch stehen.
3. **Massnahme 4(d): Die Begründung ist falsch.**
   - Bei 390 px ist die USP-Leiste ein Wischstreifen.
   - Die Kachel «Kauf auf Rechnung / Klarna» liegt ausserhalb des Bildschirms.
4. **Massnahme 8: Die Ersatzkachel «CH-Lager: 2–3 Werktage» wäre heute ein falsches Versprechen** für rund 764 Artikel.
5. **Das Zeitfenster 02:15–02:40 UTC für die Rotation ist nicht verlässlich.** Die Rotation startet nach dem Alter ihres Logs, nicht zu einer festen Uhrzeit.

Dazu ist das Handy-Risiko bei Massnahme 6 überschätzt, die Desktop-Änderung dort dagegen unterschätzt.

## Je Massnahme

**Schritt 0: Messgerät zuerst — halten, mit zwei Korrekturen**
- In `automation/startseite_bildlast.mjs` gibt es kein `const resp`. `p.goto` steht dort ohne Rückgabewert in einer Schleife mit bis zu 3 Versuchen. Die Antwort des letzten Versuchs muss man also erst auffangen.
- `messen.mjs` und `anat.py` liegen nur unter `scratchpad/startseite/handy/` bzw. `anatomie/`. Vor dem Aufräumen gehören sie nach `tools/`.
- Das Ledger sollte Bytes speichern, nicht KB oder KiB. Plan, App und Ausgangswert verwenden heute verschiedene Einheiten.
- Grenzwerte erst nach 7 Tagen mit Stufe-A-Werten festlegen. Die Wechsel-Reihen wiegen je nach Tag 110–156 KB.

**1. Kartengalerie: nur Folie 1–2, keine Pfeile — ändern**
- **Ursache stimmt.**
  - `slideshow.js` Z.563: `this.disabled = this.isNested || this.disabled`.
  - `card-gallery.liquid` Z.113–118: `max_visible_slide_count` = 3.
  - Z.108–110: `show_arrows`.
- **Die Ersparnis stimmt nicht.**
  - Versteckte Variantenfolien zählen nicht gegen das Maximum (Z.141–146). Mit `max = 2` fallen deshalb nur 93 sichtbare Folien weg: 181 KB und 93 `<img>`. Der Plan rechnet mit 227 KB und 115 `<img>`.
  - 26 versteckte Variantenfolien (52 KB) bleiben stehen.
  - Bei den Pfeilen hat der Plan 116 Blöcke mit 145 KB gezählt. Darin stecken 15 Reihenpfeile à 1'252 B, die `resource-list-carousel` rendert. Kartenpfeile gibt es 101, zusammen 126,6 KB.
  - **Realistisch sind ≈ −308 KB statt −372 KB.**
- **Optional dazu:** Im Karussell-Fall auch versteckte Folien überspringen.
  - Die Startseitenkarten haben keine Farbfelder: Jede product-list-Karte besteht nur aus Galerie, Titel und Preis.
  - Das bringt weitere −52 KB und −26 `<img>`.
  - Die Folien-Indizes bekommen dann Lücken (z. B. 0 und 3). Darum ist ein Hover-Test bei 1280 px Pflicht.
- **Konflikte:** mit der Rotation und `mobil_tempo_patch` keine.

**2. Zoom-out-Titel nur im Kollektionsraster — halten**
- Bestätigt: `base.css` setzt `.product-grid-view-zoom-out--details { display:none }` und stylt nur über die Klasse.
- `enable_grid_density: true` steht in `templates/collection.json` und in `search.json`. Der Block wird dort also gebraucht. Auf `/collections/hype-jetzt` gibt es 25 solche Blöcke.
- Robustere Bedingung: `section.settings.product_card_size != blank`. Das ist dasselbe Merkmal, das `card-gallery` in Z.31 nutzt.

**3. Kartenlinks ohne `?variant=` — halten, mit zwei Präzisierungen**
- In `product-card.liquid` Z.38 (`assign variant_to_link`) **nicht** ändern. Der Wert wird in Z.41 für `featured_image` gebraucht. Nur das `href` in Z.75 umstellen.
- In `product-title.liquid` steht das `href` in Z.10, nicht in Z.12.
- `quick-add.js` → `productPageUrl`: Ohne Parameter und ohne Auswahl entsteht eine URL ohne Parameter, und die Produktseite wählt die erste verfügbare Variante. Das Ergebnis ist identisch.
- Den Prüfschritt ergänzen: auf der Startseite das Modal «Auswählen» eines Produkts mit mehreren Varianten öffnen.
- Simulation: Links mit Parameter 364 → 4.

**4. H1 — ändern**
- **(a) Versteckte H1 im Header streichen: halten.**
- **(c) Hero-Schlagzeile als `<p>`: verwerfen.**
  - Gemessen: heute Iowan Old Style, 700, 36 px am Handy und 48 px am Desktop.
  - Als `<p>` greift `.text-block.h2 > *`, und die Schlagzeile wird **Inter 700**.
- **(e) Reihentitel als `<h2>`: verwerfen.**
  - Gemessen: heute Inter 500 24 px, als `<h2>` Iowan Serif 500 24 px. Alle 15 Reihentitel würden die Schrift wechseln.
  - Ob die Gliederung h1 › h2 oder h1 › h3 lautet, bringt für SEO praktisch nichts.
- **(b) Die neue kleine H1-Zeile (gemessen):**
  - Sie erscheint als Serif 400 in 14 px.
  - Sie hat **keinen Textschatten** auf dem Bild. Die Schatten-Regel in `theme.liquid` Z.511 nennt nur `h2` und `p`.
  - Sie kostet +20 px Höhe bei 390 und bei 1280 px. Der Plan rechnet mit +14 bzw. +6 px.
- **Empfehlung, Variante A — ohne sichtbare Änderung (gemessen):**
  - In `text_YLPk4p` wird `<h2>` zu `<h1>`.
  - Schrift, Grösse, Zeilenblock (79 px) und Hero-Höhe (450 px) bleiben identisch.
  - Einzig der Handy-Textschatten fehlt dann. Darum die Regel um `h1` ergänzen, am besten im Block `lux_usp`, der nur auf der Startseite gilt, und nicht in `theme.liquid`.
  - H1 ist dann «Premium-Style. Schweizer Shop.»: 29 Zeichen, 4 Wörter, sichtbar.
- Eine Stichwort-H1 mit 67 Zeichen ist ein Textentscheid des Betreibers. Wenn er sie will, dann nur (b) ohne (c), und mit Schatten-Regel.
- **(d) Faktenzeile 3 streichen: ändern.**
  - Am Handy ist die USP-Leiste ein Wischstreifen (CSS in `lux_usp`: `nowrap` und `overflow-x:auto`).
  - Bei 390 px liegen die Kacheln so (gemessen):

    | Kachel | Position (px) | im ersten Bildschirm |
    |---|---|---|
    | Gratis-Versand | 32–170 | ja |
    | 30 Tage Rückgabe | 176–314 | ja |
    | Schweizer Shop | 320–488 | angeschnitten |
    | Kauf auf Rechnung | 494–668 | nein |

  - Ohne Zeile 3 verschwinden Klarna und Rechnungskauf aus dem ersten Bildschirm, obwohl CLAUDE.md sie prominent haben will.
  - Lösung: zusammen mit Massnahme 8 die Kacheln umordnen und Klarna auf Platz 2 setzen. Danach Zeile 3 streichen.
  - Gemessen: Hero 450 → 405 px. Die erste Reihe rückt damit voraussichtlich von 739 auf etwa 694 px.

**5. srcset der Kartenbilder kürzen — halten, aber nur im Karussell**
- Gleiche Bedingung wie bei Massnahme 1: `layout_type == 'carousel'`. So bleiben die Kollektionsraster unberührt, auch die mit einer Spalte (`mobile_product_card_size large`) und das Desktop-Raster.
- Simulation: −105 kB.
- `product-media.liquid` nimmt den Parameter an (`widths | default:`). `mobil_tempo_patch` prüft dort nur seine Marke.

**6. Kategorie-Liste nur einmal rendern — halten, Risiko liegt anders als im Plan**
- **Handy: keine Änderung.**
  - `resource-list.liquid` setzt in Z.78–85 (Karussell) und Z.158–163 (Handy-Kopie) dieselben Variablen: `--column-count-mobile:1` und `--mobile-card-size` = Sektionseinstellung 44cqw. Die 60cqw sind nur der Standardwert.
  - `collection-list.liquid` Z.2–4: `max_items` ist unabhängig vom Layout 16.
- **Desktop: sichtbare Änderung.** Aus dem Raster mit 4×4 = 16 Kacheln wird ein Karussell mit 4 sichtbaren Kacheln plus Pfeilen. Darum den Betreiber kurz informieren und einen Screenshot bei 1280 px machen.
- Simulation: −54 KiB, −16 Links, −16 `<img>`.

**7. Häkchen-SVG einmal statt 120× — halten (mittleres Risiko)**
- Fällt sicher aus: `product-form.js` (`animateAddToCart`) setzt nur `data-added` und wartet auf `onAnimationEnd`. Ohne SVG funktioniert der Kauf weiter, nur ohne Animation.
- Der Nutzen ist das DOM (≈ 2'500 Elemente). Am Draht spart es fast nichts.
- Rückweg siehe «Gemeinsame Regeln» (`theme.liquid` wurde heute um 20:14 von jemand anderem geändert).

**8. «30 Tage Rückgabe» entdoppeln — ändern**
- Kachel 2 und Kachel 5 zusammenlegen: ja.
- **Ersatzkachel «CH-Lager: 2–3 Werktage»: verwerfen.**
  - Von 2'375 CH-Lager-Artikeln zeigen ~764 bis Stufe 3 (frühestens 17.10.) in der Kasse noch 28. Okt.–11. Nov. (`dropship/CH-LAGER-PROFIL-2026-10-13.md` Z.138 und Z.161).
  - Dasselbe Dokument sagt in Z.117: «Erst nach Stufe 3 und einer Messung umformulieren».
  - `kassen_lieferdatum_wache` würde «2–3» nicht melden, das steht dort in der Liste der erlaubten Formulierungen.
- **Stattdessen diese Reihenfolge:** Gratis-Versand · Kauf auf Rechnung (Klarna · TWINT) · 30 Tage Rückgabe (mit Link) · Schweizer Shop.
- Kachel 5 zu streichen spart am Handy keine Höhe (Streifen bleibt 78 px, gemessen), nur Wischweg.
- Ergebnis: `<strong>` mit «30 Tage» 4 → 2, wie im Plan.

**9. Titellink der Karte ohne `<a>` — halten, als letzte Massnahme und optional**
- Der Galerie-Link trägt `aria-label` = Produkttitel. Zählt die App `aria-label` mit (VERMUTUNG), bleiben je Karte 2 Links mit gleichem Text. Die Meldung «Ankertexte doppelt» verschwindet dann nicht ganz.
- Simulation: −120 Links, −17 KiB. Der Nutzen ist gering.

**10. Kleinkram**
- **Lokalisierung: halten.** «Country/Region» steht fest im Snippet (Z.106–111), ohne Übersetzungsschlüssel. Beim Umbau also direkt deutsch schreiben.
- **JSON-LD: ändern.** Nicht zusammenlegen.
  - Der Block in `header.liquid` trägt die Rückgabe- und Versandregel. `google_org_richtlinien.py` ankert an der `"url"`-Zeile davor.
  - `theme.liquid` Z.221 trägt `WebSite`.
  - Nur den Namen angleichen und im Header-Block `"@id":"https://luxestyle.ch/#org"` ergänzen. Der Anker bleibt unberührt.
- **Suchleiste und «Alle anzeigen»: halten**, beides niedrig. «Alle anzeigen» zuerst auf der Theme-Kopie testen.
- **Fund ausserhalb des Plans:** Das Popup `lxpopup` enthält 2 h2. Das wären −2 Überschriften, aber es ist der WELCOME10-Kaufhebel, darum nicht ohne Not anfassen.

**11. Leerraum in der Menü-Schublade — vorerst verwerfen**
- Es verbessert nur die Zahl der App. Komprimiert spart es etwa 3 KB.
- `header-drawer.liquid` ist eine Horizon-Kerndatei.
- Gefahr: Leerzeichen zwischen Inline-Elementen gehen verloren.

## Gemeinsame Regeln: Korrekturen

- **Zeitfenster der Rotation:**
  - `fixer_keepalive.sh` Z.2649–2656: Die Rotation startet, sobald das Log älter als 86'400 s ist oder `absturz_nachholen` greift. Die Startzeit wandert also, und nach einem Container-Neustart mit leerem `/tmp` läuft sie sofort.
  - Darum dasselbe Schloss nehmen, `flock /tmp/lock_homepage_katalog_rotation.lock`, und darunter live lesen, schreiben und zurücklesen (5× mit 4 s Abstand, wie die Rotation).
- **Was die Rotation anfasst:** nur die Einstellungen der product-list-Reihen und `order` (`umbauen()` Z.112–150). Hero, Textblöcke, `lux_usp` und `collection_list` überleben sie. ✓
- **`mobil_tempo_patch`** schreibt nur, wenn sich etwas ändert. Log 13.10. 01:12: «nichts zu schreiben». ✓
- **Feste Theme-ID:** Horizon-Updates kommen als neue Theme-Kopie und überschreiben MAIN nicht. Wird eine solche Kopie veröffentlicht, patchen alle Skripte still das alte Theme. Das neue Skript sollte `role == MAIN` prüfen und sonst melden.
- **Rückweg Liquid:** Eine Datei nur dann ganz zurückspielen, wenn ihr Live-md5 gleich dem md5 «nachher» ist. Sonst nur den markierten Block entfernen. `theme.liquid` und `header.liquid` wurden heute um 20:14 von jemand anderem geändert.
- **Theme-Kopie:** 12 von 20 Theme-Plätzen sind belegt, es ist also Platz. Die alte Kopie 190339252609 vom 12.09. nicht wiederverwenden.
- **Zeilennummern im Plan:** teils verschoben. `mobil_tempo_patch` steht in Z.1862–1867, `bildlast` in Z.1871–1877, `startseiten_optik` in Z.846. Nur mit Ankern arbeiten.

## Erwartete Summe, korrigiert (Simulation auf dem Live-HTML)

Die Simulation enthält die Massnahmen 1 (korrigiert), 2, 3, 5, 6, 7, 9 und die Lokalisierung aus 10.

| Kennzahl | heute | Plan Stufe A | Simulation |
|---|---|---|---|
| HTML ungepackt | 2'891'154 B | ca. 2'100 KB | 2'171'334 B (−24,9 %) |
| gzip-5 | 230 KB | – | 201 KB (−12 %) |
| Links | 832 | ca. 694 | 696 (694 mit Suchleiste) |
| davon mit Parameter | 364 | 2 | 4 (2 mit Suchleiste) |
| Überschriften | 151 | ca. 26 | 27 (26 mit H1-Variante A) |
| `<img>` | 403 | ca. 275 | 294 (268 ohne versteckte Variantenfolien) |
| Start-Tags im body | 14'921 | ca. −3'500 (VERMUTUNG) | 10'540 (−4'381, −29 %) |

Der DOM-Rückgang senkt vermutlich auch die Kosten des Clarity-Pixels, denn die wachsen mit dem DOM (VERMUTUNG, mit `messen.mjs` nachmessen).

## Stufe B

- **12. Clarity nur einmal laden — halten, mit Ergänzung.**
  - Pixel bestätigt: `runtimeContext STRICT`, `advanced_dom_events`, `privacyPurposes []`.
  - VERMUTUNG: Genau dieses Pixel liefert die Aufnahmen der Kasse, denn das Theme-Embed läuft dort nicht. Vor dem Abschalten im Clarity-Dashboard nach `/checkouts`-Aufnahmen suchen.
- **13. Menü entdoppeln oder kürzen — halten** (Betreiber-Entscheid).
- **14. Reihen messbar machen — halten, mit realistischer Erwartung.**
  - 91 Sitzungen in 14 Tagen bei 62,6 % Absprung ergeben etwa 34 Sitzungen mit Interaktion. Verteilt auf 15 Reihen bringen 4 Wochen meist 0–5 Klicks je Reihe.
  - `clarity()` gibt es nur, solange das Embed bleibt. Wird bei Massnahme 12 stattdessen das Embed abgeschaltet, fällt dieses Messgerät weg.

## Bereinigte Reihenfolge

0. Messgerät: `bildlast` erweitern, `messen.mjs` ins Repo übernehmen, Ausgangswert in Bytes ins Ledger.
1. Massnahme 2 (Zoom-out): keine sichtbare Änderung, −120 Überschriften.
2. Massnahme 3 (`?variant=`, nur Startseite), mit Test des Modals «Auswählen».
3. Massnahmen 1 (korrigiert) und 5 als ein Patch an `card-gallery.liquid`, mit gemeinsamer Bedingung «Karussell» und Hover-Test bei 1280 px.
4. Massnahme 4, Variante A: Header-H1 weg, Hero `h2` → `h1`, Schatten-Regel in `lux_usp`. Dazu Massnahme 8 mit 4(d): Kacheln zusammenlegen und umordnen, dann Zeile 3 streichen. Alles in einer `index.json`-Schreibung unter dem Rotations-Schloss.
5. Massnahme 6, nach einer kurzen Info an den Betreiber wegen der Desktop-Ansicht.
6. Massnahme 7 (`theme.liquid`): mit echtem Warenkorbtest am Handy, auf der Produktseite und in der Warenkorb-Schublade.
7. Massnahme 10: Lokalisierung, JSON-LD-`@id`, Suchleiste.
8. Massnahme 9, einzeln und optional.

**Verworfen:** 4(c), 4(e), die Ersatzkachel aus Massnahme 8, Massnahme 11.

**Stufe B:** zuerst der Kassen-Check, dann Massnahme 12. Massnahme 14, bevor über Reihen entschieden wird. Massnahme 13 ist Betreiber-Entscheid.

Im Shop und im Theme ist nichts geändert und nichts committet.
## Umsetzung 14.10.2026 (Stufe A, erste Schritte)
- **A0 Messgerät** `automation/startseite_gewicht.py` (täglich im Aufseher, Ledger `dropship/_startseite_gewicht.tsv`, erkennt Cache-Kopien).
  Ausgangswert 09:56 UTC: 2.94 MB · 833 Links · 151 Ü · H1 versteckt «LuxeStyle» · 360× ?variant= · 124 Karten · 419 img · 120× Häkchen-SVG.
- **A5 umgesetzt (09:58 UTC)**, Backups `theme_backup/*.vor-a5-2026-10-14`, Marke `lx-schlank-2026-10-14 A5`:
  - versteckte H1 in `sections/header.liquid` entfernt;
  - Hero-Text `<h2>` → `<h1>` «Premium-Style. Schweizer Shop.»; Text-Schatten-Regel in `layout/theme.liquid` gilt jetzt auch für h1;
  - USP-Kacheln: Gratis-Versand (in der Schweiz ab CHF 50) · **Kauf auf Rechnung (Klarna · TWINT · Karten)** · 30 Tage Rückgabe (mit Link) · Schweizer Shop. Die doppelte Rückgabe-Kachel ist weg.
  - Hero-Zeile 3 lautet «🚚 Gratis-Versand in der Schweiz ab CHF 50 · 💳 Klarna & TWINT» (die doppelte Rückgabe ist weg).

  Nachgemessen: H1 1× sichtbar, 150 Ü. Handy-Screenshot 390 px: `dropship/startseite-a5-390px-2026-10-14.png`, Hero unverändert, Klarna im ersten Bildschirm.
- **A2 umgesetzt (10:03 UTC):** `blocks/_product-card-gallery.liquid`. Die Zoom-out-Details erscheinen nur noch bei `section.settings.product_card_size`, Titel als `<p class="h4">` statt `<h3>`.
  Backup `theme_backup/_product-card-gallery.liquid.vor-a2-2026-10-14`. Startseite 150 → **30 Überschriften**. Kollektionsseite (Halloween, frisch gerendert, proc 665 ms): 24 Zoom-out-Titel als `<p>`, 0 `<h3 class="h4">`.
- **Offen:** A1 Patch-Gerüst und A3–A4, A6–A9 (Zoom-out-Titel, ?variant=, Karussell-Galerie/srcset, Kategorie-Liste, Häkchen-SVG, Kleinkram).
  Die Prüfer-Messung mit Ankern und Zeilennummern liegt in `scratchpad`; die wesentlichen Anker stehen oben im Plan.
