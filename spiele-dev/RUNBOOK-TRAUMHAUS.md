# 🏙️ RUNBOOK TRAUMHAUS — Karte der Datei und alle teuer gelernten Regeln

> Für jede Session, die `traumhaus.html` anfasst. **Zuerst lesen.** Die Datei ist
> ~600 kB in einer einzigen IIFE; ohne diese Karte sucht man lange und tritt in
> Fallen, die hier schon einmal Stunden gekostet haben.

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
