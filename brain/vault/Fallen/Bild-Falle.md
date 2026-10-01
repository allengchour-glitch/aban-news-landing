---
tags: [falle, shopify, cj]
quelle: CLAUDE.md
gelernt: 2026-05
---
# Bild-Falle

CJ-Bild-URLs unter `quick/product/…` sind **teilweise 404**. Jede URL vor dem Anlegen per
HTTP-Statuscode prüfen (200 erwartet), und **nach** dem Anlegen den Media-Status auf `READY`
kontrollieren.

Gegenbeispiel aus der Praxis: „UV400" bei CJ heisst **nicht** automatisch getönt — vier
klarglasige Sonnenbrillen mussten wieder raus. Produktdaten der Quelle sind Behauptungen,
keine Messwerte.

Verwandt: [[Publish-Falle]] · [[LuxeStyle]]
