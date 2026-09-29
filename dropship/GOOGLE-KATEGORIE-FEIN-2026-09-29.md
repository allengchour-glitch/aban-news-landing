# Google-Kategorie fein — «Kleidung (allgemein)» → echte Unterkategorie (29.09.2026, Betreiber «google push?» · «noch mehr?»)

## GEMESSEN (Bulk-Export, 49'237 aktive Produkte)
- 7'254 Produkte bei Google nur als `Apparel & Accessories > Clothing` (Mäntel, Röcke, Hemden, Leggings, Bademode gemischt).
- Weitere grosse Blöcke: Shoes 5'385, Electronics 4'126, (leer) 3'120 — nächste Kandidaten.

## GETAN
`automation/google_kategorie_fein.py` (täglich im Aufseher): nur Werte GENAU «Clothing», Titelregeln nach Vorrang,
jeder Zielpfad gegen Googles Taxonomie (5'595 Pfade) geprüft, Kinder/Baby/Kostüm bleiben aussen vor, kein Treffer = grob.
**6'826 eingeordnet, 0 Fehler, 428 bleiben grob** (Handschuhe, Hüte, unklare Titel). Stichprobe 8/8 zurückgelesen.

| Unterkategorie | Anzahl |
|---|---:|
| Shirts & Tops | 3'747 |
| Pants | ~780 |
| Outerwear > Coats & Jackets | ~550 |
| Dresses | ~385 |
| Skirts (inkl. «Jupe») | ~290 |
| Jumpsuits & Rompers | ~270 |
| Vests | ~150 |
| Activewear · Underwear & Socks · Outfit Sets · Shorts · Swimwear · Scarves · Sleepwear · Suits | je 30–130 |

Fallen, im Trockenlauf gefunden und behoben: Kapuzen-**Schal** → Oberteil («kapuzen»), «4er-Set Socken» → Outfit-Set
(Reihenfolge), «im jungen Casual-Stil» als Kinderartikel ausgeschlossen («jungen»), Mehrzahl/Komposita («Hosen»,
«Damenjeans», «Sweatpants», «Spitzentop»), Schweizerdeutsch «Jupe» = Rock.
Ledger `dropship/_google_kategorie_fein.tsv` (Handle · alt · neu) → rückholbar.

## Nachtrag 18:20 UTC — «bis alles fix ist und sauber»

GEMESSEN (Bulk-Export mit `publishedOnPublication` Google-Kanal, 49'237 aktive, 47'474 im Kanal):

| Klasse | vorher | GETAN | bleibt | warum es bleibt |
|---|---:|---:|---:|---|
| **leer im Google-Kanal** | 1'466 | **1'424 gefüllt** | 42 | Kinderkleidung, «Styroporkopf», «Wurfdose» — kein sicheres Warenwort |
| leer ausserhalb des Kanals | 1'654 | — | 1'654 | 1'561 Kostüme + 41 Raucherzubehör, **bewusst nicht bei Google** |
| grob «Clothing» (Rest) | 440 | **376 eingeordnet** | 64 | Handschuhe/Mützen/Gürtel/Brillen liegen jetzt in ihrem eigenen Zweig; Rest unklar |
| grob «Electronics» | 4'132 | **2'949 verfeinert** | 1'183 | echte Elektronik ohne feineren Google-Zweig (Sensoren, SSD-Hüllen, Controller) |
| grob «Shoes» | 5'385 | — | — | **«Apparel & Accessories > Shoes» ist bei Google ein Endknoten** — schon präzise |

Summe heute: **1'424 + 376 + 2'949 = 4'749 Produkte präziser**, 0 Schreibfehler, Rücklesen 20/20.
Leer-Teil: zuerst Titelregel (1'321), sonst die gepflegte Tag-/Warengruppen-Logik aus `google_kategorie.kategorie()` (103).

Fallen aus vier Trockenläufen, alle vor dem Schreiben behoben:
- **Leere Regex-Alternative** (`saubere luft||filtersystem`) machte JEDE Maske zur Sturmhaube — ein `||` trifft alles.
- **Lookahead am falschen Ort**: `(?=.*maske)(uv-schutz)` prüft ab der Trefferstelle, nicht ab Titelanfang → `^(?=…).*(…)`.
- «Linearführungsschiene» enthält «**in-ear**», «Rohrreiniger» enthält «**ohrreiniger**», «Xbox» endet auf «**box**»,
  «LED-Controller» ist kein Gamepad, «Schlüsselanhänger» kein Halsschmuck, «Katzenohren-Beanie» kein Tierbedarf.
- «Fleece-gefütterte Handschuhe» wurden über `fleece` zum Oberteil → im grob-Modus prüft der Accessoire-Zweig zuerst.
- Electronics-Modus schreibt nur in 19 geprüfte Zielzweige (`ELEK_ERLAUBT`); «USB-Stick mit Halskette» → Halskette,
  «Set-Top-Box» → Outfit-Set wären sonst durchgerutscht.

**Nebenfund (Kundensicht):** 19 Bruder-Modelle («Joskin Wannenkippanhänger», «Massey Ferguson … mit
Holztransportanhänger», «Land Rover Defender, Einachsanhänger») standen in der Kollektion **«Halsketten»**
(Regel TAG = kategorie-halskette). Quelle: `cat_tags.mjs` kannte die Marken und Anhänger-Komposita nicht.
Quelle repariert (Kanarienvögel OK) + Tageswächter `automation/schmuck_tag_heilen.py` (19 geheilt, Ledger
`dropship/_schmuck_tag_heilen.tsv`).
