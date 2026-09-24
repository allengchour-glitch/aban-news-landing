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
- `probe-schild.mjs` — (Runde 97 neu geschrieben) liest `window._uebSchilder`, das `_zebraAllg` je Schild
  schreibt: [x, z, ry, Übergang, Fahrtrichtung dx/dz, umgeklappt]. Geprüft: Tafel der ankommenden Spur
  zugewandt, auf keiner Fahrbahn (`_aufStrasse`, 0,35 m Reserve), nah am Streifen, und ob ALLE Instanzen
  gezeichnet sind (bei zu kleiner Kapazität fallen die letzten still weg). Die erste Fassung ordnete über die
  Geometrie zu — an T-Einmündungen war der „nächste" Übergang der falsche.

**Runde 97 (Übergänge weiter):**
- `probe-strichzeb.mjs` — liegt eine weisse Markierung (`_markMats`, Meshes und Instanzen) in einem
  Fussgängerstreifen? Fand 29: Randlinien durch alle Streifen der Haupt- und Querstrassen, Stellplatz-Striche
  (und zwei parkierte Wagen) auf den Streifen bei x ±62, Mittelstriche in fünf Vierteln. ⚠️ Nicht nach
  `visible` filtern — die Sichtweiten-Pflege schaltet alles Ferne aus, der erste Lauf sah die Viertel nicht.
  Gegenprobe: zwei künstliche, UNSICHTBAR geschaltete Striche (Übergang 0 und der letzte).
- `probe-bergstrasse.mjs` — Strahlen auf Landstrasse, Bauernhof-Anschluss und -Strasse: trifft der Strahl
  zuerst das Bergnetz und darunter Belag? Fand 99 (Wiese quer über der Kreuzung am Bauernhof).
  ⚠️ Gegenprobe hebt das Netz um 0,3 m — dafür `updateMatrix()`, statische Netze haben `matrixAutoUpdate`
  aus; und das GRÖSSTE `userData.gelaende`-Netz nehmen, nicht das erste (Kettenberge).
- `probe-umkreis.mjs x0 x1 z0 z1` — alle Objekte der obersten Ebene in einem Rechteck mit Weltkasten
  (Beleg: Obelisk 0,7 m hinter dem 4 m breiten Kathedralen-Tor).
- `probe-wer.mjs '[[x,z,r],…]'` — alle Meshes an Punkten, mit Eltern-Kette; mit `ZEB=<i>` dazu Übergang i und
  seine Schilder. Hat gezeigt: die „Cubes" auf dem Stadtring West waren der Zug am Bahnübergang (th-strassen
  schliesst `_zug` jetzt aus).
