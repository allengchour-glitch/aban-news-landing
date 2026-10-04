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
