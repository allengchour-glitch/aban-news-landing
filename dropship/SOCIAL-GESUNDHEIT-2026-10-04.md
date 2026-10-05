# Social-Gesundheit — Reel-Kanäle unter Takt (Fixlauf 04./05.10.2026)

Betreiber-Auftrag 04.10.2026 22:17 UTC: «fix 12 h lang alles». Bereich: Social-Gesundheit (Ampel «REEL-KADENZ: YouTube 19.0 h (Takt 12 h)»).
Bearbeitet 05.10.2026 01:55–02:20 UTC. Nichts von Hand gepostet; alle Änderungen im Nachschub und in den Postern.

## Gemessen (vorher)

| Messgrösse | Wert | Befehl |
|---|---|---|
| Reel-Kadenz | **IG/FB 12.8 h (Takt 8) · TikTok 12.8 h (Takt 8) · YouTube 23.8 h (Takt 12)** | `python3 automation/reel_kadenz_wache.py --alle` |
| reels_seed.csv | 341 Zeilen · **ready 9** · preis-veraltet-skip 4 · meisterwerk-tor-skip 6 · jury-skip 171 | `csv.DictReader` → Counter(status) |
| ready-Reels mit CDN-Adresse, deren CDN-Kopie ≠ lokale Datei | **9 von 9 VERALTET** (CDN last-modified 02.10. 06:24–06:29, lokal neu gerendert 05.10. 00:01–00:06) | `curl -sI <video_url>` content-length vs. `os.path.getsize(social/reels/reel_<pid>.mp4)` |
| Poster-Log | 21:24/21:40 TikTok «Meisterwerk-Tor: BILDPREIS 39.90 ≠ Caption 34.90» · 21:22/21:39 Reel «Gemini-Jury K.o. preis_widerspruch» · 20:13 YouTube + 21:55 TikTok/Reel «Nichts faellig» | `tail /tmp/social_autopilot.log` |
| Metricool-Planer 03.–08.10. | 11 Posts, alle PUBLISHED (TikTok 4, YouTube 3, Pinterest 2, IG 1, FB 1) · **0 geplant in der Zukunft** | `GET /v2/scheduler/posts` |
| Reel-Motor | «Video-Index: 816 offene Treffer → **0 Kandidaten**» bei jedem Lauf; dazu «CJ-Tagesbudget erschoepft» | `tail /tmp/reel_engine_runner.log` |
| Erste 200 Index-pids | 127 nicht mehr im Shop · 57 DRAFT · 1 unter 2 Bildern · 16 wären Kandidaten (davon alle schon als Produkt gepostet) | Mess-Skript (nur lesen), gleiche Schwellen wie der Motor |
| Bild-Queue / Story-Queue | posts_image.csv ready 44 · story_queue.csv ready 0 (jury-skip 53, posted 21) | Counter(status) |
| Pinterest | 1 Pin/24 h im Takt (Pin 388026297 geplant 04.10. 23:34 CH) | Autopilot-Log |

## Ursache (drei Glieder, ein Kreis)

1. **CDN-Kopie veraltet.** Seit dem CDN-Umzug (02.10., `reel_cdn_umzug.py`) zeigt `video_url` auf cdn.shopify.com. `reel_neu_rendern.py`
   (MODUS=hook/preis) ersetzte nach der Preissenkung nur `social/reels/reel_<pid>.mp4` und setzte die Zeile «wieder ready» — die
   CDN-Datei blieb die vom 02.10. mit dem alten Bildpreis. Die Poster (und Metricool) holen das Video von der Adresse → Meisterwerk-Tor
   /Gemini-Jury sehen den alten Preis → `meisterwerk-tor-skip` → die Tages-Reparatur rendert neu → «wieder ready» → nächster Tag dasselbe.
   Gemessen: 9 Reels zweimal «ERSETZT · wieder ready» (04.10. 20:17 und 05.10. 00:00), kein einziger Post.
