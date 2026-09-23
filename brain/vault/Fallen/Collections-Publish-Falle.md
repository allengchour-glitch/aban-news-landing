---
tags: [falle, shopify, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-06-12
---
# Collections-Publish-Falle

Per `collectionCreate` angelegte Collections sind **nicht automatisch im Onlineshop publiziert**.
Die Menü-Links liefen deshalb live auf **404** — aufgefallen ist es nur durch einen Screenshot
des Users. Alle 22 betroffenen Collections mussten nachpubliziert werden.

Nach jedem `collectionCreate` sofort `publishablePublish` in [[Sechs-Publications]].

Offene Konsequenz: `automation/cj_gaps_import.mjs` sollte in `ensureColl` gleich mitpublizieren.

Verwandt: [[Publish-Falle]] · [[Tag-Regel-Falle]]
