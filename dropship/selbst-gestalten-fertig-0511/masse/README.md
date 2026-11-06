# «Selbst gestalten»: Schweizer Masse (LIVE 05.11.2026)

**Auftrag (Besitzer 05.11.):** «auf schweizer masse und bearbeitungstool bei jedem selbstgestalten produkt». Dieser Teil: Masse.

**Regel:** kein Zoll, oz, lb, US gal in Texten und Optionswerten der 38 Produkte mit Handle «…gestalten» (Tag `wunschdesign`). Metrisch steht schon da, Imperial in Klammern daneben → Klammer weg; Imperial vorn und Metrisch in Klammern → nur das Metrische; Tassen 11/15/20 oz → 325/444/591 ml (1 US fl oz = 29,5735 ml, wie im Katalogfenster); Laptop-Grössen bleiben «13 Zoll»/«15-Zoll-Laptop» (Bildschirmdiagonale, auch in der Schweiz so benannt, kein Mass der Ware).

**Geändert (GEMESSEN, alle 16 Produkte frisch zurückgelesen GLEICH):** Beschreibung (nur Textknoten, Tags und data-Attribute Byte für Byte gleich), Optionswerte der beiden Tassen («11 oz» → «325 ml» usw.), des Kiss-Cut-Aufklebers («7,6 × 7,6 cm (3″)» → «7,6 × 7,6 cm») und der Laptop-Hülle (Entwurf). SKUs, Preise, Bilder, Titel, Tags unverändert (Tasse live: `9000001_1320` CHF 19.90, `9000001_4830` CHF 22.90).

**Werkzeug:** `masse_bereinigen.mjs` (rein, 52 Prüfungen in `masse_bereinigen_test.mjs`), `apply.mjs` (Trockenlauf Vorgabe, `LIVE=1`, `NUR=<handles>`, `DIFF=1`; Sicherung `sicherung.json` mit altem und neuem Text; Rücknahme `ZURUECK=1 LIVE=1 node dropship/selbst-gestalten-fertig-0511/masse/apply.mjs`, nur wo der Text noch dem geschriebenen Stand entspricht). Ein zweiter Trockenlauf meldet «zu ändern: 0».

**Nicht angefasst:** englische/französische Übersetzungen der Optionswerte (die Tasse trägt in `/en` und `/fr` evtl. noch den alten Schlüssel, Werte sind sprachneutral), das Katalogfenster (hat seine eigene Regel, PR #2893), Zahlen in Bildern.
