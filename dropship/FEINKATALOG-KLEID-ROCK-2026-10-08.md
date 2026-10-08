# Feinkatalog: Titelprobe-Rest, Kleid/Rock-Kollektionen, Einzelurteile (08.10.2026, 05:45–07:00 UTC)

Betreiber 08.10.: «weiter fein katalog verbessern». Ausgangslage (Bericht `KATEGORIE-FEIN.md`, 05:08): einig 48'951 + 126,
**Titelprobe-Ablehnung 233**, **Zweig-Widerspruch 243**, keine Zuordnung 12.

## 1. Die Titelprobe lehnte zu Recht ab — meist lag GOOGLE falsch

GEMESSEN (frischer Export 51'609): von 233 abgelehnten Produkten trugen 142 Google «Dresses». Darunter waren 57 Röcke
(«Weisser A-Linienrock»), Blusen, Hosen, Jumpsuits, Nachthemden und Bikinis. 56 trugen «Bracelets», darunter Ketten, Ringe,
Armbanduhren und ein Gürtel. Dazu kamen ein paar echte Wortlücken der Probe: «Röckchen», «Partnerarmbänder», «Blouson»,
«Trouser/Pantalon», «Vest», «Pillow», «Hoops», «Kettchen».

- `kategorie_fein.py` TITELPROBE ergänzt (+ «(?<!nacht)(?<!garde)(?<!bade)robe», «cheongsam»). Selbsttest 34/34, darunter
  neue Kanarien wie «Garderobe ≠ Kleid», «Nachtrobe ≠ Kleid» und «Investment ≠ Vest».
- **NEU `titelprobe_fein.py`**: Für Kleidung und Schmuck mit gescheiterter Titelprobe setzt das Titelwort Google UND Shopify.
  Die Nachtwäsche-, Bademode-, Set-, Jumpsuit- und Kimono-Regeln prüfen den ganzen Titel, alle übrigen nur das Kopfwort.
  Kanarien 47/47. Drei Fehler fing die Einzelsicht vor dem Schreiben ab: «Doppel-st-reifen» → Armband,
  «Luftschlau-charm» → Anhänger, «Top mit Maxirock» → Top statt Set. **172 gesetzt / 0 Fehler.**
- «Rock» mit Ärmeln, Ausschnitt oder Trägern ist ein falsch übersetztes Kleid. Das bestätigt der Kontaktbogen der Produktbilder
  bei allen 10 Fällen. Die Titel sind umbenannt («Minirock mit Spaghettiträgern» → «Minikleid mit Spaghettiträgern in A-Linie»),
  10/10 zurückgelesen, Altwerte in `_kleid_statt_rock_2026-10-08.tsv`.

## 2. Kollektionen «Kleider»/«Röcke» hingen am CJ-Kategorienamen

Die Kollektion `sub-kleider` folgt dem Tag `kategorie-kleid`, `sub-roecke` dem Tag `kategorie-rock`; andere Kollektionen nutzen
diese Tags nicht. **GEMESSEN:**
- Den Kleider-Tag trugen auch 57 Röcke, 14 Oberteile, 7 Jumpsuits, 5 Nachthemden, 5 Blusen und 3 Bikinis.
- 29 echte Kleider trugen nur den Röcke-Tag. Sie standen bei den Röcken und fehlten bei den Kleidern.
- **203 Kleider hatten gar keinen Kleider-Tag**, 196 Röcke keinen Röcke-Tag.

Die Ursache liegt im Importer: `cj_category_fill.mjs` setzte den Tag allein aus CJs Kategorienamen («Dresses»), und
`google_kategorie` leitete daraus Google «Dresses» ab.

- **NEU `kleid_rock_tags.py`**: setzt die zwei Tags aus Kategorie UND Titel; beide Signale müssen einig sein, Sets, grobe
  Kategorien und Kinderkleidung bleiben. Kanarien 16/16. **453 gesetzt / 0 Fehler**: +kategorie-kleid 203,
  +kategorie-rock 196, −kategorie-kleid 105, −kategorie-rock 35.
- Quelle: Der Importer prüft jetzt den Titel (`kleidRockTag()`): Kleidwort → Kleid, sonst Rockwort → Rock, sonst kein Tag.
  EINE Wortregel `automation/data/kleid_rock_woerter.json` für Importer und Wächter; Gleichlauf py=js über 51'616 Titel:
  **0 Abweichungen**.
- Beide Werkzeuge laufen täglich in der Kategorie-Kette des Aufsehers (nach `uhren_fein`) und erfassen damit auch Neuimporte.

## 3. Einzelurteile für den bunten Rest

328 Produkte (281 Zweig-Widersprüche, 35 Titelprobe-Reste ohne eindeutiges Wort, 12 ohne Zuordnung) → 8 Prüfer, je 45.
Jeder Google-Pfad wurde gegen die Google-Taxonomie validiert (Ablauf `kategorie_urteile_anwenden.py`, neu mit
`URTEILE=`/`LEDGER=` und **Regel-Vorrang**). Wo eine tägliche Titelregel (Haar, Kosmetik, RC, Uhren, Titelprobe, Aroma) den neuen
Wert morgen anders setzen würde, bleibt das Urteil liegen. Sonst kippt ein Produkt jeden Tag hin und her; ein Prüfer hatte das
beim Diffuser gemeldet.

ERGEBNIS:
- 328 Urteile, alle gegen die Taxonomie geprüft: G 136, X 86, S 59, «?» 47 (Kauderwelsch wie «Laminierkissen», «Nano-Duscher» —
  bleiben, wie sie sind).
- Drei Prüfer haben bei unklaren Titeln die Produkttexte gelesen, aber nichts geändert. So wurden sechs «Armbänder» als
  Fitbit-/Apple-Watch-Bänder erkannt und ein «Holster» als Umhängetasche; fünf Kauderwelsch-Haartitel sind Locken- oder Glätteisen.
- Anwendung: **245 gesetzt / 0 Fehler**, 29 waren schon richtig, 7 liess der Regel-Vorrang liegen.

## Nachmessung (frischer Export, kategorie_fein trocken)

| Zustand | 08.10. 05:08 | nachher |
|---|---:|---:|
| gleich (Google und Shopify einig) | 48'951 | **49'309** |
| Zweig-Widerspruch | 243 | **69** |
| Titelprobe-Ablehnung | 233 | **5** |
| keine Zuordnung | 12 | **10** |
| Shopify feiner als Google (Absicht) | 126 | 139 |

## 4. Befund: Printful-Produkte fallen auf die Grobklasse zurück

Der Ledger-Zähler stieg von 262 auf 422. Diese Produkte hatte `kategorie_fein` am 06.10. verfeinert; heute stehen sie wieder auf
der Oberklasse («ae», «hg», «el», «aa-1»). GEMESSEN je Herkunft (die Kategorie ist heute eine Oberklasse des geschriebenen Ziels):
**Printful 363/432**, LX 6/8, CJ 53/23'053. Ausgeschlossen wurden: `versand_jenachland` (Test: Beschreibung ändern lässt die
Kategorie stehen), `kategorie_wache` (nicht im Ledger, fasst nur leere/pauschale an), die Sticker-Werkzeuge (letzter Lauf
26.09.), `kategorie_ki` (0 Treffer) und meine Urteils-Läufe. Verdacht: Printfuls Synchronisation setzt die eigene Grobklasse
(Aufkleber → Arts & Entertainment, Kissen → Home & Garden, Mauspad → Electronics); ein Beweis steht aus. Sonde: Der Sticker
«Matterhorn» wurde um 06:24 wieder fein gesetzt. Fällt er zurück, ist es extern.
Folge: begrenzt. Das Google-Feld (`mm-google-shopping`), das der Feed liest, bleibt fein; grob ist nur Shopifys Filter
«Kategorie» auf Druck-Artikeln. `kategorie_fein` schreibt sie nicht erneut (Ledger, sonst Hin und Her) und zählt sie jetzt
getrennt als `rueckfall-grob` im Tagesbericht.

Nebenbefund: 2 Produkte trugen einen Google-Wert, den es in der Taxonomie nicht gibt («Paper Shredders», «Athletics >
Football»). Beide sind in den Urteilen enthalten; eine eigene Klasse ist das nicht.
