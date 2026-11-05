# L0: «Selbst gestalten»-Produkte mit zu kleiner v5-Druckdatei auf ENTWURF (05.11.2026, LIVE)

**Besitzer 05.11.2026 abends: «1 ja»** (Sofortmassnahme aus dem Bauplan `../BAUPLAN-0511.md`, Empfehlung des Richters).

**Warum (GEMESSEN):** Der live wirksame Editor v5 liefert eine feste Druckdatei von data-ref × data-ref·data-ratio Pixeln (hier 1200×1200, Poster 2400×3394). Printful druckt sie in die Druckfläche des Modells; bei Rundum-Produkten ist das Printfile bis 4950×7500 px gross. Rechnung mit `automation/lib/printful_bestellweg.mjs` (`druckdateiFuer`, `aufloesungPruefen`) und den Printful-Katalogdaten vom 05.11.: Skript `dpi_pruefen.mjs` (nur lesend), Ergebnis `dpi_ergebnis.json`.

**LIVE 05.11. ca. 22:00 UTC:** 14 aktive Produkte auf ENTWURF, frisch zurückgelesen alle DRAFT, Storefront 404 (Boardshorts, Decke), Tasse weiter 200:
Boardshorts (23,5 dpi von mind. 75), Badeanzug (34), Leggings (25,5), Rucksack (58,5), Pullover (27), Allover-Hoodie (30), Bomberjacke (33), Kleid (26), Jogginghose (24, von Hand gerechnet: im Katalog keine Platzierung «front»), Sport-BH (48), Poster (55,8 von mind. 150; 13 von 18 Varianten zu klein), Kissen (57), Strandtuch (16), Kuscheldecke (19).
**Blieben aktiv (Regel: dpi < 85 % der Mindest-dpi sperrt):** Mauspad (133 von 150, 89 %), Notizbuch (137 von 150, 91 %), Stoffbeutel allover (70,6 von 75, 94 %) und alle, die bestehen (T-Shirts, Hoodies, Tassen, Hülle, Kappe, Taschen, Sticker, Magnet, Flasche, Samsung). Dad-Cap und Alltags-Umhängetasche: für eine Variante im Katalog nicht rechenbar, laut Doku bestehen sie.
Weitere v5-Mängel (Vorschau zeigt das Design 2,8-mal bis 3,4-mal grösser, als gedruckt wird) bleiben bis zur Umstellung auf Editor v6 (WP3, Bauplan); auch die aktiven Produkte werden nicht beworben.
- **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/selbst-gestalten-fertig-0511/l0/apply.mjs` (nur Produkte, die noch ENTWURF sind; Sicherung `sicherung.json`). Die Produkte kommen ohnehin mit der Umstellung auf v6 (WP5/L10) zurück.
- Skript `apply.mjs` (Trockenlauf Vorgabe), Test `apply_test.mjs` (14 Prüfungen). Das Skript sperrt Unbekanntes nie: fehlt eine dpi, bleibt das Produkt aktiv.
- Wirkung auf Verkäufe: 0 von 34 Bestellungen kamen je über den Editor; Wirkung unbekannt (Hypothese: gering).
