---
tags: [sackgasse, shopify]
quelle: CLAUDE.md
gelernt: 2026-06-02
status: nur-user
---
# Sackgasse — archivierte Produkte per API löschen

Der Archiv-Backlog (rund 4381 Produkte, **nicht** kundenseitig sichtbar) lässt sich **nicht** per
API löschen: `bulkOperationRunMutation` wird von einem Sicherheitslayer blockiert.

Weg, der funktioniert, dauert zwei Minuten und braucht den User:
Admin → Produkte → Filter „Archiviert" → alle auswählen → löschen.

Verwandt: [[Drei-User-Klicks]]
