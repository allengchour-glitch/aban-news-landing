---
tags: [system]
quelle: Journal 2026-09-22 · 📥 promt holen und lernen
gelernt: 2026-09-22
---
# Shopifys structured_data kennt Judge.me nicht — Sterne müssen angehängt werden

GEMESSEN 22.09.2026: 1'541 aktive Produkte mit 8'066 Judge.me-Bewertungen, keines mit aggregateRating im Product-JSON-LD — Judge.me füllt nur die Metafelder (reviews.rating Typ rating, reviews.rating_count Ganzzahl), injiziert kein Schema; Shopifys structured_data-Filter liest sie nicht. Lösung im Theme (sections/product-information.liquid): Ausgabe von structured_data in capture einfangen und bei rating_count > 0 per replace_first am einzigen Anker '"@type":"Product",' ein AggregateRating anhängen — Shopifys Ausgabe bleibt sonst unverändert, Brand/Offer tragen andere @type. Rücklesen: Admin-Datei trägt den Marker; live ratingValue 5.0 / ratingCount 5. Regel: Sterne im Suchergebnis gibt es nur mit aggregateRating, und Google verlangt sichtbare Bewertungen auf derselben Seite (Judge.me-Widget).

Verwandt: [[Hypothese-mit-Datum]]
