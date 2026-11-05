# Pia und die Frage nach dem Essen — Szenenplan (ca. 28 s, 1080×1920)

Thema: friedliche Welt, Hauptthema vegane Ernährung. Aufbau nach dem Rezept des Referenzvideos (The AI Blueprint, «Claude + Google Flow = Full Stickman Animations on Autopilot 2.0»): kleine Figur, Problem, Wendepunkt, klare Antwort; jede Sprecherzeile beschreibt genau ihre Szene; eine Stimme, dieselbe Figur in jeder Szene; Szenenlänge = Länge der Sprecherzeile.

Der gesprochene Wortlaut und die Bildschirmtitel stehen nur in `stimme.txt` (eine Quelle der Wahrheit). Die Zeiten rechnet `bauen.sh` daraus (`zeiten.js`).

| Szene | Inhalt | Bild und Bewegung |
|---|---|---|
| 1 Wunsch | Pia wünscht sich eine Welt, in der niemand leidet | Pia geht ins Bild, reisst die Arme hoch, hüpft, Herz |
| 2 Frage und Fakt 1 | Beim Frühstück fragt sich Pia nach dem Essen; Fläche gegen Kalorien | Denkblase mit Fragezeichen, dann Infografik mit zwei Balken |
| 3 Fakt 2 | Zahl der jährlich geschlachteten Landtiere | Zähler 0 bis 83, 83 graue Punkte (je einer eine Milliarde), Pia sorgenvoll |
| 4 Antwort | Pflanzliche Gerichte als kleine Entscheidung für Mitgefühl | Pia kocht am Lagerfeuer im Abendrot, Gemüsekorb, Glühwürmchen, Herz |

Stil nach dem Referenzvideo (Vorschaubilder gelesen, Video selbst nicht gesehen): grosse weisse Rundkopf-Figur mit Kritzelhaar und Handschuh-Händen im geflickten Gewand, Bilderbuch-Welt (Weizen, Tannen, Berge, Abendrot, Lagerfeuer), gelbe Textschilder. Die Welt ist eine handgezeichnete Vektor-Annäherung, kein KI-Gemälde.

Ton: einladend, ohne Zeigefinger. Keine Gesundheitsversprechen, keine Schockbilder. Zahlen gerundet («rund», «etwa», «über») und nur mit Quelle, siehe `quellen.md`.

Bauen (aus `video-pipeline/motion`): `bash projekte/vegan-pia/bauen.sh` (Stimme, Zeiten, Render, Mix; ca. 5 Minuten). Nur Vorschau: `--nur-zeiten`, dann `node render.mjs projekte/vegan-pia/szenen.html --vorschau 2,8,15,24`.
