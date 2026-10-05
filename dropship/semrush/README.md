# Semrush-Ernte (Testabo 02.–09.10.2026)

Testabo SEO Toolkit PRO, 50'000 MCP-Einheiten, aktiviert vom Betreiber am 02.10.2026 ~15:45 UTC.
**Kündigen vor 09.10. ~15:45 UTC** (sonst $139.95/Monat). Erinnerungen in diese Session:
`trig_01MN3e4NbqNHWM53tMnx4AkY` (08.10. 07:45 UTC) und `trig_01DXWkv64bGu99SKH8dxJtxG` (09.10. 06:45 UTC).
Google-Kalender-Eintrag ging nicht (Konnektor ohne Schreibrecht). Die Daten hier bleiben nach der Kündigung nutzbar.
Datenbank `ch` (Google Schweiz), Stand Oktober 2026. Lesen über `automation/suchvolumen.py`.

| Datei | Inhalt | Einheiten |
|---|---|---|
| — | `domain_rank` luxestyle.ch: Semrush-Rang 1'161'813, **556 Suchbegriffe in den Top 100, geschätzter Verkehr 0** | 10 |
| `luxestyle_ch_top30_2026-10-02.csv` | alle 38 Begriffe auf Platz ≤ 30 (Seite 2–3), nach Volumen — z. B. «ballettschuhe» 590/Mt Platz 29, KD 14 | 400 |
| `kategorie_suchvolumen_ch_2026-10-02.csv` | 478 Suchbegriffe zu 350 Kollektionen: Volumen, Schwierigkeit (KD), CPC, Absicht | ~4'780 |
| `kategorie_zu_suchbegriff_2026-10-02.json` | Kollektionstitel → 1–2 Suchanfragen (Gemini) | 0 |

Verbraucht am 02.10.: ~5'190 von 50'000.

## Schon eingebaut
- `seo_autopilot.py` wählt Ratgeber-Themen jetzt nach Suchvolumen der Kollektion (85/126 Menü-Kollektionen mit Wert);
  Ortsfilter kennt jetzt auch ausländische Städte/Länder («schmuck kaufen wien/in der türkei» war durchgerutscht).

## Plan für die restlichen Tage (~44'800 Einheiten)
1. **Seite-2-Seiten anheben (ohne Einheiten):** die 38 Begriffe auf Platz 16–30 → Produkttitel/SEO-Titel mit dem exakten
   Suchbegriff, interne Links aus Ratgebern/Kollektionen.
