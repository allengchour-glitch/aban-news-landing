---
tags: [falle, teuer-gelernt]
quelle: build-pages.sh
gelernt: 2026-09-23
---
# spiele-dev stand in keiner Ausschlussliste von build-pages

GEMESSEN 23.09.: spiele-dev/ (27 Runbooks, Audit-Plaene, Backlogs der Spiele-Entwicklung) steht in KEINER Ausschlussliste von build-pages.sh. Live ist die Adresse heute 404, aber build-pages.sh hat eine Ausschluss-, keine Einschlussliste - der naechste Deploy haette alle 27 internen Dateien auf abannews.com veroeffentlicht. Das ist dieselbe Klasse wie brain/ und .claude/ (12.09., gemessen 63 Eintraege) und die Gedaechtnis-Dateien im Wurzelverzeichnis (13.09., HTTP 200 mit 34 399 Bytes). Behoben, im selben Arbeitsgang wie die Voice-Linter-Ausnahme. Die stehende Regel gilt weiter: wer ein Verzeichnis anlegt, das nicht auf die Webseite gehoert, traegt es im selben Arbeitsgang ein.

Verwandt: [[Hypothese-mit-Datum]]
