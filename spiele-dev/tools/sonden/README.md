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

**Runde 95 (Welt grösser):**
- `probe-dichte.mjs` — Objekte je 40-m-Zelle über die ganze Welt (±460), Wasser/Berg markiert.
  Beleg für die leeren Zonen Ost, Südost, Nordwest vor dem Bau der neuen Viertel.
- `probe-masse.mjs '[["datei.glb",h],…]'` — Grundfläche w × d eines Modells bei Zielhöhe h, GELADEN wie
  `bau()` (Knoten-Transformationen inklusive), plus Lage der Box zum Ursprung. Rohe Accessor-Boxen liegen
  bei `bd_*`, `th23_*`, `nf_*` bis Faktor 3 daneben.
- `probe-technik.mjs` — Weltkästen der Technikpark-Objekte gegen die Strassenmitte, und alles, was auf dem
  Flugfeld (Bahn + Vorfeld) steht, ohne die `th25_`-Modelle. Hat den Streu-Baum auf dem Vorfeld und den
  Gewerbe-Randbaum (294|−160) gezeigt — zweimal an derselben Stelle heisst: kein Zufall.
- `probe-zebra.mjs` — alle Meshes, deren Kasten einen Bereich schneidet (Zebra-Enden): Bank und
  Abfalleimer des Gewerbe-Viertels standen an den Enden des Übergangs über den Neustadt-Stich.
- `probe-vorfeld.mjs` — Weltkästen von Flugzeug, Tankwagen, Gepäckwagen, Fluggastbrücke, Wohnmobilen
  (beide Wagen liegen trotz `rot 1,57` längs x; Gepäckwagen bis x 316 → Vorfeld-Ostkante halten).
- `probe-zelt.mjs` — Materialien der Zelt-Modelle (Traversal über die Szene, `_tent.glb`).

⚠️ **Nie zwei Instanzen desselben Werkzeugs gleichzeitig** (gleiche Temp-Datei: einer räumt auf, während der
andere lädt → „799 Modelle, 36 im Korridor" als Artefakt), und **th-pruef allein laufen lassen**: mit zwei
Sonden daneben lud es nur 804 statt 1009 Modelle, und `entwirren` lief, bevor alles stand („steckt 8").
Vor dem Start `ps -eo cmd | grep th-` fragen.

**Runde 96 (Übergänge):**
- `probe-uebergaenge.mjs` — alle registrierten Übergänge (`window._uebergaenge`) mit Lage, Richtung, Breite.
- `probe-zebsicht.mjs` — Spieler an drei Orten, `visible`/`count` der vier Übergangs-InstancedMeshes: Beleg, dass
  `nieAusblenden` nötig war (Streifen verschwanden ab 130 m vom Ursprung, Schilder ab 34 m).
- `probe-schild.mjs` — jedes Schild dem Übergang über die GEOMETRIE zuordnen (3,2 m längs, hb+0,76 quer — der
  „nächste" Übergang war an T-Einmündungen der falsche), dann: Tafel dem ankommenden Verkehr zugewandt
  (Rechtsverkehr aus `ROUTEN`) und auf keiner Fahrbahn (`_aufViertelWeg` + Haupt-/Querstrassen-Bänder).
