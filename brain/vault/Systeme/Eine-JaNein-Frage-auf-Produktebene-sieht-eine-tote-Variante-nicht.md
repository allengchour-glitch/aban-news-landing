---
tags: [system]
quelle: Journal 2026-09-21 · 🧩; 🎨; 📚 Nachtrag
gelernt: 2026-09-22
---
# Eine Ja/Nein-Frage auf Produktebene sieht eine tote Variante nicht

Trainingsanzug: CJ führt 32 Varianten, der Shop 40 — 8 Blau mit Menge 0 und inventoryPolicy CONTINUE, also kaufbar und nicht lieferbar (Ghost-Sale-Klasse, eine Ebene tiefer). cj_verfuegbarkeit.py fragt je Produkt nur «gibt es die erste SKU noch?». 18'787 aktive CJ-Produkte sind mehrvariantig (~420'000 Varianten). Jetzt automation/cj_varianten_wache.py (4-h-Takt, LIMIT 300, 30-Tage-Wiedervorlage): eine CJ-Anfrage je Produkt, fehlende CONTINUE-Varianten → DENY (umkehrbar). Gelernte Formen: Produkt-SKU = Varianten-SKU minus VIER Zeichen (CJLY291603001AZ → CJLY2916030); CJs variantSku trägt teils den Namen (vorhanden = roh ODER Kern); zwei Shop-Varianten mit derselben CJ-SKU (Handsauger Silber/Grau beide 01AZ) sind ein Fehlversand, repariert über variantKey; 1602003 «Variant removed» heisst nicht «Produkt weg» → auf Produktebene nachfragen, sonst Menschenentscheid.

Verwandt: [[Hypothese-mit-Datum]]
