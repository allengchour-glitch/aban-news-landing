---
tags: [falle, teuer-gelernt]
quelle: dropship/MOBIL-TEMPO-2-2026-10-08.md
gelernt: 2026-10-08
---
# Server-HTML ist nicht DOM: Theme-Skript entfernte lazy

08.10.2026: Startseite lud auf dem Handy beim Öffnen 150 Bilddateien / 9'390 KB, obwohl das Server-HTML überall loading=lazy trug. Horizon assets/product-card.js #preloadNextPreviewImage() entfernte bei jeder Karussell-Karte sofort das lazy vom Zweitbild (sizes=auto wird dann ungültig → width=832). Fix: Zweitbild erst nach Laden des Erstbildes, sizes = gemessene Kartenbreite; vorher per Playwright route nur im Testbrowser ersetzt und gemessen (150 → 54), live 38 / 1'008 KB. Regeln: im Browser messen, WELCHE img geladen wurden (nicht Quelltext-Attribute); Bilder je URL zählen, nicht je img (Mobil/Desktop-Galerie = dieselbe Datei, sonst 1'113 statt 285 KB); Shopify liefert Theme-JS minifiziert ohne Kommentar-Marke → Live-Probe über Codestück + last-modified. Wächter automation/startseite_bildlast.mjs täglich.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
