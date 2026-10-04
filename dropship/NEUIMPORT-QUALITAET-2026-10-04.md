# Neuimport-Qualität der letzten 24 h — 04.10.2026, 22:30–23:30 UTC («fix 12 h lang alles», Bereich neuimport-qualitaet)

Grundgesamtheit: **837 aktive Produkte mit `created_at > 2026-10-03T22:31Z`** (GraphQL `products(query:"status:active created_at:>…")`,
9 Seiten à 100; alle `vendor` LuxeStyle, alle 837 mit EK (unitCost) und Google-Kategorie-Metafeld, 821 in 6 Kanälen / 16 in 5).
Prüfprogramm: Scratch-Skript `analyse.py` über den lokalen Abzug (Titel, Tags, Preis/EK, Medien, Kategorie, Kanäle, Beschreibung)
mit den Haus-Regeln als Import: `klingenregel.ist_klinge/ist_handklinge`, `tierschutz_guard.tierschutz_geraet`,
`google_kanal_luecke.grund`, `heilversprechen.ist_heilaussage`, `marge_wahrheit.mindestpreis`, `multipack_titel.teilezahl`,
`titelcode_entfernen.SUFFIX/SCHUTZ`.

## Gemessen (vorher) — alle Klassen

| Klasse | Zahl | Befund |
|---|---:|---|
| **Preis unter dem Verlustschutz-Boden** (15 % Rabatt + Gratisversand, `mindestpreis(ek)/0.85`) | **521 / 837** | Median Preis/Boden 0,95 — z. B. EK 16.31 → Preis 19.90, Boden 20.90 |
| **Sonderzeichen im Titel** (U+2011 geschützter Bindestrich 88, U+202F schmales Leerzeichen 51, U+2033 1) | **121 / 837** | shopweit im Voll-Export (50'242): 364 |
| **Doppelte Stückzahl** («12 Stück … · 12 Stück», «(2 Stück) · 2 Stück», «12‑teiliger … · 12 Stück») | 4 | Importer hängte die Menge an, obwohl sie dastand |
| **Kauderwelsch-/Denglisch-Wache** (`titel_kauderwelsch_wache.py`) | **837 ungeprüft** | Wache seit 03.10. bei jedem Lauf tot: Gemini `HTTP 402 Payment Required` |
| Englische/halbübersetzte Titel (eigene Regex, Unterzählung) | 7 (3 echt) | «Inspirational Dream Cut Letter Sticker Vision Board Set», «Bicycle Shaft Tool Set – Crank Remover & Puller», «Aluminium-Oxid-Hook-Set» |
| Nicht im Google-Kanal OHNE Grund | 7 | Importer-Publish unvollständig (5 statt 6 Kanäle), keine Spur in Ledgern |
| Nicht im Google-Kanal MIT Grund | 9 | 3 Klinge, 3 Tabak (Zigaretten-Cutter, -herstellung), 2 Kostüm/Cosplay, 2 «Fototherapie» — korrekt draussen |
| Klinge (Werbe-Regel `ist_klinge`) | 3 | «Haarmesser … 12-Zahn-Schere» (Effilierschere), «Roland Schneidklinge inkl. Halter» (Plotterklinge), «Diamant-Schärfer für Küchen- und Gartenmesser» — alle 3 aus Google |
| Handklinge (Versand-Regel `ist_handklinge`) | 0 | Plotterklinge fällt unter die bewusste Geräte-Ausnahme («plotter»/«halter») — s. unten |
| Tierschutz-Gerät, Heilversprechen (Titel+Text), Erotik | 0 / 0 / 0 | — |
| Lizenz | 0 echte | 2 Treffer «Anime» = Gattungswort, kein Rechteinhaber |
| Lebensmittel | 0 echte | 1 Treffer «Kaffee» = Stahlfilter |
| Lieferantencode im Titel | 0 echte | «BB-Creme» (BB Cream), «DN15–DN100» (Norm), «MR117ZZ» (Lager-Norm), «D40W» (Modell) |
| Kosmetik zum Auftragen (dekorativ: Rouge, Puder, Concealer, BB-Creme) | 7 | Hausregel 30.08. = **nicht bewerben** (Hype/Social), kein Verkaufsverbot; keines trägt hype-/social-Tags → nichts zu tun |
| Nur 1 Bild | 6 | Handpumpe, Holzbohrer, Schneeknauf, Studentenrucksack, Badmintontaschen-Set, Teigtaschenmaschine |
| Shopify-Kategorie leer | 12 | 9× Typ «Büro & Home Office», 3× «Trend-Produkt» |
| Produkttyp Platzhalter «Trend-Produkt» | 6 | |
| «Set» im Titel ohne Zahl | 50 | 45 nennen die Zahl in anderer Form («Vierteiliger», «12-in-1», «38-Stück»); `teilezahl()` fand in 1 Beschreibung eine Menge (Autositzbezüge 9) — nicht geschrieben, Zahl gehört Teilen, nicht Packungen |

## Behoben

### 1. Preise (521 Produkte) — an der Quelle UND am Bestand
* **Quelle `automation/cj_preis.mjs` `chf()`:** rechnete mit CHF 7 Versanderlös (`fracht − 7`) und 10 % Rabatt und rundete mit
  `Math.floor(p)+0.90` AB (20.95 → 20.90). Jetzt zusätzlich der Boden des Verlustschutzes (`bodenVerlustschutz(kosten)` =
  `(EK+0.30)/(1−0.029−0.015)/0.85`, dieselben Konstanten wie `tools/marge_wahrheit.py` + `preis_verlustschutz.py`) und
  Rundung AUF .90. Beispiel 12 USD/200 g: 20.90 → 21.90. `node --check` auf alle drei Importer ok.
* **Bestand:** `EXPORT=<837-Abzug im kost28-Format> SCHARF=1 python3 automation/preis_verlustschutz.py` →
  **521 Produkte, 2'045 Varianten gehoben, 0 gesperrt, 0 Fehler, Median-Faktor 1,07×** (`dropship/PREIS-VERLUSTSCHUTZ.md`,
  Ledger `dropship/_preis_verlustschutz.txt`). Warum der Tagesläufer das nicht sah: er liest `/tmp/kost28.jsonl` vom 03.10. 01:18 —
  Neuware steht erst im nächsten Voll-Export drin.
