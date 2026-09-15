---
tags: [falle, teuer-gelernt]
quelle: 15.09.2026, Margen-Messung
gelernt: 2026-09-15
---
# Ein Befund ueber drei Viertel des Bestands ist meist eine Aussage ueber das Messgeraet

Mein erster Margenlauf meldete **229'374 Verlustvarianten — 76 % des Katalogs**, und die Bestellrechnung dazu sagte `2 von 6 Bestellungen waren Verluste`.

Beides falsch, beides derselbe Fehler: `automation/cj_kosten_backfill.mjs` schreibt in `unitCost` ausdruecklich «Warenkosten + **VOLLE Fracht**». Ich habe die Fracht ein zweites Mal abgezogen. Nach der Korrektur: **29,0 % Nettomarge, 0 Verluste**, und die echte Klasse sind 1'785 Produkte.

Aufgefallen ist es nur, weil die Zahl zu gross war, um wahr zu sein.

**Regel:** Bevor eine Kostenrechnung gilt, muss belegt sein, **was in der Kostenzahl schon steckt** — nachzulesen im Skript, das sie geschrieben hat, nicht vermutet. Und ein Befund, der drei Viertel des Bestands trifft, wird zuerst gegen das eigene Werkzeug geprueft, nicht gemeldet.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
