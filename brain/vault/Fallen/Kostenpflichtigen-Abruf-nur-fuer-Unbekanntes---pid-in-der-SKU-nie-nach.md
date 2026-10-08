---
tags: [falle, teuer-gelernt]
quelle: dropship/VERTRAUEN-TAG9-2026-10-08.md
gelernt: 2026-10-08
---
# Kostenpflichtigen Abruf nur fuer Unbekanntes - pid in der SKU nie nachschlagen

08.10.2026: Der Bewertungs-Import schlug fuer jedes Produkt die CJ-pid per product/query nach (10 CJ-Punkte), obwohl 1'931 von 2'695 Neuimporten die pid direkt in der SKU tragen (CJ-<19 Ziffern>). Ab ~04 UTC ist der Punktetopf leer, dann hiess es 'spaeter erneut' - jeden Tag. Der Kommentar-Abruf selbst ist kostenlos und laeuft auch bei leerem Topf (nachgemessen). Dazu starben die Tageslaeufe am stuendlichen Neustart ohne Schlusszeile, und das Tor 'Log > 24 h' holte nichts nach: 107 von 2'695 geprueft. Regel: (1) vor jedem Abruf, der Punkte kostet, fragen, ob die Antwort schon in unseren Daten steht; (2) jeder Tageslauf schreibt START als erste und FERTIG/PAUSE als letzte Zeile, sonst sieht still_gestorben seinen Tod nicht; (3) eine Zeile 'FERTIG: N Kandidaten' MITTEN im Lauf taeuscht die Wache - Zwischenstaende anders benennen.


**Traegt der Skill `werkzeugkasten`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