* **Nachgemessen live (1'240 Varianten der 837): 0 unter dem Boden; Preissumme +3,7 %.**

### 2. Sonderzeichen + doppelte Stückzahl — Quelle `stueckzahl.mjs`, Bestand `titel_sonderzeichen.py` (neu)
* **Quelle:** `titelMitMenge()` (einzige Stelle, durch die cj_sku_import, cj_category_fill, cj_trending_import gehen) glättet jetzt
  U+2010/2011/2012/2043 → «-», U+202F/2009/200A/00A0 → « »; und die Wache «Menge schon im Titel» kennt alle Formen
  (`N Stück`, `(N Stück)`, `N-teilig`, `Vierteiliger`, `2er-Set`, `Set à N`) statt nur «· N Stück».
* **Bestand:** `automation/titel_sonderzeichen.py` (Kanarienvögel 11/11; Neuware 72 h + `EXPORT=/tmp/kost28.jsonl`): 50'782 Titel geprüft,
  **503 Kandidaten → 501 korrigiert, 2 übersprungen (inzwischen inaktiv/POD), 0 Fehler**; 465 Sonderzeichen, 33 Doppelmenge,
  3 beides. Live gelesen vor dem Schreiben, aus der Antwort zurückgelesen, Stichprobe 5/5 live korrekt.
  Ledger `dropship/_titel_sonderzeichen.tsv` (Zeit, id, alt, neu, Regel, ok). «–» (Gedankenstrich), «″», «×», «·» bleiben bewusst.

### 3. Kauderwelsch-/Denglisch-Wache wieder am Leben (Groq-Ersatz für Gemini 402)
* `gemini()` prüft `zweitmodell.gemini_leer()` / fängt 402 → Erstprüfer `groq_erst()`: Qwen 3.8-27B (andere Modellfamilie als der
  Zweitprüfer gpt-oss), Ausweich gpt-oss-20b; rotiert über alle 3 Schlüssel, Tageslimit (429 TPD) = sofort nächste Kombination,
  gpt-oss-JSON-Modus-Fehler (400 `json_validate_failed`, leer) → derselbe Auftrag ohne `response_format`.
  Gemessen: `llama-3.3-70b-versatile` gibt es im Konto nicht mehr (404) — Modellliste: gpt-oss-120b/-20b, qwen3.8-27b.
* Kanarienvögel 10/11 mit Groq (Gemini-Fassung 11/11; «Adjustierbarer Ledergürtel» bleibt uneinig → nur gemeldet, nie geraten).
* Scharfer Lauf STUNDEN=30 über die 837: **siehe Nachtrag unten.**

### 4. Google-Kanal
* 7 Neuimporte ohne Grund draussen → `publishablePublish` je einzeln, `publishedOnPublication` zurückgelesen: **7/7 ok**
  (Ledger `_google_neuimport.tsv`, Art `google-publiziert-nachtrag`).
* **Rückholer-Falle entdeckt und geschlossen:** `google_kanal_luecke.py` (Trockenlauf 22:40) hätte 108 Produkte publiziert — darunter
  «Pflegeöl für den Intimbereich» und «Latex-Gesichtsmaske», die die Adult-Klasse am selben Abend mit Tag `adult-nicht-bewerben`
  aus Google genommen hat. `TAG_RISIKO` kennt jetzt `adult` und `nicht-bewerben`; Trockenlauf danach: 73 publizierbar.
  **NICHT shopweit mit WRITE=1 gefahren** — die 73 (Jumpsuits, Body-Chain-Top …) gehören in eine eigene Sichtung.

## Bewusst NICHT gemacht
* **Roland Schneidklinge (15 Plotterklingen à 25 mm im Set):** `ist_handklinge` = False durch die Geräte-Ausnahme («plotter», «halter»);
  ob 25-mm-Plotterklingen unter die CN→CH-Sperre fallen, entscheidet die Regelwache (`klingenregel.json`), nicht dieser Lauf.
  Produkt ist aus Google (Werbe-Regel greift), bleibt aktiv. → offen für die Klingen-Regelpflege.
* 6 Ein-Bild-Produkte: `cj_bild_backfill.mjs` läuft täglich im Fenster (Task #19 einer Parallel-Session) — nicht doppelt anstossen.
* 12 ohne Shopify-Kategorie / 6 «Trend-Produkt»: `kategorie_wache.py` + `produkttyp_vereinheitlichen.py` laufen täglich.
* 7 dekorative Kosmetika: Hausregel ist «nicht bewerben», kein Draft.
* `google_kanal_luecke.py WRITE=1` shopweit (s. o.).

## Nachtrag Kauderwelsch-Wache (scharf, Groq)
* Scharfer Lauf 22:50–23:05 UTC (STUNDEN=30, 837 Titel): **0 geprüft — kein Prüfer-Kontingent mehr.** Gemessen in dieser Reihenfolge:
  Gemini 402 (seit 03.10.), ChatGPT leer (`/tmp/openai_leer` 20:11), Groq `qwen/qwen3.8-27b` Tageslimit 200k in beiden Organisationen
  (Schlüssel 1+2 = org …9s9vb, Schlüssel 3 = org …jk5y), `openai/gpt-oss-20b` ebenso; nur `gpt-oss-120b` antwortet noch (Schlüssel 1,
  Probe mit 4 Titeln: Inflierbares ✓, Bicycle Shaft ✓). Mit EINEM Modell wird nach der Vier-Augen-Regel nichts geändert → die Wache
  endet jetzt mit sichtbarer Zeile «PAUSE … kein Prüfer-Kontingent» statt Traceback; Ledger unberührt, die 837 kommen beim Aufseher-Lauf
  nach dem Groq-Reset (48-h-Fenster) dran. gpt-oss bekommt `reasoning_effort=low` + Deckel 2'500 Tokens (das Denken frass das Kontingent).
* **Von Hand, nach Lesen der Beschreibung (Ledger `_titel_kauderwelsch.tsv`, Art `hand-korrigiert`), 3/3 zurückgelesen:**
  «Inspirational Dream Cut Letter Sticker Vision Board Set» → «Vision-Board-Sticker-Set mit Buchstaben · 5 Farben» ·
  «Bicycle Shaft Tool Set – Crank Remover & Puller» → «Fahrrad-Werkzeugset Kurbelabzieher & Kettennieter · 4 Teile» ·
  «Aluminium-Oxid-Hook-Set 2–10 mm» → «Häkelnadel-Set aus Aluminiumoxid 2–10 mm» (Beschreibung: Stricken/Häkeln, 350 Nadeln).

## Nachgemessen (nachher)
| Klasse | vorher | nachher | Befehl |
|---|---:|---:|---|
| Varianten unter dem 15-%-Boden (837 Produkte, 1'240 Varianten live) | 521 Produkte | **0** | `nodes(ids)` → `mindestpreis(ek)/0.85` |
| Sonderzeichen im Titel (837) | 121 | **0** | Regex `[\u2010\u2011\u2012\u202f\u2009\u00a0]` auf Live-Titel |
| Doppelte Stückzahl (837) | 4 | **0** | Regex `(\d+)\s*(Stück|teilig).*·\s*\1\s*Stück$` |
| Nicht im Google-Kanal ohne Grund | 7 | **0** | `publishedOnPublication` |
| Englische Titel (Regex-Unterzählung) | 3 | **0** | Live gelesen |
| Kauderwelsch-Wache geprüft | 0/837 | 0/837 (Kontingent) | `_titel_kauderwelsch.tsv` |

## Betreiber-Klicks
1. **Gemini-Guthaben** (HTTP 402 seit 03.10.) — betrifft Kauderwelsch-Wache, Google-Bildtausch, Fein-KI, SEO-Faktentor.
2. **ChatGPT-Guthaben** (Marke `/tmp/openai_leer` 04.10. 20:11) — Zweitprüfer aller Jurys.
3. Groq: Schlüssel 1 und 2 hängen an DERSELBEN Organisation (ein Tageskontingent) — ein Schlüssel aus einer dritten Organisation
   würde das Kontingent der Wachen verdoppeln (gratis).

