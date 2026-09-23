---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 45
gelernt: 2026-09-23
---
# rebase.autoStash hinterlaesst unmerged Dateien ohne MERGE_HEAD

Der Reel-Push mit rebase.autoStash konnte seinen Stash nicht zurueckspielen: drei Dateien unmerged, kein MERGE_HEAD, naechster Commit bricht ab, der Motor verwirft Reels lokal. Loesung: automation/git_sichern.sh (Merge statt Rebase, kein Autostash, Konfliktregeln je Dateiart, kein Push bei Markern) fuer alle automatischen Schreiber.

Verwandt: [[Hypothese-mit-Datum]]
