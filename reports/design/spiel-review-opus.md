# Traumhaus — Art-Direction-Review

Grundlage: 12 Screenshots (Handy quer, 844x390) und Lesen von `traumhaus.html` (15'668 Zeilen).
Nichts geändert.

Vorbemerkung: das Spiel ist technisch weit besser als es aussieht. Was fehlt, ist keine
Arbeit, sondern eine **Entscheidung** — es gibt keine Stelle im Code, an der jemand gesagt
hat "so sieht Traumhaus aus". Genau das liest ein Betrachter als "KI-generiert": nicht
schlechte Qualität, sondern das Fehlen einer Handschrift.

---

## 1. Warum es KI-generiert wirkt

**1. Emoji statt Ikonografie — durchgehend, auch dort, wo es weh tut.**
Zeilen 241–249 und 289–301: Geld, Uhr, Pokal, Bauen, Ego-Kamera, Zoom, Emote, Ping,
Verstecken, Werkzeuge, Tacho — jedes Bedienelement trägt ein Betriebssystem-Emoji.
Auf `hud-844x390.png` zählt man in der Kopfzeile allein acht verschiedene Emoji-Stile
(Geldsack, Uhr, Kirschblüte, Koffer, Herz, Augen, Medaille). Emoji werden vom Gerät
gerendert: auf iOS anders als auf Android, in einer fremden Farbwelt, mit fremden
Konturstärken. Ein Spiel, dessen komplette Ikonografie vom Betriebssystem kommt, kann
per Definition nicht wie ein Produkt aussehen. Auch in 3D: `simEmoji()` (11778) und
`hearts()` (12420) zeichnen Emoji per `fillText` in eine Canvas-Textur.

**2. 25 verschiedene Farbverläufe auf den Knöpfen — und kein einziger in der Marke.**
Gemessen: `grep` findet 25 unterschiedliche `linear-gradient(...)`-Paare. Auf einem
einzigen Bildschirm konkurrieren Pink/Orange (`#ff8c5a→#e85aa0`, Bauen-Palette),
Blau/Violett (`#5a9af0→#7a6af0`, modeBtn), Grün (`#8fd86a→#5aba3a`), Türkis, Weinrot,
Dunkelviolett. Jeder Knopf wurde einzeln eingefärbt, keiner im Verhältnis zu den anderen.
Die Website-Marke (`index.html`, `--amber:#d97706`, `--cream:#fef3c7`) kommt im Spiel
genau einmal vor, zufällig: `#geld{color:#b8860b}`. Ein Mensch, der eine Marke hat,
benutzt sie.

**3. Alles ist aus demselben Material.**
`stdMat()` (Zeile 546) ist mit 199 Aufrufstellen der dominante Pfad und setzt
**keine `metalness`** — `MeshStandardMaterial` nimmt dann 0 — bei fester
`roughness:0.8` und `envMapIntensity:0.35`. Ergebnis: Fassade, Bahnschiene, Oberleitung,
Blechdach, Autolack, Gehsteig und Baumstamm haben exakt dieselbe Oberflächenantwort.
Auf `stadt-3-bahnhof.png` sieht man es am deutlichsten: der Oberleitungsmast, das
Bahnhofsdach und der Asphalt reflektieren identisch. Die Stadt wirkt aus einem Stück
Knete gefräst. (31 Stellen setzen `metalness` bewusst — Wasser, Geländer, Autos —, das
sind die Ausnahmen, die den Regelfall beweisen.)

**4. Auf dem Handy gibt es keine Schatten, also klebt nichts am Boden.**
Zeile 482: `var _schattenAn=!_mobil;` — auf dem Zielgerät sind Schatten komplett aus.
`spieler-4c-auto-flach.png` heisst nicht zufällig so: das Auto steht nicht auf der Wiese,
es liegt davor. Dasselbe bei jedem Baum in `spieler-7-uebersicht.png`. Kontaktschatten
sind das billigste und stärkste Mittel, um "Objekt gehört in diese Welt" zu sagen — und
es fehlt genau auf dem Gerät, auf dem gespielt wird. Der Code-Kommentar dazu ist ehrlich
(ein nicht reproduzierbarer Bildfehler), aber die Folge bleibt.

**5. Die Nacht ist keine Nacht.**
`stadt-7-altstadt-nacht.png` zeigt 21:31 Uhr — und cremeweisse Fassaden in voller
Sättigung, dieselbe Marktkuppel wie um 08:14. Im Loop (14928 ff.) steht sehr sorgfältige,
messgestützte Arbeit an Sonne, Hemisphäre und Belichtung; sie kämpft aber gegen
`envMapIntensity` in three.js r128 (14944: `scene.environmentIntensity` gibt es dort
nicht) und gegen einen bewusst hoch gesetzten Nacht-Sockel. Für den Betrachter zählt nur
das Bild: die Welt hat einen Zustand, nicht zwei. Ein Cozy-Game lebt vom Umschlag.

**6. Hinweistexte im Erklärbär-Ton.**
`hint()`-Beispiele: "Erst im Garten ernten — dann kauft die Markthalle dir die Ware ab."
(`stadt-2-altstadt.png`), "Stick: hoch Gas · runter Bremse · seitlich lenken"
(12065, steht bei *jeder* Fahrt wieder da, siehe `spieler-5-fahrt.png` und
`hud-844x390-fahrt.png`), "Nur noch 1 Karriere-Level bis 'Aufsteiger'!" (10555),
"Aufgewertet auf Stufe 3 — wirkt besser & steigert den Haus-Wert!" (11197). Das sind
Bedienungsanleitungen, keine Spielsprache. Dazu die Länge: `hint()` (14404) hält Texte
bis zu 9 Sekunden — je länger der Satz, desto länger steht er im Bild.

**7. Generische Namen, überall.**
`WORLD_POIS` (670): "Grosser Park", "Brunnen-Park", "Villen Ost", "Villen West",
"Gewerbe Ost", "Stadthaeuser Ost", "Sportpark", "Freizeitpark". Das sind Kategorien mit
Himmelsrichtung, keine Orte. Die Bewohner heissen Max und Mia (11704, 11600). Die
Passanten sagen "Schoenes Wetter heute, nicht wahr?" und "Ich warte auf den Bus."
(12857). Die Erfolge (10440) heissen "Wohlhabend / 10.000 $ besessen", "Mobil / Ein Auto
gekauft" — die Beschreibung wiederholt die Bedingung. Nichts davon hat einen Ort, einen
Dialekt oder eine Meinung. Namen sind das billigste Stück Handschrift überhaupt, und hier
sind sie Platzhalter geblieben.

**8. Kamera und Ton stehen still.**
`camA=0.8, camB=0.78, camR=44`, FOV 46 (12770). `camera.updateProjectionMatrix()` kommt
im ganzen File genau einmal vor — im `resize`-Handler (15232). Es gibt kein Nicken, kein
Rütteln, keine Brennweitenänderung beim Beschleunigen, keinen Nachlauf. Deshalb sehen
alle zwölf Screenshots aus wie derselbe Blick: gleicher Winkel, gleiche Distanz, ob
Villenviertel, See oder 52 km/h Autofahrt. Der Ton ebenso: `beep()` (14532) ist ein
einzelner Oszillator ohne Attack, 90-mal aufgerufen, vier Wellenformen — das ist die
gesamte Klanggestaltung. Ohne Kamera- und Tonreaktion fühlt sich jede Handlung gleich
folgenlos an.

*(Nebenbefund: zwei Vignetten liegen übereinander — `#vign` in Zeile 239 und `_vig` in
494. Beide sind gleichzeitig aktiv.)*

---

## 2. Die acht wirksamsten Massnahmen

Sortiert nach Wirkung pro Aufwand. "Cool" entsteht aus drei Dingen: **Identität**
(eine Palette, ein Licht, eine Typo), **Feedback** (Kamera, Partikel, Ton reagieren) und
**Details, die erkennbar ein Mensch entschieden hat**. Massnahme 1–3 ist Identität,
4–7 ist Feedback und Materialität, 8 ist Handschrift.

### 1. Eine Palette, ein Akzent (grösster Effekt, null Laufzeitkosten)

25 Verläufe auf 3 Rollen eindampfen. Oben im `<style>`:

```css
:root{
  --creme:#fdf6e6; --creme-2:#f3e6cc;
  --bernstein:#d97706; --bernstein-dk:#b45309; --bernstein-lt:#fde9c8;
  --tinte:#241c12; --tinte-70:rgba(36,28,18,.72);
}
```

Regel, die man durchhält: **Bedienelemente sind Creme auf Tinte oder Tinte auf Creme.
Bernstein bedeutet genau eine Sache — "das ist die Handlung, die jetzt zählt".** Pro
Bildschirm höchstens ein bernsteinfarbener Knopf. Also: `#modeBtn` bekommt
`background:var(--bernstein)` (flach, kein Verlauf), alle Kontextknöpfe
(`npcBtn`, `shopBtn`, `werkBtn`, `markthalleBtn`, `kircheBtn`, `coasterBtn`, `coupBtn`,
`buskBtn`, `growBtn`, `crimeBtn`, `fahrtBtn`) werden identisch:
`background:var(--creme);color:var(--tinte);box-shadow:0 6px 20px rgba(36,28,18,.3)`.
Verläufe komplett raus — ein flacher Ton wirkt teurer als ein Verlauf, sobald es mehr als
drei davon gibt. `.pcat.on` und `.pitem.on` von Pink auf `--bernstein`.
Ausnahmen mit Absicht: Fahndung/Polizei bleibt rot, Nitro bleibt orange — das sind
Alarmfarben, und sie funktionieren nur, solange nichts anderes bunt ist.
**Handy-Kosten: 0.** Weniger `linear-gradient` heisst sogar minimal weniger Compositing.

### 2. Ein Licht statt drei Korrekturen

Aktuell: `toneMappingExposure` aus dem Tagesverlauf, plus CSS
`filter:saturate(1.07) contrast(1.03)` (Zeile 492), plus zwei gestapelte Vignetten.
Das ergänzt sich nicht, es neutralisiert sich.

- `#vign` (Zeile 239) ersatzlos löschen, nur die JS-Vignette behalten.
- Filter schärfen: `saturate(1.05) contrast(1.07)`.
- **Eine Farbstimmung darüber**, als einzige Composite-Schicht:

```js
var _tint=document.createElement("div");
_tint.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:2;"+
  "mix-blend-mode:soft-light;transition:background .8s linear";
// im Tag/Nacht-Loop, nur wenn sich dayA spürbar ändert (>0.05):
_tint.style.background = dayA>0.5
  ? "rgba(217,119,6,.10)"      // Tag: bernsteinwarm — die Marke im Bild
  : "rgba(28,44,84,.16)";      // Nacht: kaltes Blau, Laternen stechen heraus
```

Das ist der stärkste Einzelhebel nach der Palette: die Marke steht dann nicht nur auf den
Knöpfen, sondern *im Licht*. **Handy-Kosten: eine Composite-Schicht, kein Render-Target,
kein zusätzlicher Draw-Call** — messbar unter 0,3 ms, weil der Browser sie ohnehin schon
für Vignette und Filter zusammensetzt.

Zusätzlich am Nebel drehen: `scene.fog` teilt sich (14976) die Farbe mit dem Himmel.
Für Tiefe die Nebelfarbe um einen Hauch **heller und wärmer** als den Himmel setzen
(`fog.color.copy(skyC).lerp(new THREE.Color(0xffe9c4),0.12)`) — ein Trick aus jeder
Stilisierung: Luftperspektive braucht einen Farbversatz, nicht nur Deckkraft.

### 3. Kontaktschatten auf dem Handy (behebt das "alles schwebt")

Die abgeschalteten Schatten nicht wieder anschalten — das war die richtige Entscheidung.
Stattdessen ein Blob-Schatten als **eine einzige `InstancedMesh`**:

```js
// 64x64 Canvas: radialer Verlauf schwarz -> transparent
var blobM=new THREE.MeshBasicMaterial({map:blobTex,transparent:true,
  opacity:0.30,depthWrite:false,color:0x1a2418});
var blobs=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),blobM,400);
// pro Objekt: rotation.x=-PI/2, y=0.02, scale = Grundriss * 1.25
```

Auf Spieler, Auto, Bäume, Möbel und Passanten anwenden — Grösse und Deckkraft aus dem
Grundriss, bei Sprüngen (`carAirT`) Deckkraft runter und Fläche grösser. **Kosten:
1 Draw-Call, 400 Matrizen, ein 64er Texture-Lookup.** Das ist ein bis zwei Grössenordnungen
billiger als eine Schattenkarte und liefert 80 % der Bodenhaftung.

Ergänzend, falls Messung es erlaubt: die echte Schattenkarte **nur fürs Grundstück**
wieder an — `mapSize 512`, `shadow.camera` auf ±34 statt ±85 (Zeile 536). Dort schaut man
genau hin, und 512 Texel auf 68 m sind 7,5 pro Meter, also schärfer als heute am Desktop.
Ehrlich: das kostet auf einem Mittelklasse-Telefon 1–2 ms pro Bild. Erst die Blobs,
dann messen, dann entscheiden.

### 4. Emoji raus aus der Bedienung, rein in die Welt

Ein Satz von etwa 14 Inline-SVG-Glyphen (Münze, Uhr, Hammer, Pokal, Auge, Plus, Minus,
Sprechblase, Karte, Kiste, Schlüssel, Tacho, Herz, Stern), einheitlich:
`stroke:currentColor; stroke-width:1.75; fill:none; stroke-linecap:round`, 24x24 viewBox,
als `<symbol>`-Sprite ganz oben im `<body>`, Nutzung per `<svg><use href="#i-geld"/></svg>`.
Damit erbt jede Ikone die Textfarbe und passt automatisch zur Palette aus Massnahme 1.
**Kosten: rund 2 KB Markup, keine Netzwerkanfrage, keine Bilddatei.**

Emoji **bleiben** an genau zwei Stellen, und dort sind sie dann eine Aussage statt eine
Verlegenheit: die Gedankenblasen der Bewohner (`simEmoji`) und die Emote-Leiste. Das ist
das Sims-Zitat — es funktioniert nur, wenn es das einzige Emoji im Bild ist.

### 5. Materialdisziplin — die Stadt bekommt Oberflächen

`stdMat()` um `metalness` erweitern und den Cache-Schlüssel mitziehen:

```js
function stdMat(c,rough,einzeln,metal){
  var r=rough!==undefined?rough:0.8, mt=metal!==undefined?metal:0.04;
  ...
  m=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:mt});
  m.envMapIntensity=(mt>0.3?0.75:0.5);
```

Dann gezielt vergeben — bewusst **wenige Stufen**, damit der Materialcache klein bleibt:

| Was | roughness | metalness |
|---|---|---|
| Putzfassade, Holz, Stoff | 0.85 | 0.04 |
| Dachziegel, Asphalt, Beton | 0.92 | 0.0 |
| Blechdach, Geländer, Laternenmast, Schiene, Ladenschild | 0.32 | 0.70 |
| Autolack | 0.28 | 0.35 |
| Glas / Schaufenster | 0.10 | 0.20 |

Dazu die `envMapIntensity` von pauschal 0.35 auf 0.5 (matt) bzw. 0.75 (metallisch) —
die HDR-Umgebungskarte wird ohnehin geladen (Zeile 512), sie wird bisher nur nicht
genutzt. Und `WANDF` (3049) um zwei Nachbartöne pro Eintrag streuen
(`new THREE.Color(f).offsetHSL((Math.random()-0.5)*0.02,0,(Math.random()-0.5)*0.05)`) —
acht exakt gleiche Fassadenfarben in einer ganzen Stadt sind der sichtbarste
Generator-Verrat.

**Handy-Kosten: null zusätzliche Draw-Calls.** `metalness` ist eine Uniform im bereits
kompilierten Standard-Shader. **Warnung, ernst gemeint:** die Kommentare bei Zeile 538
haben recht — jedes *neue* Material ist ein Sortier-Hindernis. Darum maximal fünf
Rauheits-/Metall-Kombinationen, alle über denselben Cache. Wer hier frei streut, macht
aus 40 Materialien wieder 4000.

### 6. Juice — fünf kleine Eingriffe, die das Spiel "antwortend" machen

a) **Kamera-Nicken.** Ein globales `var camKick=0;`; bei Möbelplatzierung, Münze, Erfolg,
Aufprall: `camKick=0.014`. In `updCam()`: `camB+=camKick; camKick*=0.86;`. Vier Zeilen,
und plötzlich hat jede Handlung Gewicht.

