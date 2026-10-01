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

**Runde 98 (Übergänge noch schöner):**
- `probe-stufen.mjs [quelle.html]` — Höhenprofile (5 cm Raster, um 1,25 cm versetzt) ±1,6 m um jede Lücke, die
  `bordsteinKante` baut (`window._bordLuecken`): **Stufen im Stein** (Sprung > 4 cm, einer der Nachbarn ≥ 7 cm hoch),
  **Stufen in der Platte** (Sprung > 2 cm an Absenkungen), **Löcher** neben Steinenden (Boden unter −3 cm),
  **Ecken** der vier Hauptkreuzungen (ab welcher Entfernung auf der Diagonale steht Stein), **L-Knicke** mit
  Aussenkurve und **Ursprung** aller Runde-98-Teile (`userData.r98`: liegt der Netz-Ursprung an der Form?).
  Vorher-Stand: dem alten `traumhaus.html` die Zeile gegeben, die `_bordLuecken` schreibt, und als Quelle übergeben.
  Fünf Messfallen, alle erst an einem Profil gesehen (`KANTE=<Kante> PROFIL=1` druckt es):
  (1) ein durchsichtiger Schattenfleck auf 0,14 m war der höchste Treffer → Durchsichtiges zählt nicht;
  (2) Proben genau auf der Naht Keil|Stein trafen keins von beiden → Raster versetzt;
  (3) 3-cm-Anschlag gegen die Fahrbahn auf −0,003 sind 3,3–3,6 cm → Schwelle 4 cm und „einer ≥ 7 cm hoch";
  (4) an Absenkungen neben Einmündungen läuft die Plattenlinie auf die Fahrbahn → dort keine Plattenmessung;
  (5) der 18-cm-Sockel einer Parklaterne auf der Platte → Modelle (`userData.datei`) sind kein Boden.
  Gegenproben: 12-cm-Klotz auf der ersten Absenkung (+2 Stufen), Teil mit Form bei (50|50) und Ursprung (0|0). `PROFIL=1` druckt auch
  Plattenprofile (so fiel die 3-cm-Mulde zwischen Ring-Gehweg und Anschluss-Rampe an der Ost-Ausfallstrasse auf).
- `probe-aufrufe.mjs [quelle.html]` — Zeichenaufrufe der Teile einer Runde an fünf festen Kamerapunkten: eigener
  `render()`, einmal mit, einmal ohne alle Meshes mit `userData[FLAG]` (Env `FLAG`, Standard `r98`). th-pruef ist dafür
  kein Mass: es liest `renderer.info` nach dem LETZTEN Durchgang und meldete für denselben Stand 198, 228 und 294.
  Runde 98: 331 Teile, +32 Aufrufe an einer Hauptkreuzung (+3 %), +18 nah, +8 Ost-Ausfall, 0 aus der Höhe.

**Runde 99 (Flimmern + ~10 fps):**
- `probe-tiefenstreit.mjs [quelle.html]` — Tiefenstreit mit der SPIELKAMERA: dasselbe Bild mit dem near des Spiels und
  mit near 3 m (`REF`), jeder Bildpunkt, der sich ändert, zählt. Sechs feste Punkte, prüft, dass das Ziel in der
  Bildmitte liegt. Gegenprobe: Magenta-Fläche 1 mm unter der Fahrbahn mit near 0,1. ⚠️ Gleich hohe Flächen streiten
  nicht (LessEqual) — eine Gegenprobe auf exakt gleicher Höhe ist stumm. Rest bei durchsichtigen Ebenen = Mischreihenfolge.
- `probe-bildlast.mjs [a.html] [b.html]` — Renderzeit (Median aus 5, SwiftShader — nur Verhältnisse), Aufrufe, Dreiecke an
  sechs festen Punkten, zwei Stände nebeneinander; erzwingt `lodTakt` am Punkt und wartet `warteAufRuhe` (die Welt baut
  sich bis ~180 s auf). `BAENDER=1`: Aufrufe nach Entfernung und Art (Modell/prozedural/Instanzen).
- `probe-aufrufe-herkunft.mjs [a.html] [b.html]` — welche Herkunft (Modelldatei, Geometrie+Farbe) wie viele Aufrufe macht;
  mit zweiter Datei die grössten Zuwächse. `TOP=n`, `SCHNELL=1` ohne Ruhe-Warten.
