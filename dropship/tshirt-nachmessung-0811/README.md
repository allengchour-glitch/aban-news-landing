# T-Shirt-Vorschau nachgemessen (So 08.11.2026, 21:00 Schweizer Zeit)

Auftrag des Besitzers vom 06.11.2026 (Antwort 3 zu Entscheid 11 in `pod/v6/README.md`): «messes nach aber erst am sonntag 21 uhr». Erlaubt waren höchstens 6 neue Mockup-Aufgaben für die Modelle 71, 586 und 456. **Nichts live geändert**, kein Shop-, Theme- oder Editor-Write. Marken: **GEMESSEN** = hier gemessen, **Hypothese** = Schluss aus den Messungen, **UNGEMESSEN** = nicht gemessen.

## Ergebnis in vier Sätzen
1. **Der Versatz gilt nicht für alle T-Shirts.** Modell 71 (Bella + Canvas 3001): Printfuls Design liegt 6 bis 8 mm höher als in der Vorschau (7,0 und 5,5 px, wie am 06.11.). Modell 456 (Stanley/Stella STTU169): Vorschau und Printful stimmen auf höchstens 0,25 px (0,3 mm) überein. Modell 586 (Comfort Colors 1717): Printfuls Design liegt 2 bis 5 mm tiefer (2,1 und 4,25 px) und ist rund 1,4 % grösser.
2. **Die Abweichung hängt am Modell, nicht an einer festen Verschiebung:** `GET /mockup-generator/templates` und der Mockup-Generator von Printful rechnen bei 71 und 586 mit leicht anderen Druckflächen, bei 456 mit denselben. Eine Einheitskorrektur für «T-Shirt» gibt es nicht.
3. **Welche der beiden Zahlen die echte Druckposition am Stoff ist, bleibt UNBEKANNT.** Die Messung vergleicht zwei Werte von Printful, kein gedrucktes Shirt.
4. **Vorschlag:** Entscheid 11 mit (a) lassen wie gebaut (Hinweis «die genaue Lage kann leicht abweichen») und gleichzeitig (c) Printful fragen (Entwurf unten, nichts gesendet); (b) liegt als geprüfte Zahlenliste bereit (nur Daten, kein Code), falls Printful bestätigt, dass der Generator die Referenz ist.

## Messaufbau
* Gleiche Zeichnung und Lage wie am 06.11.: Foto 910 × 903 px (Plüschtier) als Ebene, Druckdatei 1800 × 2400 px, Breite 1000, Höhe 992, links 400, oben **300** («oben») und oben **1200** («unten»). Je Modell Vorderseite, Weiss, Grösse M (Varianten 4012, 15125, 11865). Printful-Mockup 800 × 800, Editor-Vorschau 800 × 800.
* **6 von 6 erlaubten Aufgaben verbraucht** (71 oben und unten, 586 oben und unten, 456 oben und unten), nacheinander, Ratenzähler 10 je 60 s eingehalten (`ratelimit_nach_post` in `messung.json`), keine Wiederholung, alle `completed` (rund 8,2 s je Aufgabe). Nur POST create-task, GET task und Download der Ergebnisbilder.
* **Wiederholbarkeit GEMESSEN:** das Mockup `s71t.jpg` ist **byte-gleich** dem Bild vom 06.11. (`shirt.jpg`, MD5 `9415433c241b3bdc1ac6eeece99b2a7f`): Printfuls Generator liefert für dieselbe Anfrage heute dasselbe Bild.
* Messung: Suche der besten Ausrichtung des Motivfensters (orange Plüschtier-Pixel beider Bilder, 8 px Rand), Verschiebung in Schritten von 0,125 px und Massstab in Schritten von 0,0025 um die Fenstermitte, Mass = mittlere absolute Abweichung (3 Kanäle). Werkzeuge in `werkzeug/` (Pfade zeigen auf den Scratch der Sitzung, die Mockups liegen in `mockups/`).
* Editor: `lspod-designer-v6-6.2.0.js` für alle sechs Fälle; mit `lspod-designer-v6-6.3.1.js` (aktueller Stand auf `main`) für 71 oben, 586 oben und 456 oben wiederholt: **alle Zahlen gleich**, die Vorschau-Geometrie hat sich mit dem Review-Gate und der mobilen Druckprüfung nicht verändert.