b) **Brennweite beim Fahren.** In der Fahrschleife:
`var zf=46+Math.min(10,Math.abs(carSpeed)*0.28); if(Math.abs(camera.fov-zf)>0.08){camera.fov+=(zf-camera.fov)*0.08;camera.updateProjectionMatrix();}`
Die Schwelle ist Pflicht — `updateProjectionMatrix()` in jedem Bild baut die Matrix neu.
Tempo wird dadurch spürbar, ohne dass sich am Fahrmodell etwas ändert.

c) **Geld zählt hoch statt zu springen.** `#geld` bekommt einen Zielwert und nähert sich
in ~250 ms an, dazu `transform:scale(1.06)` für 120 ms. Zusammen mit
`font-variant-numeric:tabular-nums` (siehe 7) zappelt die Zahl dabei nicht.

d) **Ton.** `beep()` bekommt eine Anstiegsrampe statt eines harten Einsatzes
(`g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.008);`) — das nimmt das
Klicken heraus. Für Erfolge einen Dreiklang statt eines Tons (drei Oszillatoren, +0/+4/+7
Halbtöne, 40 ms versetzt), für Aufpralle ein kurzes Rauschen aus einem `AudioBuffer`.
**Kosten: null Assets, drei Oszillatoren für 200 ms.**

