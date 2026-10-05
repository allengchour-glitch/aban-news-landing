# Google-Adult: Rücklese Bildtausch, tausch-q-Sichtung, Hausregel-Nachprüfung (05.10.2026, 04:05–04:45 UTC)

Bereich «google-adult» des 12-h-Fixlaufs (Plan Punkt 2, Prüferbefunde Index 1). Alle Zahlen gemessen (Befehl in Klammern).

## 1. Ledger ≠ Live — Ursache und Reparatur

**Gemessen** (`google_bild_tausch.py --ruecklesen`, 04:10 UTC, alle 301 Handles mit letzter Ledger-Zeile tausch*):

| | tausch | tausch-g | tausch-q | Summe |
|---|---:|---:|---:|---:|
| live = Ledger-neu | 75 | 106 | 37 | 218 |
| **live ≠ Ledger-neu** (aktiv) | 28 | 50 | 5 | **83** |

Bei **78 der 83** lag exakt die Reihenfolge VOR dem Tausch (altes Bild an 0, gewähltes an 1). **Alle 83 alten Media-IDs stehen als
Quittung in `dropship/_textbild_geprueft.txt`**, 146 Zeilen in `_textbild_hits.txt` — Verursacher ist `textbild_fix.py`
(Aufseher-Loop, Neustarts 00:23/10:11/20:10): er beurteilt ein Hauptbild neu, sobald die Quittung nicht mehr zur ersten Media-ID
passt, hält Spitze/Mesh/Muster per Dunkel-Lauf-Heuristik für «Textbild» (Score 8–164) und holt das nächstbeste — das alte — nach
vorne. Der vom Prüfer vermutete Bild-Nachfüller erklärt nur die 4 Fälle «live0 ≠ alt».

**Getan:**
- `automation/bildtausch_sperre.py` (neu): Handles/IDs, deren letzte Ledger-Zeile tausch/tausch-g/tausch-q/nachgesetzt ist.
  `textbild_fix.py` und `hauptbild_ohne_text.py` fragen sie vor jedem Umsortieren (Quittung `bildtausch-sperre`). Probe live:
  `QUERY="handle:off-shoulder… OR handle:spitzentop…" textbild_fix.py` → «2 Bildtausch-Sperre, 0 umgestellt», media[0] unverändert.
- `google_bild_tausch.py --ruecklesen` (SCHARF=1): **82 nachgesetzt, 0 Fehler** (Ledger-Art `nachgesetzt`, Spalte 6 nennt Ursprungsart/-datum);
  1 abweichend bleibt bewusst (rock-field-cs-spike…, nicht im Google-Kanal). Rücklese danach: **geprueft 295 · ok 293 · abweichend 1 (nicht in Google) · nicht_aktiv 1**.
- `dropship/_google_bild_tausch_ids.tsv` (handle → Produkt-ID, 295 Zeilen) für die Sperre der anderen Umsortierer.
- Produkte ohne Google-Publikation werden im Tauschlauf übersprungen (Zähler `nicht_in_google`; Befund latex-gesichtsmaske).
- `zweitmodell.py`: leerer Groq-Schlüssel wird je Modell 6 h gemerkt (`/tmp/groq_leer_<n>`, `--leer` zeigt den Stand); greift beim
  nächsten `TagesKontingentLeer` — um 04:35 war noch keine Marke gesetzt (der 03:06-Lauf lief vor dem Patch).

## 2. tausch-q am Bild geprüft (42/42)

Kontaktbögen ALT | NEU | LIVE (`scratchpad/ga/tauschq_1..3.jpg`). Urteil Hand:
- **21 klar neutraler** (Produkt/Flat statt Model, Collage → Produkt): u. a. Beinwärmer, Ethno-Strandtuch, Festplatte, Rundhals-Pullover,
  Spitzentop V-Ausschnitt, Taillengürtel ×2, Off-Shoulder-Mesh, Ice-Silk-Maske, Bikini-Top Pailletten (Bar-Foto → Büste).
- **15 gleichwertig** (Model → Model, nicht mehr Haut): behalten — Google bekommt ein neues Bild zur Neuprüfung.
- **6 schlechter** (NEU zeigt mehr Haut/Schritt/Unterwäsche als ALT): `3-paar-20d-ultra-sheer…235970`, `3-paar-shiny…545090`
  (ALT war Produkt-only), `3er-pack-sheer-tights-40d…082753` (Schritt), `3er-pack-ultra-soft…382018` (ALT Produkt-only),
  `6-paar-plus-size…556481`, `strickkleid-mit-aushohlungen…504130` → **`--rueckweg` 6/6 zurückgedreht** (Ledger-Art `rueckweg`,
  Sperre freigegeben). Quote schlecht 6/42 = 14 % (< 50 % → kein Komplett-Rückzug).
- Die 5 tausch-q mit live ≠ Ledger (6-paar-20d, High-Neck-Bikini, Off-Shoulder-Mesh, Spitzentop, Taillengürtel Streetwear) waren alle
  gute Tausche → nachgesetzt.

