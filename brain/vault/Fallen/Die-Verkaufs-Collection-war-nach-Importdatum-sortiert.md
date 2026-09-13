---
tags: [falle, teuer-gelernt]
quelle: dropship/LERNEN-SHOPIFY-CLAUDE-2026-09-13.md
gelernt: 2026-09-13
---
# Die Verkaufs-Collection war nach Importdatum sortiert

Am 2026-09-13 gemessen: geschenke-unter-50-franken, die Collection aus der jeder nachprüfbare Verkauf kam, stand auf CREATED_DESC bei 63145 Produkten. Die Kundensicht zeigte sechs Hundeartikel am Stueck unter den ersten zwoelf Kacheln. Die Schwester-Collection bestseller-unter-50 stand die ganze Zeit auf BEST_SELLING, ihre Adresse leitet aber per 301 auf die schlecht sortierte um - die gute Sortierung war vorhanden und unerreichbar. Geaendert auf BEST_SELLING bei geschenke-unter-50-franken, kleine-geschenke-mitbringsel und nachtwaesche-pyjamas. Nachgemessen an der echten Seite: Hundeartikel unter den ersten zwoelf von 6 auf 0, vorn stehen jetzt das zweimal bestellte Fuda-Taschenmesser und Ware zwischen CHF 14.90 und 40.90. Lehre: bei jeder Collection die sortOrder pruefen, CREATED_DESC macht aus dem Schaufenster eine Importliste. Und die Kundensicht abrufen statt der API zu glauben - DRAFT-Produkte stehen in der API-Liste vorn, der Shop blendet sie aus.


**Traegt der Skill `shopify-publizieren`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