e) **`hint()` bekommt die Feder des Erfolgs-Toasts.** Der `achToast` hat bereits
`transition:transform .5s cubic-bezier(.2,1.2,.4,1)` — `#hint` (Zeile 207) blendet
dagegen nur `opacity .3s`. Dieselbe Kurve, ein `translateY(8px)→0`: gleiche Sprache für
alle Einblendungen.

### 7. Eine Typo — und Ziffern, die stehen

Ohne CDN keine Webfont. Das ist kein Hindernis, sondern eine Entscheidungshilfe: zwei
Stapel statt einem.

```css
body{font-family:system-ui,"Segoe UI",Roboto,sans-serif}       /* Fliesstext, bleibt */
.titel,#geld,#uhr,#spNum,.overlay h1,#achToastTxt,.pitem .pp{
  font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  font-variant-numeric:tabular-nums; letter-spacing:.01em;
}
```

Eine Serife für Zahlen, Ortsnamen und Überschriften, serifenlos für alles andere: das
ist der klassische Cozy-/Aufbau-Griff (Stardew, Unpacking, Dorfromantik) und er
funktioniert mit Systemschriften. `tabular-nums` ist der eigentliche Gewinn — Geld, Uhr
und Tacho hören auf zu zappeln. `.overlay h1` verliert dabei den dreifarbigen
Verlaufstext (`#ff8c5a→#e85aa0→#7a6af0`, Zeile 30); Tinte auf Creme mit einem
bernsteinfarbenen Punkt ist ruhiger und teurer. **Kosten: 0.**

