---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-27
---
# Push-Schleife committete Konfliktmarkierungen

for i in 1 2 3; do git add -A; git commit; git pull && git push && break; done: scheitert der Merge (Konflikt), committet der nächste Durchlauf die <<<<<<<-Markierungen (27.09. _cj_kosten_cursor.txt). Richtig: git pull ... || git merge --abort, dann neu; nach jedem Lauf grep -rl '^<<<<<<< ' dropship automation.

Verwandt: [[Hypothese-mit-Datum]]
