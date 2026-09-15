---
tags: [falle, teuer-gelernt]
quelle: 15.09.2026, git rev-parse
gelernt: 2026-09-15
---
# Ein bekanntes Muster im Gedaechtnis macht eine Fehlermeldung wahrscheinlicher, nicht wahr

`git rev-parse --short HEAD origin/<branch>` meldete `fatal: Needed a single revision`. Im Gedaechtnis steht der **verklemmte Tracking-Ref** (`cannot lock ref … expected Y`) samt Heilung — ich wollte schon `repo_vorspulen.sh` mit seinem `git stash -u` darauf ansetzen, also ein Reparaturwerkzeug auf ein gesundes Repo.

Gegenprobe: der Ref loest **einzeln** auf, in beiden Namensformen, sofort. Der Fehler lag an `--short` — die Option kuerzt genau **eine** Revision, mit zweien weigert sich git.

**Regel:** Ein Muster aus dem Gedaechtnis liefert eine Hypothese, keinen Befund. Erst das **Merkmal** der Klasse einzeln messen (hier: laesst sich der Ref aufloesen?), dann die Klasse behaupten. Der Preis waere hier ein `git stash -u` auf unbeschriebene Arbeit gewesen.

Verwandt: [[Hypothese-mit-Datum]]
