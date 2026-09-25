# Krankheitsbezug in Titeln und Zweckbestimmung — Stand 25.09.2026

**Anlass:** Nebenbefund der Füllmengen-Runde: Kosmetik-Titel wie «Hautregenerationscreme 50g gegen Narben» oder
«Creme für Chloasma und Sommersprossen». Dabei zeigte sich eine zweite Lücke: `medizin_zweck_guard.py` meldete bei
jedem Tageslauf **«Aktive Produkte geprüft: 0»**. Er prüfte nur Neuimporte der letzten 3 Tage, und seit der Grind-Pause
(14.09.) gibt es keine. Zurückgeholte oder nachträglich geänderte Altware lief nie durch.

## Gemessen (Voll-Export 51'336 aktive, Stand 22.09.)
- Medizin-Zweck-Regeln über den ganzen Bestand: **1 Treffer** (Erste-Hilfe-Set). Hallux-Schiene und Hämorrhoidenkissen
  fehlten auch in den Regeln, nicht nur im Zeitfenster.
- Krankheitswörter im Titel: 152 Roh-Treffer, davon **138 Kanarienvögel** («S-chwarze» → warze, «Voll-narbe-nleder»);
  mit Wortgrenze 12 echte.
- Krankheitswörter in Titel oder Text: 32 Produkte (Akne 38×, Narben 10×, Chloasma, Krampfadern, Hämorrhoiden).

## Getan
| Produkt | Massnahme |
|---|---|
| Hallux Valgus Korrektor Schiene | DRAFT + `medizinprodukt-pruefen` (neue Regel `hallux-korrektur`) |
| 3U Hämorrhoidenkissen | DRAFT + `medizinprodukt-pruefen` (neue Regel `haemorrhoiden`) |
| 391-teiliges Erste-Hilfe-Set | DRAFT + `medizinprodukt-pruefen` (bestehende Regel `wundauflage-warenart`, lief nie über den Bestand) |
| 9 Kosmetik-/Schuh-Titel | Titel entschärft (`TITEL_ERSATZ` in `heilversprechen_wache.py`), zurückgelesen |

## Wächter
- `medizin_zweck_guard.py`: einmal je 7 Tage **ganzer Bestand** (`dropship/_medizin_voll_stand.txt`), sonst Neuimporte.
- `heilversprechen_wache.py`: MUSTER kennt jetzt Akne/Narben/Chloasma/Melasma/Neurodermitis/Psoriasis/Ekzem/Nagelpilz/
  Krampfadern **mit Wortgrenze**; FEHLALARM für Spezialeffekt-/Halloween-Schminke. Textstellen werden gemeldet
  (`dropship/HEILVERSPRECHEN.md`) und erst nach dem Lesen per `ERSATZ` geschrieben.
- Offen: die Beschreibungen der 32 Produkte mit Akne/Narben im Text. Sie werden Satz für Satz gelesen, bevor ein Ersatz geschrieben wird.
  Nicht geraten.
