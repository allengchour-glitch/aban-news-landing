---
tags: [falle, teuer-gelernt]
quelle: 15.09.2026, fixer_keepalive und wahlversprechen.py
gelernt: 2026-09-15
---
# Eine Erfolgsmeldung die nicht vom Ergebnis abhaengt ist Dekoration

`wahlversprechen.py` war **sechs Tage tot** (Absturz beim ersten Produkt). Der Aufseher druckte in derselben Zeit jeden Tag «wahlversprechen geprueft» — die Zeile stand hinter dem Start, nicht hinter dem Ergebnis, und das Log fuellte sich unbemerkt mit Tracebacks.

Behoben: die Meldung liest jetzt das Log des **vorigen** Laufs und sagt «letzter Lauf endete mit Fehler», wenn dort `Traceback` steht.

**Regel:** Jede Statusmeldung eines Automaten muss aus dem **Ergebnis** stammen, nicht aus dem Umstand, dass er gestartet wurde. Prueffrage: Kann diese Zeile «ok» sagen, waehrend das Ding kaputt ist? Dann ist sie Dekoration.

Verwandt: [[Messgeraet-Gegenprobe]]

Verwandt: [[Hypothese-mit-Datum]]
