---
tags: [falle, teuer-gelernt]
quelle: eigener Fehler, 2026-09-25
gelernt: 2026-09-25
---
# Ein Produktvideo mit Preis im Bild veraltet mit der naechsten Preisaenderung

Am 25.09. wurden sieben Produktvideos gerendert und danach drei Preise angehoben. Die drei Videos trugen daraufhin FALSCHE Preise im Bild: Leinen-Set 34.90 statt 39.90, Blumenkleid 18.90 statt 24.90, E-Scooter-Ladegeraet 25.90 statt 34.90. automation/produkt_werbevideo.mjs brennt den Preis in jedes Segment - das ist gewollt (85 PROZENT der Aufrufe laufen ohne Ton), macht das Video aber an den Preis gebunden. REGEL: nach jeder Preisaenderung die Videos der betroffenen Produkte NEU rendern, und in einem Arbeitsgang immer ERST die Preise setzen, DANN rendern. Ein Werbevideo mit einem Preis, den der Shop nicht mehr hat, ist irrefuehrend - nicht bloss veraltet. Pruefen laesst es sich billig: der Renderer gibt den verwendeten Preis aus, der Shop liefert ihn unter /products/<handle>.js.

Verwandt: [[Hypothese-mit-Datum]]
