---
tags: [system]
quelle: dropship/LERNEN-BILD-ZU-VIDEO-2026-09-23.md
gelernt: 2026-09-23
---
# Produktbilder und Preis gehen ohne Zugangsdaten

GEMESSEN 23.09.: https://luxestyle.ch/products/<handle>.js liefert Titel, alle Bild-Adressen und die Variantenpreise in Rappen - ohne Token, ohne Client-Credentials. Damit laeuft automation/produkt_werbevideo.mjs in jeder Session sofort, anders als preis_korrektur.mjs und homepage_slim.mjs, die auf SHOPIFY_CLIENT_ID/_SECRET warten. Achtung: der Endpunkt drosselt (HTTP 429) wenn man kurz zuvor viele Seiten abgerufen hat - das ist Drosselung, nicht 'Produkt fehlt', also wiederholen mit Wartezeit.

Verwandt: [[Hypothese-mit-Datum]]
