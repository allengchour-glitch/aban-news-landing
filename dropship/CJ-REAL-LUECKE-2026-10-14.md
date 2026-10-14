# CJ-Ware ohne «cj-real» — für alle Lieferbarkeits-Wächter unsichtbar (14.10.2026)

**Klasse:** Aktive Produkte mit CJ-SKU ohne Tag `cj-real`. Alle Lieferbarkeits-Wächter wählen über diesen Tag
(cj_lager_abgleich, cj_verfuegbarkeit, cj_stock_guard, cj_varianten_wache, cj_versand_ch_sichtbar). Diese Produkte
bleiben deshalb kaufbar, auch wenn CJ ausverkauft oder ausgelistet hat (Ghost-Sale #1019, #1006, #1009).

## GEMESSEN (14.10., 13:15–14:10 UTC, nur lesend)

| Messung | Befehl / Abfrage | Zahl |
|---|---|---:|
| aktiv, CJ-SKU, ohne cj-real | `productsCount` EXACT `status:active AND sku:CJ* AND -tag:cj-real` | **1'331** |
| dasselbe mit `sku:cj*` (Kleinschreibung) | gleiche Abfrage | 1'331 (Suche ist nicht case-sensitiv) |
| davon Tag `werkzeug` | `… AND tag:werkzeug` | 1'084 |
| Entwürfe, CJ-SKU, ohne cj-real | `status:draft AND sku:CJ* AND -tag:cj-real` | 2'394 (2'074 `duplikat-auto-draft`) |
| aktiv mit cj-real | `status:active AND tag:cj-real` | 50'292 |
| aktiv mit CJ-SKU gesamt | `status:active AND sku:CJ*` | 51'623 (= 50'292 + 1'331) |
| cj-real ohne CJ-SKU | `status:active AND tag:cj-real AND -sku:CJ*` | 0 |

**Werkzeug-Trockenlauf** `python3 automation/cj_real_luecke.py` (DRY, Exit 1):
`CJ-REAL-LÜCKE: 1331 aktiv (CJ-Form 1330 · unprüfbar 1 · Werbetest-Sperre 0 · Entwürfe 2394 · DRY)`

- Tag-Muster: werkzeug 1'084 · ohne Gruppen-Tag 246 (Typ umgelegt, `werkzeug`/`heimwerken` von werkzeugKorb entfernt; 7 Altimporte Mai/Juni).
- SKU-Form: `CJ-<pid-Zahl>` 859 · `CJ-<pid-UUID>` 392 · `CJ<Varianten-SKU>` 79.
- Anlagemonat: Mai 2 · Juni 4 · August 831 · Oktober 493.
- Typ: Werkzeug & Heimwerken 1'075 · Basteln & DIY 36 · Haushalt 32 · Küche & Bar 29 · Auto 28 · …
- Sperr-Tags (bleiben, weil nur `tagsAdd`): raucher 16 · nur-onlineshop 13 · 18plus 5 · waffe-pruefen 2.
- Alle 1'331 stehen auf `CONTINUE` (erste 30 Varianten gelesen) = immer kaufbar.
- 20 Stichproben mit SKU: im Lauf-Ausdruck (z. B. `CJ-1364547776217747456` multifunktionales-schraubenschlussel-set, `CJJZGJSD00574-Red black no bag` klappzange-aus-edelstahl).

**Kanarienvögel (SKU-Regel):**
- `CJ-<pid-Zahl>`: Stichprobe 30/30 im CJ-Import-Ledger `dropship/cj_niche_done.txt`, alle 857/859.
- `CJ-<pid-UUID>`: Stichprobe 30/30 im Ledger, alle 392/392.
- `CJ<Varianten-SKU>`: 30 Stichproben, alle CJ-Form (`CJYD…01AZ`, `CJJZGJSD00…-Farbe`, `CJLY…`, `CJSL…`), Lieferant LuxeStyle.
- **Falscher Treffer von `sku:CJ*`: 1** — `CJ-SHOWERCADDY-5SET` (dusch-organizer-set-aqua, 13.06.), frei getippter Slug ohne CJ-pid.
  Das Werkzeug taggt ihn NICHT («unprüfbar»). `ohne_lieferantenref_guard` meldet ihn schon als «❓» (Log), draftet ihn aber nicht.
