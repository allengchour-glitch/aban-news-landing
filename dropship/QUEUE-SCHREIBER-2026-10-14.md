# Social-Queues: Poster überschrieben fertige Reels mit einer alten Kopie (14.10.2026)

Anlass: «OFFEN HOCH» aus `dropship/KLASSEN-ORDNER-2026-10-14.md` §1 und die Betreiber-Frage «ist alles fix».

## GEMESSEN
- **8 fertige Reels** in `social/reels/` ohne Zeile in `automation/reels_seed.csv`. Alle im Ledger `_cj_reel_gebaut.txt`, keines gepostet.
  git-Spur je Reel: Zeile angelegt («Reel-Queue: <pid> ready»), **unter einer Minute später weg** im nächsten «CJ-Ledger»- bzw.
  «Ledger-Drift»-Commit. Diese Commits haben nur einen Elternteil, der Verlust geschah also lokal im Arbeitsbaum.
- Verlaufs-Scan über 21 Tage (neuer Wächter, Prüfung 3): **5 weitere Reel-Zeilen** gingen auf dieselbe Art verloren, alle auf dem
  Shopify-Speicher (deshalb sah die Waisen-Suche über `social/reels/` sie nie). Insgesamt **13 fertige Reels, die nie gepostet wurden**.
  Im 60-Tage-Fenster gab es keine weiteren Verluste und keinen in anderen Queues.
- Ursache: Poster lesen die Queue beim Start, arbeiten **Minuten** (Shopify, Meisterwerk-Tor ≤ 240 s, Gemini-Jury ≤ 400 s, Upload) und
  schreiben dann die **ganze Datei aus der Start-Kopie** zurück. Was der Reel-Motor (`appendReel`) dazwischen anhängt, ist danach weg.
  Der Waisen-Nachtrag im Motor holte nichts zurück (`!gebaut.has(p)`: die Waisen standen ja im Ledger).
- Erfassung aller Schreibstellen (Workflow `wf_e32fa801-95a`, 8 Leser + Vollständigkeitskritik): **55 Dateien** berühren Queue-CSVs.
  **Hoch:** `metricool_tiktok_post`, `social-autopost-meta`, `queue_new_products`, `ig_bildformat`, `ig_karussell_post`, `metricool_ledger_pruefen`.
  **Mittel:** `meta_reel_post`, `quittung_rueckspiel`, `bild_queue_captions_ehrlich`, `bild_reel`, `story-autopost-meta`.
  Dazu vier Schreiber mit **demselben festen Zwischennamen** `<csv>.tmp` (`social_queue_saeubern`, `anlass_social_sperre`, `reel_neu_rendern`,
  `reel_cdn_umzug`). Die Klasse war seit 28.09. bekannt («Lost-Update-Lehre», Kommentar in `reel_cdn_umzug.py`), aber nirgends durchgesetzt.

## GETAN
- **EIN Weg zum Schreiben:** `automation/lib/queue_csv.mjs` + `automation/queue_csv.py` (gleiche Sperrdatei, gleiche Regeln, Gleichlauf
  im Selbsttest geprüft):
  - Sperre `/tmp/queuecsv_<pfad>.lock` nur für Lesen + Zusammenführen + Schreiben (gemessen max. 255 ms Wartezeit unter Last).
    Inhalt entsteht atomar (Hilfsdatei + `link`). Eine leere oder kaputte Sperre wird erst nach 10 s übernommen; das Wegräumen prüft, ob es noch dieselbe ist.
  - `schreiben(datei, basis, meine)`: liest frisch und führt je Feld drei Wege zusammen. Die eigene Änderung gewinnt, sonst der frische Stand.
    Ausnahme: hat ein anderer die Zeile inzwischen auf `posting`/`posted*` gesetzt, gewinnt das (Posten ist unumkehrbar).
    Fehlt eine Zeile, die ich gelesen und nicht selbst gelöscht habe, bleibt sie (Queues sind Anhänge-Listen).
  - `anhaengen` (id schon drin: nichts), `umbauen` (Filter auf den frischen Stand), `lesen` (geprüft).
  - Atomar über Nachbardatei + rename. Danach legt der Helfer eine **Stand-Marke** ab (Inode, Grösse, mtime, Zahl der Datensätze).
    `frischLesen` vertraut nur dem eigenen Stand sofort. Eine fremd geschriebene Datei (git merge, Altschreiber) gilt erst nach
    1 s Ruhe, eine **geschrumpfte erst nach 10 s**. Ein Schnitt mitten in einem UTF-8-Zeichen zählt als unvollständig.
- **27 Dateien umgestellt:** 6 von Hand, 18 per Workflow `wf_0b41bf26-f4d` (je Datei alt gegen neu auf Temp-Kopien verglichen, meist byte-gleich).
  Die Poster lesen die Queue jetzt geprüft (`queueLesen`); ihre Parser liefern auf allen Queues dasselbe Ergebnis wie der Helfer (10/10 verglichen).
- **13 Reels zurück in der Queue:** 8 über den Waisen-Nachtrag. Er gilt jetzt auch mit gebaut-Eintrag, Tor-Abgelehnte und Gepostete
  bleiben draussen; neu `NUR_NACHTRAG=1`. Die 5 vom Shopify-Speicher kamen aus dem git-Verlauf (`--zurueckholen`), Liste in
  `dropship/_queue_zurueckgeholt.tsv`. Die Poster prüfen vor jedem Post weiter Produkt aktiv, Preis und Doppel.
