# Vegan-Kuratierung (echte vegane Produkte)

`classify_vegan.py` klassifiziert den AKTIVEN Katalog (Titel-basiert) als **eindeutig vegan**:
- **POSITIV** (pflanzlich/mineralisch): vegan, bambus, kork, leinen, baumwoll(e), cotton, hanf, jute,
  canvas, stroh, raffia, rattan, soja-/kokoswachs, buchweizen, tencel/lyocell + Natursteine
  (naturstein, lavastein, tigerauge, obsidian, onyx, amethyst, bergkristall, rosenquarz, chakra, jade,
  mondstein, malachit, aventurin, hämatit).
- **NEGATIV** (echte Tiermaterialien → NIE vegan): leder, seide, silk, wolle, merino, kaschmir, mohair,
  angora, pelz, fell, daune, bienenwachs, honig, perlmutt, perle, feder, horn, knochen, elfenbein.
  Override: enthält der Titel explizit „vegan" (z.B. „vegan-Leder"), gewinnt vegan.
- Überspringt Produkte, die schon `vegan|bio|gots|bambus` getaggt sind (bereits in der Collection).

**Lauf 2026-06-13:** 1126 aktive Produkte → **40 eindeutig vegane** getaggt (`vegan`) →
Vegan-Collection 250 → 288. Liste: `tagged_vegan_2026-06-13.json`.
Bug-Lehre: NEG `wolle` als Substring matcht „Baum**wolle**" (Baumwolle = vegan!) → `\bwoll` nutzen.

**Grenze:** Titel-basiert ist präzise, aber niedrige Abdeckung (die meisten veganen Artikel nennen ihr
Material nicht). Für mehr Reichweite: CJ-Vegan-Produkte importieren (Token nötig) ODER breitere Regel.
