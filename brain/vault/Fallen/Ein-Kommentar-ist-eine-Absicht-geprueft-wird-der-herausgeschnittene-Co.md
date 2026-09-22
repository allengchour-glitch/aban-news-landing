---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · ⏳ Der Kommentar sagte «restoreRate»; 🫀
gelernt: 2026-09-22
---
# Ein Kommentar ist eine Absicht — geprüft wird der herausgeschnittene Code

102 Skripte trugen denselben kopierten gql()-Helfer; 23 nannten restoreRate, 19 davon NUR IM KOMMENTAR und schliefen fest 12 s. Der eigene Patch hatte denselben Fehler: «Drosseln zählen nicht als Fehlversuch» stand im Kommentar, continue in for _ in range(4) verbrauchte die Runde trotzdem — gefangen nur von der Gegenprobe am ECHTEN, per ast herausgeschnittenen Quelltext (Soll 12 Wartezeiten, Ist 4). Umgekehrt mass ein Test zuerst sich selbst und meldete vier Mal rot bei richtigem Code. Regel: Shopify sagt die Wartezeit selbst — (requestedQueryCost − currentlyAvailable) / restoreRate + 0.5, Deckel 30 s, Drosseln verbrauchen keinen Versuch, nach 12 lauter Abbruch; jede Reparatur wird an einem Test geprüft, der den echten Block liest, rot meldet, wenn er ihn nicht findet, und dessen rote Zeile man liest, bevor man Code «repariert».

Verwandt: [[Hypothese-mit-Datum]]
