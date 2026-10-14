# Gemeinsamer Ordner `dropship/_klassen/`: ein Werkzeug löschte die Listen der anderen (14.10.2026, Runde 04:25 UTC)

## GEMESSEN
- `/tmp/mobilfunk_netz.log`: `FileNotFoundError dropship/_klassen/mobilfunk-kandidaten.txt` — der nächtliche 2G/3G-Lauf
  über den Bestand brach ab; seit 13.10. prüfte der Wächter nur noch Neuimporte (TAGE=3).
- Ursache: `automation/klassen_kontrolle.py` leerte am Beginn jeder neuen Runde **jede** `*.txt` im Ordner — auch fremde
  Listen (`mobilfunk-kandidaten.txt` von `mobilfunk_netz_pruefen.py`, `auswahl-besuchte-seiten.txt`). Gelöscht im
  Commit e0d0f3936 (13.10. 08:15, Autocommit). Die Liste baute bis heute nur ein Handbefehl (`--export … --liste-schreiben`).
- Nachbau live: **159 Kandidaten aus 54'170 aktiven Produkten**, davon 156 schon im Ledger geprüft → **3 offen** (Schaden klein,
  Mechanismus kaputt).

## GETAN
- `klassen_kontrolle.py`: `listen_leeren()` löscht nur `eigene_listen()` (eine Datei je KLASSEN-Eintrag, 12); fremde bekannte
  (`FREMDE_LISTEN`) bleiben; **unbekannte werden gemeldet, nie gelöscht** (`⚠️ KLASSEN-ORDNER: unbekannte Liste …`).
  `--selbsttest` (fremde bleiben, eigene geleert, keine Überschneidung) — als Tor im Aufseher UND in `main()` direkt vor dem
  Leeren. Gegenprobe alte Logik: `mobilfunk-kandidaten.txt` fällt.
- `mobilfunk_netz_pruefen.py --liste-bauen`: Bulk-Export aller aktiven Produkte (seitenweise brauchte > 10 Min.), atomar
  (`.tmp` + `os.replace`), Abbruch bei < 97 % von `objectCount` (Hausregel Klingen-Wache 07.10.), Wartezeit ≤ 8 Min. bei
  fremdem Bulk-Vorgang, Warnzeilen mit `flush`.
- Regel: «4g» traf Gramm/GB (Lippenbalsam 4g, DDR3 4G RAM — beide im Ledger als 4g-Gerät): `nicht_titel` + Lippenbalsam,
  Arbeitsspeicher, DDR\d; **Kandidaten-Kanarien** neu (Kanarien 20/20; Gegenprobe alte Regel: beide wieder Kandidat).
- Aufseher-Nachtblock: Liste fehlt oder ist > 7 Tage alt (Alter aus der Kopfzeile «live gebaut …», nicht aus der mtime) →
  zuerst bauen, dann prüfen; als eigener Prozess (`setsid`, fd 9 zu).
- Zwei Prüfer (Workflow wf_32964814-498): Kernreparatur bestätigt, 7 niedrige Befunde — alle oben eingearbeitet.

## Regel
Ein gemeinsamer Ordner hat Besitzer je Datei. Ein Werkzeug räumt nur, was es selbst schreibt; alles Unbekannte wird gemeldet.

## OFFEN — dieselbe Klasse an anderen Stellen (Prüfer A, für die nächsten Runden)
1. **HOCH — `automation/reels_seed.csv`:** `meta_reel_post.mjs` und `metricool_tiktok_post.mjs` lesen die Queue beim Start und
   schreiben Minuten später die GANZE Datei aus der alten Kopie zurück → Zeilen, die der Reel-Motor dazwischen anhängt,
   verschwinden; der Waisen-Nachtrag holt sie nie (`!gebaut.has(p)`). GEMESSEN: 8 fertige Reels in `social/reels/` ohne
   Queue-Zeile, alle im Ledger `_cj_reel_gebaut.txt`. Vorschlag: vor jedem Schreiben neu lesen + nur eigene Zeile ändern,
   EINE Sperre auch für `appendReel`, Waisen-Filter auf `!inCsv.has(p)`, die 8 nachtragen.
2. **MITTEL — `engine_keepalive.sh` / `repo_vorspulen.sh`:** `find .git -name "*.lock" -delete` ohne Halter-Prüfung und ohne
   `/tmp/git_repo.lock` (autocommit.sh:41 macht es richtig mit `fuser`).
3. **MITTEL (Vermutung) — `queue_new_products.mjs`:** schreibt `social/posts_image.csv` nach bis zu 2 Min. OCR aus alter Kopie.
4. Niedrig: `repo_vorspulen.sh` stellt Unterordner/unversionierte Ledger nach Rewind nicht zurück; TMP-Hygiene löscht nach
   Grösse statt Besitzer.
