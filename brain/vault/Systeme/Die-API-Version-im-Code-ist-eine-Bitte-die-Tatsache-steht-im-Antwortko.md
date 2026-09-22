---
tags: [system]
quelle: Journal 2026-09-21 · 🗓️ Die API-Version, die wir nannten
gelernt: 2026-09-22
---
# Die API-Version im Code ist eine Bitte — die Tatsache steht im Antwortkopf

Anfragen an 2024-10, 2025-01 und 2025-07 beantwortete Shopify alle mit x-shopify-api-version: 2025-10 plus Warnkopf: 350 Aufrufstellen liefen seit Monaten auf einer Version, die in keiner Datei stand, und 2025-10 fällt am 01.10.2026 aus dem Support — alle 350 wären unangekündigt auf 2026-01 gesprungen. tools/api_version_probe.py vergleicht per Introspektion 57 genutzte Typen zweier Versionen: zwei Entfernungen (InventoryItem.variant, bulkOperationRunMutation(groupObjects)), beide 0× im Code. Alle Stellen auf 2026-01. Regel: Version im Antwortkopf messen, nicht im Code lesen; nächste Klippe 01.01.2027 (Ende 2026-01) — vorher den Prober mit 2026-01/2026-04 laufen lassen.

Verwandt: [[Hypothese-mit-Datum]]
