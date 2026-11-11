# Pia: Reihe «Warum vegan leben?» (Kurzfolgen, je rund 27 Sekunden)

Stand 11.11.2026. Der Besitzer schrieb «pia vegan weiter machen ode besser» und danach «ja, warum man vegan leben sollte
und friedlich wird,». Auslegung (meine, nicht bestätigt): die Serie weiterführen, aber besser; jede Folge nennt einen Grund
für veganes Leben und endet mit dem Gedanken, dass die Welt so ein Stück friedlicher wird.

**Alles hier ist Entwurf zur Freigabe. Nichts ist veröffentlicht oder eingeplant. Nichts wird ohne das Ja des Besitzers veröffentlicht.**

## Warum Kurzfolgen

Gemessen am 11.11.2026 um 15:37 UTC an den öffentlichen YouTube-Seiten (Kanal `@piasfriedlichewelt`, 1 Abonnent):

| Folge | veröffentlicht (Zürich) | Länge | Aufrufe | Likes |
|---|---|---|---|---|
| 1 «Was steckt hinter meinem Essen? Pia fragt nach» | 08.11. 21:45 | 27,8 s | 69 | 0 |
| 2 «Pia deckt den Tisch für alle» | 09.11. 12:00 | 37,6 s | 87 | 1 |

Das ist für einen neuen Kanal ohne Abonnenten die übliche erste Probe und noch kein Urteil (zwei Folgen, zwei bis drei Tage).
Wie lange Zuschauer dranbleiben, zeigt nur YouTube Studio; Metricool lieferte am 11.11. je Video noch keine Werte.

Drei Dinge fielen beim Ansehen der Folgen auf (Bild für Bild, Kontaktbögen):

1. **Der Anfang ist leer.** Folge 2 beginnt mit einem schwarzen Bild (Einblenden), Folge 1 zeigt in der ersten Sekunde eine
   leere Wiese. Bei Shorts entscheidet das erste Bild, ob jemand weiterwischt (Annahme aus der Praxis, nicht von YouTube belegt).
2. **Folge 3 (`../pia-folge3`, nie veröffentlicht) ist mit 115,7 Sekunden rund dreimal so lang** wie die ersten zwei Folgen
   und trägt sieben Zahlen. Für einen Kanal ohne Publikum ist das ein Vortrag.
3. **Das Schild verdeckt Pias Stirn**, sobald die Kamera nah ist (Anfangs- und Schlussszene von Folge 3).

## So ist eine Folge gebaut

- Das **erste Bild ist voll hell** und stellt die Frage: «Warum vegan leben? Grund N: …». Die Stimme setzt nach 0,25 s ein.
- **Ein Grund je Folge**, eine oder zwei Zahlen, jede mit Quelle in `fakten.md`. Sechs kurze Sätze, rund 27 Sekunden.
- Die Schilder tragen die Aussage auch ohne Ton (viele sehen Shorts stumm).
- Der **Schluss ist immer derselbe Gedanke**: «So wird die Welt ein Stück friedlicher.» Das ist Pias Wertung, keine Messung.
- Ton der Serie (`../youtube-kanal/wissen-vegan.md`): klar gegen das System, freundlich zu Menschen, ohne Befehlsform.
  Keine Gesundheitsaussagen.
- **Leise Hintergrundmusik, zwei feste Stücke.** Der Besitzer hörte am 11.11.2026 vier Mixkit-Stücke unter Folge 1 und
  wählte zwei: «a und b, du kannst die nächste weiter runter dimmen musik lautstärke». A = «Sleepy Cat» (Klavier, Mixkit 135),
  B = «Forest Treasure» (Natur-Klänge, Mixkit 138). `bauen.sh` nimmt bei ungerader Folge A, bei gerader B, und legt die Musik
  bei −32 LUFS unter die Stimme (−16 LUFS); unter der Stimme duckt sie zusätzlich. Die Shop-Reels sind davon nicht betroffen:
  dort bleibt die Musik ausgesetzt, bis der Besitzer etwas anderes sagt.
- Mixkit-Lizenz («Mixkit Stock Music Free License», auf jeder Seite der Stücke genannt): frei auch für kommerzielle Videos,
  ohne Namensnennung; das Stück selbst nicht weitergeben. Darum liegen die Dateien nicht im Repo: `bauen.sh` lädt sie
  bei Bedarf nach `ausgabe/musik/` (in `.gitignore`).
