# Saison-Kollektionen Weihnachtspullover + Handwärmer, Kleidung mit fremdem Typ (10.10.2026, «weiter»)

## Gemessen

**Nachfrage** (OpenSEO, Schweiz/de, Jahresmittel pro Monat, ~18 Credits):

| Suchbegriff | Suchen/Mt | Schwierigkeit (KD) |
|---|---|---|
| adventskalender | 33'100 | 0 |
| weihnachtsdeko | 6'600 | 0 |
| adventskranz | 5'400 | 0 |
| weihnachtspullover | 2'400 | 0 |
| handwärmer | 2'400 | 0 |
| wichtelgeschenke | 2'400 | 0 |
| weihnachtspullover damen | 1'900 | 0 |
| ugly christmas sweater | 1'900 | 5 |
| heizdecke | 1'900 | 0 |
| wärmflasche | 1'900 | 0 |
| weihnachtsbaum künstlich | 1'900 | 1 |
| thermounterwäsche | 1'600 | 2 |
| weihnachtspullover herren | 1'000 | 0 |

**Bestand** (Titel-Regel über 52'293 Produkte):

| Thema | Passende Produkte | Stand |
|---|---|---|
| Weihnachtspullover | 53 (41 ohne Tierkleidung) | keine Kollektion |
| Handwärmer | 12 | keine Kollektion |
| Adventskalender | 16 | Kollektion `adventskalender` besteht (17, SEO gesetzt) |
| Heizdecke | 2 | zu wenig |
| Wärmflasche | 4 | zu wenig |
| Thermounterwäsche | 0 | – |
| Adventskranz | 0 | – |
| künstlicher Weihnachtsbaum | 0 | nur Motiv-Drucke |

## Getan: zwei Kollektionen

Beide über `automation/data/suchbegriff_kollektionen.json` (186 Kanarien grün), täglich im Aufseher für Neuimporte.

- **`/collections/weihnachtspullover`** «Weihnachtspullover & Christmas Sweater»:
  - Regel: Pullover-/Hoodie-/Sweatshirt-Wort UND Weihnachts-/Wintermotiv.
  - **Ohne Hunde-/Haustierkleidung** (12 ausgeschlossen). Katzenmotiv auf Damenpullover bleibt.
  - Live (WebFetch): «41 Artikel», Text mit «Worauf achten?» (Material, Passform, Partnerlook-Link, ehrliche Lieferzeit «bis Mitte November bestellen»).
- **`/collections/handwaermer`** «Handwärmer»: 12 Artikel, Akku/USB, Powerbank, Einweg. Laufzeiten nur, «wenn der Hersteller sie angibt».
- **Interne Links:**
  - «Weihnachten 🎄» → Weihnachtspullover (im Text + «Mehr Ideen»)
  - «Winter & Kälte» → Handwärmer
  - «Alle Kategorien» neu (388)
  - Vorlage `saison_texte_2026_10_08.py` mitgezogen

## Getan: Kleidung mit fremdem Produkttyp

**Anlass:** Die neue Kollektion zeigte im Filter «Haustierbedarf». Ein Damenpullover mit Katzenmotiv hatte den Typ «Haustierbedarf», ein Weihnachts-Sweatshirt «Partydeko & Ballone».

**Gemessen** (Google-Kategorie Clothing): 49 aktive mit fremdem Typ, zum Beispiel:

| Typ | Ware |
|---|---|
| Spass-Elektronik | Dessous-Set, Kinder-Pyjama |
| Basteln & DIY | Yoga-Hose, Cardigan, Herrenpullover |
| Werkzeug & Heimwerken | Jeansjacke |
| Beauty-Tools | Kinder-Socken |
| Spielzeug & Spiele | Plüschjacke, Plüsch-Pantoffeln |
| Taschen | taktische Westen |
| Wohnen & Deko | Baby-Schlafsack, Fitnesshose |
| Aufbewahrung & Organizer | Bademantel, Kimono |

**Folge:** falsche Filter-Facetten, und typbasierte Menü-Kollektionen zeigen die Ware am falschen Ort.

**Fix:** `produkttyp_vereinheitlichen.py` (läuft täglich im Aufseher) hat einen neuen Durchgang «Kleidung mit Fremdtyp»:
- Nur Shopify-Kategorie Kleidung/Schuhe (aa-1/aa-8) und nur 14 Typen ohne Kleidungsbezug.
- Ziel über `aus_kategorie()`: Geschlechtswort → Damen-/Herrenmode, Baby/Kinder → «Baby & Kinder», sonst «Mode» bzw. «Schuhe».
- Dieselbe Kollektions-Sperre.
- **Kostüme bewusst nicht**, denn am Kostüm-Urteil hängt der Google-Ausschluss.

**Fehlgriffe im Trockenlauf** («Denim-Tasche», «Henkeltasche», «Coral Fleece Küchenmatte», «Schuh-Unterstuetzung»): Dort ist die KATEGORIE falsch, nicht der Typ. Ein Titel-Schutz `FREMD_BLEIBT` (Tasche/Matte/Sohle/Einlage/Kissen …) hält sie fest. «Weste mit Taschen» (Plural) läuft durch.

**Ergebnis: 43/43 geschrieben und zurückgelesen**, Lauf `fremdtyp-2026-10-10` im Ledger `dropship/_produkttyp_ledger.tsv`. Rückweg: `--zurueck LAUF=fremdtyp-2026-10-10`.

**5 gesperrt**, weil sie sonst aus einer Kollektion fallen:
- «Weihnachts-Sweatshirt mit Schneemann-Druck» (in «Partydeko», ODER-Liste)
- «Kinder Socken-Finkli» (in «Beauty & Selfcare»)
- «Heizjacke mit USB» (in «Elektronik & Gadgets»)
- 2 Kinder-Plüschschuhe («Schuhe» schliesst «Kinderschuhe» aus)

## Offen

- **Importer-Haken:** Die CJ-Gruppen stempeln weiter ihren Gruppentyp («Spielzeug & Spiele» auf Plüsch-Pantoffeln). Der Aufseher korrigiert binnen 24 h. Eine Erweiterung von `gruppenstempel_typ.mjs` auf Kleidung würde es schon beim Import richten.
- **Die 5 Gesperrten:** Die Kollektionsregeln selbst prüfen. Gehört ein Weihnachts-Sweatshirt in «Partydeko»?
- **Weitere Saisonbegriffe ohne Ware:** Heizdecke, Wärmflasche, Thermounterwäsche, Adventskranz. Das wären CJ-Suchaufträge (`automation/cj_search_queue.txt`), falls sich Sortiment lohnt.
- **Nachmessen** Mitte November: Positionen «weihnachtspullover», «handwärmer» (Search Console).
