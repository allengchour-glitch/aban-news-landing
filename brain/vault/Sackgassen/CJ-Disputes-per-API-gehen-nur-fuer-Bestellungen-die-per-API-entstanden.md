---
tags: [sackgasse, nicht-erneut-versuchen]
quelle: Journal 2026-09-18 · 📬 9009 erklärt; ⏰
gelernt: 2026-09-22
---
# CJ-Disputes per API gehen nur für Bestellungen, die per API entstanden sind

disputes/create antwortete für #1017 in jeder Kombination mit 9009, während disputeConfirmInfo 200 mit maxAmount 25.54 lieferte. CJ erklärte am 18.09.: die Bestellung kam über den Shopify-Kanal, und die Schreibprüfung verlangt das Merkmal «Created via API»; die Vorschau prüft nur den Betrag. Ein Adressabgleich ist keine Vorbedingung. Regel: disputes/create für Shopify-Kanal-Aufträge nicht erneut versuchen — der Dispute ist ein Betreiber-Klick im Web-Portal; Bestellungen mit Reklamationsrisiko künftig über die Open API anlegen, sonst ist der Rückweg immer ein Klick.

Verwandt: [[Hypothese-mit-Datum]]
