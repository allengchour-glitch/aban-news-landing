---
tags: [falle, teuer-gelernt]
quelle: dropship/LERNEN-BILD-ZU-VIDEO-2026-09-23.md
gelernt: 2026-09-23
---
# Zeichenzahl ist nicht Pixelbreite

Der Haken im Produktvideo war auf 34 ZEICHEN gedeckelt. Der Selbsttest war gruen und der Text lief trotzdem links und rechts aus dem Bild. GEMESSEN: 'Taktische Outdoor Warnweste fuer' sind 31 Zeichen und bei 60 px ueber 1080 px breit - breiter als das ganze Bild. Bei x=(w-text_w)/2 ragt so eine Zeile auf beiden Seiten hinaus. Behoben in automation/produkt_werbevideo.mjs: textBreite() misst die Pixelbreite mit ffmpeg selbst, also mit genau dem Zeichner, der den Text spaeter malt. Gegenprobe: doppelte Schriftgroesse muss rund doppelte Breite ergeben (gemessen 2,00). LEHRE: ein gruener Selbsttest beweist nur, dass der Code tut, was der Test prueft - ob der Test das Richtige prueft, sieht man erst am Ergebnis. Bei allem Sichtbaren gehoert ein Blick auf das fertige Bild dazu.

Verwandt: [[Hypothese-mit-Datum]]
