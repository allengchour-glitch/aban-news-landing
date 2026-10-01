---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-01
---
# Cloudflare-Pages-Projekte fallen einzeln um und werden von selbst wieder gruen

GEMESSEN zweimal, an zwei verschiedenen Projekten. (1) dropshipping-radar war am 20.09. rot und am 27.09. gruen, ohne jede Aenderung. (2) jobs war am 30.09. 22:11 UTC rot auf Commit 6171ff1 und am 01.10. 02:23 UTC gruen auf dem Merge-Commit 99f1209. Das Muster ist jedes Mal dasselbe: der Commit faellt das Projektverzeichnis mit NULL Dateien an, die Projektquelle ist seit Wochen unveraendert, und ein Dutzend Geschwister-Pages-Projekte bauen denselben Commit erfolgreich. Bei jobs zusaetzlich: die vier geaenderten Dateien lagen in CLAUDE.md, brain/ und dropship/ - alle drei in der Ausschlussliste von build-pages.sh, landen also in keinem Pages-Artefakt. LEHRE: ein einzelnes rotes Pages-Projekt bei gruenen Geschwistern ist zuerst eine Frage an Cloudflare, nicht an den Commit. Die drei Messungen, die es entscheiden: (a) faellt der Diff das Projektverzeichnis an, (b) wann wurde die Quelle zuletzt geaendert, (c) bauen andere Pages-Projekte denselben Commit. Ein Cloudflare-Build neu starten geht nur im Dashboard, Cloud-Sessions koennen es nicht - also einmal kommentieren und weiter beobachten, nicht am Commit herumdoktern.

Verwandt: [[Hypothese-mit-Datum]]
