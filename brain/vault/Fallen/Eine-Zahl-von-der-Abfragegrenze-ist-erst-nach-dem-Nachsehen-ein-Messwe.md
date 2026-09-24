---
tags: [falle, teuer-gelernt]
quelle: CLAUDE.md Stand 2026-09-22
gelernt: 2026-09-24
---
# Eine Zahl von der Abfragegrenze ist erst nach dem Nachsehen ein Messwert

retro-arbeitsschuhe (15450036765057) hat 55 Varianten. Die Abfrage mit first:50 lieferte kosten_max 35.63, und weil die Grenze erreicht war, habe ich das Produkt bewusst zurueckgehalten statt einen moeglicherweise zu tiefen Preis zu setzen. Die Nachmessung ueber alle 55 (first:100, hasNextPage false) ergab GENAU DIESELBEN 35.63 - die 50er-Grenze hatte den Hoechstwert zufaellig schon erfasst. Meine Vorsichtsannahme war also falsch. Zurueckhalten war trotzdem richtig: wissen konnte ich es nicht. LEHRE: eine Zahl, die an einer Abfragegrenze entsteht, ist so lange kein Messwert, bis man ohne die Grenze nachgesehen hat - und die Aufloesung ist billig (eine zweite Abfrage), waehrend ein zu tief gesetzter Preis live Geld kostet. Gesetzt wurden dann 55 Varianten auf zwei Stufen (59.90 / 64.90), beide waren im Verlust.

Verwandt: [[Hypothese-mit-Datum]]