## Rohzahlen (Editor minus Printful; dy negativ = Printful liegt höher)
Alle Werte in Pixeln des 800 × 800-Bilds; 1 Pixel = 3,75 Vorlagenpixel; die Druckfläche ist 12 × 16 Zoll, bei 71 sind das 1010 × 1346 Vorlagenpixel (also 1 mm rund 3,3 Vorlagenpixel).

| Fall | Fenstermitte y | Verschiebung dx | Verschiebung dy | Massstab s | Abweichung im Motivfenster ohne → mit Verschiebung |
|---|---|---|---|---|---|
| 71 oben | 260 | +1,75 | **−7,00** | 1,0075 | 26,4 → 5,9 |
| 71 unten | 395 | +1,75 | **−5,50** | 1,0075 | 23,8 → 5,8 |
| 586 oben | 258 | +0,875 | +2,125 | 1,0125 | 14,3 → 6,8 |
| 586 unten | 402,5 | +0,875 | +4,25 | 1,0150 | 20,3 → 7,4 |
| 456 oben | 247,5 | −0,125 | 0,00 | 1,000 | 3,4 → 3,3 |
| 456 unten | 400 | −0,125 | +0,25 | 0,9975 | 4,3 → 3,8 |

Ganzes Bild (mittlere Abweichung 0 bis 255): 71 1,36 / 1,27, 586 0,91 / 1,15, 456 0,63 / 0,67; Umriss des Kleidungsstücks bei 71 und 456 höchstens 1 px. **Auffällig bei 586:** der Umriss weicht links um 30 px ab (die Vorschau-Vorlage zeigt das Shirt dort anders als Printfuls Mockup); die Lage des Motivs ist davon nicht betroffen, die Ursache ist nicht untersucht (UNGEMESSEN).

## Abgeleitete wirksame Druckfläche (Hypothese: lineare Abbildung Editor → Printful)
Aus den zwei Lagen je Modell (Steigung = senkrechter Massstab, Achsenabschnitt = Verschiebung). In Vorlagenpixeln (Vorlage = 3000 × 3000); die waagrechten Werte stützen sich auf **eine** Lage (Design mittig) und sind darum weniger sicher.

| Modell | Vorlage laut `GET /templates` (links, oben, Breite × Höhe) | wirksam beim Generator (gerechnet) | oben | Höhe | Breite |
|---|---|---|---|---|---|
| 71 | 1006, 530, 1010 × 1346 | 1007,8, 498,8, 1017,6 × 1361 | **−31 (rund 9 mm höher)** | +15 (+1,1 %, 4,5 mm) | +7,6 (+0,75 %, 2,3 mm) |
| 586 | 958, 473, 1074 × 1432 | 953,3, 473,7, 1088,8 × 1453,1 | +0,7 (0,2 mm) | +21 (+1,5 %, 6 mm) | +14,8 (+1,4 %, 4,2 mm) |
| 456 | 930, 409, 1140 × 1520 | 930,5, 408,1, 1138,6 × 1522,5 | −0,9 (0,2 mm) | +2,5 (+0,2 %, 0,7 mm) | −1,4 (−0,1 %) |

* Die Zahlen für 71 stimmen mit der Rechnung des Gegenlesers vom 06.11. überein (oben 500,6, Höhe 1355,6, Breite 1015): hier 498,8, 1361 und 1017,6.
* **Probe (nur Anpassung, keine unabhängige Bestätigung):** setzt man diese Werte in die Vorschau-Daten ein (`KORR=…` im Vergleichsskript), liegt die Restverschiebung bei allen sechs Fällen bei 0 bis 0,25 px, das ganze Bild bei 0,53 bis 0,67 (vorher 0,63 bis 1,36). Eine unabhängige Bestätigung bräuchte eine **neue** Lage des Designs; alle sechs Aufgaben sind verbraucht. Grober Gegencheck mit den Rechteck-Messungen vom 06.11. (Lage ungefähr aus dem README): die Gerade für 71 sagt oben rund −8 px und unten rund −5 px voraus, gemessen wurden −7,0 und −5,0 bis −5,3.

