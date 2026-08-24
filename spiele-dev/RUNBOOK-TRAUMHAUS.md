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

## 🎯 Sollwerte einer sauberen Szene

| Messwert | Soll |
|---|---|
| Objekte im Straßenkorridor | 0 |
| Größte Überschneidung | ≈ 6,3 m (Bergstation ↔ oberste Seilbahnstütze, gewollt) |
| Fehlende Modelle (404) | 0 |
| JS-Fehler | 0 |
| Zeichenaufrufe | < 2000 |
