---
tags: [falle, teuer-gelernt]
quelle: automation/versand_transit_wache.py, 13.10.2026
gelernt: 2026-10-13
---
# Profil-Liste ohne Blättern sieht das neue Profil nicht

versand_transit_wache.py fragte deliveryProfiles(first:50); der Shop hat 55 Profile, das neue «CH-Lager» stand auf Seite 2 — die Wache meldete vor und nach dem Anlegen dieselben «5 Tarife ok». Dieselbe Falle stand schon am 14.08. in versandprofil_poster.py. Regel: jede Liste mit pageInfo; eine Zahl, die sich nach einer Änderung nicht bewegt, erst prüfen, dann glauben.

Verwandt: [[Hypothese-mit-Datum]]