- Positiv: plum-blossom-magnetischer-bohrschrauber-fe11c7, reise-rucksack-mit-kettengriff (31.05.), auto-schiebedach-ablaufreiniger-614500 → alle drei Kandidaten.
- Negativ: von 2'900 aktiven ohne cj-real und ohne `sku:CJ*` (2'376 Fortura, 471 Printful, 43 Hand-/LX-Slugs, 10 Gelato-UUID) hat **0** eine CJ-Form.
- **Gegenfall** `--gegenfall`: CJ-Ware mit rein numerischer SKU oder UUID ohne «CJ»: **0** (10 pid-förmige = Gelato-Poster, 0 im CJ-Ledger). «cj» klein: in den 1'331 schon enthalten.
- Werbetest-Sperre: 0 der 13 Produkte unter den 1'331. Die Sperrdatei verbietet bis 24.10. auch Tags — das Werkzeug fragt trotzdem je Produkt.

**Quelle:** `automation/cj_groups_extra.json`, Gruppe `cjwerkzeug` hatte `['werkzeug','heimwerken','neu']`, alle 13 anderen `cj-real` + `dropship`.
`cj_category_fill.mjs` übernimmt die Gruppen-Tags 1:1 → jedes Werkzeug-Produkt ohne `cj-real`.

**CJ-Importpfade (alle geprüft):**

| Pfad | legt an | cj-real |
|---|---|---|
| `automation/cj_category_fill.mjs` (+ GROUPS_FILE `cj_groups_extra.json`; gestartet von cj_runner_template.sh, cj_queue_runner.sh, cj_perpetual.mjs) | productSet | **fehlte für cjwerkzeug** → repariert |
| `automation/cj_trending_import.mjs` (cj_perpetual) | productSet | fest im Tag-Array (Z. 344) |
| `automation/cj_sku_import.mjs` (cj_queue_runner, schulstart_lauf) | productSet | fest (Z. 399) |
| `automation/cj_gaps_import.mjs` | productSet | fest (Z. 268) |
| `dropship/cj_autopilot.mjs` | productSet | fest (Z. 271) |
| `dropship/cj_variants_new.mjs` | schreibt nur ein JSON aus `TAGS=` (Handaufruf) | hängt vom Aufrufer ab |
| cj_variant_backfill, schulstart_varianten, auswahl_nachruesten | ändern bestehende Produkte | — |

**Tag `dropship`:** keine Abhängigkeit gefunden — grep über automation/tools/dropship (0 Auswahl über den Tag), Live-Theme
«Horizon · LuxeStyle + Email-Popup (Claude)» 436 Dateien: 0 Treffer «dropship», 568 Kollektionen: 0 Regeln auf `dropship`.

**Nebenwirkungen des Tags (gemessen):**
- Smart-Kollektionen: nur `spielzeug-neuheiten` regelt auf `cj-real` (UND `spielzeug`); 0 der 1'331 tragen `spielzeug` → keine Änderung.
- **Live-Theme `templates/product.json`, Block `lux_sizeguide`:** Produkte mit Option «Grösse/Size» UND `cj-real` zeigen
  «📏 Diese Ware ist asiatisch konfektioniert und fällt eher kleiner aus. Im Zweifel eine Nummer grösser wählen».
  Unter den 1'331 haben 21 eine Grössen-Option: 2 Damenmode (Hinweis richtig), **19 Nicht-Bekleidung** (Messschieber «4–12 Zoll»,
  Schubladenschiene «182 mm», Backform «4 Zoll» …) — dort ist der Hinweis falsch. Das gilt heute schon für alle cj-real mit
  Grössen-Option (Zahl nicht gemessen); der Nachtrag erweitert es um 19.
- Weitere Leser von `tag:cj-real`: `cj_reviews_import` (kostet CJ-Punkte je Produkt, Judge.me-Regeln gelten), `queue_new_products`
  (die 50 neuesten cj-real → Social-Queue; die Werkzeuge von heute kommen dazu), `cj_variantenbild`, `bewertungen_prio`.

## GETAN