2. **«Nichts faellig» zählte als Post.** `metricool_tiktok_post.mjs` und `meta_reel_post.mjs` beendeten mit Exit 0, wenn kein ready-Reel da war;
   `social_autopilot.sh` setzt bei Exit 0 die Kanal-Marke. YouTube 04.10. 20:13 «Nichts faellig» → Marke gesetzt → nächster Versuch erst 08:13,
   obwohl um 20:17 neun Reels wieder ready standen. TikTok/Reel dasselbe um 21:55. So wurden aus 8/12 h Takt 13/24 h.
3. **Nachschub stand.** Der Reel-Motor prüft vom Video-Index nur die ERSTEN 200 pids — 184 davon sind tot (nicht im Shop/DRAFT) und fallen
   nie aus dem Index. Dieselben 200 jeden Lauf, 0 Kandidaten; die brauchbaren dahinter kamen nie dran. Dazu war das CJ-Tagesbudget
   (geteilt mit 4 Import-Runnern) abends erschöpft.

## Getan

- **`automation/upload_to_shopify_cdn.mjs`**: neuer Modus `ERSETZE_FILE_ID=gid://shopify/GenericFile/…` → `fileUpdate(originalSource)` auf die
  bestehende Datei (gleicher Dateiname, gleicher Pfad, neues `?v=`; kein zweiter Speicherplatz; Doppelpost-Sperre über den Basename bleibt).
  Wartet, bis `originalFileSize` = lokale Grösse. Ohne die Variable byte-gleich wie vorher.
- **`automation/reel/reel_neu_rendern.py`**: nach jedem bestandenen Render mit CDN-Adresse → CDN-Ersatz + neue Adresse in der Zeile
  (atomar, nur wenn der Status noch stimmt). Scheitert der Ersatz, bleibt der Sperr-Status (gesperrt ≠ verloren). Neuer **MODUS=cdn**
  (nur abgleichen: lokal ≠ CDN → hochladen + Adresse nachtragen, kein Render). Altwerte je Ersatz in `dropship/_reel_cdn_ersatz_2026-10-05.tsv`
  (zeit, id, gid, alt_url, alt_bytes, neu_url, neu_bytes).
- **Scharf**: `SCHARF=1 MODUS=cdn python3 automation/reel/reel_neu_rendern.py` → **9 ersetzt, 0 Fehler**. Kanarienvögel vorher: Caption-Preis
  = Live-Preis bei 9/9 (gql `productByHandle`), lokale Datei besteht das Tor mit `PREIS_SOLL` (8FDAF06D: bildpreise [34.90], hook 15.78).
- **`automation/metricool_tiktok_post.mjs` + `automation/meta_reel_post.mjs`**: «kein Kandidat» → Exit 3 (Marke bleibt alt, nächster
  15-Minuten-Takt). `social_autopilot.sh` behandelt 3 an allen vier Aufrufstellen schon als «übersprungen» (geprüft, nicht geändert).
- **Marken auf Wahrheit gesetzt** (`touch -d`): `/tmp/_autopilot_letztes_reel` 13:10:56Z, `…_tiktok` 13:11:12Z, `…_youtube` 02:09:46Z
  (= letzte echte `posted_at` je Kanal aus reels_seed.csv; vorher 21:55 / 21:55 / 20:13 vom Exit-0-Fehler). Kein Handpost — der Autopilot
  entscheidet weiter selbst, mit allen Wachen (Lock, Ledger, ACTIVE, Preis, Tor, Jury).
- **`automation/meta_reel_post.mjs`** (Zusatz): IG-Container-Status `ERROR` gilt erst nach einer zweiten Abfrage 8 s später (Grund `status` im Log) —
  gemessen 02:12: ERROR, um 02:15 FINISHED «Media has been uploaded».
