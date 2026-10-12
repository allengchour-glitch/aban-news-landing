# Instagram-Bildformat in der Bild-Queue (Verbesserungsrunde 12.10.2026, 12:30 UTC)

**GEMESSEN:** Bild-Post `kimi-stylish-hydriert…` scheiterte über Metricool bei Instagram mit «Media container not created by
unknown cause» (Status `ig-fehler`). Bild 209×666 px = Seitenverhältnis 0,31. Instagram-Feed nimmt 4:5 … 1.91:1 (0,8 … 1,91),
Breite ≥ 320 px (QUELLE: Meta, Instagram Content Publishing). Unter 42 wartenden Bild-Posts lagen 3 weitere ausserhalb
(1351×1800 = 0,75 · 1000×1400 = 0,71 · 1325×2000 = 0,66). Der Poster `social-autopost-meta.mjs` hatte elf Schichten, keine fürs
Format; Bild-Posts gehen seit 09.10. nur auf Instagram.

**GETAN:**
- Regel `automation/ig_bildformat.py` (0,8 … 1,91, ≥ 320 px): `--url` (Exit 0 postbar · 3 ausserhalb · 2 nicht ladbar),
  `--queue` (Wächter, Standard trocken), `--selbsttest` 11/11 inkl. Gegenprobe über den echten Ladeweg (Datei 209×666).
- Poster: **zwölfte Schicht** vor dem Senden — Exit 3 → `format-skip`, nicht messbar → Zeile bleibt `ready`.
- Aufseher `fixer_keepalive.sh`: Wächter alle 6 h (`SCHARF=1 … --queue`, Log `/tmp/ig_bildformat.log`).
- Queue: vorher 42 ready (3 ausserhalb) + 1 `ig-fehler` → nachher **39 ready, alle postbar** · 4 `format-skip` · 0 `ig-fehler`
  (626 Zeilen, Diff genau 4 Statusfelder).

**FALLE beim Bau:** `csv.DictWriter` schreibt standardmässig `\r\n` — die Queue hat `\n`. Der erste scharfe Lauf veränderte so
alle 627 Zeilen (nur Zeilenenden). Zurückgestellt (aktuelle Datei, nicht aus dem Commit — sonst gingen Poster-Schreibungen
verloren), Schreiber mit `lineterminator="\n"`; Gegenprobe an einer Kopie: byte-gleich bis auf die eine Zeile.

**OFFEN (kein Betreiber-Klick nötig):** Bilder im Hochformat < 0,8 könnten statt übersprungen auch als 4:5-Fassung gepostet
werden (`bild_formate.py --posts-ready` erzeugt sie bereits) — eigener Umbau des Posters.