- Wichtige Inhalte liegen zwischen 15 und 75 Prozent der Bildhöhe (oben und unten liegen in der YouTube-App Bedienflächen;
  diese Zone ist eine Annahme, nicht gemessen).

Technisch nutzt jede Folge die zehn fertigen Bühnen von `../pia-folge3/szene.html`. `anlegen.py` schreibt daraus die Szene
der Kurzfolge (elf gezielte Änderungen, jede mit Anker): sie spielt nur die Bühnen aus `stimme.txt`, wechselt Bühne und
Kamera im selben Bild, beginnt ohne Schwarz und liest Kamera, Karten und Kartenlage aus `folge.js`. `../pia-folge3` bleibt unverändert.

## Folge 1: «Warum vegan leben? Grund 1: die Tiere» (`../pia-warum-1-tiere`, 27,0 s)

| Bühne | Satz (Stimme) | Schild | Karte |
|---|---|---|---|
| S1 Teller | Warum vegan leben? Pias erster Grund: die Tiere. | Warum vegan leben? Grund 1: die Tiere | |
| S5 Wiese | Über achtzig Milliarden Landtiere werden jedes Jahr für Fleisch geschlachtet. | Über 80 Milliarden Landtiere im Jahr | 83 Mrd., für Fleisch geschlachtet (2022) |
| S5 | Das sind rund zehn für jeden Menschen. | Rund 10 für jeden Menschen | Zähler 1 bis 10, die Hühner erscheinen einzeln um Pia |
| S5 | Und auch sie fühlen Schmerz. | Auch sie fühlen Schmerz | |
| S10 Teller | Für einen pflanzlichen Teller wird kein Tier geschlachtet. | Pflanzlich: kein Tier geschlachtet | 0, Tiere geschlachtet für einen pflanzlichen Teller |
| S10 | So wird die Welt ein Stück friedlicher. | So wird die Welt ein Stück friedlicher | |

Vorschlag für die Veröffentlichung (erst nach dem Ja des Besitzers):

- Titel: Warum vegan leben? Grund 1: die Tiere
- Beschreibung: Warum vegan leben? Pias erster Grund: die Tiere. Über 80 Milliarden Landtiere werden jedes Jahr für Fleisch
  geschlachtet (2022: 83 Milliarden), das sind rund zehn für jeden Menschen. Für einen pflanzlichen Teller wird kein Tier
  geschlachtet. Quelle: Our World in Data (Daten der Welternährungsorganisation). Musik: «Sleepy Cat», Mixkit (Lizenz ohne
  Namensnennung). Stimme und Bilder sind computererzeugt.
- Hashtags: Shorts, vegan, Pia. Kennzeichnung «veränderte oder synthetische Inhalte»: Ja. Nicht für Kinder. Kategorie Film und Animation.
- Weg: Metricool, Marke «Pias friedliche Welt» (`7967118`), YouTube-Short, wie Folge 1 und 2.

## Die nächsten Gründe (Plan, noch nicht gebaut)

| Folge | Bühnen | Grund | Zahl und Schlussgedanke |
|---|---|---|---|
| 2 | S2, S8, S10 | das Land | Rund drei Viertel der Agrarfläche gehören Tieren. Modellrechnung: bei pflanzlicher Ernährung statt 4 nur etwa 1 Milliarde Hektar (neu gelesen am 11.11., 16:26 UTC: «A reduction of 75%», «an area the size of North America and Brazil combined»). Mehr Platz für Wälder und wilde Tiere |
| 3 | S6, S10 | das Klima | Essen verursacht etwa ein Viertel der weltweiten Treibhausgase |
| 4 | S3, S4, S10 | das Futter | 77 Prozent der Sojabohnen werden verfüttert, 7 Prozent landen direkt auf dem Teller; rund 70 Prozent des entnommenen Süsswassers fliessen in die Landwirtschaft |

Jede braucht ihren eigenen Text, die Kamera der ersten und letzten Szene und die Quellen aus `fakten.md` und
`../pia-folge3/fakten.md` (vor jeder Veröffentlichung die Seite neu öffnen).

**Messen statt raten:** nach vier bis sechs Folgen in drei Wochen entscheiden die Zahlen aus YouTube Studio (Aufrufe, «angesehen
gegen weggewischt», durchschnittliche Wiedergabedauer), ob die Reihe so weiterläuft. Bis dahin ist jede einzelne Zahl Rauschen.

