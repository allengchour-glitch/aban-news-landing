# Produktvideos: Vorrang im CJ-Fenster — 07.10.2026 (Plan Tag 8 vorgezogen, Betreiber «verbessere»)

## GEMESSEN
- Plan Tag 8: «≥ 50 neue Produktvideos, Reel-Queue ≥ 10 bereit». Reel-Queue: **77 ready** ✅. Produktvideos: von 2'552
  Neuimporten seit 01.10. tragen **44** `video-hit`. Video-Index: 1'069 CJ-pids mit Video, 511 aktive Shop-Produkte,
  **281 offen**.
- Video-Nachtrag `cj_video_backfill.mjs` (Ziel 250/Tag, nur im Vorrang-Fenster 00:00–01:30 UTC):
  05.10. **27**, 06.10. **0** (sofort «CJ-Tagesbudget erschöpft»), 07.10. **17** (00:15–00:22, dann Container-Neustart, keine Schlusszeile).
- CJ-Aufrufe im Fenster (`/tmp/cj_takt_*.log`): 06.10. 763, davon **cj_category_fill 377**, cj_perpetual 42, cj_sku_import 23
  — der Grind läuft weiter, pausiert sind nur die Runner 2–5. 07.10. 1'255 (cj_ausgelistet_sichtbar 250,
  besuchte_seiten_lieferbar 215, cj_video_index 185, cj_category_fill 120 …). Der Video-Nachtrag selbst: 36.
- `cj_takt` kennt Vorrang (`VORRANG_SKRIPTE`), aber nur für `cj_kosten_backfill`.

## GETAN
1. `cj_takt.py` + `cj_takt.mjs`: **`cj_video_backfill` hat Vorrang** wie der Kosten-Nachtrag. Solange er arbeitet, warten alle
   anderen CJ-Aufrufe (höchstens 90 min), ausser `IMMER_FREI`: Bestellung, Zahlung, Versand, Ausgelistet, Ersatz und neu
   **`besuchte_seiten`** (Kundenschutz). Die .mjs-Liste kennt jetzt dieselben Ausnahmen wie die .py-Liste.
   Probe: `cj_order` 0,0 s, `besuchte_seiten` 0,0 s, `cj_category_fill` wartet (10 s bis VORRANG_MAX_S=6 + Bremse).
2. `fixer_keepalive.sh`: Der Video-Nachtrag schreibt eine `START`-Marke. Stirbt er beim Container-Neustart
   (`still_gestorben`), startet der Aufseher ihn **im selben Fenster bis 3× neu**. Vorher galt der Tag nach dem
   ersten Start als erledigt.

## NACHMESSEN
08.10. ~01:30 UTC: Zeile «PAUSE/FERTIG: N Produkte haben jetzt ihr Lieferantenvideo» in `/tmp/cj_video_backfill.log`.
Ziel ≥ 50 (Plan Tag 8). Dazu im Takt-Log den Anteil von cj_category_fill zwischen 00:00 und 01:30 prüfen (erwartet ≈ 0,
solange der Nachtrag läuft).

## REGEL
Ein Vorrang-Fenster, das nur einen Teil der Verbraucher anhält, ist kein Vorrang. Wer Punkte im Fenster braucht, gehört in
`VORRANG_SKRIPTE`. Wer Kunden schützt, gehört in `IMMER_FREI`, und zwar in .py UND .mjs.
