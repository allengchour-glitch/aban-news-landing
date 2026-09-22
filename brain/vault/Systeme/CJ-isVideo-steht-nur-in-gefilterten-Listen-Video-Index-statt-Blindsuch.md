---
tags: [system]
quelle: Journal 2026-09-22 Nachtrag 17
gelernt: 2026-09-22
---
# CJ isVideo steht nur in gefilterten Listen — Video-Index statt Blindsuche

GEMESSEN 22.09.2026: product/list trägt isVideo je Produkt nur mit categoryId- oder pid-Filter (ungefiltert null), pageSize max 200, kein isVideo-Filter, Offset-Deckel 6000 (30 Seiten). automation/cj_video_index.mjs blättert die 578 Kategorien (Cursor, 150 Aufrufe/Lauf), Regale nach Stichprobe eigener Produkte geordnet (CJ-Reihenfolge: 0 Shop-Treffer in 7'690). Erster Lauf: 70 Shop-Produkte mit Video aus 80 Aufrufen; Motor DRY 3/3 statt 1/80. UUID-pids: Number() gibt NaN → num()-Hash.

Verwandt: [[Hypothese-mit-Datum]]