## Bauen

```
cd video-pipeline/motion3d
npm install                                              # three.js
python3 -m pip install edge-tts                          # Stimme
python3 -I projekte/pia-warum/anlegen.py pia-warum-1-tiere   # szene.html neu schreiben (nach Änderungen an der Vorlage)
bash projekte/pia-warum/bauen.sh pia-warum-1-tiere       # Stimme, Zeiten, Render, Ton → ausgabe/pia-warum-1-tiere.mp4
MUSIK=b bash projekte/pia-warum/bauen.sh pia-warum-1-tiere --nur-ton   # nur den Ton neu (andere Musik), ohne neuen Render
```

`MUSIK` ist `a`, `b`, `ohne` oder ein Dateiname in `automation/music`; `MUSIK_LUFS` (Vorgabe −32) macht die Musik lauter
oder leiser.

Hinter einem Proxy `EDGE_CA_BUNDLE=<Zertifikatsbündel>` setzen. Der Lauf in der Cloud (Software-WebGL) braucht für rund 810
Bilder etwa eine halbe Stunde; mit Grafikkarte `WEBGL=gpu`. Standbilder zur Kontrolle (rund 2,5 s je Bild):
`node ../motion/render.mjs projekte/pia-warum-1-tiere/szene.html --webgl sw --vorschau 0,2.9,8.5,14.8,17.6,20.5,25.1 --outdir ausgabe/probe`.

Eine neue Folge: Ordner `projekte/pia-warum-N-thema` anlegen lassen (`anlegen.py` schreibt Muster für `stimme.txt` und
`folge.js`), Text und Einstellungen setzen, `bauen.sh <ordner> --nur-zeiten`, Standbilder ansehen (Gesicht frei? Karten
verdecken nichts? erstes Bild hell?), dann der volle Lauf.

### `stimme.txt`

Je Zeile, mit Tabulator getrennt: Bühne (`S1` bis `S10`), Satz für die Stimme, Text des Schildes. Aufeinanderfolgende Zeilen
derselben Bühne bleiben in einer Szene. Jede Bühne darf nur einmal vorkommen.

### `folge.js` (setzt `window.__FOLGE`, wird nach `zeiten.js` geladen)

| Feld | Bedeutung |
|---|---|
| `kamera: { S5: [[u, Ort, Blickpunkt, Bildwinkel], …] }` | Kamera einer Bühne; `u` ist der Anteil der Szenendauer (0 bis 1). Ohne Eintrag gilt die Kamera aus Folge 3 |
| `karten: { S5: ({ zahl, tl, D }) => [[gross, klein, von, bis], …] }` | Karten einer Bühne; `von` und `bis` in Sekunden der Szene (`bis` ist freiwillig), `zahl(ziel, tl, start, dauer)` zählt hoch |
| `kartenTop: { S5: [1230, 1410, 1590] }` | Oberkante der drei Karten in Pixeln (Bild 1080 × 1920) |
| `huehnerAb`, `huehnerTakt` | Bühne S5: ab welcher Sekunde und in welchem Takt die zehn Hühner erscheinen |

Die Zeiten der Sätze stehen in `window.__ZEITEN` (aus `zeiten.js`); `folge.js` der Folge 1 rechnet daraus, wann die Kamera
nach oben fährt und wann die Hühner erscheinen.

## Offen und ungemessen

- Der Ton wurde nie gehört (in dieser Umgebung gibt es kein Gehör): gemessen ist nur die Lautheit.
- Stimme: `edge-tts` ist ein inoffizieller Zugang zum Vorlesedienst von Microsoft Edge; eine Lizenz für veröffentlichte
  Videos ist nicht belegt (so steht es schon in `../../../motion/stimme_edge.py`). Entscheid des Besitzers.
- Darstellung in der YouTube-App (Bedienflächen über dem Bild) ist nicht gemessen.
- Ob ein heller Anfang, die Frage als erstes Bild und die kürzere Form mehr Zuschauer halten, zeigt erst die Veröffentlichung.
- `anlegen.py` hat keinen eigenen Test: es bricht ab, wenn ein Anker fehlt oder doppelt vorkommt, mehr prüft es nicht.
  Kontrolle sind die Standbilder.
