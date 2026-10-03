---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-03
---
# Drossel-Geduld in Zeit, nicht in Versuchen

30 Wächter warteten bei THROTTLED nur requestedQueryCost-currentlyAvailable (<1 s bei leerem Eimer) und gaben nach 12 Versuchen in ~15 s auf. Fix: max(Anfrage,600)-verfügbar, Regel drossel-ungeduldig.

Verwandt: [[Hypothese-mit-Datum]]
