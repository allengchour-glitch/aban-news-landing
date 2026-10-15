# Ledger-Schrumpf-Tor: kein Ledger in dropship/ schrumpft mehr still (15.10.2026, Verbesserungsrunde 00:25 UTC)

## GEMESSEN
- **15.10. 00:18–00:21 UTC:** `dropship/_cj_lager.tsv` fiel im Arbeitsbaum von **58'834 auf 198 Zeilen**.
  - Der Reel-Motor committete den Stand über `git_sichern.sh` (`git add -A dropship/`, Commit ab536a2f1).
  - Gleich danach fiel `_cj_nachpruefung.tsv` von **8'842 auf 10 Zeilen** (ad98acf1d, mein eigener Ledger-Commit 00:21:59).
  - In diesem Ledger stehen die eigenen Lagersperren und die 21-T-Wiedervorlagen des Lagerabgleichs. Ohne sie gibt der
    Abgleich eigene Sperren nicht mehr frei und fragt alles neu ab.
- **Rettung war Zufall:**
  - `_cj_lager.tsv` kam über einen Hand-Merge mit origin zurück (Union, danach chronologisch geprüft: keine Rücksprünge > 1 h).
  - `_cj_nachpruefung.tsv` lag **18 Minuten geschrumpft auf origin**, weil der Merge dort konfliktfrei durchlief.
- **Verlauf 14 T** (`git log --numstat` über dropship/*.tsv|*.txt|*.jsonl): 38 Kürzungen ≥ 200 Zeilen. Absichtlich sind die
  neu gebauten Listen `_klassen/*` (19×) und `_bewertungen_prio.txt` (14×). **Drei waren Unfälle:**
  - die zwei oben
  - `_versand_jenachland.txt` 14'403 → 1'452 am 02.10. («Konfliktmarker entfernt»), nie bemerkt
- **Auslöser nicht belegbar:**
  - Beide Schreiber hängen nur an (`open(…, "a")`).
  - Im Fenster gab es laut reflog keinen Merge, keinen Stash, kein Reset und keinen Container-Neustart (Start 00:09).
  - Es gibt keine Filter oder Merge-Treiber, und der Speicher war nicht voll (89 %).
- **Gefundene Schwachstelle:** `lib/git_aufloesen.sh` vereinigte eine fehlende Konfliktstufe als **leere Datei** und kopierte das
  Ergebnis über das Ledger.

## GETAN
1. **`automation/ledger_schrumpf_tor.py`** + Regeln `automation/ledger_regeln.json` (Selbsttest 8/8 im Wegwerf-Repo):
   - Ein Ledger (Muster minus Ausnahmen), das um **≥ 200 Zeilen und > 50 %** schrumpft, wird vereinigt: alte Zeilen in
     Reihenfolge, neue hinten. Das wird an Ort und Stelle geschrieben, unmittelbar vorher neu gelesen, danach `git add`.
   - Gewollte Kürzung: `dropship/_ledger_schrumpf_erlaubt.txt` (Pfad + Tag). Die Rückschau prüft den Tag des Schrumpf-Commits.
   - Ledger: `dropship/_ledger_schrumpf.tsv`.
2. **Eingebaut vor jedem automatischen Commit:**
   - `git_sichern.sh` (Reel-Motor, Poster, Hand-Sicherung)
   - `autocommit.sh`
   - `lib/git_aufloesen.sh` vor dem Merge-Commit; Vergleich gegen HEAD **und** MERGE_HEAD
3. **`lib/git_aufloesen.sh`:** Nur mit beiden Seiten vereinigen. Fehlt eine, wird die vorhandene genommen — nie eine leere Fassung.
4. **Stündliche Rückschau** im Aufseher (`--verlauf 26`): Ist ein Ledger bei HEAD noch geschrumpft, wird es geheilt; die Ampel
   meldet ⚠️. Erster Lauf: **`_cj_nachpruefung.tsv` 190 → 9'040 Zeilen geheilt** (8'842 alte + 198 neue). origin trägt jetzt 9'044.

## NACHGEMESSEN
- origin `_cj_lager.tsv` 59'386 Zeilen, chronologisch; `_cj_nachpruefung.tsv` 9'044.
- Das Tor lief in `git_sichern.sh` beim eigenen Commit mit, ohne Fehlalarm (Log `/tmp/ledger_schrumpf.log`).

## OFFEN
- Der Auslöser des Leerens am 15.10. ist unbekannt. Das Tor fängt die Folge ab, nicht die Ursache.
- Hand-Commits der Sitzung (`git add -A && git commit`) laufen nicht durch das Tor. Ab jetzt über
  `bash automation/git_sichern.sh "<Nachricht>" <pfade>` sichern (mit `GIT_ZUSCHREIBUNG`); die Rückschau fängt den Rest stündlich.
