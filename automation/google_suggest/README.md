# Google-Suggest-Ernte (gratis, 05.10.2026)
`python3 ernte_worker.py <arbeitsdir> A|B|C` holt Vorschläge von suggestqueries.google.com (hl=de, gl=ch, 0,5 s Pause,
Checkpoint je Seed in `suggest_roh_<W>.json`); A = Mode/Schuhe (+damen/herren/kinder), B/C = übrige Seeds (+kaufen/schweiz).
`python3 auswahl.py <arbeitsdir>` braucht `bekannt.json` (alle Keyword-Spalten aus dropship/semrush/*.csv), verwirft Orte/Läden/
Marken/Hausregel-Klassen und wählt je Seed ≤ 3 Kandidaten (Produkt-Modifikator vor «kaufen»), 240 für Semrush `phrase_these`.
Ergebnis 05.10.: 1'338 Anfragen → 11'198 roh → 6'351 neu und sauber → `dropship/semrush/keywords_erweiterung_ch_2026-10-05.csv`.
