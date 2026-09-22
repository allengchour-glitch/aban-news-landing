---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-17 · 🔫
gelernt: 2026-09-22
---
# Ein Stopp reicht so weit wie die Datei, auf der er steht — nicht über Zweige

dropship/_SOCIAL_STOPP und automation/post_guard.mjs existieren auf origin/main nicht (git ls-tree → 0 Zeilen). Fünf GitHub-Workflows auf main rufen die ungeschützten Poster-Fassungen; reel-autopost.yml hatte gar keinen dry_run-Schalter, ein Klick auf «Run workflow» hätte direkt gepostet. Die Zeitpläne sind seit 13.06. auskommentiert — geladener Knopf, keine tickende Bombe. Regel: jede Schutzdatei und jeder Wächter muss auf JEDEM Zweig liegen, auf dem der Code läuft; workflow_dispatch-Vorgaben stehen im Zweifel auf dry_run true; vor dem Lösen eines Stopps die Warteschlange auf Alter prüfen.

Verwandt: [[Hypothese-mit-Datum]]
