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

## GETAN (korrigiert 16:50 UTC)
- `gueltige_ref()`: `lx-` gilt nicht mehr pauschal als Quelle — nur eigene Bündel `LX-BUNDLE-…` und `LXSCH-GIFT-…`
  (Journal 28.08.: `LXSCH-GIFT-TECH-HERO` ist ein eigenes Bündel). Die LX-Hand-Slugs erscheinen damit ab jetzt in der
  täglichen Meldung «SKU ohne gültige Referenzform» — **gemeldet, NICHT gedraftet**.
- ⚠️ Ein erster Entwurf draftete sie automatisch. Zurückgenommen, bevor etwas geschrieben wurde: Das Journal vom 28.08.
  hält fest, dass die Handkuratierung Bewertungen trägt (Jade Roller 5,0★) und pauschales Draften **Betreiber-Entscheid**
  ist. Der Trockenlauf wurde abgebrochen, am Shop ist nichts geändert.
- Kanarienvögel: LX-23-…/LX-DIFF-WHITE → ohne Quelle (Meldung); LX-BUNDLE-…, LXSCH-GIFT-…, CJ-…-LXL, fortura-…-LXL, bb-…,
  CJYD…, Printful → gültig.

## BETREIBER-ENTSCHEID
13 aktive Produkte ohne Bezugsquelle (Liste oben). Optionen: (a) auf Entwurf setzen (`keine-lieferanten-ref`, rückholbar,
besuchte Seiten leitet `tote_landeseiten.py` um); (b) je Produkt eine CJ-Quelle suchen und die SKU nachtragen;
(c) so lassen und bei einer Bestellung von Hand beschaffen. Das Kristall-Set hatte am 29.09. schon eine Kasse.
