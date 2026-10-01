# Halb übersetzte Neuimport-Titel («Denglisch») — Verbesserungsrunde 01.10.2026, 20:30 UTC

## GEMESSEN
- Neuimporte 16:25–20:30 UTC: 255 (254 ACTIVE, 249 im Google-Kanal). Google-Kategorie fehlt bei **0**, < 2 Bilder bei 4,
  Risiko-Titel im Google-Kanal 1 (Fehlalarm: «Auto-USB-Ladegerät mit Zigarettenanzünder» = Kfz-Zubehör, kein Tabak).
- **6/254 (2,4 %) halb übersetzt:** «Halloween Witch Hat Nachtlicht», «Lily of the Valley Duftwärmer ohne Flamme»,
  «Orca & Diver Epoxy Resin Tischlampe», «Nordic Minimalist Nachttischlampe 59 cm», «Marine Yacht Indoor Leselicht»,
  «Halloween-Glühender Skull‑Raven‑Rose aus Resin». Bei ~1'500 Importen/Tag ≈ 35 solche Titel täglich im Google-Feed.
- Warum durchgelassen: `titel_sprache.mjs` fängt nur ABGESCHRIEBENES Englisch (alle Titelwörter im CJ-Namen) — ein deutsches
  Kopfwort («Nachtlicht») reicht als Gegenbeweis. `titel_kauderwelsch_wache.py` suchte nur NICHT-Wörter und nahm
  englische Wörter ausdrücklich aus.

## GETAN
- `automation/titel_kauderwelsch_wache.py`: Prompt meldet jetzt auch stehengebliebenes Englisch mit gängigem deutschem Wort
  (Anglizismen-Ausnahmen erweitert: Indoor, Outdoor, Halloween, Yacht, Camping, Make-up); Vergleich der «falsch»-Angaben
  Wort für Wort (Wortfolge «Witch Hat» = [Witch, Hat]); Ersatz bindestrich-unabhängig verglichen.
  Weiter gilt: geändert wird nur bei Einigkeit Gemini + ChatGPT, sonst nur gemeldet. Aufseher alle 6 h (unverändert).
- Kanarienvögel 11/11 (4 neu: Witch Hat ✓, Lily of the Valley ✓, «Outdoor LED-Lichterkette» bleibt ✓, «Marine Yacht Indoor» = Grenzfall).

## ERGEBNIS (scharf, 21:10 UTC)
- Trockenlauf 239 Titel → scharf: **32 korrigiert** (beide Modelle einig, zurückgelesen), 57 nur gemeldet (uneinig → unverändert).
- Weit mehr als die 6 von Hand gezählten: Mode-Neuware trug «Coat», «Tassel», «Mid-Length», «Down-Jackett», «Quilted»,
  «Checkiert», «Corset», «Chunky-Heel»; dazu zwei abgeschnittene Titel («Bluetooth‑So», «Kordelb»).
- Stichprobe gegen Bild: «Fell‑Kopfbogen‑Mantel» → «Fell‑Kapuzen‑Mantel» — Hauptbild zeigt Fellkapuze ✓.
- Ledger `dropship/_titel_kauderwelsch.tsv` hält alt → neu je Produkt (rückgängig machbar).

## OFFEN
- Altbestand vor dem 29.09. ist nicht im Fenster der Wache (STUNDEN=48) — eigener Lauf mit grösserem Fenster, wenn die
  Neuimport-Zahlen stimmen.
