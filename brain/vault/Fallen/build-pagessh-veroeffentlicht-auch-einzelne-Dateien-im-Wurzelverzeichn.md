---
tags: [falle, teuer-gelernt]
quelle: dropship/LERNEN-SHOPIFY-CLAUDE-2026-09-13.md
gelernt: 2026-09-13
---
# build-pages.sh veroeffentlicht auch einzelne Dateien im Wurzelverzeichnis

GEMESSEN am 2026-09-13 mit curl: https://abannews.com/CLAUDE.md liefert HTTP 200 mit 34399 Bytes, https://abannews.com/SHARED-MEMORY.md HTTP 200 mit 107585 Bytes. Das vollstaendige Projekt-Gedaechtnis war oeffentlich abrufbar. Die Session vom 12.09. hatte brain/ und .claude/ ausgeschlossen und dabei die Dateien im Wurzelverzeichnis uebersehen. build-pages.sh arbeitet mit einer Ausschlussliste, nicht mit einer Einschlussliste - alles was nicht genannt ist geht live, auch einzelne Dateien. Behoben durch Ausschluss von CLAUDE.md, SHARED-MEMORY.md, LERNEN-*.md, *-HANDOFF.md, *-MEMORY.md, *-CHECKLISTE.md und docs/SESSION-HANDOFF.md; nachgemessen 5 auf 0, Gegenprobe functions/ weiter 39 Dateien. Die bereits veroeffentlichte Kopie verschwindet erst mit dem naechsten Deploy - danach pruefen, dass der Abruf 404 liefert.

Verwandt: [[Hypothese-mit-Datum]]
