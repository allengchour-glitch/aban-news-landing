# «weiter sauber machen» — Material, Diamanten, Bild-Alt-Texte (08.10.2026, 20:40–21:40 UTC)

Drei Klassen derselben Sorte: **ein Wort im Titel oder Bild verspricht etwas, das die eigene Materialangabe widerlegt.**
Jede Klasse hat jetzt Regel + täglichen Wächter (Aufseher-Block «VERSPRECHEN», gleicher Bulk-Export) + Importer-Haken.

## 1. Material-Widerspruch (Leder ↔ PU) — 41 Produkte, 0 Fehler

GEMESSEN am Export (51'720 aktive): Titel «Leder…», Materialangabe im eigenen Text «PU-Leder», «Polyurethan»,
«Lederimitat». Ebenso Wolle → «100 % Acryl», Seide → «Polyester», Holz → «ABS und PU-Leder».

- `automation/material_widerspruch.py` (neu, täglich nach dem Versprechen-Wächter): Leder automatisch («Ledergürtel» →
  «Gürtel aus Kunstleder», Komposita mit Vorsilben), Wolle/Seide/Holz/Silber nur gemeldet, ausser handgeprüft in
  `automation/data/material_widerspruch.json` (43 Handles, 22 Kanarien).
- Bericht: `dropship/MATERIAL-WIDERSPRUCH.md`, Ledger `dropship/_material_widerspruch.tsv` (id, alt, neu, Datum).

## 2. «Diamanten» bei Modeschmuck — 212 Produkte, 0 Fehler

GEMESSEN: 622 aktive Produkte nennen «Diamant», das teuerste kostet CHF 150.90 (ein Moissanit-Ring) — echte Diamanten
führt der Shop nicht. Treffer: Schmuck 206, Basteln & DIY 145 (Diamond Painting), Uhren 58, Nageldesign 47 …

**Regel** (`automation/data/versprechen_regel.json`, Abschnitt `diamant`, 55 Kanarien, py=js 616/616):
- Ersetzt nur die Verzierung: «mit funkelnden Diamanten» → «mit funkelnden Strasssteinen», «Diamant-Zifferblatt» →
  «Strass-Zifferblatt», «diamantbesetzt» → «strassbesetzt», «Diamantring» → «Strassring», «Diamantverzierung» →
  «Strassverzierung». Nennt der Text Zirkonia, heisst es «Zirkonia-Steine». «High-Carbon-Diamanten» (Lieferantenwort
  für Simulanten) → «Schmucksteine».
- Deutsch richtig: Dativ («aus Nieten, Strasssteinen und Prägungen»), Einzahl («mit einem grünen Strassstein»).
- **Bleibt unberührt:** Vergleiche («brillanter als Diamant», «Glanz eines Diamanten»), Formen («Diamant-Design»,
  «Diamantmuster», «Diamantschliff»), Verneinungen («keine Diamanten»), Techniknamen («Diamant-Inlay-Verfahren»),
  Diamond Painting / Harzdiamanten / Drill, Bausteine, Schleif- und Schneidwerkzeug, Diamant-Tester, Nagellack-Effekte,
  Mikrodermabrasion — und **alle Produkte mit Karat-, VVS- oder Labor-Angabe** (Echtheitsangabe → Einzelprüfung, Liste im
  Bericht `dropship/VERSPRECHEN-WACHE.md`; dort u. a. «Die Diamanten sind in D-E/VVS-Qualität gefasst» bei einem Ring).
- Geändert: 112 Titel, 180 Texte, 108 SEO-Felder; live geprüft (Lederrucksack-Seite: H1 und Text «Strasssteinen»).
- Wächter `automation/versprechen_wache.py` (täglich, alle Textfelder), Importer `versprechenDiamant` in
  `cj_copy_prompt.mjs` (`textPolieren`), Gleichlauf-Test `versprechen_gleichlauf_test.mjs`.

## 3. Bild-Alt-Texte mit altem Titel — 11'730 an 1'604 Produkten

**Gefunden beim Live-Check des Diamant-Laufs:** H1 «… mit Strasssteinen», die Bilder darunter «… mit Diamanten – Bild 2 |
LuxeStyle». Ein fünftes Textfeld, das kein Wächter las.

GEMESSEN (361'446 Alts im eigenen Schema): 1'077 Produkte mit anderem Titel (Auswahl-Nachrüstung, Material, Press-on,
englische Rohtitel), 447 mit gekürztem (Mass-Zusatz kam später), 80 mit einem Zusatz, den der Titel absichtlich verlor —
**«& Blutdruckmessung», «zur Blutzuckermessung», «mit EKG- und Blutzucker-Messung», «& Halswirbelsäulen-schonend»,
«– Sofort Lieferbar»**: Messversprechen, die die Titel-Wächter entfernt hatten, standen in der Google-Bildersuche weiter.

- Versprechen-Wächter liest jetzt auch die Alts (gleiche Regel wie der Titel): **817 Alt-Texte, 0 Fehler**.
- `alt_nach_titel.py` liest zusätzlich den Material-Ledger: **617 Alt-Texte, 0 Fehler**.
- **`automation/alt_titel_abgleich.py` (neu, täglich):** fragt nicht, wer den Titel änderte — Alt im Schema
  «<Titel> – Bild N | LuxeStyle» bekommt den aktuellen Titel, Bildnummer bleibt; handgeschriebene Alts und POD/Editor-Ware
  bleiben; live entschieden, Rücklesen, Ledger `dropship/_alt_titel_abgleich.tsv`. Ergebnis: siehe
  `dropship/ALT-TITEL-ABGLEICH.md`.

## Lehren

1. **Nach jeder Titel-Korrektur gehören die Bilder dazu.** Titel, Text, zwei SEO-Felder, URL-Handle und Bild-Alts sind
   sechs Stellen für denselben Namen; jeder Wächter, der nur einen Teil liest, lässt die Behauptung woanders stehen.
2. **Ein Abgleich gegen den Ist-Zustand schlägt jede Ledger-Kette:** `alt_nach_titel.py` kannte zwei Ledger, aber
   mindestens sechs Werkzeuge ändern Titel. Der neue Abgleich vergleicht nur «Alt-Titel = Titel?».
3. **Ein Wort ersetzen braucht Grammatik und Ausnahmen:** «Diamanten» ist Plural und Einzahl (schwaches Nomen), Nominativ
   und Dativ — und in «Diamant-Design», «Diamond Painting», «Diamant-Tester» kein Versprechen. Erst 600 Treffer
   auseinanderlegen, dann die Regel.