**Bildtausch-Quote je Art** (`google_bildtausch_bilanz.py`, Scan 04.10. 22:02): tausch 78/103 frei (75 %) · tausch-g 113/156 (72 %) ·
uneinig 6/22 (27 %) · behalten 21/44 (47 %) · 36 Tausche nach dem Scan ungemessen (darunter alle tausch-q). ⚠️ Diese Quote
schliesst die 83 zurückgedrehten ein — der nächste Vollscan misst erstmals den Tausch allein.

## 3. 95 «Fehlalarme» nachgeprüft (Sperrlisten + Tierschutz-Regeln + Kontaktbogen `anstups95.jpg`)

| Fund | Entscheid |
|---|---|
| Stachelhalsband «Halsband mit Stimulationskette» | war schon DRAFT (Tierschutz-Wächter 00:28) — Regel `stachel-wuerge-halsband` trifft jetzt |
| **«Halsband für Hunde aus Metall»** (b3f5cc): Bild = Zugkette mit zwei Ringen ohne Stopp (Kettenwürger), Text «aus hochwertigem Silber» unbelegt | **DRAFT** + Tags `tierschutz-stachel-wuerge-halsband`, `tierschutz-pruefen` |
| **«Plüsch Angler Hut Neon Grün»** (Widmann, Anlass Fasnacht), Tag `kostuem-hut` — `kost[üu]m` traf die ASCII-Schreibung nicht | Tag `kostuem` → aus Google (sperrtags_durchsetzen) |
| **«Date Night Drinking Creative Brettspiel»**: Bilder «THE COUPLES ADULT BOARD GAME / DRUNK IN LOVE», Felder «Take off clothing», «Sexy Dare», «Climax» | Tags `18plus` + `adult-nicht-bewerben` → aus Google, TikTok, FB/IG, Pinterest; Onlineshop bleibt |
| 3 Maskenball-Masken | vom Kollegen (Plan 14) schon `kostuem` + aus Google; hier Tags `beauty/hautpflege/skincare/pflege` entfernt, Cold-Light-Maske Google-Kategorie Cosmetics → Masks |
| 3 Seiden-/Nylon-Gesichtsmasken (UV-Schutz), E-Gesichtsmaske | Sperrlisten-Treffer `maske\b` = Fehlalarm, bleiben |
| Leggings Po-Push-up / Figurkleid | vom Kollegen (Plan 14) erledigt (Vermerk `mode-messung`, Titel neu) — nicht doppelt angefasst |

Sperrliste `google_sperrliste.HEIKEL`: `kost[üu]e?m`, `halbmaske`, `maskenb[aä]ll`, `performance-?maske` ergänzt; Kanarienvögel 10/10
(Schlafmaske, Mascara, Sheet Mask, Maskenbildner bleiben frei). Rücklesen: Hut google=False (Shop/TikTok/FB/Pin bleiben), Spiel in
allen 4 Werbekanälen false, Halsband DRAFT. Ledger `dropship/_google_adult_hausregel_2026-10-05.tsv` (7 Zeilen, alt/neu).

## 4. Reizwörter in Texten (Befund 3)

Gemessen im Google-Kanal (225 Suchtreffer): **seo.description 17 · Beschreibung 175 (117 im ersten Absatz) · Alt-Text 50**, Titel/SEO-Titel 0.
`google_reiztitel.py --texte` (neu, Teil des Tageslaufs): Lauftext-Regeln mit Bindewörtern («sportlich-sexy» → «sportlich»,
«elegant und zugleich sexy» → «elegant», «eine sexy Note» → «eine modische Note», «im „Spicy-Girl“-Stil» → weg, `&amp;` erkannt,
Satzanfang nur an der Fundstelle gross), 18/18 Kanarienvögel, Diff-Prüfung 175 Bodies: HTML-Tags unverändert. **Scharf: 223 Produkte
(17 Meta, 175 Text, 50 Alt-Texte, 0 Fehler)**, Rückweg `dropship/_google_reiztitel_texte.jsonl` (alter Text je Feld). Rücklese: 0 verbleibend.
«Sexyness», «Sexysmart», Hot Wheels bleiben (keine Treffer der Wortgrenze).

## 5. Bewusst nicht
- Kein Neu-Anstupsen; keine Kundenmails/Erstattungen; CJ nicht berührt.
- `fixer_keepalive.sh` unverändert (Wächter-Block an den Hauptlauf): Rücklese + Bilanz täglich, siehe Hauptbericht.
- Google-Vollscan nicht ausgelöst (läuft täglich; Scan 22:02 ist die letzte Wahrheit).

## 6. NACHBESSERUNG 07:05–07:30 UTC — Prüfer «Sperre in der Produktion wirkungslos» (bestätigt, behoben)

