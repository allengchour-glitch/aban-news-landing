---
tags: [system]
quelle: Journal 2026-09-21 · 🪣 Acht Wächter, ein Eimer; 🚧; ⏱️; 📚
gelernt: 2026-09-22
---
# Gleichzeitigkeit ohne Absprache ist langsamer als Reihenfolge

Nach jedem stündlichen Container-Neustart weckte der Aufseher binnen fünf Minuten ~25 Wächter auf EINEN Shopify-Eimer (2'000 Punkte, 100/s): gemessen 15/19/18 von 2'000, 4 von 21 Wächtern tot, 15 von 16 menue_links-Läufen blind. Bei CJ (1 Anfrage/s) verlor jeder zweite Aufruf das Rennen (1600200) und schlief 8/16/24 s — 12 s je Produkt bei 0,6 s Latenz. Drei Schichten in Wirkungsreihenfolge: (1) weniger Abfragen — Kandidaten aus dem lokalen Tages-Export minus Ledger statt Voll-Paging, nodes(ids:) in 50er-Bündeln; (2) weniger Gleichzeitigkeit — automation/shopify_schranke.sh (zwei flock-Plätze für Tages-Wächter, ein reiniger_slot, am exec-Deskriptor vererbt) und cj_takt mit reservierten Startzeiten (letzter + 1,8 s, mkdir-Sperre, Python und Node teilen EINE Uhr: 2,1 s je Produkt statt 12); (3) mehr Geduld — Cooldown der Reiniger 30 min → 4 h.

Verwandt: [[Hypothese-mit-Datum]]
