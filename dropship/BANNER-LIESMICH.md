<!-- Verschoben aus automation/banner/LIESMICH.md: der Voice-Linter prüft automation/**.md, dropship/** nicht. -->
# PINNWAND (Endfassung): Kategorie-Label 2000 x 1000 für LuxeStyle.ch

Stand 26.10.2026. Gewinner des Jury-Urteils (`/tmp/banner_design/URTEIL.md`), mit allen elf genannten Verbesserungen und den
übernommenen Ideen der anderen Entwürfe. Nichts veröffentlicht, nichts in den Shop geschrieben, nichts committet; alles liegt unter
`/tmp/banner_design/final/`.

## Dateien

| Datei | Zweck |
|---|---|
| `banner.mjs` | `bannerHtml(titel, bilder, anzahl [, opts])` -> komplette HTML-Seite (Viewport 2000 x 1000), dazu `anzahlText`, `rezept`, `plaetze`, `fotoHinweis` |
| `banner_test.mjs` | 23 Tests (13 rein, 10 im Browser); `SCHNELL=1` überspringt den Browser-Teil |
| `render_samples.mjs` | rendert die 6 Beispielkategorien nach `out/<handle>.jpg` + `out/crops/<handle>_4x3.jpg` / `_1x1.jpg` + `.html` |
| `render_faelle.mjs` | die künstlichen Fälle (6 / 7 / 10 / 14 Fotos, langer Titel) nach `out/faelle/` |
| `beispiele.mjs` | von Hand gewählte Fotos je Beispielkategorie, Makel-Vermerke, `#fokus`-Hinweise |
| `tojpeg.py` | PNG -> progressives JPEG (q86, 4:4:4); Pillow aus `/usr/bin/python3` |

Aufruf: `/opt/node22/bin/node render_samples.mjs` (`NUR=schmuck,kissen`, `BAND=marine` für die Vergleichsfarbe, `STRENG=1`).
Ergebnisse: `out/*.jpg` (303 bis 419 KB statt 1.2 bis 2.9 MB PNG), Zuschnitte in `out/crops/`, Randfälle in `out/faelle/`.

## Aufbau

- **Titelband** in Markentinte (`#2c2118 -> #1e160f`, Text `#f8f0df`, Gold `#e6b25a`) quer durch die Mitte, y 355..645, leicht schräg (-0.7 Grad).
  Titel und Fusszeile liegen in der **Sicherheitszone x 570..1430** (Titel 860 px, Fusszeile 840 px). Das gilt im vollen Bild, im 4:3-Zuschnitt
  (x 333..1667) und im Quadrat (x 500..1500); im Quadrat bleiben mindestens 70 px Rand.
- **Karten**: weisser Rahmen, 0.5 bis 1.6 Grad Schräglage, feiner Schatten, leicht überlappend. Nadeln (20 px) nur an jeder zweiten Karte,
  Washi-Streifen (84 x 24 px, Deckkraft .62) nur an jeder sechsten. Einzelne Seitenkarten hängen auf einem Bogen Kraftpapier.
- **Pinterest-Rhythmus**: Mittelreihen gestaffelt. Hohe und niedrige Karten wechseln sich ab; obere Reihe: Oberkante 20..32 px (hoch) bzw. rund 38 px tiefer
  (niedrig, 12 % kürzer); untere Reihe: Unterkante 984..990 (hoch) bzw. 960..966 (niedrig). Seitenspalten mit 2 oder 3 Karten haben ungleiche Höhen.
- **Aufteilung je Fotozahl** (`rezept(n)`, gesucht, nicht von Hand): Spaltenbreite, Karten je Seite und je Reihe. Kosten = Kartenformat nahe am Quadrat
  + Strafe für Kartenstreifen an den Zuschnittkanten (mit der Überlappung gerechnet) - Belohnung für gut sichtbare Karten. Ergebnis: **für alle n die
  Seitenspalte bis x 320**, also keine Seitenkarte im 4:3- oder Quadrat-Zuschnitt (die Idee «Kanten auf 333 / 1667» von Mosaik, mit Überlappung eingerechnet).

  | Fotos | Seiten links/rechts | Reihe oben/unten | Mittelkarte (B x H) | gut sichtbar 4:3 / Quadrat |
  |---|---|---|---|---|
  | 6 | 1 / 1 | 2 / 2 | 680 x 315 (2.2:1) | 4 / 4 |
  | 7 | 1 / 1 | 2 / 3 | 680 oder 453 x 315 | 5 / 5 |
  | 8 | 1 / 1 | 3 / 3 | 453 x 315 (1.4:1) | 6 / 6 |
  | 9 | 1 / 2 | 3 / 3 | 453 x 315 | 6 / 6 |
  | 10 | 1 / 3 | 3 / 3 | 453 x 315 | 6 / 6 |
  | 12 | 3 / 3 | 3 / 3 | 453 x 315 | 6 / 6 |
  | 14 | 3 / 3 | 4 / 4 | 340 x 315 (1.1:1) | 8 / 4 |

  («Gut sichtbar» = mindestens die Hälfte der Karte im Zuschnitt.) Mehr Fotos erhöhen die Zahl im vollen Bild und im 4:3-Zuschnitt, nicht im Quadrat:
  das Quadrat zeigt immer das Band und rund vier bis sechs Karten.

Zwei Schritte laufen **in der Seite** (Skript, kein Netz nötig, `window.__fertig` meldet das Ende, `window.__bericht` die Messwerte):

1. **Titel**: beste Zeilenaufteilung per Canvas-Messung (1 bis 2 Zeilen, Umbruch an Leerzeichen oder nach dem Bindestrich, nie ein «&» allein, bevorzugt «& …» am
   Anfang der zweiten Zeile) und grösste passende Schrift ab `titelGroesse()` (176 / 160 / 128 / 104 / 92). Zweizeilig höchstens 84 px, damit die Fusszeile nicht anstösst.
   Fusszeile: «LuxeStyle.ch ◆ 12’000+ ARTIKEL» in 44 / 34 px; «Schweizer Shop» steht nur, wenn die dreiteilige Fassung bei 30 px in 840 px passt (mit Zahl nie, ohne Zahl ja).
2. **Fotos** (nach dem Laden): erst jedes Foto messen, dann zuordnen, dann behandeln.
   - *Zuordnung* (Hungarian, aus Mosaik): wichtigste Plätze (viel Fläche in 4:3 und Quadrat) für die besten Fotos, dabei möglichst passendes Seitenverhältnis.
     Bei weissen Freistellern zählt die Form des **Produkts**, nicht des Fotos, und was die Karte vom Produkt abschneiden würde (ein hohes Armband kommt nie in eine breite Karte).
   - *Köpfe*: Hochformat (Seitenverhältnis < 0.9) bekommt `object-position 50% 8%`, sonst 50% 40%; `#fokus=X,Y` am Foto gilt vor allem.
   - *Weisse Freisteller* (Ecken und mindestens 92 % des Randes weiss): das Produkt wird in die Kartenmitte gerückt und höchstens um 1.22 vergrössert, so dass es mit 5 % Rand
     ganz bleibt; ragt es über die Karte, wird es bis 0.4 verkleinert statt angeschnitten. Der freigelegte Rand hat die Farbe der weissen Randpixel des Fotos (keine Naht); das Foto liegt dafür in voller Grösse in der Karte und wird nicht vorab per `object-fit` beschnitten.

## Schnittstelle

```js
import { bannerHtml, anzahlText } from './banner.mjs';
const html = bannerHtml('Tassen & Becher', ['https://…/a.jpg', 'https://…/b.jpg#fokus=50,20', 'https://…/c.jpg#frei', …], anzahlText(252));
// opts (optional): { band: 'tinte' | 'marine', streng: true }
```
- `bilder`: 6 bis 14 verschiedene Quellen, Dubletten (auch mit Anhang) und Leeres fallen weg, mehr als 14 werden gekappt. Unter 6: Fehler «erlaubt sind 6 bis 14».
  **6 oder 7 Fotos rendern, tragen aber `<meta name="banner-hinweis">`; mit `opts.streng` (oder `STRENG=1` im Render-Skript) sind weniger als 8 ein Fehler.**
- `anzahlText(252)` = `250+ Artikel`; zwei gültige Stellen, nie aufgerundet, Schweizer Apostroph: 1266 -> `1’200+`, 12881 -> `12’000+`. Unter 20 keine Zahl.
- Einbau in `automation/kategorie_bilder.mjs`: Chromium mit `args: ['--allow-file-access-from-files']` starten, wenn die Fotos lokale Dateien sind; nach `goto`/`setContent` auf
  `window.__fertig === true` warten (statt fester Pause), danach `screenshot`, dann zu JPEG wandeln. Bei `https://…`-Fotos liest die Seite die Pixel nur, wenn der Server CORS erlaubt;
  sonst bleibt alles ausser der Freisteller-Behandlung gleich (getestet, mit lokalem Server mit und ohne `Access-Control-Allow-Origin`).

## Wie viele Fotos sind optimal?

- **Ziel 12, brauchbar 8 bis 14.** Ab 8 sind die Mittelkarten höchstens 1.4:1 breit; 12 füllt Seitenspalten und Reihen gleichmässig (3 / 3 / 3 / 3).
  Bei 14 sind die Karten klein (340 x 315), das Quadrat zeigt dann nur vier gut sichtbare Karten.
- **6 und 7 gehen technisch, sind aber zu wenig**: die Mittelkarten werden 2.2:1 breit (680 x 315), runde Produkte (Armband) werden verkleinert oder angeschnitten,
  das Bild wirkt locker. Darum die Hinweis-Meldung und der `streng`-Schalter.
- Mehr als 14 Fotos nützen nichts: der Rest wird nicht gezeigt.

## Welche Fotos sind ungeeignet?

Aus den 14 Bestseller-Fotos je Beispielkategorie von Hand gesichtet (Augenurteil, nicht durch die Gemini-Prüfung gelaufen):

- **Fremdtext im Bild**: Masspfeile (Hunde 1, Küche 11), Werbetext (Küche 4 «A Grip You Can Trust»), Wasserzeichen (Kissen 4), Bildunterschrift (Tassen 14), lesbare Buchtitel (Tassen 11 «CAFE DE FLORE»),
  lesbare Etiketten (Kissen 3 «XIAEN»), Schriftzug auf Flaschen (Tassen 13 «Nappiness»), Abzeichen (Hunde 8 «LING CHONG»).
- **Marken und Embleme**: Louis-Vuitton-Monogramm (Hunde 5), Drei-Streifen-Muster wie Thom Browne (Hunde 2), US-Marine-Emblem (Tassen 1, Küche 1), Herstellerlogo «M» gross (Küche 7), Barock-Muster mit Versace-Anmutung (Kissen 10).
- **Collagen, Einblendungen, Balken**: zwei Fotos übereinander (Kissen 13), Zoom-Kreis im Bild (Tassen 7), weisse Balken oben und unten (Kissen 7).
- **Zu klein oder zu breit**: unter 800 px (Küche 13 nur 700 x 432); sehr breite weisse Freisteller wie das Sofa (Kissen 2) füllen eine fast quadratische Karte nicht (oben und unten leer, seitlich angeschnitten).
- **Foto passt nicht zum Titel** (gehört in die Titel-Wahrheit, nicht ins Layout): Hunde 11 heisst «Vintage Kapuzenpullover mit Cartoon-Print», zeigt aber eine Jogginghose; Tassen 7 heisst «3D Zebra», zeigt einen Dinosaurier;
  Küche 10 «Zündkerze für Gasherde» ist ein Ersatzteil, kein Kategoriebild.
- **Gute Fotos**: ein klar erkennbares Produkt (getragen, in der Hand, in Wohnumgebung oder frei auf Weiss), Mindestgrösse 800 px, kein Text, kein Logo. Hochformat ist erlaubt (Köpfe bleiben im Bild).
  Weisse Freisteller helfen dem Rhythmus (weisser Rahmen trennt sie vom Grund), aber höchstens zwei bis drei nebeneinander: sonst steht eine weisse Spalte im Bild (Damen-Mode, rechts).

**Die Fotopools der Stichprobe reichen nicht für 8 saubere Fotos je Kategorie**: sauber blieben Schmuck 12, Damen-Mode 13, Hunde 8, Tassen & Becher 7, Küche & Kochen 6, Kissen 6.
Die Beispiele wurden mit je 1 bis 2 Fotos mit kleinem Makel auf 8 aufgefüllt (Vermerke in `beispiele.mjs`, im Render-Protokoll als «Makel» ausgegeben):
Tassen 9 (Verpackung «Never Wither»), Kissen 11 («sweet baby» gestickt, unleserliche Zeitung) und 12 (Zeitschrift «UNION»), Küche 2 (kleines «M» am Wasserkocher) und 13 (700 x 432 px).
**Für die Serie nicht übernehmen**: erst die Gemini-Prüfung über mehr als 14 Bestseller je Kategorie (30 statt 14) laufen lassen, oder je Produkt mehrere Galeriefotos zulassen.

## Was gemessen wurde (alles an den gerenderten Dateien, nicht aus Rückmeldungen)

- `banner_test.mjs`: **23 von 23 Tests grün.** Prüft Rundung der Zahlen, Anhänge, Dubletten, Fotozahl-Regeln, Layout für n = 6..14 (im Rahmen, Winkel <= 1.6 Grad),
  Seitenspalte bis 340, höchstens ein Kartenstreifen je Zuschnitt, Staffelung, alle Pixelwerte der Verbesserungen (860 / 840 / 44 / 30 / 20 / 84 x 24 / .62 / 1.5 / .24),
  Nadeln an jeder zweiten und Washi an jeder sechsten Karte, Kontrast (Gold >= 7:1), keine Preise im Text, Maskierung (`</script>` im Titel), Determinismus; im Browser: alle 11 Fälle laden ohne
  fehlendes Foto und ohne Skriptfehler, Titel in x 570..1430, Fusszeile in 580..1420, Randabstand im Quadrat >= 69 px, Zeilenumbruch von «Küchenmaschinen & Elektrogeräte»
  (`Küchenmaschinen` / `& Elektrogeräte`), Köpfe, `#fokus`, Freisteller-Faktor 0.4..1.22, Zuordnung nach Produktform, **Pixelprobe am Kartenrand** (behandelte Freisteller sind nie angeschnitten; Karten einzeln, ohne Schräglage, ohne Nachbarn gemessen), CORS-Rückfall, kaputtes Foto, Kontrast aus Pixeln (Median >= 12:1 gegen Creme).
- **Mutationsprobe** an 18 gezielten Änderungen (Titelbreite 900, alter Winkel, Nadel an jeder Karte, gleich hohe untere Reihe, Freisteller bis 1.5, alte Zahlenrundung, Kopfregel weg, Fusszeile 25 px, Fusszeile nie kürzen,
  Zuordnung nach Reihenfolge, Skalierung bis 3, Freisteller ohne Rand, kein Verkleinern, Foto beschnitten statt voll gelegt, Band marine, Streifen-Strafe aus, «&»-Regel aus, Fehler bei zu wenig Fotos aus): **16 erkannt, 2 offen und gleichwertig**
  (Fehler bei <6 Fotos wird zusätzlich von `plaetze()` geworfen; der «&»-Schutz greift nur bei Titeln wie «Tee &», dort gewinnt ohnehin die einzeilige Fassung).
  Eine erste Fassung des Zuordnungstests war zu streng (verlangte weniger Anschnitt als die feste Reihenfolge; die Hungarian-Kosten wägen auch die Wichtigkeit ab) und wurde durch zwei gerichtete Prüfungen ersetzt. Zwei Lücken fand die Mutationsprobe selbst: die Zuordnung war ungeprüft, und «Foto beschnitten statt voll gelegt» blieb offen, solange der Test den Rand nur aus dem Modell rechnete; die Pixelprobe schloss das und fand sofort einen echten Fehler (der Kartengrund eines Freistellers wurde aus allen Randpixeln gemittelt, auch aus Produktpixeln, und stand als creme Streifen neben dem weissen Foto), jetzt behoben.
- Titel-Kontrast: Creme auf Tinte rund 14:1 (gerechnet) und >= 12:1 im Median der gerenderten Pixel; Gold auf Tinte >= 7:1.
- **Vergleich Band**: Tinte gegen Marine an Tassen & Becher und Kissen nebeneinander gesehen. Marine hebt sich von warmen Fotos etwas stärker ab, wirkt aber als kühler Fremdkörper neben Leinen, Kraftpapier und
  Bernstein; Tinte hält die Markenpalette und gibt den höheren Kontrast (rund 13.7:1 gegen rund 11:1 für Creme). **Gewählt: Tinte** (Marine bleibt als `opts.band: 'marine'` zum Vergleich).

## Abweichungen vom Urteil (bewusst, mit Grund)

1. **Fusszeile**: nicht fest dreiteilig. «Schweizer Shop» entfällt automatisch, sobald die Zeile bei 30 px nicht in 840 px passt (mit Zahl immer); sonst hätte die Schrift unter 30 px schrumpfen müssen. Die Aussage «Schweizer Shop» steht damit nur noch ohne Artikelzahl im Bild.
2. **Freisteller**: Faktor 1.22 ist die Obergrenze, nicht ein fester Wert. Das Produkt wird in die Mitte gerückt und nur so weit vergrössert, wie es mit Rand ganz bleibt; passt es nicht, wird es bis 0.4 verkleinert.
   Ohne die Formzuordnung war in einer frühen Fassung das Kupfer-Armband oben und unten angeschnitten; ein fester Faktor 1.22 allein löst das nicht.
3. **Staffelung**: Obergrenzen der Urteilspunkte (Oberkante `20 + rng*30`, Unterkante 960..990) mit dem Gewicht 0.88 für niedrige Karten verbunden. In der unteren Reihe lässt der Bereich 960..990 nur rund 24 px Unterschied zu, nicht 12 % der Höhe (38 px).
4. **Mindestens 8 Fotos** ist eine Warnung mit `streng`-Schalter, kein harter Fehler: 6 und 7 Fotos müssen für die Randfall-Prüfung noch rendern.
5. **Aufteilung**: nicht «Seitenspalte genau 333», sondern bis 320 (die Karten werden um rund 20 px vergrössert und würden sonst als Streifen in den 4:3-Zuschnitt ragen).
6. **Nicht umgesetzt**: die Hochformat-Fassung 1000 x 1500 (2:3) für Pinterest selbst (im Urteil nur «einplanen»; die Pinterest-Empfehlung 2:3 wurde nicht live geprüft). Ebenso nicht übernommen: die Bernsteinlinie von Mosaik
   (das Band ist bei zweizeiligen Titeln zu niedrig dafür; die Raute zwischen Marke und Zahl trägt die Gliederung).

## Grenzen und ehrliche Selbstkritik

- **Augenurteil, kein Kundentest.** Die Wirkung auf Pinterest (Klickrate, Erkennbarkeit im Feed bei 300 px Breite) ist nicht gemessen; bei 300 px ist die Fusszeile mit 4.5 bis 5 px weiter nur Dekoration, lesbar bleibt allein der Titel.
- **Weisse Freisteller nebeneinander**: die Zuordnung kennt keinen Helligkeitsausgleich. In Damen-Mode liegen drei weisse Schuhfotos in der rechten Spalte, das wirkt einseitig. Ein Ausgleich bräuchte eine globale Optimierung über Nachbarn (nicht gebaut).
- **Gleiche Grundform bei 8 Fotos**: Hunde, Kissen, Küche und Tassen haben denselben Aufbau (1 / 1 Seitenkarte auf Kraftpapier, 3 / 3 in der Mitte). Die Kraftpapier-Bögen lassen oben und unten grosse leere Flächen; sie sind nur im vollen 2:1-Bild sichtbar, in 4:3 und Quadrat nie.
- **Bildausschnitt bleibt Heuristik**: bei Nicht-Freistellern wird mittig geschnitten (oben bei Hochformat). Die Kirsch-Brosche (Schmuck 2) wäre angeschnitten worden und brauchte `#fokus=50,100` von Hand; ohne Bildanalyse gibt es das nicht automatisch.
- **Die Freisteller-Erkennung braucht lesbare Pixel**: lokale Dateien mit dem Chromium-Schalter, Netzfotos nur mit CORS. Ob `cdn.shopify.com` CORS für Bilder sendet, ist hier nicht geprüft; ohne CORS bleibt die Behandlung aus (kein Fehler, aber die weissen Karten wirken leerer).
- **Die Beispielauswahl ist von mir getroffen** und nicht von der Gemini-Prüfung bestätigt; drei Kategorien tragen Fotos mit kleinem Makel (siehe oben). Artikelzahlen stammen aus dem Manifest und sind nicht live gegengeprüft.
- **Schriften**: Liberation Serif / Inter müssen im Render-Chromium vorhanden sein, sonst ändern sich Zeilenumbruch und Titelgrösse (die Seite misst, passt sich also an, sieht aber anders aus).
- Die Tests prüfen Geometrie, Masse und Verhalten, aber nicht Schönheit; die zwei Runden Sichtprüfung (Gesamtbild, 4:3, Quadrat, Detailausschnitt) sind nicht automatisiert.
