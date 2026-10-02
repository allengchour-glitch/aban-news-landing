---
tags: [falle, teuer-gelernt]
quelle: automation/geschenk_unterwelten.py
gelernt: 2026-10-02
---
# Smart-Kollektion füllt sich nach Regeländerung asynchron

02.10.2026: Nach collectionUpdate (neue Regel) zeigte productsCount sofort noch den ALTEN Bestand (2'743). Eine Warte-Bedingung «Anzahl ≥ 90 % Soll» war damit sofort erfüllt, collectionReorderProducts sortierte alte Ware. Richtig: warten bis |Anzahl − Soll| ≤ 10 %.

Verwandt: [[Hypothese-mit-Datum]]