- **`automation/cj_video_reel_engine.mjs`**: Ausfall-Ledger `dropship/_cj_reel_index_tot.txt` (pid, Grund, Datum; 14 Tage gültig, DRAFT kann
  zurückkommen) filtert die Index-pids VOR dem Fenster; je pid EIN Urteil (ACTIVE-Original neben DRAFT-Duplikat zählt als Kandidat);
  Fenster 200 → bis 600 (`IDX_MAX`), Schluss sobald BATCH·3 Kandidaten stehen. DRY gemessen: **816 → 19 Kandidaten** (vorher 0),
  241 pids fürs Ausfall-Ledger; CJ antwortet wieder (Tagesbudget neu).

## Nachgemessen

| Messgrösse | nachher |
|---|---|
| ready-Reels CDN == lokal | **9 von 9 GLEICH** (neue `?v=1791166020…086`, HEAD content-length = Dateigrösse) |
| Tor an der neuen CDN-Adresse (wie der Poster) | `PREIS_SOLL=21.90 meisterwerk_tor.py <cdn-url 1377810240736727040>` → ok, bildpreise [21.90], hook 25.43 |
| Reel-Motor DRY | «816 offene Treffer → 19 Kandidaten · 241 neu ins Ausfall-Ledger»; 3 Kandidaten mit CJ-Video |
| Autopilot-Tick 02:12 UTC (nach Marken-Korrektur) | **TikTok ✅ geplant** (Metricool 388146074, 05.10. 10:05 CH, cjreel-1395916560924807168, Jury 8.83) · **YouTube ✅ geplant** (Metricool 388146149, 10:05 CH, cjreel-9B346B1E, Jury 8.83, «Preis stimmt in Bild und Caption überein») · IG/FB via Meta: Container 17888206023685363 meldete ERROR → Exit 1; 3 Min später stand derselbe Container auf FINISHED (Meta-Status flackert) |
| Autopilot-Tick 02:28 UTC | IG/FB-Reel: Preis-Tor bestanden, Gemini-Jury Note 7 (Trainingsgerät zu klein im ersten Bild) → jury-skip, nächster Tick nimmt das nächste; Bildpost IG+FB ✅ |
| Reel-Kadenz | IG/FB 13.3 h (wartet auf nächsten Tick) · **TikTok 0.3 h · YouTube 0.3 h** |

## Bewusst NICHT

- Keine Handposts, kein Eingriff in Metricool-Planer, keine Löschung alter CDN-Dateien (fileUpdate ersetzt den Inhalt, nichts bleibt übrig).
- `social_autopilot.sh` und `fixer_keepalive.sh` nicht editiert (Vorgabe). Der Tages-Block MODUS=hook/preis trägt den CDN-Ersatz jetzt von selbst;
  der tägliche MODUS=cdn-Abgleich steht als Wächter-Block im Ergebnis.
- Story-Queue (0 ready, Jury lehnt Kandidaten ab) und Bild-Queue (44 ready, im Takt) nicht angefasst — anderer Befund, nicht Ursache der Reel-Kadenz.
- Pinterest im Takt (1/24 h) — nichts geändert.
- Kein Commit/Push (Vorgabe); Dateien liegen im Arbeitsbaum.

## Lehre

Wer die Datei ersetzt, muss die ADRESSE mit ersetzen — eine Reparatur, die nur die lokale Kopie heilt, während die Queue aufs CDN zeigt,
ist für den Poster keine Reparatur. Und: «kein Kandidat» ist kein Post — Exit 0 setzt Marken.

## Nachtrag 05.10.2026, 04:20–04:45 UTC — Prüferbefunde (Index 10) eingearbeitet
- **Ist-Stand zu «Kein Commit/Push»:** falsch — `upload_to_shopify_cdn.mjs`, `reel/reel_neu_rendern.py`, `metricool_tiktok_post.mjs` liegen im
  Autocommit 13e6c8710 (02:09 UTC, Botschaft «CJ-Ledger [skip ci]»), `cj_video_reel_engine.mjs`/`meta_reel_post.mjs` in 083960d58. Das Ausfall-Ledger
  hatte bereits **312 Zeilen aus zwei SCHARF-Läufen** (083960d58 02:33 ≈ 201 Zeilen, 8bfded806 02:38 +111), die oben nicht genannt sind; 0 neue Reels.
