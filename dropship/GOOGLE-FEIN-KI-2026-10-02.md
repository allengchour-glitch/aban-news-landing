# Google-Feinkategorien per Zwei-Modell-Einigkeit + Babykleidung im Shop — 02.10.2026

Betreiber: «google push und coole fein kategorien».

## GEMESSEN (Bulk-Export 08:25 UTC)
- 49'905 aktive Produkte, **48'132 im Google-Kanal**. Google-Kategorie-Tiefe: 1 Ebene 1'710, 2 Ebenen 11'962, 3+ 34'449, leer 11.
- Davon **~7'100 in einem Zweig, der noch Unterpfade hat** (Endknoten wie «Shoes»/«Backpacks» zählen nicht): Electronics 1'200,
  Decor 1'095, Exercise & Fitness 898, Tools 734, Kitchen & Dining 650, Pet Supplies 448, Vehicle Parts 346, Clothing 195 …
- Die Titelregeln aus `google_kategorie_fein.py` treffen dort nichts mehr — der Rest ist zu vielfältig für Regex.
- Shop: keine eigene Babykleidungs-Kollektion; 40 Kinderkleider standen in Shopify als Erwachsenenkleidung (aa-1).

## GETAN
1. **`automation/google_fein_ki.py`**: Gemini 2.5 Flash und ChatGPT wählen unabhängig eine Nummer aus der Liste der echten
   Google-Unterpfade des BISHERIGEN Werts (oder 0). Geschrieben nur bei exakt gleicher Wahl ≠ 0 — falsch Einsortiertes bleibt,
   Kostüme/Kinderkleidung aussen vor. Blockweise schreiben + Rücklesen, Ledger `_google_fein_ki.tsv` (übersteht Neustarts).
   - Trockenläufe gelesen: Decor 85/200 einig (Kissen → Throw Pillows, Rollos → Window Blinds & Shades, Bezüge → Slipcovers),
     Electronics/Tools 44/160 einig (Filament → 3D Printer Accessories, Diktiergerät → Voice Recorders, Klauenhammer → Manual Hammers);
     keine falsche Wahl gefunden, ~50 % bleiben bewusst grob («beide 0»).
   - Volllauf: 2 Arbeiter (4 liefen in ChatGPT-429 → Wartefunktion `geduldig`), im Aufseher bis zur Fertig-Marke
     `dropship/_google_fein_ki_fertig_KvonN.txt`. Export: `/tmp/google_fein_ki_export.jsonl`.
2. **40 Kinderkleider** (Typ Kinder/Damenmode/Herrenmode/Trend-Gadget mit Kinderwort im Titel) von aa-1 auf den Kinderzweig
   aa-1-25 umgeordnet (0 Fehler); ausgeschlossen: «im jungen Casual-Stil», «Mädchenstil», Familien-/Damen-/Herren-Titel.
   Kinderregeln ergänzt: Unterwäsche → aa-1-25-11, Pyjama/Nachthemd → Schlaf, «Faux-Zweiteiler»-Kleid → Kleid.
   Danach `kinder_google_pfad.py`: 32 Google-Einträge nachgezogen.
3. **Neue Feinkategorien im Shop (selbstpflegend, Regel = Shopify-Kategorie inkl. Unterkategorien, BEST_SELLING, 6 Kanäle):**
   - 👶 Babykleidung & Kindermode `/collections/babykleidung` — 133 Artikel
   - Strampler & Bodys `/collections/strampler-bodys` — 30
   - Baby- & Kinder-Sets `/collections/baby-kinder-sets` — 66
   Im Hauptmenü unter «Kinder & Haustier» (als HTTP-Link ohne `/en/` — die Kollektions-Verknüpfung erzeugte wieder `/en/…` = 404;
   `menue_links.py`: alle Links ok). Live per WebFetch bestätigt (Strampler & Bodys: 30 Artikel, Menü sichtbar).
   Neue Kinderware fliesst über die stündliche Kategorie-Wache automatisch hinein.

## OFFEN
- Wirkung bei Google messen: Free-Listings-Klicks je Kategorie in ~14 Tagen (Ledger enthält Datum + Ausgangszweig).
- Menü-Backup: `/tmp/claude-0/gpush/main_menu_backup.json` (vor der Änderung, 158 Einträge → jetzt 161).
