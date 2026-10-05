# Dünne Produkttexte (< 40 Wörter) — Klasse «text_duenn» (04./05.10.2026)

Betreiber-Auftrag 04.10. 22:17 UTC «fix 12 h lang alles», Bereich dünne Texte.

## Gemessen vorher (04.10. 23:10 UTC)

`CACHE_NUTZEN=1 python3 automation/seo_voll_audit.py` → `/tmp/seo_voll_audit.json["text_duenn"]` = **118** Handles
(Stand 21:38 UTC, 50'761 Produkte). Live nachgezogen (`productByIdentifier`, Scratch `duenn_live.json`):

| Merkmal | Zahl |
|---|---|
| Status ACTIVE / im Onlineshop | 118 / 118 |
| Lieferant | 118 × CJ (SKU `CJ-…`), 0 × POD/Editor |
| Wörter: 10–19 / 20–29 / 30–39 | 3 / 40 / 75 |
| mit Importer-Schablone «Das zeichnet es aus» (`<ul>`) | 117 |
| mit Lieferzeit-Block `ls-liefer` | 0 |
| Raucherzubehör (Aschenbecher, Shisha, Grinder, Kohleanzünder) | 39 (alle `nur-onlineshop`) |
| Bilder: ≥ 5 / 4 / 3 / 2 | 113 / 3 / 1 / 1 |

Die Schablone war der Text: «Vielfältige Grössen» (bei einer Ausführung), «Aus hochwertigen Materialien gefertigt»,
bei Raucherware dreimal dasselbe («Robuste Qualität für Geniesser · Praktisch & langlebig · Diskret verpackt»).

## Quellen für die neuen Texte — und was heute NICHT ging

- **CJ-API:** `product/query?pid=` lieferte für 9 Produkte Daten, dann `16900500 Insufficient API points — Used today 124'890,
  Remaining 0` (Tageskontingent, Reset um 16:00 UTC). Der Lauf schreibt deshalb aus Titel, Optionen, Varianten-Gewicht
  (Shopify `inventoryItem.measurement`, stammt aus CJ), altem Importtext und Bild — CJ-Werte kommen über den täglichen
  Wächter nach (Cache `/tmp/produkttext_duenn_cj.json`).
- **Bilder:** Groq-Vision `qwen/qwen3.8-27b` ist das EINZIGE Bildmodell (llama-4-scout → 404) und hatte 199'263/200'000
  Tokens verbraucht; EIN Bild à 384 px = 2'143 Tokens → 118 Produkte sprengen jeden Tag. Deshalb **Kontaktbogen (Regel 5):**
  10 Bögen à 12 Hauptbilder, von mir selbst angeschaut, Urteil je Produkt (Objekt, Farben, sichtbare Merkmale, Anzahl,
  passt-zum-Titel) in `URTEILE_FILE` (Scratch `urteile.json`). Keine Materialien, keine Masse geraten.
- **Textmodell:** Gemini 402 (leer seit 21:53), OpenAI leer, DeepSeek 402 → Groq `gpt-oss-20b` (Massenlauf-Modell) mit
  `gpt-oss-120b` als Rückfall ab Versuch 3. Gemessen: 20b im JSON-Modus ohne `reasoning_effort` → `json_validate_failed`
  mit leerer Generation; mit `low` antwortet es, schreibt aber ~65–78 Wörter und «fuer/Ausfuehrung». Reasoning-Tokens zählen
  in `max_completion_tokens` (medium + 1500 → Abbruch) → low + 3000. **Groq-Tageslimit ist ein ROLLENDES Fenster** (429
  «try again in 31 s» bei 199'668/200'000) → Schlüssel-/Modell-Rotation mit Wartezeit statt Abbruch.

## Werkzeug: `automation/produkttext_duenn.py` (neu)

Tore vor jedem Schreiben (Entwurf wird verworfen, bis 5 Versuche mit Fehlermeldung an das Modell):
80–150 Wörter · du-Form (Satzmitte + «Sie können …» am Satzanfang) · ß→ss · Floskeln (hochwertig, perfekt, ideal, elegant,
robust, langlebig, Qualität, verleiht, Blickfang, …; «edel» ohne Edelstahl/Edelstein) · Heilversprechen
(`heilversprechen.ist_heilaussage` + Wirkwort-Liste) · **jede Zahl muss in den Quellen stehen, auch als Wort** («etwa einen
Zentimeter» kam vom 120b) · **jedes Materialwort muss in den Quellen stehen** (Synonyme Velours=Samt, Suede=Wildleder …) ·
**Eigenschaften ohne Quelle** (luftdicht, pflegeleicht, Standardkissen, passt auf X …) · Meta-Wörter (Bild, laut, Kategorie,
Quelle) · Varianten-Codes («Style 1-1 pair») · Englisch-Reste (rubber, studs, wallet, stroller …) · keine Liefer-/Preis-/
Shop-Aussage im Fliesstext · Raucherware ohne Geniesser/Genuss/Aroma/entspannt · Absatz muss mit vollständigem Satz enden.

Erhalten bleibt: `ls-liefer`, `ls-produktdetails`, Sorglos-Kasten, «📦 …»-Zeile, unbekannte `<div>`. Ersetzt: einleitende
`<p>`, `<p><strong>Titel</strong></p>`, Schablone «Das zeichnet … aus» (ihre sachlichen Zeilen fliessen als Quelle ein).
Neu dazu: `<div class="ls-produktdetails">` mit belegten Werten (Material, Masse, Gewicht). Schreiben = `productUpdate`,
Rücklesen `descriptionHtml == neu`, erst dann Ledger. Eimer-Etikette (`nachlauf`), 0,5 s Pause je Mutation.

Kanarienvögel aus den Trockenläufen (alle als Tor eingebaut): «edel» traf «Edelstahl»; «Bild\w*» traf «bilden»; Varianten-
Gewicht 70 g wurde zur «70-g-Flasche» (Körperöl) → Gewicht nur noch im Faktenblock; CJ-Kategorie «Home Storage» im Text;
«Sie können sie» am Satzanfang; «abgebildet» ohne Flexion verfehlte «abgebildete».

## Titel, die ein anderes Objekt nannten als das Bild (Kontaktbogen)

18 von 118. **16 korrigiert** (Ledger `dropship/_duenne_texte_titel_ledger.tsv`, Altwert drin), z. B. «Pflegepuppe fürs
Schlafzimmer» → bei CJ «food pillow» (Plüsch-Grillfisch/Hähnchenschenkel); «Faltenhundebett aus Kunststoff» → faltbarer
Hundenapf; «Haarklammer Frosch» → Spangen mit Schleife/Muschel/Seestern; «Mini-Chiffon-Rockedress» → bodenlanges Kleid;
«Kartenschmuck-Armband» → ein Charm-Anhänger; «Sonnenschutzpullover» → Poloshirt; «Langlebige Gelnageldärme» →
künstliche Nägel; «Stärkenhimmel-Wandlampe» → Sternenhimmel-Projektor; «Thick soled Frauen-Slipper», «Dünnsolahen Flipflops».
- **Pflegepuppe → DRAFT** (Tags `variante-unklar`, `titel-falsch`): CJ führt 5 Varianten (Fisch 60 cm, Hähnchen 55 cm,
  Garnele 50 cm …), Shopify verkauft «Default Title» für CHF 14.90 — welche Variante geliefert würde, ist unbestimmt.
- **Spiral-Armband** bleibt in `dropship/_duenne_texte_titel_pruefen.txt`: das Bild zeigt ein Uhrenband mit Blumenmuster
  und einen Armreif, der alte Text «Telefonkabel-Design» — ohne CJ-Daten nicht zu entscheiden.

## Scharflauf

- **Kräuter-Tabak-Grinder → DRAFT + `cj-entfernt`/`cj-entfernt-2026-10-04`:** CJ 1602002 «Product has been removed from
  shelves» (gleiche Regel wie `cj_ausgelistet_sichtbar.py`).
- Reihenfolge: Google-Kanal-Ware zuerst, Raucherware (39, `nur-onlineshop`) zuletzt — das Modell-Kontingent gehört zuerst
  dem, was verkauft.
- Stichprobe 10 von 23 selbst gegengelesen (00:00 UTC): sachlich, du-Form, 94–137 Wörter; Befunde «aus Rubber gefertigt»,
  «als Studs konzipiert», «Wallet/Stroller», Satzende «passend für.» → Tore nachgezogen, Lauf neu gestartet.
- Groq-Tageskontingent: 20b UND 120b auf Org 1 (Schlüssel 1+2) bei 199'6xx/200'000, Org 2 (Schlüssel 3) noch offen →
  Relaunch-Schleife alle 15 Min bis 10:00 UTC (rollendes Fenster), Ledger-idempotent.

## Gemessen nachher (05.10. 00:40 UTC, live je Handle `productByIdentifier` → Wortzahl ohne HTML)

| | vorher | nachher |
|---|---|---|
| aktiv mit < 40 Wörtern | **118** | **72** (davon 38 Raucherware `nur-onlineshop`, 34 Google-Ware) |
| aktiv mit ≥ 40 Wörtern (neu geschrieben) | 0 | **44**, 93–140 Wörter (Median 103), 43 davon mit Faktenblock `ls-produktdetails` |
| DRAFT mit Grund-Tag | 0 | **2** (Grinder `cj-entfernt`, Pflegepuppe `variante-unklar`/`titel-falsch`) |
| Titel korrigiert (Ledger) | – | 16 |

Ledger: `dropship/_duenne_texte_ledger.tsv` (46 Zeilen + Kopf: Altwert-HTML, Neu-HTML, Quelle je Zeile; Rücklesen vor jeder
Quittung). Titel: `dropship/_duenne_texte_titel_ledger.tsv`. Groq-Verbrauch gemessen: ~3–4k Tokens je Produkt (Prompt +
Reasoning je Versuch), 10 Produkte ≈ 21–39k → bei 200k/Tag je Modell und Org sind ~45 Produkte pro Nacht das Maximum,
solange Google-Feinkategorien und SEO-Prüfer dasselbe Kontingent trinken. Die Schleife (alle 15 Min bis 10:00 UTC) holt
nach, was das rollende Fenster freigibt (00:19→00:34: 1 Produkt); der Rest läuft über den täglichen Wächter (LIMIT 40).

## Bewusst NICHT gemacht

- Keine Texte für Produkte, deren Titel das Bild widerlegt, bevor der Titel stimmt (sonst beschreibt der Text ein anderes Ding).
- Kein Vision-Modell im Massenlauf (Kontingent des Bestell-Bildvergleichs), keine Masse/Materialien aus Bildern.
- Raucherzubehör rein sachlich, nichts beworben; keine Änderung an Google-Kanal-Zuordnung (alle 39 tragen `nur-onlineshop`).
- Keine Wächter-Änderung in `fixer_keepalive.sh` (Block liegt im Workflow-Feld `waechter_block`), kein Commit/Push.

## Offen

- **72 Produkte noch dünn** — Wächter täglich LIMIT 40 (Block im Workflow-Feld), zuerst die 34 Google-Ware-Handles, dann 38
  Raucherware. CJ-Fakten (Material/Masse) kommen ab 16:00 UTC (Punkte-Reset) in den Faktenblock.
- **Velvet-Kissenbezug** scheitert 5× je Lauf am Eigenschafts-Tor («Standardkissen», «pflegeleicht») — Quelle zu dünn für 90 Wörter;
  Kandidat für Hand-Text oder MIN_W 70 für Produkte mit < 6 Quellenzeilen (nicht umgesetzt, Entscheid).
- **Spiral-Armband** (`_duenne_texte_titel_pruefen.txt`): Bild und Titel widersprechen sich, CJ-Daten fehlen bis 16:00 UTC.
- **Mode mit nur «Default Title»** (Laufschuh «12 Grösse», Damenhemd, Bikini-Set, Leopard-Kleid u. a.): Grösse nicht wählbar —
  Klasse `cj_varianten_wache.py`, nicht hier; Texte nennen deshalb keine Grössen.
- **Shopify-Optionswerte als Codes** («Style 1-1 pair», «welsche Kirsche») bei Herz-Ohrringen/Breite Hosen — Klasse
  `groessenwert_kauderwelsch.py`; der Text nennt solche Werte nicht mehr, die Facette zeigt sie weiter.
- **Kontaktbogen-Urteile** liegen nur im Scratch (`urteile.json`); der Wächter läuft ohne Bild-Urteil (Vision-Kontingent) —
  Texte dann aus Titel/altem Text/CJ. Wer Bild-Fakten will: Bögen neu bauen (Rezept im Skript-Kopf) und `URTEILE_FILE` setzen.
