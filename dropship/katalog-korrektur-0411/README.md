# Katalog-Korrektur vom 04.11.2026: falsches Material «Holz», englische Optionswerte

Auslöser: Besitzer-Screenshot der «Faltbaren Katzenhängematte mit Saugnäpfen» («war etwas auf english und matrial holz?», «hoffentlich alles andere auch»).

## Ursache (GEMESSEN am CJ-Datenblatt)
- CJ-Feld `materialNameEn` steht bei diesem Produkt auf `["Wood"]` und die Kategorie auf «Climbing Frame» (falsch eingeordnet). CJs **eigene Beschreibung** sagt «Material: Fabric». Unser automatischer Faktenblock hatte das strukturierte Feld übernommen, der Fliesstext den Beschreibungstext. Folge: im selben Produkt «aus Stoff gefertigt» und «Material: Holz».
- Die Farben hiessen bei CJ «Sea Salt Blue» und «Milk Fufu Yellow» (Beschreibung: «Milk Foam Yellow»); der frühere Übersetzer hatte nur «Basis/Katzenpfote/Samt/Flausch» eingedeutscht.

## Was am Produkt geändert wurde (live)
`katzenhaengematte_fix.mjs`: Material-Zeile «Holz» → «Stoff»; Optionswerte «Sea Salt Blue …» → «Hellblau …», «Milk Fufu Yellow …» → «Milchgelb …» (6 Werte; 12 Varianten, SKUs, Preise, Bilder unverändert, rückgelesen). Sicherung: `katzenhaengematte_sicherung_vor.json`. Nicht lösbar: englische Schrift auf den Fotos («Sea salt blue (Cat paw style)»), weil das Gemini-Guthaben leer ist (402).

## Katalogweit gemessen (56 529 aktive Produkte, `bulk_beschr.mjs` + `analyse.mjs`, 04.11. ~16:20 UTC)
| Messung | Zahl |
|---|---|
| Produkte mit Faktenblock / mit Material-Zeile | 19 359 / 9 775 |
| Material-Zeile enthält «Holz» | 335, davon erwähnt Titel/Text kein Holz-Wort: 77 |
| Widerspruch Material-Zeile gegen Titel/Text (nur Stoff-/Holz-/Metall-/Glas-Familien, grobe Wortliste) | 850 (bei Leder gegen Kunststoff meist PU-Leder, kein Fehler) |
| englisches Wort in Optionswerten (enge Liste) | 1 073 Produkte; Übersetzer zählt 990 Produkte mit 3 064 Werten |
| englische Optionsnamen (Color, Size, Style …) | 26 |

## Material «Holz» (`material_holz.mjs`, LIVE 04.11. ~16:50 UTC)
Eigene Sichtung der 77 Verdachtsfälle (CJ ordnet Keramik-Näpfe, Uhren, Diamond-Painting-Untersetzer, Bausteine, Kosmetik u. a. fälschlich als Holz ein). Regel, konservativ, nur die Zeile in der Beschreibung: **BLEIBT** (12: Holz belegt oder plausibel, z. B. «Hölzerne Quarzuhr», «Schima superba», Nussknacker), **ERSETZEN** (17: der eigene Text nennt ausdrücklich ein anderes Material, z. B. Keramik, Papier, Silikon, ABS-Kunststoff), **HOLZ_RAUS** (17: bei Mischangaben fällt nur «Holz» weg, z. B. «Kunststoff, Holz» → «Kunststoff»), **ENTFERNEN** (31: nur Holz angegeben und unplausibel → Zeile weg, keine neue Behauptung). **65 Beschreibungen geschrieben, 0 Fehler, jede direkt nach dem Schreiben zurückgelesen.** Sicherung der ganzen Beschreibungen: `material_holz_sicherung.json` (Rücknahme: `descriptionHtml` je Produkt per `productUpdate` zurückschreiben). Die «Spezifikationen & Details»-Tabelle der Produktseite zieht ihre Material-Zeile aus derselben Beschreibung und folgt automatisch (geprüft an der Hängematte: «Material Stoff»).

**Nicht angefasst:** die übrigen rund 770 Widersprüche (grobe Wortliste, Teilemehrdeutigkeit wie «Edelstahl-Rahmen mit Stoffbezug»): braucht je Klasse eine Sichtung. Liste per `analyse.mjs` (`widerspruch.json`).