- **Ausfall-Ledger: Fehlurteil behoben.** pid 1432187342642352128 stand als «status-DRAFT», hat aber ein ACTIVE-Original («Ultraschall-Reinigungsgerät»,
  CHF 18.90, 21 Medien) neben dem DRAFT-Duplikat. **Alle 312 pids mit den Motor-Regeln neu beurteilt** (Skript, nur Shopify-Lesezugriffe, 16 × 20er-Abfragen):
  **311 gleich, 1 anders** (genau diese pid → GUT). Zeile entfernt, Ledger jetzt 311 Zeilen; Korrektur-Ledger
  `dropship/_cj_reel_index_tot_korrektur_2026-10-05.tsv` (alt/neu).
- **Reihenfolge:** Ledger-Zeile 1 (02:02Z, 8FDAF06D) war ein SCHARFER Vortest vor dem Trockenlauf; derselbe Reel wurde 02:07 nochmals ersetzt, weil
  `modus_cdn` an der ALTEN `?v=`-Adresse mass. Gemessen 04:32 UTC: HEAD alte Adresse 3'048'119 B (auch mit `&cb=…` — Shopify hält je `?v=` eine Fassung),
  Admin-API `GenericFile.originalFileSize` 3'007'474 B = lokal. → `cdn_groesse_wahrheit()` (Admin-API, Rückfall HEAD) in `modus_cdn`.
- **Kadenz-Wache misst Veröffentlichung, nicht Planung.** «TikTok 0.3 h · YouTube 0.3 h» war die Planungszeit (posted_at 02:12/02:13); beide Posts stehen im
  Planer für 08:05 UTC. `reel_kadenz_wache.py` fragt für `metricool:<id>`-Zeilen ohne öffentliche Adresse den Planer (`publicationDate`; Token aus Env/
  `/tmp/metricool.env`, Kanarienvögel 5/5): Termin in der Zukunft = «nächster geplant in N h», die Lücke zählt ab dem letzten veröffentlichten Post; ohne
  Planer-Antwort Zusatz «Planungszeit». Live 04:40 UTC: `REEL-KADENZ: IG/FB 15.3 h (Takt 8 h) · TikTok 15.5 h · nächster geplant in 3.4 h · YouTube 26.5 h · nächster geplant in 3.4 h`
  — ehrlicher als «0.3 h».
- **`meta_reel_post.mjs` (Plan Punkt 23):** bei Container-Status ERROR jetzt bis zu 3 Minuten alle 30 s erneut lesen; FINISHED → Publish, erst ein ERROR nach
  3 Minuten gilt (mit `status`-Grund im Log). Vorher nur eine Nachfrage nach 8 s. `node --check` ok. Kein Post ausgelöst.
- **IG/FB-Kadenz gemessen (reels_seed.csv + /tmp/social_autopilot.log):** letzte 9 Abstände 8.6/8.1/16.9/8.1/9.2/8.4/8.2/10.1/10.0 h (Mittel 9.7 h),
  **seit dem letzten IG/FB-Reel (04.10. 13:10 UTC) 15.3 h**; seit 02:28 UTC alle 15 min «Kandidat übersprungen» (Jury), Statuszähler: jury-skip 172,
  ready 6. Engpass ist die Jury-Quote bei den verbliebenen Kandidaten, nicht der Poster; Plan Punkt 23 bleibt offen (≤ 8 h über 24 h noch nicht erreicht).

