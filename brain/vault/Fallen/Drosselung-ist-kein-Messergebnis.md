---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-20
---
# Drosselung ist kein Messergebnis

GEMESSEN 2026-09-20: ein Lauf ueber 123 Produktseiten mit 150 ms Pause meldete 43 unerreichbare Seiten. Alle 43 waren HTTP 429, also Drosselung. Mit 400 ms Pause und Wiederholung: 122 mal 200, 1 mal 429. Ein Messgeraet, das die eigene Abruffrequenz als 'Seite existiert nicht' meldet, erzaehlt eine falsche Geschichte ueber den Shop. tools/schutzausruestung.mjs trennt jetzt gedrosselt von fehlt.

Verwandt: [[Hypothese-mit-Datum]]
