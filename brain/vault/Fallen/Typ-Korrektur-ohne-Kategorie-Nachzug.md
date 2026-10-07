---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-10-07 16:45
gelernt: 2026-10-07
---
# Typ-Korrektur ohne Kategorie-Nachzug

154 Diffuser bekamen am 05.10. den richtigen Typ, aber Shopify-Kategorie (Cosmetic Tools) und Google (Hair Care) blieben, und kategorie_wache kannte den Typ nicht. Fix aroma_kategorie.py + typen_abgleich() im kategorie_wache --test, der jeden vergebenen unbekannten Typ meldet.

Verwandt: [[Hypothese-mit-Datum]]