1. **Quelle:** `automation/cj_groups_extra.json` — `cjwerkzeug` bekommt `cj-real` und `dropship` (jetzt 14/14 Gruppen).
2. **Importer** `automation/cj_category_fill.mjs`: Zeile `CJ_REAL_PFLICHT` — jede Ware mit SKU `^CJ` bekommt `cj-real`
   in `tagsFinal`, nach allen Tag-Filtern und unabhängig von der Gruppe (die Nachschreibe-Pfade bauen auf `tagsFinal` auf).
   Dazu: der Bild-Fehlerpfad setzte `productUpdate(status:'DRAFT', tags:['bilder-fehlgeschlagen'])` — das ersetzte ALLE Tags
   (2 solche Entwürfe gemessen). Jetzt Status per productUpdate, Tag per `tagsAdd`. `node --check` grün.
3. **Neu `automation/cj_real_luecke.py`:** zählt (EXACT, aktiv + Entwürfe), listet (DRY Standard), teilt in
   CJ-Form / unprüfbar / Werbetest-Sperre; `SCHARF=1` → `tagsAdd ['cj-real']` in Alias-Bündeln à 20, höchstens `CAP` (500) je Lauf,
   neueste zuerst, je Bündel zurückgelesen, nur Bestätigte ins Ledger `dropship/_cj_real_nachtrag.tsv` (zeit, gid, handle).
   `--zurueck` (tagsRemove aus dem Ledger), `--pruefen` (nur Zeile), `--gegenfall`, `--selbsttest` (ohne Netz, 23/23 grün:
   jede Gruppe hat cj-real + Köder, 14 SKU-Kanarien, Importer-Zwangszeile + Köder, Alias nur tagsAdd, Fehler nie 0, Ledger-Rückweg).
   Gegenprobe Selbsttest gegen `git show HEAD:` (alte Fassung): Importer-Prüfung falsch, Gruppen ohne Tag = `['cjwerkzeug']`.
4. **Nicht geschrieben:** kein SCHARF-Lauf, keine Shopify-Mutation (Auftrag). Der Nachtrag läuft, sobald die Aufseher-Zeile steht.

## FOLGEN FÜR DIE WÄCHTER (nur gelesen, nichts geändert)