**Befund gemessen:** `cd /tmp && python3 -c 'import bildtausch_sperre as b; print(b.LEDGER, len(b.gesperrte_handles()))'` →
`/dropship/_google_bild_tausch.tsv 0`. Der Aufseher startet `python3 /tmp/textbild_fix.py` (Spiegelkopie, `engine_keepalive.sh` 3b),
die importiert `/tmp/bildtausch_sperre.py`, dessen `REPO = dirname(dirname(__file__))` = «/». Folge: Lauf 04:43 «0 Bildtausch-Sperre,
92 umgestellt» → Rücklese 07:13 (SCHARF): **85 abweichend** (81 beim Prüfer um 06:11, dazu 2 nicht in Google, 2 nicht aktiv).
**Dieselbe Klasse** bei `google_sperrliste.py` (`gfeed_restore`/`google_sperrtags_durchsetzen` laufen ebenfalls aus /tmp): Merchant-Ledger
aus /tmp **0 statt 17** gesperrte IDs — still. Und `cj_takt.GLOBAL_DATEI` (`/dropship/_cj_vorrang_global`, Datei derzeit nicht vorhanden).

**Getan:**
- `bildtausch_sperre.py`, `google_sperrliste.py`, `cj_takt.py`: Repo-Wurzel über `_repo()` — Kandidaten `$REPO`, Lage der Datei,
  Arbeitsverzeichnis (der Aufseher läuft im Repo, `/proc/<pid>/cwd` gemessen), fester Pfad; gültig nur mit `dropship/` UND `automation/`.
  Fehlt das Ledger trotzdem → WARNUNG auf stderr (einmal je Datei), nie mehr still leer. Proben: aus /tmp **295/295**, aus `/` mit
  `REPO=/nirgends` **295**, Merchant-Ledger aus /tmp **17**, Warnpfad geprüft.
- Sperre zusätzlich in `bild_klein_fix.py` (lief 04:43–04:56 im selben Fenster, Aufseher-/tmp-Schleife), `bild_quadrat_auffuellen.py`,
  `bild_gross_nachladen.py` (beide reorder bei Tag `bild-zu-klein`): Produkt-ID in `_google_bild_tausch_ids.tsv` → nicht angefasst,
  Zähler «Bildtausch-Sperre» in der FERTIG-Zeile. Kopf-Proben aller drei: SPERRE_ID = 295.
- Alle acht Dateien nach /tmp gespiegelt (`cmp` Repo = /tmp für bildtausch_sperre, google_sperrliste, cj_takt, bild_klein_fix,
  bild_quadrat_auffuellen, bild_gross_nachladen, textbild_fix, hauptbild_ohne_text).
- `SCHARF=1 google_bild_tausch.py --ruecklesen` 07:13: **geprueft 295 · ok 208 · abweichend 85 · nachgesetzt 83 · nicht_aktiv 2 ·
  nicht_in_google 2 · bild_fehlt 0 · fehler 0**. Trocken danach: **geprueft 295 · ok 291 · abweichend 2 (beide nicht im Google-Kanal:
  latex-gesichtsmaske, rock-field-cs-spike) · nicht_aktiv 2 → 0 Abweichungen im Google-Kanal.** Stichprobe Admin-API 5/5 live = soll.
- Ende-zu-Ende wie der Aufseher: `QUERY=<3 nachgesetzte Handles> python3 /tmp/textbild_fix.py` → «2 gescannt, **2 Bildtausch-Sperre**,
  0 umgestellt», Quittung `bildtausch-sperre`, media[0] danach unverändert (wurstmaschine 70624198918529, winter-freizeitstiefel 70714356138369).
- Bilanz-Falle: 81 Doppel-`nachgesetzt`-Zeilen trugen «(nachgesetzt vom 2026-10-05)» → `google_bildtausch_bilanz` zählte **113** statt
  **36** «nach dem Scan ungemessen». Jetzt holt `bs.urspruenglicher_tausch()` Art+Datum der letzten echten Tausch-Zeile; die Rücklese-Notiz
  nennt künftig immer den Ursprung. Bilanz nachher: tausch 78/103 (75 %) · tausch-g 113/156 (72 %) · uneinig 6/22 · behalten 21/44 · 36 ungemessen.

**Lehre:** Ein Modul, das der Aufseher als /tmp-Kopie startet oder das eine /tmp-Kopie importiert, darf den Repo-Pfad nie allein aus
`__file__` ableiten — und ein fehlendes Ledger darf nie eine stille leere Sperre ergeben. Der Wächterblock misst darum täglich «Sperre aus /tmp = N».

**Nicht von mir committet:** Commit 074b0a811 (07:12, Session «Semrush») hat `google_sperrliste.py` und `cj_takt.py` mitgenommen;
`bildtausch_sperre.py`, `google_bild_tausch.py`, `google_bildtausch_bilanz.py`, `bild_klein_fix.py`, `bild_quadrat_auffuellen.py`,
`bild_gross_nachladen.py` und dieser Abschnitt sind uncommitted (Auftrag: nicht committen).
