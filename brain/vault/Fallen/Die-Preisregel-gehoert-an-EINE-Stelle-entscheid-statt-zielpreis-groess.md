---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Die Preisregel gehoert an EINE Stelle: entscheid() statt zielpreis groesser Preis

GEMESSEN 2026-09-27: mein handgeschriebenes Blockskript fuer die Hundeprodukte entschied nach 'zielpreis(ek) > preis' und wollte damit sieben Varianten mit 40,7 Prozent Marge anheben - also Preise, die das Ziel von 38 Prozent laengst erfuellen. Es ist genau die Unschaerfe, die am 20.09. in automation/preis_korrektur.mjs behoben wurde: ein Preis kann zwischen zwei Sprossen der Leiter stehen und gesund sein. Die Korrektur steckte im Katalogskript, nicht in den Blockskripten, und jede Runde schreibt ihr Blockskript neu. Behoben an der Wurzel: tools/varianten_preis.mjs exportiert jetzt entscheid(preis, kosten) mit den Faellen unbekannt / in_ordnung / setzen / melden, 38 Selbsttests. Jedes Blockskript ruft das auf statt das Kriterium neu zu schreiben. Selbstpruefung ueber alle 1148 gesetzten Katzen-Varianten: 0 zu Unrecht angefasst - aber das war Glueck, die Katzenbaender endeten bei 37,9 Prozent, die Luecke kam dort nie vor. Die Grenze liegt nachgerechnet bei Einkauf 11.1042 fuer einen Preis von 19.90, also exakt 38,0000 Prozent.

Verwandt: [[Hypothese-mit-Datum]]
