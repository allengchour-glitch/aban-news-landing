# 🎬 Bilder → Werbevideo — was gemessen wurde und was daraus gebaut ist (2026-09-23)

**Auftrag (User):** „lerne noch wie man bilder in video macht für super werbung video und teile memory."

Jeder Punkt ist markiert als **GEMESSEN** (selbst nachgeprüft), **QUELLE** (fremde Behauptung mit
Herkunft) oder **BEHAUPTUNG** (Vermutung, nicht belegt).

---

## 1. Der Bestand war besser als gedacht — und hatte trotzdem einen Konstruktionsfehler

**GEMESSEN:** `dropship/ads/` enthält **48 Render-Skripte**, davon **18 mit `zoompan`** (Ken Burns).
Der Kniff gegen das Ruckeln ist dort bereits gelernt und steht in `render_premium_reel.sh` Zeile 33:
die Quelle wird auf **2160×3840 hochskaliert, bevor `zoompan` rechnet**, damit x/y auf einem feinen
Raster landen (sub-pixel-glatt). Dieses Wissen war schon da — es musste nicht neu erfunden werden.

**GEMESSEN:** Die 105 Reels in `reels/` sind durchweg **1080×1920, 30 fps, ~17,3 s**, Bitrate
2,9–4,2 Mbit/s. Technisch sauber.

**GEMESSEN — der Konstruktionsfehler:** `dropship/ads/auto_render.sh` reicht an
`render_premium_reel.sh` durch, und das öffnet mit einer **3,0 s langen Marken-Karte**
(off-white `0xf4f3f1`, Wortmarke, Goldlinie). Das Produkt erscheint erst danach.

---

## 2. Das Messgerät: `tools/video_hook.mjs` (17 Selbsttests)

Gebaut, weil „das Intro ist zu lang" ein Gefühl ist und „das Produkt erscheint bei 2,7 s" eine Zahl.

Verfahren: Einzelbilder im 0,1-s-Raster abtasten, jedes auf 32×32 verkleinern, den Anteil der Pixel
zählen, die der Marken-Hintergrundfarbe entsprechen. Über der Schwelle = noch Karte, darunter =
Produkt. Der erste Zeitpunkt darunter ist der **Produkt-Einstieg**.

**Gegenproben, ohne die die Zahl wertlos wäre:**
- knapp **innerhalb** der Farbtoleranz zählt, knapp **ausserhalb** zählt nicht (sonst misst die
  Toleranz nichts);
- **ein einziger** abweichender Farbkanal genügt zum Ausschluss;
- genau **auf** der Flächenschwelle = Karte, ein Prozentpunkt darunter = Produkt;
- ein **späterer Rückfall** auf die Karte (das Outro) darf den Einstieg nicht verschieben;
- **kein Bild ergibt UNBEKANNT, nicht 0** — dieselbe Regel wie beim SEO-Feld am 12.09.

**GEMESSEN (Teilmessung 21 von 105 Reels, Rest lief nach):** der Produkt-Einstieg liegt bei
**2,5 s / 2,7 s / 2,8 s — bei 21 von 21 also jenseits von 2,5 Sekunden.**

---

## 3. Was die Quellen sagen — und wo sie unserem Bestand widersprechen

**QUELLE** (Recherche 23.09., mehrere unabhängige Branchentexte 2026):
- Die **ersten 3 Sekunden** entscheiden, ob eine Videoanzeige läuft. Die Kennzahl dafür heisst
  *Hook Rate* (3-Sekunden-Aufrufe ÷ Impressionen).
- Ausdrücklich: **mit dem Produkt öffnen, nicht mit einer Logo-Animation.**
- **85 PROZENT der Meta-Videoaufrufe laufen ohne Ton** → der Text muss im Bild stehen.
- Gut laufende kurze vertikale Anzeigen sind **7–15 s** lang.
- TikTok selbst: der Haken muss in den ersten 6 s sitzen, die Aussage in den ersten 3 s.

