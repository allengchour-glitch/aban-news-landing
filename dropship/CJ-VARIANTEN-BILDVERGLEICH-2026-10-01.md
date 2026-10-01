# CJ-Varianten per Bildvergleich (01.10.2026, Verbesserungsrunde)

## Gemessen
- Anlass #1021: Shop-Produkt mit EINER Variante, CJ mit fünf Farben → Engine «manuell prüfen», Kundin wartete.
- Kosten-Export 30.09. (49'233 aktive): **27'390** Einzelvarianten-Produkte mit CJ-pid-SKU (`CJ-<Zahl|UUID>`), davon 4'338 UUID.
- Stichprobe 40 (Zufall, Seed 1001) über `product/variant/query`: **29 mit mehreren CJ-Varianten (≈ 72 %)**, 11 mit einer.
  Hochgerechnet ~20'000 Produkte, bei denen jede Bestellung auf «manuell prüfen» stehen bliebe.

## Getan
- `automation/cj_variante_bild.py`: Shop-Hauptbild + nummerierte CJ-Variantenbilder (≤ 12) an **Gemini UND ChatGPT**
  unabhängig; Treffer nur bei gleicher Nummer und beiden «sicher» ≥ 0.8. Gleiche Variantenbilder (Grössen) → nicht raten.
  Treffer → `dropship/_cj_varianten_zuordnung.tsv` mit Beleg (nächste Bestellung ohne KI).
- `cj_order_engine.vid_fuer()`: Reihenfolge Zuordnungsdatei → Bildvergleich → «manuell prüfen» (mit Grund).
- Kanarienvögel: Uhr #1021 → «Stainless steel blue» (1.00/0.98, = Handvergleich); Fursuit-Kopf → Orange #2
  (Kontaktbogen geprüft, richtig); Laptopständer → Silver (beide einig); Zerkleinerer → **kein Treffer** (GPT 0.55) = steht still.

## Wächter
- Bestell-Ampel (stündlich) meldet weiter «KEIN CJ-Auftrag» nach 2 h; der Grund steht im Engine-Log (`/tmp/cj_fulfill_runner.log`).

## Offen
- Grössen-Varianten (gleiches Bild, z. B. S/M/L) bleiben manuell — der Shop verkauft dann eine Grösse, die nirgends steht.
  Klasse für eine spätere Runde: solche Produkte finden und Varianten im Shop nachtragen oder draften.
