# Sonden (Runde 93)

Kleine Einweg-Messungen, die in Runde 93 Befunde belegt haben — jede liest `traumhaus.html`
über `th-lib` (Kopie mit Sonde in `window.__th`), wartet auf die Modelle und druckt Zahlen.
Lauf: `/opt/node22/bin/node spiele-dev/tools/sonden/<name>.mjs` (aus dem Repo-Wurzelverzeichnis).

- `probe-berg.mjs` — Kästen aller th26-Objekte der Bergstation (Soll aus `aufTerrasse` gegen Ist),
  `window._huette`, Höhen an der Bahnhofs-Zufahrt. Hat gezeigt, dass `freiRaeumen` Hütte, Kreuz und
  Felsen aus dem Welt-Kasten des schrägen Stationshauses schob.
- `probe-station.mjs` — Meshes des Stationshauses im LOKALEN Rahmen (Grundriss ±8,5 / ±11,8).
- `probe-berghoehe.mjs` — `window._bergHoehe` entlang Anschluss und Strasse des Bauernhofs
  (Beleg: Anschluss lief 10 m in den Fuss des Grossen Bergs).
- `probe-ringy.mjs` — Höhen (y) aller Beläge an Ring, Zubringer-Mündungen, Haupt-/Querstrasse
  (Beleg: Anschluss-Belag −0,004 lag über dem Ring-Belag −0,0042).

Die Weltfahrt (`spiele-dev/tools/th-weltfahrt.mjs <praefix> [Regex]`) fährt jedes Band aus
`_viertelBaender()` + feste Bänder + Zubringer + Landstrasse ab und fotografiert; `TH_OUT` ist der
Bildordner (Standard `/tmp`). Regex filtert Bandnamen (`'Zubringer-(240|300)|Strandzufahrt'`); mit
Filter entfällt der Rundgang zu Fuss, ausser der Regex passt auf `Orte`.
