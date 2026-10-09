# Lieferantencodes im Auswahlfeld «Farbe» (09.10.2026, Betreiber «weiter»)

## Gemessen

**Optionen-Export** vom 09.10., 04:28 UTC, 51'805 Produkte. Im Auswahlfeld «Farbe» bzw. «Ausführung» standen reine
Lieferanten-Artikelnummern.

Beispiele:
- Herrenhemd: «QW121, QW123, QW124»
- Sport-Shorts-Set: «YT6419113017 … YT6419113012»
- Langarmkleid: «040401, 040402»
- Damen-Kapuzenpullover: «Blau, MFH3IUW75B08E11, MFH243873LYJ35, Aprikose 1, YP723»
- Bambus-Leinen-Hemd: «Muster 13 … Muster 19, ZQ202201025»
- Chelsea-Boots: «OLD5236C3, KD5232, Style5321»

Für eine Kundin ist «KD5237» keine Farbe. Ausserdem ist so ein Code ein Lieferanten-Leak (Hausregel 3).

**Wann importiert** (124 aktive Produkte mit mindestens einem reinen Code im Farbfeld):

| Monat | Produkte |
|---|---|
| Juli | 66 |
| August | 46 |
| September | 7 |
| Oktober | 5 |

Die Oktober-Fälle: Chelsea-Boots (01.10.), Kinder-Badeanzug (02.10.), Herrenhemd mit Palmenmuster (03.10.), Bambus-Leinen-Hemd
(06.10.). Die Importer liessen die Klasse also weiter durch.

### Warum die Importer sie durchliessen

- Beide CJ-Importer (`cj_category_fill.mjs`, `cj_trending_import.mjs`) machen aus Codes nur dann «Modell N», wenn **jeder**
  Wert der Liste ein Code ist (`codeOpt`).
- Ihr Code-Muster verlangt ausserdem einen Buchstaben am Anfang.
- Deshalb blieben gemischte Listen («Blau» neben «MFH3IUW75B08E11») stehen, ebenso Codes, die mit einer Ziffer beginnen
  («040401», «70000EU», «5701S9570135»).
- `variant_value_clean.py` schneidet nur Codes ab, die vor einem Wort stehen. Bleibt danach nichts übrig, behält es den Code.

## Getan

### Regel

Die Regel steht in **einer** Datei: `automation/data/farbcode_modell_regel.json`. Sie wird gelesen von
`automation/farbcode_modell.py` (Bestand, täglich) und `automation/farbcode_modell.mjs` (beide Importer).

**Als Code gilt ein Wert, wenn er alle diese Bedingungen erfüllt:**
- kein Leerschlag (Ausnahme: «YTB 0012» neben «YTB0011»)
- 5–24 Zeichen
- mindestens 3 Ziffern, oder mindestens 6 Ziffern, wenn er nur aus Ziffern besteht
- keine Mass- oder Einheitsangabe
- keine bekannte Kennung (S925, IP68, 18650, XT60)
- kein Wort

**Was aus einem Code wird:**
- Gibt es in der Liste schon eine Serie, bekommt der Code die nächste Nummer davon: «Muster 13–19» → «Muster 20».
- Sonst wird er zu «Modell N», in der Reihenfolge der Galerie.
- Werden **alle** Werte einer «Farbe» zu «Modell N», heisst die Option «Ausführung». So macht es der Importer seit 14.08.
- Ergibt das zwei gleiche Werte (Kollision), bleibt die Option unverändert.

### Bewusst nicht angefasst

Der Trockenlauf zeigte diese Fallen. Jede ist jetzt ein Kanarienvogel:

| Fall | Beispiel | Warum stehen lassen |
|---|---|---|
| Nummer + Tonname | Lippenbalsam «101CLEAR, 112HONEY, 114BLISS» | Der Name ist die Information. Steht in der Liste ein Wert mit Wort, bleibt die ganze Liste. |
| Code + Anhang | «C3101-3XS» neben «C3101», «GZ2794-110» (Körpergrösse), Wimpern «3D40D60D-CC» (Kurve), «TP136-3M» (Alter) | Sonst würden aus «C3101» und «C3101-3XS» zwei Modelle. |
| Code + Grösse ohne Strich | Jeansjacke «Y043S, Y043M, Y043L» | Die Grösse ist die Wahl. |
| Runde Zahlen | «AR2000 … AR7000» (Rollengrössen) | Das sind Grössen, keine Artikelnummern. |
| Mass im Wert | «C22X33CM» | Das ist eine Angabe. |
| Nur ein Wert | — | Es gibt nichts zu wählen. |
| Fach- oder Gerätetitel | TV-Fernbedienung Ersatz, Wimpern-Set | Dort kann der Code das Gerätemodell sein. Nur gemeldet. |

