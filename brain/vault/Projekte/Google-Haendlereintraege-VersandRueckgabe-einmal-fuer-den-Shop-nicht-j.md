---
tags: [projekt]
quelle: dropship/GOOGLE-ORG-RICHTLINIEN-2026-10-06.md
gelernt: 2026-10-06
---
# Google-Händlereinträge: Versand/Rückgabe einmal für den Shop, nicht je Offer

Search Console meldete shippingDetails/hasMerchantReturnPolicy fehlen in offers. Shopifys structured_data für Produkte ist nicht erweiterbar ohne replace-Tricks; Google empfiehlt ohnehin die Shop-weite Regel unter Organization. Eingefügt im Header-Organization-Block (jede Seite), live json.loads geprüft, Wächter vergleicht Markup mit dem Versandtarif — sonst laufen Markup und Checkout still auseinander.

Verwandt: [[Hypothese-mit-Datum]]
