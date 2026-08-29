# 🏙️ RUNBOOK TRAUMHAUS — Karte der Datei und alle teuer gelernten Regeln

> Für jede Session, die `traumhaus.html` anfasst. **Zuerst lesen.** Die Datei ist
> ~600 kB in einer einzigen IIFE; ohne diese Karte sucht man lange und tritt in
> Fallen, die hier schon einmal Stunden gekostet haben.

## ⏱️ Bevor du anfängst — zwölf Regeln, jede mit ihrem Preis

Diese Liste stammt aus **einer** Sitzung (2026-08-29, PRs #2369–#2396). Jeder Punkt hat
dort echte Zeit gekostet; die Zahl dahinter ist, wie oft oder was genau.

**Beim Bauen eines Messwerkzeugs**

1. **Kein Backtick in einem Kommentar, der in einer Sonde landet.** Sonden sind
   Template-Literale; ein `` ` `` darin bricht den Lauf mit „Unexpected identifier".
   → **zehnmal** an einem Tag hineingetreten. Nutze Anführungszeichen oder baue den Text
   aus einem Zeilen-Array (`[...].join('\n')`).
2. **Die Sonde läuft INNERHALB der IIFE.** `WORLD_SOLIDS`, `_lodKlein`, `KATALOG`,
   `sims`, `snapshot()`, `lodTakt()` sind direkt sichtbar. `window.WORLD_SOLIDS` ist
   `undefined` — und liefert kein Fehlerbild, sondern eine leere Liste.
   → dreimal; einmal daraus **144 Phantom-Funde** erzeugt.
3. **Eine Null in der Ausgabe ist ein Verdacht, kein Ergebnis.** „0 Kollider",
   „0 Objekte", „0 Zeilen" heisst fast immer: das Werkzeug hat nichts gemessen.
   Prüfe zuerst, ob überhaupt etwas gemessen wurde (`wc -l`, eine Bezugszahl mit ausgeben).
4. **Nicht auf eine Frist warten, sondern auf Ruhe.** Feste `waitForTimeout`-Werte messen
   Ladezeit, nicht Korrektheit. Poll, bis die Zahl sich dreimal nicht ändert.
   → **53 Phantom-Funde** aus 12 geratenen Sekunden.
5. **Eine Schwelle, die auf dem Messwert liegt, ist keine Schwelle.** `bb.max.y <= 0.05`
   bei einem Wert von exakt 0,05 → mal so, mal so. → das Tor meldete abwechselnd 2 und 3.

**Beim Messen der Welt**

6. **Die Hüllbox ist das Dach, nicht die Wand.** Für Kollidermasse zählt, was 0,3 … 2,0 m
   über der **eigenen Sohle** liegt (nicht absolut — die Berghütte steht auf 43 m).
   → sonst baut man unsichtbare Mauern unter der Traufe.
7. **Nicht hinter die Fassade tasten.** Eine Wand ist 0,2 … 0,3 m dick; eine Probe 0,45 m
   dahinter misst den leeren Innenraum. → „die Kathedrale ist auf allen vier Seiten offen".
8. **Aus „Modell X ist unbenutzt" folgt nicht „die Sache fehlt".** Erst nach der *Sache*
   suchen (`grep -i baustelle`), dann nach Modellen. → eine falsche Behauptung in einer
   bereits gemergten PR (#2386), korrigiert in #2389.

**Beim Ändern des Spiels**

9. **Zwei Stellen, die dasselbe schreiben, laufen auseinander.** Das war die ergiebigste
   Frage des Tages — sechs echte Fehler aus einer einzigen Prüfung: Bergform (#2370),
   Uferlinie (#2374), Viertelmass (#2373), Bahnsteigkante (#2375), `light.visible`
   (#2387), LOD-Schwelle gegen Gruppenprüfung (#2388). Wenn du eine Zahl nachbaust, die
   es schon gibt: **frag stattdessen die Quelle.**
10. **`node spiele-dev/tools/th-alle.mjs` vor und nach jeder Änderung** (inzwischen 20
    Prüfungen, ~45 min; `--schnell` für die Kernreihe, ~11 min). Zweimal ist hier etwas kaputtgegangen, das
    ein *vorhandenes* Werkzeug sofort gemeldet hätte.
11. **Erst messen, dann ANSEHEN.** Eine Messung prüft, was man ihr aufträgt — nicht, ob
    das Haus aussieht wie ein Haus. Der Spielclub bestand sechs grüne Prüfungen und hatte
    trotzdem einen 0,25-m-Spalt unterm Dach, ein Dach aus zwölf Tabletts, Rasen als
    Fußboden und eine Discokugel im Dach. Gefunden hat das ein Bild (`th-augen`,
    `th-blick`, je zwei Minuten). → **vier Fehler an sechs grünen Häkchen vorbei.**
12. **Der Worktree fällt bei einem Container-Neustart auf einen alten Commit zurück**
    (detached HEAD, `node_modules/playwright`-Symlink weg). → **zweimal** fertige,
    gemessene Arbeit verloren. Darum: **früh committen**, und nach jedem Neustart
    `git checkout -B <branch> origin/main` plus Symlink neu setzen.

> **Die Regel über den Regeln:** von sechzehn Messwerkzeugen dieser Sitzung haben **acht
> im ersten Lauf zuerst sich selbst widerlegt**. Bevor du einem Befund glaubst — besonders
> einem grossen — prüfe, ob das Messgerät recht hat. Die Welt war seltener kaputt als der
> Blick darauf.

## 📱 HUD: Bedienelemente paarweise auf Ueberschneidung pruefen (2026-08-23)
- Messung: alle HUD-Ids bei mehreren Handy-Querformaten holen, PAARWEISE schneiden und
  melden, wenn beide `pointer-events` haben. Genau so faellt auf, was im Bild niemand
  sieht: bei **740x360 und 667x375** ueberlappten Pokal-Knopf und Minikarte um **48 x 8 px**,
  beide klickbar, beide z-index 14 — der Tipp dort ist mehrdeutig.
- **Ursache:** die `@media (max-height:380px)`-Regel zog die Karte auf `top:104`, waehrend
  `#achBtn` bis y 112 reicht. Nach unten war kein Platz: „Bauen" sitzt auf `bottom:126`,
  bei 360 px Hoehe also ab y 196 — zwischen Pokal (112) und Bauen bleiben **84 px** fuer
  eine 86-px-Karte. Darum 76 px und `top:116`.
- **⚠️ Messung und Bild im selben Moment nehmen.** Mein erster Durchgang hat erst gemessen
  und dann fotografiert; dazwischen wechselte der Hinweistext und `#modeBtn` seinen
  Zustand, und die Zahlen passten nicht mehr zum Bild. Fast haette ich daraus einen
  zweiten „Befund" gebaut.
- **⚠️ Nicht jede Zahl unter 44 px ist ein Fehler.** `#modeBtn` ist mit 38 px ABSICHTLICH
  so klein (dokumentiert: zwischen Radar und Joystick bleiben ~50 px). Wer das auf 44
  hebt, holt sich die Ueberschneidung zurueck, die drei Runden gekostet hat.
- Geprueft: 844x390, 915x412, 740x360, 667x375, 812x375, 640x360, 1024x600, 896x414,
  720x320 — jeweils 0 Ueberschneidungen, 0 ueber den Rand.

## 🕊️🎉 Tauben + Wimpelketten auf dem Wochenmarkt (2026-08-24)
- Grep-Anker: `var TAUBEN=`, `var WIMPEL=`, `updTauben`, `updWimpel`
- **Tauben** (7, drei InstancedMesh: Koerper/Kopf/Schwanz) picken in der propfreien
  Tasche um (148|15) westlich des Brunnens; kommt eine Figur naeher als 2,8 m,
  flattern sie im Bogen zu einem neuen Fleck. Verifiziert per Sonde: Laufen ✔,
  4 von 7 im Flug beim Aufscheuchen ✔.
- **⚠️ Im Bild nachgesehen:** 0x9aa2b2 las sich als „weisse Schneebaelle" — Voegel
  brauchen DUNKLE Toene und den Schwanzkegel, sonst stimmt die Silhouette nicht.
- **Wimpelketten** (3 Schnuere quer ueber die Marktgasse, 21 Faehnchen in ZWEI
  InstancedMesh nach Farbe): Aufhaengung an den STANDDAECHERN — kein Bodenabdruck,
  kein Platzierungsrisiko. Schnuere sind statische Catenary-Linien, nur die
  Faehnchen schwingen (Instanzmatrizen, Wind am Wetter).
- **⚠️ th-augen: die Ego-Kamera schaut entlang Math.PI + camA, NICHT entlang sim.rot.**
  Deshalb zeigten mehrere Fotos die Gegenrichtung, egal welcher Blickwinkel uebergeben
  wurde. Das Werkzeug setzt jetzt camA (Welt-Yaw, 0 = +z) und friert die Figur mit
  `_hide` ein — sonst dreht die Spiel-KI sie zwischen Setzen und Foto wieder weg.
- **⚠️ Sonden sind Template-Literale:** Backticks in KOMMENTAREN innerhalb der Sonde
  beenden das Literal — SyntaxError weit weg von der eigentlichen Stelle.

## 🎠 Fahrgeschaefte drehen sich (2026-08-25)
- Grep-Anker: `updFahrgeschaefte`, `_drehRaten`
- **Befund:** der ganze Freizeitpark stand still — `updFahrt` bewegt nur die KAMERA,
  die Modelle ruehrten sich nie, nicht einmal waehrend der Fahrt.
- **Loesung fuer die rotationssymmetrischen** (Karussell, Kettenkarussell, Teetassen):
  ganze Gruppe um Y drehen, Rate = Fahrt-Bahn (Karussell 3 U/18 s usw.), damit Plattform
  und Fahrgast nicht sichtbar auseinanderlaufen.
- **RIESENRAD DREHT JETZT AUCH** (`riesenradRotor`): der Rotor wurde aus dem Modell
  HERAUSGEMESSEN — Radebene bei |dz| < 1,8 um die Achse (Hoehe 14,2), Beine/Streben bei
  dz ±3,1, Achszylinder laenger 2,5 in z. 402 Meshes per `attach()` in eine SZENEN-Gruppe
  an der Weltachse gehoben (nicht Kind der Modellgruppe — deren rotY wuerde die Achse
  verdrehen), Drehung um Welt-Z mit Bahn-Rate (1 U/26 s). Gondeln drehen starr mit und
  stehen oben kopfueber — im Bild bei rot=PI geprueft: offene Plattenkaesten, nicht
  ablesbar. **PIRATENSCHIFF bleibt bewusst stehen** (Schwingen, kein trennbarer Pivot).
- **⚠️ `_bewegt` auf der Gruppe** — sonst friert `_einfrieren()` die Matrix nach 9 s ein
  und die Drehung endet still. Verifiziert: `matrixAutoUpdate` nach 55 s noch aktiv,
  Rotationsdeltas passen zu den Raten.

## 🏁 Anpfiff: Spielstand-Reset am Mittelkreis (2026-08-25)
- Grep-Anker: `function anpfiff`, `anpfT`, `m.t==="anpfiff"`
- Liegt der Ball auf dem Anstosspunkt und stellt sich eine Figur an den MITTELKREIS
  (|dist−6| < 0,7 — bewusst AUSSERHALB des 1,15-m-Schussradius, sonst kickt man den
  Ball weg statt anzupfeifen), laeuft ein 2-s-Countdown → Pfiff, Stand 0:0, Tafel neu.
  Host entscheidet, `{t:"anpfiff"}` an den Gast. Nur aktiv, wenn ein Stand > 0:0 da ist.
- **⚠️ Testen mit dt-Deckel im Kopf:** 2 s Spielzeit sind im Software-Renderer ~40 s
  Wanduhr — fuer Proben `BALL.anpfT` direkt hochsetzen.

## 🔢 Anzeigetafel zeigt den Spielstand live (2026-08-24)
- Grep-Anker: `var ANZEIGE=`, `function anzeigeUpd`
- Canvas-Display (3,6 x 1,35 m) haengt 5 cm vor der GEMESSENEN Front des
  th44_spielstand (x 50,35…55,65, Paneel um z 179,5, Front zur kleinen z-Seite),
  rotY pi. Neu gezeichnet NUR bei Torereignissen (tor() auf dem Host, m.t==="tor"
  beim Gast) — ein Zeichenaufruf, sonst keine Kosten.
- Im Bild belegt: nach erzwungenem Tor steht „0 : 1" lesbar auf der Tafel.

## ⚽ Fussball auf dem Sportplatz — das Koop-Spielzeug (2026-08-24)
- Grep-Anker: `var BALL=`, `function updBall`, `function tor(`, `m.t==="ball"`, `m.t==="tor"`
- **Mechanik:** hineinlaufen schiesst (Richtung Spieler→Ball, 7,5 m/s), Reibung, Abprall an
  den Seitenlinien, Tor zwischen den Pfosten (|z−155| < 2,4 an x 31/75) → Feuerwerk,
  Jingle, Stand als „Blau : Rot". `stats.tore`/`stats.schuesse`; Mission + Erfolg
  „Torjäger" (NUR hinten angefuegt — Missionen speichern den Pool-Index).
- **Koop:** Host simuliert (er kennt die Gast-Position aus dem Steer-Kanal und erkennt
  deren Schuesse mit), sendet den Ball alle 0,25 s per netFast — NUR solange er rollt —
  und Tore per netSend. Der Gast zieht mit `netAnnehmen`/`netZiel` nach, demselben
  Zwischenschritt-Verfahren wie bei den Figuren.
- **End-to-end im Zwei-Seiten-Test belegt:** Ball rollt beim Gast (x 53 → 46,65 waehrend
  der Host bei 40,59 war — das Nachziehen laeuft), Tor-Stand kommt an (0:0 → 0:1).
  `th-koop` prueft jetzt NEUN Dinge.
- **⚠️ IIFE-Sperre gilt auch fuer Spielobjekte:** `page.evaluate(() => BALL.x)` wirft
  ReferenceError — BALL lebt im Spiel-Abschluss. Zugriff NUR ueber eine `mitSonden`-Sonde.
- **⚠️ Der Loopback-Beitritt hat Glueckssträhnen:** 1 Verbindung in 3 Laeufen war diesmal
  die Quote (je 6 Versuche). Nicht als Regression deuten — der Lauf, der verbindet,
  liefert stabile Ergebnisse.

## 🍦🪁 Eiswagen + Drachen (2026-08-23)
- Grep-Anker: `var EIS=`, `var DRACHEN=`, `m.t==="eis"`, `eisJingle`
- **Eiswagen am Seepark (27|133):** Standort GESUCHT, nicht geschaetzt — gegen alle 1843
  Szene-Kaesten (auch prozedurale Baenke/Promenade, die `_gebaeude` fehlen), gegen die
  Strassenbaender und ausserhalb des Wassers; von sieben Treffern der stadtzugewandte.
  Kauf per Naehe (<3,5 m): 3 $, Jingle, Herzen, `stats.eis`, Erfolg „Schleckmaul";
  Brunnen-Muster fuer Koop. Der Wagen steht MIT `fest` in `_gebaeude` — th-pruef prueft
  ihn mit, der Aufraeumer laesst ihn stehen. Kollider via `addSolid`.
- **⚠️ `freiPlatz` IST IN DER SONDEN-EBENE NICHT SICHTBAR** (anderer Abschluss). Eine
  Sonde, die es aufruft, wirft ReferenceError — und `th-augen` hat seine
  Standort-Suche deshalb still uebersprungen (typeof-Guard). Fuer Platzsuchen aus
  Sonden: Szene-Kaesten selbst schneiden + `window._bandFrei`.
- **⚠️ FLACHE DAECHER SIND AUF AUGENHOEHE UNSICHTBAR** — eine Ebene von der Kante ist
  eine Linie. Fuer Staende/Schirme: flacher Kegel statt Plane.
- **Drachen ueber dem Sportplatz:** 2 Stueck, Achterbahnen am Himmel, Schnur mit
  Durchhang (Linie, 8 Punkte), flatternder Schwanz (Linie, 6 Punkte). Nur die
  Drachen-MESHES tragen `_bewegt`; die Linien haben stehende Matrizen und aendern nur
  Geometrie — friert `_einfrieren()` gefahrlos ein. 6 Zeichenaufrufe gesamt.

## 🦆 Ambiente-Paket: Enten, Fahnen, Falter, Nachthimmel (2026-08-23)
- Grep-Anker: `var ENTEN=`, `var FAHNEN=`, `var FALTER=`, `var NACHT=`, `m.t==="enten"`
- **Enten** (5, auf 3 InstancedMesh): kreisen auf dem Seepark-See; wer ans Ufer tritt
  (Distanz 12…17 zur Seemitte), lockt sie an — exakt das Brunnen-Muster (Host
  entscheidet, `netSend({t:"enten"})` an den Gast). Zaehlt `stats.enten` fuer
  Tages-Mission und Erfolg.
- **⚠️ MISS_POOL/ACH NUR HINTEN ANFUEGEN:** Missionen speichern den Pool-INDEX im
  Spielstand — wer mittendrin einfuegt, verdreht die Missionen aller alten Saves.
- **Fahnen** mit Vertex-Sinus-Wellen, Wind haengt am Wetter. Standorte OHNE Bodenabdruck
  (Turmspitze via `window._turm`, Dach des Spielstands) — kein freiPlatz-Risiko. Der
  Turm laedt spaet: Fahne wird im Update-Takt gebaut, sobald `_turm` existiert.
- **Falter** tags (1 InstancedMesh, 22 Stueck, Fluegelschlag = X-Skalierung der
  Instanzmatrix), **Gluehwuermchen + Sternschnuppen** nachts. Nur die Sternschnuppe
  bewegt ihr OBJEKT und braucht `_bewegt`; alles andere animiert Instanzmatrizen oder
  Vertices bei stehender Objektmatrix — das darf `_einfrieren()` gefahrlos einfrieren.
- **⚠️ HARNESS-FALLE: die Spielschleife deckelt `dt` auf 0,05 s** (Zeile ~11000). Im
  Software-Renderer bei ~1 Bild/s laeuft die SPIELZEIT damit rund 20x langsamer als die
  Wanduhr. Ein Cooldown von 6 s braucht im Test 2 Minuten — mein erster Probe-Durchlauf
  meldete das Fuettern faelschlich als kaputt. Fuer Tests: Cooldowns per Sonde nullen
  und die Figur mit `_hide` festnageln (sonst laeuft die KI sie aus dem Trigger-Ring).
- Kosten des ganzen Pakets: ~8 Zeichenaufrufe (647 gesamt, vorher 632).

## 🧱 `bauViele()` — wiederholte Kleinteile instanzieren (2026-08-23)
- Grep-Anker: `function bauViele`, `window._instGruppen`, `window._instanzen`
- **Gemessen, nicht geraten:** die teuersten Posten sind nicht die grossen Gebaeude,
  sondern die WIEDERHOLTEN Kleinteile. `th33_parkzaun_modul` 52x a 35 Meshes = 1820,
  `th38_weidezaun` 32x a 36 = 1152. Als Instanzen kostet der ganze Zaun so viel wie EIN
  Modul.
- `bauViele(datei, hoehe, stellen)` nimmt eine Liste `[x, z, rotY]`, laedt das Modell
  EINMAL ueber `bau()`, rechnet seine Meshes aus der Vorlage heraus (Gruppen-Matrix
  invertieren — sonst gehen Hoehenskalierung und Boden-Versatz verloren), setzt sie als
  InstancedMesh und entfernt die Vorlage, auch aus `_gebaeude`.
- **⚠️ DIE FALLE, IN DIE ICH GELAUFEN BIN:** `nieAusblenden` heisst IMMER GEZEICHNET.
  Die Einzelmodule wurden vorher ab 78 m ausgeblendet; als Instanzgruppe liefen Park-
  und Koppelzaun dauerhaft mit — **Zeichenaufrufe 655 → 790**, Dreiecke fast verdoppelt.
  Instanzieren allein ist also NICHT automatisch billiger. Jede Gruppe bekommt darum
  ihre eigene Mitte und ihren Radius (`_instGruppen`) und wird in `lodTakt` als Ganzes
  auf Entfernung ausgeblendet. Danach **632**.
- **⚠️ Nur fuer Dinge, deren Lage aus der Geometrie folgt** (Zaunlinien, Alleen, Hecken).
  Instanzen stehen NICHT in `_gebaeude` und sind fuer th-pruef unsichtbar.

## 🌳 Die Hecke war keine Hecke — und der billigere Weg war der dichtere (2026-08-23)
- Grep-Anker: `heckenStellen`, `window._heckeZahl`
- **Befund auf Augenhoehe:** die Hecke am Grundstueck war eine Reihe einzelner Bloecke.
  Gemessen: Modul **2,31 m breit**, Raster **4,0 m** — 1,69 m Luft zwischen je zwei.
  Von oben faellt das nicht auf.
- **⚠️ Einfach dichter setzen war KEINE Option.** Jedes Modul bringt **sechs Meshes** mit,
  63 stehen allein am Grundstueck. Raster 2,25 haette 49 Module und bis zu **+294
  Zeichenaufrufe** auf 781 gekostet — ein Plus von 38 % auf dem Handy.
- **Instanzieren loest beides.** Das Modell wird EINMAL ueber `bau()` geladen, in der
  Rueckmeldung werden seine Meshes aus der Vorlage herausgerechnet (Gruppen-Matrix
  invertieren, damit Skalierung und Boden-Versatz erhalten bleiben), als InstancedMesh
  neu gesetzt und die Vorlage entfernt — auch aus `_gebaeude`.
  **98 Module statt 63, in 6 Zeichenaufrufen: 781 → 655.**
- **Muster zum Wiederverwenden:** jedes `bau()`-Objekt, das oft und gleich vorkommt
  (Zaunfelder, Poller, Hecken, Baenke), laesst sich so instanzieren. Die Dreieckszahl
  steigt, die Zeichenaufrufe fallen — und in dieser Datei sind die Zeichenaufrufe der
  Engpass, nicht die Dreiecke.

## 👁️ Auf AUGENHOEHE pruefen, nicht aus der Vogelperspektive (2026-08-23)
- **Werkzeug: `node spiele-dev/tools/th-augen.mjs <x> <z> [rot] [ziel.png]`** — setzt die
  Figur an den Ort und schaltet die Ego-Kamera ein. `th-blick` mit kleinem Radius landet
  zu leicht unter einem Portikus (die „Kamera in der Wand"-Falle).
- **⚠️ `freiPlatz` BEWEIST KEINE GUTE KAMERAPOSITION.** Bei (0|96) meldete es „frei", die
  Kamera steckte trotzdem in der Bahnhofswand — `freiPlatz` kennt eingetragene
  Grundrisse, nicht jedes Dach und jede Kante. Das Werkzeug MISST darum zusaetzlich mit
  einem Strahl aus der Kamera und warnt, wenn der erste Treffer naeher als 1,5 m liegt.
  Ohne diese Anzeige haette ich zweimal ein Wandbild als Grafikfehler gedeutet.
- **⚠️ Raycast nicht rekursiv ueber `scene.children`** — dabei stiess er auf ein Objekt
  ohne Elternkette und starb mit `Cannot read properties of null (reading 'matrixWorld')`.
  Erst eine eigene Liste sichtbarer Meshes sammeln, dann flach schneiden.
- **Was der erste Blick von unten fand:** eine Ersatzbank am Sportplatz klebte mit 0,2 m
  Ueberschneidung an einer Hauswand. Von oben unsichtbar, unter der 1-m-Schwelle der
  Pruefung — auf Augenhoehe sofort zu sehen.
- **Was von oben nie auffaellt:** aus der Ego-Sicht fuellt der HIMMEL rund 40 % des
  Bildes. Er war das flachste Element der Szene — und das haben alle bisherigen
  Vogelperspektiv-Runden uebersehen.
- **Der Verlauf war 64 Zeilen hoch**, ueber eine Kuppel mit Radius 520 gezogen: klar
  sichtbare Streifen. Jetzt 256 Zeilen, fuenf Stuetzstellen und ein Hauch Dither
  (+-3/255). Ohne das Rauschen bleiben Streifen auch bei 256 Zeilen — eine 8-Bit-Rampe
  ueber so eine Flaeche hat zu wenige Stufen.
- **Die Wolken sassen alle auf 95…165 m** — von oben reichlich, von der Strasse aus
  liegt fast alles davon ueber dem Bildrand. Jetzt 22 statt 15 Ballen, jeder dritte
  tiefer und naeher. Kostet keinen Zeichenaufruf: dieselbe InstancedMesh.
- **⚠️ DAS WETTER WUERFELT PRO LAUF** (`rollWetter`). Zwei Bodenbilder unterscheiden sich
  in der Helligkeit dann durch das Wetter, nicht durch die Aenderung. Wer das nicht
  merkt, schreibt sich eine Verbesserung gut, die der Zufall gemacht hat.

## 🔢 `_gebaeude` IST KEIN INVENTAR — dreimal dieselbe Falle (2026-08-23)
Diese Blindstelle hat in dieser Datei jetzt dreimal zugeschlagen. Sie steht darum hier
oben, nicht als Fussnote:

| Fall | was `_gebaeude` zeigte | was wirklich da war |
|---|---|---|
| Felder, Hecken, Alleebaeume | nichts (InstancedMesh) | 45 Baeume, 102 Hecken, 76 Alleebaeume |
| Bauzaun in der Markthalle | nichts (0,4 m duenn) | 7 Felder in zwei Gebaeuden |
| **Strassenlaternen** | **48** | **138** (90 prozedurale in `window._lampPos`) |

Beim letzten Fall habe ich aus den 48 einen Befund gemacht — „57 % der Strassen ohne
Laterne" — und angefangen, Laternen nachzupflanzen. Der eingebaute Doppel-Schutz hat
dann **0** gesetzt, weil in Wahrheit **0 %** der Strassen dunkel sind. Die Arbeit war
umsonst, der Befund frei erfunden.

**Regel: vor jeder Aussage der Form „es gibt zu wenig X" das Inventar aus ALLEN Quellen
zusammensetzen** — `_gebaeude` (GLB-Modelle), die prozeduralen Register (`_lampPos`,
`dorfFenster`, `_alleeStellen`, `_wasser` …) und `scene.children` fuer alles, was
prozedural gebaut und nirgends registriert ist. Wer nur eine Quelle zaehlt, misst seine
eigene Suchfunktion, nicht die Stadt.

## 🪟 Modell-Gebaeude bekommen nachts Licht (2026-08-23)
- Grep-Anker: `_glasMats`, `dorfFenster`
- **Der Befund:** `dorfFenster` fasst nur die PROZEDURAL gebauten Haeuser — gemessen 337
  Materialien, die nachts alle korrekt leuchten. Die rund 850 GLB-Gebaeude waren nie
  erfasst und blieben dunkle Kisten. Deshalb wirkte die Nacht leblos.
- **Die Modelle benennen ihr Glas einheitlich** — gemessen ueber 873 Materialnamen:
  `VlGlas` 134x, `KlGlas` 109x, `TurmGlas` 96x, `Glas` 84x, `Fensterglas` 84x,
  `HalleGlas`, `PlGlas`, `SuGlas`, `Scheibe`. Regel: `/glas|scheibe/i`.
- **⚠️ Zwei Ausschluesse, ohne die es falsch aussieht:** `Fensterrahmen` (240x!) ist KEIN
  Glas, und `Kabinenglas` sitzt in Fahrzeugkanzeln — sonst leuchten Rahmen und geparkte
  Kranfuehrerhaeuser.
- **⚠️ Nicht alles anschalten.** Materialien sind geteilt: ein Material = ein ganzer
  Gebaeudetyp. Jedes dritte bleibt dunkel, sonst sieht die Stadt aus wie ein Schaltbrett.
  184 von rund 276 Kandidaten leuchten.
- Eingesammelt wird im selben Daemmerungs-Durchlauf wie `_envMats` (fruehestens 20 s,
  damit die spaet geladenen Modelle drin sind); umgeschaltet nur bei Wechsel Tag/Nacht,
  Tagwerte werden exakt zurueckgesetzt.

## 🌙 Die Nacht war taghell — eine Zeile fuer die falsche three-Version (2026-08-23)
- Grep-Anker: `_envMats`, `environmentIntensity`
- **Der Befund:** um 22:10 war `dayA` 0, die Sonne auf 0,20 heruntergeregelt und der Himmel
  auf `#131c30` — und die Wiese trotzdem in vollem Mittagsgruen. Nur Laternenkegel und
  Autoscheinwerfer schalteten um.
- **Die Ursache:** `if(scene.environmentIntensity!==undefined) …` — die Eigenschaft gibt es
  erst ab **three.js r163**, geladen ist **r128**. Die Abfrage hat die Abdunklung still
  uebersprungen, und die Umgebungskarte (eine TAGES-HDR) beleuchtete die Stadt die ganze
  Nacht mit voller Staerke. Eine Zeile, die aussieht wie eine Vorsichtsmassnahme und in
  Wahrheit ein ganzes Feature abschaltet.
- **In r128 sitzt die Staerke pro Material** (`envMapIntensity`). Die Materialien werden
  EINMAL eingesammelt — erst in der Daemmerung und fruehestens nach 20 s, damit die
  Streu-Objekte drin sind — und danach nur skaliert, wenn sich der Faktor um mehr als 0,03
  aendert. Gemessen: 8521 geteilte Materialien, Beispiel 0,30 statt Basis 1,0.
- **⚠️ Tag bleibt unangetastet:** bei `dayA=1` ist der Faktor exakt 1,0.
- **⚠️ NICHT weiter abdunkeln ohne Rueckfrage.** Der hohe Nacht-Sockel (`hemi` 0,48,
  Belichtung 0,62) ist eine ausdrueckliche Nutzerentscheidung — „man sieht nichts", und
  0,34 Belichtung war damals zu dunkel zum Spielen. Die Nacht ist jetzt spuerbar dunkler,
  aber bewusst noch hell.
- **⚠️ Uhrzeit im Test:** `uhrzeit` setzen reicht nicht fuer ein Nachtbild. Himmel und Sonne
  werden pro Bild auf ihr Ziel gelerpt, und die Seite laeuft im Software-Renderer bei rund
  einem Bild pro Sekunde — nach 4 s stand die Blende noch fast auf Tag. Mehrfach setzen und
  ueber 30 s warten.

## 🌳 Allee aus der echten Strassengeometrie (2026-08-23)
- Grep-Anker: `function allee`, `bandFrei`, `window._alleeStellen`
- **Vorher vier handgetippte Reihen** (`SZa+12+13`, `RX+10`) aus der Zeit, als die Karte
  vier Strassen hatte. Ring, Zubringer und die Bahnhofsachse blieben kahl, und die
  Abstaende veralten still — genau der Fehler, der oben schon einmal steht (die Allee
  stand nach einer Verbreiterung auf dem Trottoir). Jetzt aus `_KORRIDORE` gerechnet:
  2,8 m hinter der gemessenen Bandkante, bei Bedarf 5,2 m. Wird eine Strasse breiter,
  wandert die Allee mit.
- **⚠️ INSTANZIEREN IST HIER PFLICHT, nicht Kuer.** `baum2` haengt pro Baum VIER Meshes in
  die Szene. Der Sichtbarkeits-Index wird EINMAL bei 4 s gebaut — Streu-Objekte entstehen
  erst nach dem load-Event und stehen gar nicht darin; Kronen liegen ausserdem ueber der
  2,2-m-Schranke und waeren ohnehin immer sichtbar. Rund 300 Baeume haetten die
  Zeichenaufrufe VERDOPPELT. Als InstancedMesh kosten 76 Baeume **drei**.
- **⚠️ `wegVonStrasse` prueft nur den ANKERPUNKT.** Ein Baum ist 1,1 m breit: gemessen ragte
  eine Krone 1,7 m in die Strandzufahrt, obwohl der Mittelpunkt frei lag. `bandFrei(x,z,r)`
  prueft jetzt den KREIS gegen alle Baender. Danach 0 Treffer.
- **⚠️ Und wieder: Instanzen landen NIE in `_gebaeude`.** th-pruef kann Alleebaeume nicht
  sehen. `window._alleeStellen` haelt die Standorte abrufbar, damit ein Werkzeug sie
  gegen die Baender nachrechnen kann — ohne das waere die Pruefung hier blind.

## 🏦 Die Bank stand nirgends — Gebäude, Personal, Überfall (2026-08-23)

**Der Koop-Überfall lief gegen ein leeres Feld.** `coupZone()` gibt `window._bankPos` zurück,
mit Fallback (172|−20). Gemessen: `_bankPos` ist **undefined**, und in der ganzen Welt sind
**null** th23-Bauten geladen. Das Modell `th23_bank.glb` gibt es seit Charge 23 — mit
Kassenhalle, vier Schaltern, drei Beratungskabinen hinter Glas, Geldautomaten-Nische und
Tresortür —, aber es gehört zum Viertel **„Gewerbe Ost"** (172|0), und das wird nicht gebaut.

> ⚠️ **Damit fehlen auch Parkgarage, Post, Polizeiwache und Apotheke** (`th20_parkgarage`,
> `th23_post`, `th23_polizeiwache`, `th23_apotheke`) — im ganzen Spiel sind nur **3** Bauten aus
> th20/22/23/37 geladen. Warum `viertel({name:"Gewerbe Ost"})` nichts absetzt, ist **nicht**
> untersucht; das gehört der Quartiers-Mechanik und ist hier nur als Befund notiert.

**Jetzt:** die Bank steht explizit bei (−66|−137), neben der Klinik — zusammen ein kleines
Behördenviertel. Gemessen 21,5 × 16,9 × 5,70 (Maßstab 1,0 bei `bau(...,5.7,...)`; die Doku-Maße
33,0 × 25,9 × 7,2 in TH5-ASSETS.md stimmen **nicht**). Kollider mit Türlücke auf der Nordseite,
sonst wäre das ganze Innenleben zugemauert.

> ⚠️ **Die Stadt ist voll.** Für 34 × 27 m liegt der nächste freie Platz **158 m** außerhalb;
> selbst 22 × 18 findet erst 139 m draußen etwas. Innerhalb des Rings und außerhalb des
> Baugrundstücks: **null** Plätze. Wer hier noch etwas Großes unterbringen will, muss in die
> Peripherie oder kleiner skalieren.

**Personal.** Drei Angestellte hinter den Schaltern, Posten **gemessen** (Tresen auf z −142,6 bei
x −71,5 / −67,8 / −64,2, Innenboden y 0,20) statt aus lokalen Blender-Koordinaten über Skalierung
und `rotY` zurückgerechnet — dieser Weg hat drei Vorzeichen zum Irren. `mkBewohner` hängt sich
selbst in die Szene und liefert die Gliedmaßen in `userData` (`la`/`ra` = Arme).

**Überfall.** Bei `COUP.phase>0` gehen die Hände hoch (`rotation.x = −2.4`, wie in der
Panik-Animation der Passanten), alle drehen sich zur Tür und zittern; danach zurück in den
Leerlauf (Blick wandert, Atmen). Geprüft über eine Sonde: Ruhe −0,07 → Überfall −2,46 → danach
−0,10, Blick 3,14.

## 🤝 Koop-Mission „Sperrgut zu zweit tragen" (2026-08-23)

Es gab bisher **eine** echte Koop-Mission, den Bank-Coup. Der prüft ZONEN: beide an der Bank,
später beide am Fluchtwagen — dazwischen kann jeder machen, was er will. Die neue Mission prüft
den **Weg**: die Kiste rührt sich nur, solange **beide** in Reichweite sind (5 m). Wer stehen
bleibt, hält den anderen auf.

- Knopf 📦 (nur sichtbar in einer Koop-Runde), HUD `#tragHud` mit Restmeter und Namen dessen,
  der zu weit weg ist. Host armiert; der Gast schickt `{t:"tragReq"}` statt selbst zu starten.
- Netz: `{t:"trag",on:1,x,z}` / `{t:"tragP",x,z}` alle 0,2 s / `{t:"trag",on:0,ok}`.
  **Nur der Host rechnet** — dieselbe Lehre wie bei der Coup-Beute, die früher beide Peers
  eigenständig würfelten (doppeltes Geld).
- Die **Team-Aufgaben** (`TEAMQ`) sind übrigens *keine* Koop-Missionen: alle acht sind
  „macht zusammen N×X" auf einer gemeinsamen Statistik — einer allein erfüllt jede davon.

> ⚠️ **Erster Entwurf verworfen: die Kiste sollte auf gerader Linie zum Ziel gleiten.** Dafür
> gibt es in dieser Stadt keinen Platz — die Suche nach einem freien 30-m-Korridor ergab
> **null** Treffer. Jetzt folgt die Kiste dem Mittelpunkt zwischen beiden Trägern; den Weg
> suchen sich die Spieler selbst, und Bäume oder Zäune dazwischen sind egal.

> ⚠️ **Beim Messen freier Punkte MUSS die Himmelskuppel raus.** Sie ist ein Mesh von
> **1040 × 1040 × 1040** um den Ursprung und überdeckt sonst *jeden* Punkt der Karte — die
> erste Kiste landete deshalb auf einem Dach, und ein Freiflächen-Sweep meldete „überall
> besetzt". Die Grenze liegt bei **300 m, nicht bei 70**: ein zusammengefasstes
> Häuserzeilen-Mesh ist breiter als 70 und muss als Hindernis zählen. Beide Filter waren
> nacheinander falsch — erst zu grob (Dach), dann zu streng (nichts frei).

> ⚠️ **Was NICHT live geprüft ist.** `th-koop.mjs` läuft grundsätzlich (7/7 grün), war für
> diesen Test aber zu wackelig: der Gast verband sich in mehreren Anläufen nicht
> („Raum nicht gefunden, Grund: timeout"), ein Lauf brach nach 10 Minuten ab. Geprüft wurde
> deshalb über Sonden im Spielscope: Missionslogik (solo gesperrt · einer weg → Kiste steht ·
> beide → angekommen nach 31 m Fußweg · +450 $) und **alle Gast-Netzpfade einzeln**
> (`onNetMsg` mit `trag`/`tragP`/`trag off`: Kiste erscheint in der Szene, folgt, verschwindet;
> Knopf sendet nur `tragReq`). Eine echte Sitzung zu zweit steht aus.

## 🌐 Koop Teil 3: Wiedereinstieg + Grenzen der Test-Engine (2026-08-23)
- `th-koop.mjs` prueft jetzt acht Dinge: Bewegung, fuenf Abgleiche, zwei Streitfaelle
  (gleichzeitig dieselbe Zelle) und den **Wiedereinstieg mitten im Spiel**.
- **⚠️ Engine B gibt den Gast-Platz NICHT wieder frei.** Stirbt der Kanal des Gasts, geht
  die HOST-Sitzung auf `closed` und kommt nicht nach `waiting` zurueck. Engine A (PeerJS,
  Produktion) macht genau das (`main = null`, `peer.on("connection")` nimmt den naechsten).
  Der Wiedereinstieg ist damit im lokalen Test **nicht pruefbar** — das Werkzeug meldet
  ihn als offen (gelber Strich), NICHT als Fehler. Wer den roten Haken ungeprueft
  weitergibt, meldet einen Fehler, den das Spiel auf echten Geraeten vermutlich nicht hat.
- **⚠️ Beim Beitritts-Neuversuch MUSS der Host mit.** Ein leichter Neuversuch (nur der Gast
  ueber „Abbrechen" zurueck) ist schlechter: er verbindet sich gegen einen toten Raum, und
  der Start stirbt sofort mit `stille`. Messbar an `0.0s Host: laeuft/closed` bei
  scheinbar verbundenem Gast. Also beide Seiten neu und frischer Raum.
- **⚠️ `node_modules` ueberlebt eine Wiederherstellung aus dem Klon NICHT** (es ist
  gitignored). Nach so einer Reparatur `npm install` — sonst scheitern alle
  Playwright-Werkzeuge mit `Cannot find package 'playwright'`.

## 🌐 Koop Teil 2: Keepalive, fluessige Partner, gruene Tests (2026-08-22)
- **Engine B hatte KEINEN Keepalive.** Engine A (PeerJS, Produktion) sendet alle 2 s ein
  `__ka`; die lokale Test-Engine hat nur GELAUSCHT. Damit starb jede Sitzung, sobald das
  Spiel selbst 6 s nichts schickte — reproduzierbar GENAU beim Spielstart, wenn die
  Gegenseite ihre Welt baut. Beweis: `lost:stille` auf BEIDEN Seiten, 2 s nach dem Start.
  Ohne diesen Fix misst der Zwei-Seiten-Test nur sich selbst.
- **⚠️ Den Abbruchgrund am ENTSTEHUNGSORT abgreifen.** Das Spiel setzt `MPs = null` im
  selben Zug, in dem die Sitzung schliesst — wer danach pollt, sieht ein leeres Feld und
  raet. Die Sonde `koopWatch` haengt sich in `onStatus` und haelt die Sitzung in einem
  Abschluss fest. Erst damit kam `lost:stille` ueberhaupt ans Licht.
- **Vorhersage des Gasts ist jetzt END-TO-END belegt** (mit Keepalive lief der Test durch):
  2,78 m gelaufen, Abstand zur Hostwahrheit im Mittel 0,35 m / hoechstens 0,51 m, und
  **0,02 m nach dem Loslassen** — der Ausgleich laeuft also sauber zusammen.
- **Fremde Figuren pulsierten.** Pakete kommen alle 350 ms; `x += (ziel-x)*dt*8` zieht
  direkt danach an und steht kurz darauf fast still. `netAnnehmen`/`netZiel` leiten aus
  zwei Paketen die Geschwindigkeit ab und schieben das ZIEL dazwischen weiter — kein
  einziges zusaetzliches Byte. Gemessen an der ausgelieferten Funktion (Sonde, 200 Bilder):
  Ruckeln 0,93 → 0,52 · Kriech-Bilder 46 → 26 von 200 · Rueckstand 1,19 m → 0,44 m.
  Vorausrechnung ist auf 0,6 s gedeckelt, sonst laeuft eine Figur bei Paketausfall davon.
- **Die 3 alten `mp_unit`-FAILs waren STALE TESTS, kein Bibliotheksfehler.** Der Peer-Stub
  schliesst neue Reconnect-Kanaele nicht von selbst; wer genau EINEN toetet und 50 ms
  spaeter prueft, sieht "lost" — korrektes Verhalten, die Sitzung wartet auf den naechsten
  Versuch. Der Helfer `bisAufgabe()` modelliert jetzt "Host endgueltig weg" (jeder Versuch
  stirbt) und erreicht den erwarteten Endzustand in rund einer Sekunde. **13/13 PASS.**

## 🌐 Online-Koop: echt zu zweit testen (2026-08-22)
- Werkzeug: `node spiele-dev/tools/th-koop.mjs` — zwei Seiten in EINEM Browser ueber
  `?mp=local` (rohes WebRTC + BroadcastChannel), also echte DataChannels.
- **Vier Umgebungsfallen, alle behoben — nicht neu entdecken:**
  1. `python3 -m http.server` ist EINFAEDIG. Waehrend Seite 1 ihre ~800 GLB zieht,
     verhungert die HTML-Anfrage von Seite 2. → `ThreadingHTTPServer` (Port 8901).
  2. Zwei volle 3D-Szenen legen den Container lahm — Playwright kam nicht einmal durch
     die Sichtbarkeitspruefung eines Eingabefelds. → `.glb`-Anfragen abweisen; fuers
     Netz ist die Deko ohne Belang.
  3. Chromium versteckt lokale IPs hinter `.local`-mDNS-Namen → ICE findet kein Paar.
     → `--disable-features=WebRtcHideLocalIpsWithMdns`.
  4. Nur EINE Seite ist im Vordergrund; in der anderen haelt Chromium
     `requestAnimationFrame` an — die Spielschleife des Hosts stand still.
     → `--disable-background-timer-throttling --disable-backgrounding-occluded-windows
     --disable-renderer-backgrounding`.
- **⚠️ ANTWORTZEITEN sind hier NICHT messbar.** Beide Seiten laufen bei rund einem Bild
  pro Sekunde (zeitweise deutlich weniger) — jede Millisekundenzahl waere die Bildrate.
  Ein `setInterval(50)` IN der Seite lief genau einmal. Der Test prueft darum das
  RISIKO der Vorhersage: laeuft die Figur des Gasts der Wahrheit des Hosts davon?
- **⚠️ `dispatchEvent(new KeyboardEvent(...))` erreicht den Spiel-Handler NICHT** — die
  Figur blieb ueber alle Proben exakt stehen. `page.keyboard.down()` + `bringToFront()`.
- **Der Beitritt ueber Loopback klappt nicht jedes Mal** (mal 1,6 s, mal Timeout) — das
  Werkzeug versucht es bis zu sechsmal. Das ist die Umgebung, kein Spielfehler.
- **Diagnose in `js/mp.js`:** `MPs._why` sagt, WARUM eine Sitzung endete
  (`stille` / `kanal-zu` / `pcstate:…` / `timeout`), `MPs._diag()` gibt den WebRTC-Zustand.
  Ohne die beiden ist „Raum nicht gefunden" nicht von „Verbindung stand, wir haben nur
  auf ein Ereignis gewartet" zu unterscheiden.
- **⚠️ `tools/mp_unit.cjs` hat 3 ALTE FAILs** (A2 Status/destroy, B1 quick endet closed) —
  identisch auf der Fassung von HEAD, also nicht durch Koop-Aenderungen verursacht.

## 🧱 „Steckt drin" — die Luecke, durch die Moebel in Waenden landeten (2026-08-22)
- Grep-Anker: `function steckt1`, `KEIN_GEHAEUSE`, `STECKT DRIN` (in `th-pruef.mjs`)
- **Die Ursache, ueber Jahre wirksam:** `entwirren()` prueft Ueberschneidungen mit
  `schneidet()` — **>1,2 m in JEDER Achse**. Fuer einen 0,60 m breiten Papierkorb ist
  diese Schranke unerreichbar. Folge: (a) `paare()` hat so einen Fall NIE als Problem
  gemeldet, und (b) beim Ausweichen sah **jeder** Platz frei aus, auch mitten im
  Gasthaus. Der Aufraeumer hat Strassenmoebel also aktiv in Gebaeude gestellt.
- **Beide Werkzeuge waren genauso blind:** `th-pruef` siebt bei 1,00 m, `th-3d` bei
  0,50 m. Ein 0,40 m duennes Bauzaunfeld konnte komplett in einem Haus stehen, ohne
  dass irgendetwas etwas gemeldet haette — sieben von neun taten das auch.
- **Die Regel, die fehlte:** nicht „wie tief", sondern **„wie viel davon"**. Mittelpunkt
  im Grundriss des anderen + >60 % der Grundflaeche darin + >0,5 m gemeinsame Hoehe.
  Steht jetzt in `entwirren()` (`steckt1`) UND als Kandidatenliste in `th-pruef`.
- **⚠️ Ein Baum ist kein Gehaeuse.** Ohne `KEIN_GEHAEUSE` (Baeume, Hecken, Daecher,
  Gerueste, Kraene, Masten, Zaeune, Tankstellenvordach) faellt jede Laterne unter jeder
  Eiche in die Liste — und der Entwirrer findet fuer Moebel unter Baeumen nie mehr
  einen Platz.
- **⚠️ Kastenlogik beweist nichts.** Von 23 Kandidaten waren nur 11 mesh-genau echt; die
  anderen 12 standen VOR einer Fassade, deren Kasten ueberhaengt. Darum ist „Steckt
  drin" in `th-pruef` **kein Abbruchkriterium**, sondern eine Kandidatenliste — jeder
  Eintrag gehoert mit `th-3d.mjs <a> <b>` bestaetigt, bevor jemand etwas verschiebt.
- **Wirkung:** mesh-bestaetigte Fremdkoerper 11 → 1, `ohnePlatz` 15 → 10.
- **⚠️ Nicht zwei Chromium-Laeufe parallel.** `game_smoke` und `th-blick` gleichzeitig
  ergaben einen HARNESS-Fehler und einen Node-Absturz; einzeln laufen beide durch.

## 🏫🚒 Fremdkoerper aus Gebaeuden geraeumt (2026-08-22)
- Grep-Anker: `function schulhofAusbau`, `function bahnFest`, `th46_baucontainer`, `th49_rettungswagen`, `th43_loeschfahrzeug`
- **Der Befund:** 26 Ueberschneidungen, davon zehn Objekte KOMPLETT in einem Gebaeude —
  Turnhalle ueber der Bahnstrecke, halber Schulhof im Stadthaus, Buerocontainer ebenda,
  zwei Rettungswagen in der Notaufnahme, ein LKW in der Lagerhalle. Danach 14, und jede
  verbliebene ist gewollt (Seilbahn), natuerlich (Baumkronen) oder ein Kasten-Artefakt.
- **`userData.fest` fuer alles an der Strecke** (`bahnFest`): ohne das schob `entwirren()`
  einen Oberleitungsmast 11 m von seinem Gleis weg — MITTEN IN DEN BAHNHOF. Eine Mastreihe
  ist vermessene Infrastruktur, kein Deko-Baum.
- **Festnageln deckt alte Setzfehler auf.** Die Bahnsignale standen seit jeher 0,5 m im
  Zubringer-Band; `entwirren()` hatte sie jedes Mal stillschweigend herausgeschoben. Wer
  etwas `fest` macht, muss danach den Korridor-Test neu lesen.
- **Der Aufraeumer ist kein Ersatz fuer Messen.** `entwirren` meldete `ohnePlatz: 50` — es
  gab die Ueberschneidungen also auf. Nach dem Umbau: 15. Diese Zahl ist der ehrlichste
  Indikator dafuer, wie ueberfuellt ein Viertel ist.
- **Belag und Fussgaengerrouten muessen mitziehen.** Der Hof wurde verlegt, sein
  Pflaster (`function schule`, PlaneGeometry) und die `fg(...)`-Route lagen danach noch
  am alten Ort — die Route lief 9 m durch eine Hauswand.
- **Ein Kasten-Ueberlapp ist nicht immer ein Fehler:** der Oberleitungs-Ausleger ist auf
  7,5 m Hoehe 11,2 m breit und haengt ueber Bahnsteig und Loeschfahrzeug. Mastfuss frei,
  Metall 6 m darueber — nicht "aufraeumen".

## 🛣️⛪🔭 Stadtumbau (2026-08-20)
- Grep-Anker: `Richtungspfeile auf den ZUFAHRTEN`, `var DOM_X=`, `function kircheDetails`, `dachterrasse`, `panorama:{dauer:36`
- **Pfeil-Regel:** Pfeile gehoeren auf die ZUFAHRT (Spitze zur Kreuzung), Spurlage aus `ROUTEN` ableiten — nie raten.
- **Rechtsverkehr pruefen:** wer nach +x faehrt, gehoert auf groesseres z; wer nach +z faehrt, auf kleineres x.
- **Kathedrale:** haengt an `DOM_X/DOM_Z`; Modellbox ist ASYMMETRISCH (Anker +11,2 Portal / −9,3 Chor / ±8,7 Waende). Bau ist `fest` — ohne das schob der Aufraeumer ihn 2,2 m unter der Deko weg. Trau-Zone liest `window._DOM`.
- **Neue Plaetze IMMER in `freiPlatz()` eintragen**, sonst waechst der Streu-Wald hinein (Wochenmarkt, Sportplatz, Kirchhof).
- **Aussichtsturm:** `window._turm` + FAHRT_ART `panorama` (nutzt das vorhandene Fahrgeschaeft-System mit Ego-Kamera).
- Sonde: `__th.bahnProfil("panorama")` gibt die Hoehenkurve zurueck.

## 🎮 Modi + 🎯 Tages-Missionen (2026-08-15)
- Grep-Anker: `var MODUS=` (klassisch/sprint/sandbox/hardcore), `MISS_POOL`, `function missNeu`, `function feier`, `var plopps=`
- Modus-Wahl NUR bei frischem Spiel (kein Save) — Overlay per JS im soloBtn-Handler; Bestands-Saves bleiben Klassisch.
- Missionen: 3/Tag, deterministisch aus `tag` gewuerfelt, Fortschritt = Delta zur `basis`; Host-autoritativ, Sync `{t:"tmiss"}`.
- Test-Falle: frisches Browser-Profil hat keinen Save -> th-lib klickt `button[data-m="klassisch"]` nach soloBtn. Ohne den Klick startet das Spiel nicht (Zeichenaufrufe ~3450 statt ~590 = Culling laeuft nicht -> genau daran erkennt man es).
- Sonden: `__th.missionen() / missNeu() / missCheck() / modus("hardcore") / plopps()`.
- `__th.tagesReport()` zeigt die Tagesabschluss-Karte. ⚠️ Screenshot-Falle: die Karte blendet nach 7 s aus, aber `page.screenshot` braucht im Software-Renderer oft 10–20 s — Sichtpruefung per DOM-Rect/Text machen, nicht per Bild.

## 🔧 Werkzeuge — nicht jedes Mal neu bauen

* **`th-tempo.mjs`** — wohin die Bildzeit geht: Aufteilung Rendern/Rest, Zeichenaufrufe,
  Dreiecke, Objekte, Meshes, `matrixAutoUpdate`, Lichter, Materialien. ⚠️ Absolute fps aus
  diesem Container sind **kein Gerätewert** (SwiftShader, 85,8 % native Rasterizer-Zeit) —
  nur Anzahlen und Verhältnisse übertragen. Für CPU-Fragen Leinwand auf 280×170.
* **`th-viertel.mjs`** — warum ein Viertel dort steht, wo es steht: Strengestufe je Viertel
  und der *Grund* der Ablehnung (Fahrbahn mit Bandname, Berg mit Boxkoordinaten, Kollider).

```bash
# Gesamtprüfung: Straßenkorridore, Überschneidungen, 404, JS-Fehler, Zeichenaufrufe
/opt/node22/bin/node spiele-dev/tools/th-pruef.mjs
/opt/node22/bin/node spiele-dev/tools/th-pruef.mjs --wartezeit 60000

# Grundfläche eines Modells bei Zielhöhe (Pflicht vor jedem viertel()-cfg!)
/opt/node22/bin/node spiele-dev/tools/th-mass.mjs th23_bank:9 th20_parkgarage:11

# Screenshot aus dem laufenden Spiel
/opt/node22/bin/node spiele-dev/tools/th-blick.mjs 78 58 45 0.9 /tmp/kreuzung.png
```

Eigene Sonde nötig? `spiele-dev/tools/th-lib.mjs` → `mitSonden(datei, {name: "function(){…}"}, ziel)`
hängt sie in `window.__th` ein; der Code läuft im IIFE-Scope und sieht `scene`,
`renderer`, `WORLD_SOLIDS`, `wegVonStrasse`, `korridorKonflikt`, `window._gebaeude`.

## 📐 Die drei Regeln, an denen fast alles gescheitert ist

**1. `bau()` skaliert NUR über die Höhe.** Breite und Tiefe folgen aus dem Modell.
Wer sie im `viertel()`-cfg schätzt, setzt die Reihe zu eng. Gemessen: `th20_parkgarage`
bei 11 m ist **54,7 × 37 m**, im cfg stand 20 × 15 — zwei Bauten überlappten um 10,7 m.
→ **Immer `th-mass.mjs` laufen lassen und die echten Werte eintragen.**

**2. `wegVonStrasse()` und `freiPlatz()` prüfen nur den ANKERPUNKT.** Ein 30 m breites
Haus, dessen Mitte 12 m neben der Fahrbahn steht, ragt trotzdem 6 m hinein und gilt als
frei. Für Flächen gilt `korridorKonflikt(box)` gegen `window._KORRIDORE`.
→ Nach jedem Platzieren `th-pruef.mjs`; Sollwert **0 im Korridor**.

**3. `_einfrieren()` setzt nach 9 s `matrixAutoUpdate=false`.** Jede spätere
Positionsänderung ändert nur eine Zahl — das Modell bleibt sichtbar stehen. Deshalb war
`entzerren()` (14 s) jahrelang wirkungslos.
→ Nach jeder späten Verschiebung `window._nachRuecken(objekt)` aufrufen.

## 🎮 Spielschleife (seit 2026-08-11)

**Bauabnahme:** Alle 4 Spieltage kommt der **Bauinspektor** zu Fuß (NPC-Typ `inspektor`,
Amts-Gate wie Polizist/Bürgermeister) und prüft drei Kriterien: **Hauswert**,
**Wohnbereiche** (`katVielfalt()`, max 6 — „bau" enthält keine Möbel!) und **Komfort**
(`komfort()` = Möbel mit `use`-Eigenschaft; die Bedürfnisse sind bewusst abgeschaltet
und stehen fest auf 100 — nie wieder als Kriterium verwenden). Bestehen ⇒ `wohnstufe++`,
Prämie, dauerhaft +12 % je Stufe auf **alle sechs** Einnahmequellen (Lohn, Ernte,
Markthalle, Straßenmusik, Lieferung, Angeln — via `stufenBonus()`), Luxus-Möbel mit
`stufe:` im KATALOG schalten frei. Host sendet `{t:"stufe"}` an den Gast.
Kopfzeile `#stufeBox` zeigt immer, was fehlt — **die Handlung vorn, der Titel nur bei
Platz** (auf dem Handy wurde sonst genau der Fehlbetrag abgeschnitten).
Blitz-Lieferungen sind auf 4/Tag gedeckelt (`_liefHeute/_liefTag`), krumme Dinger auf
2/Tag für **beide** Peers.

## 🧪 Testzugänge (window.__th + Globals)

| Zugang | Zweck |
|---|---|
| `__th.stufe()` / `__th.abnahme()` | Wohnstufen-Zustand lesen / Abnahme sofort auslösen |
| `__th.geldSetz(v)` · `__th.furnIds()` | Geld setzen · platzierte Möbel je ID zählen |
| `__th.zaehle("poller\|laterne")` | Modelle per Muster live zählen (braucht `userData.datei` aus `bau()`) |
| `__th.inspektorRuf()` · `__th.npcListe()` | Inspektor anfordern · NPC-Zustände lesen |
| `__th.netTest(msg)` | Netznachricht in `onNetMsg` einspeisen (Gast-Pfade testen) |
| `window._updZug(dt)` · `window._updNpcs(dt,now)` | Zug/NPC-Logik direkt antreiben |

⚠️ **Der Software-Renderer im Test läuft mit ~2 fps** — Spielzeit vergeht ~25× langsamer.
Abläufe (Zughalt, NPC-Besuch) NIE in Echtzeit abwarten, sondern die `_upd*`-Funktionen
mit künstlichem dt treiben. Genau dafür sind sie exponiert.

## 🗺️ Wo steht was

| Bereich | Anker zum Grepen |
|---|---|
| Weltmaße, Baufenster | `var GW=72,GH=46,CS=2` · `var BAUW=` · `inBau(` |
| Straßenkorridore | `var KORRIDORE=` · `korridorKonflikt(` |
| Straßenraster, Ring | `function strasseMesh(` · `(function ring(){` |
| Gehwege, Bordstein | `function tr(` · `var bordM=` · `(function randUndPlanke(){` |
| Markierungen, Details | `(function strassenDetails(){` · `function zebra(` · `_dashFrei(` |
| Freiflächen-Solver | `function freiPlatz(` · `function streu(` |
| Viertel-Generator | `function viertel(` · `viertel({name:"` |
| Aufräumstufen | `function entzerren(` · `function freiRaeumen(` · `function entwirren(` |
| Modelle laden | `function bau(` · `var GL=` · `window._gebaeude` |
| Kollision | `function addSolid(` · `addSolidRot(` · `inSolid(` · `SOLID_GRID` |
| Fahrgeschäfte, Seilbahn | `var FAHRT_ART=` · `window._seilbahn` |
| Eisenbahn | `window._zug` · `function updZug(` · `baueSchranken(` |
| Koop | `js/mp.js` · `onNetMsg(` · `LOBBY` · `lobbyNamenUpd(` |
| Testzugang | `window.__th={` · `window.__CAM=` |
| Wohnstufen/Abnahme | `var WOHNSTUFEN=` · `function bauabnahme(` · `inspektorPending` |
| Möbel-Freischaltung | `stufe:` im `KATALOG` · `ERSATZ=` (Villa-Substitution) |

## ⚠️ Fallen, die schon zugeschlagen haben

* **Modellnamen ohne `.glb`** → stiller 404, das Objekt fehlt einfach. Immer mit Endung.
* **Zu früh gemessen.** Die letzten GLB-Dateien kommen nach ~45 s. Bei 557 statt 640
  geladenen Modellen zeigte die Prüfung 16 Straßenkonflikte, bei voller Szene 0.
* **Kamera in der Wand.** `__CAM` mit kleinem Radius und flacher Neigung landet in
  Gebäuden; man fotografiert eine Wand. Im Zweifel Radius ≥ 40, Neigung ≥ 0,8.
* **Untexturierte Fläche rendert HELLER als die texturierte Fahrbahn.** „Asphaltflicken"
  in dunklerem Grau sahen aus wie Render-Fehler. Wer Flicken will, muss die
  Straßentextur mitgeben.
* **`entzerren()` kennt nur Reihen, keine Fahrbahnen.** Ein zweiter später Lauf schob
  18 Objekte zurück auf die Straßen. Nach jeder Entzerrung muss `freiRaeumen()` laufen.
* **Zwei Kanten an derselben Stelle streiten sich.** Es gab schon Bordsteine; ein
  zweiter Satz an gleicher Position flimmert. Erst grepen, dann bauen.
* **Maße veralten still.** Der Bordstein saß auf Halbbreite 5,05 aus der Zeit, als die
  Hauptstraße 10 m breit war — nach der Verbreiterung auf 16 m lief er 3 m *innerhalb*
  der Fahrbahn. Wer eine Straße verbreitert, muss alles Abhängige mitziehen.
* **Die Platzsuche kennt kein Wasser.** Ein Haus landete mitten im Seepark-See.
  Wasserflächen selbst ausschließen (Seemitte 0/146 r≈27, Fluss-Band z −94…−87, Meer x<−112).
* **Grosse Blockersetzungen fressen Nachbarn.** Ein per Python ersetzter Funktionsblock
  (`schulhofAusbau`) verschluckte die Turnhalle mit, die zwei Edits vorher im selben Lauf
  geaendert worden war — im Spiel stand danach eine leere Wiese, und die Pruefung merkte
  nichts (ein FEHLENDES Gebaeude ueberschneidet sich mit nichts). Nach jedem Umbau die
  Modellzahl vergleichen UND hinschauen.
* **`bau()` skaliert nur ueber die Hoehe.** Passt ein Gebaeude nicht aufs Grundstueck, ist
  die Zielhoehe der Hebel: die Turnhalle war auf 8,32 m 26,9 m tief und stand damit auf der
  Bahnstrecke; auf 6,72 m misst sie 21 m und passt zwischen Ufer und Mastreihe.
* **Kollisionsfrei ≠ frei.** Eine Standortsuche nur gegen Boxen stellte die Kathedrale
  zwischen die Downtown-Türme. Wer „ringsherum frei" will, braucht einen Freiraum-Radius —
  und muss dabei `scene.children` prüfen, nicht nur `window._gebaeude` (die Türme sind
  prozedural und stehen dort nicht drin).

* **`arr.sort(function(){return 0.5-Math.random();})[0]` ist kein Zufall.** Ein
  Zufallsvergleich in `sort()` liefert keine gleichverteilte Permutation, und das *erste*
  Element ist am stärksten verzerrt. Gemessen über 200.000 Ziehungen aus den neun
  Lieferzielen: „Markt" **20,85 %**, „Gewerbe Ost" **6,57 %** — statt 11,1 % für jedes.
  Das nächstgelegene Ziel kam dreimal so oft wie das entfernteste. Wer EIN zufälliges
  Element braucht, zieht einen Index: `arr[Math.floor(Math.random()*arr.length)]`.
* **Ein pauschales Zeitlimit über eine gewachsene Karte.** Die Blitz-Lieferung gab 60 s
  für *jedes* Ziel. Das Auto fährt 13 m/s, real bleiben mit Kurven und Kollidern gut
  7 m/s — 60 s reichen bis rund 210 m. Der Freizeitpark liegt 335 m weit. Zeitlimits, die
  auf eine Distanz getunt sind, müssen mitwachsen, wenn die Karte wächst.
* **Belohnung nach Restzeit belohnt die kurze Fahrt.** Derselbe Auftrag zahlte
  `80 + Restzeit*3`. Bei einem nahen Ziel bleibt zwangsläufig mehr Zeit übrig, also zahlte
  die 72-m-Fahrt zum Markt am meisten und die 335-m-Fahrt zum Freizeitpark am wenigsten.
  Wer eine Formel an eine Restgröße hängt, hängt sie an das Gegenteil des Aufwands.

* **`break` beim ersten Treffer macht alle späteren Käufe zu Deko.** `findFurnFor(need)`
  lief über `furn` — die reine Baureihenfolge — und nahm den ersten passenden Eintrag.
  Bei 18 Spaß-Möbeln im Katalog benutzte ein Bewohner damit **immer dasselbe Stück**:
  das zuerst gestellte. Gemessen an sechs Sesseln quer über das Grundstück, angesteuert
  von fünf Standorten: alt **1** verschiedenes Möbel bei 61,0 m mittlerem Weg, neu **5**
  bei 4,8 m. Der schlimmste Fall lief 107 m an fünf freien Sesseln vorbei. Wo mehrere
  gleichwertige Ziele infrage kommen, gehört die Entfernung in die Auswahl.

* **Ein Knopf, zwei Rollen — und nur eine Seite darf senden.** `startTrag()` haengt auf
  BEIDEN Seiten am selben Knopf und bedeutet „Abbruch", sobald eine Kiste unterwegs ist.
  `tragEnde()` schickt seine Nachricht aber nur mit `if(MPs&&mpHost)`. Drueckte der GAST,
  verschwand nur seine eigene Kiste; die des Hosts blieb, und zurueckholen konnte er sie
  nicht, weil der Host auf `tragReq` nur reagiert, wenn er selbst KEINE Kiste hat. Der
  Auftrag steckte fest, bis der Host abbrach. Zum Vergleich: `endeVerstecken()` sendet
  bei `if(MPs&&!gefunden)` — ohne Host-Bedingung. Es war also ein Versehen, kein Entwurf.
* **Der Koerper des Fahrers bleibt stehen, wo er eingestiegen ist.** Beim Einsteigen wird
  nur `sims[0].mesh.visible=false` gesetzt; die Figur selbst bleibt am Parkplatz — deshalb
  muss `aussteigen()` sie ans Auto teleportieren. Solo faellt das nie auf, weil
  `spielerPos()` beim Fahren das Auto liefert. Im Koop schon: `updCoup` fragt den Partner
  ueber `sims[1-meinSi()]`, also ueber diesen Koerper. Faehrt der Host zur Bank und
  startet den Coup, ist fuer ihn `ichDa` wahr und fuer den Gast `duDa` falsch — der Gast
  bricht ab, der Host laeuft weiter. Wer eine Figur „unsichtbar parkt", muss sie
  mitfuehren, sonst rechnet die Gegenseite mit einer Leiche.
* **Zaehler ohne Leser.** `stats.coups` (Bank-Coup) und `stats.sperrgut` wurden
  hochgezaehlt und nirgends gelesen — die beiden einzigen Aufgaben, die es NUR zu zweit
  gibt, hatten als einzige keinen Erfolg. Nach jeder neuen Aktion pruefen, ob ihr Zaehler
  irgendwo ankommt.

* **Im Testbrowser läuft die Spieluhr 20-mal langsamer als die Wanduhr.** `loop()`
  rechnet mit `dt = Math.min(0.05, …)`, der Software-Renderer liefert rund ein Bild pro
  Sekunde — pro Sekunde Wartezeit rücken also 0,05 s Spielzeit vor. Die 12 s von
  Coup-Phase 1 sind damit gut vier Minuten, und jede `min(1, dt*k)`-Nachführung kriecht
  (die Sperrgut-Kiste holt mit k = 3,5 nur 17,5 % des Abstands pro Sekunde auf). Zwei
  frisch geschriebene Prüfungen meldeten deswegen „kommt nicht an", wo nur zu früh
  gemessen wurde. **Auf einen Zustand warten, nicht auf eine Uhr** — oder die Dauer auf
  beiden Seiten abkürzen.

* **`inSolid()` ist ein WAND-Test, kein Volumen-Test.** Liegt der Punkt mehr als 0,55 m
  von jeder Kante entfernt, gibt es `false` — damit die Figur in Räumen laufen kann. Für
  die Frage „steht hier ein Gebäude?" ist das die falsche Frage: ein Wagen mitten in der
  Seilbahn-Talstation galt als „frei". Dafür gibt es jetzt `imBau(x,z)` — die volle
  Grundfläche, ohne Tür- und Wandausnahmen.
* **Gegen etwas prüfen, das asynchron entsteht, braucht eine Wiederholung, keinen
  Zeitpunkt.** Ein Ausweich-Schritt bei 20 s änderte nichts, drei feste Zeitpunkte
  (20/40/60 s) halfen mal und mal nicht: der Kollider der Talstation entsteht erst, wenn
  *ihr* Modell geladen ist, und wann das ist, hängt an der Last. Ein Lauf hatte den Wagen
  danach frei, der nächste unverändert im Gebäude. Alle 2 s bis 95 s prüfen kostet nichts
  und ist reproduzierbar.
* **Wer etwas verschiebt, prüft alles am Zielort — nicht nur das, wovor er ausweicht.**
  Der Sportwagen wich der Talstation aus und parkte prompt im Lieferwagen (103 Meshpaare).
* **Ein zweiter `entzerren()`-Lauf ist schon einmal gemessen und verworfen worden.** Der
  Kommentar an der 14-s-Zeile versprach ihn („wie beim Entwirrer braucht es einen zweiten,
  späten Lauf") — 250 Zeilen weiter steht, warum es ihn nicht gibt: er schob **18 Objekte
  zurück in Straßenkorridore**, und `freiRaeumen()` bekam sie wegen der 26-m-Schubgrenze
  nicht alle heraus. Eine Überschneidung im Gewerbegebiet ist das kleinere Übel. Der
  falsche Kommentar ist korrigiert — er hätte fast dazu geführt, die Entscheidung
  rückgängig zu machen, ohne sie zu kennen.

* **`_spaetEinfrieren()` lief nur einmal bei 9 s** — alles, was danach fertig lädt,
  behält `matrixAutoUpdate = true` für immer. Nach der Wiederbelebung der drei Viertel
  waren das **456 Objekte mit 14 563 Knoten**, deren Weltmatrix in jedem Bild neu
  gerechnet wird: Tennishalle, Eishalle, Basketballplatz, Gewächshaus, Riesenrad,
  Doppelhäuser, Berghütte. Genau die Last, die der Kommentar am ersten Lauf als größte
  CPU-Bremse auf dem Handy benennt. Der zweite Lauf hängt jetzt an der **letzten
  GLB-Ladung**, nicht an einer Uhr.
  ⚠️ Er ruft zuerst `_bewegtMarkieren()`: **alles Animierte muss dort angemeldet sein**,
  sonst steht es ab da still — genau der Fehler, den #2303 am Freizeitpark behoben hat.
  Gegenprobe nach der Umstellung: von 16 beweglichen Dingen bewegen sich 14; die zwei
  Ausnahmen sind erklärt (der Achterbahn-Zug fährt nur mit Fahrgast, der Landbus wartete
  an der Haltestelle).
* **Eine Wartezeit sieht im Testbrowser aus wie ein Stillstand.** Der Landbus stand über
  42 s Wanduhr unbewegt — sein `wartet` zählte in der Zeit von 4,5 auf 2,7. Bei
  `dt = min(0.05, …)` und ~1 fps dauert eine 6-Sekunden-Pause rund zwei Minuten.
* **Die Zubringer-Speichen sind echte Straßen — und keine Platzsuche kennt sie.** Sie
  haben keine Kollider, also sehen weder `wegVonStrasse` noch `viertelPasst` noch der
  Freiflächen-Solver sie. Querschnitt der 240°-Speiche bei r = 170: Asphalt `#4a4a53` von
  q −3 bis +3, Mittellinie auf q 0, Kiesbankett bei q ±4,5. Die **Bank** stand mit 11,3 m
  Abstand zur Mittellinie bei 10,7 m eigener Halbbreite darauf — ihre Wand im Fahrstreifen,
  der Strahl von oben traf bei r = 150 ihr Dach auf 4,23 m. Um 9 m **senkrecht zur Speiche**
  verschoben (+7,8 \| −4,5): Abstand jetzt 20,3 m, und die Wendemarke des Landbusses geht
  von 148 zurück auf 193. Wer dort draußen etwas hinstellt, misst den Abstand zur Speiche
  von Hand: `|x·sin θ − z·cos θ|` bei θ = 60° bzw. 240°.
* **Absolute Koordinaten für Zubehör machen jedes Verschieben zur Falle.** `BANK_POSTEN`
  hielt die drei Schalterplätze als Weltkoordinaten — beim Verschieben der Bank wäre das
  Personal auf dem alten Grundstück stehen geblieben. Jetzt relativ zu `window._bankPos`.

### 🛣️ Was auf welcher Fahrbahn steht — `spiele-dev/tools/th-strassen.mjs`

Straßen sind Flächen, keine Modelle, und Kollider haben sie auch nicht (sonst könnte
niemand darauf fahren). Damit sind sie für `wegVonStrasse`, `viertelPasst` und jeden
Freiflächen-Solver unsichtbar. Das hat in einer Session **fünf Mal** zugeschlagen: 16
Ampelmasten und 9 Laternen im Belag (#2297), der Bauernhof in der Buswende und die vier
Ostviertel-Wagen in der Seilbahnstation (#2308), die Bank auf der Zubringerstraße (#2310)
— und jetzt drei Viertel auf der Landstraße. Das Werkzeug prüft **alle** Klassen:

| Klasse | Mitte | halbe Belagsbreite | Länge |
|---|---|---|---|
| Hauptstraße | z ±58 | 8,05 | x ±102 |
| Querstraße | x ±78 | 5,05 | z ±69 |
| Stadtring | x ±112 · z 118/−100 | 4,5 | siehe Werkzeug |
| **Zubringer** | 30°, 60°, 120°, 240°, 300°, 330° | 4,5 | r 123…193 |
| **Landstraße** | Ring r 200 | 4,5 | rundum |

Drei Filter, jeder davon in einem Fehlversuch gelernt:
* **`STRASSENBAND` liefert die falschen Halbbreiten** (überall 8,0 = Schutzband inkl.
  Gehweg). Die echten stehen in der Bordstein-Geometrie.
* **Nach oben filtern** (`max.y < 0,45`) — sonst zählt jede Markierung mit.
* **Nach unten filtern** (`min.y > 2` überspringen) — der erste Lauf meldete 193 Treffer
  auf der Landstraße, allesamt die **Bergstation der Seilbahn**, die bei r = 202 auf 47 m
  Höhe über der Straße thront.

**⚠️ Die Landstraße ist nur abschnittsweise gepflastert.** Querschnitte: bei 90° und 280°
echter Asphalt (`#4a4a53`, r 196…204, bei 280° sogar mit Gehweg), bei 180° ist dort
**Meer**, bei 0° und 225° steht **Gebirge** darauf. Ein Treffer im Band ist erst dann ein
Fehler, wenn dort auch Belag liegt.

**Behoben:** der Sportpark lag mit Schwimmbad, Fitnessstudio und Basketballplatz auf dem
gepflasterten Abschnitt bei 90°. z 216 → 236 bringt alle sechs Bauten auf r 215…266.
Landstraßen-Treffer 120 → 80.

**Nachtrag — `viertelPasst()` kennt jetzt Straßen UND Berge, hilft aber wenig.** Beides
ist eingebaut (Landstraße, sechs Zubringer, und Erhebungen über 20 m / breiter als 30 m),
dazu zieht die Bauernhof-Dekoration jetzt mit dem Viertel mit. Der Weg dahin ist die
Lehre:

1. **Nur die Straßenprüfung**: Landstraßen-Treffer 80 → 40, alle Gebäude runter vom Belag.
   Aber Gewerbe Ost landete auf **112,6 m** und der Bauernhof auf **74,2 m** Fels — Berge
   sind wie Straßen: kein Kollider, keine Prüfung kennt sie.
2. **Mit Geländeprüfung**: beide finden im 120-m-Umkreis keinen Ort, der Straße *und* Berg
   meidet, und fallen auf die milde Bedingung zurück — also auf ihre alten Plätze. Netto
   bleibt vom Straßengewinn nur der Sportpark (139 statt 154 Treffer gesamt).

**Der zweite Durchgang ist kein Schönheitsfehler, sondern Pflicht:** `viertelOrt()` liefert
bei Misserfolg `null`, und dann baut das Viertel *gar nicht* — genau der Zustand, den
#2298 behoben hat. Lieber ein Viertel am Straßenrand als keines.

Wer das wirklich lösen will, braucht mehr Platz, nicht mehr Prüfungen: entweder eine
Lücke im Gebirgsgürtel (r 210…290) oder kleinere Viertel.

**Nachtrag — kleineres Viertel hat funktioniert.** `viertelMass()` nimmt das **breiteste
einzelne Bauwerk** als Quermaß. Bei Gewerbe Ost war das die Parkgarage mit 54,7 m; sie
allein machte das Netto-Rechteck 46 m halbbreit, und damit fand der Solver keinen Ort, der
Landstraße *und* Gebirge meidet. `bau()` skaliert über die **Höhe**: 11 → 7 macht aus
54,7 × 37,0 ein 34,8 × 23,5 (zwei Ebenen statt drei), das Viertel wird 20 m schmaler — und
der Solver findet (252\|0). Alle 13 Bauten und Fahrzeuge stehen, **34 Mesh-Positionen von
der Landstraße weg**, Belagstreffer gesamt 139 → 122. Am äußeren Rand streift noch eine
Bergflanke die Bodenplatte (86,7 m bei x ≈ 290), die Bauzeilen bei x 232 und 271 sind frei.
**Merksatz: ein einziges übergroßes Modell kann ein ganzes Viertel heimatlos machen.**

**Und derselbe Hebel beim Bauernhof — nur über die Länge.** Mit `w = 170` reichte sein
Netto-Rechteck bis (−105\|−167), also **r = 199**: mitten im Band, und der Stall stand mit
14 Mesh-Positionen im Belag. Mit `w = 120` liegt die nächste Ecke bei (−80\|−167), r = 185
— 15 m Luft. Die sechs Bauten passen weiter (längere Zeile: 20 + 6 + 6 = 32 m Front plus
zwei Lücken = 72 von 80 nutzbaren Metern), der Hof **bleibt auf seinem Wunschort**, und
seine Äcker liegen unverändert dort, wo sie immer lagen.

**Belagstreffer gesamt 154 → 102** — und dann die Quittung dafür, dass ich nur *ein*
Werkzeug laufen ließ.

### ⚠️ Nach jedem Verschieben BEIDE Werkzeuge laufen lassen

Der Zuschnitt-Trick brachte Gewerbe Ost auf (252\|0) und die Straßenzahl auf 102 — die
nächste 3D-Prüfung meldete dort aber **`th23_polizeiwache` 19,70 m tief in der
Seilbahn-Talstation, 499 Meshpaare**, der größte Fehler der ganzen Karte. `th-strassen.mjs`
kann das nicht sehen, `th-3d.mjs` schon; ich hatte nach dem Verschieben nur das erste
laufen lassen.

**Ursache:** `viertelPasst()` prüft `WORLD_SOLIDS` — aber Kollider entstehen im
`bau()`-Callback, also **nach** dem Modell-Download, während die Viertel sofort gesetzt
werden. Die Talstation existierte für den Solver schlicht noch nicht. Große Bauten mit
fester Adresse gehören darum zusätzlich in `SPAETE_SPERREN` (Maße aus der geladenen Box).

Dazu prüft die Suche jetzt in **drei** Stufen statt zwei: Straßen + Berge → nur Berge →
nur das Nötigste. Vorher schaltete die Rückfallstufe *beides* ab, ein Viertel ohne
straßenfreien Platz durfte also wieder im Gebirge landen — der viel schlimmere Fehler.

**Preis, offen benannt:** Gewerbe Ost findet jetzt nur noch (172\|−80); Parkgarage und Post
streifen dort die Landstraße, Belagstreffer 102 → 130. Ein Gebäude *in* einem Gebäude ist
das schlimmere Übel als eines am Straßenrand — die Reihenfolge stimmt so.

### Zwei Fehlanzeigen aus derselben Runde (beide geprüft, beide sauber)
* **Alle 97 Katalog-Einträge lassen sich bauen.** Mit `geld` und `wohnstufe` auf Maximum
  jeden Eintrag auf ein freies Feld gesetzt: 78 gebaut, 15 gehen als Bau/Farbe einen
  anderen Weg, 4 Sonderfälle. Der Hund meldet sich synchron nicht — er lädt sein Modell
  über `loadTH("hund", …)` erst asynchron; **Testartefakt, kein Fehler.**
* **Alle 85 Knöpfe haben einen Handler** (direkt oder über einen Vorfahren). Kein toter
  Bedienknopf.

### 📱 HUD auf dem Handy — geprüft, sauber (2026-08-25)

Handy-Tauglichkeit ist die oberste Design-Regel, also einmal nachgesehen statt vermutet.
Bei **740×360, 915×412 und 667×375** (Querformat): 9 sichtbare HUD-Elemente, **keine
Überlappung**, **nichts außerhalb des Bildschirms**. Die zwei gemeldeten Treffer sind
bauartbedingt — der Erfolgs-Toast parkt bei y = −66 außerhalb und fährt nur zum Anzeigen
ein, und der Joystick-Knopf liegt naturgemäß in seiner Basis.

**Zwei Messfallen, beide selbst gebaut:**
* **`offsetParent` ist bei `position: fixed` null.** Wer damit auf Sichtbarkeit filtert,
  sortiert genau die Elemente aus, um die es geht — der erste Lauf fand *ein* HUD-Element
  statt neun. Sichtbarkeit über `display` / `visibility` / `opacity` und die tatsächliche
  Rechteckgröße prüfen.
* **Im Hochformat zeigt das Spiel „Dreh dein Handy quer!"** und blendet das HUD aus. Ein
  Messlauf bei 360×740 vermisst also diesen Hinweis, nicht die Bedienoberfläche. Für
  HUD-Messungen immer Querformat.

## 🎯 Sollwerte einer sauberen Szene

Stand 2026-08-25, alles nachgemessen. **„Soll 0" stand hier für Werte, die nie 0 waren** —
das macht die Tabelle als Warnlampe unbrauchbar, weil jeder Blick darauf einen Alarm
zeigt. Jetzt steht der gemessene Ist-Wert daneben; wer eine Zahl steigen sieht, hat etwas
kaputtgemacht.

| Messwert | Soll | Ist | Werkzeug |
|---|---|---|---|
| Objekte auf dem Belag | fällt, nicht steigt | **130** | `th-strassen.mjs` |
| davon **Gebäude** | so wenig wie möglich | Parkgarage + Post (Ostviertel an der Landstraße) | ″ |
| Größte Überschneidung | ≈ 8,2 m (zusammengefasste Hochhaus-Module, bauartbedingt) | **8,20 m** | `th-3d.mjs` |
| Echte Überschneidungen | fällt, nicht steigt | **≈ 62–68** (schwankt, `entwirren()` ist zeitabhängig) | ″ |
| Marken/Lieferziele ohne Ziel | 0 | **0** (Ausnahme „Meer") | `th-marken.mjs` |
| Fehlende Modelle (404) | 0 | **0** | jeder Ladelauf |
| JS-Fehler | 0 | **0** | jeder Ladelauf |
| Zeichenaufrufe | < 2000 | **618** | `renderer.info.render.calls` |
| Nicht eingefrorene Objekte | nur Bewegliches | **239** (alle mit `_bewegt`) | Probe auf `matrixAutoUpdate` |

⚠️ **Zwei Werkzeuge, nicht eins.** `th-strassen.mjs` sieht keine Gebäude ineinander,
`th-3d.mjs` sieht keine Fahrbahnen. Wer etwas verschiebt, fährt **beide** — sonst kauft man
sich eine Verbesserung mit einem größeren Fehler, wie in #2313 geschehen.

## 2026-08-25 · 🧭 GTA-GPS: Wegpunkt auf der Weltkarte

**Was:** Tipp auf die grosse Karte setzt einen 📍 Wegpunkt (Tipp auf den Wegpunkt löscht ihn).
Lila Route (GTA-Stil) auf Radar + Weltkarte, Distanzanzeige unter dem Radar, Leuchtsäule +
pulsierender Ring am Ziel, Ankunft (<8 m) räumt alles weg (`stats.gpsZiele`, Erfolg `navigator`).

**Wie:** A* auf 4-m-Raster (−300..250 / −210..280, 138×123 Zellen, Binärheap).
Kosten: Strasse 1 (`gpsStrasse` — von `wegVonStrasse`-Bändern abgeleitet), Wiese 3 →
Route folgt Strassen, schneidet nur die letzten Meter querfeldein. Gesperrt: `imBau()`,
See (r 26 um 0/146), Fluss-Band z −97..−84 (ausser Brücken x=±78/−112), Meer x<−233.
Der Zellen-Cache wird **pro Lauf frisch** gebaut (Spieler baut/reisst ab → nie stale).
Pflege im 8x/s-Radar-Takt (`updMinimap`): verbrauchte Punkte abwerfen, bei >16 m Abweichung
neu rechnen, Ring pulsiert. Wegpunkt ist **persönlich** — im Koop kein Netz-Sync nötig.

**Fallen:**
- Der Karten-Canvas ist CSS-skaliert → Klick mit `getBoundingClientRect` auf Canvas-Pixel
  umrechnen, sonst landet der Wegpunkt daneben.
- Leuchtsäule/Ring: `_bewegt=true` (sonst friert `_einfrieren` sie fest) + `frustumCulled=false`;
  MeshBasic = nachts ungedimmt, genau richtig.
- `drawBigMap` merkt sich die Transformation in `_bigTrafo` — Route/Klick nutzen dieselbe
  Quelle wie die Zeichnung, kann nie auseinanderlaufen.

**Werkzeug:** `spiele-dev/tools/th-gps.mjs` (10 Checks: Pfad sauber, Strassen-Anteil,
Beam/Ring, Ankunft, Screenshots `gps-bigmap.png`/`gps-radar.png`).

## 2026-08-25 · 🎯 Missions-Marker auf Karte + Radar (GTA-Stil)

**Was:** Die 3 Tagesmissionen zeigen ihre Orte als **gelbe Marker** auf Weltkarte + Radar
(Rand-Klebe-Logik wie die Orte). Tipp auf die Karte **in ≤16 m Nähe eines Markers rastet ein**
und setzt das GPS exakt auf den Missions-Ort (Hint „🎯 Route zur Mission: …").

**Orts-Tabelle `MISS_ORTE`** (Pool-Index → [x,z], im Code nachgemessen): Heim-Missionen
(Fische/Kochen/Tanzen/Ernten/Möbel/Abnahme) = Grundstück-Mitte (0,0), Stunt-Rampe (−64,28,
`baueRampe`), Enten-See (0,146), Fussball (53,155, BALL-Anstoss), Laden (−24,74).
**Ortlos** (kein Marker): Emotes (überall), Strassenmusik (17–21 Uhr, überall).
📦 Lieferung zeigt aufs **eigene Auto** (`autoRec`), sonst Zuhause. Mehrere Heim-Missionen
werden 7 m nebeneinander versetzt (sonst stapeln die Marker).

**Werkzeug:** `spiele-dev/tools/th-missmap.mjs` (8 Checks) — inkl. **echtem `page.mouse.click`**
auf den Marker: Weltkoordinate → Canvas-Pixel → CSS-Pixel (Canvas ist per max-width skaliert,
`getBoundingClientRect`-Umrechnung Pflicht), 3 px daneben geklickt → rastet trotzdem ein.
`done`-Missionen verschwinden aus `missZiele()` (verifiziert).

## 2026-08-25 · 🛣️ Strassennetz-Ausbau: GPS + Karte + Radar kennen jetzt die GANZE Welt

**Befund (User: „strasse ausbauen"):** Asphalt + Verkehr fuer Landstrasse (r 200), 6 Zubringer
und 5 Viertel-Verbinder existierten laengst — aber (a) das GPS-Raster endete bei z=280
(Freizeitpark 330 / Bauernhof −241 = unerreichbar), (b) `gpsStrasse` kannte nur die Innenstadt
(Routen nach draussen schnitten querfeldein), (c) die Weltkarte zeichnete weder Landstrasse
noch Sued-Viertel (Z1=280 mitten im Sportpark).

**Fix:** Raster −300..250 / **−260..392** (138×163). Neue gemeinsame Tabellen
`_GPS_ZUB` (6 Zubringer-Winkel) + `_GPS_VERB` (Verbinder als ["z",x,z0,z1]/["x",z,x0,x1]:
Gewerbe Ost, Sportpark, Freizeitpark-L, Bauernhof, Strandzufahrt) — EINE Quelle fuer
GPS-Kosten UND Karten-/Radar-Zeichnung. Ring-Erkennung `|hypot−200|<5` mit Meer-Sektor-
Aussparung (126°..234°, wie `landstrasse()` sie baut). Karte: Z-Grenzen −240..345, Ring als
`arc()` mit Luecke, See-Kreis (0,146) erklaert die Verbinder-Luecke.

**Gemessen (th-netz.mjs, 13/13):** Route Marktplatz→Freizeitpark endet exakt (60,330),
29 Punkte auf dem Sued-Verbinder, 80 % Strassen-Anteil; Bauernhof (−40,−196) erreichbar;
Meer-Sektor bleibt Nicht-Strasse. **Falle:** Wer neue Strassen baut, muss `_GPS_VERB`/
`gpsStrasse` NACHFUEHREN — sonst routet das GPS daran vorbei (genau der Fehler, der hier
behoben wurde). Naechster echter Ausbau-Kandidat: Achterbahn (−190,212) hat als einziges
Ziel KEINEN Asphalt (Waldsaum/Berge vorher vermessen!).

## 2026-08-25 · 🚸 Hauptkreuzungen schöner (User-Screenshot „strasse hier schöner machen")

**Gemessene Fehler + Fixes (alle 4 Hauptkreuzungen ±78/±58):**
1. **Zebra endete mitten auf der Fahrbahn:** `zebra()` war für die 10-m-Querstrasse
   geschrieben (8 Streifen × 1,15 = 9,2 m) und wurde unverändert für die **16-m-Hauptstrasse**
   benutzt. Fix: `n=quer?13:8` → Spannweite 14,4 m (per th-flaeche.mjs nachgemessen).
2. **Stumpfe Grasecken:** Gehwegbänder endeten vor den Zebras, Rasen lief spitz an den
   Asphalt. Fix: Viertelkreis-Eckplatten (r 4,6) an allen 16 Ecken — 4 InstancedMeshes
   (eine je Quadrant-Ausrichtung, thetaStart aus sin/cos-Vorzeichen, weil rotation.x=-π/2
   lokal +y auf Welt −z dreht), y=0.065 knapp über den Gehwegbändern (kein Z-Streit).

**Neues Werkzeug `th-flaeche.mjs`:** listet flache Boden-Meshes (<0,3 m) in einem Weltbereich
mit Weltbox/Farbe/Geometrie — Markierungen sind namenlose Planes, von oben findet man den
Verursacher sonst nie. Damit auch geklärt: der „graue Balken im Rasen" (User-Bild) ist ein
>30 cm hohes 3D-Objekt (Tischtennisplatte o. ä.), kein verirrter Markierungs-Plane.
Vorher/Nachher: `spiele-dev/screenshots/kreuzung-vorher.png` / `kreuzung-final.png`.

## 2026-08-25 · 🎢🛣️ Achterbahn-Stich: das letzte Ziel ohne Asphalt ist angebunden

**Was:** L-Weg von der Landstrasse (Kreuzung mit dem 120°-Zubringer, ~(−100|173)) nach
Westen (z=173) und südlich (x=−190) bis vor die Achterbahn-Station, mit Vorplatz.
Landstrassen-Stil: 8,4 m Asphalt, Bankett beidseits, gestrichelte Mittellinie.

**Vorgehen (Messen-vor-Bauen, hat sich ausgezahlt):** Korridor VORHER live vermessen
(`_trasse_mess`-Einmalsonde): 0 Berge, 0 Viertel, 0 Gebäude, 0 Felder, 0 Solids — nur
9 Instanz-Teile (Waldsaum). Der „Gebäude-Block am Strassenende" im Screenshot entpuppte
sich per Nachmessung als die **Achterbahn-Station selbst mit parkiertem Zug** (korrekt).

**Nachgeführt (die Falle aus dem Netz-Ausbau-Eintrag!):** K-Korridore (`Achterbahn-Stich w/s`,
freiRaeumen/entwirren), Waldsaum-Aussparung (2 Bänder, Bäume 9→3, Rest Leitpfosten),
`_GPS_VERB` (GPS-Kosten + Karte + Radar automatisch). 

**Bilanz:** th-netz 19/19 (Route zur Station endet exakt (−190|207), 86 % Strassen-Anteil,
31 Punkte auf dem Stich) · th-strassen **119** Stellen (vorher 130 — gefallen ✓) ·
th-pruef BESTANDEN · 0 JS-Fehler. Bild: `spiele-dev/screenshots/achterbahn-stich.png`.
Hinweis: die 4 „th39_leitplanke in th20_parkgarage (142,−148)"-Kandidaten stammen aus
Nachbar-Session-Bestand im Gewerbe Ost (weit weg von dieser Trasse) — dort nicht angefasst.

## 2026-08-26 · 🚗 Verkehr auf dem Achterbahn-Stich — und ein Handy-Bug, den erst der Test zeigte

**Was:** Zwei Wagen pendeln jetzt zwischen Landstrassen-Einmündung und Stationsvorplatz.
Neuer Routen-Typ `axis:"stich"`: `pos` ist die **Bogenlänge** auf einem L-Weg mit
**gerundeter Ecke** (R=5) — ohne Bogen säße im Knick ein Rotationssprung (gemessen jetzt
2,86°/0,25 m, also glatt). Spur wird aus der Fahrtrichtung gerechnet (`rechts = (−fz, fx)`,
dieselbe Konvention wie die Hauptstrassen), darum wechselt der Wagen beim Wenden von
selbst die Seite. `STICH`/`stichPkt` liegen bewusst auf der Ebene von `updVerkehr` —
in `baueVerkehr` deklariert hätten sie nur zufällig übers globale Objekt funktioniert.

**🐛 Der eigentliche Fund — `_AN` war kleiner als `ROUTEN.length`:** Die Zuteilung läuft
über `i % ROUTEN.length`, die Wagenzahl war fest 24 (Handy) / 40. Mit 26 Routen bekamen
**auf dem Handy die Routen 24 und 25 keinen einzigen Wagen** — die neue Strasse wäre genau
auf dem Gerät leer geblieben, auf dem der User spielt (`_mobil` = Bildschirm < 820 px, das
trifft auch das Test-Viewport, darum meldete th-stich „0 Wagen"). Fix:
`_AN = Math.max(24|40, ROUTEN.length)` — wer eine Strecke ergänzt, bekommt automatisch
einen Wagen darauf. **Regel: eine neue Route ohne Wagenzahl-Prüfung ist stille Kulisse.**

**Zwei Nachträge zum Stich aus #2326:**
- `th-strassen.mjs` kannte den neuen L-Weg **nicht** → zwei Bänder ergänzt. Erster Lauf fand
  prompt einen Felsbrocken bei (−108,4|177) auf dem Belagsrand.
- Ursache war `freiPlatz()` — die gemeinsame Quelle **aller** Streu-Objekte (Bäume, Felsen,
  Blumen, Heuballen). In #2326 war nur der Waldsaum ausgespart. Jetzt beide Bänder mit
  Kronen-Reserve (11 m wie bei den Hauptstrassen) → Stich-Band **0 Treffer**.

**⚠️ „Stellen auf dem Belag" ist verrauscht:** fünf Läufe auf praktisch gleichem Code ergaben
**119 / 134 / 114 / 132 / 123** (`entwirren()` ist zeitabhängig). Die Zahl taugt für Trends
über viele Läufe, **nicht** als Vorher/Nachher-Beweis einer einzelnen Runde — dafür das
**Band-Detail** lesen (z. B. „Achterbahn-Stich: 0"). Fahrende Autos zählt das Werkzeug
ohnehin nicht mit (`markiere(verkehr)`).

**Werkzeug:** `spiele-dev/tools/th-stich.mjs` (9 Checks: Zuteilung, Asphaltband, Rechtsverkehr,
Ecke ohne Sprung, 60 s simuliert per direktem `updVerkehr`-Tick — umgeht die dt-Deckelung).
Bild: `spiele-dev/screenshots/stich-verkehr.png`.

## 2026-08-27 · 🐢 „das Spiel laggt sehr" — gemessen statt geraten

User-Meldung ohne Zusatz. Vier Verdächtige der Reihe nach gemessen; **drei waren falsch**,
und zwei davon hätten sich „offensichtlich" angefühlt. Neues Werkzeug:
`spiele-dev/tools/th-tempo.mjs` (Bildzeit-Aufteilung, Zeichenaufrufe, Objekte, Lichter).

**Was die Szene wirklich ist:** 51 520 Objekte · 48 471 Meshes · 622 Zeichenaufrufe ·
310 000 Dreiecke · **17 Lichter, davon 15 PointLights** · alles MeshStandardMaterial.
Die Zeichenaufrufe und Dreiecke sind unauffällig — das Problem war die Beleuchtung.

| Verdacht | gemessen | Ergebnis |
|---|---|---|
| Zu viele Pixel im Menü | 2,46 → 9,27 Bilder/s | ✅ **behoben** (3,8×), s. u. |
| `matrixAutoUpdate` auf 48 307 Objekten | 212 ms → 213 ms | ❌ **nichts**, verworfen |
| Zu viele Punktlichter | 1010 ms → 763 ms | ✅ **behoben** (+25 % Bilder) |
| Kleinere Leinwand im Koop-Test | 1,5 / 2,5 Bilder/s | ❌ allein zu wenig |

### ⚠️ Dieser Container kann die Bildrate eines Geräts NICHT messen
SwiftShader, reiner Software-Rasterizer. Im CPU-Profil sind **85,8 % der Proben
`(program)`**, also nativer Rasterizer. Zwei Punkte (682 000 px → 1,10/s, 42 625 px →
3,89/s) ergeben das Modell **≈ 213 ms fest + 1,0 µs je Pixel**. Nutzbar sind deshalb nur
*Anzahlen* (Objekte, Aufrufe, Lichter, Matrizen) und *Verhältnisse* — nie absolute fps als
Gerätewert. Für CPU-Fragen die Leinwand klein machen (280×170), dann dominiert die
Füllrate nicht mehr.

### 💡 LAMP_MAX — nur die nächsten Punktlichter brennen
three.js wertet **jedes** Punktlicht für **jeden** Bildpunkt jedes MeshStandardMaterial
aus; eine Licht-Auswahl je Objekt gibt es nicht. Bei Reichweite 16–18 m und decay 2 trägt
alles Ferne praktisch nichts bei. Gemessene Kurve (volle Leinwand, je 7 s):

| aktive Lichter | 4 | 6 | 8 | 10 | alle 15 |
|---|---|---|---|---|---|
| ms je Bild | 719 | **763** | 800 | 862 | 1010 |

Rund **26 ms je Licht**. Gewählt: **6** — deckt genau den Innenlicht-Cluster der Altstadt
(vier Lichter im Umkreis von ~25 m) plus Pavillon ab.
* ⚠️ **Die ANZAHL muss konstant bleiben.** three.js schlüsselt sein Shader-Programm nach
  der Zahl der Lichter je Art — schwankt sie, wird bei jedem Wechsel neu übersetzt.
  Darum immer genau `LAMP_MAX` sichtbar, nie „alle im Umkreis".
* ⚠️ **`nachtLampen` ist NICHT die Liste aller Lichter.** Sie hält nur die sechs, die die
  Tag/Nacht-Logik fadet; in der Szene stehen 15. Der erste Anlauf kappte `nachtLampen` auf
  sechs — `6 > 6` ist falsch, die Bedingung feuerte nie, und der A/B-Vergleich verglich
  **zwei identische Stände** und meldete folgerichtig „kein Unterschied". Beinahe als
  „Lichter sind nicht das Problem" abgehakt. **Erst prüfen, dass die Änderung greift,
  dann ihre Wirkung messen.**

### 🔋 Im Menü nicht die ganze Welt zeichnen
`.overlay` liegt mit `rgba(...,.94)…(.97)` über dem Bild — sichtbar sind 3–6 % des
3D-Hintergrunds, die Kamera steht still. Gezeichnet wurde trotzdem jedes Bild:
Startbildschirm, Modus-Wähler, Intro **und die ganze Koop-Lobby**. Jetzt jedes fünfte
(`_menuTakt`). A/B im selben Prozess, je 6 Proben: **2,46 → 9,27 Bilder/s**. Die Leinwand
behält ihr letztes Bild, der Hintergrund bleibt also sichtbar, nur nicht flüssig.

### ❌ Teilbaum-Frost: gebaut, gemessen, verworfen (nicht wiederholen)
`_einfrieren()` läuft nur über `scene.children`. Das sieht nach einem Fehler aus — three.js
steigt trotzdem in jedes Kind ab, und jedes Kind mit `matrixAutoUpdate=true` rechnet seine
lokale Matrix neu. 48 307 von 51 520 blieben so auf Auto-Update. Der Frost über den ganzen
Teilbaum brachte:
* `matrixAutoUpdate` **48 307 → 7 000** (−86 %),
* Bildzeit (CPU isoliert, 280×170) **212 ms → 213 ms**, also nichts,
* aber **724 Objekte weniger, die sich in 12 s bewegten** — er legte Animationen still.

48 000 `updateMatrix()` sind zusammen wenige Millisekunden. Die Matrizen waren nie die
Bremse. Der Kommentar im Code sprach von „über 2000 Objekte" — die Welt ist seither um das
25-Fache gewachsen, die Zahl blieb stehen. **Eine Zahl im Kommentar ist kein Messwert.**

## 2026-08-27 · 🏔️ Eine Hüllbox ist kein Berg — warum zwei Viertel „nirgends hinpassten"

Neues Werkzeug: **`spiele-dev/tools/th-viertel.mjs`** — sagt je Viertel, auf welcher
Strengestufe es gelandet ist und **woran** die strengere gescheitert ist (Fahrbahn mit
Bandnamen, Berg mit Boxkoordinaten, Kollider mit Position). Dafür hält `viertel()` jetzt
`cfg` + Wunschort am Gruppenobjekt fest, und `window._viertelSolver` gibt den Solver für
Sonden frei.

**Erstbefund und Ursache:** Gewerbe Ost und Bauernhof fielen auf Stufe 0 durch — dort ist
auch die Straßenprüfung aus, deshalb standen sie auf der Landstraße. Beide scheiterten auf
Stufe 1 an **genau einer Box: `[-204..338 | -694..-152]`, 542 × 542 m**. Das ist kein
Gipfel, sondern die Hüllbox einer ganzen **Bergkette** (ein Mesh, 1296 Vertices); zwei
weitere messen 362 und 318 m. Ihre Box ist zum größten Teil Luft zwischen den Gipfeln und
sperrte ein Viertel der Karte.

Die frühere Notiz „das Viertel passt einfach nirgends hin, nur Teilen hilft" war damit
**falsch** — es war kein geometrischer Zwang, sondern ein Messfehler im Solver. Ebenso
falsch war der Kommentar „der richtige Weg wäre, `viertelPasst()` die Landstraße
beizubringen": die kannte sie zu dem Zeitpunkt längst.

**Behoben:** Das Gelände wird gerastert (`bergGitter()`, 12-m-Zellen). Jedes Dreieck über
`BERG_H = 10` markiert die Zellen, die es wirklich überdeckt — rund 4500 Dreiecke, einmal
beim ersten Aufruf. Ergebnis: **Bauernhof jetzt auf Stufe 2** bei (−40|−246), also frei von
Landstraße *und* Fels. Von vier Vierteln sind noch **Gewerbe Ost** auf Stufe 2 offen (72 × 152 m
netto, scheitert an Landstraße + Zubringer 330°).

### ⚠️ Zwei Messfallen in diesem Werkzeug (beide zuerst hineingelaufen)
1. **Die eigenen Häuser zählen nicht.** Das Viertel aus `VIERTEL` zu nehmen genügt nicht —
   seine Bauten stehen als Kollider in `WORLD_SOLIDS` und blockieren genau den Ort, an dem
   es schon steht. Der erste Lauf meldete für **alle vier** Viertel „nein: Kollider" auf
   Stufe 0, also auch dort, wo sie unbestritten stehen.
2. **„Berg" allein ist keine Auskunft.** `bergBoxen()` sammelt alles über 20 m Höhe und
   30 m Breite — hohe Häuser landen darin genauso wie Fels. Ohne die Box im Klartext wäre
   die Bergkette nie aufgefallen.

### ⚠️ Straßenbelegung schwankt von Lauf zu Lauf
Drei Läufe auf demselben Stand: **125 / 122 / 136**. Wer eine Änderung mit *einem* Lauf
bewertet, misst `entwirren()`-Zufall. Der Geländefix ergab 125 / 127 / 117 — die Differenz
zum Ausgangsstand liegt **innerhalb der Streuung**, ist also kein Ergebnis. Für Aussagen
über die Straßenbelegung mindestens drei Läufe je Seite, besser den *Inhalt* eines Bandes
vergleichen statt der Gesamtzahl.

## 2026-08-27 · 🤝 Koop-Vollprüfung: erster grüner Lauf

Die beiden Zwei-Spieler-Aufträge (Sperrgut, Bank-Coup) waren als `--voll` ausgeliefert und
hatten **noch nie einen grünen Lauf**. Jetzt: **19 von 20 Prüfungen an, 1 nicht prüfbar.**
Sperrgut komplett (Ruf, Kiste bei beiden, Folgen, Lohn +450, Abbruch), Coup komplett
(Start, Alarm, Beute 2918 identisch, Ende, Auszahlung). Vorhersage des Gasts gegen die
Wahrheit des Hosts: **Mittel 0,43 m, größter 0,56 m**, nach dem Loslassen 0,23 m. 0 JS-Fehler.

**Was den Beitritt reparierte — und was nicht.** Der Kopfkommentar sagte „scheitert bei
Load 4". Diese Last ist aber **der Test selbst**: der Container lag vorher bei 0,14 und
stieg erst mit den beiden Seiten über 4. Zwei Versuche:
* Fenster 900×560 → 480×300 (¹⁄₃ der Pixel): **allein zu wenig**, gemessen 1,5 bzw.
  2,5 Bilder/s. `screen` bleibt dabei groß, sonst schaltet `_mobil` (prüft `screen`, nicht
  das Fenster) heimlich auf Handy-Bedienung um.
* Menü nicht mehr voll rendern (`_menuTakt`, s. o.): **damit gelang der Beitritt im ersten
  Versuch.** Der WebRTC-Handshake braucht auf *beiden* Seiten Bilder.

### ⚠️ Die Uhr braucht 260 Runden, nicht 20 — Fehlalarm im eigenen Werkzeug
`Host-Uhr -> Gast` meldete rot (480 → 480). Kein Spielfehler: der Gast führt seine Uhr
**nicht selbst** (`if(!MPs||mpHost)`), er wartet auf `t:"uhr"` — und das geht nur alle acht
Sim-Takte raus (`netTick%8===0`). Ein Sim-Takt ist 0,35 s *Spielzeit*, bei `dt=0,05` also
sieben Bilder; acht Takte sind 56 Bilder und bei 1,5 Bildern/s rund **37 Sekunden**. Die
Prüfung wartete 8 s. `probe()` hat jetzt einen `runden`-Parameter, die Uhr bekommt 260.
Genau die Falle, vor der der Kopfkommentar dieses Werkzeugs warnt — im Werkzeug selbst.

## 2026-08-27 · 📱 Dynamische Auflösung — und warum Distanz-Culling nichts bringt

### ✅ `_rrRegel()`: die Schleife misst ihre eigene Bildzeit
Der feste Deckel `min(devicePixelRatio, _mobil?1.35:1.6)` war eine **Wette auf das Gerät** —
für ein aktuelles Telefon zu wenig, für ein älteres zu viel, und welches davorsitzt weiß der
Code nicht. Jetzt bleibt `_rrMax` die Obergrenze, aber es gibt vier Stufen
(`1 · 0,8 · 0,62 · 0,5 ×`), und die Schleife regelt selbst.

* Gemessen wird die **echte** Bildzeit `(now-last)`, **nicht `dt`** — `dt` ist auf 0,05
  gedeckelt und könnte ein 900-ms-Bild gar nicht darstellen. Genau dieser Deckel hat in
  diesem Projekt schon mehrfach Messungen verdorben.
* Gleitender Mittelwert (0,92/0,08), damit ein einzelner Ruckler (Modell lädt fertig) nicht
  sofort die Auflösung senkt.
* Herunter ab **33 ms**, hinauf erst unter **20 ms** — die Lücke verhindert Pendeln.
  Zwischen zwei Änderungen mindestens **4 s**, denn `setPixelRatio`+`setSize` legt den
  Zeichenpuffer neu an und ruckelt selbst.
* ⚠️ Der `resize`-Handler muss `setPixelRatio` **mitsetzen**, sonst fällt die geregelte
  Stufe beim Drehen des Handys auf `_rrMax` zurück.

Verifiziert: der Container geht auf Stufe 3 (1100×620 → 550×310) und **bleibt** dort
(Mittelwert 381 ms, kein Pendeln über 40 s). **1,29 → 2,94 Bilder/s.** Auf einem schnellen
Gerät bleibt der Mittelwert unter 20 ms, dort ändert sich nichts.

**Gesamtstand dieser Runde im selben Werkzeug: 952 ms → 344 ms je Bild.** ⚠️ Wieviel davon
auf einem echten Gerät ankommt, sagt dieser Container nicht — auf einem schnellen Telefon
greift nur die Lichtkappung, die Auflösungsregelung bleibt untätig.

### ❌ Distanz-Culling ganzer Gruppen: gemessen, verworfen
Naheliegende Idee: der Nebel endet bei 340–360 m, alles dahinter ist ohnehin
Hintergrundfarbe — also ganze Gebäudegruppen ausblenden und `projectObject` spart sich den
Teilbaum. **Vorher gemessen:** 1163 Gruppen decken 39 597 der 48 468 Meshes ab, aber jenseits
der Nebelgrenze liegen nur **29 Gruppen mit 255 Meshes — 0,5 %**. Die bebaute Welt ist
dichter als der Nebelradius. Nicht gebaut.

⚠️ `scene.fog.far` ist **nicht konstant**: `max(340, camR*9.5)`, hängt also am Zoom. Wer hier
doch etwas baut, liest den Wert zur Laufzeit und misst vom **Kamera**standort, nicht vom
Spieler.

### Was das LOD heute tut (und was nicht)
`lodTakt()` blendet nur **kleine** Meshes aus (Radius ≤ 2,2 m) — ab 78 m, Winziges (< 0,55 m)
schon ab 34 m. Alles Größere ist **immer sichtbar**; Häuser und Bäume werden nie auf Distanz
ausgeblendet. Das ist bewusst so und nach obiger Messung auch richtig.

## 2026-08-27 · 🖥️ Der Rechner-Pfad war nie gemessen — 44 390 Schattenwerfer

### ⚠️ Die `screen`-Falle, zum zweiten Mal
`_mobil` prüft `Math.min(screen.width, screen.height) < 820`, und Playwright setzt `screen`
standardmäßig auf das **Fenster**. Mit dem 1100×620-Standard von `spielOeffnen()` ist
620 < 820 — **jede Messung lief im Handy-Modus**, ohne dass es jemand gemerkt hätte: Schatten
aus, `_schattenSparen()` aktiv, Pixel-Deckel 1,35. Dieselbe Falle hatte `th-koop.mjs` schon
einmal; sie sitzt jetzt in **`th-lib.mjs`** (`spielOeffnen(..., {screen})`), damit sie nicht
in jedem Werkzeug neu entsteht. `th-tempo.mjs` **meldet den Modus in Zeile 1** und misst mit
`--desktop` den Rechner-Pfad.

### 💡 `_schattenSparen()` lief genau dort nicht, wo es gebraucht wurde
Die Funktion war auf `if(!_mobil)return;` beschränkt. Am Handy sind die Schatten aber
ohnehin komplett aus (`_schattenAn = !_mobil`) — sie lief also praktisch **nie**, und auf dem
einzigen Pfad, der wirklich eine Shadow-Map rendert, sparte sie nichts.

| Rechner-Pfad | Schattenwerfer | ms je Bild |
|---|---|---|
| vorher | **44 390** | 730 |
| nachher | 7 460 | **494** (+47 % Bilder) |

Zwei Läufe je Seite, abwechselnd im selben Prozess. Die halbe Welt wurde jedes Bild ein
zweites Mal in eine 2048er Shadow-Map gerendert. Häuser und Figuren behalten ihre Schatten
(≥ 2,5 m hoch, ≥ 1,2 m breit); es fallen Fensterrahmen, Gesimse, Zaunlatten und Streuwerk weg.

**Lehre:** eine Optimierung hinter `if(_mobil)` ist wertlos, wenn der Handy-Pfad die teure
Sache ohnehin abschaltet. Vor jeder solchen Schranke prüfen, **welcher Pfad die Kosten
wirklich trägt** — und das Werkzeug muss sagen, welchen Pfad es gerade misst.

## 2026-08-27 · 📊 Stand nach der Lag-Runde (beide Pfade, verifiziert)

Gemessen auf `main` nach #2334/#2335/#2336, `th-tempo.mjs` je Pfad:

| Pfad | vorher | nachher | was greift |
|---|---|---|---|
| 📱 Handy | 952 ms | **350 ms** | Lichtkappung, dynamische Auflösung |
| 🖥️ Rechner | 730 ms | **493 ms** | Lichtkappung, Schattenwerfer |

⚠️ Beides sind Zahlen aus dem Software-Rasterizer, **keine Gerätewerte**. Übertragbar ist
die Richtung, nicht der Faktor: auf einem schnellen Gerät bleibt die Auflösungsregelung
untätig (so gewollt), und der Anteil der Füllrate ist dort viel kleiner.

### ❌ `_opakSchalten()` auf dem Rechner: gemessen, nichts, nicht gebaut
Nach dem Schattenfund lag der Verdacht nahe, dass die zweite `if(!_mobil) return;`-Funktion
dasselbe Problem hat. Gemessen (zwei Läufe je Seite, Rechner-Pfad): **490 vs. 495 ms**, und
sie schaltet nur **14** Materialien um (487 → 473 transparente). Anders als bei den Schatten
ist der Handy-Pfad hier nicht der, der die Kosten trägt — die Szene hat schlicht kaum
Transparenz. Die Schranke bleibt.

**Merke:** derselbe Verdacht an derselben Stelle heißt nicht derselbe Befund. Auch die
zweite Prüfung war eine Messung wert — und sie war negativ.

## 2026-08-27 · 🔍 Ein Kreuz ist keine Fläche — alle vier Viertel stehen sauber

`viertelOrt()` suchte nur in **vier Richtungen** vom Wunschort aus. Alles Diagonale lag damit
außerhalb der Suche, egal wie weit sie reicht. Gemessen mit `th-viertel.mjs`, das beide
Suchen nebeneinander fährt:

| „Gewerbe Ost", Stufe-2-Platz gesucht | Ergebnis |
|---|---|
| Kreuz, 4 Richtungen (wie bisher) | **keiner in 260 m** |
| Ring, 16 Richtungen | **(250\|−78), 110 m** |

Die Welt war nie zu eng — **die Suche war es**. Damit ist die alte Notiz „das Viertel passt
einfach nirgends hin, nur Teilen hilft" zum **zweiten** Mal widerlegt (zuvor schon wegen der
Berg-Hüllbox). Beide Male sah es nach einem geometrischen Zwang aus, beide Male war es ein
Fehler im Prüfwerkzeug des Solvers.

**Ergebnis — erstmals alle vier Viertel auf Stufe 2:**

| | vorher | nachher |
|---|---|---|
| Objekte auf dem Belag (3 Läufe) | 117 / 108 / 108 | **96 / 84 / 98** |
| Landstraße | 61 | **25** |
| Zubringer 330° | 16 | **2** |
| echte 3D-Überschneidungen | 67 | **57** |

Die beiden geräumten Bänder sind genau die, die `th-viertel.mjs` als Blocker benannt hatte —
das ist die Ursachenkette, nicht nur eine Korrelation. Die Streubereiche der drei Läufe je
Seite überschneiden sich **nicht** (min. vorher 108 > max. nachher 98); beim vorigen Versuch
taten sie das, und dort war die Differenz folgerichtig kein Ergebnis.

### ⚠️ `w+=2` überspringt ausgerechnet die 45-Grad-Diagonalen
Erster Anlauf: Achsen plus `for(w=1;w<16;w+=2)`. Das sind die acht **ungeraden** Achtel —
zusammen mit den vier Achsen 12 von 16 Richtungen, und es fehlen genau `w = 2, 6, 10, 14`,
also 45°/135°/225°/315°. Der Platz für Gewerbe Ost liegt bei 45°. Das Viertel landete
deshalb 170 m entfernt statt 110 m, und es sah trotzdem nach Erfolg aus („Stufe 2: ja").
Richtig ist `for(w=1;w<16;w++) if(w%4===0) continue;`.

**Die Achsen behalten bewusst den Vorrang** (sie kommen je Radius zuerst), damit ein Viertel
weiter längs seiner eigenen Straße ausweicht und Felder, Anschluss und Kartenmarke in der
Nähe bleiben. Suchradius 120 → 200 m.

### ⚠️ Ein Test mit festen Zielkoordinaten besteht auch, wenn das Ziel weggezogen ist
`th-netz.mjs` routete auf **fest verdrahtete** Koordinaten. Nachdem der Bauernhof durch den
Geländefix nach (−40|−246) gezogen war, routete der Test unverändert nach (−40|−196) — eine
leere Wiese — und meldete **grün**. Er hätte einen unerreichbaren Bauernhof nicht bemerkt.

Behoben: die Ziele kommen jetzt aus `window._viertelSolver.VIERTEL`, und eine Schleife prüft
**jedes** Viertel an seinem tatsächlichen Ort (die drei bisherigen Ziele waren handverlesen;
ein neues Viertel wäre nie aufgefallen). 19 → 23 Prüfungen.

Verifiziert nach dem Umzug von Gewerbe Ost auf (250|−78), r = 262 — also **außerhalb** der
Landstraße:

| Viertel | Ort | Route | Rest |
|---|---|---|---|
| Gewerbe Ost | 250\|−78 (r 262) | 101 Punkte | 0,0 m |
| Sportpark Süd | 0\|246 | 62 | 0,0 m |
| Freizeitpark | 60\|340 (r 345) | 76 | 0,0 m |
| Bauernhof | −40\|−246 | 132 | 0,0 m |

Alle vier per GPS erreichbar, Straßenanteil 72–82 %, und `LIEFERZIELE` folgt den Umzügen
(`marke()` schreibt `WORLD_POIS` und `LIEFERZIELE` mit).

## 2026-08-27 · 📏 `th-3d.mjs` sortierte nach Grundriss — ganz oben stand das sauberste Bauwerk

Die Liste war nach der **2D-Überdeckung** geordnet. Für **gestapelte** Bauten ist das aber das
ganze Grundstück. Dauerhaft an der Spitze stand darum
`th7_hochhaus_modul × th7_hochhaus_modul, 8,20 m` — und das ist ein **korrekt gestapeltes
Hochhaus**: Module bei y 0–6, 6–12, 12–18, 18–24 plus Dach bei 24–27,6, sauber aufeinander.
Die 13 Mesh-Paare sind ein Gesims, das ein paar Zentimeter ins Modul darüber ragt. Wer die
Liste von oben las, jagte zuerst das sauberste Bauwerk der Karte.

Die richtige Frage ist nicht „wie viel Grundfläche teilen sie sich", sondern **„wie tief steckt
das eine im anderen"** — das kleinste der drei Achsenüberlappungen, davon das größte Meshpaar.
Danach wird jetzt sortiert und gemeldet (`ECHT 1.39m tief (Grundriss 6.34m)`).

**Neue Rangliste (nach dieser Session):**

| Tiefe | Paar | Bewertung |
|---|---|---|
| 1,39 m | Seilbahn-Station × Seilbahn-Stütze (ab y 40,3) | Mast trifft Stationsdach — konstruktiv |
| 1,17 m | Ahorn × Birke | Baumkronen, kosmetisch |
| 0,91 m | Haus × Ahorn | Krone am Dach |
| 0,76 m | Windmühlenturm × Flügel | konstruktiv |
| 0,66 m | Bushaltestelle × Bus | Bus steht an der Haltestelle |

Damit hat die Karte **keine Gebäude-in-Gebäude-Stelle über 1,4 m** mehr — zum Vergleich: die
Polizeiwache steckte einmal **19,7 m** in der Seilbahn-Talstation (#2315).

⚠️ Die Zahl „echte Überschneidungen" (56) ist **unverändert** — es wurde nur die Reihenfolge
und die gemeldete Größe korrigiert. Eine Kennzahl, die man nicht nach Schwere ordnen kann,
ist als Frühwarnung wertlos: 56 kleine Baumkronen und ein 19,7-m-Fehler ergeben dieselbe Zahl.

## 2026-08-27 · 🎰 Vergnügungsviertel — die ersten der ~40 ungenutzten Modelle stehen

Die fünf **th12**-Bauten (Bowlingbahn, Casino, Nachtclub, Spielhalle, Theater) lagen seit
ihrer Charge fertig im Repo und waren nie platziert. Der Grund dafür ist heute weg: bis zu
dieser Session suchte `viertelOrt()` nur in vier Richtungen und `imBerg()` sperrte per
Hüllbox ein Viertel der Karte. **Fünftes Viertel, alle fünf auf Stufe 2.**

### Maße gemessen, dann skaliert (die Parkgaragen-Falle)
Bei voller Höhe ist die Bowlingbahn **43,6 × 34,4 m**, das Theater 35 × 35,7. Damit wäre das
Netto-Rechteck so breit, dass der Solver wieder keinen Platz fände — genau der Fehler, der
Gewerbe Ost jahrelang heimatlos machte. Auf 6–10 m Höhe skaliert (`bau()` skaliert über die
**Höhe**) bleiben 32,7 × 25,8 bzw. 29,2 × 29,8. Längere Bauzeile: 91,3 m Front + 2 Lücken =
115,3 m, passt in die 122 m Netto-Länge.

### ⚠️ Wunschort gesucht, nicht geraten
Erster Versuch (120|−250) landete nach **170 m Ausweichen** bei (290|−250) — r = 383, mit
einem 270 m langen Verbinder quer durchs Feld. Statt einen zweiten Ort zu raten: Rasterscan
mit `viertelPasst(cfg,x,z,2)` über die ganze Karte, 20-m-Schritte. **57 gültige Plätze**, der
stadtnächste ist **(160|220), r = 272**, direkt neben dem Sportpark. Dort steht es jetzt mit
**0 m Ausweichen**.

Der Scan ist drei Zeilen in einer Sonde und beantwortet die Frage, die man sonst durch
Ausprobieren umkreist — er gehört bei jedem neuen Viertel an den Anfang, nicht ans Ende.

### Verifiziert (alle drei Werkzeuge, wie es die Regel verlangt)
* `th-viertel.mjs`: 5 Viertel, **0 nicht auf Stufe 2**, Vergnügungsviertel 0 m ausgewichen.
* `th-3d.mjs`: tiefste Überschneidung unverändert 1,39 m (Seilbahn), **kein th12-Modell** in
  der Liste.
* `th-strassen.mjs`: **0 th12-Treffer** auf irgendeiner Fahrbahn, Gesamt 91 (Bereich 84–98).
* `th-netz.mjs`: per GPS erreichbar in **48 Punkten** — die kürzeste Route aller fünf Viertel.
  Der Anschluss zeigt auf die Sportpark-Straße (Mittelachse z = 236, Ostende x = 90), nicht
  auf einen Viertelrand — sonst endet der Verbinder im Rasen.

⚠️ Die Landstraße schwankte im Verlauf 25 → 39 → 29. Das ist **nicht** das neue Viertel: die
Treffer sind Seilbahn-Masten, Baumkronen und Felsen. Bei dieser Kennzahl immer erst den
**Inhalt** des Bandes ansehen, bevor man eine Änderung dafür verantwortlich macht.

## 2026-08-27 · 🦓 Zoo — sechstes Viertel, zehn Archivmodelle stehen jetzt

Die fünf **th24**-Modelle waren die zweite Gruppe aus der Inventur, die nie aufgestellt
wurde. Steht bei **(−200|−200)**, r = 283, **0 m ausgewichen**, angebunden ans Westende der
Bauernhof-Straße.

### Drei Gehege statt einem
Der Reihen-Generator setzt jeden `bauten`-Eintrag **einmal**. `th24_gehege` steht deshalb
dreimal in der Liste — sonst ist ein Zoo ein Eingang, eine Voliere und viel Platz.

### ⚠️ Der tiefste Bau bestimmt die Breite des ganzen Viertels
`viertelMass` nimmt bei `achse:"x"` das größte `d` aller Bauten. Bei 9 m Höhe ist das
Aquarienhaus **36,2 × 44 m** — die 44 m Tiefe hätten das Netto-Rechteck im Alleingang
aufgebläht (dieselbe Mechanik wie bei der Parkgarage). Auf 7 m skaliert: 28,2 × 34,2.

Und eine neue Variante derselben Falle: der **Streichelzoo ist nativ nur 3 m hoch**. Weil
`bau()` über die Höhe skaliert, wäre er auf 5 m gezogen **33,6 × 30 m** — größer als das
Aquarium, obwohl er das kleinste Modell ist. Auf 3,5 m sind es 23,5 × 21.
**Bei flachen Modellen die Zielhöhe besonders vorsichtig wählen: ein Meter mehr Höhe ist
dort ein Drittel mehr Grundfläche.**

Längere Bauzeile: 98,7 m Front + drei Lücken = 134,7 m, passt in die 142 m Netto-Länge.

### Verifiziert
| Werkzeug | Ergebnis |
|---|---|
| `th-viertel` | **6 Viertel, 0 nicht auf Stufe 2**, Zoo 0 m ausgewichen |
| `th-3d` | **0 th24-Treffer**, tiefste Überschneidung unverändert 1,39 m |
| `th-strassen` | **0 th24-Treffer** auf einer Fahrbahn, Gesamt 93 (Bereich 84–98) |
| `th-netz` | alle sechs Viertel erreichbar, Zoo in 136 Punkten |

**Stand der Inventur:** von den rund 40 wirklich ungenutzten Modellen stehen jetzt **10**
(th12 ×5, th24 ×5). Offen: th25 Flughafen (9 — braucht eine eigene Landebahn-Logik, passt
nicht in den Reihen-Generator), th14 Club-Interieur (12 — Innenräume, kein Viertel),
th29 Winter (6 — saisonal).

## 2026-08-27 · ❄️ Wintermarkt — und ein Suchlauf, der still nichts prüfte

Die sechs **th29**-Modelle passen in kein Viertel, sondern an die **Saison**: `applySaison()`
färbte bisher nur den Rasen um, jetzt hängt auch der Wintermarkt daran. Sichtbar in Saison 3,
also **fünf von zwanzig Spieltagen**. Verifiziert: Tag 1 → alle acht Teile versteckt,
Tag 16 → alle acht sichtbar.

* **Wintermarkt (−40|160)** — Christbaum, drei Weihnachtsbuden, Eisbahn, Schneemänner.
* **Rodelhang + Skiliftmast (180|−160)** — der einzige freie Platz mit 22 m Radius.

### ⚠️ Der erste Suchlauf war wertlos — 68 „freie" Plätze, darunter der See
Der Scan prüfte `freiPlatz()`, die **einzige** Stelle, die See samt Promenade,
Bahnhofsviertel, Altstadt-Südviertel, Fluss, Kirchhof, Klinik und Achterbahn-Stich kennt.
Die Funktion liegt in einem eigenen Gültigkeitsbereich und war für die Sonde `undefined` —
und der Test stand als `typeof freiPlatz === "function" && !freiPlatz(...)` da. Fehlt die
Funktion, **fällt die Prüfung still aus und der Platz gilt als frei**.

| | angeblich frei | tatsächlich frei |
|---|---|---|
| Radius 16 m | 68 | **9** |
| Radius 22 m | 42 | **1** |

Faktor 7. Der vermeintlich beste Platz (30|130) liegt 34 m vom Seemittelpunkt entfernt — die
Sperrzone reicht bei diesem Radius bis 46 m. **Ein fehlender Test, der sich als bestandener
ausgibt, ist schlimmer als gar keiner.** `window._freiPlatz` ist jetzt exportiert, und in
Sonden gehört statt des stillen `&&`-Zweigs ein `throw`.

### Warum genau diese zwei Orte
Beide liegen außerhalb von |x|,|z| ≤ 130 — das ist die Reichweite von `autoKollider()`
(Zeile „`if(Math.abs(v.x)>130||Math.abs(v.z)>130)return;`"). Ein Markt, der acht von
zwanzig Tagen unsichtbar ist, hinterlässt dort **keine unsichtbaren Wände**. Wer die Teile
näher an die Stadt holt, muss die Kollider mit der Saison mitschalten.

### Verifiziert
`th-3d`: **0 th29-Treffer**, tiefste Überschneidung unverändert 1,39 m ·
`th-strassen`: **0 th29-Treffer** auf einer Fahrbahn, Gesamt 79 ·
Saison-Umschaltung an Tag 1 und Tag 16 gemessen.

**Stand der Inventur:** von den ~40 ungenutzten Modellen stehen jetzt **16** (th12 ×5,
th24 ×5, th29 ×6). Offen: th25 Flughafen (9, braucht Landebahn-Logik) und th14
Club-Interieur (12, Innenräume).

## 2026-08-27 · 🕳️ `typeof x === "function" &&` — die Prüfung, die sich als bestanden ausgibt

Nach dem Wintermarkt-Fund alle Sonden auf dasselbe Muster durchsucht. **Gemessen**, was eine
Sonde im IIFE-Scope des Spiels wirklich sieht:

| Bezeichner | in der Sonde |
|---|---|
| `freiPlatz` | **undefined** |
| `window._freiPlatz` | function |
| `zielFrei` | function |
| `bergBoxen` | **undefined** |
| `_mobil`, `_lodBereit`, `inSolid`, `imBau` | vorhanden |

### 🔴 `th-augen.mjs` stellte die Kamera weiter in Gebäude
Der Kopfkommentar des Werkzeugs beschreibt den Fehler als behoben: *„Beim ersten Versuch
stand die Figur bei (0|96) IM Bahnhofsgebäude."* Der Ausweich-Zweig stand als
`if(typeof freiPlatz === "function" && !freiPlatz(x,z,2))` da — und weil der erste Operand
**immer false** ist, lief er **nie**. Jedes Foto seit Einführung des Werkzeugs konnte aus
einer Wand stammen, ohne Hinweis.

**Beweis nach der Korrektur** (`window._freiPlatz`, plus `throw`, wenn sie fehlt):

```
th-augen.mjs 0 96 0   →   ⚠️ 0/96 war belegt -> 9/80.4 (18 m)
```

Diese Zeile war vorher unerreichbar.

### Die Regel
In einer Sonde ist `typeof x === "function" && x(...)` **kein Schutz, sondern eine
Tarnkappe**: fehlt `x`, verschwindet die Prüfung lautlos und der Lauf meldet grün. Wo eine
Prüfung das Ergebnis trägt, gehört ein `throw` hin — `th-viertel.mjs` wirft jetzt, wenn
`_viertelSolver` unvollständig ist, statt eine leere Bergliste auszuweisen.

Harmlos und deshalb belassen: `th-koop.mjs` (`zielFrei` ist vorhanden) und `th-tempo.mjs`
(`_mobil`/`_lodBereit` werden nur *gemeldet*, sie steuern nichts).

Was das Spiel exportiert, damit Sonden nicht raten müssen: `window._viertelSolver`,
`window._freiPlatz`, `window._spaetEinfrieren`, `window._nachRuecken`, `window._bankPos`.

## 2026-08-27 · 👁️ Vier grüne Werkzeuge — und die Straße lief trotzdem durch die Windmühle

Nach dem Zoo (#2342) habe ich zum ersten Mal **hingesehen** statt nur gemessen
(`th-augen.mjs`, seit #2344 wieder funktionsfähig). Das erste Foto vom Bauernhof-Weg zeigte
die **Windmühle mitten auf der Fahrbahn**.

Nachgerechnet, nicht nur betrachtet:

| | |
|---|---|
| Zoo-Viertelstraße | x −285…−115 bei **z = −200**, Belag −204,5…−195,5 |
| `bd_windmill_tower` | x −139,5…−132,7, **z −199,2…−192,8** |

Der Turm stand mit 3,7 m im Belag. **Alle vier Werkzeuge meldeten sauber**, und jedes aus
einem anderen guten Grund:

* `th-strassen.mjs` kennt nur die großen Bänder (Haupt-, Quer-, Ring-, Zubringer-,
  Landstraße) — **nicht die Straßen INNERHALB eines Viertels**. Das ist die Lücke.
* `th-3d.mjs` vergleicht Objekt gegen Objekt; eine Fahrbahn ist eine Fläche ohne Kollider.
* `th-netz.mjs` prüft Erreichbarkeit, nicht Sauberkeit.
* `viertelPasst()` sieht nur `WORLD_SOLIDS` — und die Mühle hat **0 Kollider im Umkreis von
  12 m**. Für den Solver existierte sie nicht: dieselbe Klasse wie Fahrbahnen und Berge.

**Behoben** über `SPAETE_SPERREN` (Maße aus der Box inkl. Flügel, z −204,1…−187,9). Der Zoo
rückt damit auf (−230|−200); seine Straße endet bei x = −145 und lässt der Mühle 5,5 m Luft.

### ⚠️ Warum die Mühle KEINEN Kollider bekommt
Das Lieferziel **„Windmühle" liegt auf (−136|−196)** — also *im* Bauwerk. Ein Kollider dort
machte das Ziel unerreichbar. Deshalb eine Sperre für den **Solver** statt eines Kolliders
für die **Welt**. Wer das je ändert, muss zuerst das Lieferziel verschieben.

### Die Lehre
Vier grüne Werkzeuge sind kein Beweis, sondern vier beantwortete Fragen. Keines von ihnen
stellte die Frage „steht etwas auf einer **Viertelstraße**". **Nach jedem neuen Viertel ein
Foto aus Augenhöhe** — das kostet 90 Sekunden und hat hier gefunden, was 20 Minuten
Zahlenprüfung nicht fanden.

**Verifiziert nach der Korrektur:** `th-3d` einziger Mühlen-Eintrag = eigene Flügel am eigenen
Turm (0,76 m, konstruktiv) · `th-strassen` 0 th24-Treffer, Gesamt 84 · `th-netz` alle sechs
Viertel erreichbar · Foto zeigt die Mühle frei auf der Wiese.

## 2026-08-27 · 🛤️ `th-strassen.mjs` kennt jetzt auch die Straßen IN den Vierteln

Die Lücke aus #2345 geschlossen. Die Bandtabelle kannte nur die großen Achsen; **jede
Viertelstraße und jeder Anschlussweg fehlte** — und genau dort stand die Windmühle. Die
Bänder werden jetzt **aus der Welt gelesen** (`_viertelSolver.VIERTEL`), nicht fest
eingetragen: Viertel wandern, feste Werte wären nach der nächsten Verschiebung falsch.

* Viertelstraße = Mittelachse des Viertels, halbe Belagsbreite 4,5, über die ganze Länge.
* Anschluss = L-Weg aus zwei achsenparallelen Abschnitten.

**Sofortbefund: 143 Objekte auf Wegen, die vorher unsichtbar waren** — mehr als der bis
dahin bekannte Gesamtstand (84).

### 🔴 Der Anschluss lief durch die eigenen Häuser
`Anschluss Vergnügungsviertel` meldete **41 Mesh-Positionen** in Casino und Spielhalle.
Ursache: `viertel()` zog den L-Weg **immer erst in x, dann in z**. Bei einem *längs*-Viertel
(Straße läuft in x) liegt der letzte Schenkel damit **quer** zur Straße und schneidet die
Bauzeilen — er läuft zwangsläufig auf der Mittelachse `VX`, und dort steht ein Haus.

**Behoben:** die Reihenfolge richtet sich jetzt nach der Achse. Der letzte Schenkel liegt auf
der **eigenen Straße** des Viertels, der Weg mündet in sie ein statt sie zu kreuzen. Für
*quer*-Viertel war die alte Reihenfolge bereits richtig.

| Anschluss | vorher | nachher |
|---|---|---|
| Vergnügungsviertel | **41** | **0** (nicht mehr gelistet) |
| Freizeitpark, 2. Schenkel | 7 | **0** |
| Zoo, 2. Schenkel | 12 | **1** |

### ⚠️ Werkzeug und Spiel müssen dieselbe Reihenfolge kennen
Nach der Korrektur im Spiel meldete das Werkzeug erst **42** statt weniger — es modellierte
noch die **alte** Schenkel-Reihenfolge und maß damit eine Straße, die es nicht mehr gibt.
Wer die eine Seite ändert, ändert die andere mit.

### Was bleibt (geprüft, kein Fehler)
`Viertelstr. Gewerbe Ost (19)` sind die **vier absichtlich am Bordstein geparkten Wagen**
(`th37_lieferwagen/kombi/limousine/sportwagen`) — sie stehen dort mit `ohneSchutz:true`, weil
sie genau dorthin gehören. Eine Zahl in dieser Liste ist erst dann ein Fehler, wenn das
Objekt dort nicht hingehört.

**Verifiziert:** 6 Viertel, 0 nicht auf Stufe 2 · alle sechs per GPS erreichbar
(Vergnügungsviertel jetzt in 48 statt 50 Punkten) · `th-netz` 25 ok, 0 Fehler.

## 2026-08-27 · 🌬️ Nachtrag: die Sperre allein hat die Windmühle NICHT freigeräumt

**Korrektur zu #2345.** Dort steht „lässt der Mühle 5,5 m Luft" — das galt für die
*Viertelstraße*. Der **Anschlussweg** legte sich danach mit seinem letzten Schenkel (auf
`z = VZ`, also Straßenhöhe) über genau die freigeräumte Strecke und lief wieder durch den
Turm. Sichtbar wurde das erst, seit `th-strassen.mjs` die Anschlusswege kennt (#2346):
`Anschluss Zoo 2 (1) bd_windmill_tower`.

> **Eine Sperre verschiebt das Viertel, nicht seinen Weg.** `SPAETE_SPERREN` wirkt in
> `viertelPasst()` auf das Netto-Rechteck; der Anschluss wird davon unabhängig gezogen.

**Behoben:** Zoo-Wunschort z −200 → −230, gelandet bei (−200|−250). Straßenhöhe damit 54 m
von der Mühle (z −196) entfernt. **Kein einziger Zoo-Eintrag mehr in der Straßenliste.**

### 📋 Was auf Viertel- und Anschlusswegen noch steht (gemessen, triagiert, offen)
Der Befund aus #2346 ist damit **nicht** abgearbeitet. Reihenfolge nach Schwere:

| Weg | Treffer | Bewertung |
|---|---|---|
| Anschluss Bauernhof | 23 | 8× `th18_gewaechshaus` + 12 Baumkronen — **echter Fehler** |
| Anschluss Freizeitpark 1 | 11 | 8× `th19_eishalle` (ein Sportpark-Bau!) — **echter Fehler** |
| Viertelstr. Freizeitpark | 14 | Parklaternen/Wegweiser/Parkplan **auf** dem Belag statt am Rand |
| Anschluss Gewerbe Ost 1 | 5 | Obelisk + zwei Schmiedelaternen bei (140\|−4) |
| Anschluss Sportpark Süd | 1 | eine Baumkrone |
| **Viertelstr. Gewerbe Ost** | 19 | **kein Fehler** — die vier absichtlich am Bordstein geparkten Wagen |

Die Streu-Objekte (Kronen, Laternen) kommen aus `freiPlatz()`, das die Viertel- und
Anschlusswege **nicht** kennt — dieselbe Lücke wie in der Bandtabelle, eine Ebene tiefer.
Der saubere Weg ist, `freiPlatz()` dieselben Bänder beizubringen, die `th-strassen.mjs`
jetzt aus `_viertelSolver.VIERTEL` liest. Die Gebäude (Gewächshäuser, Eishalle) sind ein
eigener Fall: sie gehören zu einem Viertel und müssen dessen Anschluss aussparen.

**Verifiziert:** 6 Viertel, 0 nicht auf Stufe 2 · Zoo per GPS in 134 Punkten erreichbar ·
`th-netz` 25 ok · `th-3d` 56 echt (unverändert).

## 2026-08-27 · 🌳 `freiPlatz()` kennt die Viertelwege — und beide Seiten lesen dieselbe Quelle

`freiPlatz()` ist die gemeinsame Quelle aller Streu-Objekte, kannte aber die
Viertelstraßen und Anschlusswege nicht — daher 12 Baumkronen auf dem Bauernhof-Anschluss
(#2347). Behoben über `window._aufViertelWeg(x,z,pad)`.

| | vorher | nachher |
|---|---|---|
| Baumkronen auf dem Bauernhof-Anschluss | 12 | **3** |
| Anschluss Zoo | 1 | **0** |

Die verbleibenden **3** sind die, die vor Millisekunde 260 gestreut wurden: die Viertel
entstehen in `setTimeout(…, 260)`, das Streuen startet bei 60 ms und läuft in Häppchen
weiter. Der weitaus größte Teil fällt in die Zeit, in der die Wege schon stehen — ein Rest
bleibt prinzipbedingt.

### ⚠️ EINE Herleitung, nicht zwei
Der Weg dahin ist die eigentliche Lehre:
1. Die Bänder fehlten ganz → die Zoo-Straße lief durch die Windmühle, alles grün (#2345).
2. Das Werkzeug bekam **seine eigene Kopie** der Geometrie (#2346).
3. Der Generator änderte die Schenkel-Reihenfolge → das Werkzeug maß eine Straße, **die es
   nicht mehr gab**: 42 Treffer auf einem Phantom, und der Fix sah aus wie ein Rückschritt.

**Zwei Herleitungen derselben Sache gehen auseinander, sobald eine sich ändert.**
`window._viertelBaender()` im Spiel ist jetzt die einzige; `freiPlatz()` und
`th-strassen.mjs` lesen beide von dort.

### Was bewusst offen bleibt
* `Viertelstr. Freizeitpark (14)` — Parklaternen, Wegweiser, Parkplan. Kommen **nicht** aus
  `freiPlatz()`, sondern aus dem Ausstattungs-Code des Freizeitparks, der die eigene Straße
  nicht ausspart.
* `Anschluss Bauernhof (8× th18_gewaechshaus)` — aus `hofausbau()`, feste Offsets.
* `Anschluss Freizeitpark 1 (8× th19_eishalle)` — ein **Sportpark**-Bau auf dem Anschluss
  des Nachbarviertels.
* `Viertelstr. Gewerbe Ost (19)` — **kein Fehler**, die absichtlich geparkten Wagen.

Alle vier brauchen dieselbe Behandlung wie `freiPlatz()`: den eigenen Weg aussparen. Das ist
je Stelle ein eigener Eingriff, kein gemeinsamer Schalter.

### ⚠️ Backticks in Sonden — vier Mal an einem Tag
Sonden stehen in Template-Literalen. Ein `` `bezeichner` `` im Kommentar **beendet das
Literal** und der Lauf stirbt mit „Unexpected identifier". Passiert in `th-viertel`,
`th-netz`, `th-strassen` (zweimal). In Sondenquelltext keine Backticks — auch nicht in
Kommentaren.

## 2026-08-27 · 🎡 Der Wunschort ist nicht der Standort — Park-Ausstattung 10 m daneben

`parkDeko()` des Freizeitparks stand fest auf `var PX=60, PZ=330` — dem **Wunschort** des
Viertels. `viertelOrt()` weicht aber aus, und der Park steht tatsächlich auf **z = 340**. Die
Ausstattung blieb 10 m zurück, und die Laternenreihe bei `PZ+9` landete damit **1 m neben der
Viertelstraße**, also mitten auf dem Belag.

| `Viertelstr. Freizeitpark` | vorher | nachher |
|---|---|---|
| 6× Parklaterne, 6× Wegweiser, 2× Parkplan | **14** | **0** |

Behoben mit `var PX=(_fp?_fp.x:60), PZ=(_fp?_fp.z:330)` — dieselbe Lösung, die der Bauernhof
seit #2314 mit `BHDX/BHDZ` hat. **Wer Ausstattung an ein Viertel hängt, nimmt dessen echte
Mitte, nie den Wunsch.** Das gilt für jeden weiteren `setTimeout`-Block, der Koordinaten aus
einem `viertel({…})`-Aufruf abschreibt.

### ⚠️ Leere Ausgabe ist kein Ergebnis
Der erste Messlauf schrieb eine **leere Datei**, und die Prüfzeile daneben meldete
folgerichtig „geräumt" — der Fix sah perfekt aus. Tatsächlich war nur der
`node_modules/playwright`-Symlink nach einem Container-Neustart weg, das Werkzeug startete
gar nicht. **Vor dem Auswerten prüfen, dass überhaupt etwas gemessen wurde**
(`wc -l`), sonst ist jede Änderung erfolgreich.

### 📌 Beobachtung für die nächste Runde
`Viertelstr. Zoo (5) th24_aquarienhaus (−150,4|−251,8)` taucht neu auf — bei **unverändertem**
Zoo-Standort und ohne Änderung an ihm. Verdacht: die dokumentierte Nichtdeterminiertheit von
`entzerren()`, das überlappende Bauten auseinanderschiebt, ohne die Straße zu kennen. Erst
messen (mehrere Läufe), dann urteilen.

## 2026-08-28 · 🧭 Das GPS kannte die Straßen nicht mehr — dritte Herleitung derselben Wege

Der Bauernhof-Anschluss zeigte auf **(−40|−100)**, dieselbe x-Achse wie das Viertel. Damit
fällt `viertel()` in den Einzelschenkel-Zweig und zieht einen reinen z-Weg auf der
Mittelachse **quer durch die eigenen Bauzeilen** — 8 Mesh-Positionen in den Gewächshäusern.

**Ort gemessen statt geraten.** Ein Korridor-Scan über x = −100…60 zählte die Objekte
zwischen z −100 und −246 je Kandidat, dann am echten Werkzeug nachgeprüft:

| Anschluss-x | Korridor-Scan | `th-strassen` | läuft durch |
|---|---|---|---|
| −40 (bisher) | 387 | **12** | eigene Gewächshäuser |
| 15 | 242 | 18 | Klinikareal (Notaufnahme, Rettungswagen) |
| −25 | 33 | 10 | Klinik |
| **60** | **15** | **5** | Fels am Wegrand |

Gewählt: **60**. Der Weg wird länger, ist dafür frei von Gebäuden. Die drei verbliebenen
41-m-Objekte sind Fels neben der Trasse — dokumentiert, nicht behoben.

### 🔴 `_GPS_VERB` war für JEDES Viertel veraltet
Beim Nachmessen fiel auf: `th-netz` meldete weiter „Bauernhof-Verbinder (−40|−150) ist
Straße", obwohl dort kein Asphalt mehr liegt. Grund: eine **dritte** handgepflegte Liste
derselben Wege — neben dem Generator und der Bandtabelle von `th-strassen`.

| `_GPS_VERB` sagte | tatsächlich |
|---|---|
| Gewerbe Ost bis x 172 | **250** |
| Sportpark bis z 236 | **246** |
| Freizeitpark bis z 330 | **340** |
| Bauernhof bis z −196 | **−246** |

Viertel weichen beim Setzen aus; die Liste zog nie nach. Das GPS routete also seit Langem
über Korridore ohne Belag. Jetzt kommt sie aus `_viertelBaender()` und wird nach **jedem**
`viertel()`-Aufruf nachgezogen (`_gpsNachziehen`). Nur Wege ohne Viertel (Strandzufahrt,
Achterbahn-Stich) bleiben fest.

⚠️ **Andere Achsen-Schreibweise:** in `_GPS_VERB` heißt `"x"` *läuft in x* (bei z = Wert), in
den Bändern heißt `a:"z"` dasselbe. Beim Umschreiben tauschen.

| | vorher | nachher |
|---|---|---|
| `_GPS_VERB`-Einträge | 8 (4 davon falsch) | **20** |
| Zoo- und Vergnügungs­viertel-Straße im Raster | nein | **ja** |
| Streckenanteil Freizeitpark-Route | 75–80 % | **90 %** |
| `th-netz`-Prüfungen | 25 | **35** |

### Und wieder ein Test, der veraltete Geometrie behauptete
Drei `th-netz`-Prüfungen wurden rot — **zu Recht**, aber nicht wegen eines Fehlers: sie
prüften fest verdrahtete Punkte einer früheren Wegführung, während das Raster jetzt
*richtiger* ist als vorher. Dieselbe Falle wie #2339. Sie leiten ihre Prüfpunkte jetzt aus
`_viertelBaender()` ab: je Anschluss-Band dessen Mittelpunkt.

**Verifiziert:** 6 Viertel, 0 nicht auf Stufe 2 · `th-netz` 35 ok, 0 Fehler · `th-3d` 56 echt ·
`th-strassen` Bauernhof-Anschluss 12 → 5, Gesamt 137.

## 2026-08-28 · 🦆👫 Enten füttern zu zweit — der erste echte Koop-Anreiz am See

**Was:** Stehen BEIDE Spieler gleichzeitig im Uferring des Seeparks (r 12–17), kommt der
ganze Schwarm: doppelte Laune (+18 statt +8), Enten bleiben 12 s statt 8, kürzere Wartezeit
(20 s statt 30), eigener Hinweis, zweiter Ton — und `stats.entenKoop` plus Erfolg
**🦆 Entenpaar**.

**Der Kern der Änderung:** Die Fütter-Schleife brach beim **ersten** Bewohner im Ring ab
(`break`) — ob der andere danebenstand, war der Szene egal. Jetzt wird gezählt, und das
Ziel ist die **Mitte zwischen beiden**, damit die Enten zwischen sie schwimmen.

**Muster beibehalten:** Host entscheidet, Gast hört zu (wie Brunnen/Tor). Die Netz-Nachricht
trägt jetzt `zwei` und `wer` (alle beteiligten Bewohner), damit der Gast dieselbe Meldung
und beide Emojis sieht.

**⚠️ Falle beim Messen (gekostet: ein Fehlschlag):** Laune zwischen zwei getrennten
`page.evaluate`-Aufrufen zu vergleichen ist wertlos — die Spielschleife läuft weiter und
hebt `needs.spass` in der Zwischenzeit auf 100. Setzen, ticken und lesen muss in EINEN
Aufruf. Der Test macht es jetzt so (`messe`).

**Werkzeug:** `spiele-dev/tools/th-enten.mjs` (11 Checks: allein vs. zu zweit, Zieldauer,
Wartezeit, Laune-Differenz, Ziel liegt zwischen beiden, leerer Ring löst nichts aus).

## 2026-08-28 · 🏟️ Der Freizeitpark-Anschluss endete 30 m im Rasen — und warum die Eishalle bleibt

Der Anschluss zeigte auf **(0|216)**; der Kommentar darüber nannte das „die Mittelachse des
Sportparks". Der steht aber auf **z = 246** — er weicht beim Setzen aus, die Zahl zog nie
nach. Dieselbe Veraltung wie in `_GPS_VERB` (#2355), nur eine Ebene höher. Der Verbindungsweg
endete also 30 m vor der Straße, die er treffen sollte.

**Korrigiert auf (0|246).** Routenanteil 88 %, `th-netz` 35 ok, `th-3d` 57, 6 Viertel auf
Stufe 2.

### ❌ Die Eishalle bleibt — gemessen, nicht übersehen
Der Weg muss von der Sportpark-Straße nach Norden und kreuzt dabei dessen **Nordzeile**; dort
steht `th19_eishalle` mit 8 Mesh-Positionen. Beide Ausweichrouten gemessen:

| Anschluss | Straßentreffer | Routenanteil | `th-3d` |
|---|---|---|---|
| (0\|216) bisher, stale | 11 | 90 % | 56 |
| **(0\|246) neu** | **11** | **88 %** | **57** |
| (88\|246) | 11 | unverändert | — |
| (−88\|246) | **1** | **43 %** ❌ | **60** ❌ |

Die Westseite räumt die Straße frei und **zerstört dafür die Wegführung**: das GPS findet den
Park dann nicht mehr über Asphalt (5 statt 46 Routenpunkte auf den Bändern). **Weniger
Treffer wären hier das schlechtere Spiel.**

> Zwei Kennzahlen können sich widersprechen. Dann gewinnt die, die der Spieler merkt — eine
> Route, die über die Wiese führt, fällt auf; ein Gebäude am Straßenrand nicht.

Wer es besser lösen will, lässt die **Bauzeile des Sportparks eine Lücke** für den Anschluss,
statt den Anschluss außen herum zu führen. Das ist der allgemeine Fall aus #2346, den der
Generator noch nicht kann.

## 2026-08-28 · ✈️ Flughafen — der letzte große Posten aus der Inventur steht

Neun **th25**-Modelle, die in keinen Reihen-Generator passen, weil eine **Landebahn**
dazugehört. Zweiteilig gelöst: Gebäude als Viertel, Bahn und Vorfeld daneben — beide an der
**echten** Viertelmitte (`_fh.x/_fh.z`), nicht am Wunschort.

* **Viertel (300|−260)**, r = 397, 0 m ausgewichen: Terminal (40,8×27,2), Hangar (37,4×27,7),
  Tower (h 22), Radarturm (h 18).
* **Landebahn**: 8 Module à 17,6 m = **141 m**, parallel zur Viertelstraße bei `FZ+62`.
* **Vorfeld**: Flugzeug, Fluggastbrücke, Tank- und Gepäckwagen.

### ⚠️ `viertelMass` prüft nur die Bauzeilen — die Landebahn ist für den Solver unsichtbar
Das Netto-Rechteck (82 × 67,3) deckt nur die Gebäudereihen ab. Alles, was daneben liegt —
Bahn, Vorfeld, Flugzeug — sieht `viertelPasst()` **nicht**. `cfg.d` vergrößert nur die
Bodenfläche, nicht die Prüfung.

Der Rasterscan prüft deshalb **zwei** Dinge: `viertelPasst(cfg,x,z,2)` **und** zusätzlich den
Streifen der Bahn (`z+50…z+74`) gegen `freiPlatz`, Fahrbahnen und Gelände. **18 Plätze**
erfüllen beides, alle weit draußen — der nächste ist (300|−260). Für einen Flughafen passt
das; für ein Stadtviertel wäre es ein Warnsignal.

Der erste Wunsch (−200|60) lag im **Meer-Sektor** (`x−hw < −118` bei `|z| < 170`); das Viertel
landete auf der Landstraße. Erst messen, dann setzen.

### ⚠️ Vorfeld gehört auf die Außenseite der Bahn
Erster Anlauf: Vorfeld zwischen Bauzeile und Bahn. Dort sind aber nur **5,7 m** frei (Bauten
bis 47,5 m von der Mitte, Bahn ab 53 m) — die 17,4 m tiefe Fluggastbrücke steckte 0,25 m im
Hangar (25 Meshpaare). Außen ist Platz.

**Die verbliebene Überschneidung ist konstruktiv:** `fluggastbruecke × flugzeug`, 0,13 m ab
Höhe 2,57 m — eine Brücke, die am Flugzeug andockt. Wie Windmühlenflügel am Turm (0,76 m)
oder Bus an der Haltestelle (0,66 m).

### Verifiziert
| Werkzeug | Ergebnis |
|---|---|
| `th-viertel` | **7 Viertel, 0 nicht auf Stufe 2**, Flughafen 0 m ausgewichen |
| `th-strassen` | **0 th25-Treffer** auf irgendeiner Fahrbahn, Gesamt 139 |
| `th-3d` | einziger th25-Eintrag = Brücke am Flugzeug (konstruktiv) |
| `th-netz` | **38 ok**, erreichbar in 147 Punkten, beide Anschluss-Schenkel sind Straße |
| Foto | Hangar, Terminal, Tower, Radarmast, Flugzeug — stimmiges Bild |

**Stand der Inventur:** von den rund 40 ungenutzten Modellen stehen jetzt **25** (th12 ×5,
th24 ×5, th29 ×6, th25 ×9). Offen bleibt nur noch **th14 Club-Interieur (12)** — Innenräume,
die kein Viertel brauchen, sondern begehbare Gebäude.
*(Nachtrag 2026-08-29: erledigt — der Spielclub bei (126|102) stellt alle zwölf auf,
siehe den Abschnitt „Zwölf Modelle hatten nie einen Raum" am Ende dieser Datei.)*

## 2026-08-28 · 🎭 th14: zwei von zwölf stehen — und warum die anderen zehn liegen bleiben

Von den zwölf Club-Modellen sind genau **zwei** für draußen gemacht: `th14_neonschild_gross`
und `th14_samtkordel`. Sie stehen jetzt an den Eingängen von **Nachtclub** (155,2|198,8, Tür
nach Norden bei z = 209) und **Casino** (112,8|237,8, Tür nach Süden bei z = 224,3).

⚠️ Positionen **aus der Welt gelesen**, nicht aus dem Wunsch (#2353), und die Viertelstraße
belegt z 215,5…224,5 — die Möbel bleiben davor bzw. dahinter, sonst stünden sie auf der
Fahrbahn. Verifiziert: **0 th14 auf einer Fahrbahn, 0 Überschneidungen**.

### ❌ Die anderen zehn bleiben bewusst im Archiv
Pokertisch, Roulette, DJ-Pult, Discokugel, Tanzfläche, Spielautomat, Automatenreihe,
Casinobar, Kartentisch, Kronleuchter sind **Innenräume** — und ein begehbares Clubgebäude
gibt es nicht:

* Die `*_offen.glb` der Altstadt (Markthalle, Stadthaus, Laden, Werkstatt) sind **offene
  Hallen**; dort passt kein Casino hinein.
* Die Viertel-Bauten sind **geschlossene Modelle**. Das `tuer`-Flag erzeugt nur eine 3,2 m
  breite **Lücke im Kollider** (`addSolid(bx,bz,bw+1,bd+1,tuer)`) — wer hineingeht, steht im
  Inneren einer geschlossenen Hülle, nicht in einem Raum.

Sie dort zu verstecken wäre schlechter, als sie liegen zu lassen. Was es bräuchte: entweder
ein offenes Clubmodell (`th12_nachtclub_offen`) oder ein echtes Innenraum-System mit
Übergang — beides eine eigene Runde mit neuer Mechanik, keine Platzierung.

**Stand der Inventur:** von den rund 40 ungenutzten Modellen stehen jetzt **27**. Die
restlichen 10 sind kein Nachziehen mehr, sondern eine Design-Entscheidung.

## 2026-08-28 · ❌ Viertelwege in `KORRIDORE`: gebaut, gemessen, verworfen

Naheliegend nach #2348: `freiRaeumen()` räumt Objekte aus Straßenkorridoren, kennt aber nur
die großen Achsen. Die Viertelwege in `KORRIDORE` einzutragen (aus `_viertelBaender()`, mit
6-m-Grenze, damit nur Kleinzeug bewegt wird) sollte den Rest der Liste aus #2347 aufräumen.

**Gemessen: der Räumlauf bewegt damit nichts.** `window._freigeraeumt` meldet
`{verschoben: 0, steckengeblieben: 0}` — obwohl 20 Viertelkorridore in der Tabelle stehen.

Der Grund liegt in der Zusammensetzung der Treffer:

| Was noch auf Viertelwegen steht | warum `freiRaeumen()` es nicht anfasst |
|---|---|
| `th19_eishalle`, Gewächshäuser | Gebäude, > 6 m — von der Grenze ausgenommen |
| Fels (41 m), Bergboxen | Gelände, nicht in `window._gebaeude` |
| Baumkronen, Blumen | prozedurales Streuwerk, ebenfalls nicht in `_gebaeude` |
| Obelisk, Schmiedelaternen | mit `fest()` gesetzt → `userData.fest`, absichtlich unbeweglich |
| 4 geparkte Wagen | **absichtlich am Bordstein** |

### 🔴 Und die einzige messbare Wirkung war eine Regression
Ohne Schutz schob der erweiterte Räumlauf die **vier absichtlich am Bordstein geparkten
Wagen** von Gewerbe Ost von der Fahrbahn — 19 Mesh-Positionen, die genau dorthin gehören
(der Code sagt das ausdrücklich: „Wagen am Bordstein … `wegVonStrasse` würde sie von der
Fahrbahn schieben, auf die sie gerade gehören"). `Viertelstr. Gewerbe Ost` fiel von 19 auf 0,
und das sah in der Kennzahl wie ein Erfolg aus.

**Ein Automatismus darf eine bewusste Platzierung nicht überstimmen.** Der Versuch, das über
`ohneSchutz` zu schützen, war zu grob: das Flag heißt nur „überspring `wegVonStrasse`" und
gilt auch für Bahn-Zubehör und Deko — 18 Treffer wären damit fälschlich ausgenommen worden.

Verworfen. Der verbliebene Rest auf Viertelwegen ist **kein Streuwerk-Problem**, sondern
besteht aus Gebäuden, Gelände und Absicht. Wer ihn angeht, muss an die jeweilige Quelle
(Bauzeile aussparen, Anschluss anders führen) — nicht an einen Räumlauf.

## 2026-08-28 · 🐄 Fünf Tiere standen seit Charge 38 an einer unsichtbaren Wand

Beim Blick auf den Zoo fiel auf, dass Gehege ohne Tiere nur Zäune sind — und beim Nachsehen,
wie das Spiel Tiere ortsgebunden hält (`home:{x,z,r}`), kam ein echter Fehler heraus.

**Zwei Ursachen, beide in dieser Session schon einmal dagewesen:**

1. **Wunschort statt Standort.** Die Koppel-Herde hing fest auf `home:{x:30.5,z:-177}` — dem
   Wunschort des Bauernhofs. Der steht auf **z = −246**, die Koppel (aus `hofausbau`, mit
   `BHDZ`) also auf **z = −227**. Die Herde war 50 m daneben angesetzt. Dieselbe Falle wie
   bei der Park-Ausstattung des Freizeitparks (#2353).
2. **Eine Weltgrenze, die auch für Ortsgebundene galt.** `updTiere()` klemmt Landtiere hart
   auf `lim = 108`. Die Koppel liegt weit dahinter — die Tiere steuerten also auf ihr `home`
   zu und wurden bei **z = −108** festgehalten. Gemessen: **alle fünf exakt auf z = −108**,
   eine Reihe Kühe und Hühner im offenen Feld, seit das Bauernhof-Viertel existiert.

**Behoben:**
* Die Herde entsteht in einem eigenen späten Lauf (1200 ms) und liest die **echte** Lage aus
  `_viertelSolver.VIERTEL`; Koppelmitte = `(30,5+BHDX | −177+BHDZ)` wie in `hofausbau`.
  `baueTiere` läuft bei 0 ms, die Viertel entstehen erst bei 260 ms — deshalb der eigene Lauf.
* Wer ein `home` hat, wird **von dort** gehalten (weich auf `r+8` zurückgeholt) statt von der
  Weltgrenze; `lim = 108` gilt nur noch für die frei umherziehenden Tiere der Innenstadt.

| | vorher | nachher |
|---|---|---|
| Abstand der Koppel-Tiere zu ihrem `home` | ~120 m (alle auf z = −108) | **1,2–7,7 m** bei r = 9 |

**Verifiziert:** 7 Viertel auf Stufe 2 · `th-netz` 38 ok · `th-3d` 58 · Foto zeigt den
Koppelzaun mit Schwein davor.

### Die Regel dahinter, zum dritten Mal in dieser Session
Jede Stelle, die Koordinaten aus einem `viertel({…})`-Aufruf abschreibt, veraltet, sobald das
Viertel ausweicht — und ausweichen ist der Normalfall, nicht die Ausnahme. Betroffen waren
bisher: `_GPS_VERB` (#2355), `parkDeko` (#2353), der Freizeitpark-Anschluss (#2356) und jetzt
die Koppel-Herde. **Wer an ein Viertel anbaut, liest `_viertelSolver.VIERTEL`.**

## 2026-08-28 · 🗺️ Drei Viertel standen in der Welt, aber nicht auf der Karte

Systematische Nachsuche nach der Wunschort-Falle (viermal getroffen: `_GPS_VERB`, `parkDeko`,
Freizeitpark-Anschluss, Koppel-Herde). Ergebnis: **alle bestehenden Marken folgen korrekt** —
`marke()` in `viertel()` schreibt die echte Lage in `WORLD_POIS` und `LIEFERZIELE`, sobald der
Name passt. Gemessen: sieben von sieben mit Abstand 0 m.

**Die Lücke war eine andere:** die drei Viertel dieser Charge — **Vergnügungsviertel, Zoo,
Flughafen** — standen in **keiner der beiden Listen**. Sie existierten in der Welt, waren per
GPS erreichbar, aber auf der Karte war dort nichts und **kein Lieferauftrag führte je hin**.

> Ein Viertel, das man nicht findet, ist so gut wie nicht gebaut.

Ergänzt: 🎰 Vergnügungsviertel · 🦓 Zoo · ✈️ Flughafen — als Kartenmarke **und** als Lieferziel.
Die eingetragenen Koordinaten sind nur Startwerte; `marke()` zieht sie nach.

⚠️ Der Lieferlohn wächst mit der Strecke (`lohn = (40 + t·1,6 + weg·0,5) · bonus`), lange Ziele
zahlen sich also selbst — der Flughafen (r = 397) ist nur wenig weiter als der Freizeitpark
(r = 345), der längst Ziel war.

**Verifiziert:** 7 von 7 Vierteln mit Marke und Lieferziel, je 0 m Abstand · `th-netz` 38 ok ·
`th-missmap` 8 ok.

### Wer ein Viertel hinzufügt, braucht drei Einträge
1. `viertel({…})` — die Welt.
2. `WORLD_POIS` — die Karte.
3. `LIEFERZIELE` — die Aufträge.

Nur der erste ist offensichtlich. Die beiden anderen fallen erst auf, wenn jemand das Viertel
sucht — und ohne Marke sucht niemand.

### ❌ `QSPERR` ist veraltet, aber folgenlos
Die Sperrliste der Berge (`[[60,330,…],[0,216,…],[172,0,…]]`) nennt ebenfalls Wunschorte. Sie
wirkt aber, **bevor** die Viertel entstehen, und seit `imBerg()` das Gelände rastert weichen
die Viertel den Bergen aus statt umgekehrt. Nicht angefasst — die Reihenfolge macht die
Veraltung harmlos.

## 2026-08-28 · 🐌 „Ruckelt am Handy" — das Einfrieren erreichte nur die oberste Ebene

**Befund (User-Meldung, dann gemessen):** `_einfrieren()` lief nur über `scene.children`.
Gemessen im Querformat: **3 568 Objekte eingefroren — aber 54 765 Nachfahren blieben offen**
und komponierten ihre Matrix in **jedem Bild** neu. Das Runbook nannte hier einmal 239; der
Wert war längst überholt, ohne dass es jemand bemerkt hatte.

| | vorher | nachher |
|---|---|---|
| nicht eingefrorene Meshes | **53 370** | **5 629** (−90 %) |

Die verbliebenen 5 629 sind die beweglichen Teilbäume (Bewohner samt Armen, Autos, Fussgänger,
Gondeln) — sie **müssen** offen bleiben. Das tiefe Einfrieren **betritt `_bewegt`-Teilbäume gar
nicht erst**, deshalb ist es sicher.

**⚠️ Zweiter Fehler, dabei gefunden:** `_bewegt = true` NACH dem Einfrieren zu setzen wirkt
**nicht** — die Marke wird nur beim Einfrieren gelesen. Das **Karussell drehte sich in den
Daten** (`rotation +0,367` in 4 s) **und stand sichtbar still**, weil `matrixAutoUpdate` false
blieb. Dafür gibt es jetzt `window._auftauen(obj)`, das beides setzt. Karussell und Teetassen
drehen seitdem sichtbar.

**⚠️ Falle beim Nachmessen (drei Fehlalarme):**
- `sims[0]` ist der **Spieler** — ohne Eingabe steht er zu Recht.
- `ENTEN.teile[0]` ist der Instanz-**Container**; die Enten stecken in seinen Instanzmatrizen.
- Ein Kind **auf der Drehachse** behält seine Weltposition — dafür die Rotation der Weltmatrix
  ansehen, nicht die Position.
Und: **Mia steht auch im unveränderten Code still** — gegen `origin/main` gegengemessen, bevor
etwas „repariert" wurde.

**Werkzeug:** `spiele-dev/tools/th-leistung.mjs` — geräteunabhängige Kennzahlen (Zeichenaufrufe,
Dreiecke, Materialien, nicht eingefrorene Objekte, Reichweite des Einfrierens) plus Bewegungs-
Gegenprobe. **Die Bildrate dieses Containers ist wertlos** (Software-Rendering) — nur diese
Zahlen zählen.

**Noch offen (gemessen, nicht behoben):** 9 308 Materialien, 6 126 Schattenwerfer, 17 Lichter.
Das sind die nächsten Hebel, wenn es weiter ruckelt.

## 2026-08-28 · ✅ Korrektur meiner eigenen Notiz: der Teilbaum-Frost ist sauber

In #2334 steht „**Teilbaum-Frost: gebaut, gemessen, verworfen**" — mit zwei Gründen: kein
Tempogewinn, und **724 Objekte bewegten sich danach nicht mehr**. Die Nachbar-Session hat den
Frost in #2361 erneut gebaut und gemergt. Also nachgemessen, weil ich als Einziger die
Vergleichszahl hatte.

### Der Animationsverlust ist behoben — mein Einwand gilt nicht mehr
Drei **gepaarte** Läufe auf `main`, Weltmatrizen aller ~58 600 Objekte zweimal im Abstand von
12 s abgetastet:

| | ohne Frost | mit Frost | Differenz |
|---|---|---|---|
| Lauf A | 6298 | 6225 | −73 |
| Lauf 1 | 6293 | 6450 | **+157** |
| Lauf 2 | 6483 | 6269 | −214 |

**Das Vorzeichen kippt.** Die Streuung innerhalb eines Arms (~190) ist größer als jeder
Unterschied zwischen ihnen — gegenüber **−724 bei meiner damaligen Fassung**. Der Unterschied
ist ihr `_auftauen(o)`: es schaltet `matrixAutoUpdate` wieder **ein**, wenn ein Objekt später
beweglich wird. Meine Fassung setzte nur `_bewegt` und ließ die Matrix stillstehen — genau
der Karussell-Fall, den sie beschreiben.

### Der fehlende Tempogewinn ist hier kein Gegenbeweis
CPU-Anteil isoliert (280×170, damit die Füllrate nicht dominiert), zwei gepaarte Läufe:
**200 ms ohne, 203 ms mit** — Vorzeichen kippt erneut (196/210). Deckt sich mit meiner Messung
von #2334 (212/213).

⚠️ **Daraus folgt aber nicht, dass die Änderung nichts bringt.** Dieser Container verbringt
**85,8 %** der Bildzeit in nativem SwiftShader-Code; eine JS-seitige Ersparnis von wenigen
Millisekunden liegt unter der Rauschgrenze und ist hier grundsätzlich nicht auflösbar. Auf
einem Telefon — kein Software-Rasterizer, JS um ein Vielfaches langsamer — können 54 765
eingesparte Matrix-Kompositionen je Bild sehr wohl zählen.

**Fazit:** die Notiz „verworfen" in #2334 gilt für **meine** Fassung, nicht für die in `main`.
Wer sie liest, soll den Frost nicht rückbauen. Was bleibt: der Frost ist **kein** Risiko für
Animationen (gemessen), und sein Nutzen ist von hier aus **nicht messbar** — nicht widerlegt.

## 2026-08-28 · 🦊 Tiere in die Zoo-Gehege — der Kreis zum Koppel-Fund

Der Zoo (#2342) bestand aus Zäunen und leeren Flächen. Dieselbe Begründung wie bei der
Bauernhof-Koppel — *„eine leere Koppel liest sich als vergessener Zaun"* — gilt für ein
Gehege genauso. Möglich wurde es erst durch den `home`-Fix aus #2360.

**Neun Tiere, alle innerhalb ihres Radius:**

| Ort | Tiere | Radius | gemessener Abstand |
|---|---|---|---|
| 3 × `th24_gehege` | Wildschwein, Reh, Fuchs (je 2) | 4 | 1,7–3,7 m |
| `th24_streichelzoo` | 3 × Hase | 6 | 4,1–4,5 m |

Exotische Modelle gibt es nicht — also **Heimattierpark statt Safari**. Ehrlicher als nichts,
und die Modelle sind da (`an_boar`, `an_deer`, `an_fox`, `an_rabbit`).

### ⚠️ Drei Zeitfallen, die hier zusammenkommen
1. **Erst bei 15 s setzen.** `entzerren()` rückt die Bauzeilen bei **14 s** noch zurecht. Wer
   vorher die Gehege ausliest, bindet die Tiere an eine Position, die es danach nicht mehr
   gibt.
2. **Lage aus `zoo.bauten[].w.position`**, nicht aus eigener Rechnung — eine eigene wäre die
   nächste Wunschort-Falle (viermal getroffen, siehe #2360).
3. **`freiRaeumen()` (15,5 s) fasst sie nicht an**, weil Tiere nicht über `bau()` laufen und
   damit nicht in `window._gebaeude` stehen. Geprüft, nicht gehofft.

`ladeTier` liegt in `baueTiere` und war von außen unerreichbar — jetzt als `window._ladeTier`
verfügbar, damit spätere Läufe Tiere nachsetzen können.

**Verifiziert:** 7 Viertel auf Stufe 2 · `th-netz` 38 ok · `th-3d` 57 · Foto zeigt Füchse
hinter dem Gehegezaun.

## 2026-08-28 · 🕳️ `InstancedMesh` war für alle Kartenwerkzeuge unsichtbar

Beim Nachrechnen der Flughafen-Ausdehnung ergab die Messung `x −15…321` — unmöglich für ein
Viertel bei x = 300. Die Ursache ist grundsätzlich:

> `Box3.setFromObject()` und `getWorldPosition()` liefern für einen `InstancedMesh` die Lage
> des **Trägers**, nicht die der Instanzen. Der Träger steht im Ursprung.

**Gemessen: 212 InstancedMeshes mit zusammen 6991 Instanzen** (Parkzaun 1820, Weidezaun 1152,
Landebahn 512, Waldsaum u. a.). Alle davon waren für `th-strassen.mjs`, `th-3d.mjs` und
`freiRaeumen()` entweder unsichtbar oder pauschal bei (0|0) einsortiert.

### Was dahinter lag
`th-strassen.mjs` prüft jetzt **jede Instanz einzeln** (Lage aus der Instanzmatrix, Höhe aus
der Geometrie-Box). Ergebnis in vergleichbaren Läufen: **137 → 232** belegte Positionen.

| Band | vorher | jetzt | was neu sichtbar wurde |
|---|---|---|---|
| Anschluss Gewerbe Ost | 5 | **23** | 18× instanziertes Streuwerk |
| Zubringer 30° | 8 | **21** | 16× Streuwerk |
| Hauptstraße Nord | 5 | **15** | 10× Streuwerk |
| Stadtring Süd | 2 | **12** | Streuwerk |
| Zubringer 330° | 1 | **14** | Streuwerk |

Die neu sichtbaren Treffer sind fast durchweg **instanziertes Streuwerk** (Bäume, Büsche;
Höhen 1,6–4,6 m). Es entsteht über einen anderen Weg als das Einzel-Streuwerk und respektiert
`freiPlatz()` offenbar nicht — **das ist der nächste Fund, nicht dieser.**

✅ Die **Landebahn** erscheint korrekt *nicht*: 0,4 m hoch, damit unter `MINH = 0,45` — wie
Fahrbahnmarkierungen. Der Flach-Filter tut, was er soll.

### ⚠️ `th-3d.mjs` ist weiterhin blind
Dort wäre ein Instanz-für-Instanz-Vergleich bei 6991 Instanzen teuer; das braucht eine eigene
Runde mit einer Rasterung. **Bis dahin gilt: `th-3d` sieht kein instanziertes Objekt** — eine
grüne Meldung dort schließt Überschneidungen mit Zäunen, Wald und Landebahn nicht aus.

### Und zum fünften Mal: keine Backticks in Sonden
Der Kommentar oben enthielt `` `getWorldPosition()` `` — das beendet das Template-Literal, und
der Lauf stirbt mit „Unexpected identifier". Die Regel steht seit #2348 im Runbook; ich habe
sie selbst wieder gebrochen. Sie gilt auch für Kommentare **über** dem Sondenblock, sobald sie
innerhalb der Backticks stehen.

## 2026-08-28 · 🌲 Der Waldsaum kannte sechs Ausnahmen — und die halben Straßen nicht

Direkte Folge aus #2365: seit die Werkzeuge Instanzen sehen, war der Waldsaum als größter
Instanz-Streuer zu prüfen. Sein Filter hatte **sechs handgeschriebene Ausnahmen**
(Zubringer, Achterbahn-Stich, Felder, Fels, Viertel, gedachte Zufahrtsschneise) — aber
`freiPlatz()` rief er **nie** auf, und Stadtring, Haupt- und Querstraßen, Fluss und
Landstraße kamen nicht vor.

**Behoben** über die gemeinsamen Quellen statt einer siebten Sonderregel:
`window._freiPlatz(wx,wz,3)`, `window._aufViertelWeg(wx,wz,2)` und
`_viertelSolver.fahrbahn(...)` — letzteres, weil **`freiPlatz` selbst** Landstraße und
Zubringer nicht kennt (dieselbe Lücke eine Ebene tiefer, hier nicht behoben, aber notiert).

| `th-strassen`, Gesamt | Lauf 1 | Lauf 2 | Mittel |
|---|---|---|---|
| ohne Waldfix | 233 | 245 | 239 |
| **mit Waldfix** | **205** | **212** | **208,5** |

Die Bereiche überschneiden sich **nicht** — rund **13 % weniger** belegte Positionen.

### 🔴 Mein eigenes Prüfskript war falsch — und hätte fast den Befund verdreht
Zwischendurch meldete eine Ad-hoc-Sonde „19 Baumkronen auf dem Stadtring", alle bei x ≈ ±112
und z zwischen −250 und +222. Der Stadtring existiert aber nur für **z −108…126**; meine
Sonde prüfte `|(|x|−112)| < 4,5` **ohne Längsbegrenzung**. `th-strassen.mjs` und `freiPlatz`
haben diese Grenzen (`von`/`bis` in der Bandtabelle) — die 19 waren erfunden, und meine
„Vorher"-Zahl von 46 damit ebenfalls.

> Eine schnell hingeschriebene Sonde ist kein Ersatz für das Werkzeug. Das Werkzeug trägt die
> Sonderfälle, die man beim Nachbauen vergisst — hier die Längsbegrenzung jedes Bandes.

Der Befund hat nur überlebt, weil ich am Ende mit `th-strassen.mjs` selbst gemessen habe statt
mit meiner Nachbildung.

**Verifiziert:** 7 Viertel auf Stufe 2 · `th-netz` 38 ok · `th-3d` 59.

## 2026-08-28 · 🛣️ `freiPlatz()` kennt jetzt auch Landstraße und Zubringer

Der offene Punkt aus #2366: dort musste der Waldsaum `_viertelSolver.fahrbahn` **zusätzlich**
fragen, weil `freiPlatz` allein die Bäume nicht von der Landstraße hielt. Statt das an jeder
Streu-Stelle zu wiederholen, steht es jetzt an der gemeinsamen Quelle.

`freiPlatz` kannte Haupt-, Quer- und Ringstraße, Fluss, Kirchhof und Klinik — aber nicht den
Ring bei r = 200 und nicht die sechs Speichen.

| `th-strassen`, Gesamt | Lauf 1 | Lauf 2 | Mittel |
|---|---|---|---|
| ohne | 201 | 208 | 204,5 |
| **mit** | **156** | **155** | **155,5** |

**−24 %**, die Bereiche liegen weit auseinander. Zusammen mit #2366 (239 → 208,5) ist die
Straßenbelegung damit von rund 239 auf 155 gefallen.

⚠️ Gleiche Einschränkung wie bei den Viertelwegen: der Solver entsteht erst bei 260 ms, früh
gestreute Objekte bleiben ungeschützt. Das ist der Rest, den das Werkzeug weiter findet.

**Verifiziert:** 7 Viertel auf Stufe 2 · `th-netz` 38 ok · `th-3d` 58.

## 2026-08-28 · 🚡 Die Seilbahn-Bergstation schwebte in 40 m Höhe über dem Nichts

Gefunden von einem Agenten-Fan-out (48 Sucher, 51 davon am Nutzungslimit gestorben — **ein
einziger** kam durch und meldete genau das hier). Nachgerechnet und gemessen, nicht geglaubt.

`QSPERR` hält zufällige Berge aus den Vierteln. **Berg 5 ist aber kein zufälliger:** überall im
Code eigens behandelt — fester Radius r = 213, feste Höhe 75, fester Fußradius 51,75, eigenes
Flag an `bergGeo()`. Auf ihm steht die **Bergstation der Seilbahn**.

Die Sportpark-Sperrzone `[0, 216, 110, 60]` erwischt ihn trotzdem:

```
|121,4 − 0|   = 121,4 < 110 + 51,75·0,9 = 156,6   ✔
|175 − 216|   =    41 <  60 + 46,6      = 106,6   ✔   → continue
```

**Gemessen vorher:** kein Gelände bei (121|175), kein Gelände unter der Station, Bergstation auf
**y 40,3 … 49,8** — sie hing in der Luft. Nächstes Gelände 76 m entfernt und 5 m hoch.

**Nachher:** Hausberg steht (121|175, 69 m), `imBerg` unter der Station **true**.

### Der Preis, offen benannt
Die Berge entstehen **vor** den Vierteln, also weichen die Viertel dem neuen Berg aus:

| | vorher | nachher |
|---|---|---|
| Sportpark Süd | 0\|246 | **−14\|250** |
| Vergnügungsviertel | 160\|220 | **250\|220** |
| `th-strassen` Gesamt | 155 | **182** |

Die +27 sind 15 Baumkronen auf der Parkstraße und **15× `th19_kletterhalle`** — eine
Sportpark-Halle, die durch den Umzug auf den Freizeitpark-Anschluss geriet. Das ist dieselbe
Klasse wie die Eishalle in #2356 (Anschluss kreuzt die Bauzeile des Nachbarn), nur stärker.

**Ein Gebäude, das 40 m über dem Boden schwebt, wiegt schwerer als Streuwerk am Straßenrand.**
Wer den Berg wieder sperrt, holt die Station in die Luft zurück.

⚠️ `th-viertel.mjs` meldet den Sportpark seither als „nicht auf Stufe 2: Viertel Freizeitpark".
Das ist das dokumentierte Artefakt des Werkzeugs: es prüft gegen **alle** Viertel, der Sportpark
wurde aber **vor** dem Freizeitpark gesetzt. Alle sieben bleiben per GPS erreichbar (`th-netz`
39 ok).

## 2026-08-28 · 💡 Sechs Lichter rechneten den ganzen Tag mit, ohne zu leuchten

**Befund:** `updLampPool()` setzte tagsüber nur die **Intensität** auf 0 — `visible` blieb
`true`. three.js sammelt aber **alle sichtbaren** Lichter ein und schreibt sie in den Shader
jedes Materials. Sechs Punktlichter liefen damit in **jedem Pixel** mit, ohne etwas
beizutragen, den ganzen Spieltag über.

| Lichter im Shader (tagsüber) | vorher | nachher |
|---|---|---|
| | **8** | **2** (Himmel + Sonne) |

Die ganze Welt nutzt `MeshStandardMaterial` — jedes Licht kostet dort eine volle
PBR-Auswertung pro Pixel. Vier Mal weniger Beleuchtungsarbeit auf der ganzen Fläche.

**Bewusste Nebenwirkung:** Ändert sich die Zahl sichtbarer Lichter, baut three.js die Shader
neu. Das passiert jetzt **zweimal pro Spieltag** (Abend/Morgen) statt dauerhaft in jedem Bild.

**Gegenprobe:** Nacht erzwungen → 8 Laternen sichtbar mit Intensität, an den richtigen Orten;
Tag → 0 sichtbar. Ohne diese Prüfung wäre „Licht aus" von „Licht kaputt" nicht zu unterscheiden.

**⚠️ Messfalle:** Der erste Lauf nach dem Fix meldete weiterhin 6 wirkungslose Lichter — die
Messung lief, **bevor `updLampPool` das erste Mal getickt hatte**. Erst der erzwungene Tick
zeigt den Zustand.

**Gemessen, NICHT geändert (mit Begründung):**
- **Schatten sind auf dem Handy aus** (`renderer.shadowMap.enabled = false`) — die 6 126
  `castShadow`-Marken kosten dort **nichts**. Kein Hebel.
- **55 349 Materialien bei nur 2 153 verschiedenen Signaturen** (53 271 wären teilbar). Das ist
  vor allem Speicher, kaum Bildzeit: pro Bild werden nur ~760 Materialien gezeichnet. Zusammen-
  legen ist riskant, weil `_envMats` (Nachtdämpfung) und `_glasMats` (Fensterlicht) Materialien
  gezielt einzeln verändern — eine geteilte Instanz würde dann viele Objekte auf einmal treffen.

## Die Seilbahn rechnete mit einem Berg, den es nicht gibt

`seilbahn()` hatte den Hausberg **nachgebaut** statt ihn zu fragen:

```js
var BX=121.5,BZ=174.9,BRAD=51.75,BHOCH=75,BFUSS=-6;
function bergH(x,z){ var d=Math.hypot(x-BX,z-BZ);
  if(d>=BRAD)return 0; return Math.max(0,BFUSS+BHOCH*(1-d/BRAD)); }
```

Das ist ein **runder** Kegel. Berg Nr. 5 ist keiner. `bergGeo` staucht den Grundriss
längs des Grats um `streck` und quer um 0,92:

```js
var streck=1.35+rnd(seed,4)*0.55;                    // Seed 16 -> 1,4835
var ul=(gcs*ux+gsn*uz)/streck, uq=(-gsn*ux+gcs*uz)*0.92;
```

und der Mesh wird danach noch um `berg.rotation.y = (5*0.7)%6.283 = 3,5 rad` gedreht.
Beides fehlte in der Nachbildung. Nachgerechnet mit demselben Seed:

| Ort | angenommen | echt | Differenz |
|---|---|---|---|
| Stütze t=0,78 (150,8\|127,0) | 0,00 m | 10,63 m | **10,6 m im Hang** |
| Stütze t=0,90 (138,9\|142,8) | 16,08 m | 30,48 m | **14,4 m im Hang** |
| Bergstation (129\|156) | 39,53 m | 46,72 m | **6,7 m im Fels** |

Die Nachbildung war **überall zu flach, nie zu hoch** — die Stauchung verkleinert
den effektiven Abstand zur Bergmitte, also ist der echte Berg an jeder Stelle höher
und breiter als der angenommene.

### Warum kein Werkzeug es gefunden hat

`th-3d` vergleicht Modell gegen Modell. Das Gelände ist ein einziges grosses Mesh
ohne Dateinamen und fällt aus der Prüfung. `th-3d` hat den Folgefehler trotzdem
gemeldet — die oberste Stütze steckte im Stationshaus (1,39 m tief, 72 Meshpaare,
stärkster Fund der ganzen Karte) — aber die Ursache stand ein Stockwerk tiefer.

### Die Regel

Es gibt jetzt **eine** Geländeprobe für die ganze Welt:

```js
window._bergHoehe(x,z)   // grosser Berg + alle 34 Kettenberge, echtes Höhenfeld
```

`bergGeo` hängt seine Höhenfunktion an die Geometrie (`g2.userData.hoehe`), der
Berg-Eintrag in `window._berge` trägt sie in Weltkoordinaten (inklusive
Rücktransformation von `rotation.y`). **Wer eine Geländehöhe braucht, fragt hier —
und leitet nichts nach.**

### Bahnsteighöhe ist kein Parameter, sondern ein Messwert

`BERGY` war fest 40. Auf einem 50-Grad-Hang liegen zwischen Berg- und Talkante einer
24 × 34 m grossen Terrasse über 40 Höhenmeter — jede feste Zahl ist an einer der
beiden Kanten falsch. Beim alten Standort (129|156) reichte das Gelände von 22,2 bis
65,5 m: bei y 40 steckte die Bergkante 25 m im Fels, bei y 66 wären die Stützen auf
49 m gewachsen.

Gelöst nicht mit einer neuen Höhe, sondern mit einem neuen Ort: 25 m talwärts auf
derselben Seilachse (144|136) liegt das Gelände unter der Terrasse bei −1,1 … 41,3 m.
`BERGY` wird jetzt aus einem 7 × 9-Raster der eigenen Grundfläche gemessen
(`BGELmax + 0,6` = 41,9), und der Felssockel ist nur noch so tief wie nötig
(`BERGY − BGELmin + 3`) statt immer bis y −1.

### Gemessen

`spiele-dev/tools/th-seilbahn.mjs` (neu) — Modell gegen **Gelände**, was `th-3d`
nicht kann:

| | vorher | nachher |
|---|---|---|
| Teile im Fels | 3 (6,7 / 10,6 / 14,4 m) | **0** |
| th-3d Station × Stütze | 1,39 m tief, 72 Meshpaare | **weg** |
| th-3d stärkster Fund | Station × Stütze | Ahorn × Birke, 1,17 m |
| th-netz | 39 ok | 39 ok |
| th-viertel | 7 Viertel | 7 Viertel |

## Ein Werkzeug, das die AUSDEHNUNG prüft, nicht die Position

`th-strassen` fragt `bandVon(o.position.x, o.position.z)` — den **Mittelpunkt**.
Ein 106 m langer Bordstein längs der Querstrasse hat seinen Mittelpunkt bei z = 0,
im freien Feld. Zusätzlich greift dort `gr > 60` (der Filter gegen Himmelskuppel und
zusammengefasste Häuserzeilen). Zwei unabhängige Gründe, warum genau die Bauteile
unsichtbar sind, die per Konstruktion lang und dünn sind: Bordsteine, Erdstreifen,
Gehwege, Randmarkierungen.

`spiele-dev/tools/th-belag.mjs` (neu) testet stattdessen die Bounding-Box gegen die
Fahrbahnrechtecke — aber nur für **lange, dünne, flache** Teile (Schmalseite ≤ 3 m,
Langseite ≥ 20 m, Oberkante ≤ 1 m) und nur **quer** zur jeweiligen Strasse. Längs ist
erlaubt: dort gehört das Zubehör hin.

Erster Lauf: **24 Treffer.**

* **16 × 3,05 m** — Bordstein (`BoxGeometry 0.26×106`) und Erdstreifen
  (`PlaneGeometry 0.7×106`) der beiden Querstrassen ragten an allen vier Kreuzungen
  über den Asphalt der Hauptstrasse. Der **Gehweg** daneben war längst korrigiert
  (`2*SZ9+14` = 106 → `2*(SZ9+12)-16` = 100, Ende ±53 → ±50, Fahrbahnkante ±49,95) —
  Bordstein und Erdstreifen sind bei der Änderung stehengeblieben. Ein halb
  durchgeführter Fix, sichtbar nur mit dem richtigen Messgerät.
* **4 × 2,05 m** — die Parkstreifen-Segmente `[[-58,26],[-18,26],[22,26],[62,26]]`
  sind gleichmässig verteilt, aber **nicht mittig**: die Mitte von −58 und 62 liegt
  bei +2. Das östliche Segment reichte bis x = 75 und lag in der Querstrasse Ost
  (Kante 72,95), während es im Westen 1,95 m zu früh aufhörte. Jetzt
  `[[-60,25.6],[-20,25.6],[20,25.6],[60,25.6]]`, und die Stellplatz-Striche teilen
  ihr Segment auf (`seg[1]/n`) statt in festen 5,2-m-Schritten darüber hinauszulaufen.
* **4 × 0,05 m** — exaktes Anstossen von Gehweg an Fahrbahnkante. Kein Fehler; die
  Schwelle des Werkzeugs steht darum auf 0,1 m.

Nach der Korrektur: **0 Treffer.** `th-netz` 39 ok, `th-strassen` unverändert
(es sieht flaches Zubehör ohnehin nicht — `MINH`).

## Zwei Strassenlaternen standen im See und in der Fahrgasse

```js
pts.push([68,87],[-4,78],[-33,86],[25,97],[0,146],[-24,74]);  // Plaetze, Parkplatz, Seepark
```

* `[0,146]` ist die **Mitte des Sees** — `machSee(0,146)`, Uferlinie `seeR(a)` = 9,1 … 16,9 m.
  Gemessen: der Mast stand **13,9 m vom Ufer entfernt im Wasser**.
* `[25,97]` ist die **Mitte des Parkplatzes** — `var PX=25,PZ=97,PW=36,PD=16` — und
  zwar in der 5,6 m breiten **Fahrgasse** zwischen den beiden Stellreihen.

Beide Punkte laufen durch `wegVonStrasse(x,z)`. Das hält Laternen aus der **Fahrbahn** —
und dabei ist es geblieben. Wasser, Stellplätze und Fahrgassen kennt diese Prüfung nicht,
und sonst prüft sie niemand: `th-strassen` kennt nur Bänder, `th-3d` nur Modell gegen
Modell. Ein See ist beides nicht.

Jetzt `[41.7,91.6]` (Ostende der Südreihe: Stellplätze reichen von x 9,6 bis 40,4 =
`R0 + N*RB`, der Belag bis 43 — dazwischen der Reststreifen) und `[7.5,128]` (Zufahrt
zum Seepark von der Süd-Ringstrasse, die sonst unbeleuchtet blieb; die Promenade hat
ihre eigenen fünf Laternen).

`spiele-dev/tools/th-laternen.mjs` (neu) prüft alle 174 Laternen gegen die Geometrie,
aus der See und Parkplatz wirklich entstehen. **2 → 0.**

## Zwei verschiedene Masse im selben Vergleich

`viertelPasst` prüfte den Kandidaten gegen die schon gesetzten Viertel so:

```js
var m=viertelMass(cfg);                       // NETTO — nur die Bauzeilen
…
if(Math.abs(x-v.x)<m.hw+v.w/2+8 && Math.abs(z-v.z)<m.hd+v.d/2+8)return false;
//                 ^^^^ netto      ^^^^^ brutto
```

Links das **Netto**-Rechteck des Kandidaten, rechts das **Brutto**-Rechteck des
Nachbarn. Überall sonst im Spiel gilt brutto — Streuwerk, Waldsaum und Wege halten
sich per `v.w/2` von einem Viertel fern (Zeilen 5655, 5745). Die Ungleichheit ging
in die **unsichere** Richtung: ein neues Viertel durfte mit seinem Aussenrand in die
angemeldete Fläche eines bestehenden hineinragen.

Live nachgemessen: Freizeitpark (60|340, brutto 330 × 110 → z 285…395) und
Sportpark Süd (−14|250, brutto 180 × 84 → z 208…292) teilten sich einen
**180 × 7 m grossen Streifen**. `th-viertel` meldete das als
»Sportpark Süd, Stufe 2: nein: Viertel Freizeitpark« — der Fund war echt, die
Ursache lag aber nicht beim Sportpark, sondern in dieser einen Zeile.

Jetzt brutto gegen brutto, auf beiden Seiten dasselbe Mass. Der Freizeitpark rückt
dadurch 20 m nach Süden (z 340 → 360), das Vergnügungsviertel von (250|220) nach
(234|251).

### Gemessen

| | vorher | nachher |
|---|---|---|
| Viertel unter Stufe 2 | 1 (Sportpark Süd) | **0 von 7** |
| th-strassen · Stellen auf dem Belag | 184 | **175** |
| th-3d · echte Durchdringungen | 58 | **56** |
| th-3d · nur 2D | 74 | **67** |
| th-netz | 39 ok, 0 Fehler | 39 ok, 0 Fehler |

## Die Uferlinie gab es dreimal — die Enten wateten an Land

Dieselbe Klasse wie die Seilbahn, nur am See. Die Uferlinie war an drei Stellen
abgeleitet:

1. `seeR(a) = 13 + sin(3a)*1.8 + cos(5a+1.3)*1.2 + sin(2a+0.7)*0.9` im Weltaufbau — die Wahrheit,
2. eine **Zeichen für Zeichen identische Kopie** `rad()` in `seePromenade`,
3. eine **Schätzung** im Enten-Code: `/* zum Ufer schwimmen — aber IM Wasser bleiben (See-Rand liegt bei ~11…16) */`.

Echt sind **9,1 … 16,9 m**. Die Schätzung war an den engen Stellen fast 2 m zu
grosszügig, und der Code hielt sich mit `Math.min(10.5, zl)` genau daran fest.

Gemessen, mit dem Fütterziel in der engsten Richtung des Sees (93,5°, Ufer dort
9,37 m):

| | vorher | nachher |
|---|---|---|
| Proben an Land | **4133 von 6000 (68,9 %)** | **0** |
| tiefste Landung | **1,71 m im Gras** | — |
| ohne Fütterung (freies Kreisen) | 32 von 3000 (1,1 %), bis 0,33 m | 0 |

Der äusserste Ring (`r = 4.5 + i*1.3` → 9,7) lag von Haus aus jenseits des engsten
Ufers; das Füttern machte es nur sichtbar.

Jetzt gibt es `window._seeUfer` — eine Uferlinie, drei Nutzer. Der Enten-Ring wird
auf `_ufer(a) − 1.0` gestaucht, das Fütterziel auf `_ufer(a) − 1.4` gekappt. Die
Herde schwimmt damit nicht mehr auf einem Kreis, sondern in der Form des Sees.

`spiele-dev/tools/th-see.mjs` (neu) hält den Fall fest.

## Der Bahnsteig lag auf dem Gleis

Drei Stellen im Code hatten drei verschiedene Vorstellungen davon, wo die
Bahnsteigkante liegt:

| Stelle | Kante bei |
|---|---|
| alte Betonplatte `stg` (34 × 5) | **z 113** |
| `th41_bahnsteigkante`, 7 Module | **z 111,4** |
| Kommentar am Ring-Sperrband | „Bahnsteig bis **111,8**" |

Das Gleis liegt auf z 112, die Schienen (gemessen) auf **110,62 … 110,78** und
**113,22 … 113,38**, die Schwellen auf 111,70 … 112,30.

Die alte Platte ist 0,42 m hoch, die Schienenoberkante liegt auf 0,27. Sie
verschluckte über ihre volle Länge von 34 m die **nördliche Schiene und sämtliche
Schwellen**. Die Modulplatte lag mit 0,62 m ebenfalls über der Schiene — und 0,2 m
unter dem Zugkasten (111,2 … 112,8), also genau der Fehler, den „Schwarm-7" schon
einmal halb behoben hatte. Dazu standen beide Signale (Anker 113,6 → Box
113,25 … 113,55) auf der südlichen Schiene und die vier Fahrleitungsmasten bei
z 110,9 **innerhalb der Spurweite**.

### Warum kein Werkzeug es sah

`th-3d` vergleicht Modell gegen Modell über `userData.datei`. Schienen und Schwellen
sind namenlose `BoxGeometry` — sie kommen in der Prüfung gar nicht vor. Dieselbe
Lücke wie beim Gelände (Seilbahn, #2370).

### Die Kante ist kein Parameter

`window._gleis = {z:112, spur:1.3, kante:112-1.7}` — 1,7 m von der Gleismitte ist
das Normmass und liegt 0,4 m vor der näheren Schiene. Alles am Bahnsteig rechnet
jetzt von dort: Platte `104,5 … kante`, Module `kante − 1,8`, Sicherheitslinie
`kante − 0,6`, Masten `kante − 0,35` (der Ausleger reicht von dort 2,6 m nach Süden
und endet auf 112,55, weiterhin über der Gleismitte).

### Gemessen — `spiele-dev/tools/th-gleis.mjs` (neu)

| | vorher | nachher |
|---|---|---|
| Bauteile über dem Gleiskörper | **274** | **2** |
| davon die 34-m-Platte | Schiene 0,16 + Schwellen 0,60 | weg |
| Signale auf der Südschiene | 2 × 0,13 m | weg |
| th-3d | 57 echt / 73 nur 2D | 56 echt / 76 nur 2D |
| th-netz | 39 ok | 39 ok |

Die verbleibenden 2 sind zwei Dachträger von `th17_bahnsteigdach`, die 0,14 m über
die Kante ragen — ein Vordach über der Bahnsteigkante ist bei echten Bahnhöfen so
gewollt; sie stehen 0,55 m hoch und berühren nichts.

## Sperrlinie UND Leitlinie auf derselben Strasse

Auf einer echten Strasse gibt es entweder eine **Sperrlinie** (doppelt, durchgezogen)
oder eine **Leitlinie** (gestrichelt) — nie beides an derselben Stelle. Die
Nordstrasse hatte beides:

| z | | |
|---|---|---|
| 57,70 | 3 durchgezogene Segmente | Sperrlinie |
| **58,00** | **16 Striche à 3 m** | Leitlinie |
| 58,30 | 3 durchgezogene Segmente | Sperrlinie |

Die Striche lagen also genau zwischen den beiden durchgezogenen Linien.

Derselbe Fehler war für die Südstrasse **schon einmal behoben** worden — der
Kommentar dort nennt sie aber irrtümlich „Nordstrasse":

```js
/* ⚠️ Hier lag eine gestrichelte Mittellinie auf z=-58 — genau unter der
   doppelten Sperrlinie der Nordstrasse (SZd=58). … Der Strich entfaellt. */
```

Ein falsch benanntes Ziel im Kommentar ist genug, damit die zweite Hälfte
stehenbleibt. Gemessen: Süd 2 durchgezogene / **0** Striche, Nord 2 durchgezogene /
**16** Striche.

Nebenbei baute die Schleife je Strich ein **eigenes Material** — 16 Stück für 16
identische Quadrate, alle in `_markMats`.

### Warum kein Werkzeug es sah

`th-strassen` filtert flache Markierungen über `MINH` weg (sonst meldete es jede
Haltelinie als Hindernis), `th-belag` nur lange Bänder **quer** zur Strasse. Eine
Doppelmarkierung **längs derselben** Strasse fällt durch beide Netze.
`spiele-dev/tools/th-linien.mjs` (neu) schliesst die Lücke.

Nachher: vier Zeilen (±57,70 und ±58,30) mit je 3 Segmenten — beide Strassen gleich.
`th-belag` 0 Treffer, `th-netz` 39 ok.

## GLTFLoader hat keinen Cache — 236 Aufrufe, 236 Parses

`bau()` rief für **jedes** Gebäude `GL.load("/models/…" , …)` auf. Der Browser
liefert die Datei aus seinem HTTP-Cache, aber **GLTFLoader parst sie jedes Mal neu**
und legt dabei neue Geometrien, neue Materialien und neue Texturen an. 27
Parklaternen sind 27 komplette Sätze statt einem.

Gemessen mit `spiele-dev/tools/th-masse.mjs` (neu) — Meshes und *verschiedene*
Materialien je Datei:

| Modell | Meshes | Materialien vorher | nachher |
|---|---|---|---|
| th33_parklaterne | 612 | **108** | **9** |
| th7_reihenhaus_modul | 840 | **84** | **7** |
| th33_blumenrabatte | 792 | **72** | **9** |
| th26_seilbahn_stuetze | 552 | **44** | **11** |
| th35_pflanzschale | 756 | **30** | **5** |
| th7_hochhaus_modul | 736 | **16** | **4** |
| th19_kletterhalle (steht einmal) | 840 | 21 | 21 |

Der Quotient ist der Test: ein Modell, das zehnmal in der Welt steht, darf nicht
zehnmal so viele Materialien haben wie eines, das einmal dasteht.

### Die Lösung

`window._glbHol(datei, cb)` — parst einmal, gibt jedem Aufrufer ein `clone(true)`.
`clone(true)` kopiert den Objektbaum, **teilt** aber Geometrie und Material. Das ist
hier richtig: niemand färbt ein geladenes Modell nachträglich ein. Die einzige
Stelle, die es tut (die Alleebäume), klont ihr Material vorher selbst, und die
Bau-Vorschau `ghost` ist immer eine frische Box.

Gleichzeitige Anfragen für dieselbe Datei stellen sich in `e.warte` an, statt einen
zweiten Parse zu starten.

**⚠️ Nicht für die Bewohner** (`GL.load` bei ~10200): die haben `g.animations`, und
`clone(true)` bricht die Bindung an einen `SkinnedMesh`.

### Gemessen

| | vorher | nachher |
|---|---|---|
| verschiedene Materialien | **9 300** | **7 258** |
| Geometrien (Rechner) | **16 498** | **12 768** |
| Geometrien (Handy) | 4 698 | 4 507 |
| Objekte / Meshes / Dreiecke | unverändert | unverändert |
| th-3d | 56 echt / 67 nur 2D | 56 echt / 67 nur 2D |
| th-netz | 39 ok | 39 ok |

**Die Bildrate hier ändert sich nicht** (Rechner 621 → 617 ms, Handy 417 → 417) —
und das ist zu erwarten: in diesem Container rendert SwiftShader in Software, 85 %
der Bildzeit sind der Rasterizer. Was der Cache spart, ist **Speicher und
Ruckler**: 3 730 Geometrien und 2 042 Materialien weniger heisst entsprechend
weniger Puffer-Uploads und Shader-Programmsuchen — genau das, was auf einem echten
Telefon beim ersten Blick in einen neuen Stadtteil hakt. Ein Bildratengewinn wird
hier **nicht** behauptet; er wäre mit diesem Messgerät gar nicht nachweisbar.

## 1664 Materialien für Autoscheiben, die nie jemand anfasst

Nach dem Parse-Cache blieben 7 258 Materialien, davon **5 184 exakte Zwillinge**.
Die grösste Gruppe: 1 664-mal `ccd1db / rauh 0,25 / metallisch 0,8 / keine Textur`.
`th-material.mjs` (neu) fand sie, `th-masse.mjs` ordnete sie keiner Modelldatei zu —
sie hingen an Gruppen ohne `userData.datei`, also am Verkehr.

Die Ursache stand im Verkehrsaufbau:

```js
var m=tpl.clone(true);
m.traverse(function(n){if(n.isMesh&&n.material){n.material=n.material.clone();
  if(i>=WAGEN.length && /lack/i.test(n.material.name||""))
    n.material.color.lerp(new THREE.Color(TINT[i%TINT.length]),0.42);}});
```

`clone(true)` **teilt** Materialien — das ist der Sinn. Die Zeile darunter klonte
dann aber **jedes** Material **jedes** Wagens, um am Ende nur die Lackteile
umzufärben, und auch die erst ab dem fünften Wagen. Verglasung, Chrom, Reifen und
Leuchten wurden pro Fahrzeug einzeln angelegt und nie angerührt.

Jetzt wird geklont, was auch bemalt wird. Gegengemessen, damit die Autos ihre Farben
behalten: **26 Wagen, 216 Lack-Meshes, 16 verschiedene Lackfarben — vorher wie
nachher identisch.**

### Zwei weitere Warteschlangen gefunden

`ladeWagen` und `loadTH` hatten zwar einen Cache (`MODELS[…]`), aber **keine
Warteschlange**: wer im selben Takt zwölf Limousinen anfordert, startet zwölf
`GL.load`, weil `MODELS` erst beim **ersten** Rückruf gefüllt ist. Beide laufen
jetzt über `window._glbVorlage` (Cache + Warteschlange, ohne Klon — die Aufrufer
klonen selbst).

Dazu legt `_matVereinheitlichen` gleich eingestellte Modell-Materialien über
Dateigrenzen hinweg zusammen. **⚠️ Der Material-*Name* gehört in den Schlüssel** —
der Verkehr sucht sein Lackmaterial über `/lack/i.test(m.name)`; ein gleich
eingestelltes Material aus einer anderen Datei hätte die Autos still entfärbt.

### Gemessen

| | vor #2377 | nach #2377 | jetzt |
|---|---|---|---|
| Material-Objekte | 9 300 | 7 258 | **3 616** |
| davon Zwillinge | — | 5 184 | **1 553** |
| Geometrien (Rechner) | 16 498 | 12 768 | **8 890** |
| reines Rendern (Rechner) | — | 92,4 ms (88,8 … 103,1) | **77,6 ms (76,8 … 85)** |
| Bildzeit (Rechner) | 621 ms | 617 ms | **592 ms** |
| th-3d | | 56 echt / 67 nur 2D | 56 echt / **65** nur 2D |
| th-netz | | 39 ok | 39 ok |

Diesmal **ist** die Renderzeit messbar gefallen, und die Streubereiche überlappen
sich nicht (76,8 … 85 gegen 88,8 … 103,1). Die restlichen 87 % Bildzeit bleiben der
Software-Rasterizer dieses Containers; über die Bildrate auf einem echten Telefon
sagt auch diese Messung nichts.

Die grösste verbleibende Zwillingsgruppe sind 390 Fensterscheiben `a8c8dc`. Die
**dürfen** nicht zusammengelegt werden: `dorfFenster` sammelt nur einen Teil von
ihnen ein, damit nachts nicht jedes Fenster der Stadt gleichzeitig leuchtet.

## 2026-08-28 · 👁️ 48 653 Sichtprüfungen pro Bild, um 841 Dinge zu zeichnen

**Befund:** 769 geladene Gebäude enthalten **41 348 Meshes — 85 % der ganzen Szene**.
three.js cullt **Gruppen nicht**, prüft also jedes Mesh einzeln gegen das Sichtfeld. Ein
Theater mit 970 Meshes steht 250 m weit weg und wurde Mesh für Mesh geprüft.

**Fix `gruppenSicht()`:** EINE Kugel je Gebäude, einmal berechnet (die Bauten sind eingefroren
und bewegen sich nie). Liegt sie ausserhalb des Sichtfelds → Gruppe unsichtbar, three.js
betritt den Teilbaum gar nicht erst.

| pro Bild | vorher | nachher |
|---|---|---|
| durchlaufene Knoten | 51 936 | **12 941** |
| Mesh-Sichtprüfungen | 48 653 | **11 278** |
| verborgen hinter unsichtbaren Gruppen | 580 | **45 858** |

**⚠️ Nur wenn Schatten AUS sind** (Handy). Mit Schatten kann ein Haus ausserhalb des Bildes
seinen Schatten **ins** Bild werfen — dann darf es nicht verschwinden.

**⚠️ NUR AUSBLENDEN, NIE EINBLENDEN — der Fehler, der fast durchging.** Der erste Anlauf setzte
`visible` schlicht auf das Prüfergebnis und schaltete damit **acht saisonal versteckte Bauten
wieder an**: Christbaum, drei Weihnachtsbuden, Eisbahn, Schneemänner, Rodelhang, Skiliftmast.
**Im Sommer stand ein Skilift auf der Wiese.** Im Diff unsichtbar — nur der Bildvergleich gegen
`origin/main` hat es gezeigt. Jetzt merkt sich die Prüfung mit `_gsAus`, was **sie selbst**
versteckt hat, und rührt fremde Entscheidungen nicht an.

**Werkzeug:** `spiele-dev/tools/th-sicht.mjs` (5 Checks, darunter „saisonale Bauten bleiben
versteckt" und „fremde Verstecke unangetastet" — genau die Regression von oben).

## 2026-08-28 · 📏 Wo die Bildzeit WIRKLICH hingeht — zwei Vermutungen widerlegt

Nach den drei Fixes (tiefes Einfrieren, Lichter, Gruppen-Sichtprüfung) gemessen, statt weiter
zu raten. `th-leistung.mjs` kann das jetzt selbst:

**CPU je Bild (Mittel aus 60 Läufen):**

| | ms |
|---|---|
| `renderer.render` | **19,4** |
| `updMinimap` | 0,072 |
| `updVerkehr` | 0,063 |
| `updFussg` | 0,045 |
| `lodTakt` | 0,040 |
| **`gruppenSicht` (neu)** | **0,025** |
| updEnten / updLampPool / updSims / updFahrgeschaefte | ≤ 0,007 |

**Alle Aktualisierungen zusammen: ~0,25 ms.** Die Bildzeit steckt vollständig im Rendern.
Weitere Arbeit an den `upd*`-Funktionen ist verschwendet. (Die 19,4 ms sind Software-Rendering
dieses Containers — auf dem Handy ist das GPU-Arbeit, die Zahl ist **nicht** übertragbar.)

**Zwei Vermutungen geprüft und WIDERLEGT — nicht nochmal verfolgen:**
1. **Der 6-Sekunden-Speicherlauf** (`saveGame`, `JSON.stringify` + `localStorage`) sah nach
   einem klassischen Aussetzer aus. Gemessen: **1 KB, 0,1 ms**. Kein Verursacher.
   (Gemessen an einem frischen Spielstand — bei viel gebautem Inventar erneut prüfen.)
2. **Die Aktualisierungsfunktionen** als Ruckel-Quelle: siehe Tabelle, zusammen 0,25 ms.

**Was bleibt (riskanter, nicht angefasst):** 526 gezeichnete Meshes, davon 293 direkte
Szenenkinder (Strassen, Markierungen, Plätze als Einzelmeshes) und 333 000 Dreiecke.
Zusammenlegen würde Zeichenaufrufe sparen, aber die Markierungen haben sorgfältig gestaffelte
Höhen gegen Z-Fighting — ein Merge riskiert genau das.

## th-3d war blind für alles Instanzierte

`bauViele()` setzt wiederholte Modelle als `InstancedMesh` und trägt sie
**ausdrücklich nicht** in `window._gebaeude` ein — der Kommentar dort sagt es seit
jeher: *„Instanzen stehen NICHT in `_gebaeude`, sind für th-pruef also unsichtbar."*
`th-3d` liest ausschliesslich `_gebaeude`. Alles Instanzierte fiel also aus der
Durchdringungsprüfung, und `Box3.setFromObject` hätte ohnehin die Hülle der ganzen
Gruppe geliefert statt der einzelnen Instanz.

Gemessen, `node th-3d.mjs parkzaun weidezaun`:

| | vorher | nachher |
|---|---|---|
| th33_parkzaun_modul | **0 Objekte** | **52** |
| th38_weidezaun | **0 Objekte** | **32** |
| th25_landebahn_modul | 0 | 8 |

### Der erste Versuch war falsch — und die Zahl hat es verraten

Nach Datei gruppiert meldete das Werkzeug Zaunmodule mit **213 m Grundriss** und
5 304 statt 120 2D-Funden. Ursache: `bauViele` wird für dieselbe Datei **mehrfach**
aufgerufen — der Parkzaun steht als zwei getrennte Linien (34 + 18 Module), jede mit
eigener Stellenliste. Index 3 der einen Linie und Index 3 der anderen sind völlig
verschiedene Orte; das Zusammenfassen ihrer Teilmeshes ergibt ein Objekt, das quer
über den halben Park reicht.

Darum trägt jede `bauViele`-Ladung jetzt `im.userData.satz` — eine laufende Nummer
je Aufruf. Erst damit lässt sich Instanz *i* aus den Teilmeshes **eines** Satzes
wieder zusammensetzen. Danach: 120 2D-Funde, keine Phantom-Grundrisse.

Zweite Falle am selben Ort: **`scene` ist nicht global.** Das Spiel steckt in einer
IIFE, und `th-3d` injiziert keine Sonde. Der Szenenwurzel kommt man über ein Objekt
bei, das das Spiel selbst veröffentlicht — `_gebaeude[0].parent…`.

### Ergebnis

**Der blinde Fleck war echt und ist leer:** keine einzige der 92 instanzierten
Einheiten durchdringt etwas. Zäune und Landebahnmodule stehen sauber. Das ist ein
Messergebnis, kein Ausbleiben von Arbeit — vorher hätte das Werkzeug ein Problem
dort gar nicht melden können.

`th-3d` gesamt: 59 echt / 75 nur 2D (über Läufe 55…59 — das Streuwerk ist zufällig).
`th-netz` 39 ok, 0 Fehler.

## th-boden: jedes Bauwerk gegen das Gelände — und ein selbstverschuldeter Fund

`th-3d` vergleicht Modell gegen Modell. Das **Gelände** ist keines: ein namenloses
Grossmesh ohne `userData.datei`, das aus jeder Paarprüfung fällt. Genau dort steckte
die Seilbahn (#2370). `spiele-dev/tools/th-boden.mjs` (neu) prüft alle 769 Bauwerke
gegen `window._bergHoehe` und `window._seeUfer` — die beiden Einzelquellen, die in
#2370 und #2374 entstanden sind.

### Das Werkzeug musste erst ehrlich werden

Erster Lauf: 18 im Fels, **49 schweben**, 1 im Wasser. Drei der drei Kategorien waren
teilweise Unsinn:

* Das eine „im Wasser" war ein **Schwan**. Der gehört dorthin.
* Von 49 „schwebend" sassen 44 auf etwas **Gebautem** — Gipfelkreuz auf der
  Bergstationsterrasse, vier Gondeln am Seil, die Obergeschosse eines gestapelten
  Hochhauses.

Also drei Ausnahmen: Wasservögel und Boote dürfen ins Wasser, was an einem Seil
hängt oder über einem anderen `_gebaeude`-Kasten sitzt, steht nicht in der Luft.
Danach: **18 im Fels, 5 schwebend, 0 im Wasser** — und 46 sauber als erklärt gezählt,
nicht stillschweigend weggefiltert.

### Der Fund: der Hausberg steht auf dem Sportplatz

Alle 18 stehen auf `y = 0`, während `_bergHoehe` an ihrer Stelle 3 … 39 m meldet:

| | Gelände darüber | |
|---|---|---|
| th39_vorfahrt (101,8\|161,8) | **38,9 m** | |
| th39_vorfahrt (89,2\|169) | 31,0 m | |
| th44_flutlichtmast (78,9\|172,9) | **23,0 m** | Sportplatz |
| th44_ballfangzaun ×4 (79\|151…163) | 8,6 … 17,2 m | Sportplatz |
| th44_tor (76,4\|155) | 11,1 m | Sportplatz |
| th44_tribuene (60\|173,2) | 8,9 m | Sportplatz |
| th14_neonschild / samtkordel ×5 | 7,9 … 12,2 m | Vergnügungsviertel |
| th40_bus (86,1\|143,8) | 15,6 m | auf seiner Route |

**Das ist eine Folge von #2370.** Dort habe ich Berg Nr. 5 von der Sperrliste
ausgenommen (`if(i!==5)for(var qs=0;…)`), damit die Bergstation der Seilbahn wieder
Boden unter sich bekommt — und geprüft, dass die Seilbahn stimmt. Was der
wiederhergestellte Berg nun *überdeckt*, habe ich nicht geprüft; kein Werkzeug konnte
es. Die Sperrzone `[0,216,110,60]` hatte genau diesen Zweck.

Der Berg steht bei (121,5\|175) mit Fussradius 51,75, längs des Grats auf
`streck` = 1,4835 gedehnt — sein Fuss ist also eine Ellipse von rund 154 × 113 m und
reicht damit über den Ostteil des Sportfelds (`SPORTFELD = {x:53, z:155, w:70, d:56}`,
also x 18 … 88).

Ein reiner Kegel würde es nicht retten: (101,8\|161,8) liegt nur 23,7 m von der
Bergmitte, dort stünden immer noch 34,6 m Fels. Der Berg steht nicht zu breit,
sondern **am falschen Ort**.

## Der Sonderberg ist weg — die Bahn fährt auf einen, den es ohnehin gibt

Behebung des Funds aus der vorigen Runde. Berg Nr. 5 war ein **Sonderberg**: feste
Werte (`r = 213`, Höhe 75, Fussradius 51,75, eigenes Flag an `bergGeo`) und eine
Ausnahme von der Sperrliste — alles nur, damit die Seilbahn irgendeinen Berg hat.

Zwei Wege wurden gemessen, nicht geraten:

**1. Berg verschieben?** Ein Raster über r 200 … 330 und alle 5° ergab 95 freie
Stellen — aber **keine in der Nähe**. Die nächste liegt bei r = 230, also 17 m weiter
draussen und um 45° gedreht; dort steht dann die Talstation im Berg. Der Sonderberg
hätte die halbe Seilbahn mitgenommen.

**2. Einen vorhandenen Berg nehmen?** Von den 34 Kandidaten der Bergkette entstehen
tatsächlich nur **neun** (Sperrliste + Meer). Für jeden Punkt entlang der Linie
Talstation → Bergmitte wurde mit dem **echten** Höhenfeld (`window._berge[i].hoehe`)
geprüft, welches Gelände unter der Terrasse liegt und ob dort ein Bauwerk steht.

Ergebnis: Berg **(378,7|119,1)**, Gipfel **108 m**. Auf 133 m Fahrstrecke von der
Talstation liegt eine freie Terrasse; **die Talstation kann exakt stehen bleiben**,
ihre eigene Platzsuche bleibt damit gültig. Der Sonderberg entfällt ersatzlos, Berg 5
wird ein ganz normaler Kettenberg und läuft wie jeder andere in die Sperrliste.

### Zwei Messfehler unterwegs, beide vom Werkzeug gefunden

* Erste Wahl war 139 m Fahrstrecke → Bahnsteig auf 58,2 m und ein **67 m hoher**
  Felssockel. Sechs Meter talwärts: 43,3 m Bahnsteig, 52 m Sockel, 65 m Berg über der
  Station. Gleiche Fahrt, halber Klotz.
* `BERGY` wurde über ein Raster der 24 × 34 m grossen **Platte** gemessen. Das
  Stationshaus steht aber **schräg** zur Weltachse; seine achsenparallele Hüllbox
  greift weiter den Hang hinauf. `th-boden` meldete die Station daraufhin mit 5,13 m
  im Fels, obwohl die Platte frei lag. Das Raster deckt jetzt die Hüllbox ab
  (±17/±22).

### Gemessen

| | vorher | nachher |
|---|---|---|
| th-boden · im Fels | **18** | **0** |
| th-boden · im Wasser | 0 | 0 |
| th-strassen · Stellen auf dem Belag | 175 | **147** |
| th-3d | 59 echt / 75 nur 2D | **56 echt / 66 nur 2D** |
| th-viertel | 7 Viertel, alle Stufe 2 | 7 Viertel, alle Stufe 2 |
| th-netz | 39 ok | **38 ok**, 0 Fehler |
| Bahnsteig | 41,9 m auf 69-m-Berg | 43,3 m auf **108**-m-Berg |
| Stützen | 15,5 … 39,8 m | 15,8 … 40,9 m, alle auf ebenem Grund |

**Die 38 statt 39 Netz-Prüfungen sind kein Verlust.** Ohne den Berg im Weg findet der
Sportpark seinen Wunschplatz (0|246 statt −14|250, 10 m statt 20 m Ausweichweg) und
braucht dort nur **einen** Anschluss statt zwei. Es gibt eine Sache weniger zu prüfen,
nicht eine Prüfung weniger, die besteht. Dasselbe erklärt die 28 Stellen weniger auf
dem Belag.

## th-boden vollständig: drei Wasserflächen, tragende Bauteile, Aufgesetztes

Die erste Fassung prüfte **eine** Wasserfläche über `_seeUfer`. `window._wasser`
führt aber drei:

| | Ausdehnung | |
|---|---|---|
| Meer | x −332 … −132, z ±170 | 68 000 m² |
| Fluss | x −120 … 80, z −94 … −87 | 1 400 m² |
| Seepark-See | x ±13,7, z 133 … 161 | 759 m² |

Meer und Fluss waren blinde Flecken. Beide sind sauber — aber das weiss man erst,
seit es geprüft wird. Brücken, Stege, Boote und Pontons dürfen über Wasser sein.

### Zwei Regeln, damit die Ausgabe bei heiler Welt leer ist

Ein Werkzeug, dessen Normalzustand „6 Meldungen, alle erklärbar" ist, taugt nicht als
Wächter — beim siebten schaut niemand hin. Also zwei fehlende Fälle nachgetragen:

* **Tragende Bauteile sind nicht immer geladene Modelle.** Der Felssockel und die
  Platte der Bergstation sind prozedurale Meshes und stehen nicht in `_gebaeude`;
  Berghütte, Gipfelkreuz und die beiden Felsen darauf galten deshalb als schwebend.
  Beide tragen jetzt `userData.traegt = 1`, und das Werkzeug sammelt sie mit ein.
* **Aufgesetztes.** Die Windmühlenflügel sitzen auf halber Turmhöhe — der Träger ragt
  also *höher* als die Unterkante des Teils und fällt durch die „steht darauf"-Regel.
  Neue Bedingung: umschliesst einer der beiden den anderen im Grundriss, sitzt er auf
  ihm. Das deckt Rotoren auf Masten und Schilder an Wänden ab.

**Stand: 0 im Fels, 0 schwebend, 0 im Wasser — bei 54 benannten Ausnahmen.** Die
Ausnahmen werden gezählt und angezeigt, nicht stillschweigend weggefiltert; sinkt die
Zahl unerwartet, ist auch das ein Signal.

## Fähr- und Frachtkai — aus dem, was ungenutzt im Repo lag

`models/` enthält 896 `.glb`. Für Traumhaus sind 530 davon `th*`; **235 kommen in
`traumhaus.html` nicht vor**. Davon abziehen: die 77 `th_*` des Möbelkatalogs (die
lädt `loadTH(id)` über einen zur Laufzeit gebauten Namen, ein Textfund findet sie
nicht) und die 14 `th31_*` — Waffenrequisiten, die auf Wunsch ungenutzt bleiben.
Bleiben **144 wirklich unbenutzte Modelle.**

Der grösste zusammenhängende Satz darunter ist `th15_*`, ein Hafen. **Die Küste hat
aber schon einen** (`th45_*`: Kaimauer, Hafenkran, Container, Leuchtturm,
Fischerboot, Segelboot). Ein zweiter wäre eine Verdopplung. Genommen wurden darum nur
die fünf Stücke, die es im th45-Satz **nicht** gibt: Anleger, Frachtschiff,
Bootshaus, Fischerhütte, Steg — plus vier Kaimauer-Module, die den Kai nach Norden
verlängern.

Ort aus der Messung: entlang x −145 … −118 ist der Küstenstreifen von z −73 bis −8
und wieder **ab z 61** frei; der th45-Hafen endet bei z 48, sein Leuchtturm steht auf
z 58. Der neue Kai läuft von z 61 bis 121.

### Drei Korrekturen, alle von den Werkzeugen gefunden

* **Bootshaus** auf x −125 endete bei −118,8 und lag damit **0,4 m im Sperrband der
  West-Ringstrasse** (Mitte −112, halbe Sperrbreite 7,2, also ab −119,2). → x −127,5.
* **Frachtschiff** quer zum Kai (`rotY = π/2`) ist 32 m lang in x, reichte von −173
  bis −141 und steckte **0,90 m im Anleger** (th-3d: 190 Meshpaare). Sein Westende
  lag ausserdem bei x −170 / z 102 im Ring der **Landstrasse** (r 200 ± 4,5) — dort
  im Meer-Sektor zwar unbefestigt, aber th-strassen meldet den Streifen zu Recht.
  → längs vertäut (`rotY = 0`) bei (−153|92): Box x −158,6 … −147,7, z 75,9 … 108.
  Grösster Radius `hypot(158,6; 108)` = 191,9 — 3,6 m vor dem Ring, 0,1 m Luft zum
  Anleger.
* **`th-boden`** kannte „schiff" nicht und hätte den Frachter als Fehler im Wasser
  gemeldet. Regex ergänzt.

### Gemessen

| | vorher | nachher |
|---|---|---|
| Bauwerke | 769 | **778** |
| th-boden | 0 / 0 / 0 | 0 / 0 / 0 |
| th-strassen · Stellen auf dem Belag | 147 | **147** |
| th-3d | 56 echt / 66 nur 2D | 58 echt / 67 nur 2D |
| th-netz | 38 ok | 38 ok, 0 Fehler |

Die zwei zusätzlichen th-3d-Funde sind Kaimauer-Module, die sich planmässig die
Kante teilen — dieselbe Sorte wie beim vorhandenen Hafen.

## Eine Baustelle — und zweimal am Mass gescheitert

Elf `th21_*` lagen unbenutzt im Repo, und nichts Vergleichbares gab es: eine Stadt,
die ständig wächst, hatte keine einzige Baustelle.

### `bau()` skaliert über die HÖHE — das ist die Falle

`th21_rohbau` ist kein Häuschen. Auf 9 m Höhe misst er **33,8 × 33,8 m** im Grundriss.
Der erste Versuch stellte ihn auf einen 24 × 18 m grossen Platz bei (150|50) — gemessen
lagen **alle elf Teile innerhalb seiner Box**: Zaun, Bagger, Container, alles.

Ort dann aus der Messung, ein Raster über x −160 … 200 / z −200 … 200 gegen
`_freiPlatz`, `_aufViertelWeg`, alle Gebäudekästen und `WORLD_SOLIDS`:

| Grundfläche | freie Plätze | nächster |
|---|---|---|
| 24 × 18 m | 54 | (−40\|140) am Kurpark, 146 m |
| 24 × 24 m | 45 | (120\|−110), 163 m |
| **32 × 32 m** | **21** | **234 m draussen** |

**Die Innenstadt ist voll.** Genommen wurde (180|150) aus der 32er-Liste: Ostflanke
zwischen Stadt und Vergnügungsviertel, also dort, wo die Stadt wächst.

### Zweiter Fehlschlag: der Hof war schmaler als die Maschinen

Rohbau auf 6,5 m ergab 24,4 × 24,4 und liess zwischen Zaunlinie und Südfassade nur
7,3 m — Bagger und Radlader standen **auf** dem Zaun, der Baucontainer ragte 0,8 m
darüber hinaus. Auf 6,0 m (22,5 × 22,5) mit Mitte auf BZ + 4,5 bleiben 8,75 m Hof; der
Container steht quer (längs ist er 8,6 m tief, der Hof 8,35 m).

### Und wann man aufhört

Zwei Restkontakte von 0,04 m (Mischer am Zaun) und 0,04 m (Container am Zaun) wollte
ich noch wegschieben. Auf der neuen Position berührte der Mischer den Radlader mit
0,13 m und das Gerüst mit 0,07 m — **schlechter als vorher**. Zurückgestellt. Auf
einem Bauhof stehen Maschinen an der Absperrung, und unter 0,2 m ist das Kontakt,
keine Durchdringung.

### Gemessen

| | vorher | nachher |
|---|---|---|
| Bauwerke | 778 | **804** |
| th-boden | 0 / 0 / 0 | **0 / 0 / 0** |
| th-strassen · Stellen auf dem Belag | 147 | 148 |
| th-3d | 58 echt / 67 nur 2D | 58 echt / 66 nur 2D |
| th-netz | 38 ok | 38 ok, 0 Fehler |

Die verbleibenden th21-Funde in th-3d: Materialstapel an der Rohbauwand (0,15 m) und
Mischer am Zaun (0,04 m). Kein th21-Teil auf einer Strasse.

## Zwei Wächter auf demselben Feld — und beide erzeugten den Ruckler, den sie verhindern sollten

`updLampPool` (4×/s) und der `LAMP_MAX`-Deckel in `loop()` (2×/s) schrieben **beide**
`light.visible`:

* Der Pool wählte die 8 nächsten Strassenlaternen und setzte sie sichtbar, den Rest unsichtbar.
* Der Deckel sortierte **alle** 15 Punktlichter der Szene nach Entfernung und liess die 6 nächsten sichtbar.

Beide Kommentare warnen ausdrücklich davor, die *Anzahl* schwanken zu lassen — three.js
übersetzt seine Shader neu, sobald sich die Zahl der Lichter je Art ändert. Genau das
haben sie einander angetan.

### Gemessen, Nacht erzwungen, 25 s (`spiele-dev/tools/th-licht.mjs`, neu)

| | vorher | nachher |
|---|---|---|
| sichtbare Lichter | wandert zwischen **0, 6, 8, 9** | konstant **6** |
| Proben mit 9 (50 % über dem Deckel) | 16 von 32 | — |
| Proben mit 0 (Stadt komplett dunkel) | 5 von 32 | — |
| **Zahlwechsel = Shader-Neuübersetzungen** | **5** | **0** |
| Bilder in 25 s | 32 | 50 |

Der Deckel hat sein Versprechen also nie gehalten: nachts brannten meist **9** statt 6,
und fünfmal in 25 Sekunden baute three.js seine Shader neu.

### Die Regel: ein Besitzer je Feld

* Der **Pool** sagt nur noch, **wo** seine Lampen stehen und **wie hell** sie wollen.
  `intensity = 0` heisst „will nicht leuchten".
* Der **Deckel** entscheidet allein, **welche** brennen — und nimmt als Kandidaten nur
  Lichter mit `intensity > 0`. Ein Licht ohne Helligkeit trägt nichts bei und darf
  keinen der sechs Plätze belegen.

Damit ist die Zahl von selbst stabil: `min(LAMP_MAX, Anzahl leuchtwilliger Lichter)`, und
tagsüber wie nachts sind das sechs. Die zehn Einzelwechsel, die übrig bleiben, sind
Lampen, die beim Kameraschwenk die Plätze tauschen — für den Shader kostenlos.

Dieselbe Klasse wie die Uferlinie und der Hausberg: **zwei Stellen schreiben dasselbe,
ohne voneinander zu wissen.**

## Die Sichtbarkeitsgrenze blinkte — es fehlte die Hysterese

Nach dem Licht-Fund die gleiche Frage an das andere Sichtbarkeitssystem. `lodTakt()`
blendet Kleinteile ab 78 m aus (nahe Stufe 34 m), mit **einer** Schwelle:

```js
var sicht = (dx*dx + dz*dz) < (e.nah ? SEHRNAH : NAH);
```

Alles, was genau auf der Kante steht, schaltet damit bei **jeder** Überschreitung um —
und wer an einer Hauswand entlanggeht, überschreitet sie ständig.

Gemessen mit `spiele-dev/tools/th-lod.mjs` (neu), Figur zwanzigmal einen Meter hin und
her:

| | vorher | nachher |
|---|---|---|
| Objekte, die mehr als zweimal umschalten | **9** | **0** |
| ihre Wechsel | je **39–40** | — |
| Sichtbarkeitswechsel gesamt | 944 | 595 |

Die neun standen alle 77,8 … 78,8 m weit weg, also direkt auf der Kante.

Die Gruppenprüfung nebenan (`gruppenSicht`) hat für genau dieses Problem längst eine
Reserve von 2 m am Kugelradius, ausdrücklich „kleine Reserve gegen Flackern" — bei
`lodTakt` fehlte sie ganz. Jetzt: **einblenden ab 78 m, ausblenden erst ab 82 m**
(nah 34 / 37), dieselbe Reserve auch für die Instanzgruppen.

### Zwei Werkzeuge, nicht eines

* `th-flimmern.mjs` prüft bei **stillstehender** Kamera, ob überhaupt etwas umschaltet —
  dort hat kein entfernungsabhängiger Regler einen Grund dazu, jeder Wechsel ist ein
  Zwei-Schreiber-Konflikt. Ergebnis: sauber, und die Punktlichter bleiben konstant bei 6
  (der Fix von #2387 hält).
* `th-lod.mjs` ruft `lodTakt()` direkt mit synthetischen Positionen auf und prüft die
  **Kante**. Beides zusammen deckt die zwei Fehlerarten ab: „jemand schreibt dagegen"
  und „die Schwelle hat keine Reserve".

⚠️ Die Grösse des LOD-Index schwankt zwischen Läufen (5400 … 5700), weil das Streuwerk
zufällig gesetzt wird. Verglichen wird die Zahl der **flackernden**, nicht die des Index.

### Und ein Nicht-Fund, der Zeit wert war

`gruppenSicht` (#2379, Nachbar-Sitzung) schreibt ebenfalls `visible`, auf den
Gebäudegruppen. Das Repo hat mit vorberechneten Hüllkugeln an **bewegten** Objekten
schon zweimal Schiffbruch erlitten (unsichtbarer Landbus, verschwindende Tiere). Der
Code macht es richtig: Objekte mit `nieAusblenden` bekommen gar keine Kugel, und er
stellt nur wieder her, was er selbst versteckt hat (`_gsAus`). Kein Defekt.

## Bewegt sich alles, was sich bewegen soll? — und eine Korrektur

`_spaetEinfrieren()` setzt `matrixAutoUpdate = false` auf allem, was nicht vorher als
bewegt angemeldet wurde. Wer eine Animation einbaut und die Anmeldung vergisst, bekommt
kein Fehlerbild — das Ding steht einfach still. So ist der Freizeitpark schon einmal
erstarrt (Charge #2303); der Kommentar dort verlangt ausdrücklich, **nach jeder neuen
Animation gegenzumessen**. Diese Sitzung hat ein Frachtschiff hinzugefügt, also war das
fällig.

`spiele-dev/tools/th-bewegt.mjs` (neu) liest die Animationslisten (`verkehr`, `_boote`,
`_tiere`, `FAHRTEN`, Baukran, Hafenkran, Leuchtturm, Brücken-Zug) und vergleicht
Position und Drehung über 30 s. **37 angemeldete Bewegliche, alle bewegen sich.**

### Das Werkzeug musste erst ehrlich werden — zum zweiten Mal in dieser Sitzung

Erster Lauf: „Hafenkran und Leuchtturm bewegen sich nicht." Beides falsch. Die
**Laufkatze** des Krans und der **Lichtkegel** des Leuchtturms sind eigene Objekte, die
`updHafen()` beim ersten Takt anlegt und unter `userData.katze` / `userData.strahl`
ablegt — beide korrekt mit `_bewegt` angemeldet. Der Turm selbst steht völlig richtig
still. Wer nur den Wrapper misst, meldet gesunde Technik als Defekt.

Jetzt zählt je Eintrag die grösste Bewegung über das Objekt **und alles, was als
`Object3D` an seinem `userData` hängt`. Ausserdem fehlte `_baukran` ganz in der Liste.

### Die Korrektur: es gab schon eine Baustelle

Beim Nachsehen, wofür `window._baukran` steht, kam heraus: `baustelleAusbau()` baut seit
Langem eine Baustelle bei **(−36|102)** — `th46_rohbau`, `th46_baukran`,
Fassadengerüst. Die Behauptung in der vorigen Runde, es gebe „nichts Vergleichbares in
der Welt — keine einzige Baustelle", war **falsch**.

Der Denkfehler ist die Signatur dieser ganzen Sitzung, diesmal von mir selbst: aus
**„diese Modelle sind unbenutzt"** wurde **„die Sache fehlt"**. Die th46-Modelle sind
sehr wohl benutzt — ich hatte nur nach th21 gesucht.

Die zweite Baustelle bleibt: 221 m von der ersten entfernt, im anderen Stadtteil, mit
anderen Modellen. Eine wachsende Stadt baut an mehreren Stellen. Aber sie ist eine
**Ergänzung, keine Erstausstattung**, und der Kommentar im Code sagt das jetzt.

**Regel für die nächste Materialsuche:** „Modell X ist unbenutzt" beantwortet nur, ob
*dieses Modell* fehlt. Ob die *Sache* fehlt, beantwortet allein eine Suche nach der
Sache — hier hätte ein Blick in `window._baukran` oder ein `grep -i baustelle` genügt.

## 2026-08-28 · 🔦 Deckkraft 0 heisst nicht „wird nicht gezeichnet"

**Dieselbe Fehlerklasse wie bei den Punktlichtern (#2368), nur eine Ebene tiefer:** Die 17
Laternen-Lichtkegel bekommen tagsüber `opacity = 0` — und wurden trotzdem **additiv gemischt**,
voller Blend-Aufwand für ein unsichtbares Ergebnis. `material.visible = false` nimmt sie ganz
aus der Renderliste.

| transparente Zeichnungen (tagsüber) | vorher | nachher |
|---|---|---|
| | 9 | **6** |

**Ehrlich zur Grösse:** das sind drei kleine Flächen — ein sauberer, aber kleiner Gewinn. Der
Wert liegt im Muster: **überall, wo etwas per Deckkraft oder Intensität „ausgeschaltet" wird,
lohnt die Frage, ob es auch wirklich aus der Renderliste fliegt.**

**Gegenprobe:** nachts werden die Kegel wieder gezeichnet (3 von 17 im Bild, der Rest liegt
ausserhalb — korrekt).

**Ebenfalls gemessen, NICHT geändert:** fünf **kartengrosse** halbtransparente Bodenebenen
(r 90 … 537, `depthWrite:false`) liegen übereinander — Gelände-, Platz-, Strassen- und
Wasser-Overlays. Das ist mehrfaches Überzeichnen des ganzen Bildes und auf dem Handy der
grösste verbliebene Füllraten-Posten. Vier davon haben `opacity:1`, brauchen `transparent:true`
aber für die Alpha-Kanäle ihrer Texturen. Ein Umbau auf `alphaTest` würde weiche Übergänge zu
harten Kanten machen — nur mit Bildvergleich anzugehen.

## Ein Viertel aller Wände der Stadt war tot

Gesucht war eigentlich etwas anderes: durch welche Gebäude läuft man hindurch?
`spiele-dev/tools/th-mauern.mjs` (neu) vergleicht jedes gebäudeartige Modell mit
`WORLD_SOLIDS`. Der erste Lauf meldete **0 Kollider** — und diese Null war der
Verräter: `WORLD_SOLIDS` ist eine Modul-Variable, kein `window`-Feld, und die Sonde
läuft ohnehin *innerhalb* der IIFE. Mit dem richtigen Zugriff: 182 Kollider,
111 Modelle geprüft, 19 ohne Deckung.

Beim Nachtragen eines Kolliders für das Wirtshaus stimmte dann etwas nicht: die Zeile
lief nachweislich (Marke gesetzt), der zurückgegebene Eintrag existierte — aber er
stand nicht dort, wo er sollte:

```
{x: -28, z: NaN, hw: 4.90689…, hd: NaN}
```

**`z` und `hd` waren NaN.** Und ein Kollider mit NaN blockiert *nie* etwas: jeder
Vergleich in `inSolid()` ist mit NaN falsch. Nachgezählt: **44 von 184 Kollidern**
waren so — ein knappes Viertel der Wände der ganzen Stadt, stumm tot.

### Zwei Ursachen

**1. Der Wächter prüfte nur eine von vier Ecken.** In `kolliderNachziehen()` misst eine
Schleife alle Bauteile ein:

```js
bb.setFromObject(o);
if(!isFinite(bb.min.x))return;          // ← nur x
```

Ein Teil mit endlichem x und NaN in z kam durch. PASS 2 schreibt daraus direkt
`s6.z = (v6.z0+v6.z1)/2` und `s6.hd = nhd` — **genau die beiden Felder, die kaputt
waren**. Das Muster (x und hw in Ordnung, z und hd NaN) zeigt die Ursache unmittelbar.
Verschärfend: die Zuordnung darüber klemmt per `Math.abs(dz) > s.hd*2.2+2`, und mit NaN
ist dieser Vergleich **falsch** — die Abstandsgrenze greift also gerade dort nicht, wo
sie am nötigsten wäre.

**2. Die Kathedrale war ein Hoisting-Fehler.**

```js
addSolid(DOM_X, DOM_Z+0.95, 17.6, 20.7, {a:"z", at:DOM_SW-0.5, c:DOM_X, w:4.5});
…114 Zeilen später…
var DOM_X=146, DOM_Z=-22, DOM_SW=DOM_Z+11.2;
```

`var` hebt die Deklaration hoch, nicht den Wert. Alle drei waren `undefined`, aus
`DOM_Z+0.95` wurde NaN. **Der Kollider der grössten Kirche der Stadt hat nie etwas
blockiert.** Er steht jetzt direkt nach der Zuweisung.

Dazu Gürtel und Hosenträger: PASS 2 wendet nichts an, was nicht endlich ist.

### Gemessen

| | vorher | nachher |
|---|---|---|
| Kollider mit NaN | **44 von 184** | **0** |
| gebäudeartige Modelle gedeckt | 92 von 111 | **96** |
| th-netz | 38 ok | 38 ok, 0 Fehler |
| th-koop | alle 9 kommen an | alle 9 kommen an |

Die Deckung steigt um vier, **ohne dass ein einziger Kollider hinzugefügt wurde** — die
44 kamen einfach zurück ins Leben. Dass `th-netz` und `th-koop` weiter grün sind, ist
dabei die wichtigere Zahl: 44 plötzlich wirksame Wände hätten Wege abschneiden können.

### Die 15, die offen bleiben — mit Absicht

Seilbahnstützen und Hafenkran (die Hüllbox ist der Ausleger, der Mast ist dünn),
Spielturm, Klettergerüst und Schaukel (dort klettert man), Weihnachtsbuden (im Sommer
versteckt — ein Kollider wäre eine unsichtbare Wand), Rodelhang und Helilandeplatz
(begehbar). Offen und **noch zu klären**: `th8_kirche_offen` und `th8_laden_offen`
brauchen einen Kollider *mit Tür* (`addSolid` kann das), `bd_windmill_tower` ist
Lieferziel, `bd_market` womöglich offenseitig.

⚠️ Und die Masse dafür kommen aus dem **Wandgrundriss**, nicht aus der Hüllbox: das
Werkzeug misst, was 0,3 … 2,0 m über der eigenen Sohle liegt. Beim Hafenkran sind das
3 × 7,7 m statt 9,9 × 8 — Mast statt Ausleger. Ein Kollider in Dachgrösse wäre eine
unsichtbare Mauer unter der Traufe.

## Wo hat ein Haus seine Tür? — und wie man das falsch misst

Offener Punkt aus der Kollider-Runde: `th8_kirche_offen` und `th8_laden_offen` sollten
einen Kollider **mit Tür** bekommen (`addSolid` kann das). Dafür muss man wissen, wo
die Öffnung liegt — geraten ist sie schnell an der falschen Wand.

### Der erste Versuch mass den Innenraum

Die Sonde tastete je Seite in 0,25-m-Schritten ab, **0,45 m hinter der Fassade**.
Ergebnis: die Kathedrale meldete **alle vier Seiten zu 90 % offen**. Offensichtlich
falsch — und der Grund ist banal: eine Wand ist 0,2 … 0,3 m dick, die Probe lag also
stets im leeren Innenraum.

Richtig: nur Teile betrachten, die die Fassade **berühren** (0,6 m Toleranz), und ihre
Ausdehnung längs der Wand als gedeckt markieren. Was ungedeckt bleibt, ist die Öffnung.
Damit meldet die Kathedrale genau **eine** Lücke: 1,5 m breit auf der +z-Seite, mittig
bei x = 146 — das Portal, und zwar dort, wo der alte Kommentar es beschreibt.

`spiele-dev/tools/th-tueren.mjs` (neu) hält das fest. Gemessen wird auf Wandhöhe,
0,3 … 2,0 m über der **eigenen** Sohle (die Berghütte steht auf 43 m).

### Die Türen wurden am Ende gar nicht gebraucht

Der erneute Lauf von `th-mauern` zeigte: Kathedrale, Wirtshaus, Windmühle und Laden
sind **schon gedeckt** — die 44 in #2391 wiederbelebten Kollider haben sie erfasst. Der
offene Punkt war durch den vorigen Fix bereits erledigt; ohne Nachmessen hätte ich der
Kathedrale einen zweiten Kollider verpasst.

### Was übrig blieb

Von 15 offenen bleiben 13 mit Absicht offen. Zwei bekamen einen Kollider, beide auf
Türen geprüft und allseitig geschlossen:

* **`bd_market`** 15,3 × 15,2 bei (20,2|293,5) — steht auf r 294, `autoKollider()`
  greift nur bis r 130.
* **`th48_marktwaage`** 3,1 × 3,1 bei (158|27) — die Hüllbox ist mit 4,5 × 4,5 das
  vorstehende Dach.

Nicht angefasst, mit Begründung:

* **`th45_hafenkran`** — die „Wand" ist der Gittermast, 3 × 7,7 mit 4,7 m Lücke:
  zwischen den Beinen eines Krans darf man gehen.
* **`th26_berghuette`** — 7,7 m offene Westseite. Das ist keine Tür, das ist eine offene
  Front; ein Vollkollider würde sie zumauern.
* Seilbahnstützen (Hüllbox = Ausleger), Spielgeräte (dort klettert man),
  Weihnachtsbuden (im Sommer versteckt — ein Kollider wäre eine unsichtbare Wand),
  Flugzeug (Kulisse).

### Gemessen

| | vorher | nachher |
|---|---|---|
| gebäudeartige Modelle gedeckt | 96 von 111 | **98** |
| ohne Kollider | 15 | **13** (alle mit Begründung) |
| th-netz | 38 ok | 38 ok, 0 Fehler |
| th-koop | 9 von 9 kommen an | 9 von 9 |

## Speichern und Laden — der teuerste ungeprüfte Weg im Spiel

`snapshot()` und `loadSnapshot()` tragen alles, was der Spieler gebaut und erreicht hat:
34 Felder, von den Wänden bis zu den Tageslimits. **Kein Werkzeug hat sie je geprüft.**
Geht dabei etwas verloren, merkt es beim Programmieren niemand — es fällt erst auf, wenn
jemand sein Haus wiederfindet und ein Stück fehlt. Die Kommentare im Snapshot zählen
mehrere solcher Fälle auf, die einzeln und nachträglich gefunden wurden: Gratis-Flags,
Emote-Zähler, Auftragsfortschritt, Tageslimits.

`spiele-dev/tools/th-speichern.mjs` (neu) prüft eine harte Invariante:

```
speichern(laden(speichern(x)))  ==  speichern(x)
```

### Zweimal am eigenen Aufbau gescheitert, bevor der Test etwas prüfte

* **Erster Lauf: 0 Böden, 0 Wände, 0 Möbel.** Ein frisches Spiel ist leer, der Umweg
  war trivial bestanden. Ein Test, der nichts anfasst, beweist nichts.
* **Zweiter Lauf: Absturz.** `applyFloor(x, y, idx)` nimmt einen **Index** in `FLOORS`
  (0 … 2), keine Zeichenkette — mit einer Katalog-ID kam
  `Cannot read properties of undefined (reading 'texture')`. Möbel dagegen laufen über
  `applyFurn(id, …)` und brauchen echte Katalog-Bezeichner; ein erfundener würde still
  verworfen, und der Test bestünde wieder aus Nichts.

Jetzt baut der Test erst ein Haus — 30 Böden (alle drei Belagsarten), 22 Wände mit Tür
und Fenster, 6 Möbel aus dem echten Katalog — und alle 58 Teile kommen im Spielstand an.

### Ergebnis

**Verlustfrei.** Kein einziges der 34 Felder verändert sich auf dem Umweg.

Eine harmlose Asymmetrie bleibt und ist dokumentiert: bei einem *frischen* Spiel liefert
`snapshot()` `gb: null`, nach dem ersten Laden `gb: {}`. Beide werden überall als
`sn.gb || {}` gelesen — ohne Wirkung, und nach dem ersten Laden ist der Unterschied weg.

Der Test schreibt nichts in den `localStorage`; die Änderung lebt nur im Browser des
Laufs.

## Ein Tor für dreissig Werkzeuge

In `spiele-dev/tools` liegen über dreissig Messgeräte, und **keines kennt die anderen**.
Wer etwas an `traumhaus.html` ändert, müsste wissen, welche davon das berühren könnte —
und weiss es nicht. Genau daran ist in dieser Datei schon mehrfach etwas kaputtgegangen,
das ein *vorhandenes* Werkzeug sofort gemeldet hätte:

* Der Hausberg begrub 18 Bauwerke, nachdem die Seilbahn repariert war (#2382).
* Die Weihnachtsbuden standen im Sommer auf der Wiese, nachdem die Gruppen-Sichtprüfung
  eingebaut war (Nachbar-Sitzung, #2379).

`spiele-dev/tools/th-alle.mjs` (neu) fährt fünfzehn Prüfungen ab und sagt in einer Zeile
je Prüfung, ob sie hält. Es ersetzt die Einzelwerkzeuge nicht — wer einen Fehler *sucht*,
ruft das betroffene direkt auf und liest dessen Ausgabe.

```
✅ Netz (Wege, Marken, Anschluesse)                   38/0   123 s
✅ Boden (Fels, Luft, Wasser)             keins/keins/keins    66 s
✅ Belag (Zubehoer quer auf Fahrbahn)                    0    62 s
✅ Laternen (Untergrund)                             174/0    59 s
✅ See (Enten im Wasser)                                 0    57 s
✅ Linien (Sperr- gegen Leitlinie)                 4 Lagen    56 s
✅ Viertel (Platz und Stufe)                           7/0    91 s
✅ Licht (Zahl der Punktlichter)                 0 Wechsel    86 s
✅ LOD (Flackern an der Grenze)                          0    63 s
✅ Bewegt (Animationen angemeldet)                      37    91 s
✅ Speichern (Umweg verlustfrei)            0 Unterschiede    64 s
✅ Flimmern (bei stiller Kamera)            0 Lichtwechsel    84 s
✅ Gleis (was liegt auf den Schienen)                    2    59 s
✅ Mauern (durchlaufbare Gebaeude)                13 offen    66 s
✅ Koop (kommen alle an)                            9 Wege   160 s

15 von 15 halten · 20 min gesamt
```

`--schnell` lässt nur die Kernreihe laufen (neun Prüfungen, rund zehn Minuten).

### Der erste Lauf meldete zwei Fehlschläge — beide waren meine Schwellen

**Gleis: 3 statt 2.** Das dritte Bauteil war das **Schotterbett**, das dort hingehört.
Die Dokumentation des Werkzeugs behauptete längst, es sei ausgenommen — der Filter prüfte
`bb.max.y <= 0.05`, und der Messwert liegt *genau* auf 0,05. Eine Schwelle, die auf dem
Messwert selbst liegt, ist keine Schwelle: mal rutschte das Bett durch, mal nicht. Jetzt
0,06, und zusätzlich an seiner Form erkannt (über 100 m lang, unter 3 m breit, flach).

**Koop: Rückgabe 1.** Einzeln aufgerufen sofort wieder grün, mit „alle 9 geprüften
kommen an". Als fünfzehnter Browserstart nach achtzehn Minuten fiel er aus, ohne dass an
der Welt etwas war. Das Tor macht deshalb **genau einen** Wiederholungsversuch und sagt
es im Bericht — wer zweimal scheitert, hat ein echtes Problem.

Beide Male galt dieselbe Regel wie den ganzen Tag: **erst prüfen, ob das Messgerät recht
hat, dann der Welt glauben.**

## Erscheint jeder Katalog-Eintrag? — und zweimal daneben gemessen

Wer im Baumodus etwas kauft, das nie sichtbar wird, verliert Geld für nichts und sieht
keinen Fehler. Der Katalog hat **104 Einträge in 7 Gruppen**, keine doppelten Bezeichner,
keinen ohne Preis. Geprüft war er nie.

### Erster Versuch: nach Dateien suchen — 11 falsche Treffer

Die naheliegende Prüfung ist ein HTTP-Test auf `th_<id>.glb`. Sie meldete **11 fehlende
Dateien** — darunter `wand`, `fenster`, `tuer` und vier Bodenbeläge. Die haben nie eine
Datei gehabt: Wände laufen über `applyWall`/`buildWallMesh`, Böden über `applyFloor`, und
`applyFurn()` hat mehrere prozedurale Zweige (`def.car`, `def.grow` …), die Möbel aus
Quadern bauen.

**Aus „keine Datei" folgt nicht „kaputt".** Die richtige Frage ist nicht, ob eine Datei
existiert, sondern ob **etwas erscheint, wenn man den Eintrag hinstellt** — das gilt für
beide Wege gleichermassen.

### Zweiter Versuch: 53 falsche Treffer, weil die Frist geraten war

Also jeden Eintrag wirklich hinstellen und nachsehen, ob ein Mesh mit Geometrie entstand.
Nach fest gewählten 12 Sekunden meldete der Test **53 von 89 als unsichtbar** — und alle
53 trugen ein ⭐ im Namen. Das ist zu sauber für einen echten Befund: es waren die über
`loadTH` geladenen Modelle, die noch unterwegs waren, während die prozeduralen sofort
dastanden. Gemessen wurde die Ladezeit, nicht die Vollständigkeit.

**Nicht auf eine Frist warten, sondern auf Ruhe.** Jetzt alle 3 s nachsehen und erst
urteilen, wenn die Zahl dreimal gleich bleibt. Gemessen: nach 3 s fehlten 53, nach 6 s
noch **eines**, nach 9 s **keines**.

### Ergebnis

**Jeder Eintrag erscheint.** 89 hingestellt (ohne Wände, Fenster, Türen, Böden — die
laufen über andere Wege), 85 davon in der Möbelliste und alle mit Mesh; die
Auto-Varianten gehen nach `window.autoRec` (vorhanden), der Hund hat seinen eigenen Weg.

⚠️ Die vier, die *nicht* in `furn` landen, werden jetzt **namentlich ausgewiesen**. Sie
schweigend hinzunehmen hiesse, vier Einträge nicht geprüft zu haben und trotzdem „alle
erscheinen" zu melden.

`spiele-dev/tools/th-katalog.mjs` (neu), aufgenommen in `th-alle.mjs`.

---

## Stecken die Bewohner fest? — und warum die Spielzeit hier siebenmal langsamer läuft

`th-koop.mjs` prüft zwei Spielerwege im Mehrspielermodus. Die Bewohner (`sims`) und die
Besucher (`npcs`) hat nie jemand beobachtet. Ein NPC, der in einer Ecke hängenbleibt oder
mitten in einem Haus steht, erzeugt kein Fehlerbild — er steht einfach da.

`spiele-dev/tools/th-bewohner.mjs` (neu) misst über 60 s den zurückgelegten Weg und, für
jede Probe, ob jemand in einem Kollider steht.

### Vier Anläufe, vier verschiedene Gründe, warum nichts gemessen wurde

1. **Der Playwright-Symlink war weg** — Regel 11 der Liste oben, ein Container-Neustart.
2. **„2 verfolgt, 0 Besucher"** — der Besucher-Pool hängt an der Tageszeit (8 … 12 Uhr
   Postbote, 13 … 18 Uhr Nachbarin und Händler; sonst ist der Pool **leer**). Bei ~2
   Bildern/s wandert die Spielzeit während der Messung aus dem Fenster. Jetzt wird die Uhr
   bei jedem Takt auf 9 Uhr gesetzt.
3. **Immer noch 0 Besucher.** Der Grund ist allgemein wichtig: **das `dt` der Spielschleife
   ist gedeckelt** — sonst zerrisse die Physik bei zwei Bildern je Sekunde. Gemessen: in
   **45 s Echtzeit fällt `npcTimer` nur von 20 auf 13,5**. Spielzeit läuft hier rund
   **siebenmal langsamer** als Echtzeit; der erste Besucher käme nach zweieinhalb Minuten.
   Wer auf so eine Uhr wartet, misst eine leere Welt und meldet „alles in Ordnung".
   → Zähler anstossen (`npcTimer = 0.1`), und erneut, sobald wieder Platz ist.
4. **„Max hat sich 0 m bewegt".** `meinSi()` liefert im Einzelspieler 0, und `simDefs[0]`
   ist Max — die **Spielfigur**. Sie steht still, weil die Sonde keine Taste drückt.

Dazu ein Fehler in der Auswertung statt in der Messung: der Kopfkommentar beschrieb längst,
dass Schlafen, Arbeiten und Warten legitime Stillstände sind — **die Auswertung wandte es
nicht an** und meldete Mia im Zustand `work` als Befund.

### Ergebnis

**Niemand steckt fest, niemand steht in einer Wand.** 4 verfolgt, 2 Besucher kommen an und
laufen ihren Zyklus, Mias Stillstand ist durch `work` erklärt, die Spielfigur ausgenommen.

> **Merke für jeden zeitgesteuerten Test hier:** Spielzeit ≠ Echtzeit. Wer auf einen
> Spiel-Timer wartet, wartet etwa siebenmal so lange wie gedacht — oder stösst ihn an.

## Die Stadt ist voll — und der Solver hätte auf das Baugrundstück gebaut

Der Versuch, ein **Kulturviertel** einzurichten, ist gescheitert. Er hat dabei zwei Dinge
gemessen, die beide wertvoller sind als das Viertel.

Zuerst nach der **Sache** gesucht, nicht nach Modellen (Regel 8): `kino`, `bibliothek`,
`einkaufszentrum`, `restaurant`, `sporthalle` — **alles 0**. Die drei Treffer für
„Bibliothek" waren „Repo-Bibliothek" und „Modell-Bibliothek" in Kommentaren. Die fünf
`th10_*`-Modelle lagen unbenutzt im Repo und füllen genau diese Lücke.

### Erstens: es ist kein Platz mehr da

Ein 170 × 80-Viertel mit fünf Bauten landete auf **Stufe 0** — auf der Landstrasse und im
Bergfuss, und `th-viertel` fand im Umkreis von 260 m keinen besseren Ort. Also gemessen,
welche Grösse überhaupt noch passt (Raster ±320 m, alle 20 m, gegen `viertelPasst(…, 2)`):

| Viertelgrösse | Bauten | Stellen auf Stufe 2 | nächste an der Stadtmitte |
|---|---|---|---|
| 170 × 80 | 5 | **1** | 453 m |
| 130 × 80 | 4 | 5 | 272 m |
| 110 × 70 | 3 | 7 | 260 m |
| 80 × 60 | 2 | 17 | 251 m |
| 55 × 55 | 1 | 36 | 160 m |

Sieben Viertel, die Ringstrassen, die Berge und das Meer haben den Gürtel um die Stadt
aufgebraucht. Ein Kulturviertel in der Kartenecke wäre keine Verbesserung — **die
Erklärung ist ehrlicher als das Bauwerk.** Die Deklaration wurde wieder entfernt.

⚠️ Die Gesamtzahlen schwanken zwischen Läufen (das Streuwerk ist zufällig und ändert
`WORLD_SOLIDS`). Belastbar ist die Reihenfolge der Grössen, nicht die Summe.

### Zweitens, und wichtiger: `viertelPasst` kannte das Baugrundstück nicht

In derselben Tabelle stand für 80 × 60 als nächste Stelle **(0|0)** — mitten auf dem
Grundstück des Spielers. Der Grund ist logisch: die Fläche ist **absichtlich leer**, dort
baut der Spieler, und genau deshalb steht dort auch kein Kollider — `autoKollider()` spart
sie ausdrücklich aus. Der Solver sah freies Land.

Aufgefallen ist es nur, weil noch nie ein Viertel einen Wunschort nahe dem Ursprung
hatte; `viertelOrt()` sucht von der Wunschstelle nach aussen. Ein künftiges Viertel mit
einem stadtnahen Wunsch hätte das Haus des Spielers überbaut.

```js
var _bgX = GW*CS/2+10, _bgZ = GH*CS/2+10;      // dieselben Grenzen wie in autoKollider()
if (Math.abs(x)-m.hw < _bgX && Math.abs(z)-m.hd < _bgZ) return false;
```

**Gemessen:** (0|0) fällt für 80 × 60 und 55 × 55 weg (nächste jetzt 251 m bzw. 160 m),
alle **7 Viertel weiterhin auf Stufe 2**, `th-netz` 38 ok.

---

## 2026-08-29 · Das Ruckeln kam nicht von zu viel Arbeit, sondern von Nachladen

„Ruckelt am Handy" heisst **Aussetzer**, nicht durchgehend langsam. Das ist die ganze
Diagnose in einem Satz — und der Grund, warum drei Runden Suche nach *teurer Arbeit pro
Bild* nichts fanden. Was gleichmässig kostet, kann gar nicht stocken.

### Der dritte Freispruch — und diesmal war es meine eigene Lieblingsthese

Fünf kartengrosse durchsichtige Schichten liegen übereinander (nahe Wiese, Mähstreifen,
Umland-Ring, Fern-Ebene, Wolkenschatten). Ich hatte sie mehrere Runden lang als „grösster
verbleibender Füllraten-Posten" im Handoff stehen.

**Erste Messung war Müll, und zwar auf lehrreiche Art.** Blockweise gemessen — erst alle
an, dann alle aus — kam heraus: „aus" ist **langsamer** als „an" (-11 %). Die
Software-Rasterung driftet über die Zeit stärker, als die Schichten kosten.

**Zweiter Anlauf abwechselnd A B A B im selben Zeitfenster**, damit die Drift beide Seiten
gleich trifft und aus der Differenz fällt:

| Schicht | Unterschied | Rauschen | Urteil |
|---|---|---|---|
| ALLE zusammen | −0,7 ms | ±6,5 ms | im Rauschen |
| 760×760 | −4,0 ms | ±4,0 ms | im Rauschen |
| 600×600 | −0,9 ms | ±2,7 ms | im Rauschen |
| 460×460 | +0,6 ms | ±2,7 ms | im Rauschen |
| 204×152 | +1,7 ms | ±5,9 ms | im Rauschen |

Software-Rasterung ist der **füllratenempfindlichste Renderer, den es gibt**. Was dort
nicht messbar ist, ist auf einer GPU erst recht nicht der Engpass.

`alphaTest`, das ich dafür vorgesehen hatte, wäre zusätzlich falsch gewesen: die Texturen
sind weiche Radialverläufe (Alpha-Minimum 0, 100 % der Pixel unter voll deckend) — es
gäbe harte Kreiskanten statt weicher Flecken. **Vor dem Optimieren die Textur ansehen.**

`spiele-dev/tools/th-fuellrate.mjs`, `th-schichten.mjs` (beide neu).

### Was es wirklich ist

three.js übersetzt Shader und lädt Texturen **erst, wenn ein Material zum ersten Mal im
Bild auftaucht**. Nach dem Laden kannte der Renderer 45 Programme und 29 Texturen — im
Spiel existieren **224**. Eine Kamerafahrt über die Karte:

```
Start        493 ms · +4 Programme · +69 Texturen
Berg         335 ms · +3 Programme · +98 Texturen
alle anderen  31–93 ms · +0 · +0
```

Die zwei teuren Bilder sind **genau** die mit den Neuzugängen.

### Der Fix und seine zwei Fallen

`_aufwaermen()` lädt vor, während der Startbildschirm steht: `renderer.compile()` für die
Shader, `renderer.initTexture()` je Textur, dazu Vorzeichnen aus neun echten Blickwinkeln
(`compile()` merkt sich je **Material**, three.js baut aber je Material **und
Objekt-Zustand**).

⚠️ **Ein Lauf reicht nicht.** Einmalig bei 9 s halbierte die Nachzügler nur (174 → 93):
die GLB-Modelle kommen über Minuten herein, es gibt kein „jetzt ist alles da"-Ereignis.
Jetzt mehrere Läufe (16/26/40/60 s), die sich merken, was sie kennen.

⚠️ **Es darf nicht selbst ruckeln.** `compile()` blockiert über eine halbe Sekunde — auf
dem Startbildschirm unsichtbar, im Spiel wäre es genau der Hänger, den es verhindern soll.
Solange nicht gespielt wird: alles sofort. Sobald gespielt wird: nur Texturen, vier je Bild.

**Ergebnis: Texturen 174 → 2 Nachzügler. Shader 7 → 5.**

Die 5 Restlichen über ihre `cacheKeys` angesehen: Flanken, die man nicht ansteuern kann,
eines ist eine Schattenkarten-Variante. r128 gibt keine Liste der fehlenden Varianten
heraus. Ein Versuch, zusätzlich bei neuen **Meshes** vorzuzeichnen, brachte gemessen
**null** Unterschied und ist wieder draussen.

### ⚠️ Der Pixelvergleich lügt hier — immer eine Kontrolle mitlaufen lassen

Bildvergleich vorher/nachher: **96,06 % veränderte Pixel.** Das sah nach einem schweren
Grafikfehler aus. Kontrolle mit **zweimal demselben Stand**: **96,05 %.**

Die Szene ist zwischen Läufen nicht deterministisch (Uhr, Verkehr, Tiere). Ohne die
Kontrolle hätte ich einen Fehler gemeldet, den es nicht gibt.

**Regel: Ein Bildvergleich ohne Gleichstand-Kontrolle ist keine Messung.**

---

## 2026-08-29 · 🏆 41 Erfolge an einer ungeschützten Kette — und eine Vermutung, die sich selbst widerlegt hat

Ein Erfolg ist die einzige Belohnung im Spiel, deren **Ausbleiben niemand bemerkt**. Wer
20 Fische angelt und nichts bekommt, hält das für eine hohe Hürde, nicht für einen Fehler.
Genau diese Klasse hatte das Spiel schon einmal: `stats.coups` und `stats.sperrgut` wurden
hochgezählt und nirgends gelesen — tote Zahlen, behoben mit „Tresorknacker"/„Schwerlast".

Neues Werkzeug **`spiele-dev/tools/th-erfolge.mjs`** (jetzt Prüfung 18 in `th-alle.mjs`)
stellt vier Fragen an die 41 Erfolge und die 13 Tages-Missionen:

| Frage | Ergebnis |
|---|---|
| Wirft eine Bedingung? | 0 von 41 |
| Ist eine schon beim Start wahr (belohnt nichts)? | 0 von 41 |
| Wird jeder gelesene `stats.*`-Zähler auch geschrieben? | ja, 31 von 31 |
| Was passiert, **wenn** eine wirft? | **das war der Fund** |

### Der Fund: eine Kette ohne Schutz, zweimal

`checkAch()` und `missCheck()` riefen die Bedingungsfunktionen ungeschützt in einer
Schleife auf. Ein einziger Wurf beendet die Schleife — **jeder Erfolg dahinter kann nie
mehr eintreten**, ohne eine Zeile in der Konsole. Gemessen mit einer *Belastungsprobe*:
ein kaputter Eintrag an Stelle 0 liess die immer-wahre Marke an Stelle 1 ausfallen.

Dass heute alle 41 Bedingungen sauber sind, ist ein **Zustand, keine Eigenschaft** — zwei
von ihnen tragen bereits einen eigenen `typeof`-Schutz (`immohai`), weil hier schon einmal
jemand hineingelaufen ist. Jetzt kostet ein Fehler genau einen Erfolg statt aller dahinter.

| Belastungsprobe | vorher | nachher |
|---|---|---|
| Erfolge (`checkAch`) | Marke hinter dem Gift **fällt aus** | Marke wird gesetzt |
| Missionen (`missCheck`) | fertige Mission bleibt **unerledigt** | wird erledigt |
| unbehandelte JS-Fehler | 1–3 | **0** |

### ⚠️ Die Vermutung, die sich selbst widerlegt hat

Erste Fassung der *Rahmenprobe* sollte den grossen Schaden zeigen: `checkAch()` steht in
`loop` in **einer Zeile** mit `checkQuest`, `checkTeamQ`, `missCheck` — und weit dahinter
stehen `saveGame` (alle 6 s), der Host-Abgleich und **`renderer.render(scene,camera)`**
(Zeile 13436 gegen 13413). Die Vermutung lag nahe: ein Wurf friert das Bild ein.

**Gemessen: 9 Bilder je 4 s ohne Gift, 9 mit — 0 % Verlust.** Grund: `simTick=0` wird
*vor* den Aufrufen gesetzt, der Wurf trifft also nur jedes rund siebte Bild (0,35 s
Spielzeit bei gedeckeltem `dt` von 0,05; auf einem 60-Hz-Gerät jedes 21.).

Damit war „das Bild friert ein" beinahe eine weitere falsche Behauptung in einer gemergten
PR — wie schon einmal bei „keine einzige Baustelle" (#2386). Die Probe misst jetzt gegen
eine **Referenzmessung ohne Gift** und schreibt den ehrlichen, kleineren Befund hin:
der Schaden heisst nicht „Standbild", sondern „ein toter Erfolg reisst alle dahinter mit".

> Wieder Regel 3 und die Regel über den Regeln: die erste Fassung des Messgeräts hatte
> unrecht, nicht die Welt. Neuntes von achtzehn Werkzeugen, das sich zuerst selbst widerlegt hat.

### ⚠️ Und wieder Regel 1

Ein Backtick in einem Kommentar **innerhalb** der Sonde — `` `checkAch()` `` als Zitat
gemeint — brach den Lauf mit „Unexpected identifier 'checkAch'". **Elftes Mal.** In Sonden
gehören Anführungszeichen, auch in Kommentare.

---

## 2026-08-29 · Punktlichter: zweimal Entwarnung, beide gemessen

Nachnahme zu #2401. Beim Lesen des Lampen-Codes fiel ein Verdacht auf, der genau den
dort nachgewiesenen Ruckel-Mechanismus getroffen hätte: **three.js baut sein
Shader-Programm nach der ANZAHL der Lichter je Art.** Schwankt sie, wird jedes Material
neu übersetzt. Der Deckel in `loop()` setzt

```js
_kand[i].visible = (i < LAMP_MAX)
```

auf eine Kandidatenliste, aus der Lichter mit Helligkeit 0 vorher herausfallen — die Zahl
ist also `min(LAMP_MAX, |kandidaten|)` und *könnte* beim Auf- und Abblenden durchwandern.

### 1. Die Anzahl schwankt nicht

Ganzer Spieltag, stündlich gemessen (`th-lichtzahl.mjs`, neu):

**0 Wechsel der Lichterzahl, konstant 6 sichtbare Punktlichter von 0:00 bis 23:00.**
Über den ganzen Tag 2 neu übersetzte Programme — nicht an den Dämmerungsgrenzen.

**Die Kommentare im Code stimmen.** Der Verdacht war unbegründet.

### 2. Die sechs Mittagslichter sind Absicht — und kosten nichts messbar

Dabei fiel auf: um 12:00 brennen 6 Punktlichter mit zusammen 8,64 Helligkeit. Erst wie ein
Fehler ausgesehen; 14 s lang zugesehen, ob es ein Fade-Artefakt der abrupt gestellten Uhr
ist — **völlig stabil**, also echter Dauerzustand.

Der Ursprung steht in Zeile 13438: `_ti = nacht9 ? _max*7 : _max*1.6`, Kommentar
*„Innenlichter brennen auch tagsüber schwach (Räume ohne Fenster)"*. Es sind die fünf
begehbaren Gebäude plus das Pavillon-Licht. Nachgerechnet: 1,76 + 1,44 + 1,44 + 1,28 +
1,92 + 0,85 = **8,69** gegen 8,64 gemessen. Passt.

Also **Absicht, kein Fehler** — ohne sie wären die fensterlosen Innenräume tagsüber schwarz.

Und die Kosten, abwechselnd A B A B gemessen:

| Blickwinkel | Unterschied | Rauschen | Urteil |
|---|---|---|---|
| Innenstadt, direkt bei den Lichtern | −1,8 ms | ±5,0 ms | im Rauschen |
| Baugrundstück, weit weg | +3,0 ms | ±41,2 ms | im Rauschen (Messung schwach) |

Der zweite Wert taugt wenig — ±41 ms Rauschen misst nichts. Der erste ist belastbar.

⚠️ Damit ist auch die Warnung im `LAMP_MAX`-Kommentar („die teuerste Rechnung des ganzen
Bildes") für den **heutigen** Stand nicht mehr belegt. Sie stammt aus einer Zeit mit
15 gleichzeitig brennenden Lichtern; mit dem Deckel bei 6 ist davon nichts mehr messbar.
Den Deckel trotzdem stehen lassen — er hält genau diesen Zustand.

### Zwei Fallen beim Bauen des Werkzeugs

* **Die Spieluhr heisst `uhrzeit` und zählt MINUTEN**, nicht Stunden. Der erste Anlauf
  schrieb auf ein `uhr`, das es nicht gibt. Immerhin laut: *„uhr.toFixed is not a
  function"* — hätte die Sonde nur zugewiesen, wäre sie stumm wirkungslos geblieben und
  der Test hätte 24-mal dieselbe Stunde gemessen und grün gemeldet.
* **Keine Backticks in Sonden-Quelltext.** Ein `uhrzeit` in Rückwärtsstrichen im
  Kommentar beendete das Template-Literal. Die alte Falle, wieder hineingetappt.

---

## 2026-08-29 · Der Dauerbefund war ein Kamin — und der erste Selbsttest zu schwach

`th-pruef` meldete bei jedem Lauf denselben einen Treffer:

```
• Steckt in einem Bau  1     ? (41, 133)  100 % in  ?
```

Beide Namen `?`, also nie jemand nachgegangen. Nachgesehen, was dort steht:

| | Box | Grösse |
|---|---|---|
| **klein** | 40,2 / 7,0 / 132,7 → 41,0 / 9,3 / 133,5 | 0,8 × 0,8 m, 2,3 m hoch |
| **gross** | 38,0 / 6,0 / 131,8 → 42,0 / 7,7 / 136,2 | 4,0 × 4,4 m, erstes Mesh **„Giebel"** |

Ein Aufbau auf einem Dach: 0,73 m tief im Dach, 1,6 m darüber. **Richtig gebaut,
trotzdem jedes Mal rot.**

Die Absicht stand längst im Kommentar des Tests — *„ein Baum, eine Hecke, ein **Dach**
oder ein Gerüst ist kein GEHÄUSE"*. Nur greift `KEIN_GEHAEUSE` hier nicht: die Gruppe hat
weder Namen noch `userData.datei`, der Name steckt eine Ebene tiefer im Mesh.

### ⚠️ Nicht über die Mesh-Namen lösen

Der naheliegende Fix — bei namenloser Gruppe auf die Mesh-Namen ausweichen — wäre falsch:
**fast jedes Haus hat ein Mesh namens „Dach"**. Dann wäre kein Gebäude mehr ein Gehäuse
und der Test still. Eine Prüfung, die nichts mehr findet, sieht aus wie Erfolg.

Geometrisch statt namentlich: ragt **mehr als die Hälfte der Höhe** des kleinen Objekts
über die Oberkante des grossen hinaus, sitzt es oben auf. Ein 2 m hohes Bauzaunfeld in
einer 10 m hohen Wand ragt zu 0 % heraus und bleibt gemeldet.

### ⚠️ Der erste Selbsttest hat die Sabotage überlebt

Fünf Fälle prüfen jetzt bei **jedem Lauf**, dass die Regel noch unterscheidet — und die
Entscheidung steckt in *einer* Funktion, die Test und Auswertung gemeinsam benutzen, damit
der Test nicht eine Abschrift prüft.

Gegenprobe: Regel testweise auf „ragt überhaupt heraus" aufgeweicht → **Selbsttest blieb
grün.** Keiner der ersten vier Fälle ragte ein *wenig* heraus, und genau diese Grenze
bewacht der Faktor 0,5. Fünfter Fall nachgereicht (3,2 m hoher Pfosten, der 0,2 m aus
einem 3 m hohen Bau schaut, steckt zu 94 % drin → muss gemeldet bleiben). Damit:

```
richtige Regel     ✔ 5/5
sabotierte Regel   ✖ 4/5  ← „Pfosten, der nur knapp herausschaut" erwartet true, war false
```

**Regel: Eine Ausnahme, die den Test stillstellt statt ihn zu schärfen, fällt nie auf —
„0 Befunde" sieht aus wie Erfolg. Jede Ausnahme braucht einen Fall, der ohne sie kippt,
und der Selbsttest muss beweisen, dass er rot werden kann.**

---

## 2026-08-29 · 16 Überschneidungen, 7 davon gibt es gar nicht

`th-pruef` meldet dauerhaft „Überschneidungen 16, grösste 2,5 m" — und `entwirren`
meldet `ohnePlatz: 5…10`. Beide Zahlen standen ungeprüft da. (`ohnePlatz` zählt
übrigens **Paar-Versuche pro Runde**, nicht Objekte: dasselbe Paar in zwei Runden
zählt zweimal. Die Zahl, die zählt, ist `nachher`.)

### ⚠️ Der Gruppen-Kasten lügt bei T- und L-Formen

Die tiefste Überschneidung — **2,5 m zwischen Oberleitungsmast und Löschfahrzeug** —
sieht auf dem Screenshot aus, als stünde ein Mast im Feuerwehrauto. Ich hatte das beim
ersten Hinsehen auch so gelesen. Der Kommentar im Spiel sagt seit Langem etwas anderes:

> ⚠️ BEKANNTER REST, bewusst so: der Ausleger ist auf 7,5 m Höhe 11,2 m breit […] der
> MASTFUSS steht bei beiden frei (>= 0,75 m), das Metall hängt 6 m darüber. Wer das
> „aufräumt", indem er den Mast verschiebt, macht es kaputt.

`th-echt.mjs` (neu) prüft dieselben Paare eine Ebene tiefer — **Mesh gegen Mesh**. Bei
einem Mast haben Fuss und Ausleger je einen eigenen Kasten, die T-Form löst sich damit
auf. Ergebnis: **null** Mesh-Kontakt zwischen Mast und Löschfahrzeug. Der Kommentar hatte
recht, der Pfosten auf meinem Screenshot war ein anderer.

### Die Triage

| | Kasten | Mesh | Urteil |
|---|---|---|---|
| Oberleitungsmast ↔ Löschfahrzeug | 2,5 m | **—** | Kasten-Artefakt |
| Kaimauer ↔ Hafenkran | 2,4 m | **—** | Kasten-Artefakt |
| Radlader ↔ Betonmischer | 1,8 m | **—** | Kasten-Artefakt |
| Pausenhofdach ↔ Fahrradständer (2×) | 1,2 m | **—** | Räder stehen unter dem Dach |
| Ahorn ↔ Müllcontainer, Ahorn ↔ Stadthaus | 1,1–1,2 m | **—** | Krone hängt darüber |
| Ahorn ↔ Birke, Birke ↔ Pappel | 1,1–1,2 m | 1,14–1,17 m | Kronen greifen ineinander — so soll es sein |
| bd_inn ↔ th8_laden_offen | 1,1 m | 1,08 m | Reihenhaus-Paar, gemeinsame Wand |
| Giebel ↔ Cube004 (2×) | 1,0 m | 1,00 m | Teile desselben Hauses |
| Eiche ↔ Blütenbusch, Seilbahnstation ↔ Fels, Materialstapel ↔ Rohbau, Birke ↔ Karussell | 1,1–1,7 m | 0,15–0,79 m | gewollt bzw. unter der Sichtbarkeitsschwelle |

**7 von 16 sind reine Kasten-Artefakte — darunter alle drei grössten.**

### Nichts verschoben, und warum

`bd_inn ↔ th8_laden_offen` ist mit 1,08 m über 13 Mesh-Paare die einzige echte
Durchdringung zwischen zwei *Gebäuden*, und beide sind nicht `fest` — der Entwirrer
hätte sie also bewegen dürfen. Auf dem Bild ist trotzdem kein Fehler zu sehen: die Stadt
baut dort ausdrücklich eine „geschlossene Stadtzeile mit gemeinsamer Bauflucht", und eine
gemeinsame Wand von 1 m ist dort richtig. **Ein Gebäude auf eine Zahl hin zu verschieben,
die man im Bild nicht wiederfindet, ist genau der Fehler, vor dem der Mast-Kommentar
warnt.** In `th-alle.mjs` steht die Zahl jetzt als Schwelle (≤ 9) — steigt sie, ist etwas
Neues dazugekommen.

## 2026-08-29 · 🎰 Zwölf Modelle hatten nie einen Raum — das erste betretbare Haus

Aus der Inventur blieb ein Posten offen: **th14, zwölf Innenraum-Modelle** (Bar,
Poker-, Roulette-, Kartentisch, Tanzfläche, Discokugel, DJ-Pult, Kronleuchter,
Spielautomat, Automatenreihe, Neonschild, Samtkordel). Sie lagen seit Langem im Repo
und hat nie jemand gesehen. Es fehlte **nicht die Einrichtung, sondern der Raum**.

Jetzt steht ein **Spielclub** bei (126|102) aus demselben `th34`-Baukasten wie die
Häuserzeile daneben: 16 × 12 m, ein Geschoss, Flachdach, Tür nach Süden, Kollider mit
Türlücke. Wände 4,00 m im x-Raster, Geschoss 3,00 m, Ecken auf (±8|±6).

### Was gemessen wurde, statt geraten

| | Messung | Ergebnis |
|---|---|---|
| Platz | `_viertelSolver.passt(cfg,x,z,2)` über x 90…140 / z 100…140 | 117 freie Stellen; **(126\|102)** die straßennächste (17 m) |
| Gelände | `_bergHoehe` über den Grundriss | 0,00 … 0,00 — eben |
| Türseite | Fahrbahn-Abstand in vier Richtungen | Süd 18 m, Ost 31, Nord 39, West 55 → Eingang nach Süden |
| Maßstab | Bounding-Box jedes th14-Modells | alle bereits in Metern (Bar 4,72 × 2,45, Tanzfläche 6 × 6) |

Weil `bau()` **über die Höhe** skaliert, steht als `zielH` die *gemessene Eigenhöhe* —
so bleibt der Maßstab 1:1. Nur zwei Ausnahmen, beide mit Grund: die Tanzfläche auf
5 × 5 (0,125 statt 0,15), damit an der Ostwand ein Gang für die Automaten bleibt, und
das 7,85 m hohe Neonschild auf 3,2 m, weil das Haus 3 m hoch ist.

### ⚠️ Die Platzsuche kennt den See nicht

Die drei nächstgelegenen Treffer überhaupt waren **(2|128)**, **(-12|128)** und
**(2|142)** — alle **im Seepark-See**. `viertelPasst` prüft Kollider, Straßen und Berge,
aber kein Wasser; das ist eine dokumentierte Lücke, an der schon der erste Wurf der
Baukasten-Zeile gescheitert ist (Haus im Wasser). Erst ein zusätzlicher Test gegen die
eine Uferlinie `window._seeUfer(winkel)` hat sie aussortiert — 223 Treffer wurden 130.

> Wieder Regel 9, andersherum: es gibt **eine** Quelle für das Ufer, aber die Platzsuche
> fragt sie nicht. Wer neu baut, muss sie selbst fragen.

### Neues Werkzeug `th-club.mjs` (Prüfung 19)

Der Club ist das erste Haus, dessen **Innenraum** zählt — damit zählen Fehler, die
draußen niemand sieht. Fünf Fragen: alle zwölf Teile da · jedes innerhalb der Wände ·
keine zwei auf demselben Fleck · Hängendes zwischen 2,0 und 3,0 m · `inSolid` in der
Türlücke falsch bei dichten Wänden ringsum.

⚠️ Die letzte Frage misst man am leichtesten falsch: `inSolid` ist nur in der äußeren
Schale (0,55 m) wahr. Wer mitten im Raum tastet, bekommt überall „frei" und hält eine
massive Wand für eine Tür. Darum wird auf der **Wandflucht** getastet.

⚠️ Und die Überschneidungsprüfung braucht die **Höhe** mit: ohne sie meldet die
Discokugel die Tanzfläche unter sich als Konflikt.

**Erster Lauf, ein echter Befund:** der Kronleuchter hing bis **1,80 m** herunter — über
dem Pokertisch fällt das nicht auf, beim Vorbeigehen schon. Auf 0,90 m gekürzt,
Unterkante jetzt 2,10 m. Danach alle fünf Prüfungen grün, 0 JS-Fehler.

---

## 2026-08-29 · Durch die Berghütte lief man hindurch — die Weihnachtsbuden müssen es bleiben

`th-mauern` meldet 13 Modelle ohne Kollider. Aufgeschlüsselt statt hingenommen:

| | Warum |
|---|---|
| 4× Seilbahn-Stütze, Kran | Gittermasten — man geht zwischen den Beinen durch, richtig so |
| 2× Spielturm, Schaukel | Spielgeräte, sollen offen sein |
| Flugzeug | 23,6 × 26,2 m — mehrdeutig, nicht angefasst |
| **Berghütte** | **12,8 × 12,8 m, 4,4 m hoch — ein echtes Gebäude** |
| 3× Weihnachtsbude | ⚠️ siehe unten |

### ⚠️ Die Weihnachtsbuden dürfen KEINEN Kollider bekommen

Sie hängen an `wbau()`, das `g.visible = W9()` setzt — **saisonal**. Ein fester Kollider
wäre im Sommer eine **unsichtbare Wand** mitten auf dem Marktplatz, wo nichts zu sehen
ist. Das ist schlimmer als das Hindurchlaufen. `WORLD_SOLIDS` kennt kein Entfernen, ein
saisonaler Kollider geht also gar nicht.

Dieselbe Falle wie bei `gruppenSicht`, das im Sommer den Skilift wieder einblendete.
**Vor jedem Kollider prüfen, ob das Modell saisonal ist.**

### Die Hütte

`stationSolid()` — dasselbe Mittel, das die Bergstation zwei Zeilen weiter oben schon
benutzt, auf derselben Terrasse. Kein neuer Präzedenzfall, obwohl Kollider 2D sind
(x/z, ohne Höhe) und damit auch den Hang darunter sperren.

**13 → 12 ohne Kollider.**

### ⚠️ `inSolid()` ist ein WAND-Test, kein Volumen-Test

Meine erste Gegenprobe tastete die Terrasse mit `inSolid` ab und meldete: Hüttenmitte
frei, **Stationsmitte auch frei** — als hätte gar nichts einen Kollider. Der Kommentar im
Spiel warnt genau davor:

> `inSolid()` ist ein WAND-Test […] liegt der Punkt mehr als 0,55 m von jeder Kante
> entfernt, gibt es `false` — damit die Figur in Räumen laufen kann. Für die Frage
> „steht hier ein Gebäude?" ist das die falsche Frage, und sie kostete schon einen
> Anlauf.

Sie kostete jetzt einen zweiten. **Für „steht hier etwas?" ist `imBau()` zuständig.**

### Die Gegenprobe, die zählt

Ein Kollider auf einer 28 × 22 m grossen Terrasse kann den Weg abschneiden. Also
Flutfüllung von der Stationsmitte aus, Raster 0,4 m:

**3506 von 3853 begehbaren Feldern erreichbar (91 %)**, und alle acht Landmarken —
Gipfelkreuz, beide Felsen, der Bereich *hinter* der Hütte, alle vier Terrassenränder.
Die fehlenden 9 % sind das Hütteninnere, das keine Tür hat: genau richtig.

`th-pruef` bestanden, `th-bewohner`: niemand steckt fest.

### Nachtrag: der Spielclub stand auf der Ringstrasse

Beim Zusammenführen mit `origin/main` fiel `th-pruef` durch — **nicht wegen der Hütte**.
Gegenprobe auf reinem `origin/main` ohne meine Änderung: **10 Bauteile im
Strassenkorridor**, alle vom neuen Spielclub.

Die Platzsuche prüft **den Punkt, nicht den Grundriss**. (126|102) ist frei — das Haus
ist aber 16 m breit, seine Westwand steht also auf x 118. „Ring O" läuft entlang z mit
Mitte x 112 und halber Breite 7,2, belegt also **x 104,8…119,2**. Überlappung: exakt
1,2 m, genau wie gemeldet.

`CX 126 → 128` setzt die Westwand auf x 120, 0,8 m neben die Korridorkante. Der Eingang
zeigt weiter nach Süden zur Strasse, die Verschiebung läuft quer dazu.

### ⚠️ Und dabei zweimal in dieselbe Falle getreten

`th-club.mjs` hatte `var CX=126, CZ=102` **fest verdrahtet** und meldete nach der
Verschiebung prompt fünf Möbel „ausserhalb des Raums" und dichte Wände als undicht —
während das Haus tadellos war. Genau die Falle, vor der `th-netz.mjs` seit #2339 warnt:
**Prüfpunkte aus der Welt, nicht aus dem Test.**

Beim Nachrüsten dann noch zwei eigene Fehler, beide erst durch Messen gefunden:

1. `window.WORLD_SOLIDS` gibt es nicht — es ist ein `var` im Spiel-Closure. Die Suche
   lief stumm ins Leere, der Test blieb rot.
2. **Das Mass allein ist nicht eindeutig:** 17 × 13 gibt es **zweimal**, das zweite bei
   (12|225,2). Die erste Fassung nahm den ersten Treffer und tastete ein ganz anderes
   Gebäude ab. Nur der Club hat zusätzlich eine **Türlücke** — danach wird jetzt
   gesucht, und der Test bricht laut ab, wenn nicht genau ein Kollider passt.

Danach: `th-club` ✅ alle fünf Prüfungen, `th-pruef` ✅ Korridor 0.

## 2026-08-29 · 👁️ Sechs grüne Messungen — und dann habe ich das Haus angesehen

Der Spielclub bestand alle sechs Prüfungen von `th-club.mjs`: alle zwölf Teile da, jedes
innerhalb der Wände, keine Überschneidung, Hängendes im Rahmen, Türlücke frei, Wände
dicht. Dann ein Bild mit `th-blick` und `th-augen` — und **drei echte Fehler**, die keine
dieser Messungen sehen konnte.

| Was das Bild zeigte | Ursache | Behoben |
|---|---|---|
| Ein 0,25-m-Spalt rings um das Haus zwischen Wandkrone und Dach | Wandmodule sind **2,75 m** hoch, nicht 3,00 — das Geschossraster 3,00 geht erst mit der 0,25 m dicken `th34_decke` auf | eine Lage `decke` auf y 2,75 |
| Das Dach sah aus wie **zwölf nebeneinandergestellte Tabletts** | `th34_dach_flach` ist 4,10 × **0,92** × 4,10: ein Feld mit umlaufender Attika. In einer Reihe (Stadthaus, 3 Stück) richtig; als 4×3-Block bringt jedes Modul seine eigene Brüstung mit | `dach_flach` raus, dieselbe `decke` ist Decke **und** Flachdach |
| Der Clubraum hatte **Rasen** als Fußboden | schlicht keiner gebaut | zweite Lage `decke` auf y −0,20, Oberkante 0,05 |

Und daran hing ein vierter, den erst die Deckenhöhe aufdeckte: **die Discokugel steckte
mit ihren obersten 25 cm im Dach.** Ich hatte mit Deckenhöhe 3,00 gerechnet — dem
*Raster*. Die Decke hängt aber an der *Wand*, und die ist 2,75 hoch. `th-club` benutzte
dieselbe falsche Zahl wie der Bau und meldete darum grün. Beide korrigiert.

### Was das Werkzeug daraus gelernt hat

Zwei neue Fragen, beide als **Strahl von oben**, weil eine Hüllbox das nicht beantwortet:

* *Liegt über jedem Messpunkt eine Decke?* → 2,99 · 3,00 · 3,00 · 3,00 · 3,00 m
* *Liegt unter jedem Messpunkt ein Fußboden?* → 0,04 · 0,05 · 0,12 · 0,05 · 0,05 m
  (Gras wäre 0,00; die Platte liegt auf −0,20, Oberkante 0,05, Gelände hier flach 0,00 —
  die Schwelle 0,03 liegt zwischen beiden Werten und auf keinem von ihnen, Regel 5)

⚠️ **Zwei Fallen in diesen zwei Fragen, beide selbst hineingetreten:**

1. Ein Strahl gegen `scene.children` **stirbt** mit „Cannot read properties of null
   (reading matrixWorld)" — irgendwo hängt ein Objekt, das three beim Raycast nicht
   anfassen kann. Erst eine eigene Zielliste (echte Meshes mit Geometrie *und* Material,
   Hüllbox über dem Club) macht es lauffähig — und nebenbei viel schneller.
2. Der **erste** Treffer des Bodenstrahls ist nicht der Boden. Der erste Lauf meldete an
   zwei von fünf Punkten **1,879 m und 1,10 m** — das sind die Bar und ein Tisch. Die
   Prüfung war grün und hätte einen Rasenboden unter einem Tisch nie bemerkt. Jetzt zählt
   nur der oberste Treffer **unter 0,30 m**.

> **Die Regel, die dieser Tag hinzufügt:** eine Messung prüft, was man ihr aufträgt —
> nicht, ob das Haus aussieht wie ein Haus. Für alles Gebaute gilt: **erst messen, dann
> ansehen.** `th-augen` und `th-blick` kosten je zwei Minuten und haben hier vier Fehler
> gefunden, an denen sechs grüne Häkchen vorbeigelaufen sind.

Belegbilder im Repo: `spiele-dev/screenshots/club-aussen.png` und `club-innen.png`.

## 2026-08-29 · 💃 Der Club war Kulisse — jetzt kann man darin tanzen (und ihn finden)

Nach Regel 11 zuerst **angesehen**, was bisher nur gemessen wurde: Flughafen (300|−260)
und Fähr-/Frachtkai (−150|95) per `th-blick`. Beide in Ordnung, kein Befund — Terminal,
Tower, Rollbahn mit Markierung; Frachter, Steg, Kaimauer, Leuchtturm. Ehrlich notiert:
**diese Runde hat der Blick nichts gefunden.** Das macht Regel 11 nicht schwächer; sie
kostet zwei Minuten und hat beim Club vier Fehler gefunden.

Der eigentliche Befund lag woanders: **der Spielclub war Kulisse.** Man kam hinein und
konnte nichts tun — und man fand ihn ohnehin nicht, weil er 130 m ausserhalb steht und
auf keiner Karte stand.

### Zwei kleine Änderungen, beide aus dem, was es schon gibt

1. **Die Tanzfläche startet das Tanz-Minispiel.** Dasselbe `tanzStart()`, das zu Hause
   die Stereoanlage auslöst — kein neues Spiel, keine neue Bedienung. **Tippen, nicht
   Drüberlaufen:** ein Minispiel, das anspringt, wenn man einen Raum durchquert, wäre
   ein Übergriff. Dazu ein Hinweis beim ersten Betreten der Fläche, weil sie sonst
   aussieht wie Boden.
2. **Marke + Lieferziel „💃 Spielclub".** Der Satz aus der Marken-Liste — *„Ein Viertel,
   das man nicht findet, ist so gut wie nicht gebaut"* — galt hier genauso. Jetzt steht
   er auf der Karte und der Blitz-Lieferauftrag schickt einen hin. Feste Koordinaten,
   weil er kein `viertel()` ist und `marke()` ihn also nicht nachzieht.

### ⚠️ Und wieder Regel 9: EINE Quelle

Die Tanzfläche ist ab jetzt **Möbel und Bedienelement zugleich**. Ihre Lage ein zweites
Mal hinzuschreiben hätte sie beim ersten Umzug des Clubs auseinanderlaufen lassen —
genau der Fehler, der in dieser Sitzung sechsmal auftrat (Bergform, Uferlinie,
Viertelmass, Bahnsteigkante, `light.visible`, LOD-Schwelle). Darum:

```js
window._club={x:CX, z:CZ, tanzX:CX+2.5, tanzZ:CZ+2.5, tanzR:2.6};
```

`th-club.mjs` prüft das jetzt als **achte** Frage — und zwar gegen die *wirkliche*
Fläche, nicht gegen die Zahl: Versatz zwischen `_club.tanzX|tanzZ` und der Hüllbox-Mitte
des gesetzten `th14_tanzflaeche` **0,00 m**, Radius 2,6 bei Halbmass 2,5 (der Auslöser
darf nicht über die Fläche hinausragen), und `tanzStart()` setzt `TANZ.on`. Die Probe
räumt hinter sich auf (`TANZ.on=false`, `cancelAnimationFrame`, Overlay zu).

**Gemessen:** th-club 8/8 · th-netz 38 ok · th-marken: Marke *und* Lieferziel „Spielclub"
liegen **3,1 m** an einem echten Modell (0 verdächtige Marken) · 0 JS-Fehler.

---

## 2026-08-29 · Die Bedienung im Querformat vermessen statt angeschaut

Der User spielt auf dem Handy im **Querformat (844 × 390)**. Dort ist es eng, und schon
einmal lag eine Ecken-Plakette genau auf dem Joystick — gefunden nur, weil jemand
hingeschaut hat. `th-hud.mjs` (neu) misst das jetzt: Rechtecke aller sichtbaren
Bedienelemente, Elemente ausserhalb des Bildes, Tippziele unter 44 px.

### Befund: ein einziger

**Der Bauen-Knopf war 38 px hoch** — das einzige Bedienelement unter dem üblichen
Fingermass. Die Landscape-Regel setzte `min-height:38px` bewusst, weil zwischen Radar
und Joystick nur eine schmale Lücke bleibt.

Diese Begründung gilt aber nicht mehr: `layoutLinkeSpalte()` **misst** die Lücke und
setzt den Knopf **neben das Radar**, wenn er nicht dazwischen passt (deshalb stand er
gemessen bei x = 138 statt bei den 12 px aus dem CSS). Also darf er wieder 44 px hoch
sein — passt er nicht mehr in die Lücke, weicht er von selbst zur Seite aus. Regel und
Messung widersprechen sich nicht.

Danach: 844×390, 740×360, 932×430, 390×844, 1024×768 — **überall 0 Ziele unter 44 px,
0 Elemente ausserhalb des Bildes.**

### ⚠️ Drei Fehler im Werkzeug, alle beim Messen aufgeflogen

1. **Der Viewport war nie gesetzt.** Ich gab `breite`/`hoehe` mit — die Option heisst
   `viewport`. Das Werkzeug mass stillschweigend im 1100 × 620-Standard weiter und
   meldete Elemente bei x = 1100 in einem angeblich 844 breiten Bild. Dazu gehört
   `screen`: das Spiel entscheidet über `_mobil` daran, nicht am Fenster.

2. **Container sind keine Überdeckung.** Der erste Lauf meldete zwölfmal
   „#wrap über X" — `#wrap` ist eine bildschirmfüllende Ebene und liegt unter allem.

3. **⚠️ „Überdeckung" ist überhaupt die falsche Frage.** Zwei Kästen dürfen sich
   überlappen; was zählt, ist **wer den Tipp bekommt**. Jetzt misst das Werkzeug
   `elementFromPoint` in der Mitte jedes Bedienelements. Damit fielen alle
   Fehlalarme von selbst weg — und in Hochkant zeigt sich sauber, dass `#rotHint`
   („dreh dein Handy") **alle** Ziele abfängt. Fängt ein und dasselbe Element alle ab,
   ist es die gewollte Sperrschicht und kein Befund; das meldet das Werkzeug jetzt so.

---

## 2026-08-29 · Die Mission, bei der man nicht wusste WANN

Statt wieder zu prüfen, habe ich die Missionen einmal wie ein Spieler durchgesehen.

**Erst zwei Entwarnungen, beide gemessen:** Alle 13 Missions-Zähler werden irgendwo
erhöht — keine Mission ist unerfüllbar. Und von den 13 haben 11 einen Kartenmarker; die
zwei ohne (Emotes, Strassenmusik) sind es zu Recht, der Kommentar im Code sagt das seit
Langem.

### Der Befund liegt genau dazwischen

Die Strassenmusik ist **die einzige Mission mit einem Zeitfenster** (`buskAvailable()`:
17–21 Uhr) — **und die einzige ohne Ort**. Wer sie morgens zieht, sieht die Aufgabe,
keinen Marker, und findet den Knopf nirgends. Es gab keine Stelle im Spiel, an der
„ab 17 Uhr" stand.

Die Aufgabe sagt *was*, der Marker sagt *wo* — und *wann* sagte niemand.

Jetzt steht das Fenster im Missionstext selbst: „Spiele 1 perfekte Strassenmusik-Show
**(17–21 Uhr)**". Dort schaut der Spieler ohnehin hin. (Der Text wird beim Anlegen in den
Spielstand kopiert; laufende Tage behalten den alten, ab dem nächsten Tageswechsel steht
das Fenster drin.)

### Stehende Prüfung statt Einmal-Blick

`th-missmap.mjs` prüft jetzt bei jedem Lauf, dass **jede** Mission einen Ort hat — oder
in einer Ausnahmeliste mit **Grund** steht. Und die Gegenrichtung: eine Ausnahme, die es
nicht mehr braucht (die Mission hat inzwischen einen Ort), wird gemeldet, damit die Liste
nicht verrottet.

Gegenprobe: einen Ort testweise aus `MISS_ORTE` entfernt →
**❌ „4 🛹 Lande {n} Airtime-Sprünge", 9 ok / 1 Fehler.** Die Prüfung kann rot werden und
benennt die Mission.

---

## 2026-08-29 · Zeigt das Spiel irgendwo „NaN"?

Auf der Webseite hat genau diese Frage zwei echte Fehler gefunden („NaN % über Brutto"
im Arbeitgeberkosten-Rechner, dazu eine Zeile mit veralteten Zahlen). Das Spiel rechnet
an viel mehr Stellen — Geld, Stufe, Bedürfnisse, Uhr, Missionen — und jede Division kann
durch null gehen. Also dieselbe Frage hier.

`th-zahlen.mjs` (neu) liest den **sichtbaren** Text der Bedienoberfläche — nicht den
Code, sondern was der Spieler liest — zu neun Zeitpunkten: nach dem Start, bei Geld 0 /
negativ / einer Milliarde, und über einen ganzen Spieltag (0, 6, 12, 18, 23 Uhr).

**Ergebnis: 102 Textstellen, 0 mit NaN/Infinity/undefined, 0 JS-Fehler.** Sauber.

### ⚠️ Und die Gegenprobe hätte fast gelogen

Ein Prüfer, der nichts findet, muss beweisen, dass er etwas finden *kann*. Erster
Sabotage-Versuch: eine Division durch null an den **Anfang** von `updHUD()` gesetzt →
**der Test blieb grün.** Ich hätte daraus fast geschlossen, das Werkzeug sei blind.

Es war die Sabotage, die nicht wirkte: die echte Zuweisung weiter unten in derselben
Funktion überschrieb meinen Wert wieder. Zweiter Versuch an der richtigen Stelle
(Zeile 13157, wo `#geld` tatsächlich gesetzt wird) →

```
❌ Uhr 12:00: geld → "💰 NaN"
❌ 102 Textstellen geprueft · 9 mit NaN/Infinity/undefined
```

**Regel: Wenn die Sabotage nicht anschlägt, ist zuerst die Sabotage verdächtig — nicht
das Werkzeug.** Sonst wirft man einen funktionierenden Test weg.

---

## 2026-08-29 · Läuft im Spiel etwas voll? Nein — und zweimal falsch gemessen dabei

Das Ruckeln hatte eine Ursache im Nachladen (#2401). Eine zweite, die sich für den
Spieler gleich anfühlt, wäre ein **Leck**: Objekte, Geometrien oder Texturen, die
entstehen und nie verschwinden. Nach zwanzig Minuten wird das zäh, und beim
Programmieren merkt es niemand. `th-leistung` nimmt nur eine Momentaufnahme; über die
Zeit hat nie jemand gemessen.

`th-wachstum.mjs` (neu) misst alle 15 Sekunden und beurteilt den **Trend**.

**Ergebnis über 5 Minuten: kein Leck.** Objekte, Meshes, Materialien, Texturen und
Programme netto ±0, Geometrien +5.

### ⚠️ Fehler 1: „monoton gestiegen" ist kein Leck

Der erste Lauf meldete **sechs** Lecks. Tatsächlich waren es +1 Objekt und +18 Meshes
über drei Minuten — die Welt, die fertig lädt, und ein Tier, das auftaucht. Mein
Kriterium („nie kleiner geworden und am Ende grösser") flaggt alles, was einmal wächst.

Ein Leck wächst **stetig**; Nachladen flacht ab. Also die Rate der ersten gegen die der
zweiten Hälfte stellen — nur wenn es am Ende noch zulegt, ist es eines.

### ⚠️ Fehler 2: zwei Sorten Zahlen in einen Topf geworfen

Danach blieb ein Befund: Zeichenaufrufe 384 → 429. Aber **Zeichenaufrufe sind kein
Bestand** — sie messen das letzte Bild und steigen und fallen mit dem, was gerade zu
sehen ist. Die letzten drei Messungen fielen bereits wieder (435 → 432 → 429): Verkehr,
der durchs Bild fuhr.

Jetzt getrennt: **Bestände** (Objekte, Meshes, Geometrien, Texturen, Programme,
Materialien) können lecken und werden beurteilt; **Pro-Bild-Werte** (Zeichenaufrufe,
Dreiecke) werden nur zur Einordnung ausgewiesen.

### Die Gegenprobe

20 Objekte je Sekunde ins Spiel injiziert:

```
❌ kinder       4961 → 7021  Rate 1. Hälfte 295,00 · 2. Hälfte 293,33  → LECKVERDACHT
❌ meshes      62634 → 64694  dito
❌ materialien  4882 → 6942  dito
```

**Die gleichbleibende Rate über beide Hälften ist genau das Kennzeichen, das ein Leck
vom Nachladen unterscheidet** — und das Kriterium erkennt es.

Nebenbei belegt: Geometrien blieben flach, weil die Objekte weit ausserhalb standen und
nie gezeichnet wurden. `renderer.info.memory` zählt, was auf der Grafikkarte liegt,
nicht was in der Szene hängt — zwei verschiedene Fragen.

⚠️ **Nicht in `th-alle.mjs` aufgenommen:** ein Lauf dauert über fünf Minuten. Das
Werkzeug ist zum gezielten Nachsehen da, nicht für jeden Durchgang.
