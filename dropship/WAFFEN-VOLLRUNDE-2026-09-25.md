# Waffen-/Überwachungs-Wächter: Vollrunde statt Nur-Neuimporte (25.09.2026)

## GEMESSEN
- Anlass: Google meldet 442 Produkte «Inappropriate image». Kontaktbogen von 24 Stichproben: gemischt (Wäsche/Bademode,
  Totenköpfe, Flammen, Harmloses) — nicht verlässlich reparierbar. Eine Untergruppe ist aber ein echtes Risiko:
  **«Faltbares Sturmfeuerzeug mit Jet-Flamme» = Feuerzeug in Pistolenform** (Bild: schwarze Handfeuerwaffe), im Titel kein Waffenwort.
- Der Wächter `ueberwachung_waffen_guard.py` lief täglich mit `EXPORT=/nonexistent SEIT=3 Tage` → seit der Grind-Pause
  **1 Seite je Lauf**. Der geteilte `/tmp/export.jsonl` trägt **keinen Beschreibungstext** (0 von 49'892) — Regeln mit
  Textanker wären darauf blind. Dieselbe Klasse wie Medizin-Zweck (Nachtrag 79).
- Vollrunde (498 Seiten, live mit Text), Trockenlauf: 5 Treffer — 2 echt (Pistolen-Feuerzeug; «IR-Nachtsicht-Kamera-Stift»
  zum «diskreten Festhalten»), 3 Fehltreffer («Auto-MP5-Player», «Automobil-Infotainment-System» = MP5-Videoformat;
  «Seifenblasen-Maschinenpistole» = Kinderspielzeug).

## GETAN
- `heikel_zweck.json` (Importer + Wächter teilen sie): neue Regel `waffennachbildung-alltagsgegenstand` (Waffenform +
  Alltagsgegenstand), Sperren `mp5-medienformat` und `seifenblasen-spielzeug`. Probe: 3 Fehltreffer → None, Feuerzeug,
  Kamera-Stift und AK-47-Baukasten → Treffer; Akku-Schrauber «Pistolen-Design» → None.
- Aufseher: Waffen-Wächter jede Woche über den GANZEN Bestand; Stempel `dropship/_waffen_voll_stand.txt` erst nach Exit 0.
  Medizin-Wächter-Vollrunde ebenso auf «Stempel nach Erfolg» umgestellt (vorher vor dem Lauf → ein Neustart verschob sie 7 Tage).
- Scharfer Lauf: Feuerzeug + Kamera-Stift aus dem Google-Kanal (Tags `waffe-pruefen` / `verdeckte-ueberwachung`), bleiben im Shop.

## OFFEN
- «Inappropriate image» (442) bleibt als Klasse bestehen: Googles Bildurteil ist nicht vorhersagbar; kein Bildertausch auf Verdacht.

## Nachtrag: Tierschutz-Wächter (gleiche Klasse)
Lief ebenfalls nur über 3 Tage Neuware. Jetzt Wochen-Vollrunde mit Stempel nach Erfolg. Erste Vollrunde 25.09.:
704 aktive Kandidaten (Vorauswahl über Funktionswörter: Halsband, Anti-Bell, Hundezaun …), **0 Befunde**.
Weitere Fenster-Läufe (bewusst so gelassen): Farbcode-Optionswerte (kosmetisch, nur Neuware), Google-Ads-Kuration (Ads aus).
