---
tags: [falle, teuer-gelernt]
quelle: Journal 14.10. ⭐ / cj_reviews_import.mjs
gelernt: 2026-10-14
---
# Duplikat-Schutz fragt das Ziel, nicht das eigene Ledger

cj_reviews_import pruefte vor dem POST nur sein lokales Ledger. Zwei Instanzen oder ein Snapshot-Rewind posteten dieselben CJ-Kommentare neu uebersetzt erneut: 296 Doppel auf 67 Produkten, 47 % der Bewertungen auf den 59 aktiven, als ratingCount an Google. Die 'Reparatur' vom 21.09. hielt nicht (169 Doppel am 22.09.). Regel: ein Schreiber, der Doppel vermeiden muss, liest vor dem Schreiben das ZIEL (hier Judge.me je Produkt) und haelt eine Lauf-Sperre; nicht lesbar = nicht schreiben. Und: eine Korrektur ist erst fertig, wenn die Zahl dort steht, wo der Kunde/Google sie liest (Shopify-Metafeld hinkte Judge.me nach).

Verwandt: [[Hypothese-mit-Datum]]

## Ergaenzung 2026-10-14

Nachtrag 14.10. 23:20: Das Shopify-Metafeld reviews.rating_count zog ~2 min nach dem Ausblenden von selbst nach (Judge.me-Sync), 64/66 Produkte exakt, Summe 631 -> 332. Nachmessen am Lese-Ort bleibt Pflicht.
