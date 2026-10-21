# Pagination-Pilot — echte Seitenlinks unter dem Raster (21.10.2026)

**Anlass:** Spähtrupp wf_32ed9d12 (Skeptiker IDX-1 / SD-01 / L4). Horizon rendert bei Infinite Scroll KEINEN Anker auf `?page=N`
(`pagination-controls` nur bei `enable_infinite_scroll == false`); gemessen: 0 Anker mit `page=` auf 3 von 3 geholten Kollektionen, nur `<link rel=next>`
im Kopf. Von rund 56'000 aktiven Produkten stehen nur 5'715 auf Seite 1 irgendeiner Kollektion; 88 % haben keinen eingehenden Link ausser der Sitemap.
`?page=2…` ist bei Google für 15 von 15 geprüften Kollektionen «URL is unknown to Google» (GEMESSEN, inspect_urls 19.–21.10.).

**Was drin ist (Pilot, umkehrbar):** `snippets/product-grid.liquid`, Marke `LUX-SEITENNAV`. Unter dem Raster ein kleiner Block «Seiten: 1 2 3 4 5 10 20 … 100 letzte»
(Seiten 1–5, die Nachbarn der aktuellen Seite ±2, jede 10. bis 100, die letzte; 15–19 Links). Nur wenn: Vorlage `collection`, Sprache `de`, Handle in der
Pilotliste, kein aktiver Filter, keine Sortierung. Infinite Scroll bleibt unberührt (gemessen: 24 → 120 Karten beim Scrollen). Nicht-Pilot, Suche, /fr und
sortierte Ansicht tragen keinen Block (curl 21.10., 8 Fälle). Rückweg: Block aus der Datei löschen (Sicherung `theme_backup/product-grid.liquid.vor-seitennav-2026-10-21`);
`automation/theme_marken_wache.py` meldet, wenn die Marke verschwindet (Theme-Update).

**Pilot (12):** damen-mode, schmuck-uhren, wohnen-dekoration, beauty-pflege, neu, elektronik-technik, gadgets, schuhe, baby-kleinkind, sport-outdoor, kuechenhelfer, hundewelt.
**Kontrolle (12, gleiche Grössenordnung, ohne Block):** sub-kueche, sub-taschen, sub-baby-kids, luxestyle-premium, sub-haustier, sub-kleider, sommer-2026, aufbewahrung-sub, uhren, rucksaecke, outdoor-garten, spielzeug.

**Erwartung ehrlich:** unbelegt. Die Skeptiker fanden KEINEN Linkeffekt (Top-24 6/12 bekannt gegen Rang 25–60 7/12; Startseiten-Reihen n=12 4 bekannt gegen n=15 1 — beides ohne Teststärke); ein Kategorie-Effekt
(neue Damenmode 50–58 % binnen 28 h gegen 8–20 % bei Gadgets/Schmuck/Haushalt, p=0.027) überlagert jede Messung. Risiko: +~1.8k schwere Listen-URLs (0.8–1.2 MB HTML) können Abrufe von Produkten wegziehen.
Die CREATED_DESC-Listen verschieben sich stündlich — Seitennummern sind Momentaufnahmen.

**Messplan (0 Credits, `inspect_urls` je 10 URLs, bei Timeout 4 je Aufruf):**
- Basis 21.10.: `?page=2` bei damen-mode, schmuck-uhren, wohnen-dekoration, beauty-pflege = «URL is unknown to Google» (4/4); frühere Proben 11/11 unbekannt.
- Messtage: +14 (04.11.), +28 (18.11.), +56 (16.12.). Je Messtag: `?page=2`, `?page=3`, `?page=10` aller 12 Pilot- und 12 Kontroll-Kollektionen → Anteil «bekannt» (Discovered/Crawled/Indexed) und `lastCrawlTime`.
- Entscheid: Pilot ≥ 30 Prozentpunkte über Kontrolle UND ≥ 1 Tiefenseite (`?page≥10`) gecrawlt → ausweiten (Liste in der Datei erweitern); sonst Block löschen und Befund ins Gedächtnis («Seitenlinks steuern den Crawl hier nicht»).
- Immer nach Kategorie getrennt auswerten (Damenmode gegen Rest), nie «Gesamtergebnis ohne Schichtung» als Linkeffekt deuten.
