---
tags: [falle, teuer-gelernt]
quelle: BigBuy purse.json 16.09.2026
gelernt: 2026-09-16
---
# Zwei moegliche Ursachen trennt man an der Voraussetzung

BigBuys purse.json antwortete am 15. und 16.09. 'Invalid Token'. Zwei Erklaerungen standen im Raum: das am 15.09. ausgelaufene Abo, oder ein beim Container-Neustart verlorener Schluessel. Statt auf ein deutlicheres Symptom zu warten, wurde die Voraussetzung der zweiten Erklaerung geprueft: /tmp/bigbuy.env ist noch da, unveraendert vom 07.09. — derselbe Schluessel, der am 15.09. noch '1000.00' lieferte. Ein verlorener Schluessel kann das Ergebnis also nicht erklaert haben; es bleibt das Abo-Ende. Folge fuer den Betrieb: das Guthaben ist von hier aus nicht mehr messbar, letzte belegte Zahl EUR 1000.00 vom 15.09. Regel: konkurrierende Ursachen trennt man, indem man ihre Voraussetzungen einzeln misst.

Verwandt: [[Hypothese-mit-Datum]]
