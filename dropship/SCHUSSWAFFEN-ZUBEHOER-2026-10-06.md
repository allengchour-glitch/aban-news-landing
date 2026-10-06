# Schusswaffen-Zubehör rutschte durch die Waffen-Wache (06.10.2026, Verbesserungsrunde 04:25)

GEMESSEN: Neuimporte der letzten 8 h (100, alle ACTIVE): «Laser-Boresight für Gewehr und Flinte» (CJ, heute) aktiv. Titel-Suche
über den ganzen Katalog (16 Begriffe, 77 Treffer, fast alles «Waffel…»/«Jagd»-Katzenspielzeug): echte Fälle **2** — Boresight
und «Nylon Gewehrriemen, 2-Punkt» (im Google-Kanal). Ursache: `heikel_zweck.json` kannte «Gewehr» nur zusammen mit einem
Bausatz-/Nachbildungs-Kontext (Regel vom 20.08. gegen Klemmbaustein-Nachbildungen); echtes Zubehör hatte keine Regel.

GETAN:
- `heikel_zweck.json` + 2 Regeln (gilt für Importer `heikel_zweck.mjs` VOR dem Publizieren UND Bestands-Wache
  `ueberwachung_waffen_guard.py`, täglich im Aufseher):
  - `schusswaffen-laser` (Schusswaffen-Nomen + Boresight/Laser, «Laser-Tag» ausgenommen) → **verboten → DRAFT**
    (Laser-Zielgeräte = Waffenzubehör, Art. 4 Abs. 2 WG; #1017-Lehre: verbotene Ware kommt aus Shanghai zurück).
  - `schusswaffen-zubehoer` (Schusswaffen-Nomen + Riemen/Zielfernrohr/Montage/Picatinny/Magazin/Holster/Schalldämpfer …)
    → aus dem Google-Kanal (Google «Guns and Parts»), bleibt im Shop.
- Kanarienvögel 10/10 (Lasertag-Gewehr, Katzen-Laserpointer, Hochdruckreiniger-Pistole, Wasserpistole, Gewehr-Print-Kissen,
  Handy-Holster, Uhren-Lederriemen = kein Treffer). Voll-Export-Trockenlauf: genau 2 Treffer.
- Scharf: Gewehrriemen aus dem Google-Kanal (Tag `waffe-pruefen`); Boresight nach Bildprüfung (grüner Laser-Einschiesser,
  8 Kaliber-Adapter, Marke «ohhunt») → DRAFT, Tags `waffe-verboten-ch`, `schusswaffen-laser`, in `BILDGEPRUEFT`.