## Was das für Entscheid 11 heisst
* **Die Korrektur wäre reine Vorschau-Kosmetik:** die Druckdatei wird auf die Druckfläche normiert (Karte, `printfile` 1800 × 2400); die flaeche*-Zahlen der Vorlage steuern nur die Ansicht «Auf dem Produkt». Eine Korrektur ändert also **nicht**, was gedruckt wird.
* **Risiko einer Korrektur (Hypothese):** sie macht die Vorschau gleich Printfuls Mockup. Ist aber die Vorlage die echte Druckposition, wäre die korrigierte Vorschau gegen den Stoff leicht falsch. Darum zuerst fragen (c).
* **Grösse im Alltag (am Motiv gemessen, 1 px des 800-px-Bilds = rund 1,1 mm):** 71: Design 6 bis 8 mm höher, 586: Design 2 bis 5 mm tiefer und an den Rändern des Druckbereichs bis 6 mm grösser, 456: unter 1 mm. Der Hinweis unter der Vorschau nennt die Lage schon.
* **Vorschlag:** (a) bleibt, (c) Printful fragen. Antwort «Generator ist die Referenz» → (b) für 71 und 586 als Datenänderung (zwei Zeilen in den Vorschau-Daten `fl/fo/fb/fh` und der Karte `flaecheLinks/Oben/Breite/Hoehe`), Tests und Mutationsprobe wie bei den bisherigen Vorschau-Daten, dann Nachmessen am Stand `main`. Antwort «Vorlage ist die Referenz» → nichts ändern, nur diesen Befund dokumentieren.
* **456 braucht nichts.** 586 und 71 sind nicht verwechselbar: die Korrekturwerte gehören je Modell und nicht zum Produkt «T-Shirt».

## Grenzen
* UNGEMESSEN: andere Farben und Grössen (Heather-Texturen, Schwarz: die 6,8 Stufen Helligkeitsabweichung vom 06.11. sind hier nicht neu gemessen), Rückseite, Ärmel, andere Modelle (Hoodie 145 und 821 usw.), echtes Handy.
* Je Modell nur zwei Lagen in **einer** Spalte: waagrechter Massstab und waagrechte Verschiebung sind nicht getrennt messbar.
* Der Vergleich nutzt ein Foto mit weichen Kanten; die Ausrichtung ist auf rund 0,125 px (Verschiebung) und 0,0025 (Massstab) genau, die Ursache des Restfehlers von 3 bis 5 Stufen im Motivfenster (Resampling, Kompression des JPEG) wurde nicht untersucht.
* Die Messung ist eine Messung von Printfuls Vorschau-Rechnung, nicht der Produktion. Wie genau Printful in der Produktion platziert (Toleranz), ist nicht belegt.

## Wiederholen
`cd dropship/tshirt-nachmessung-0811/werkzeug`: `mockups_holen2.mjs` (braucht `PRINTFUL_API_KEY` und `PRINTFUL_STORE_ID` aus der Umgebung, kostet pro Aufruf Mockup-Aufgaben aus dem gemeinsamen Limit 10 je 60 s), dann `vergleich2.mjs` (Editor-Vorschau, `V6_DATEI=` wählt die Fassung, `ERG=` den Ausgabeordner, `KORR=` probiert eine Korrektur), `fein.mjs` und `korrektur_rechnen.mjs`. Die Skripte tragen feste Scratch-Pfade (`…/scratchpad/sg/v62/pixel/`); die sechs Mockups liegen in `mockups/` und lassen sich ohne neue Aufgaben auswerten.

## Entwurf: Frage an Printful (NICHT gesendet, braucht das Ja des Besitzers)
> Betreff: Mockup Generator vs. Template-Geometrie (Print area) bei Product 71, 586, 456
> Bei `GET /mockup-generator/templates/{product_id}` (placement front, printfile 1800 × 2400) liefert Product 71 die Druckfläche links 1006 / oben 530 / 1010 × 1346 (Vorlage 3000 × 3000), Product 586 links 958 / oben 473 / 1074 × 1432, Product 456 links 930 / oben 409 / 1140 × 1520. Der Mockup-Generator (`POST /mockup-generator/create-task`, `position` area 1800 × 2400, width 1000, height 992, left 400, top 300 bzw. 1200) zeigt das Design bei Product 71 rund 31 Vorlagenpixel höher und 0,75 % grösser, bei Product 586 rund 1,4 % grösser, bei Product 456 genau an der Vorlagenposition. Welche Geometrie entspricht der tatsächlichen Druckposition im Druck, und ist die Template-Geometrie für 71 und 586 veraltet? Die Task-Schlüssel stehen im Protokoll (`gt-1000605917`, `gt-1000606209`, `gt-1000606610`, `gt-1000606941`, `gt-1000607261`, `gt-1000610442`).
