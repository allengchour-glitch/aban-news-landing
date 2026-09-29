# Handkuratierte LX-Produkte ohne Bezugsquelle (Verbesserungsrunde 29.09.2026, 16:25 UTC)

## GEMESSEN
- Landeseiten 7 T (ShopifyQL, nur Menschen): **Kristall-Set 3-teilig** = 2 Sitzungen, **1 Warenkorb, 1 Kasse** —
  die einzige Produktseite der Woche mit Kaufschritt. SKU: `LX-23-KRISTALL-SET-3-TEILIG`.
- Alle aktiven Varianten mit SKU `LX…`: 18 Produkte, davon 3 Fehltreffer (Grösse «LXL» bei CJ/Fortura), 1 echtes
  Bündel-Präfix fehlt, **14 frei getippte Slugs** der Juni-Handkuratierung (LX-11 … LX-35, LX-DIFF/JWL/PHN/LAMP/CLOCK/BAG,
  LXSCH-GIFT-TECH-HERO). Keine Metafeld-/Tag-Quelle, keine Zuordnung im Repo;
  `COWORK-AUFTRAEGE.md` nennt sie «handkuratierte Altprodukte ohne Lieferanten dahinter».
- Letzte 17 Bestellungen: **keine** mit LX-SKU → nie geliefert, nie belegt, woher.
- Ursache: `ohne_lieferantenref_guard.py` liess `lx-` pauschal als Quelle gelten («lieber durchlassen»). Dieselbe
  Klasse wie #1008 (bezahlt, nie lieferbar).

## GETAN
- `gueltige_ref()`: nur noch `LX-BUNDLE-…` gilt als Quelle; neue Klasse `LX_HAND` (`^lx(sch)?-` ohne Bündel) wird
  wie «ohne SKU» behandelt → DRAFT + Tag `keine-lieferanten-ref` (rückholbar: `REVIVE=1`, sobald eine Quelle in der SKU steht).
- Übrige Schein-SKUs bleiben wie bisher NUR gemeldet.
- Kanarienvögel: LX-23-…/LX-DIFF-WHITE/LXSCH-GIFT → ohne Quelle; LX-BUNDLE-…, CJ-…-LXL, fortura-…-LXL, bb-…, CJYD…,
  Printful → gültig.
- Tote Seiten: `tote_landeseiten.py` (täglich) leitet besuchte, jetzt gedraftete Seiten auf gleichartige Ware um.
