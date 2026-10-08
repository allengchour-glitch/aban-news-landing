---
tags: [system]
quelle: dropship/FEINKATALOG-SHOPIFY-UNTERKLASSEN-2026-10-08.md
gelernt: 2026-10-08
---
# Blatt-Prüfung je Taxonomie und Bulk statt Eimer

08.10.2026: Google stand bei 45'239/51'683 auf einem Blatt, Shopify aber bei 27'897 auf einer Klasse mit Unterklassen — unter Shirts & Tops, Pants, Pet Leashes usw. hat Google kein feineres Blatt, also verfeinerte der Google-Weg dort nie. Blatt-Prüfung je Taxonomie getrennt zählen. Nicht jede Klasse mit Kindern ist grob (Ringe → nur Ehe-/Verlobungsringe; Mode-Rucksack ≠ Wanderrucksack): erst die Kinderliste lesen. Werkzeug shopify_fein.py + data/shopify_fein.json (je Elternklasse nicht/Regeln/Kanarien). Schreiben: einzeln 20/min neben einem Lese-Scan (Eimer ~120/2000) → Bulk-Mutation productUpdate(category) ohne Eimer, eigener Lauf über node(id:), 8'090 in einem Lauf. Live-Zähler: productsCount(query:'category_id:…').


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
