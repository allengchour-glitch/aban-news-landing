---
tags: [falle, teuer-gelernt]
quelle: Journal 14.10. ⭐ / judgeme_doppel_wache.py
gelernt: 2026-10-14
---
# difflib SequenceMatcher bei langen Texten immer mit autojunk=False

Ab 200 Zeichen im zweiten Argument wirft difflib haeufige Zeichen als 'junk' weg: neu uebersetzte Bewertungs-Kopien fielen von 0,86 auf 0,17 Aehnlichkeit, 10 Doppel plus 8 einer Quarz-Uhr blieben unerkannt. Regel: SequenceMatcher(None, a, b, autojunk=False), und max beider Richtungen, sobald Texte laenger als 200 Zeichen sein koennen. Gefunden nur durch Eichung gegen die Wahrheitsquelle (Autor im Judge.me-Widget).

Verwandt: [[Hypothese-mit-Datum]]
