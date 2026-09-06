# Nachtrag 01.08.2026 — der Füllgrad der Rot-Regel ist zu streng

Ergänzt `BEFUNDE-2026-07-31.md`. Beobachtet an einem Stadtbild vom 01.08.:
an der linken Symbolspalte stehen Abzeichen mit **3**, **7** und **2**, auf
„Nachricht" eine **3** — und keines davon wird angetippt. Genau das, was der
Benutzer mit „ohne rote Punkte" gemeint hat.

## Die Rechnung

Am 31.07. habe ich `roter-punkt-pruefen` von `min_fuellung` 0.60 auf **0.75**
gesetzt, weil die Regel zehnmal in Folge bei 0.82 auf dieselbe Stelle griff,
ohne dass etwas passierte.

Ein Kreis füllt sein umschliessendes Rechteck aber nur zu **π/4 ≈ 0.785**. Das
ist die theoretische Obergrenze für ein rundes Abzeichen — und sie gilt nur für
einen *vollständig* roten Kreis. Steht eine weisse Zahl darin, fehlen weitere
10 bis 20 Prozentpunkte:

| Abzeichen | geschätzter Füllgrad | bei 0.75 |
|---|---|---|
| leerer roter Punkt | 0.78 | greift |
| Punkt mit einstelliger Zahl | 0.65–0.70 | **fällt durch** |
| Punkt mit zweistelliger Zahl | 0.60–0.65 | **fällt durch** |

Die Schwelle liegt also genau zwischen „leer" und „mit Zahl". Ausgerechnet die
Abzeichen mit Zahl sind die interessanten — die Zahl sagt ja, wie viel dort
wartet.

## Was zu tun ist

`min_fuellung` auf **0.62** setzen, in `config/last-asylum.json` bei
`roter-punkt-pruefen`. Damit sind ein- und zweistellige Abzeichen drin, und
grössere zusammenhängende rote Flächen (Banner, Warnstreifen) bleiben draussen.

Das Aufschaukeln, gegen das die 0.75 gedacht waren, ist inzwischen anders
gelöst: seit `6dad0a7` bremst sich jede Regel nach **fünf** Treffern in fünf
Minuten selbst aus, unabhängig vom Bild. Der Füllgrad muss die Aufgabe also
nicht mehr miterledigen — er soll nur noch unterscheiden, was ein Knopf ist und
was nicht.

## Die allgemeine Lehre

Ein Schwellenwert, der gegen ein *Verhalten* (Endlosschleife) gesetzt wird,
statt gegen die *Sache* (ist das ein Abzeichen?), trifft fast immer das
Falsche. Die Schleife gehört von der Schleifen-Bremse abgefangen, der Füllgrad
soll nur die Form beschreiben.

Beim nächsten Mal zuerst fragen: welchen Wert hat das Ding, das ich treffen
will, wirklich? Bei einem Kreis ist die Antwort 0.785 minus dem, was die
Beschriftung wegnimmt.

## Nebenbei bestätigt

Im selben Bild laufen vier Ausbildungszelte mit 20:30, 15:55, 11:46 und 07:02
Restzeit. `soldaten-ausbilden` arbeitet also, und der blaue „Trainieren"-Knopf
wird genommen, nicht der orange „Jetzt trainieren", der Bezahlung verlangt.
