# Flexi-Gelenk-Cutter

Ein wiederverwendbares Cutter-Objekt, das in **einem Boolean-Abzug** ein
gefangenes Kugel-Pfannen-Gelenk in einen vollen Körper schneidet.

## Was es macht
`Körper − Cutter` (Differenz) → zwei getrennte, ineinander verschränkte Teile:
- **−X-Seite:** trägt die **Kugel** (an einem Hals).
- **+X-Seite:** trägt die **Pfanne** (Mündung enger als die Kugel → fällt nicht
  raus, dreht sich frei).

Die X-Achse des Cutters ist die **Gelenkachse**, die Spaltebene liegt bei x = 0.

## Erzeugen
```bash
OUT=cutter/flexi_cutter.stl NECK=1.7 BALL=3.0 CLEAR=0.5 GAP=1.2 DISC=11 \
  blender --background --python flexi_cutter.py
```
| Param | Bedeutung | Default |
|-------|-----------|---------|
| `BALL`  | Kugelradius (mm) | 3.0 |
| `CLEAR` | Spiel Kugel↔Pfanne (mm) | 0.5 |
| `NECK`  | Halsradius (mm) | 1.7 |
| `GAP`   | Spalt zwischen den Teilen (mm) | 1.2 |
| `DISC`  | Außenradius der Trennscheibe (mm, > halbe Körperdicke) | 11 |

## Anwenden
1. Cutter importieren, an die Schnittstelle legen (X = Gelenkachse, x=0 = Trennung).
2. **Boolean-Differenz:** Körper − Cutter.
3. In **Blender**: vor dem Boolean *Merge by Distance* (STL-Import = unverschweißte
   Dreiecke). **Bambu Studio / Cura** verschweißen automatisch.

## Maß-Regel
Der Körper muss an der Schnittstelle **dicker als ~2·(BALL+CLEAR)** sein, sonst
bildet sich keine Pfannenwand. Bei `BALL=3` also **mind. ~9–10 mm Materialdicke**.

## Geprüft
14-mm-Testbalken → 2 gefangene Teile; Querschnitt zeigt die Kugel mit
umlaufendem Spiel in der Pfanne (`renders/cutter_xsect2.png`).