## Englische Optionswerte (vorhandener Übersetzer `automation/optionen_uebersetzen.mjs`)
Trockenlauf (`PROBE=40`): 990 Produkte, 3 064 Werte, **976 brauchbare Vorschläge** (Wörterbuch 22, KI 1 254 Versuche; der Rest scheitert an den eigenen Prüfungen: englischer Rest, neue Zahl, Länge), **429 Produkte** mit mindestens einem brauchbaren Vorschlag. Stichprobe der Vorschläge: überwiegend gut («Size 5» → «Grösse 5», «Mustard Yellow» → «Senfgelb», «Cherry Blossom Pink» → «Kirschblütenrosa»), einzelne schwach («Black Noodles» → «Schwarze Nudeln», «Hong Kong Size Size 15» → «Hong Kong Grösse Grösse 15», «Gun Gray» → «Gun Grau»). Es ändern sich nur Namen, nie Varianten, SKUs, Preise oder Bilder (`plane()` prüft Kollisionen, Marken, erfundene Zahlen).
- **Erste Live-Charge (`LIVE=1 LIMIT=25`): 12 Produkte geschrieben**, danach zeigte die Nachlese **Mischungen in einer Option** («Small / Gross», «Mittel / Large Size»): der Übersetzer hatte nur die Werte umbenannt, die er übersetzen konnte.
- **Fix im Werkzeug (04.11. abends):** `ergaenzung()` übersetzt häufige, eindeutige Muster deterministisch (Small/Medium/Large (+ Size), Extra Large, N PCS, N pack, (US) Size N); `waehleWunsch()` + Schalter **`GANZ=1`** benennt eine Option nur um, wenn **alle** ihre englischen Werte übersetzt sind (sonst bleibt sie ganz unverändert). Test 66 Prüfungen (CI), Mutationsprobe **18 von 18 erkannt** (zwei Überlebende zuerst, mit Gegenproben `Extra Large Black`/`2pcs Matt purple` geschlossen).
- **Live mit `GANZ=1`:** zweite Charge 54 Produkte (164 Werte), dritte Charge 326 Produkte (943 Werte), 316 Werte von `plane()` abgelehnt (Kollision/Zahl/Marke), 0 Fehler. **Ledger: 396 verschiedene Produkte, 1 166 Werte seit 16:40 UTC.** Nachlese aller 396 frisch aus Shopify (`optionen_lesen2.mjs`, Scratch): 0 fehlende Produkte, Variantenzahlen/SKUs unverändert, Varianten ohne Bild nur 1 (`kissenhulle-grasgrun-mit-blumenmuster-62…`, 2 von 4, Bilder wurden von keinem Schritt angefasst, Vorbestand nicht belegt). Die Treffer «Mischung» der Nachlese waren zu 25 von 27 Fehlalarme (deutsche Wörter wie «Version», «Upgrade», «Leopard», «Matte», «multi» stehen auf der **Eingabe**-Liste `EN_RE`, nicht auf der Ausgabe-Liste); **zwei echte Reste von Hand behoben** (Kissen: «45X45cm without core» → «45 × 45 cm, ohne Füllung», «53X53cm without core/with core» → «53 × 53 cm, ohne/mit Füllung»; Korb: «Three piece suit» → «Dreiteiliges Set»; frisch gelesen, 16 bzw. 4 Varianten unverändert).
- **Grenze:** 561 Optionen blieben unverändert, weil mindestens ein Wert nicht sauber übersetzbar war (bewusst, kein Mischzustand). Die Übersetzungen sind maschinell: bei Fantasie-Farbnamen teils holprig («Sour Orange Yellow» → «Sauer Orange Gelb», «White face beauty» → «Weisse Gesichts-Schönheit»), aber nie mehr Englisch neben Deutsch in einer Option. Rücknahme je Produkt: Werte über `productOptionUpdate` auf die Originalnamen zurücksetzen (Original/Neu-Paare stehen im Zwischenspeicher `/tmp/optionen_uebersetzt.json`, nur solange die Sitzung lebt; nicht im Repo gesichert).

## Lehren
1. **Das strukturierte CJ-Materialfeld ist unzuverlässig** (Klassifizierung «Wood»/«Climbing Frame»); die Beschreibung und der Fliesstext sind verlässlicher. Ein Faktenblock, der nur dem Feld folgt, widerspricht dann seinem eigenen Text.
2. Eine Wortlisten-Messung («Text erwähnt Holz nicht») muss Umlaute berücksichtigen: «hölzern» wurde zuerst übersehen und wäre fälschlich gestrichen worden.
3. Ein Messgerät, das «Default Title», Pink, Gold, Beige, Khaki, Orange als Englisch zählt, meldet 27 965 statt 1 073 Produkte: vor jeder Zahl die Wortliste prüfen.

## Ausführen
`ARBEIT=<Ordner> node dropship/katalog-korrektur-0411/bulk_beschr.mjs` (Strom-Auswertung der Bulk-Abfrage, nur Lesen), danach `analyse.mjs` und `analyse_englisch.mjs`; `material_holz.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt) liest `holz_verdacht.json` aus `ARBEIT` (liegt hier im Ordner, also `ARBEIT=dropship/katalog-korrektur-0411/`).