**Der Widerspruch, und er ist gemessen, nicht geglaubt:** unsere Reels verbrennen das gesamte
3-Sekunden-Fenster auf die Marken-Karte und sind mit 17,3 s länger als das empfohlene Fenster.

**Einordnung, damit niemand die fremden Zahlen für gesichert hält:** „85 PROZENT ohne Ton" und
„+10–25 PROZENT ATC durch Produktvideo" (letzteres aus der Runde vom 13.09.) sind **QUELLE**, nicht
am eigenen Shop gemessen. Am eigenen Bestand messbar ist bisher nur der Produkt-Einstieg.
**Eine eigene Bestätigung gibt es nur über einen A/B-Vergleich, und der braucht Reichweite** —
also die drei User-Klicks aus §10 des Runbooks.

Was **deckungsgleich** ist: die Quelle verlangt Text im Bild statt Stimme — genau das steht seit
2026-06-12 als feste User-Regel in `dropship/VIDEO-PRAEFERENZEN.md` („KEIN Voiceover"). Die
Präferenz des Users ist hier also nicht Geschmack, sondern nebenbei auch die Empfehlung.

---

## 4. Das Werkzeug: `automation/produkt_werbevideo.mjs` (64 Selbsttests)

Macht aus den **Bildern EINES Produkts** ein Werbevideo. Das ist die Lücke, die am 19.09. gemessen
wurde: `auto_render.sh` baut Montagen aus **mehreren** Produkten (`[ "$k" -ge 2 ] || exit 0`) — auf
einer Produktseite zeigt so ein Video fremde Ware. Für die Produktseite braucht es eins je Produkt.

**Was es anders macht als die bestehenden Renderer:**

| | bestehende Reels | `produkt_werbevideo.mjs` |
|---|---|---|
| Produkt sichtbar ab | **2,5–2,8 s** (gemessen) | **0,0 s** (gemessen) |
| Marke | 3,0 s am **Anfang** | 2,0 s am **Ende** |
| Länge | 17,3 s | **12,0 s** (Fenster 7–15 s) |
| Inhalt | mehrere Produkte | **ein** Produkt |
| Preis im Bild | nein | **auf jedem Segment** |
| Kamerafahrt | immer Zoom auf die Mitte | **vier Fahrten im Wechsel** |
| Deckblatt | — | Poster-JPG aus Sekunde 0,4 |

**Sechs Regeln, jede durch einen Selbsttest gesichert:**
1. **Kein Preis = UNBEKANNT**, nie `CHF 0.00` (`preisText(null) === null`).
2. **Prozentzeichen wird ausgeschrieben** — `%` verschwindet in `drawtext` still
   (`VIDEO-PRAEFERENZEN` §3). Emoji fliegen raus, sie fehlen in DejaVu.
3. **Gesamtlänge bleibt im Fenster 7–15 s**, für 1 bis 8 Bilder einzeln geprüft.
4. **Vier Segmente = vier verschiedene Kamerafahrten**, danach wiederholt es sich.
5. **HTTP 429/430/503 = Drosselung, nicht „Bild fehlt"** → wiederholen; 404 heisst wirklich weg.
6. **Dasselbe Bild mehrfach ist erlaubt, dieselbe Fahrt nicht** (siehe §5).

**Zugangsdaten braucht es keine.** **GEMESSEN:** `https://luxestyle.ch/products/<handle>.js` liefert
Titel, alle Bild-Adressen und die Variantenpreise in Rappen — ohne Token. Damit läuft das Werkzeug
in jeder Session sofort, anders als `preis_korrektur.mjs` und `homepage_slim.mjs`, die seit Tagen
auf `SHOPIFY_CLIENT_ID`/`_SECRET` warten.

---

## 5. Zwei eigene Fehler, beide von der jeweiligen Gegenprobe gefangen

### (a) Ein Selbsttest fiel um — und er hatte recht, nicht der Code
Bei **einem** Produktbild ergab die Rechnung 4,85 s Gesamtlänge, also unter der 7-s-Grenze. Die
Versuchung wäre gewesen, die Grenze im Test zu lockern. Stattdessen ist der Renderer repariert:
`segmentFolge()` lässt ein einzelnes Foto **dreimal** laufen — aber mit **verschiedener
Kamerafahrt**. Genau so werden Ein-Foto-Anzeigen gemacht. Die Gegenprobe prüft ausdrücklich, dass
die drei Segmente drei *unterschiedliche* Fahrten bekommen; dreimal dieselbe wäre eine Diaschau.

### (b) 🔴 Das Messgerät mass das Falsche — gefunden, weil ich HINGESEHEN habe
Die erste Fassung deckelte den Haken auf **34 Zeichen**. Der Selbsttest war grün, die Zahl stimmte,
und das Ergebnis war trotzdem kaputt: **der Text lief links und rechts aus dem Bild.**

**Die Ursache, jetzt gemessen:** „Taktische Outdoor Warnweste für" sind 31 Zeichen und bei 60 px
**über 1080 px breit** — breiter als das ganze Bild. Bei `x=(w-text_w)/2` ragt so eine Zeile auf
beiden Seiten hinaus. **Zeichenzahl ist nicht Breite.**

**Behoben:** `textBreite()` misst die Pixelbreite **mit ffmpeg selbst**, also mit genau dem Zeichner,
der den Text später malt — kein Schätzwert, keine Zeichentabelle. Darauf setzen `umbrechen()`
(Wortgrenzen, höchstens zwei Zeilen) und `passendeGroesse()` (schrumpft, bis es passt) auf.
Gegenproben: doppelte Schriftgrösse muss **rund doppelte** Breite ergeben (gemessen 2,00), ein zu
breites **Einzelwort** wird nicht zerschnitten, und der konkrete 31-Zeichen-Titel muss bei 60 px
nachweislich über 1080 px liegen.

**Die Lehre, und sie ist grösser als dieser Fall:** ein grüner Selbsttest beweist nur, dass der Code
tut, was der Test prüft. Ob der Test das Richtige prüft, sieht man erst am Ergebnis. **Bei allem
Sichtbaren gehört ein Blick auf das fertige Bild dazu** — dieselbe Klasse wie „Kundensicht statt
API-Antwort" (13.09.) und „Diff lesen, nicht die Zahl" (07.09.).

---

## 6. Was jetzt geht, und was nur der User kann

**Geht sofort, ohne Zugangsdaten:**
```
node automation/produkt_werbevideo.mjs <handle> [<handle> ...]
node tools/video_hook.mjs reels/*.mp4        # nachmessen
```
Erzeugt je Produkt `reels/produkt-<handle>.mp4` (Musik-Fassung), `-clean.mp4` (leises Tonbett,
damit in der App der Trend-Sound darübergelegt werden kann — Trend-Sounds dürfen nie eingebrannt
werden) und `produkt-<handle>.jpg` als Deckblatt. Rechenzeit rund **45 s je Produkt**.

**🟡 NUR DER USER:**
- **Video an die Produktseite hängen:** der Weg ist am 13.09. vorgeprüft und braucht **keinen**
  Theme-Zugriff (`stagedUploadsCreate` → `PUT` → `productUpdate` mit der `resourceUrl`), aber er
  braucht `SHOPIFY_SHOP` / `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`. **Dieselben drei Werte
  lösen zusätzlich `preis_korrektur.mjs` und `homepage_slim.mjs`** — ein Handgriff, drei Baustellen.
- **Ob es wirkt, lässt sich ohne Reichweite nicht messen** (drei User-Klicks, Runbook §10).

**⛔ Bewusst NICHT getan:** die 105 bestehenden Reels neu rendern. Sie sind Marketing-Montagen für
den Feed und dort nicht falsch; der gemessene Mangel betrifft das Hook-Fenster, nicht die Datei.
Wer sie ersetzen will, misst vorher, ob die Feed-Zahlen das hergeben — bei drei Abonnenten und
1248 Sessions/30 T ist das keine belegte Verbesserung, sondern Rechenzeit.