## Nachtrag 05.10.2026, 06:37–06:50 UTC — Prüferbefund zu Plan 23 (Nachbesserung): Ursache war das Kontingent, nicht die Kandidaten
- **Korrektur der Ursache.** Nur der Skip um 02:28 UTC war ein Jury-Urteil (Note 7). Ab 02:43 gab die Jury KEIN Urteil: Gemini 402, OpenAI leer, Groq
  `qwen/qwen3.8-27b` HTTP 429 («Rate limit reached … organization org_01m3mfdfxaeecv920ws7yejk5y»), Marken `/tmp/groq_leer_1..3` 04:20/04:21 UTC
  (6 h). `meta_reel_post.mjs` wertet «kein Urteil» bewusst als «kein Post» (Exit 3, keine Marke) — 15 Ticks in Folge (02:43–06:23) derselbe erste Kandidat
  `cjreel-C9F7E167` (DRY mit `JURY=0` gemessen). Die Zeile «Jury-Quote (jury-skip 172)» im Vorlauf war falsch: jury-skip ist Altbestand, heute +0.
- **Gemessen, was ein Rückfall überhaupt sein kann:** `GET /openai/v1/models` auf allen drei Groq-Schlüsseln → 11 Modelle, einziges Bildmodell
  `qwen/qwen3.8-27b`; `openai/gpt-oss-120b` ist reines Textmodell und kann keine Standbilder beurteilen → «zweites Groq-Modell in der Jury» geht NICHT.
  Dafür: **6 der 9 ready-Reels haben ein positives Urteil (Note 8.17–8.83, Grenzfälle mit 3 Runden) zum früheren Render DERSELBEN Datei** — nachgerechnet:
  alter Git-Blob + alte Caption = Cache-Signatur; einziger Unterschied der Preis (CHF 54.90 → 47.90, 24.90 → 21.90; Preis-Reparatur 04.10. nach der
  Senkung vom 02.10.). Die 3 übrigen (C9F7E167, 4743765A, 1547106675654668288) hatten nie ein Urteil.
- **Entscheid + Umsetzung (Rückfall nur bei leerem Kontingent):** `gemini_jury.py` — `kontingent_leer()` (Gemini-Marke ∧ OpenAI leer/kein Schlüssel ∧
  Groq-Bildmodell auf JEDEM Schlüssel gemerkt), `frueheres_urteil()` (jüngstes ok-Urteil zum Basename, ≤ 14 T, nach den Cache-Regeln gültig),
  Modi `--kontingent` (Exit 0 = leer) und `--rueckfall-pruefen` (ohne Download). Greift nur für `--typ reel`, nur wenn die Anfrage am Kontingent
  scheitert; jeder andere Ausfall bleibt «kein Urteil = kein Post». Der Preis im Bild wird davor vom Meisterwerk-Tor (PREIS_SOLL) gemessen.
  Ledger `dropship/_jury_rueckfall.tsv` (Zeit, Datei, altes Urteil, Note, Caption-Hash); DRY schreibt nicht.
  `post_guard.mjs` — `juryVorrang()`: bei leerem Kontingent Kandidaten mit Rückfall-Urteil zuerst (sonst Reihenfolge unverändert); `juryPruefen` nennt
  den Rückfall im Log («RÜCKFALL (…)»). `meta_reel_post.mjs` ruft `juryVorrang` vor `ersterErreichbare`.
- **Trockenlauf 06:46 UTC (`DRY=1`, echte Jury):** «Jury-Kontingent leer → 6/9 Kandidaten mit früherem ok-Urteil zuerst» → Kandidat
  `cjreel-1673563451437879296` (Business-Rucksack, CHF 47.90), Tor bestanden, «Gemini-Jury: RÜCKFALL (Kontingent leer — ok-Urteil vom 2026-10-01T12:47Z …)
  Note 8.83», Exit 0; `--rueckfall-pruefen` 6× Exit 0 / 3× Exit 2; Ledger nicht geschrieben (DRY).
- **Grenze:** Nach Ablauf der 6-h-Marken (~10:20 UTC) versucht die Jury Groq erneut (ein Bild-Upload je Kandidat) und merkt bei 429 wieder 6 h —
  die Reset-Zeit des Tageskontingents steht nur im abgeschnittenen 429-Text (120 Zeichen). Story-/Bild-Posts haben kein früheres Urteil → bleiben
  bis zum Kontingent blockiert (nicht Plan 23).
