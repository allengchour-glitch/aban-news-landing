---
tags: [falle, teuer-gelernt]
quelle: dropship/FB-FOLLOWER-2026-10-07.md
gelernt: 2026-10-07
---
# Modell-Absage blockiert Warteschlange

Gemini antwortete auf die Jury-Anfrage eines Reels mit promptFeedback.blockReason OTHER (kein candidates). Die Jury wertete das als Netzfehler (Exit 2, kein Urteil), der Kandidat blieb vorne, 5 h lang kam kein Reel durch (18x). Eine Absage ist deterministisch: Zweitprüfer fragen, sonst als durchgefallen werten, damit die Warteschlange weiterläuft. Erst zählen, wie oft DERSELBE Kandidat scheitert.

Verwandt: [[Hypothese-mit-Datum]]
