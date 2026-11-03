# Blumen-Set: Motivtext an die drei Typbilder angepasst (03.11.2026)

Marken: **GEMESSEN** = hier abgefragt · **Hypothese** = nicht belegt · **unbekannt** = nicht gemessen.

## Anlass
Codex R65 (`BESCHREIBUNGEN-UND-NACHFRAGE-20261103-R65.md`, Branch `codex/luxestyle-claude-handoff-20261018`) meldete: Der Motivabsatz des Produkts [Dekorative Leinwandbilder Set – 3-teilige Wandkunst](https://luxestyle.ch/products/dekorative-leinwandbilder-set-3-teilige-wandku-604600) (`gid://shopify/Product/15525460672897`) nennt «Rosa und Gelb mit grünen Blättern», das Set hat aber sechs Varianten in drei Typen mit verschiedenen Bildern. Codex wendet nichts an («Freigabeentwurf, nicht angewendet»).

## Nachgeprüft und angewendet (03.11.2026, ca. 12:20 UTC)
- **GEMESSEN am Live-Stand:** Vorher-Werte stimmten mit Codex überein, auch die Prüfsummen (Body `17860a82…`, SEO-Beschreibung `f539b6fa…`). Sechs Varianten, drei Bilder, je Typ ein Bild, SKU `CJJT261357801AZ` bis `…806FU`, Preise CHF 33.90 / 35.90.
- **Selbst angesehen** (die drei variantengebundenen Bilder): Typ A = Rosa, Gelb/Ocker und Grün-Töne (stilisierte Blumen), Typ B = blaue Linienzeichnungen von Blumen und Blättern, Typ C = schwarze stilisierte Blumen und Blätter; alle auf hellem Grund. Der alte Satz stimmte nur für Typ A.
- **Geändert** (`productUpdate`, nur diese zwei Felder, SEO-Titel ausdrücklich unverändert mitgegeben):

| Feld | Vorher | Nachher |
|---|---|---|
| Body, ein Absatz | `<p><strong>Motiv:</strong> Stilisierte Blumen in Rosa und Gelb mit grünen Blättern auf hellem Hintergrund.</p>` | `<p><strong>Motiv:</strong> Blumen und Blätter auf hellem Hintergrund; die Farbgestaltung unterscheidet sich je nach Typ: Typ A in Rosa, Gelb und Grün, Typ B in Blau, Typ C in Schwarz.</p>` |
| SEO-Beschreibung, erster Satz | `Motiv: Blumen in Rosa, Gelb und Grün.` | `Motiv: Blumen und Blätter je nach Typ.` |

  Der SEO-Satz ist der von Codex vorgeschlagene (Prüfsumme der neuen SEO-Beschreibung `19e4aeb4…` gleich dem Codex-Entwurf); den Body-Satz habe ich um die Farbe je Typ ergänzt, weil sie an den Bildern belegt ist und bei der Auswahl hilft.
- **Frisch nachgelesen:** Body nur an dieser einen Stelle geändert (Rückersetzung ergibt den alten Body byte-gleich), SEO-Titel, Tags (16), Status (ACTIVE) und alle sechs Varianten samt Bild und Preis unverändert. Öffentliche `.js`-Seite zeigt den neuen Absatz.
- **Rücknahme:** `productUpdate` mit dem Vorher-Absatz bzw. Vorher-Satz aus der Tabelle (Body: neuen Absatz im Body wieder durch den alten ersetzen; SEO: ersten Satz der Beschreibung zurücksetzen). Sicherung des vollständigen Vorher-Stands: Scratch `/tmp/cm/blumen_backup_vor.json` (geht mit der Sitzung verloren; die Tabelle oben reicht für die zwei Felder).

## Zweite Korrektur am selben Produkt (03.11.2026, ca. 12:30 UTC): Material und Grössen nach dem CJ-Datenblatt
- **QUELLE** (CJ `product/query`, pid `2511220828321604600`, GEMESSEN am 03.11.): «Core Material: Canvas», «Frame Material: PS frame», «Size: 30*40cm PS frame + canvas, 40*60cm PS frame + canvas», «Mounting: Framed», «Packing list: Decorative Painting x3pcs», Gewicht 300–520 g. Das allgemeine Materialfeld nennt «Wood»; die genaue Beschreibung gilt vor dem Sammelfeld.
- **Geändert** (nur `descriptionHtml`, vier Stellen, SEO unverändert): «Material: Holz» → «Material: Leinwand mit PS‑Rahmen (Kunststoff)»; «Jedes Bild ist auf einer 30 × 40 cm grossen Leinwand aufgespannt und in einem stabilen PS‑Rahmen eingefasst» → «Jedes Bild ist eine Leinwand in einem PS‑Rahmen; die Grösse (30 × 40 cm oder 40 × 60 cm) wählst du bei der Auswahl» (das Set wird in beiden Grössen verkauft, der Text nannte nur die kleine; «stabil» ist nicht belegt); Aufzählung «30 × 40 cm Grösse» → «Grösse zur Wahl: 30 × 40 cm oder 40 × 60 cm»; «Masse: 30 × 40cm PS frame + canvas, 40 × 60cm PS frame + canvas» → «Masse: 30 × 40 cm oder 40 × 60 cm (Leinwand im PS‑Rahmen)». Frisch nachgelesen: SEO, Tags, Status, sechs Varianten unverändert; öffentliche Seite zeigt den neuen Text, «Material: Holz» kommt nicht mehr vor. Sicherung des Vorher-Stands: Scratch `/tmp/cm/blumen_backup_vor2.json`.
- Das Einzelbild «Dekoratives Leinwandbild ohne Rahmen» (CJ-pid `2504250729121615200`): Text stimmt mit dem Datenblatt überein («HD canvas», 80×160 cm, ohne Rahmen). Die Gewichtszeile «ca. 220 g – 3 kg (je nach Variante)» gilt für CJs 51 Varianten, der Shop führt eine (80×160 cm, CJ-Variante 3100 g): **nicht geändert, offen**. Welche der 51 CJ-Varianten bestellt wird, entscheidet die Bestell-Engine per Bildvergleich (`cj_variante_bild`, Zuordnung `_cj_varianten_zuordnung.tsv`), sonst hält sie die Bestellung an.

## Bewusst NICHT angefasst (offen)
- ~~Material und Rahmen widersprechen sich~~ erledigt, siehe zweite Korrektur oben (die Bilder zeigen holzfarbene Rahmen; das Datenblatt sagt PS).
- «Masse» steht teils englisch («30 × 40cm PS frame + canvas»); Lieferumfang, Gewicht und Nutzungsrechte der Bilder sind durch Bilder nicht belegt (Codex, bestätigt).
- Tag `auswahl-offen` bleibt (Codex: nicht ändern). Die alte Variante `56225328824705` (R42-Angebotskennung) gibt es im Shop nicht mehr; nie einer neuen Standardvariante zuweisen. Zwei Exportkennungen (`6917317292929955722`, `1083834440623406112`) haben keine belegte Zuordnung; Codex führt sie in einer Quellenprüfliste, nötig ist der Merchant-Center-Editor des Betreibers.
- Die übrigen zwölf Kunstdruck-Produkte der Liste wurden **nicht** auf denselben Fehler geprüft (Motivsatz gegen mehrere Typ-Bilder); Codex hat nur zwei bekannte Produkte gegengelesen. Naheliegende nächste Prüfung: je Produkt Optionswerte, Variantenbilder und Motivsatz vergleichen.
- Nachfrage (240 Shirts-&-Tops-Vorschläge, Schweiz, September 2026): nur Orientierung, keine Umsetzung.
