---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-30
---
# Eine Saeuberung nach Feldnamen laesst verschachtelte Felder stehen

GEMESSEN 30.09.2026: Beim Pseudonymisieren des Auszugs fuer offenes_geld.mjs ersetzte die erste Fassung nur customerEmail. Zwei echte Adressen standen in einem verschachtelten emailAddress und wurden mitcommittet worden waere, wenn die Gegenprobe gefehlt haette - dieses Repo ist oeffentlich. Behoben: die Saeuberung laeuft jetzt REKURSIV ueber jeden Schluessel, dessen Name mail enthaelt, statt ueber eine Liste bekannter Felder. Dieselbe Klasse wie die fehlende Wortgrenze bei 3to4 und /schal/: wer nach einer Liste sucht statt nach einer Eigenschaft, findet nur was er schon kannte. Regel: nach jeder Saeuberung mit grep gegenpruefen, ob noch eine echte Adresse oder ein Schluessel drinsteht.

Verwandt: [[Hypothese-mit-Datum]]
