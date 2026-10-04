# «semrush push · überprüf alle produkten und fix · kategorien und fein filter» (04.10.2026, 21:00–22:30 UTC)

## 1 · Semrush (Einheiten gemessen)
- Projekt **31464185** (vom Betreiber angelegt): Site-Audit 03.10. = **95 % Health, 0 Fehler**, aber nur **100 Seiten** gecrawlt.
  ⛔ `site_audit/snapshot` kostet **10'000 Einheiten** je Aufruf (gemessen), `issue_details` 0. Audit neu starten und
  Crawl-Limit heben geht per MCP nicht → Betreiber in der Semrush-Oberfläche.
- Begriffs-Cluster «adventskalender» CH (600 Einheiten, `semrush/adventskalender_cluster_ch_2026-10-04.csv`):
  adventskalender 27'100/Mt (KD 20), frauen 8'100, für den mann 5'400, kinder 4'400. Shop hatte **keine** Kollektion.

## 2 · Behoben aus dem Site-Audit (Klassen, nicht nur die 100 Seiten)
| Befund | vorher | nachher | wie |
|---|---:|---:|---|
| Meta-Beschreibung fehlt (Policies, /collections/all) | 6 Seiten | 0 (live per curl) | Fallback in `snippets/meta-tags.liquid` (Backup `theme_backup/meta-tags.liquid.vor-meta-fallback-0410`) |
| H1 im Seitentext (zweite H1) | **190 von 222 Seiten** | 0 | `<h1>`→`<h2>` (Backup lokal, nicht im Repo — ein Token-Platzhalter in einer unveröffentlichten Seite löste die GitHub-Sperre aus) |

## 3 · Alle 50'760 Produkte (Semrush-Prüfungen lokal: `seo_voll_audit.py`, täglich mit `seo_voll_fix.py`)
| Klasse | vorher | nachher |
|---|---:|---:|
| doppelter Seitentitel | 85 | 4 (Wednesday-Perücke, Plüsch-Robbe — kein sichtbarer Unterschied) |
| doppelte Meta | 276 | 0 |
| Titel > 70 / Meta > 160 | 20 / 1 | 0 / 0 |
| Hauptbild ohne Alt-Text | 233 | 0 |
| H1 im Produkttext | 0 | 0 |
| Text < 40 Wörter | 118 | 118 (gemeldet, nicht automatisch geschrieben) |
- ⚠️ Falle: `seo`-Input ERSETZT title UND description — der Meta-Schritt löschte 61 frisch gesetzte Titel; behoben, nachgemessen.
- 14 Jeansjacken: «– Y104S» (Lieferantencode) im Titel → sichtbare Farbe (Kontaktbogen); 10× Option «Farbe: Y105M» → «Grösse: M».
- 1 echte Dublette (Trachten-Kniestrümpfe, gleiches Bild/Artikel) → DRAFT `duplikat-auto-draft` + 301; 8 Paare per Bild unterschieden.

## 4 · Adventskalender
- Kollektion **/collections/adventskalender** (Tag `adventskalender`, ohne «Beauty»): 15 kaufbare, einzeln geprüfte Kalender
  (Bausteine, Rückzieh-Autos, Puzzle, Charm-Armband, Katzenspielzeug, zum Befüllen). SEO aus dem Cluster, 6 Kanäle,
  Hauptmenü Platz 2 unter «🎁 Geschenke & Weihnachten» (166 → 167 Einträge, Backup `_hauptmenue_backup_2026-10-04.json`).
- Nicht aufgenommen (Prüfer): Küchentimer/Sportuhr/«Adventure»-Rucksack (Wortfalle), Halloween-/Eid-Countdown,
  «24-teilige Feuchtigkeitspflege» (topische Kosmetik), Kalender mit Donuts; 3 Phantom-Bundles ohne Lieferant bleiben Entwurf.
- 7 CJ-Suchaufträge für **gefüllte** Kalender vorne in `automation/cj_search_queue.txt` (bestellbar bis ~03.11. für 01.12.).

## 5 · Kategorien und Feinfilter
- **Undichte Kategorien** (Produkttyp-Filter von 153 Menü-Kollektionen gemessen): `kategorie_rein.py` — gehört dazu ⇔ Titel ∧
  Produkttyp ∧ kein Ausschluss → eigener Tag `kat-…`, Regel umgestellt, alte Regeln in `_kategorie_rein_regeln_alt.json`.
  Ringe 438 → 482 (233 raus: Ohrringe, Zugring-Leine, Smartwatch, Concealer «Augenringe», Turnringe; 277 echte Ringe neu),
  Taschen, Deko, Kissen, Jeans, Stiefel, Halsketten, Armbänder, Ohrringe — Stand im Ledger `_kategorie_rein.tsv`.
- **Grössenwerte**: `groessenwert_normieren.py` — 175 Produkte/504 Werte («140cm»→«140 cm», «US 10»→«US10», «S to M»→«S/M»,
  «F»→Einheitsgrösse, Kauderwelsch→Kürzel). «0XL/1XL» bewusst nicht (Bedeutung nicht belegbar).
- **Sammeltypen** «Trend-Gadget» 808 / «Trend-Produkt» 291 → aus der Produktkategorie abgeleitet (949; 330 ohne Beleg bleiben),
  Titel-Vorrang für Headset/Handyhülle; keine Kollektion hing an diesen Typen.
- Kleider-Kategorie: «Kleider-Organizer», «Vakuumbeutel für Kleider» raus, `subcat_heal.py` Ausschluss ergänzt.
- 301 /collections/haustier → /collections/sub-haustier.

## Offen
- Grosse Seiten ohne Filter (Damen 11'978, Wohnen & Deko 10'285, Geschenke-Preisseiten): vermutlich Shopify-Grenze für
  Filter auf grossen Kollektionen — Menü dort auf Unterkategorien führen (nächster Schritt, zuerst Grenze belegen).
- 118 dünne Produkttexte; 4 Titel-Doppel ohne sichtbaren Unterschied; CJ-Import der gefüllten Adventskalender beobachten.
