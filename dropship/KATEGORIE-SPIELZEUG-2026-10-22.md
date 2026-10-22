# Spielzeug in der falschen Kategorie — Runde 04:25 (22.10.2026)

## GEMESSEN
- **Neuimport 04:18 UTC:** «Magnetische Rennstrecke mit Auto – 68-Teile-Set» (Typ Spass-Elektronik, Tags gadgets+kinder+spielzeug) stand in der **Shopify-Kategorie «Fahrzeuge & Teile > Fahrzeugersatzteile & -zubehör»** (`vp-1`) und in der **Google-Kategorie «Baby & Toddler»** — ein Rennbahn-Set aus 68 Teilen.
- **Ursache 1 (Shopify, `kategorie_wache.py`):** Titelregel `\bauto(?:-|\b)|…` → `vp-1` stand VOR der Spielzeugregel; das Wort «Auto» des Spielzeugs traf. Dasselbe «Alloy Auto Modell 1:32» (Modell-Auto 1:32) und «Geländewagen-Modellauto» (Electronics).
- **Ursache 2 (Google, `google_kategorie.py` + `.mjs`):** Tag-Rückfall `("kinder", "Baby & Toddler")` — kein Titelmuster erkannte das Spielzeug, also entschied der Tag `kinder`. Der Tag `spielzeug` kam in der Tabelle nicht vor.
- **Ausmass (Voll-Export 03:09 UTC, 56'463 aktive):** 39 Produkte mit Google-Kategorie «Baby & Toddler», davon **18 Spielzeuge/Kinderware mit Tag `spielzeug`** (nicht Baby); in Vehicles & Parts 529 Produkte, **1 echtes Fehlstück** (Alloy Auto Modell). Der Rest ist richtig (Autozubehör) oder nur grob.
- **Blast-Radius der Google-Regel:** 726 der 1'761 aktiven `spielzeug`-Produkte würden vom Basisergebnis «Baby & Toddler/Clothing» auf «Toys & Games > Toys» wechseln — aber `google_kategorie.py` schreibt **nur leere Felder** («Vorhandenes bleibt stehen»), die übrigen 708 tragen längst feinere Pfade (Robotic Toys, Play Vehicles …) von den Fein-Werkzeugen. Wirkung der Regel = Neuware.

## GETAN
1. `automation/kategorie_wache.py`: neue Titelregel vor der Fahrzeugregel — Spielzeug-Auto/Modellauto, Rennbahn/Rennstrecke MIT Auto-Wort, Massstab-Modell (1:32) → `tg-5`. Bewusst nicht «Kinder», «Modell» oder «Spiel» allein. Kanarienvögel +9 (4 positiv, 5 Gegenfälle: Auto-Sitzbezug, Autositz-Schutzmatte, Scheibenwischer-Set bleiben `vp-1`; «Rennstrecken-Handschuhe» und «Wandtattoo Rennstrecke» bleiben unberührt). `--test`: 388/388. **Mutationsbeweis:** Regel entfernt → 384/388 (4 rot).
2. **Blast-Radius Shopify-Regel** (56'463 Titel × 4 Sammeltypen): 8 Titel wechseln — 7 «Modellauto»-Titel (el/sg/vp-1 → tg-5), keiner falsch.
3. `automation/google_kategorie.py` + `.mjs` (Importer): `("spielzeug", "Toys & Games > Toys")` vor `kinder`; Baby-/Neugeborenen-/Kleinkind-Titel ausgenommen (bleiben «Baby & Toddler»); Haustier sticht weiter.
4. **Live korrigiert** (alle zurückgelesen, 0 userErrors): 3 Shopify-Kategorien (`Rennstrecke`, `Alloy Auto Modell`, `Geländewagen-Modellauto` → `tg-5`) und 15 Google-Kategorien (Metafeld `mm-google-shopping.google_product_category` → «Toys & Games > Toys»). Nicht angefasst, weil mehrdeutig: Highland-Kuh-Adventskalender, DIY-Mikro-Landschaft-Bastelset, Holz-Mini-Musikbox-Ornament; echte Babyware (Meilenstein-Sets, Babykissen …) bleibt «Baby & Toddler».
5. **Wächter:** `automation/google_kategorie_kanarien.py` (8 Fälle × 2 Umsetzungen = 16 Prüfungen, prüft auch die Übereinstimmung von `.py` und `.mjs`; Mutanten: `.mjs`-Regel weg → 12/16, Baby-Ausnahme weg → 14/16, `.py`-Regel weg → rot) im Aufseher neben den Titelregel-Kanarienvögeln (`fixer_keepalive.sh`, Meldung `⚠️ GOOGLE-KATEGORIE-KANARIEN`).

## Bewusst NICHT
- Keine Massenüberschreibung der 708 feineren Google-Pfade; keine neue Regel für «Kinder»-Titel allgemein («Autositz für Kinder» bleibt Fahrzeug).
- Offen beobachtet, kein Befund dieser Klasse: «Schraubspiel für Kinder» trägt Shopify-Kategorie `ha-15` (Werkzeug), «Holz-Miniflugzeug» und «Holz-Steckspiel» `el` — Shopify-Seite der Spielzeug-Sammeltypen, nächste Runde zu messen.
