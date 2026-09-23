---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-22 Nachtrag 18
gelernt: 2026-09-22
---
# Zwei git-Automaten im selben Arbeitsbaum brauchen EINE Sperre (/tmp/git_repo.lock)

GEMESSEN 22.09.2026 22:28 UTC: Autocommitter-Merge parallel zum Rebase des Reel-Motors hinterliess .git/rebase-merge/autostash; danach scheiterte jeder Push des Motors («rebase in progress»), 5 gerenderte Reels wurden verworfen, git rebase --abort setzte drei Ledger zurück (119 Zeilen nur im Stash). Regel: jede git-Folge (Motor, Autocommitter, eigene Pushes) unter flock -w /tmp/git_repo.lock; verwaister Rebase-Zustand → git rebase --quit (HEAD bleibt, Autostash in die Stash-Liste), Ledger-Union aus dem Stash. Motor-Nachtrag: Reel-Datei im Repo ohne Queue-Zeile → Zeile nachtragen statt neu rendern.

Verwandt: [[Hypothese-mit-Datum]]
