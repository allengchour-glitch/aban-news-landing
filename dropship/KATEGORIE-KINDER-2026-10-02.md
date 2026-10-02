# Kinderkleidung ohne Kategorie — Verbesserungsrunde 02.10.2026

## GEMESSEN (07:31 UTC)
- Ampel: **~285 aktive Produkte ohne Shopify-Kategorie** (Vortag ~39), davon 119 mit «unbekanntem Typ».
- Ursache: der seit 01.10. 16:20 wieder laufende Grind legt neue Produkttypen an, die `automation/kategorie_wache.py` nicht kannte:
  **«Baby & Kinder» 96** (alle Kinderkleidung: Strampler, Sets, Badeanzüge, 1 Mütze, 2 Decken) und **«Büro & Home Office» 7**
  (4 Anatomiemodelle, Badeball-Set, Mauspad, Infrarot-Zähler). Die Wache rät bei unbekannten Typen bewusst nicht → 0 Kategorie.
- Dieselben 96 bei **Google**: 92× nur «Baby & Toddler» (Oberzweig für Kinderwagen/Windeln, über das Tag `kinder` in
  `google_kategorie.py`), 4× Erwachsenenpfad («Outfit Sets», «Swimwear») mit **age_group = adult**.
- Die Tageswache lief einmal pro Tag → Neuware stand bis zu 24 h ohne Kategorie (Grind ~250 Produkte/Tag).

## GETAN
1. `kategorie_wache.py`: «Baby & Kinder» und «Büro & Home Office» sind Sammeltypen (Titel entscheidet, sonst nicht raten).
   Eigene **KINDERREGELN** auf den Kinderzweig der Shopify-Taxonomie (aa-1-25 Baby & Children's Clothing, IDs am 02.10. per
   `childrenOf` gemessen und beim Start per `nodes(ids:)` geprüft). Vorrang: Bad → Schlaf → Decke → Set → Einteiler →
   Oberteil+Hose → Kleid → Jacke/Weste → Oberteil → Hose/Rock → Socken → Mütze. Trifft keine Kinderregel, gelten die
   allgemeinen Regeln, aber Erwachsenenkleidung wird auf den Kinderzweig gehoben.
   Neue Regel ganz vorn: **Lehrmodelle** (`anatomi…`, `…skelett-modell`) → bi-19-8 Medical Teaching Equipment — sonst wäre
   «PVC Hundeskelett-Modell» über «skelett» Halloween-Deko und «Hundeohr Anatomie-Modell» über «hund» Tierbedarf geworden.
2. Scharf: **141 gesetzt, 0 Fehler**; Rücklesen «Baby & Kinder» 96/96 mit Kategorie (Outfits 56, Einteiler 27, Bad 5,
   Oberteil 2, Decke 2, je 1 Hose/Mütze/Schlaf/Jacke). Offen 18 (Trend-Produkt 9, Trend-Gadget 7, Kinder 1, Büro 1) — bewusst nicht geraten.
3. Neu `automation/kinder_google_pfad.py`: übersetzt die Shopify-Kinderkategorie 1:1 in Googles Pfad — Baby-Wort im Titel →
   «Apparel & Accessories > Clothing > Baby & Toddler Clothing > …» + age_group infant/newborn; sonst Kinder-Oberzweig
   (Outfit Sets, Swimwear …) + kids. Nur grobe/erwachsene Werte werden überschrieben, Pfade gegen Googles Taxonomie geprüft,
   Kostüme ausgenommen. Kanarienvögel 8/8. Scharf: **162 Metafelder, 0 Fehler**; zweiter Trockenlauf: 0 zu ändern.
4. Aufseher (`fixer_keepalive.sh`, per neuer Inode): **stündlich** Kategorie-Wache (CAP 1500) + danach `kinder_google_pfad.py`
   statt nur täglich.

## OFFEN
- 18 Produkte mit Sammeltyp ohne Titeltreffer (z. B. «Diamant-Tropfen», «Versteckte Leckereien») bleiben im Bericht `KATEGORIE-WACHE.md`.
- Der Importer selbst setzt keine Kategorie beim Anlegen; die Stundenwache schliesst die Lücke auf ≤ 1 h.
