---
tags: [falle, teuer-gelernt]
quelle: dropship/FILTER-FEINKATEGORIE-2026-10-02.md
gelernt: 2026-10-02
---
# shopify.color-pattern nur bei Kategorien mit Farbmerkmal

GEMESSEN 02.10.2026: metafieldsSet auf shopify.color-pattern scheitert mit 'Owner subtype does not match the metafield definition's constraints', wenn die Produktkategorie kein Taxonomie-Merkmal Color hat (oder keine Kategorie) — und verwirft dann die GANZE Charge. Vorher Kategorien per nodes(ids) auf Attribut Color pruefen (76 von ~300). Ein color-pattern-Metaobjekt braucht pattern_taxonomy_reference (Solid 2874); publishable gibt es nicht.

Verwandt: [[Hypothese-mit-Datum]]