2. Positionen 31–100 (≈ 518 Zeilen, ~5'200 Einheiten) → zweite Liste naher Chancen.
3. `phrase_related` für die 20 kaufstärksten Begriffe mit eigenem Sortiment (~20 × 50 Zeilen) → neue Kollektions-/Ratgeberthemen.
4. Google-Shopping-Daten (`shopping_research`) für die meistbesuchten Produkte: Titel und Preise der Mitbewerber.
5. Rest: Suchvolumen für neue Saison-Begriffe (Weihnachten/Winter) + CJ-Suchliste nach Volumen ordnen.

## Ernte 2 (02.10. 16:58–17:12 UTC, Workflow mit 5 Ernte-Agenten)
| Datei | Zeilen | Inhalt |
|---|---|---|
| `luxestyle_ch_platz31plus-teil2_2026-10-02.csv` | 240 | restliche Rankings Platz > 30 (gleiches Format wie Teil 1) |
| `kategorie_suchvolumen_ch_verwandt-{A,B,C}_2026-10-02.csv` | 94 / 93 / 44 | verwandte Begriffe mit KD (Mode · Wohnen/Geschenke · Saison/Tier); `suchvolumen.py` lädt sie automatisch |
| `semrush_fragen_ch_2026-10-02.csv` | 13 | Fragen zu hundebett, kuscheldecke, heizdecke, lichterketten |
| `semrush_serp_ch_2026-10-02.csv` | 50 | wer vor uns steht (Top 5) für 10 Begriffe auf Platz 11–40 |
| `semrush_temu_shopping_ch_2026-10-02.csv` | 8 | Temu-Shopping-Anzeigen CH (nur 8 vorhanden) |
| `ratgeber_themen_2026-10-02.tsv` | 32 | Ratgeber-Phrasen je Menü-Kollektion → `seo_autopilot.py` liest sie (`suchvolumen.ratgeber_phrasen`) |

**Gemessene Kosten weichen ab (GEMESSEN):** `phrase_questions` kostet 520–640 JE AUFRUF, egal wie viele Zeilen;
`phrase_related` mit Volumen-Filter 40–160 je Zeile (bis 1'280 je Aufruf); `api_units` in der Antwort ist die
Konto-Differenz und zählt parallele Aufrufe anderer Agenten mit → Agenten-Summen (22'440) sind eine OBERGRENZE.
Restguthaben unbekannt (kein Saldo-Bericht im MCP) — geschätzt 10'000–19'000.

## Betreiber 02.10. 17:20 UTC «kopiere alles … erst am sonntag» → 17:24 «doch mach alles weiter» (Sonntags-Erinnerung gelöscht)

### Ernte 3 (02.10. 17:25–18:00 UTC, Agenten NACHEINANDER → api_units verlässlich)
| Datei | Zeilen | Einheiten (GEMESSEN) |
|---|---|---|
| `kategorie_suchvolumen_ch_produktarten_2026-10-02.csv` | 836 Suchbegriffe für 218 Google-Kategorien (≥ 5 aktive Produkte) + 41 Menü-Kollektionen, 800 mit Volumen (Summe 947'290 Suchen/Mt) | 8'000 |
| `kategorie_zu_suchbegriff_kollektionen_2026-10-02.json` | `handle:<handle>` → Suchbegriffe (40 Kollektionen) — `suchvolumen.fuer_kollektion(titel, handle)` | 0 |
| `kategorie_suchvolumen_ch_verwandt-D_2026-10-02.csv` | 29 (kratzbaum, katzenspielzeug, hundeleine, winterjacke damen); 8 davon Konkurrenz-Marken (Landi/Fressnapf) — nie für Titel | 1'570 |
| `list_projects` | 0 Projekte (keine Site-Audit-/Positions-Daten zum Kopieren) | 100 |

**GEMESSENE Preise (allein am Konto):** phrase_these 10/Zeile inkl. KD · phrase_related OHNE KD mit Volumen-Filter 40/Zeile
(320 je Aufruf à 8) — Filterwert MUSS String sein (`"90"`, als Zahl → NOTHING FOUND) · phrase_questions 520–640 JE AUFRUF ·
`api_units` = Konto-Differenz (parallele Agenten zählen sich gegenseitig mit). **Verbrauch gesamt geschätzt ~38–40k von 50k**
(Restguthaben ohne Saldo-Bericht nicht messbar). Für die Nachmessung am 08.10. reicht `resource_organic` luxestyle.ch
(≈ 440 Zeilen × 10 = 4'400).

### Eingebaut (02.10. 18:20 UTC)
- **CJ-Suchliste vorne:** 12 Sortimentslücken, je von zwei Prüfern (Bestand gegen 49'963 aktive Titel + Hausregeln) bestätigt:
  stehlampe 9'900, orthopädisches hundebett 880 (Auswertung 1) · skianzug 1'900, unterhosen herren 1'300, messschieber 880,
  pilates ring 720, kartoffelpresse 720, rolltop rucksack 390, wickelrock 390, steppweste damen 260, katzentunnel 260,
  sneaker socken 210 (Auswertung 2: 30 Kandidaten, 20 widerlegt — z. B. HDMI-/AUX-Kabel = Billigware, Trockenblumen = Pflanzen,
  Werkzeugkasten = Cuttermesser im Set, Tablet-Hülle = modellabhängig). `auswertung_2_gepruft_2026-10-02.json`.
- **103 Produkt-SEO-Titel** (`seo_suchbegriff_titel.py --aus seo_titel_geprueft_2026-10-02.tsv`): Workflow formulierte 141
  Kandidaten neu, Gegenprüfer verwarf 38 (andere Ware, falsches Geschlecht, Marke, Kauderwelsch, 3 Seiten um denselben Begriff);
  103/103 geschrieben + zurückgelesen. Meta-Text = geprüfter Titel + Zahlart/Versand (Produkttitel trug teils Falsches).
- **46 Kollektions-SEO** (`seo_kollektion_suchbegriff.py`, Ledger `_seo_kollektion_ledger.tsv` mit Altwerten, `--zurueck`):
  z. B. kratzbaeume «Katzenbaum & Kratzbaum für Katzen» (8'100/Mt), damen-schuhe «Schuhe Damen: …»; WebFetch bestätigt live.
- **Ratgeber:** `seo_autopilot.py` nimmt aus `ratgeber_themen_*.tsv` nur echte Fragen/Anleitungen (`RATGEBER_STRENG`) —
  Kaufbegriffe gehören auf die Kollektionsseite, ein Blogartikel würde ihr Konkurrenz machen.
- **Nebenfunde der Prüfer → gehandelt:** 35 Tierschutz-/Biozid-Geräte (`dropship/TIERSCHUTZ-BIOZID-2026-10-02.md`),
  GPS-Tracker mit Mikrofon (StGB 179sexies) und JBL-Nachahmung «FLIP 6» gedraftet, 2 falsche Titel korrigiert.

## 04.10.2026 · «semrush push» — Projekt + Site-Audit gefunden
- **Projekt 31464185 «luxestyle.ch»** (vom Betreiber angelegt; Werkzeuge siteaudit, tracking, backlinkAudit, seoideas).
  `list_projects` 100 Einheiten. Per MCP NICHT anlegbar/startbar (nur lesen) — Audit neu starten und Crawl-Limit
  heben (jetzt **100 Seiten**) = Betreiber in der Semrush-Oberfläche.
- ⛔ **PREISE (Semrush-Entwicklerdoku + GEMESSEN): `site_audit` → `snapshot` = 10'000 Einheiten JE AUFRUF** (gemessen
  04.10. 21:12 UTC), `meta_issues` 100, `page_info` 1'000, **`issue_details` gemessen 0**. Nie `snapshot` in einer
  Schleife oder in Agenten; die Übersicht unten reicht.
- Audit 03.10. (100 Seiten): Site-Health **95 %**, **0 Fehler**. Warnungen: 112 wenig Text/HTML 86 · 130 per robots
  gesperrte interne Ressourcen 87 (Shopify-Standard) · 106 **Meta-Beschreibung fehlt 5** (4 Rechtsseiten + /collections/all)
  · 105 H1 = Titel 1 (/pages/ueber-uns). Hinweise: 210 gesperrte externe Ressourcen 87 · 213 nur 1 interner Link 17
  (alle `?variant=`-URLs) · 104 **mehrere H1 4** (versand-lieferung, ueber-uns, tracking, kontakt-support) · 215 6 · 223 1.
- `domain_rank` ch: 560 Begriffe Top 100 (02.10.: 556), Platz 11–20: 5, 21–30: 35, Verkehr 0.
- Daten: «adventskalender» 27'100/Mt (KD 20), frauen 8'100, für den mann 5'400, kinder 4'400 — **keine Kollektion
  vorhanden** (gemessen), 11 aktive Kalender, meist leer/Puzzle. → Workflow «semrush-push-advent».

## 05.10.2026 ~07:00 UTC · Messung vor Umsetzung 2 (Betreiber «das geht mehr verbesserung mit semrush»)
- `domain_rank` ch: **559 Begriffe Top 100, Verkehr 0** (10 Einheiten) — es fehlt nicht an Daten, sondern an Positionen.
- `campaigns` Projekt 31464185: **keine Positions-Tracking-Kampagne** angelegt (100 Einheiten) — per MCP nicht anlegbar.
- `domain_organic_organic` ch (30 Zeilen, **1'200 Einheiten = 40/Zeile**): jede «Konkurrenz» teilt genau 1 Begriff → wertlos, nicht wiederholen.
- Danach Workflow «semrush-umsetzung-2» (wf_e3919dbd-03e): Seite-2/3-Seiten anheben, neue Kollektionen für Begriffe mit Volumen, interne Links.

## 05.10.2026 ~07:40 UTC · Bereich «neue-kollektionen» (Workflow semrush-umsetzung-2)
- **8 neue Landeseiten** für Begriffe mit Volumen ohne Seite: /collections/teppiche (14'800/Mt), bettwaesche (14'800), waeschekoerbe
  (9'900), wecker (9'900), duschvorhaenge (8'100), taschenlampen (6'600), wandregale (6'600), winterjacken (5'400 ×3) — Regel TAG
  über `automation/kategorie_rein_semrush.py` (täglich via kategorie_rein.py), 6 Kanäle, Menü, live per WebFetch bestätigt.
  Bericht `NEUE-KOLLEKTIONEN-2026-10-05.md`, Ledger `_neue_kollektionen_2026-10-05.tsv`.
- **GEMESSEN: `phrase_organic` (ch, 10 Zeilen) = 100 Einheiten je Aufruf**; 8 Aufrufe = 800. Kategorie-Seiten stehen bei 6 der
  8 Begriffe 10/10 in den Top 10.

## 05.10.2026 · Umsetzung 2 (Betreiber «das geht mehr verbesserung mit semrush») — Workflow semrush-umsetzung-2, 07:00–08:10 UTC
**Gemessen vorher:** `domain_rank` ch 559 Begriffe Top 100, Verkehr 0 (fast alles Platz 11–100). Ranking-CSVs 02.10.: 406 Zeilen;
Filter Platz 11–40 mit Vol ≥ 50 ∪ Platz ≤ 30 = 100 Zeilen / 99 Begriffe auf 89 URLs (88 Produkte, 1 Kollektion); live 69 ACTIVE,
19 DRAFT (7 mit 301, 12 ohne). 129 Begriffe ≥ 590/Mt mit ≥ 12 passenden Produkten hatten KEINE Landeseite. Kollektionstexte
verlinkten einander nie; Top-40-Kollektionen nach Volumen: min. 1 / Ø 3.5 eingehende Links, 20 von 40 ≤ 2.

| Bereich | Geändert (Zahlen) | Ledger / Bericht |
|---|---|---|
| **seite2-heben** | 21 Produkt-SEO (Titel ≤ 60 + Meta ≤ 155, beide Felder) + 3 Nachbesserungen (Grössen aus Varianten gemessen: 091200 «36–48», 600600 «39–45», 630100 ohne Grösse, da 40–43 ausverkauft); 2 Kollektionen sub-beleuchtung + beleuchtung-lampen (SEO + 92 Wörter Einleitung «Stimmungslicht»); **12 neue 301** (14 Versuche, 2 Ziele waren selbst Redirects → sonnenbrillen-alle / parfum-duefte). 0 Einheiten. | `_seite2_heben_2026-10-05.tsv` (42 Zeilen + Kopf), `SEITE2-HEBEN-2026-10-05.md` |
| **neue-kollektionen** | 8 Smart-Kollektionen (Tag `kat-…`, BEST_SELLING, 6 Kanäle wie diamond-painting, Menü mit Backup `_hauptmenue_backup_2026-10-05.json`): teppiche 38 · bettwaesche 32 · waeschekoerbe 15 · wecker 21 · duschvorhaenge 16 · taschenlampen 27 · wandregale 16 · winterjacken 45 = 190 Produkte getaggt; Regeln `automation/kategorie_rein_semrush.py` (täglich via kategorie_rein.py, jetzt 17 Kategorien). `menue_links.py` 0 Befunde. **800 Einheiten** (8 × phrase_organic ch 10 Zeilen = 100/Aufruf). | `_neue_kollektionen_2026-10-05.tsv`, `NEUE-KOLLEKTIONEN-2026-10-05.md` |
| **interne-links** | `automation/interne_links.py` (--messen/--trocken/--scharf/--zurueck/--pruefen): 149 Kollektionstexte mit Block `<!-- ls-verwandt -->` = 192 Links (63 «Passend dazu» + 129 «Zur Übersicht»), 149/149 zurückgelesen. Nachher: kaufbare Ziele < 3 Links 42 → 16 von 62; Top-40 min. 1 → 3, Ø 3.5 → 5.0, unter 3: 20 → 0. Prüferbefund behoben: `--zurueck` entfernt nur noch den Block live (Altwert-Rückweg nur `ZURUECK_VOLL=1 --zurueck-voll`, überspringt seit Schnappschuss veränderte Texte — 3 Baby-Kollektionen hätten sonst «CHF 45» zurückbekommen). 0 Einheiten. | `_interne_links_2026-10-05.tsv` (154 Zeilen + Kopf), `INTERNE-LINKS-2026-10-05.md`, `_interne_links_messung_*` |

**Einheiten heute:** Messung 1'310 (domain_rank 10 + campaigns 100 + domain_organic_organic 1'200, wertlos) + Umsetzung 800 = **2'110**.
Restguthaben nicht gemessen (Schätzung < 10'000; 08.10. braucht ~4'400).

**Live-Stichproben 08:1x UTC (WebFetch, je Bereich eine):** /collections/sub-beleuchtung Titel «Stimmungslicht, Lampen & LED-Beleuchtung | LuxeStyle»,
erster Satz «Stimmungslicht macht aus jedem Raum …», 256 Artikel, Block «Zur Übersicht: Wohnen & Garten» · /collections/teppiche Titel «Teppich kaufen:
Wohnzimmer, Schlafzimmer & Bad | LuxeStyle», H1 Teppiche, 38 Artikel, kein 404 · /collections/elektronik-technik «Passend dazu» 4 Links
(nintendo-switch, 3d-drucker, elektronik-audio, pc-komponenten), 4'177 Artikel.

**Offen:** 12 Ranking-Produkte Platz 17–30 sind DRAFT (casio illuminator 320/Mt, katzenklo möbel 320, trinkrucksack 260, Plüsch-Löwe 170, Eisseide-Kissen 140 …)
→ nur Kollektions-301, echter Ersatz = CJ-Suchaufträge (google_nachfrage_luecke-Klasse) · Kandidaten Runde 2: Abendkleider 3'600 (98 kaufbar), USB-Sticks 4'400 (42),
Wanduhren 4'400 (22), Etageren 5'400 (14), Lunchboxen 3'600 (36), Schneidebretter 2'400 (Klingen-Ban drin), Winterschuhe 3'600+1'600 · Bestehende SEO-Titel erweitern:
Stiefeletten (sub-stiefel-boots), Nachttischlampe (licht-tischlampe), VR-Brille (vr-ai-neuheiten) · Regel teppiche: `echt` nennt fussmatte, `suche` nicht
(«Geprägtes PVC-Leder für Fussmatten» wäre Fehltreffer) · WELTEN-Regexe in interne_links.py ohne Wortgrenzen («autoMATISCHer» → tisch → wohnen; 1 Fehl-Link
Kinderwagen-Ventilator in aufbewahrung-sub) · Anker «Baustelle Kinder» auf Bausteine-Set (3 Blöcke) · «Leichter Wintermantel aus Baumwolle» ist laut Text ein
dünnes Polyester-Jäckchen (Titel-Workflow) · collection.productsCount hinkte 13 Min nach dem Taggen (0) — Live-Seite/products-Feld sind die Wahrheit ·
Wecker-Armband 620000 fehlt in kat-wecker · 6 Ratgeber/Seiten verlinken beleuchtung-lampen über die 301 · 103 SEO-Metas vom 02.10. nicht auf übernommene
Grössenangaben geprüft · kategorie_rein-Tageslauf mit 17 Kategorien (timeout 3000 s) erst beim nächsten Tick belegt · Nichts committet (Workflow-Vorgabe;
der Autocommitter hat Teile als Drift mitgenommen).

**Nachmessung 08.10. (resource_organic ch, ~4'400 Einheiten, EINMAL, vor der Kündigung 09.10.):**
1. Seite-2-Begriffe → Position vorher/nachher: asymmetrisches kleid, fingerskateboard (Platz 37), weihnachten pyjama familie (33), stimmungslicht (20 → URL muss
   /collections/sub-beleuchtung sein, nicht mehr beleuchtung-lampen), holzspiegel (17), spielkonsole für tv, schrank organizer, luftbett mit pumpe, leichte
   arbeitsschuhe, spitze stiefeletten, plateau sneaker herren, geblümtes kleid, jumpsuit herren, drohne kinder, kart helm, retro sonnenbrille, 3d projektor hologramm,
   propeller cap, kostüm superman, wecker armband vibration, langarm-t-shirt (631100 soll NICHT mehr mit gestreiftes langarmshirt ranken, 623300 schon) — volle Liste
   Spalte `begriff` in `_seite2_heben_2026-10-05.tsv`; 12 Redirect-Quellpfade dürfen nicht mehr als eigene URL erscheinen.
2. Neue Handles in den Rankings: /collections/teppiche (teppich 14'800), bettwaesche (14'800), waeschekoerbe (9'900), wecker (9'900), duschvorhaenge (8'100),
   taschenlampen (6'600; «stirnlampe» gegen wandern-trekking beobachten), wandregale (6'600), winterjacken (5'400/2'900/2'400) — Google braucht Wochen, am 08.10.
   zählt nur «indexiert und erstmals sichtbar»; echte Positionen erst in der Nachmessung nach dem Abo (Daten bleiben lokal).
3. Interne Links: die Top-40-Kollektionen mit vorher nur Menü-Link (nintendo-switch 27'100, pc-gaming, pool, vorhaenge, puzzles, licht-decken-steh, pc-komponenten,
   accessoires, geschirr-servieren, elektronik-audio) und die Produkte Platz 16–30 (ballettschuhe, blumenkleid, kratzsäule, kinderwagen ventilator, leuchtschuhe
   kinder, baustelle kinder, puzzles) → Platz vorher aus `luxestyle_ch_top30_2026-10-02.csv` / `platz31-100` gegen 08.10.
Vergleich: `python3 automation/suchvolumen.py` + CSV-Diff gegen die 02.10.-Dateien; nur Platzänderung ≥ 3 zählt (Semrush-Rauschen).

## 05.10.2026 ~09:30 UTC · «keyword mehr machen» — Google-Suggest-Ernte + Semrush-Konto LEER
- **GEMESSEN: Semrush-Einheiten sind aufgebraucht.** `phrase_these` 40 Begriffe → «ERROR 132 API UNITS BALANCE IS ZERO»; 5 → ok (50),
  10 → ok (100), danach 10/5/2/1 Begriffe → `no_api_units`. Verbrauch in dieser Runde: **190 Einheiten** (19 Begriffe; `api_units` der drei
  parallelen Einzelaufrufe zählten sich gegenseitig mit: 20/30/20 statt 10/10/10). Die Schätzung «< 10'000 Rest» vom Morgen war zu hoch —
  Nachmessung 08.10. (`resource_organic` ~4'400) ist OHNE Aufladen NICHT möglich (semrush.com/mcp-access). Kündigung 09.10. bleibt.
- **Gratis-Ernte Google-Vorschläge Schweiz** (`automation/google_suggest/`): 373 Seeds (Hauptmenü-Kollektionen → Produktbegriffe, Top-Produktarten
  nach Volumen, Sortimentsbegriffe), 1'338 Anfragen (hl=de, gl=ch; Varianten kaufen/schweiz/damen/herren/kinder) → 11'198 Vorschläge roh,
  4'303 verworfen (Orte, Läden Manor/Landi/Ikea/Galaxus…, Marken, Kostüm/Erotik/Tabak/Klingen/Arznei/Lebensmittel/POD, Info-Absicht
  «reinigen/test/anleitung»), 391 schon in den CSVs bekannt → **6'351 neue Begriffe** in `keywords_erweiterung_ch_2026-10-05.csv`
  (keyword;volume;kd;seed;quelle). quelle=`semrush` 19 gemessen (17 mit ≥ 30/Mt: teppich wohnzimmer 4'400, baby bodys 1'600,
  beamer leinwand 1'000, bikini set damen 1'000, bilderrahmen holz 720, bettwäsche beige 480 …), `suggest-kandidat` 221 = die
  vorsortierten Long-Tail-Begriffe, die bei neuem Guthaben ZUERST gemessen werden (je Seed ≤ 3, Produkt-Modifikator vor «kaufen»),
  `suggest` 6'457 ohne Volumen. Nicht committet (Workflow-Vorgabe).

### Produkt-Keywords (60 Produkt-SEO, 09:31) + Nachbesserung 10:17 UTC — Zielseiten-Abstimmung
60 Produkte bekamen Begriff vorne im SEO-Titel (`_keyword_produkte_2026-10-05.tsv`, `KEYWORD-PRODUKTE-2026-10-05.md`). Prüfer fand
Fremdmarke im Bild und falsche Begriffe → **3 DRAFT + Tag `fremdmarke-bild` + Google weg** (Real-Techniques-Pinsel a689b0, Red-Bull/
Marlboro-Sweatshirt 636600, Hourglass-Pinsel 001152), «foundation pinsel» → 634600, Bootcut/Sandalen/Wäschekorb zurückgenommen.
**Regel eine Zielseite je Begriff:** Kollektions-SEO nennt Hauptwort + Modifikator ODER Kopfbegriff ≥ 1'000/Mt → Kollektion ist Ziel,
Produkt-SEO beginnt mit unterscheidendem Merkmal (bikini set damen → sub-bademode, abendkleid lang → abendkleider, wecker digital → wecker,
wäschekorb mit deckel → waeschekoerbe, diamond painting zubehör → diamond-painting, hausschuhe herren → sub-hausschuhe, thermosflasche
edelstahl → sub-trinkflaschen, jeans damen bootcut → jeans-denim). Modifikator fehlt in der Kollektion → Produkt ist Ziel; in
`position_tracking_ziele.tsv` umgestellt: blusenkleid damen 620500, jeanskleid damen 617700, elektrische zahnbürste kinder 844481,
handstaubsauger auto 3da44c, ferngesteuertes auto kinder a4852a. «slingback pumps» bleibt bei `slingback-pumps-damen-…-2026`.

## 05.10.2026 ~09:30 UTC · ⚠️ Semrush-Konto LEER
GEMESSEN: `api_units` fiel in Runde 3 über 6 Aufrufe 700 → 400 (= Kontostand), danach meldete `phrase_these` «ERROR 132 API UNITS
BALANCE IS ZERO». **Die Nachmessung am 08.10. (resource_organic ~4'400) ist ohne Nachkauf nicht möglich.** Ersatz: eigener Tracker
`automation/semrush_positionen.py` über gespeicherte CSVs + Positions-Kampagne (Projekt-Limit, falls der Betreiber sie für die Schweiz
neu anlegt). Gratis-Keyword-Quelle: Google-CH-Vorschläge (`automation/google_suggest/`, 6'351 neue Begriffe in
`keywords_erweiterung_ch_2026-10-05.csv`, 221 vorsortierte Kandidaten zuerst messen, falls wieder Guthaben da ist).
Runde 3 bis hier: 8 neue Kollektionen (Etageren 14, USB-Sticks 42, Wanduhren 21, Woks 14, Abendkleider 104, Lunchboxen 33,
Winterschuhe 64, Bauchtaschen 77) + 4 bestehende Seiten auf Stiefeletten/Nachttischlampe/Haarglätter/VR-Brille; Teppiche ohne
Fussmatten/Holz (35), interne Links mit Wortgrenzen. Fable-Limit erreicht → Rest läuft ohne Fable weiter.

## 05.10.2026 · Umsetzung 3 (Betreiber «fix mal weiter semrush») — Workflow, 08:30–10:45 UTC
**Gemessen vorher:** 541 Kollektionen live → keine Seite für etagere 5'400/Mt, usb stick 4'400, wanduhr 4'400, wok 4'400, abendkleid 3'600,
lunchbox 3'600, winterschuhe damen 3'600, bauchtasche 2'900. Rankende Entwürfe: 12 mit 301 auf Kollektion statt Produkt (3 mit Fehlern:
falsches Bild am Kuppelzelt, Lunch-Bag als «Corduroy Rucksack», 2 ohne Bild). CSVs 02.10. Platz 41–100 (Vol ≥ 200, KD ≤ 30): 113 Zeilen
auf 83 URLs, davon 25 Hausregel-Klassen (POD 9, Kostüm 7, Heil 6, Klinge 1, Absicht 2) und 9 schon erledigt; 8 rankende Entwürfe ohne 301
(= 404 für Google); Meta meist Leerformel ohne Gratisversand; Regel «Sternenhimmel» zog 23 Fremdartikel in licht-nachtlicht-projektor.

| Bereich | Geändert (Zahlen) | Ledger / Bericht |
|---|---|---|
| **kollektionen-runde2** | **8 neue Smart-Kollektionen** (Tag `kat-…`, 6 Kanäle, Menü, Backup `_hauptmenue_backup_2026-10-05_runde3.json`, `menue_links.py` 202 Einträge ok): etageren 14 · usb-sticks 41 · wanduhren 21 · woks 14 · abendkleider 104 · lunchboxen 33 · winterschuhe 64 · bauchtaschen 77 (Hauptbegriffe zusammen 32'100/Mt). Regeln Block «Runde 3» in `kategorie_rein_semrush.py` (jetzt 25 Kategorien, Kanarienvögel 165/0 Fehler nach allen Nachbesserungen). 4 bestehende Seiten erweitert: sub-stiefel-boots + Stiefeletten (4'800), licht-tischlampe + Nachttischlampe (3'600), haarstyling-geraete + Haarglätter (880), vr-ai-neuheiten + VR-Brille (3'600, 14 VR-Produkte getaggt). **Nachbesserung:** Konsolen-Jailbreak-Dongle «USB-Stick für Host-Systeme» + Switch-CFW-Archiv → DRAFT, Google-Kanal weg, Tag `kopierschutz-umgehung`; neue Regel `kopierschutz-umgehung-konsole` in `heikel_zweck.json` (Trockenlauf 49'925 aktive: 2 Treffer, 0 Fehltreffer) → `cj_category_fill.mjs` + `ueberwachung_waffen_guard.py`. | `_neue_kollektionen_2_2026-10-05.tsv`, `NEUE-KOLLEKTIONEN-2-2026-10-05.md` |
| **nacharbeit-runde2** | teppiche 38 → 35 (2 Holzroste, 1 Diatomit raus, Text ohne Fussmatten); wecker 21 → 22 (Wecker-Armband 620000 drin); `interne_links.py` WELTEN mit Wortgrenzen (`welt_re`, 41/41 Kanarienvögel; 24 Weltwechsel geprüft), Fehl-Link Kinderwagen-Ventilator weg, Anker «Baustelle Kinder» ×3 korrigiert; kaufbare Ziele < 3 Links 16 → 11 von 62; 630500 «Wintermantel» → Kinderjacke Gr. 110–180 (Titel/SEO/Typ/Tags); 121 SEO-Metas gegen Varianten: 2 korrigiert (Fingerskateboard sieben Farben, Luftbett 190 × 100 × 25 cm). | `_nacharbeit_runde2_2026-10-05.tsv` (14), `NACHARBEIT-RUNDE2-2026-10-05.md` |
| **draft-ersatz** | 4 Entwurfs-301 von Kollektion auf gleichwertiges Produkt umgestellt (Plüsch-Löwe, Kuppelzelt, Pool-Liege, Eisseide → nach Prüferbefund 629800 Waffel-Eisseide-Lendenkissen statt Plüschkissen 612400; 612400-SEO zurückgesetzt) + SEO beider Felder; 3 CJ-Suchaufträge vorne (cat litter box furniture, collapsible water container with tap, corduroy backpack); Marken (Casio, Polaroid, Clinique, Givenchy) + Nova bewusst belassen; 7 Kannibalisierungs-Fälle live konsistent. Kollektions-301 der Entwürfe 11 → 7. | `_draft_ersatz_2026-10-05.tsv` (25), `DRAFT-ERSATZ-2026-10-05.md` |
| **platz41-100** | 40 Seiten: 34 Produkt-SEO (Zahlen nur aus kaufbaren Varianten), **9 neue 301** (Entwurf → kaufbarer Ersatz, u. a. Kühlbox → Mini-Kühlschrank 6 L für «kleiner kühlschrank» 4'400), 1 Redirect umgezielt (Lichtwecker → /collections/wecker), 4 Kollektions-SEO + 3 Einleitungen (93–102 Wörter), 1 interner Link; licht-nachtlicht-projektor auf Tag-Regel `kat-nachtlicht-projektor` (28 neue Kanarienvögel): 148 Produkte/110 aktiv mit 23 + 19 Fremdartikeln → **91, alle aktiv, 0 Uhren/Leinen/Velolichter**; Tracker 250 Begriffe. | `_platz41_heben_2026-10-05.tsv` (53+), `PLATZ41-HEBEN-2026-10-05.md` |

**Einheiten Runde 3:** 600 (6 × `phrase_organic` ch für die neuen Kollektionen; abendkleid/lunchbox «NOTHING FOUND»), dazu 190 aus «keyword mehr
machen» → **Konto LEER** (gemessen: «ERROR 132 API UNITS BALANCE IS ZERO», `no_api_units`). Die Deutung «Rest ≈ 400» aus der api_units-Folge
ist damit überholt; Wahrheit = Fehlermeldung des Kontos.

**Live-Stichproben ~10:50 UTC (WebFetch, Cache-Brecher `?v=s3`):** /collections/usb-sticks Titel «USB-Stick kaufen: Metall, Mini & Motive |
LuxeStyle», «41 Artikel», kein Host-/Switch-/Jailbreak-/Rogue-Dog-Titel auf Seite 1 · /products/langes-kissen-aus-eisseide-kuhlend-629200 →
«Eisseide-Lendenkissen mit Kühlfunktion | LuxeStyle», CHF 43.90, «In den Warenkorb legen» · /collections/licht-nachtlicht-projektor Titel
«Nachtlichter & Sternenhimmel-Projektoren kaufen | LuxeStyle», erster Satz «Ein Sternenhimmel-Projektor wirft Sterne …», «91 Artikel», Seite 1
ohne Uhr/Leine/Hundegurt/Velo/Zahnbürste.

**Offen (Prüferbefunde nicht behoben, je klein):** bauchtaschen «Heat Gun mit Leder-Bauchtasche» (Werkzeug-Holster; BAN `heat.?gun|heissluft|tint`) ·
abendkleider «Tüll-Ballkleiderschürze» = Rock (BAN `sch(ü|ue)rze|\brock\b`) · usb-sticks «Wretched Rogue Dog» (Variante ohne Speicher) · HAUS-BAN
«messer» trifft «Durchmesser», «mini» trifft «Minimalistisch» (wanduhren/woks unterfüllt) · bauchtaschen im Menü nur unter Damen (Bestand
überwiegend Herren) · Texte: Bauchtaschen «Laufgürtel mit Flaschenfach», «Pastell oder Neon», Woks «Dämpfeinsatz» nicht belegt · Zelt-Meta
«Festivals» nicht belegt · Kannibalisierungs-Metas der 5 Zielseiten beginnen noch mit dem Begriff der rankenden Seite · Velo-Rücklicht «neun Formen»
(1 Variante = 3er-Pack), GPS-Tracker «Weiss mit Magnet» gibt es nicht · Kinderjacke 630500 «Er ist …» → «Sie ist …» · lautsprecher-Kollektion
zieht Rucksack/Tasche/E-Keyboard/Diffuser (Ziel des 301 «sound system») · 8 Sternenlicht-/Galaxy-Projektoren fehlen in licht-nachtlicht-projektor
· Wirkaussagen Mini-Stepper 998784 («Rehabilitation», H1 «Reha», Ziel eines neuen 301) + Fitness-Band 7e0d5a («Fettdepots») · Superman-/Widmann-SEO
(Fremdmarke) · 612400/629800: mehrere Motive, 1 Variante · kein Ersatz für velo garage 1'300, spin bike 1'300, kleiderständer holz 590 (CJ-Aufträge
möglich) · 3 Draft-301 nach CJ-Import umstellen (IDs 1735624130945, 1730175500673, 2036527595911) · kategorie_rein.py mit 25 Kategorien: Laufzeit
gegen `timeout 3000` beim nächsten Tick prüfen · Haarstyling-Meta im Cache noch alt · winterschuhe nachzählen · Wächterzeilen Kanarienvögel
(`interne_links.py --kanarien`, `kategorie_rein_semrush.py`) noch nicht im Aufseher · Nichts committet (Autocommitter nahm Teile als Drift mit).

**Nachmessung 08.10.:** mit leerem Konto NICHT möglich (resource_organic ~4'400 Einheiten). Weg ohne Nachkauf: `automation/semrush_positionen.py`
über die gespeicherten CSVs + Positions-Kampagne (Betreiber legt sie für CH/Mobil an, 250 Begriffe in `POSITION-TRACKING-KEYWORDS.txt`) +
Search Console. Neu zu beobachten: 8 Kollektionen Runde 3, 9 + 4 Redirect-Pfade (dürfen nicht mehr als eigene URL ranken), 34 Platz-41-Produkte,
«sternenhimmel projektor» → licht-nachtlicht-projektor, «kleiner kühlschrank» → 629400. Kündigung vor 09.10. bleibt.

## 05.10.2026 ~10:25 UTC · Bereich «suche-synonyme» (0 Einheiten) — `KEYWORD-SUCHE-2026-10-05.md`
- 60 neue Begriffe (17 mit Volumen + 43 suggest-kandidat) gegen die Storefront-Suche: 60/60 mit Vorschlägen, aber **24/60 ohne
  passende Ware in den Top 3** — Zwei-Wort-Begriffe (Ware + Farbe/Zielgruppe) verlieren gegen Titel, die beide Wörter tragen.
- `automation/suchwort_tags.py` hat jetzt eine **Synonym-Tabelle** (10 Tags, täglich): 127 Produkte getaggt (blusenkleid 47,
  gummistiefel 17, jeanskleid 16 …), Pilot `schwarz` auf 18 Ballerinas; Ledger `dropship/_suchwort_synonyme.tsv`. Wirkung: Ein-Wort-
  Vorschläge und Enter-Suche ja (gummistiefel 2/10 → 10/10, hosenrock, akkuschrauber), Zwei-Wort-Vorschläge kaum (nur hanteln set 1/3 → 3/3)
  → Synonymgruppen = Betreiber-Klick Search & Discovery. Ledger-Sperre je (ID, Tag) statt je ID; Aschenbecher/Contouring/Monitoring raus.
- ⚠️ Nachbesserung 11:00 UTC (Prüferbefund): der Grundwort-Teil hätte im nächsten Keepalive-Lauf `messer` auf «Durchmesser»/
  Messgeräte, `uhr` auf «Drahtzufuhr», `matte` auf Hängematten, `bohrer` auf Diamond-Painting-Stifte geschrieben und am alten
  Export-Titel entschieden. Jetzt: `messer` gestrichen (Klingen-Sperrtag anderer Wächter!), Kopfwort-Regel (nicht nach «mit/für»,
  nicht vor Bindestrich), Live-Titel, 25 Kanarienvögel als Abbruch-Tor; Trockenlauf 52 → 33, alle von Hand gelesen. Rückbau:
  `messer` von 46 Messgeräten, `matte` von 19 Hängematten (`dropship/_suchwort_tags_rueckbau_2026-10-05.tsv`).
- Tracker: +40 Begriffe mit Ziel-URL (jetzt 290). Sortimentslücken: Beamer-Leinwand 1'000/Mt, Holz-Bilderrahmen 720/Mt, Gaming-/Bürostuhl.
