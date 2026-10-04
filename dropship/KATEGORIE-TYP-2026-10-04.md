# Produkte ohne Kategorie + Sammeltypen «Trend-Gadget/Trend-Produkt» — 04.10.2026, 22:45–23:10 UTC

Betreiber-Auftrag «fix 12 h lang alles» (04.10. 22:17), Bereich kategorie-typ. Ampel vorher:
«KATEGORIE: ~42 aktive ohne Kategorie · unbekannte Typen 29 (Trend-Produkt, Büro & Home Office, Trend-Gadget)».

## Vorher (gemessen)

| Mass | Befehl | Zahl |
|---|---|---|
| Aktive ohne Taxonomie-Kategorie | `python3 automation/kategorie_wache.py` (DRY) | **30** (Trend-Produkt 12, Büro & Home Office 10, Trend-Gadget 7, Kinder 1) — zuweisbar 0 |
| Aktive mit Sammeltyp Trend-Gadget/Trend-Produkt | `productsCount(query:"status:active AND product_type:'…'")` | **152** (84 Clothing ohne Geschlechtswort, 35 Shoes, 19 ohne Kategorie, 4 Shapewear, 4 Party, 2 Smoking, 2 Costumes, 1 Health Care, 1 Instrument) |
| «330 blieben» aus der Morgenrunde | `python3 automation/produkttyp_vereinheitlichen.py` (DRY) | 326 — davon 174 Entwürfe; der Sammeltyp-Lauf zählte ohne `status:active` |

Alle 30 Titel + Beschreibungen gelesen (Kanarienvogel): «Diamant-Tropfen» = Ohrstecker, «Kristall Stein Set» = Ring,
«Gel-Pads» = Handyhalter, «Versteckte Leckereien» = Hundespielzeug, «Wandklettergerät» = Katzen-Kletterbrett,
«Antirutsch-Mat» = Badematte aus Diatomeenerde — der Titel allein sagt bei einem Drittel nichts.

## Getan

### 1. `automation/kategorie_wache.py` — Titelregeln (vierte Welle) + zwei Fallen
- **Tierbedarf VOR Schuh/Kleid/Kostüm**, aber nur in eindeutigen Konstruktionen (`für Hunde/Katzen/Haustiere`,
  `Hunde-Outdoorschuhe`, `Katzenbett` …). Gemessen standen «Hunde-Outdoorschuhe» unter Shoes, «Kaschmir-Pullover für
  Haustiere» unter Clothing, «Halloween-Kostüm für Hunde» unter Costumes. Tier als MOTIV («Katzen-Ohrringe», «Stunt-Hund
  mit Fernbedienung», «Schlüsselanhänger Katze») bleibt bei den Warenregeln — Kanarienvögel 14/14.
- **Alte Falle behoben:** `\b(hund|katze|…)\w*` traf «Hunderte LED Lichterkette», «Hundertwasser», «Katzenaugen-
  Sonnenbrille» → Tierbedarf. Jetzt `hund(?!ert)`, `katze(?!nauge)/katzen(?!auge)`.
- `\w*shirt\b|sweatshirt` in der ersten Kleidungsregel — «Langarm-Sweatshirt mit Totenkopf-Print» war Party-Supplies
  (Halloween-Regel griff vor der zweiten Kleidungsregel).
- 27 neue Regeln aus den 30 gemessenen Titeln: Tattoo-Sticker (hb-3-2-6-7), Sticker/Vision Board (ae-2-1-2-8-4),
  Boots (aa-8), Latzrock/Minirock… (aa-1), BH (aa-1-6-3), Filament (el-13-1-5), Tracker/Ladekarte (el), Marker
  (os-11-11-4), Stifte (os-11-11), Journal (os-4-9-9), Glücksmünze (ae-2-2-2-2), Tastenkappen (el-7-9-11-3-2),
  Federmäppchen (os-3-16), Regenschirm (hg-16-2), Wasserfilter-Strohhalm (sg-4-2-12), Regentonne (hg-12-1-17),
  Autoschlüssel/Autopflege (vp-1), Spülbürste (hg-11-8), Seifengrinder (hg-1), Badematte (hg-1-2), Zähler (os-11),
  Kinder-Baumwoll-Set (aa-1-25-5). IDs per `nodes(ids:)` verifiziert (93 beim Start).
