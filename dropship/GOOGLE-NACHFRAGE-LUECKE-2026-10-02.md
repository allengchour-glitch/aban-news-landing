# Google-Nachfrage hing an Entwürfen (02.10.2026, «weiter push überall»)

## Gemessen (ShopifyQL über die Admin-API)
- **Sitzungen je Kanal, 7 Tage:** direkt 292 (6 Warenkörbe), TikTok 182 (0), Facebook 81 (0), Google 14 (1),
  Instagram 3, ChatGPT 3, Pinterest 2. Social postet planmässig: Bild 2×, Reel 1×, Story 1×, TikTok 2×,
  YouTube 2× pro Tag, Pins 7 von 10 am 01.10. → kein Kanal steht still.
- **Google-Sitzungen pro Woche:** 84 (13.07.) → 35 → 55 → 35 → 27 → 14 → 20 → 22 → 26 → 25 → 16 → **10 (28.09.)**.
  Landeseiten: Produkt Juli 188 → August 98 → September 67; Ratgeber Juli 78 → August 2.
- **150 Tage, 185 Produktseiten mit Google-Besuchern: 61 sind heute Entwürfe, archiviert oder gelöscht.** Sie trugen
  **213 von 373 Sitzungen (57 %)**. Spitze: «Wasserdichter Packsack · Dry Bag 20L» 82 Sitzungen (DRAFT seit 29.08.,
  `keine-lieferanten-ref`, 0 Warenkörbe), Rizinusöl-Wickel-Set 55 (2 Warenkörbe).
- **Ein 301 auf ein Ersatzprodukt bringt die Gratis-Einträge nicht zurück.** Der Dry Bag zeigt seit 29.08. auf
  «Dry Bag mit Blumenprint 10L». Diese Seite hatte in 150 Tagen **0** Google-Sitzungen. Google listet nur
  aktive, kaufbare Produkte; der alte Eintrag verschwindet, und der Ersatz rankt nicht für dieselbe Suche.
- **Die CJ-Suchliste war leer** (Grow-Plan, 32 Aufträge erledigt). Die Runner fielen auf die Kategorie-Rotation zurück,
  und die gemessene Google-Nachfrage erreichte nie einen Suchauftrag.

## Getan
- `automation/google_nachfrage_luecke.py` (Kanarienvögel 8/8), täglich im Aufseher mit Neustart nach stillem Absturz:
  - tote Google-Landeseiten mit ≥ 2 Sitzungen oder ≥ 1 Warenkorb werden bewertet;
  - Hausregeln am **Titel**: Klinge, Kostüm, Erotik, Tabak, Medizin/Therapie, topische Kosmetik → «verboten»;
    Herstellermarke → «marke»; eigenes Druckdesign → «eigen»;
  - Lager-Tags (ausverkauft, keine Bezugsquelle) zählen NICHT: genau diese Produkte sollen ersetzt werden;
  - Gemini liefert einen generischen englischen CJ-Suchbegriff; Sommerware ausserhalb April–August → «saison-später»
    (wird ab April erneut geprüft).
  - Aufträge kommen **vorne** in `automation/cj_search_queue.txt`. Der Importer behält Titel-/Bild-Wache und die
    Versand-, Klingen- und Medizin-Sperren.
- Erstlauf: 20 Seiten bewertet → **8 Aufträge** (dry bag 20l, castor oil wrap set, silicone drying mat, new year party kit,
  women reversible belt, electric meat grinder 5l, chiffon evening scarf, cold weather sleeping bag), 8 saison-später
  (Klima/Kühlung/Pool/Strand), 2 Marke, 1 eigenes Design, 1 verboten (Hunde-Rollstuhl).
  Ledger `dropship/_google_nachfrage_luecke.tsv`, Tagesbericht `dropship/GOOGLE-NACHFRAGE-LUECKE.md`.

## Offen
- CJ-Punkte waren um 13:47 UTC leer (99'770 verbraucht). Die Queue läuft, sobald es neue Punkte gibt.
- Wirkung messen in 14 Tagen: Google-Sitzungen pro Woche (Basis 10) und die Seiten der neuen Importe.
- Lehre: ein Entwurf kostet bei Google den Eintrag, nicht nur die Seite. Vor dem Draften eines Produkts mit
  Google-Besuchern zuerst den Ersatz importieren.
