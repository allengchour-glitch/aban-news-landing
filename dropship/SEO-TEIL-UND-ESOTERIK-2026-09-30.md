# SEO-Teilschreiber löschen SEO-Titel · Esoterische Heilaussagen (30.09.2026)

## 1. Esoterik (Anlass: Kristall-Set = einzige Produktseite mit Kauf der Woche, 5 Sitz./2 Warenkörbe/1 Kauf)
- GEMESSEN: Vollscan 49'233 aktive (Titel, Text, SEO): «Heilstein/Heilpraktik/heilend/negative Energie» in **4 Produkten**
  (Kristall-Set SEO «3 handverlesene Heilsteine», Fluorit «negative Energieansammlungen im Körper eliminieren»,
  Labradorit «vor negativen Energien schützen», Luftbefeuchter «heilender Rauchring»). «Chakra» (11) und «Aura» (7) =
  beschreibend (Armband-Design, Parfum) → bleiben.
- GETAN: `heilversprechen_wache.py` MUSTER + 6 ERSATZ-Phrasen (am ganzen Satz gelesen), 3 Texte geschrieben + zurückgelesen;
  Kristall-Set SEO-Beschreibung von Hand («Rosenquarz, Bergkristall und Amethyst im Premium-Set …»). Kanarienvögel 9/9,
  Katalog-Fehlalarme 0. SEO-Wächter-Trockenlauf danach: 0 Treffer.
- Nebenfehler behoben: `NUR_OFFEN`/`FIX=0`-Läufe schoben `_heilversprechen_seit.txt` vor und überschrieben den Tagesbericht
  (gemessen: Trockenlauf schob 13:21 → 00:4x, zurückgestellt) → Teilläufe ändern weder Stempel noch Bericht; neu `NUR_IDS=`.
- Lücke bleibt: MUSTER-Erweiterungen wirken nicht rückwirkend auf «sauber» quittierte Produkte (Ledger-SHA) → nach jeder
  Erweiterung Vollscan + `NUR_IDS`.

## 2. SEO-Titel gelöscht (Nebenfund beim Kristall-Set)
- GEMESSEN: `productUpdate` mit `seo:{description}` OHNE title setzt seo.title auf null (Kristall-Set: «Kristall-Set 3-teilig ·
  Rosenquarz · Bergkristall · Amethyst» weg, sofort wiederhergestellt + zurückgelesen).
- Ausmass: 25'133 von 25'183 aktiven Produkten im Ledger von `seo_versandschwelle_fix.py` ohne SEO-Titel; übriger Katalog
  117 von 24'050. 23'734 der 23'983 verbliebenen SEO-Titel = «Produkttitel | LuxeStyle CH».
- Wirkung klein: ohne SEO-Titel rendert das Theme «Produkttitel – LuxeStyle» (live geprüft) → KEINE Massen-Wiederherstellung
  (25k Schreibvorgänge für « | LuxeStyle CH» statt « – LuxeStyle»). Handgepflegte SEO-Titel darunter sind nicht rekonstruierbar.
- GETAN: Titel mitgeben in `seo_versandschwelle_fix.py`, `seo_desc_kuerzen.py`, `kollektion_prompttext_fix.py`,
  `kollektionstext_wahrheit.py`, `heilversprechen_seo_wache.py` (dort auch Rücklese-Vergleich None = ""). Wächter:
  Regel `seo-teil` im zweiten Gehirn (Köder = echter Fall, Echt = f-String-Titel) → 0 NEU. Grenze: Variablen-Objekte sieht die
  Regel nicht (heilversprechen_seo_wache war so ein Fall — von Hand gefunden).
