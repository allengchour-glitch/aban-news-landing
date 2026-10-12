# Halloween-Kollektion: oben nur Ware, die vor Halloween ankommt (12.10.2026, «weiter verbessern»)

## GEMESSEN
- ChatGPT ist der zweitbeste Kanal und wächst: 1/Woche (Juli) → 17–32/Woche (Sept./Okt.), 90 T 159 Sitz. → 8 Körbe → 1 Kauf.
  Landeseiten: /pages/influencer-partner 35, Startseite 23, **/collections/halloween 14** (0 Körbe), Kostüm-Seiten 8.
- «Halloween» (Smart-Kollektion, Tag halloween): 224 aktive = 92 CJ-Direktversand + 132 Schweizer Lager. Sortierung
  «neueste zuerst» → **oben 12 von 12 CJ** (Grind importiert gerade Halloween-Suchaufträge). Lieferzusage CJ 10–20 WT + 3 WT
  Bearbeitung = ab 12.10. bis **12.11.** — nach Halloween. Lager-Ware (Fortura/DPD): 1–2 Werktage. Der Kollektionstext wirbt
  schon mit «Last-Minute? Kostüme ab Schweizer Lager» — die Sortierung zeigte das Gegenteil.

## GETAN
- `automation/anlass_lieferzeit_wache.py` + Tabelle `data/anlass_kollektionen.json` (Halloween 31.10., Advent 01.12.,
  Weihnachten 24.12. ×3): Ist Direktversand zu spät, Lager-Ware aber rechtzeitig → Kollektion MANUAL, Lager-Ware oben
  (stabile Reihenfolge), danach Direktversand, dann Inaktive. Nach dem Anlass: frühere Sortierung zurück (Ledger
  `dropship/_anlass_sort.tsv`, «halloween vorher CREATED_DESC»). Selbsttest 10/10. Aufseher täglich (SCHARF).
- Live: «halloween» CREATED_DESC → MANUAL, zurückgelesen **oben 12 = 12 Lager-Artikel**. Zweiter Lauf: «schon richtig».
- Weihnachten/Advent: Direktversand kommt noch rechtzeitig (bis 12.11.) → unverändert. Die Wache stellt ab ~21.11. selbst um.

## OFFEN
- Nichts für den Betreiber. Nach dem 31.10. setzt die Wache Halloween automatisch auf «neueste zuerst» zurück.
