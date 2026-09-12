---
tags: [methode, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-09-07
---
# Jede Aussage im Gedächtnis ist eine Hypothese mit Datum

Der teuerste Fehler der Projektgeschichte war eine als Tatsache notierte Decke:

> „Nur ~3 cj-real-Produkte haben CJ-Kommentare, `listLen=0` ist eine echte 0, KEIN Bug."

Gemessen mit gültigen Zugangsdaten: von 60 CJ-Produkt-IDs hatten **13 Kommentare, 198 davon
≥ 4★**; bei fünf numerischen Ledger-IDs waren es 4 von 5 mit **86 brauchbaren ≥ 4★**. Bei 7588
Ledger-Einträgen sind damit realistisch **tausende** echte Reviews importierbar.

Die Ursache lag im eigenen Importer: `automation/cj_reviews_import.mjs` schickte beim
Token-Holen das Feld `apiKey`, CJ erwartet `password`. Auth schlug fehl, die Listen kamen leer
zurück, und aus dem leeren Ergebnis wurde eine falsche Naturkonstante.

**Monate lang blockierte diese eine Zeile im Gedächtnis den billigsten Conversion-Hebel.**

Regel: Bevor du auf einem „das geht nicht" aufbaust, einmal messen. Und wenn eine Messung dem
Gedächtnis widerspricht, das Gedächtnis ausdrücklich als **widerlegt** korrigieren.

Verwandt: [[Messgeraet-Gegenprobe]] · [[Reviews-Importer]]
