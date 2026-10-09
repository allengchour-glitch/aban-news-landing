# Verbesserungsrunde 09.10.2026 00:25 UTC — Tag 9 nachgemessen, Ampel-Fehlalarm «still: Pinterest»

## Plan-Tag 9 «Vertrauen» (vorgezogen 08.10.) — nachgemessen

GEMESSEN 00:30 UTC (Shopify, aktive Produkte `created_at >= 2026-10-01`): **2'881 Neuimporte, alle mit CJ-SKU; 2'161 auf
Bewertungen geprüft (75 %)**, Ziel ≥ 1'500 erreicht. Import-Log: 313 Produkte mit echten CJ-Bewertungen (1–5★); die
letzte Charge 00:2x wartete auf CJ-Punkte («395 ohne Punkte offen») — das Vorrang-Fenster 00:00–01:30 UTC holt sie nach.
Offen nur beim Betreiber: Judge.me-Einstellungen.

## Klasse der Runde: Ampel meldete einen gewollten Takt als Ausfall

**GEMESSEN:** Die Betreiber-Ampel («BRAUCHT DICH») zeigte `METRICOOL 24 h: … Pinterest 0 · still: Pinterest`. Der
Autopilot (`automation/social_autopilot.sh`) bedient Pinterest seit 06.10. bewusst nur alle **48 h** (176 Pins in 90 T,
Median 1 Aufruf je Pin → Kraft zu TikTok); letzter Pin 07.10. 22:12 UTC, nächster fällig 09.10. ~22:12. Die Ampel prüfte
jeden Metricool-Kanal fest auf «0 Posts in 24 h» und kannte den Takt nicht (ihr Docstring nannte noch «Pinterest 6 h»).
Ein Fehlalarm in der Betreiber-Zeile kostet Vertrauen in jede echte Meldung daneben.

**GETAN:** `betreiber_ampel.py`
- `metricool_takt()` liest TIKTOK_/YOUTUBE_/PINTEREST_ABSTAND aus `social_autopilot.sh` — EINE Quelle für den Takt; eine
  künftige Kadenzänderung im Autopiloten ändert die Ampel mit.
- `kanal_still(alter, takt)`: still = letzter Post älter als Takt + Spielraum (25 %, mind. 2 h); nie gepostet = still.
  7 Kanarien grün (26 h/48 h nein, 61 h/48 h ja, 7 h/6 h nein, 9 h/6 h ja, nie = ja, 14 h/12 h nein, 16 h/12 h ja).
- Die Meldung nennt jetzt den Grund: `still: Pinterest (letzter vor 26 h, Takt 12 h)`.

**NACHGEMESSEN:** `METRICOOL 24 h: TikTok 4 · YouTube 2 · Pinterest 0` (kein «still»). Gegenprobe mit künstlichem
12-h-Takt: «still: Pinterest (letzter vor 26 h, Takt 12 h)» erscheint.

**Lehre:** Ein Wächter, der eine Kadenz prüft, liest sie aus der Quelle, die sie festlegt — nie eine eigene Zahl. Sonst
wird jede bewusste Drosselung zum Alarm, und der Betreiber lernt, die Ampel zu überlesen.