**Wortprüfung bei GROSS geschriebenen Buchstabenfolgen:**
- Ab 5 Buchstaben gilt eine Folge als Wort, wenn mindestens 34 % Vokale darin sind und höchstens 3 Konsonanten aufeinander
  folgen. Beispiele für Wörter: «CLEAR», «HONEY», «CASHMERE». Codes bleiben z. B. «SXCTMB», «MFHFWUZ».
- Zuerst galt die Prüfung schon ab 4 Buchstaben. Dann hielt sie «HAXC», «OCCS» und «FHET» für Wörter und blockierte 11
  Optionen. Mit der Grenze bei 5 wurden sie nachgezogen.

### Live geschrieben

- **Bestand: 166 Optionen geändert, 0 Fehler** (155 und 11), mit `productOptionUpdate` und `LEAVE_AS_IS`.
- Jede Option wurde sofort zurückgelesen.
- **Unabhängige Stichprobe 12/12** ohne Code.
- Das Google-Farbfeld der Varianten trägt keinen Code: 5 gesetzte Felder, 0 mit Code.
- Zwei Produkte nur gemeldet: «TV-Fernbedienung Ersatz» und «Wimpern Extensions Set».

### Importer

`cj_category_fill.mjs` und `cj_trending_import.mjs` rufen `codesNummerieren()` auf. Sind die Kanarien rot, bleiben die Werte
unverändert und es gibt eine Fehlermeldung.

Harness-Test mit `buildFashion()`:

| Eingabe | Ergebnis |
|---|---|
| «QW121-S, QW123-S» | Ausführung «Modell 1, Modell 2» |
| «Blue, MFH3IUW75B08E11, Apricot 1, YP723» | «Blau, Modell 1, Apricot 1, Modell 2» |
| «040401, 040402, Red» | «Modell 1, Modell 2, Rot» |
| «Y043S/M/L» | unverändert |

### Gleichlauf und Wächter

- **py = js** über alle 17'028 Farb- und Ausführungsoptionen im Export: 0 Abweichungen.
- Kanarien 54/54.
- **Wächter** in `fixer_keepalive.sh` (FARBCODE-MODELL), täglich:
  - liest denselben Optionen-Export wie `alter_im_farbwert.py`
  - startet nur, wenn der Selbsttest grün ist (Kanarien + py = js)
  - schreibt über `shopify_schranke.sh`
  - Ledger `dropship/_farbcode_modell.tsv`

### Nebenbei

Der Neuimport «Herren-Halbbereiz-Hooded Sweatshirt» (12:30 UTC) stand nicht im Export von 12:26. Sein Handtitel aus der
Fremdwort-Runde wurde deshalb nie geschrieben. Jetzt ist er nachgezogen: «Herren-Sweatshirt mit Stehkragen und
Aufsatztasche», 1/0. Neue Importe filtert `haendlerwort.mjs` seit 15:45 selbst.

## Offen

- **49 Optionen mit Codes bleiben absichtlich stehen.**
  - 26 Code + Anhang (Grösse, Alter oder Kurve im selben Wert, z. B. «TP136-3M»): Die Option müsste in Farbe und Grösse geteilt
    werden. Das ist eine eigene Klasse, wie bei `alter_im_farbwert.py`.
  - 14 Nummer + Wort (Tonnamen, «DZ163618YJPurple»)
  - 7 Code + Grösse ohne Strich (Jeansjacken «Y043S/M/L»)
  - 2 runde Zahlen
- «Modell N» ist ehrlich, sagt aber nichts über das Aussehen. Hilfreich wäre ein Variantenbild je Modell. Das macht
  `cj_variante_bild.py`. Nächster Schritt: messen, wie viele der 166 Optionen ein Bild je Wert haben.
- Englische Werte daneben («Pearl», «Diamond Model», «European Standard») gehören zur Klasse VARIANTENWERTE-ENGLISCH.
  `variant_value_clean.py` läuft.

## Lehre

**Ein Importer-Wächter, der «alle oder keiner» prüft, lässt jede gemischte Liste durch.**
- `codeOpt` verlangte, dass JEDER Wert ein Code ist. Steht ein einziger echter Wert dazwischen («Blau», «Muster 13»), bleiben
  alle Codes stehen.
- Die Regel gehört auf den einzelnen Wert. Die Liste entscheidet nur noch, wie der Ersatz heisst (laufende Serie) und ob die
  ganze Option tabu ist (Anhang, Tonname).
- Zweitens: Eine Wortprüfung für GROSS geschriebene Folgen braucht eine Mindestlänge. Bei 4 Buchstaben ist «HAXC» genauso
  «aussprechbar» wie «NUDE».