- `probe-zusammen.mjs [quelle.html]` — ändert `_zusammenfassen()` das Bild? Eine Seite mit `?ohneZF`, fotografieren,
  zusammenfassen, dieselben sieben Punkte noch einmal; Bewegtes, Durchsichtiges und der Verdecker aus. Bilder nach `$OUT`.
  `LEER=1`: Gegenprobe ohne Zusammenfassen — was sich in den Minuten zwischen beiden Fotoreihen von selbst ändert.

**Runde 100 (weiter: Weltgruppen, lose Bodenteile, alte Einfrier-/LOD-Fehler):**
- `probe-aufrufe-herkunft.mjs` `ART=1` — grobe Klassen je Punkt (bewegt / Modell / Instanzen / durchsichtig / Boden lose /
  Mesh lose / Gruppe prozedural) und die grössten Gruppen; mit `HERK=1` hängt sie sich vor dem Weltaufbau an `scene.add`
  und nennt je Klasse die BAUFUNKTION (Dorfhaus, Blumenfeld, Bordstein …) statt einer Farbe.
- `probe-gruppen-herkunft.mjs [quelle.html]` — alle Nicht-Modell-Gruppen der Szene nach Baufunktion (Meshes, Materialien,
  bewegt); `LOSE=1` dazu die losen Meshes direkt in der Szene (flach/hoch), `JSON=pfad` schreibt jede Gruppe mit Lage.
- `probe-anfasser.mjs [quelle.html]` — fasst ein Code nach dem Aufbau noch ein EINZELNES Teil an, das Runde 100
  zusammenfasst? Lädt mit `?ohneZF`, nimmt genau `_zfKandidaten()`, macht `visible`/`material` zu Fallen, notiert Lage,
  Elternteil, Eckpunkte; spielt Abend, Nacht (Stadtfest), Regen, Schnee, Winter, Baumodus. Ausgenommen als Aufrufer:
  LOD, gruppenSicht, Verdecker, Aufwärmen. Nebenbei: jedes eingefrorene Objekt, dessen Lage von seiner Matrix abweicht
  (so fielen Sonnenziel, Regen, Vögel und der Ring unter der Figur auf). Gegenprobe: ein Teil unsichtbar, eins verschoben,
  Eckpunkte geändert — alle drei müssen gemeldet werden.
- `probe-lodlage.mjs [a.html] [b.html]` — rechnet das Entfernungs-Ausblenden mit der echten Lage? Zählt LOD-Einträge, deren
  gemerkte Lage > 1 m von der Weltmatrix abweicht, und die an der Kreuzung deshalb fälschlich unsichtbaren Teile.
  Gegenprobe: ein Eintrag künstlich um 50 m versetzt.
- `probe-sonne.mjs [a.html] [b.html]` — Höhenwinkel und Richtung des Sonnenlichts (aus den Weltmatrizen) an fünf Punkten
  um 12:00; Soll überall gleich. `main`: 64,5° am Start, 14° an der Kreuzung, 7° im Gewerbe.
- `probe-schattenkriechen.mjs [quelle.html]` — Rechner-Pfad (Schatten an), Kamera steht, nur Licht+Ziel wandern in
  2-cm-Schritten (`_sonneAufKamera`): wie oft ändert sich das Bild? Mit Texelraster nur bei ganzen Texeln (≤ 2 auf 20 cm);
  Gegenprobe `ohneRaster` muss bei fast jedem Schritt anschlagen.

**Runde 101 (User: „jetzt spiel weiter" + „platzierung passend machen"):**
- `probe-moebelversatz.mjs` — jedes Katalog-Möbel (ohne Autos, Hund, Bauwerkzeuge) in Drehung 0 und 1 an eine Zelle
  gesetzt: Hüllbox des Modells gegen das Rechteck seiner Belegung (`furnCells`) — Versatz der Mitten und wie weit es
  hinausragt. Vorher: alle 30 Fälle gerader Grösse genau 1 m daneben (Himmelbett ragte 0,96 m, Teich 0,92 m), der
  Zimmerfarn 0,46 m (Drehpunkt neben der Pflanze). Gegenprobe: ein Sessel um 1 m verschoben (eingefroren →
  `updateMatrix()` selbst, sonst sieht die Sonde nichts).
- `probe-villamoebel.mjs` — stempelt die Villa-Vorlage und prüft jedes Möbel gegen Wände (Zellkanten, 16 cm), andere
  Möbel und die eigene Belegung. Vorher: das Sofa 6 cm in der Wand.
