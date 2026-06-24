# 🎨 LuxeStyle Signature-Stil — „Alpenlicht Editorial" (2026-06-24)

> User: **eigener Stil, nicht geklaut** (das Dunkelwasser+Tropfen war vom BellaVita-Parfum-Ad kopiert → verworfen).
> Unverwechselbar durch die **fixe Kombi**: warmer Schweizer Stein + EIN Alpen-Botanical + Golden-Hour-Seitenlicht +
> cremiges Türkissee-Bokeh + warmer Editorial-Grade. Umgesetzt in `automation/nanobanana_lifestyle.mjs` + `nanobanana-batch.ps1`.

## Die 6 Stil-Regeln (auf JEDES Bild)
1. **Licht:** EIN warmes Seitenlicht von links (Golden Hour, ~30°), lange weiche Schatten nach rechts, sanftes Highlight-Bloom. Kein flaches Studio.
2. **Grade/Palette:** warm-neutral (Travertin-Creme, Hafer-Leinen, Sand) + EIN kühler Akzent (Gletscher-Türkis/Seeblau) + zarter Gold-Schimmer auf Metall. Lifted blacks, cremige Highlights, niedrig-mittlerer Kontrast, feines Korn. Zurückhaltend gesättigt.
3. **Oberfläche+Botanical (Fingerabdruck):** Produkt auf/neben **Naturstein** (Travertin/Kiesel/Granitkante) + GENAU EIN Alpen-Botanical (Edelweiss/Trockengras/Eukalyptus). Nie Strauss, nie Clutter.
4. **Hintergrund:** stark defokussierte Schweizer Landschaft (blasse Berge, Türkissee-Schliere, Lärchen) — cremig, nie Postkarte.
5. **Mood:** Quiet Luxury, sonnige Ruhe, viel Negativraum.
6. **Komposition:** 9:16, Produkt im oberen-mittleren Drittel (Safe-Zone), untere ~20% ruhig.

**Essenz:** *Echtes Produkt, auf warmem Schweizer Stein, ein Alpen-Botanical, spätes Golden-Hour-Seitenlicht, cremiges Alpen-Bokeh.*

## Stil-Auswahl pro Produkt (automatisch im Batch, aus dem Label)
| Produkt | Stil (`--style`) |
|---|---|
| **wasserfest/waterproof** Schmuck | `seetest` = helles **Alpensee-Türkis** (einzige Wasser-Ausnahme, NIE dunkel!) |
| Schmuck (sonst) | `jewelry` (Still-Life auf Travertin + Edelweiss) |
| Kleid/Blazer/Leinen/Rock/Schal/Bademode | `model` (on-Model, Steinterrasse) |
| Tasche/Shopper/Crossbody/Rucksack | `bag` (an Steinkante über Leinen) |
| Sonnenbrille/Brille | `sunglasses` |
| Beauty/Roller/Serum/Pflege | `beauty` |
| Diffuser/Kerze/Wellness/Deko | `home` (sonniges CH-Interieur) |
| Herren/Polo | `men` (kühler, kontrastreicher) |
| Rest | `lifestyle` (Signature-Fallback) |

## Homepage-Hero (meisterhaft)
1. **Primär:** `model` — echte Frau in Bewegung (Haar/Stoff in der Golden-Hour-Brise) auf Travertin-Terrasse + Türkissee-Bokeh = sofort „Premium CH Damenmode", menschlich, lebendig.
2. **Sekundär/Montage:** `jewelry` — Gold-Gleam-Makro auf Stein + Edelweiss = reinster Signature-Ausdruck.
- **Montage-Sequenz:** model → jewelry-Makro → bag → weite model-Terrasse; je ~1.2–1.5s, langsamer Ken-Burns, identischer Alpenlicht-Grade → wirkt wie EINE Kampagne. Untere Drittel ruhig (CTA-Overlay).
