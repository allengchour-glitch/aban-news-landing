---
tags: [falle, teuer-gelernt]
quelle: dropship/WARENKORB-GRATISVERSAND-2026-10-06.md
gelernt: 2026-10-06
---
# Shopify-Versandstufe ist keine eigene Rate

deliveryProfiles listet eine Preisstufe als eigenen methodDefinition-Knoten, ID = Rate-ID + ?source=RateRangeCondition&source_id=…. Wer sie per methodDefinitionsToDelete löscht, riskiert die Grundrate (Checkout ohne Versand). Nur echte, eigene IDs ohne source-Zusatz löschen; vorher/nachher Tarif vergleichen.

Verwandt: [[Hypothese-mit-Datum]]
