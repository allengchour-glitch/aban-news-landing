---
tags: [sackgasse, nicht-erneut-versuchen]
quelle: tools/yt_lernen.mjs
gelernt: 2026-09-13
---
# YouTube drosselt nach rund einem Dutzend Abrufen

Gemessen 2026-09-13: nach etwa zwoelf Seitenabrufen antwortet YouTube mit HTTP 429 und einer rund 3,3 KB kleinen Seite, sowohl ueber curl als auch ueber fetch. Rueckblickend waren die 3257-Bytes-Fehlschlaege am Anfang der Recherche ebenfalls Drosselungen und keine fehlenden Seiten. Zweite Falle derselben Sache: die Einwilligungsseite von YouTube ist ueber 50000 Bytes gross und traegt den Titel Like this video - eine Laengenpruefung haelt sie faelschlich fuer eine Videoseite. tools/yt_lernen.mjs prueft darum auf shortDescription und viewCount und nennt den Statuscode. Fuer jede Session: hoechstens eine Handvoll Videos am Stueck abrufen.

Verwandt: [[Hypothese-mit-Datum]]
