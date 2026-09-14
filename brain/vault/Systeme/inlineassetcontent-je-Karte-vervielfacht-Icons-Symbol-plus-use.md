---
tags: [system]
quelle: dropship/VERGLEICH-SHOPS-2026-09-14.md
gelernt: 2026-09-14
---
# inline_asset_content je Karte vervielfacht Icons — Symbol plus use

14.09.2026: Warenkorb-Icon 755× (309 KB) und checkmark-burst 184× (310 KB) inline auf der Startseite. Ein <symbol> in layout/theme.liquid + <use> in add-to-cart-button/quick-add: 368 Kopien weg, −80 KB HTML je Seite mit vielen Karten. Grenze: Icons, deren CSS-Animation innere Pfade anspricht (.burst .line), sind durch <use> gekapselt — checkmark-burst bleibt inline. Und: <body\b matcht <body-…>-Custom-Elements; Anker auf den vollen Tag.

Verwandt: [[Hypothese-mit-Datum]]
