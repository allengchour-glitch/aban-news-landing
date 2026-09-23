---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 46
gelernt: 2026-09-23
---
# Gelöschter FB-Seiten-Post liest mit Code 10 zurück, nicht 100

DELETE auf einen Seiten-Post gibt success:true, das Rücklesen liefert danach aber Code 10 (missing permission), nicht 100/33 wie bei Reels. Wer nur 100 als 'weg' zählt, meldet echte Löschungen als Fehler (92 von 120 am 23.09.). Belegen lässt sich die Löschung nur über das Seiten-Listing (/posts, /videos, /video_reels). Scharfe Läufe voll ins Log schreiben, nie durch tail kürzen.

Verwandt: [[Hypothese-mit-Datum]]