- **cj_lager_abgleich.py** (Bestand je Variante): liest den Bulk-Export `tag:cj-real status:active` aus `/tmp/cj_lager_export.jsonl`,
  Cache **20 h** (heute 13:10 gebaut). Ohne Eingriff sieht er die Neuen erst nach dem 15.10. ~09:10 UTC.
  Kann nur Produkte mit ableitbarer productSku abfragen: **31 der 1'330**. Die 1'299 mit pid-Zahl/UUID landen als
  `keine-cj-sku` im Ledger (kein CJ-Punkt, aber auch kein Schutz). Reihenfolge: besuchte Seiten (4 der 1'330), dann nie geprüft
  → die 31 sind im ersten Lauf dran. Kosten: ~31 Abfragen, über die Zusatzkonten.
  Hinweis (kein Code): wer den Abgleich sofort will, setzt nach dem ersten SCHARF-Lauf
  `touch -d '2 days ago' /tmp/cj_lager_export.jsonl` — der nächste stündliche Start baut den Export neu.
- **cj_verfuegbarkeit.py** (gibt es das Produkt bei CJ noch; alle drei SKU-Formen): liest `/tmp/export.jsonl` (≤ 36 h) minus Ledger.
  0 der 1'330 im Ledger. **Er verhungert schon heute:** Rückstand 4'105 ungeprüfte cj-real (Log 11:11), jeder Tageslauf endet
  nach 1 Produkt («Punkte-Restbudget 2 < 400»). Ledger-Wachstum gemessen (git): 01.10. 49'618 → 07.10. 50'308 → 13.10. 50'968
  = **~110 Prüfungen/Tag**. Mit den 1'330 sind es ~5'400 offen = **~7 Wochen**. Reihenfolge = Datei-Reihenfolge des Exports,
  nicht neueste/besuchte zuerst. Jedes «ok» gilt für immer (kein Nachprüfen).
- **cj_varianten_wache.py**: nur mehrvariantige — **72 der 1'330**; braucht `/tmp/export.jsonl` mit dem Tag und
  `/tmp/opts_frisch.jsonl` (11.10.; Produkte danach erst nach dem 7-Tage-Neubau). 1 CJ-Abfrage je Produkt, LIMIT 1500, 30 T.
- **cj_versand_ch_sichtbar.py**: nimmt aus den 1'330 die Klingen/Schärfer (Stichprobe: «schleifstein-fur-die-kuche») und die
  gelisteten Landeseiten dazu.
- **cj_ausgelistet_sichtbar.py** (#1019): wählt über Sichtbarkeit (Kollektionen, Landeseiten, kunden-liebling), NICHT über den Tag —
  sichtbare Werkzeuge waren dort schon abgedeckt (Umfang für die 1'330 nicht gemessen).
- **cj_stock_guard.mjs**: Standard `tag:cj-real`, steht in keiner Startliste.

**Urteil:** Der Nachtrag macht die 1'330 sichtbar; sinnvoll priorisiert wird danach nur bei cj_lager_abgleich (nie geprüft zuerst),
und dort fehlen 1'299 wegen der SKU-Form. Für die Existenzprüfung ist ein **Nachlauf über Wochen** nötig.

## OFFEN

1. ✅ **ERLEDIGT 14.10. ~15:30–15:45 UTC (Hauptsitzung):** drei SCHARF-Läufe 500 · 500 · 330 nachgetragen, 0 nicht bestätigt; Nachmessung `--pruefen` → «1 aktiv (CJ-Form 0 · unprüfbar 1)». Aufseher-Zeilen eingetragen (Tagesliste, NACH, EXP SCHARF=1); `/tmp/cj_lager_export.jsonl` gealtert, damit cj_lager_abgleich die 1'330 beim nächsten Lauf mitnimmt.
2. **Gleichlauf nach dem Nachtrag messen:** `status:active AND tag:cj-real` 50'292 → ~51'622; `--pruefen` → `CJ-Form 0 · unprüfbar 1`.
   Die Rohzahl bleibt 1 (Dusch-Organizer, Slug) — Soll ist «CJ-Form 0».
3. ✅ **BEHOBEN 14.10. ~18:30 UTC (Runde 16:26, `dropship/CJ-LAGER-PID-2026-10-14.md`):** ~~Neue, grössere Klasse:~~ cj_lager_abgleich kann pid-Formen nicht abfragen. Im eigenen Export
   (50'293 cj-real) sind **23'209 `CJ-<Zahl>` + 4'610 `CJ-<UUID>` = 27'819 ohne Bestandsprüfung**; Ledger letzter Stand
   30'928 × `keine-cj-sku`. Weg: productSku per `product/query?pid=` holen (nicht geprüft).
4. **cj_verfuegbarkeit verhungert** (Rückstand 4'105 vor dem Nachtrag, ~110/Tag): Priorisierung «besucht/beworben/neu zuerst»
   oder eigenes Punkte-Fenster — Betreiber-/Hauptsitzungs-Entscheid.
5. **Theme-Hinweis «asiatisch konfektioniert»** für Nicht-Bekleidung mit Grössen-Option (19 aus dieser Klasse, Bestand nicht gemessen):
   Bedingung auf Bekleidungs-/Schuh-Typen einschränken.
6. **Dusch-Organizer `CJ-SHOWERCADDY-5SET`** aktiv ohne Lieferantenreferenz (#1008-Klasse) — `ohne_lieferantenref_guard` meldet nur.
7. **Risiko beim Draften:** cj_verfuegbarkeit setzt DRAFT ohne 301. Unter den 1'331 laut Richter 9 GSC-Seiten (1 Klick:
   auto-schiebedach-ablaufreiniger-614500) — nach dem Nachtrag beobachten.
8. Nicht geprüft: wie viele der 1'330 bei CJ wirklich weg/ausverkauft sind (CJ-Topf leer ab ~04:26 UTC).

## Aufseher (automation/fixer_keepalive.sh)

Tagesliste `for L in … anlass_social_sperre` → `… anlass_social_sperre cj_real_luecke; do`
NACH-Liste `case " social_queue_saeubern … startseite_schlank_patch "` → `… startseite_schlank_patch cj_real_luecke "`
EXP (bei den anderen `[ "$L" = … ] && EXP="SCHARF=1"`):
```
    # 14.10.2026: CJ-Ware ohne «cj-real» (1'331 gemessen, Gruppe cjwerkzeug) — für alle Lieferbarkeits-Wächter unsichtbar. Nur tagsAdd,
    # CAP 500 je Lauf, Ledger dropship/_cj_real_nachtrag.tsv. Exit 0 = nichts offen (FERTIG), 1 = offen (nächster Tick), 2 = PAUSE 1 h.
    [ "$L" = cj_real_luecke ] && EXP="SCHARF=1"
```