- `probe-parkfrei.mjs` — (A) steckt etwas IN einem geparkten Auto (`userData.fest` + Autoname)? (B) steht etwas über
  0,4 m auf einem angemeldeten Parkplatz (`window._parkplaetze`)? Teil für Teil geprüft (ein Vordach auf Pfosten ist
  kein Quader), nur Teile auf Bodenhöhe (unter 1,2 m beginnend, über 0,3 m hoch), ohne Lichtschein; LOD- und
  Sichtfeld-ausgeblendete Teile werden für die Messung eingeblendet (`_lodM`, `_gsAus`). Läuft mit `?ohneZF`, damit
  zusammengefasste Parkwagen einzeln bleiben. Gegenprobe: 1-m-Kasten im ersten geparkten Auto.
- `probe-wasda.mjs <x0> <z0> <x1> <z1> [warte]` — ALLES, was einen Ausschnitt schneidet (auch Autos, Deko, Laternen),
  mit Datei/Name, Lage, Drehung, Kasten, Höhe, Merkmalen; unbenannte Gruppen mit ihren ersten Bauteilen und Farben.

**Runde 102 (User: „gestallte alles besser um"):**
- `probe-luftbild.mjs <ordner> [r] [neigung] [nur=Name,Name]` — JEDER Ort der Karte (`WORLD_POIS`, von `marke()`
  auf die echte Lage nachgezogen, dazu das Grundstück) aus der Spielkamera schräg von oben, die Figur steht mit dort
  (Entfernungs-Ausblendung hängt am Spieler). 35 Bilder in ~6 min; das Werkzeug urteilt nicht. Aus diesen Bildern
  kamen alle Befunde der Runde. Gelegentlich bleibt ein Bild schwarz (Bildschirmfoto im Moment eines Übergangs) —
  dann den Ort mit `nur=` einzeln wiederholen.
- `probe-gedraenge.mjs [grenze=1.5] [x0 z0 x1 z1]` — welche Bauten (≥ 3 m hoch, Grundriss ≥ 16 m²) stehen näher als
  `grenze` beieinander? Abstand aus den Bauteil-Kästen, die AUF dem Boden stehen (unter 1 m beginnend, über 1 m
  reichend — Vordach, Ausleger, Dachüberstand zählen nicht). th-echt misst nur Durchdringung, th-pruef nur
  „steckt drin"; ein 20-cm-Spalt zwischen zwei fremden Häusern ist keins von beiden. `?ohneZF` als Standard;
  `ZF=1` misst so, wie der Spieler lädt; `QUELLE=datei.html` gegen einen älteren Stand. Gegenprobe: zwei Bauten auf
  0,3 m zusammengerückt.
- `probe-randbaum.mjs` — stehen die Randbäume jedes Viertels im eigenen Viertel-Rechteck (w in x, d in z)? Findet
  die baum2-Bäume an beiden möglichen Formelstellen (quer VW und quer VD, 4 m Fang) und meldet, was draussen steht
  und worin (anderes Viertel, Bau, Wasser, Kollider). ⚠️ Nach der Korrektur fängt die ALTE Formelstelle zufällig
  Streubäume des Aussenrings — die 8 „draussen" im Nachher-Lauf sind solche, keine Randbäume. Gegenprobe:
  Viertelmitte drinnen, 30 m vor der Südkante draussen.
- `probe-stabil.mjs [schwelle]` — lädt das Spiel zweimal und vergleicht die Lage aller bau()-Modelle je Datei.
  Gegenprobe: im zweiten Lauf ein Modell um 3 m versetzt. `QUELLE=` wie oben.
- `probe-springen.mjs [ab] [bis] [schritt]` — bewegt sich in EINEM Lauf nach `ab` Sekunden noch etwas Ruhendes
  (ohne `_bewegt`)? Gegenprobe: ein Modell vor der letzten Messung um 2 m versetzt.
  ⚠️ Beide sagten für Stand 101 und 102 „stabil" (nur Bus, Gondeln, Segelboot unterschieden sich) — die drei Lagen
  der Tramhaltestelle aus drei Läufen stammten aus Läufen, die PARALLEL zu anderen Sonden liefen. Unter Last kommen
  die GLB-Dateien in anderer Reihenfolge an, und der Entwirrer entscheidet anders: genau das, was ein langsameres
  oder schnelleres Gerät tut. Was man sehen soll, gehört darum `fest`.

**Runde 103 (User: „handy spiel optimieren, gutes langes süchtiges spiel draus machen"):**
- `probe-sog.mjs [tage=365]` — die Sog-Kurve OHNE Browser: liest jede Formel per Regex aus `traumhaus.html` (Startgeld,
  Uhr-Takt, Abnahme-Takt, Wohnstufen, Katalog mit Preisen/Sperren, Erfolge, Missionen, Aufträge, Häuser, Miete, Lohn-,
  Liefer-, Taxi-, Ernte-, Angel-Formeln, Kombo, Rang-Punkte samt Funktionsrumpf, Ausbau, Orte, Rückkehr) — fehlt eine
  Zeile, bricht sie ab statt zu raten — und spielt damit N Spieltage (1 Spieltag = 360 s echt) für zwei Spielertypen
  durch (gemütlich/aktiv, jede Tätigkeit kostet echte Sekunden, Deckel je Tag). Meldet je Tag, was NEU ist (Stufe,
  Freischaltung, Auto, Haus, Ausbau, Rang, Orte-Meilenstein, Karriere, Auftrag), Tage ohne Neues, längste Lücke,
  Horizont. Annahmen stehen im Kopf (Orte/Tag, Erfolge/Tag, Kombo-Mittel). Gegenprobe: doppeltes Einkommen darf
  keine Stufe verzögern, Palast nie vor Tag 20 (5 Abnahmen × 4 Tage).
- `probe-ladenah.mjs [alt|neu] [R=120]` — wann steht die NAHE Welt (bau()-Gruppen im Umkreis R um den Figurenstart
  −67|43), nicht wann die letzte Datei kommt. Handy-Format (screen 390×844 → `_mobil`), tippt sofort „Solo bauen",
  zählt jede Sekunde nah/gesamt bis `_ladeOffen` 0 und dreimal stabil. `alt` lädt mit `?ladeAlt` (Dateireihenfolge,
  nach dem Start unbegrenzt), `neu` mit Entfernungs-Priorität. ⚠️ Die Sonde selbst wird vom Hauptfaden-Stau gebremst
  (Proben kommen in Klumpen) — Sekundenwerte sind ±5 s. Gegenprobe: Nahzahl sinkt nie, nah fertig ≤ alles fertig.
- `probe-r103.mjs` — funktioniert das Eingebaute im laufenden Spiel: Ort entdecken (Figur neben den Ort gesetzt →
  `orteCheck`), Gegenprobe 300 m daneben, Hauskauf + fünf Ausbauten über die echten Funktionen (Preis verdoppelt,
  Miete ×3, Deckel), Rang-Prämie genau einmal, Kopfzeile nach dem Palast, Spielstand (il/rg im Snapshot, zt in
  saveGame, Umweg speichern→laden), Sperren Stufe 4/5, keine werfende Erfolgs-/Missionsbedingung.

**Runde 104 (User: „das spiel sollte viel länger gehen als 60 tage, ein unendliches spiel"):**
- `probe-sog.mjs` — Standard jetzt **365 Tage**. Stufen ab 6 und Ränge ab 9 kommen aus den Erzeugerfunktionen der Quelle
  (`stufeDaten`, `rangSchwelle`, `rangDaten` — als Funktionsrumpf übernommen), Stufe ≥ 6 misst das Vermögen (Hauswert +
  Häuser + Ausbauten), Ausbau bis `IMMO_LV_MAX` (der billigste nächste Ausbau zuerst, nicht Haus 1 bis 12 durch), Punkte
  auch aus dem Gesamtverdienst. Neue Zeilen: Ereignis-Tage je 30 Tage, zweite Jahreshälfte (Stufen / Ränge / Ausbauten).
  ⚠️ `(\d)` statt `(\d+)` las aus „12" eine 1 — Stufenleiter „tot ab 6", obwohl das Spiel lief. Die Quelle-Zeile der
  Ausgabe („Ausbau bis Stufe 1") hat es verraten: lesen, was die Sonde gelesen hat.
- `probe-r104.mjs` — laufen die Leitern im Spiel: Stufen 5–13 aus `stufeDaten` (Ziel steigt, Vermögen, Komfort bleibt 12),
  Ränge 8–14 mit `rangIdx` an der Schwelle und Schwelle−1 darunter (Gegenprobe), Lücke bei Stufe 5, elf Ausbauten bis 12
  über die echte Funktion, Abnahme über 5 hinaus, Kopfzeile bei Stufe 9 vor dem Ausbau (Fehlbetrag in $), 25'000 $ verdient
  = +10 Punkte, Spielstand-Umweg mit Stufe 9 + Ausbau 12, Erfolge ohne Wurf.
- `probe-r103.mjs` liest den Ausbau-Deckel aus der Quelle (`IMMO_LV_MAX`; Miete ×(1 + 0,5·(Deckel − 1))) statt fest 5.
- `probe-schritt.mjs` (Runde 105) — vermisst den Geh-Clip von Mia/Partner (Dauer, Fussknochen, engste Stellung = Stand-Bild,
  Schrittlänge → Tempo bei timeScale 1) und lässt Mia im Spiel gehen und anhalten: timeScale muss v/1,45 sein, nach dem
  Anhalten Pause bei t = 1,049. Wartet in Bildern (`renderer.info.render.frame`), nicht in Sekunden. Gegenprobe: weiteste
  Fussstellung > 2× engste, Schritt > 10 cm.
- `probe-passanten.mjs` (Runde 105 Teil 3) — Passanten: Zeichenaufrufe/Dreiecke mit und ohne (4 Orte), Teile je Figur,
  CPU von updFussg; Gang (Clip, Tempo-Kopplung, Fuss am Boden), Panik (Run und zurück), Rutschen des aufgesetzten Fusses
  in Weltkoordinaten (Gehen und Rennen). Drei Gegenproben. `DIAG=1` druckt Clip/Tempo/Gewichte der Renner.
- Werkzeuge daneben (spiele-dev/tools/): `figuren-schau.mjs` (Kontaktbogen von Figuren-GLBs, `--schritt` misst den Weg
  je Sekunde bei Abspieltempo 1 über den Bodenkontakt) und `fbx-zu-glb.mjs` (FBX → GLB ohne Blender, Farben eingebacken).
- `probe-handy.mjs` (2026-09-30, User: „auf handy kann ich ned spielen") — Handy-Format hoch (390×844) oder `QUER=1`
  (844×390), isMobile/Touch: tippt „Solo bauen", wartet auf `_ladeOffen === 0`, misst Download, JS-Speicher,
  geschaetzten Grafikspeicher (Geometrie + Texturen), Aufrufe/Dreiecke, laengste Blockade. Gegenprobe 2-s-Blockade.
  Erster Befund: im Hochformat liegt `#rotHint` („Dreh dein Handy quer!") ueber allem — ohne Weiter-Knopf.

  Runde 106: zusaetzlich `renderer.info.memory` (was der Grafikchip haelt), Sparmodus, Zahl verkleinerter Texturen.
- `probe-bildkosten.mjs` (Runde 106, User: „1 fps") — an drei Kamerapunkten je Teile-Art (gehaeutet, Instanzen,
  durchsichtig, texturiert, Standard-Material, eigener Shader, Sprites) alles ausblenden und neu zeichnen, Median aus 5;
  dazu Punktlichter 6 → 2 → 0. Gegenproben: alles aus ≈ 100 %, nichts aus = Rauschgrenze (±5–11 %).
- `probe-profil.mjs` (Runde 106) — Chrome-Profiler (CDP) im Handy-Pfad an der Kreuzung: Eigenzeit je Funktion pro
  gezeichnetem Bild, dazu Knoten/Meshes/autoMatrix und `scene.updateMatrixWorld()` allein. Gegenprobe: 30 ms reines
  Rechnen je Bild muss als eigene Zeile erscheinen (gebucht werden ~21 ms, der Rest faellt in „(program)").
- `probe-matrix.mjs` (Runde 106) — Weltmatrix-Treue: fuer JEDEN Knoten matrixWorld == Eltern × lokal, an acht
  Zeitpunkten (fertige Welt, Rundreise, drei Fahrgeschaefte, nachts, Baumodus an/aus). Pflicht, seit die Szene nicht
  mehr jedes Bild `force` erzwingt. Gegenprobe: eingefrorenes Objekt mit direkt umgeschriebener `.matrix`.
- `probe-r106-bilder.mjs` (Runde 106) — Handy quer, drei Ansichten mit und ohne Sparmodus (`?fps` / `?fps&voll`),
  Bilder nach spiele-dev/screenshots/r106-*.png. Urteilt nicht.