### 8. Namen und Ton — schweizerdeutsch-nüchtern statt Kategorie plus Himmelsrichtung

Die billigste Handschrift im ganzen Projekt. Konkrete Tauschliste für `WORLD_POIS` (670):

| jetzt | Vorschlag |
|---|---|
| Grosser Park | Rütiwiese |
| Brunnen-Park | Brunnenmatt |
| Villen Ost / Villen West | Sunnehalde / Rebhalde |
| Gewerbe Ost | Werkareal |
| Stadthaeuser Ost | Chriesigarten |
| Seepark | Seeacher |
| Sportpark | Allmend |

Hinweistexte: kürzer, einmal, ohne erhobenen Zeigefinger.
- statt "Stick: hoch Gas · runter Bremse · seitlich lenken" bei jeder Fahrt →
  **beim ersten Mal** "Stick hoch: Gas. Runter: Bremse." und danach nie wieder
  (ein Flag im Spielstand).
- statt "Erst im Garten ernten — dann kauft die Markthalle dir die Ware ab." →
  "Ohne Ware kauft hier niemand."
- statt "Aufgewertet auf Stufe 3 — wirkt besser & steigert den Haus-Wert!" →
  "Stufe 3. Sieht man."

Passanten (`NPC_SPRUECHE`, 12857) bekommen eine Meinung statt Small Talk:
"Die Baustelle da hinten steht seit drei Jahren." · "Für das Geld? Nie im Leben." ·
"Grüezi." · "Am See isch besser." Erfolgsnamen (10440) dürfen aufhören, die Bedingung
zu wiederholen: "Wohlhabend / 10.000 $ besessen" → **"Es langt / 10 000 auf dem Konto"**;
"Mobil / Ein Auto gekauft" → **"Endlich nicht mehr laufen"**. **Kosten: 0, reine
Textarbeit** — und der Punkt, an dem ein Spieler merkt, dass hier jemand gesessen ist.

