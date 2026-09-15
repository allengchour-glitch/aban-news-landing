---
tags: [falle, teuer-gelernt]
quelle: 15.09.2026, robots.txt und /search
gelernt: 2026-09-15
---
# Ein Zaehlergebnis von 0 ist erst ein Befund, wenn die Eingabe nicht leer war

Die Kritik behauptete, /search sei nicht in der robots.txt gesperrt. Ich pruefte mit `curl … | grep -ci "search"` → **0** und baute darauf eine eigene `templates/robots.txt.liquid`.

Beide Annahmen waren falsch. `Disallow: /search` stand **schon** in Shopifys Standard (Zeile 36) — mein grep lief gegen die Ausgabe eines curl-Aufrufs, der **leer** zurueckkam. Ein leerer Eingabestrom liefert zuverlaessig die Zahl 0, und 0 sieht aus wie ein Befund.

Dazu kam der zweite Schaden: die Nachbau-Vorlage verlor **alle rund 20 `Allow:`-Regeln** und den Kopfkommentar, weil `robots.default_groups → group.rules` nur die Disallow-Zeilen herausgibt. Zurueckgenommen, am Ursprung geprueft.

**Regel:** Bei einem Zaehlergebnis von 0 zuerst belegen, dass die Eingabe ueberhaupt Inhalt hatte (`wc -c`, `head`). Und: wer eine Plattform-Standarddatei nachbaut, vergleicht vorher und nachher Zeile fuer Zeile — nicht nur die Zeile, die er hinzufuegen wollte.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
