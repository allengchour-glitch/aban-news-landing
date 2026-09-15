---
tags: [falle, git, teuer-gelernt]
quelle: SHARED-MEMORY.md
gelernt: 2026-08-16
---
# Stale-Ref-Falle

`git fetch origin main` hat in einer frisch angelegten Arbeitskopie den Ref **nicht**
aktualisiert: `origin/main` zeigte auf einen Monate alten Commit. Ein darauf gebauter Branch
hätte die Integration einer anderen Session überschrieben — fast ein Datenverlust.

Aufgefallen ist es nur, weil eigene Debug-Sonden im Spiel fehlten.

```bash
git fetch origin +refs/heads/main:refs/remotes/origin/main --force
git log -1 --format='%h %ad %s' --date=short origin/main
```

Immer frisch von `origin/main` branchen, nie auf alten Arbeitsbranches stapeln — andere Bots
pushen dort ständig.

Verwandt: [[GitHub-Spam-Markierung]]