- **Wächter `automation/queue_schreiber_wache.py`:**
  1. **Quelltext:** Jede Datei, die eine Queue-CSV nennt und roh schreibt, ohne den Helfer zu nutzen, ist ein Befund. Ausnahmen nur mit Grund.
     In Helfer-Nutzern zählt auch Rohschreiben auf eine Queue-Variable. Der Wächter erfasst neue Dateien von selbst.
  2. **Reel-Waisen.**
  3. **Verschwundene Zeilen-IDs in 24 h** (git-Verlauf).

  Stündlich still im Keepalive (`--still`). Täglich im Aufseher scharf: zuerst die Helfer-Selbsttests, nur wenn sie grün sind holt er
  verschwundene, nicht gepostete Zeilen der letzten 26 h zurück. Gegenprobe: am alten Code meldete er 14 Roh-Schreiber, nach der Umstellung 0.
- Kleinere Prüfer-Befunde eingearbeitet:
  - `jury_nachbessern`: ein Fehler beim Queue-Schreiben verbucht kein «repariert».
  - `social_queue_saeubern`: Exit 1, wenn eine Queue nicht geschrieben wurde (sonst FERTIG für 20 h).
  - `reel_neu_rendern`: der Lauf bricht nicht mehr ganz ab.
  - `bild_reel`: die CDN-URL steht zuerst in der Fehlermeldung.
  - `tiktok_karussell`: Ledger auch bei schon vorhandenem Slug.

## PRÜFUNG
- **Stresstest** (Agent, echte Prozesse: 2 Node- + 2 Python-Anhänger, 2 Poster, 1 Säuberer, 1 nicht-atomarer Altschreiber), 3 Läufe:
  je 120/120 angehängt, 40/40 Statusänderungen, 0 kaputte Zeilen, 0 Ausnahmen.
- **Gezielte Proben fanden 4 Lücken der ersten Fassung**, alle behoben und nachgemessen:
  - (A) Eine halbe Datei, die genau auf einer Satzgrenze endet, galt als vollständig, wenn der Altschreiber ≥ 33 ms pausierte.
    Danach standen 330 statt 662 Datensätze in der Datei. **Jetzt 662/663 bei 20/35/100 ms.**
  - (B) `lesen()` nahm eine halbe Datei als Basis an, eine abgeschnittene id kam als Stummelzeile zurück. **Jetzt verweigert.**
  - (C) Python: `UnicodeDecodeError` bei einem Schnitt im Emoji. **Jetzt wird gewartet.**
  - (D) Leere Sperre: Node hing 60 s und liess sie für immer liegen, Python übernahm sie nach 85 ms. **Jetzt übernehmen beide nach 10 s.**
- Gegenprüfung je Gruppe (5 Prüfer): alle `ok`, 9 niedrige Befunde, 6 umgesetzt.
- Selbsttests grün:
  - `queue_csv.py` / `queue_csv.mjs` (inkl. A–D, Stand-Marke Node ↔ Python sofort gleich)
  - `queue_schreiber_wache`
  - `reel_neu_rendern`
  - `anlass_social_sperre`: Kanarien 47/47, Ampel unverändert «54 vorgemerkt», geht am 15.10. 00:00 UTC scharf
  - `ig_bildformat`

## Regel
Eine Datei, in die mehrere Dauerläufer schreiben, wird nie aus einer Kopie zurückgeschrieben, die vor einer Netz- oder Subprozess-
Wartezeit gelesen wurde. Geschrieben wird nur über den gemeinsamen Helfer: Sperre, frisch lesen, nur die eigenen Änderungen, atomar.
Ein «Vollständig»-Urteil über eine fremd geschriebene Datei braucht eine Stand-Marke, nicht nur den Inhalt.

## OFFEN
1. ✅ **14.10. 09:25 erledigt — Rewind:** `repo_vorspulen.sh` kopiert die Queues vor stash/reset (`cp`, kein Skript nötig). Nach dem Quittungs-Rückspiel hängt `automation/queue_rewind_retten.py --zurueck` die Zeilen wieder an, die NIE in einem Commit standen (`git log -S<id>` leer); bewusst Entferntes bleibt draussen. Das läuft über `queue_csv.anhaengen`, das Log steht in `_queue_zurueckgeholt.tsv`, Grund «rewind». Selbsttest mit Wegwerf-Repo 4/4.
2. ✅ **14.10. 09:15 erledigt:** `engine_keepalive.sh` / `repo_vorspulen.sh` löschen nur noch verwaiste Sperren (Helfer `automation/lib/git_sperren.sh`: kein Halter laut `fuser` UND älter als 120 s; ohne `fuser` 600 s; Selbsttest). `repo_vorspulen.sh` läuft unter `/tmp/git_repo.lock`.
3. **Hetzner-Klon:** Er schreibt mit altem Poster-Code, bis er den Zweig zieht. Seine Rückschreiber kommen per Merge an.
   Abgefedert durch die Regel «fehlende Zeile bleibt» und den Tageslauf «zurückholen».
4. ✅ **14.10. 09:20 erledigt:** `ig_karussell_post` prüft nach `postLock()` den frischen Stand (`nochBereit`: Status noch «ready», Bilder nicht im gemeinsamen Ledger), sonst kein Post. Probe am echten Queue: ready → frei, posted → gesperrt, fehlende Zeile → gesperrt; Trockenlauf läuft.
5. Kosmetisch: Beispiele im Bericht von `bild_queue_captions_ehrlich`; `quittung_rueckspiel` ohne Warnzeile bei leerer Datei.
   Nur über GitHub-Workflows startbare Schreiber (Zeitplan aus) stehen begründet auf der Ausnahmeliste.