- Kinderregel `\bset\b` schloss «Pflege-/Geschenk-/Spielset» nicht aus («Tragbares Baby Beauty- und Pflegeset» → Outfit) → Lookbehinds.
- Regression: 340 bereits kategorisierte Sammeltyp-Produkte gegen die LIVE-Kategorie — die Abweichungen stammen aus
  älteren Regelwellen (Ledger 23.09. vor den Titelregeln); durch die heutigen Änderungen nur gewollte Verschiebungen
  (Sweatshirt ae-3-2→aa-1). Drei Fallen beim Vergleich entdeckt und entfernt: `wasserfilter` traf «Wasserfilter für
  Küche», `aufkleber` traf «Keramikfliesen-Aufkleber».
- **SCHARF (CAP 50): 20 gesetzt, 20 rückgelesen, 0 Fehler** (Ledger `dropship/_kategorie_gesetzt.txt`).

### 2. NEU `automation/kategorie_ki.py` — Zweitprüfer für den Rest
Aktive ohne Kategorie, die KEINE Titelregel trifft → Titel + Beschreibung (ohne Boilerplate, 350 Zeichen) an Erst-
(`titel_kauderwelsch_wache.gemini`: Gemini → Groq qwen) und Zweitprüfer (`gpt`: ChatGPT → Groq gpt-oss). Kandidaten
= NUR die 93 Pfade, die kategorie_wache kennt. Geschrieben bei gleicher Wahl oder Eltern/Kind-Wahl (dann der gröbere
Pfad). Uneinig → Ledger, 30 Tage Sperre. Kontingent leer → sauberer Abbruch ohne Ledger (gemessen 23:00: Groq
gpt-oss-20b 199'448/200'000 TPD, qwen ebenso, Gemini 402, ChatGPT leer — alle vier an einem Abend).
- Trockenlauf 22:58 auf 10: **5 einig** (Diamant-Tropfen → Jewelry, Kristall-Ring → Jewelry, Entfilzungs-Bürste →
  Pet Supplies, Wandklettergerät → Pet Supplies, Karo-Etui → Pen & Pencil Cases; alle gegen die Beschreibung geprüft,
  5/5 richtig), 2 Eltern/Kind (Antirutsch-Mat hg-1/hg-1-2, Gel-Pads el/el-4-8-4-2), 3 uneinig.
- Die 5 einigen von Hand geschrieben (Kontingent danach leer) — Ledger `dropship/_kategorie_ki.tsv` mit Vermerk.
- Trockenlauf schreibt KEIN Ledger mehr (hätte den scharfen Lauf 30 Tage gesperrt — beim ersten Test entdeckt).

### 3. `automation/produkttyp_vereinheitlichen.py` — Sammeltypen ohne Geschlechtswort
- `_kleid/_schuh`: Warenwörter, die im Shop nur ein Geschlecht tragen (Kleid, Rock, Bluse, Bikini, BH, Shapewear →
  Damenmode; Hemd, Herrenoberteile, Maenner → Herrenmode; Pumps, High Heels, Stiletto, Sandalette, Absatz → Damenschuhe),
  sonst der ehrliche Oberbegriff **«Mode» / «Schuhe»** (beide als Typ vorhanden, in kategorie_wache.TABELLE auf aa-1/aa-8).
  Kanarienvögel: «Winterkleidung» ≠ Kleid, «Kleiderbügel» ≠ Kleid, «Barock» ≠ Rock, «Schnürsenkel» → kein Schuh (bleibt).
- TAX: aa-1-25 Baby & Kinder, aa-1-6 Damenmode, aa-3 Kostüme, ae-3 Partydeko, ae-2-8 Musikinstrumente, ae-2-1 Basteln,
  hg-19 Raucherzubehör, el-13 3D-Druck, hg-16 Accessoires; aa-7 (Schuhzubehör) bewusst offen.
