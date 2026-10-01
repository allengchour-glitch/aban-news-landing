---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-20
---
# productsCount ignoriert nur den Preisfilter

GEMESSEN 2026-09-20: tag:, sku:, status: und title: werden von productsCount sehr wohl gelesen und liefern echte Zahlen (77, 29, 38, 0). Nur der Preisfilter wird still ignoriert und die Zahl deckelt bei 10000. Die Regel vom 13.09. heisst also nicht 'traue keinem …Count-Feld', sondern 'traue keinem Preisfilter' - und pruefe jeden Filter mit einem Unsinn-Wert gegen.

Verwandt: [[Hypothese-mit-Datum]]
