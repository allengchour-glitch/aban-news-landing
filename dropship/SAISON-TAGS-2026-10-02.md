# Saison-Tags für Neuware — 12-Tage-Plan Tag 2 (02.10.2026, 00:35 UTC)

## GEMESSEN
- Startseite: Reihe Halloween (Sektion `pl_kinder` → Kollektion `halloween`, Smart-Regel Tag = `halloween`, CREATED_DESC),
  Reihe Herbst (`pl_herbst` → `herbst-favoriten`, Tag `herbst-2026`, MANUAL), «Neu eingetroffen» (`neuheit`).
- Halloween: neuester Artikel vom **03.09.**, obwohl der Grind seit 01.10. Halloween-Ware importiert. 57 aktive Titel mit
  «Halloween», **9 ohne Tag** — alle vom 01./02.10. Ursache: das Tag setzten nur Fortura/BigBuy, `cj_sku_import.mjs` nie.
- Herbst: erste 8 Karten kaufbar mit ≥ 2 Bildern (8/8). «Neu eingetroffen»: neueste Karten vom 01.10. Optik-Wache 00:12: 0 Befunde.

## GETAN
- `automation/cat_tags.mjs` → `saisonTags(titel, nameEn)`: «halloween» im Titel oder EN-Lieferantennamen → Tag `halloween`.
  Bewusst NICHT auf dem Suchbegriff (eine Halloween-Suche liefert auch neutrale Lampen/Kissen). `cj_sku_import.mjs` ruft es auf.
- `automation/saison_tags_nachtragen.py`: Bestand-Wächter (nur hinzufügen, nur ACTIVE, Rücklesen), Standard trocken,
  im Aufseher-Tageslauf `SCHARF=1`. Kanarienvögel 7/7 («Samt-Kürbis Kissen» und «Ghost Magic Book Nachtlicht» bleiben draussen).
- Scharf: **9 gesetzt, 0 Fehler**. Nachgemessen: Halloween-Reihe erste 8 = 8/8 kaufbar mit ≥ 2 Bildern, 4 davon Neuware.

## OFFEN
- Herbst-Neuaufnahmen laufen nur betreut (`herbst_kuratieren.py`, täglich nur RAEUMEN) — die Reihe ist sortiert MANUAL und gut
  gefüllt (112); Neuware (Daunenjacken, Trenchcoats) kommt beim nächsten betreuten Lauf mit Kontaktbogen.
