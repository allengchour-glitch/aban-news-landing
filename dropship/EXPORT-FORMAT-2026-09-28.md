# Geteilte Exporte im falschen Format — 5 Wächter tot (28.09.2026, Verbesserungsrunde 00:25)

**GEMESSEN:** `/tmp/*.log` letzte Zeilen → 5 Wächter enden mit `KeyError`: preis_verlustschutz, fortura_ek_nachtragen,
kosten_boden15 (`'id'`), preisboden, farbwerte_zusammengesetzt (`'status'`). `/tmp/export.jsonl` und `/tmp/kost28.jsonl`
waren byte-gleich (65'416'638 B, 27.09. 20:08) = mein Ad-hoc-Tag-Export für #1019 (Produkte ohne Preisfeld, Varianten ohne id).

**Warum es nicht von selbst heilte:** `kosten_export_bauen.py` prüfte nur das ALTER (< 24 h = «kein neuer Export nötig») →
die Kosten-Kette wäre bis ~20:08 heute tot gewesen. `hype_export_bauen.py` prüfte das Format schon (24.09.), lief aber nur
einmal täglich im Hype-Lauf; die Wächter-Schleife im Aufseher las den Export ohne Prüfung.

**GETAN:**
- `kosten_export_bauen.format_ok()` (Variantenzeile mit id/price/inventoryItem) — jung + falsch → neu bauen.
- Aufseher: vor der Wächter-Schleife `hype_export_bauen.format_ok('/tmp/export.jsonl')`, falsch → sofort neu bauen (Sperre).
- Beide neu gebaut: export.jsonl 49'869 Zeilen, kost28.jsonl 475'749 Zeilen. Gegenprobe format_ok: vorher False/False, jetzt True/True.
- Rauchtest: preis_verlustschutz liest 5'956 Kandidaten (25'225 Varianten ohne EK), preisboden 0, farbwerte 0 — kein Absturz.
- Aufseher neu gestartet (lief auf der geänderten Skriptdatei; Bash liest Skripte stückweise nach).

**Regel:** Ad-hoc-Exporte NIE unter den geteilten Namen (`/tmp/export.jsonl`, `/tmp/kost28.jsonl`) — eigenen Namen im
Scratchpad nehmen. Jeder Export-Bauer prüft Format UND Alter.