---

## 3. Was gut ist und bleiben soll

- **Der Himmel.** Verlaufskuppel mit 256-Zeilen-Textur, Dithering gegen Streifenbildung,
  22 Wolkenballen als eine `InstancedMesh` (4285 ff.). Das ist echte Handarbeit und der
  beste Teil des Bildes. Nicht anfassen.
- **Der zoomabhängige Nebel** in `updCam()` (12773): nah Stimmung, weit draussen freie
  Sicht. Eine kluge, sehr spielerfreundliche Entscheidung.
- **Ziehende Wolkenschatten** (948, 15120) — genau die Art Detail, die "gebaut, nicht
  generiert" signalisiert. Mehr davon, nicht weniger.
- **Der Tag/Nacht-Loop selbst** ist sauber gebaut und messgestützt begründet; das Problem
  ist die three.js-Version, nicht die Logik. Beim Umbau die Kommentare ab 14900 lesen —
  sie stehen dort zu Recht.
- **Die Handy-Performance-Arbeit:** dynamische Auflösungsstufen (`_rrStufen`),
  Materialcache (4071 → wenige), gekapptes Pixelratio, mitwandernde Schattenbox.
  Alle acht Massnahmen oben sind absichtlich so gewählt, dass sie dieses Budget nicht
  angreifen.
- **Das HUD-Layout.** Ausgemessen für 844x390, 44-px-Fingerziele, keine Rahmen
  (Trennung über Schatten), ausweichende linke Spalte. Die Massnahmen betreffen Farbe,
  Ikonen und Typo — die **Geometrie bleibt, wie sie ist.**
- **Der Inhalt.** 25 Orte, Zug mit Halt, Achterbahn, Lieferaufträge, Verstecken, Angeln,
  Kochen, Wetter und Jahreszeiten. Das ist mehr Spiel als bei den meisten Vorbildern.
  Es ist nur schlecht angezogen.
- **Die Kommentarkultur im Code** (Messwerte, widerlegte Annahmen, "nicht weiter runter").
  Das ist der Grund, warum dieses Review überhaupt so konkret werden konnte.
