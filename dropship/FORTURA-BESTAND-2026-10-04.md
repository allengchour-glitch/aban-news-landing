# Fortura-Bestand — Ampel «⚠️ FORTURA-BESTAND 2 T alt» (04.10.2026, 22:20–22:45 UTC)

Betreiber-Auftrag 04.10. 22:17 UTC: «fix 12 h lang alles» · Bereich: fortura-bestand.

## Befund (gemessen, nicht geglaubt)

**Zugang war da** — `/tmp/fortura_env.sh` (600, 27.09.) existiert, der Feed wurde heute dreimal erfolgreich geladen
(`grep -E '^(START|FERTIG|PAUSE)|Feed geladen' /tmp/fortura_bestand.log`):

| Zeit (UTC) | Was | Ergebnis |
|---|---|---|
| 03.10. 08:32 → 08:38 | Tageslauf | FERTIG, 520 Varianten geändert |
| 04.10. 06:18 | Tageslauf (20-h-Stempel) | Feed geladen (20'161 Zeilen) — dann **nichts mehr**, keine FERTIG/PAUSE-Zeile |
| 04.10. 08:30 | Nachholen (`still_gestorben` 1/3, nach Container-Neustart ~08:25) | Feed geladen — dann **nichts mehr** |
| 04.10. 09:08–14:08 | 6 Aufseher-Ticks | kein Start: Stempel frisch (08:30), Log-Zeit NACH dem Container-Start → galt als lebend |
| 04.10. 14:08 → 20:10 | **keine Ticks** (6 h Loch im Keepalive-Log) | — |
| 04.10. 21:11 → 21:17 | Nachholen (`still_gestorben` 2/3, nach Container-Neustart 21:07) | **FERTIG, 312 geändert, 16 auf 0** (8 verschiedene SKU), `offen 0` |

Die Ampel-Meldung «2 T alt (letzter Abgleich 03.10. 08:38)» stimmte zum Zeitpunkt 20:46 — um 21:17 war sie durch den dritten
Versuch schon erledigt. **Risikofenster: 03.10. 08:38 → 04.10. 21:17 (≈ 36,5 h)** mit eingefrorenem Bestand.

**Realisiertes Risiko: 0.** Im Fenster gab es genau eine Bestellung (#1022, 03.10. 17:37, bezahlt) — ohne Fortura-Artikel
(Admin-GraphQL `orders(query:"created_at:>=2026-10-03T08:38:00Z")` → lineItems.sku `fortura-*` = 0).

### Ursache (drei Schichten)
1. **Der Lauf dauert 3–11 min** (gemessen an 9 Läufen seit 28.09.) und der Container startet ~stündlich neu — er nimmt den
   Lauf mit. Das ist bekannt (Journal 25.09.) und wurde mit `still_gestorben` adressiert.
2. **`still_gestorben` erkennt nur Tode VOR einem Container-Start** (`stat Log < boot`). Der 08:30-Lauf starb, als Neustart und
   Start fast zusammenfielen (Tick 08:26 = Boot-Tick, Start 08:30): Log-Zeit 08:30 ≥ Boot → «lebt» → 6 Ticks lang kein Nachholen,
   obwohl kein Prozess mehr da war. Der Anspruch (touch Stempel) wird VOR dem Start gesetzt, der Tag gilt damit als erledigt.
3. **`grep -v` ohne `--line-buffered`** schluckte jede Fortschrittszeile des Node-Skripts (Block-Puffer, erst bei EOF geflusht):
   im Log stand nach «Feed geladen» NICHTS, obwohl das Skript sicher «Feed … Zeilen» und «Shop: … Seiten» ausgegeben hatte.
   Deshalb war nicht einmal sichtbar, WO der Lauf starb.
4. Nebenbefund: Die Ampel liest die **letzte Journalzeile** (`_fortura_bestand_log.tsv`). Ein Lauf ohne Änderung schreibt keine
   Zeile → die Ampel hielte einen erfolgreichen Lauf für ausgeblieben (latenter Fehlalarm, heute nicht ausgelöst).

## Getan (ohne Commit — Auftrag)

**`automation/fortura_bestand_taeglich.sh`**
- `grep --line-buffered -v "^  fortura-"` — Fortschritt steht sofort im Log, auch wenn der Lauf stirbt.
- `timeout 2400` um den Abgleich; rc 124 → «PAUSE: … timeout», Stempel 2 h zurück (`nochmal`).
- **Stempel `/tmp/fortura_bestand.stamp` wird bei FERTIG gesetzt** = «letzter Erfolg». Kompatibel mit dem heutigen Aufseher-Block
  (der ihn zusätzlich beim Start setzt); mit dem neuen Block unten wird er zur einzigen Erfolgsmarke.

**`automation/fortura_fetch_feed.sh`**: `curl --max-time 120` (Login) / `--max-time 900` (Download) — ein hängender
Synology-Abruf blockiert den Tageslauf nicht mehr endlos.

**`automation/betreiber_ampel.py` `fortura_bestand_alter()`**: nimmt den jüngeren Zeitpunkt aus Journal-Letztzeile UND
Berichtskopf `_fortura_bestand_report.md` («— JJJJ-MM-TT HH:MM UTC», entsteht bei jedem FERTIG). Getestet: Funktion gibt jetzt
`''` (grün), Regex auf dem echten Kopf → `('2026-10-04', '21:17')`.

**Nachgemessen (Trockenlauf 22:28 UTC, `DRY=1 FORTURA_CSV=/tmp/fortura_feed.csv node automation/fortura_bestand_sync.mjs`):**
`8416 unverändert · 0 zu ändern · 8 SKU nicht mehr im Feed (0.1 %) · 0 ohne Bestandsführung · 0 ohne CH-Lagerzeile` —
Shop = Feed vom 21:11. Danach ein scharfer Lauf mit dem gehärteten Skript (Ergebnis unten im Nachtrag).

## Vorschlag Aufseher-Block (fixer_keepalive.sh NICHT editiert — Feld `waechter_block`)
Anspruch (claim, 2 h) getrennt vom Erfolg (stamp, 20 h, setzt das Skript). Ein still gestorbener Lauf holt sich nach 2 h selbst
nach — ohne Neustart-Erkennung, ohne 3/Tag-Zähler. Block ersetzt die Zeilen `FB=/tmp/fortura_bestand.stamp … fi` (~Z. 1909–1915).

## Bewusst NICHT
- Keine Bestände «von Hand» gesetzt oder erfunden — nur das vorhandene Werkzeug (Feed → Shop) laufen lassen.
- `fortura_bestand_sync.mjs` unverändert (Logik war korrekt: offen 0, Journal geflusht, Sperrliste greift).
- Kein zweites Nachhol-Werkzeug gebaut; `still_gestorben` bleibt für andere Jobs, nur dieser Block braucht es nicht mehr.
- Keine Theme-/Produkt-Änderungen, keine Kundenkommunikation (#1022 ist nicht betroffen).

## Betreiber
- Nichts zwingend. Dauerlösung für den Zugang bleibt wie seit 14.08. notiert: `FORTURA_FTP_USER`/`FORTURA_FTP_PW` als
  Umgebungsvariablen in den Claude-Einstellungen (dann überlebt `/tmp/fortura_env.sh` den nächsten Container-Wipe nicht
  mehr als einziger Träger). Heute war der Zugang da — kein Blocker.

## Nachtrag 22:29 UTC — scharfer Lauf mit dem gehärteten Skript
`START 22:26:17 → FERTIG 22:29:01` (2 min 44 s): Feed 20'161 Zeilen, Fingerabdruck 9972210f1165 (unverändert zu 21:11),
`8416 unverändert · 0 zu ändern · offen 0`. Drei Nachweise für die Änderungen: die Fortschrittszeilen («Feed … 18796 Artikelnummern»,
«Shop: 8416 Varianten … 141 Seiten») stehen jetzt im Log (line-buffered); `/tmp/fortura_bestand.stamp` trägt 22:29 (bei FERTIG gesetzt);
die Ampel gibt `''` (grün) — obwohl die letzte Journalzeile von 21:17 ist (0 Änderungen = keine Zeile), weil sie den Berichtskopf
«2026-10-04 22:29 UTC» mitliest. Genau der Fall aus Nebenbefund 4.
