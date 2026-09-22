---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-22 Nachtrag 6
gelernt: 2026-09-22
---
# Geerbter Lock-fd sperrt den Erben gegen sich selbst

Du-Form-Lauf 3 wartete 52 Min in locks_lock_inode_wait: fd 8 auf /tmp/lock_produkttext.lock vom Starter geerbt (exec 8>lock; flock 8), eigene flock(LOCK_EX) auf fd 3 blockierte auf dem eigenen Lock. Kein Fehler, kein Timeout, 0 Zeilen im Ledger. Starter schliessen geerbte fds (exec 8>&- 9>&-); ein Ledger ohne Wachstum nach 10 Min ist ein Diagnosefall (wchan, fuser).

Verwandt: [[Hypothese-mit-Datum]]
