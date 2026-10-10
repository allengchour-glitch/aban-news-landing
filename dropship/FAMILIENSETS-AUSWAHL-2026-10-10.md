# Familien- und Partnerlook-Sets: Auswahl auf Deutsch (10.10.2026, «weiter»)

## Gemessen

- **Search Console** (über OpenSEO, gratis, 28 Tage):

  | Suchbegriff | Position |
  |---|---|
  | «familien-weihnachtspyjama» | 26 |
  | «familie weihnachtspyjama» | 40 |
  | «partner weihnachtspyjama» | 22 |

  Die Nachfrage steigt bis Dezember.
- **Auswahlfeld:** Genau dort wählte die Kundin zwischen Lieferantentexten wie «Gray-Father S», «Hat Print-S For Mother», «White-DadS», «Mother's Size L», «Mixed Color-Xl For Father» oder «JJF153358-Dad 3XL».
  - Im Optionen-Export (52'293 Produkte) haben **43 Optionen** mindestens zwei Rollenwörter (Dad/Mom/Kid …) im Wert.
- **Ursache:** `tools/varianten_deutsch.mjs` (12.09., 56 Selbsttests) hatte damals 13 Produkte von Hand übersetzt. Neuimporte seither liefen nie durch, und kein Wächter lief täglich.
- **Zweite Stelle:** Der Faktenblock «Produktdetails» der Beschreibung trug weiter den rohen Variantenschlüssel («Farbe: Black-Father S Size, …»), auch bei den 13 Sets vom 12.09.
  - Nachgewiesen per WebFetch auf der Live-Seite.
  - `produktdetails_wahrheit.py` lässt die Zeile bewusst stehen, wenn es keine Farb-Option gibt.

## Getan

- **Strenger Aufsatz `automation/familienset_werte.mjs`** auf dem Übersetzer. Eine Option wird nur übersetzt, wenn alles zutrifft:
  - Familien-Titel oder mindestens zwei Werte mit Elternwort
  - keine Lieferanten-Kennung (JJF…), danach **kein englischer Rest**, **kein Code vorn** («5562 · Herren»)
  - Grössen buchstabengleich, keine Kollision
  - keine doppelten Wörter («Kid03 children» → «Kind 03 Kind» wird abgelehnt)
  - keine «3 to 4Y»
  - Sonst bleibt die Option, wie sie ist (lieber Englisch als Denglisch).
- **Optionsname:** «Farbe» heisst danach «Ausführung & Grösse» bzw. «Ausführung», wie am 12.09. eingeführt.
- **Übersetzer** (`tools/varianten_deutsch.mjs`, Selbsttest weiter grün):
  - «Mixed Color» → «Farben gemischt», Girl/Girls → «Mädchen», Boy/Boys → «Jungen»
  - **Fehler behoben:** «Baby 9 m» (9 Monate) wurde zu «9 M» (Grösse M?). Ein einzelnes m/s/l direkt nach einer Zahl bleibt jetzt klein, neue Probe im Selbsttest.
  - Deutsche Farbpaare («Schwarz-Weiss») werden nicht mehr am Strich zerlegt.
- **Bestand: 13 Sets, 13/0**, jede Option zurückgelesen. Beispiele:
  - «Gray-Father S» → «Grau · Papa S»
  - «Black-XL For Father» → «Schwarz · Papa XL»
  - «Picture Color-S For Mother» → «Wie abgebildet · Mama S»
  - «Black And White-Dad S» → «Schwarz-Weiss · Papa S»
  - «Girl 3to4Y» → «Mädchen 3to4Y»
- **Produktdetails: 21/0.** Die Farbe-Zeile mit englischen Rollenwörtern ist gestrichen, auch bei den Sets vom 12.09. Die Wahl steht im Auswahlfeld. Ledger `dropship/_familienset_auswahl.tsv`.
- **Live geprüft** (WebFetch): `/products/weihnachts-pyjama-set-im-rot-schwarzen-karomus-076864` zeigt «Ausführung & Grösse: Schwarz · Papa S …».
- **Importer:** `cj_category_fill.mjs` und `cj_trending_import.mjs` rufen `familienWerte()` in `buildFashion()` auf.
  - Harness-Test: «Gray-Father S …» → «Grau · Papa S», Option «Ausführung & Grösse».
  - «Hat Print-…» bleibt roh (strenge Regel), normale Ware unverändert.
- **Wächter:** Block FAMILIENSET-AUSWAHL im Aufseher, täglich.
  - startet nur bei grünem Selbsttest (Übersetzer + 23 Kanarien)
  - schreibt über `shopify_schranke.sh`

## Bewusst nicht (30 Optionen bleiben roh)

- **Lieferanten-Kennung** trennt die Muster: «JJF106230color-Dad 3XL», «JJF153358-…». Wegwerfen würde zwei Muster gleich benennen.
- **Code vorn:** «230Green-Dad L», «5562-Herren M».
- **Englischer Rest ohne sichere Übersetzung:** «Hat Print», «Girls' Suit Size 80», «Sweater Autumn-90cm», «Pink Parent Child», «3 to 4Y».

## Offen

- Für die 30 rohen Optionen bräuchte es Musternamen pro Set (Bild ansehen: «Mützen-Print» statt «Hat Print»). Das wäre eine eigene Runde mit Sichtprüfung.
- Positionen «familien weihnachtspyjama» in 4 Wochen nachmessen (Search Console).
