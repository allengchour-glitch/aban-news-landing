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

## Runde 2 (10.10. ~13:45–14:00 UTC, «weiter»): eigene Kollektion zum Suchbegriff

**Gemessen** (OpenSEO, Schweiz/de, ~12 Credits):

| Suchbegriff | Okt. 2025 | Nov. 2025 | Dez. 2025 | KD |
|---|---|---|---|---|
| «weihnachtspyjama» | 1'000 | 3'600 | 2'900 | 0 |
| «weihnachtspyjama familie» | 590 | 1'600 | 1'000 | 0 |
| «partner pyjama» | 260 | 480 | 390 | 0 |

- In den Vorjahren lag «weihnachtspyjama» im November bei bis zu 4'400 Suchen.
- Eine eigene Seite zum Begriff gab es nicht. «Weihnachten 🎄» (339 Artikel) nennt Pyjamas nur im Fliesstext.

**Getan:**
- **Neue Kollektion `/collections/weihnachtspyjama-familie`** «Weihnachtspyjamas für die ganze Familie».
  - Eintrag in `automation/data/suchbegriff_kollektionen.json`, Tag `such-weihnachtspyjama`, 7 Ja- und 7 Nein-Kanarien (162/162 gesamt).
  - **Ja-Regel:** Pyjama-/Hausanzug-Wort UND Weihnachts- oder Familienwort, oder Weihnachten UND Familie/Partnerlook.
  - **Nein-Regel:** Hund/Katze, Kostüm, Tasse, Deko, Socken.
  - 30 aktive Sets getaggt, veröffentlicht, SEO-Titel «Weihnachtspyjama für die Familie & Partnerlook».
  - Seitentext mit «Worauf achten?»: Grösse je Person, Passform, Material, Lieferzeit. Die Lieferzeit ist ehrlich angegeben: 10–20 Werktage, «bis Mitte November bestellen», wie im Weihnachts-Text.
  - **Live** (WebFetch): H1, «30 Artikel», Text.
- **Interne Links:**
  - «Weihnachten 🎄» verlinkt die Kollektion zweimal: im Satz über die Pyjamas und in «Mehr Ideen». Die Vorlage `saison_texte_2026_10_08.py` ist mitgezogen.
  - «Alle Kategorien» neu gebaut (386).
- **Wächter:** Der Aufseher-Lauf von `suchbegriff_kollektionen.py` (täglich, Neuimporte) nimmt die Regel automatisch mit.
- **Auswahl der 30 Sets geprüft:** 11 waren noch roh. Zwei Regeln waren zu streng bzw. fehlten:
  - **Zahlenpaar:** «Rot-Kinder 3 4» und «White-Baby 60 0to3M» fielen durch. Ein Zahlenpaar zählt jetzt nur, wenn die Übersetzung es NEU erzeugt.
  - **Artikelnummer vor allen Werten:** Dieselbe reine Nummer («5562-Herren M, 5562-Baby 3») fällt weg, sie unterscheidet nichts.
  - **Codes:** Buchstaben+Ziffern-Codes («SD60-Dad 3XL» → «SD 60 · Papa 3XL») werden abgelehnt.
  - Danach **+4 Sets** (gesamt 17/0) und **+3 Faktenblock-Zeilen** (gesamt 24/0). Gestrichen werden auch deutsche Rollen, wenn die Wahl schon umgebaut ist. Kanarien 27/27.

**Offen:** 7 der 30 Sets in der Kollektion zeigen noch Rohwerte:
- 3× Lieferanten-Kennung «JJF…»
- «Hat Print-…»
- «Picture Color-BOY 3 to 4Y»
- «Color Lighting Chain»
- «Mushroom Hat»
- «Crawling Suit»

Sie brauchen Musternamen nach Sichtprüfung des Bildes, weil die Kennung das Muster unterscheidet. Nachmessen der Positionen «weihnachtspyjama» Mitte November (Search Console).
