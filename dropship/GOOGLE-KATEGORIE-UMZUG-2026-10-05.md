# Google-Kategorie: Umzug aus groben Sammelzweigen (05.10.2026, Verbesserungsrunde 08:25 UTC)

**GEMESSEN**
- Neuimporte seit 03.10.: 777 von 904 (86 %) mit nur 1–2 Kategorie-Ebenen (Shopify-Kategorie).
- `google_kategorie_fein.py` (Tageslauf 04.10. 21:54): «FEIN 33 verfeinert, **5'319 bleiben grob**» — Fitness 879, Tools 843, Decor 718,
  Kitchen 578, Pet 456. Die KI-Stufe `google_fein_ki.py` ruht (Gemini 402, OpenAI leer, Groq-Kontingent; 792 von 2'890 eingeordnet).
- Häufigste Wörter der Reste: Fitness → velo/rücklicht/fahrradhelm/zelt/leggings; Decor → kissen/nackenkissen/memory foam/decke/
  bettwäsche/duschvorhang/badetuch; Pet → spielzeug/kratzbaum/futterball. **Diese Ware steht im FALSCHEN Zweig** — die Fein-Stufe darf
  nur innerhalb des bisherigen Zweigs verfeinern (Präfix-Regel), ein Velohelm unter «Exercise & Fitness» bleibt dort für immer grob.

**GETAN**
- `automation/google_kategorie_umzug.py`: Kreuz-Umzug NUR aus genau benannten groben Quellzweigen, nur bei eindeutigem Warenwort,
  Reihenfolge = Vorrang, Kostüme nie, jeder Zielpfad gegen Googles Taxonomie geprüft, **29 Kanarienvögel** (u. a. Motorradhelm,
  Helm-Brille, Reithelm-Visier, Tischdecke, Küchenhandtuch, Yoga-Handtuch, Auto-Nackenkissen, Zierkissen, Kinder-Spielzelt bleiben).
- Trockenlauf → Stichprobe je Ziel gelesen → 6 Fehltreffer-Klassen ausgeschlossen → scharf mit frischem Bulk-Export:
  **653 gesetzt, 0 Fehler** (Rücklesen aus der Antwort): Pillows 123, Activewear 101, Bicycle Accessories 99, Bicycle Helmets 69,
  Blankets 51, Duvet Covers 30, Bath Towels 22, Pet Bowls/Feeders 19, Nursing Pillows 16, Ab Wheels 16, Dish Racks 14, Pliers 14,
  Cat Furniture 12, Tents 12, Shower Curtains 11, Hammocks 9, Dog Apparel 8, Knife Sharpeners 8, Equestrian Helmets 7 …
- Ledger `dropship/_google_kategorie_umzug.tsv` (handle, alt, neu) = Rückweg. Wächter: täglicher Block im Aufseher (frischer Export).

**OFFEN**
- Rest grob ohne eindeutiges Warenwort (z. B. «Spielzeug für Haustiere» ohne Tierart) bleibt für die KI-Stufe (Guthaben = Betreiber).
- Wirkung: nächster `google_feedback_wache`-Vollscan / Google-Merchant-Zuordnung — nicht sofort messbar.