- VORRANG Tierbedarf (gleiche enge Konstruktionen wie kategorie_wache).
- Sammeltyp-Lauf nur noch `status:active` (174 Entwürfe kosteten Mutationen, die niemand im Filter sieht).
- **SCHARF: 144 umgelegt, 144 rückgelesen, 0 gesperrt** (19 Smart-Kollektionen mit TYPE-Regel geprüft), 31 Editor/POD
  unberührt. Verteilung: Mode 54, Damenmode 31, Schuhe 24, Damenschuhe 9, Haustierbedarf 5, Herrenmode 5, Partydeko 3,
  Schmuck 2, je 1 Baby & Kinder, Küche & Bar, Sport & Outdoor, Haushalt & Wohnen, Beauty & Pflege, Musikinstrumente,
  Auto-Zubehör, Garten & Pflanzen, Kostüme, Herrenschuhe, 3D-Druck. Ledger `dropship/_produkttyp_ledger.tsv`
  (Rückweg `--zurueck`).

### 4. Vier Kategorie-Korrekturen mit Titelbeleg (Ledger `dropship/_kategorie_korrektur.txt`)
Kaschmir-Pullover für Haustiere aa-1→ap-2 · Hunde-Outdoorschuhe aa-8→ap-2 · Halloween-Kostüm für Hunde aa-3-3→ap-2 ·
Langarm-Sweatshirt mit Totenkopf-Print ae-3-2→aa-1. Jede mit erwartetem Altwert geprüft, rückgelesen.

## Nachher (gemessen 23:05 UTC)

| Mass | Zahl |
|---|---|
| Aktive ohne Kategorie (`kategorie_wache.py` DRY) | **5** (vorher 30) — Winter-Geschenkset für Kinder, Antirutsch-Mat, Innenraum-Bürsten-Set, Gel-Pads, Versteckte Leckereien |
| Aktive Trend-Gadget / Trend-Produkt | **4 / 4** (vorher 152) |
| Ampel (`betreiber_ampel.kategorie_offen()`) | `KATEGORIE: ~5 aktive ohne Kategorie (Stand 2026-10-04T23:05, Ledger heute 283) · unbekannte Typen 5 (Trend-Produkt, Trend-Gadget, Kinder)` |

Die 5 holt `kategorie_ki.py` morgen mit frischem Kontingent (2 davon über die Eltern/Kind-Regel sicher: hg-1, el).

## Bewusst NICHT
- Keine Regel für «Gel-Pads», «Antirutsch-Mat», «Innenraum-Bürsten-Set», «Geschenkset für Kinder» — der Titel trägt
  die Ware nicht; das ist genau der Fall für die zwei Modelle.
- «Atemschutzmaske» (hb-1 Health Care) bleibt Trend-Produkt — kein Produkttyp im Shop passt, raten wäre schlimmer.
- «Press Lock Schnürsenkel» bleibt — Schuhzubehör ist kein Schuh (aa-7 bewusst offen).
- Entwürfe mit Sammeltyp (174) nicht umgetypt — unsichtbar im Filter; wer aktiv wird, kommt am nächsten Tag dran.
- Keine Kategorie-Massenkorrektur über KORREKTUR=1 (ändert Tausende; die Regression zeigt, dass ältere Wellen dort
  viel bewegen würden — das braucht einen eigenen Lauf mit Stichprobe, nicht den Abend des 12-h-Fixlaufs).
- fixer_keepalive.sh nicht editiert, nichts committet (Auftrag) — Wächter-Block siehe Workflow-Rückgabe.

## Lehren
- **Ein Trockenlauf darf keinen Zustand hinterlassen, der den scharfen Lauf sperrt** (Ledger-Sperre 30 Tage).
- **Prüfer-Kontingent gehört zum Messgerät:** vier Modelle, alle an einem Abend leer — der Wächter bricht sauber ab
  statt zu raten oder zu sterben.
- **Neutraler Oberbegriff schlägt leeren Sammeltyp:** «Mode» behauptet nichts und sagt der Kundin im Filter mehr als
  «Trend-Gadget»; das Geschlecht nur aus Warenwörtern, die es im Shop eindeutig tragen.
- Komposita-Fallen beim Tierwort: hund-ert, katzen-auge; beim Kleid: Kleid-ung, Kleider-bügel; beim Rock: Ba-rock.
