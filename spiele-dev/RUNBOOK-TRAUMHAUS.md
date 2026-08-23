# 🏙️ RUNBOOK TRAUMHAUS — Karte der Datei und alle teuer gelernten Regeln

> Für jede Session, die `traumhaus.html` anfasst. **Zuerst lesen.** Die Datei ist
> ~600 kB in einer einzigen IIFE; ohne diese Karte sucht man lange und tritt in
> Fallen, die hier schon einmal Stunden gekostet haben.

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
