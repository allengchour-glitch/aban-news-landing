# -*- coding: utf-8 -*-
"""Asset-Charge 35 (th35_*): ZIERWERK.

Warum diese Charge: der Bestand ist gut im Bauen, aber schwach im SCHMUECKEN.
Fast alles besteht aus Quadern mit Bevel — und ein Quader mit Bevel bleibt ein
Quader. Was einem Ort Schoenheit gibt, ist gekruemmt: Brunnenschalen, Balustren,
Schmiedebogen, Voluten. Charge 35 baut genau das, und zwar mit zwei Werkzeugen,
die es hier bisher nicht gab:

  `dreh(profil, ...)`   Drehkoerper. Ein Profil aus (r, z)-Punkten wird um die
                        Z-Achse gedreht. Damit entstehen Schalen, Balustren,
                        Vasen und Sockel in EINEM Stueck — statt aus gestapelten
                        Zylindern, bei denen man jede Stufe sieht.
  `rohr(punkte, r)`     Rundrohr entlang eines Linienzugs, ueber eine Blender-
                        Kurve mit `bevel_depth`. Damit werden Bogen und Voluten
                        rund und stetig, statt aus geraden Streben zusammen-
                        gesetzt (Charge 13 hat die Ketten noch so gebaut, und
                        man sieht jeden Knick).

Konventionen wie th5-th34 (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Schauseite liegt auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).

⚠️ Drehkoerper und Rohre duerfen NICHT durch `runden()`: sie sind bereits rund,
   ein zweiter Bevel auf einer 48-seitigen Schale erzeugt nur Fehlkanten und
   verdreifacht die Dreiecke. Beide Helfer setzen darum selbst das `nb`-Flag.

Das gemeinsame Werkzeug (dreh, rohr, box, export, ...) liegt seit Charge 36 in
`th_werkzeug.py` und wird von beiden Chargen benutzt. Vorher stand derselbe Block
in jeder Charge noch einmal — beim Gold-Fix haette man ihn zweimal aendern muessen.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, TAU)

def _modul(name, bauer, bevel=0.014):
    neu(); bauer(); export(name, bevel, 2)

# ============================================================ Farbwelt
def _mats():
    """Ein Satz Materialien fuer die ganze Charge — Sandstein, Patina, Eisen,
    Gold als Akzent. Zierwerk lebt vom Kontrast weich/hart, nicht von Buntheit."""
    return {
      "stein":  mat_bild("ZwStein", "hausputz.png", (0.88,0.85,0.78), 0.88),
      "stein2": mat("ZwStein2", (0.76,0.72,0.64), 0.90),
      "patina": mat("ZwPatina", (0.36,0.62,0.55), 0.55, 0.25),
      "eisen":  mat("ZwEisen",  (0.16,0.17,0.19), 0.45, 0.65),
      # ⚠️ Gold mit metallic 0,90 wurde im Bild SCHWARZ: ein Metall zeigt fast nur
      # Spiegelung, und ohne Environment-Map ist da nichts zu spiegeln. Die
      # Kugeln am Brunnenrand sahen aus wie Oliven. Halbmetallisch und heller —
      # dann traegt die diffuse Farbe und es liest sich als Messing.
      "gold":   mat("ZwGold",   (0.90,0.74,0.36), 0.34, 0.45),
      "holz":   mat_bild("ZwHolz", "bohlen.png", (0.72,0.55,0.36), 0.75),
      "wasser": mat("ZwWasser",  (0.42,0.72,0.80), 0.10, 0.10),
      "glas":   mat("ZwGlas",    (0.86,0.92,0.96), 0.10, 0.05),
      "licht":  leucht("ZwLicht", (1.00,0.90,0.68), 3.2),
      "laub":   mat("ZwLaub",   (0.27,0.48,0.24), 0.85),
      "bluete": mat("ZwBluete", (0.88,0.42,0.52), 0.70),
      "bluete2":mat("ZwBluete2",(0.94,0.76,0.34), 0.70),
    }

# ================================================================ 1) Zierbrunnen
def _b_brunnen():
    """Zweischaliger Zierbrunnen, 3,20 m Durchmesser, 2,55 m hoch.

    Alles Runde ist EIN Drehkoerper: Beckenwand mit Wulst und Deckplatte, der
    Balusterschaft, die obere Schale. Aus gestapelten Zylindern gebaut haette
    dieselbe Form zwoelf sichtbare Absaetze."""
    M = _mats()
    # Becken: aussen Wulst, oben Sitzplatte, innen abfallend — ein Profil.
    dreh([(0.00, 0.00), (1.60, 0.00), (1.60, 0.34), (1.66, 0.42), (1.66, 0.56),
          (1.58, 0.62), (1.42, 0.62), (1.36, 0.52), (1.36, 0.16), (0.44, 0.10),
          (0.44, 0.00)], M["stein"], 56, name="Becken")
    scheibe(0, 0, 0.44, 1.34, M["wasser"], 48)                       # Wasserspiegel
    # Balusterschaft: Kehle-Wulst-Kehle, das klassische Profil
    dreh([(0.00, 0.10), (0.46, 0.10), (0.46, 0.22), (0.30, 0.30), (0.24, 0.46),
          (0.34, 0.66), (0.36, 0.84), (0.26, 1.00), (0.18, 1.16), (0.22, 1.28),
          (0.34, 1.34), (0.34, 1.42), (0.00, 1.42)], M["stein2"], 40, name="Schaft")
    # Obere Schale: flach, mit ueberstehendem Rand
    dreh([(0.00, 1.42), (0.86, 1.50), (0.92, 1.60), (0.86, 1.68), (0.80, 1.62),
          (0.74, 1.56), (0.20, 1.50), (0.20, 1.42), (0.00, 1.42)],
         M["stein"], 48, name="Schale")
    scheibe(0, 0, 1.585, 0.78, M["wasser"], 40)
    # Aufsatz + Wasserstrahl
    dreh([(0.00, 1.60), (0.20, 1.60), (0.22, 1.74), (0.13, 1.92), (0.17, 2.02),
          (0.09, 2.16), (0.00, 2.24)], M["stein2"], 32, name="Aufsatz")
    flach(kugel(0, 0, 2.30, 0.13, M["gold"], 14))
    for i in range(8):                                               # Fontaenen
        a = TAU*i/8
        p = [(0, 0, 2.34),
             (math.cos(a)*0.26, math.sin(a)*0.26, 2.52),
             (math.cos(a)*0.62, math.sin(a)*0.62, 2.16),
             (math.cos(a)*0.74, math.sin(a)*0.74, 1.62)]
        rohr(p, 0.035, M["wasser"], 8, True, "Strahl")
    kranz(lambda x, y, a, i: flach(kugel(x, y, 0.665, 0.075, M["gold"], 10)), 8, 1.53)

def brunnen(): _modul("th35_brunnen_zier", _b_brunnen, 0.010)

# ================================================================ 2) Schmiedelaterne
def _b_laterne():
    """Schmiedeeiserne Kandelaber-Laterne, 4,55 m.
    Der Mast ist ein Drehkoerper mit Kehlen; die vier Ausleger sind Voluten aus
    `rohr()`. Als gerade Streben gebaut waere es ein Strommast."""
    M = _mats()
    dreh([(0.00, 0.00), (0.34, 0.00), (0.34, 0.10), (0.28, 0.18), (0.30, 0.30),
          (0.22, 0.40), (0.16, 0.52), (0.14, 0.60), (0.11, 0.72), (0.10, 2.60),
          (0.13, 2.72), (0.10, 2.84), (0.10, 3.30), (0.14, 3.40), (0.00, 3.40)],
         M["eisen"], 24, name="Mast")
    for i in range(4):                       # Stuetzvoluten am Fuss
        a = TAU*i/4 + math.pi/4
        c, s = math.cos(a), math.sin(a)
        p = [(c*0.10, s*0.10, 1.00), (c*0.34, s*0.34, 0.80),
             (c*0.44, s*0.44, 0.56), (c*0.34, s*0.34, 0.42), (c*0.20, s*0.20, 0.46)]
        rohr(p, 0.030, M["eisen"], 8, True, "Volute")
    # Kopf: Laternenkorb aus sechs Pfosten, Glas, Haube, Bekroenung
    def pfosten(x, y, a, i):
        strebe((x, y, 3.42), (x*0.72, y*0.72, 4.06), 0.035, M["eisen"])
    kranz(pfosten, 6, 0.30, 0)
    dreh([(0.00, 3.34), (0.38, 3.34), (0.40, 3.44), (0.30, 3.50), (0.00, 3.50)],
         M["eisen"], 24, name="Korbboden")
    o = dreh([(0.00, 3.46), (0.28, 3.46), (0.24, 4.02), (0.00, 4.02)],
             M["glas"], 24, name="Glas", zu_unten=False)
    dreh([(0.00, 3.98), (0.30, 4.02), (0.26, 4.10), (0.18, 4.24), (0.06, 4.36),
          (0.00, 4.38)], M["eisen"], 24, name="Haube")
    flach(kugel(0, 0, 4.44, 0.075, M["gold"], 12))
    strebe((0, 0, 4.48), (0, 0, 4.55), 0.03, M["gold"])
    flach(kugel(0, 0, 3.74, 0.17, M["licht"], 12))                   # Leuchtkoerper
    for i in range(2):                                               # Ausleger mit Ampeln
        a = math.pi*i
        c, s = math.cos(a), math.sin(a)
        p = [(c*0.10, s*0.10, 3.02), (c*0.42, s*0.42, 3.16),
             (c*0.66, s*0.66, 3.10), (c*0.70, s*0.70, 2.92)]
        rohr(p, 0.026, M["eisen"], 8, True, "Ausleger")
        rohr(volute_pkt(c*0.46, 3.02, 0.20, 1.3, 14, s*0.46, 1, math.pi/2),
             0.020, M["eisen"], 8, True, "Volute2")
        dreh([(0.00, 2.62), (0.16, 2.70), (0.20, 2.80), (0.12, 2.90), (0.00, 2.90)],
             M["laub"], 20, x=c*0.70, y=s*0.70, name="Ampel")
        for k in range(5):
            b = TAU*k/5
            flach(kugel(c*0.70 + math.cos(b)*0.13, s*0.70 + math.sin(b)*0.13, 2.60,
                        0.085, M["bluete"] if k % 2 else M["bluete2"], 9))

def laterne(): _modul("th35_laterne_schmiede", _b_laterne, 0.008)

# ================================================================ 3) Torbogen
def _b_torbogen():
    """Schmiedeeiserner Torbogen mit zwei Fluegeln, 4,40 m breit, 3,85 m hoch.
    Der Bogen ist EIN Rohr, die Fuellung sind Voluten. Schauseite +y."""
    M = _mats()
    PB, PH = 1.90, 2.60                                  # Pfeilerachse, Torhoehe
    for s in (-1, 1):                                    # Pfeiler als Drehkoerper
        dreh([(0.00, 0.00), (0.40, 0.00), (0.40, 0.16), (0.32, 0.24), (0.30, 2.34),
              (0.36, 2.42), (0.40, 2.52), (0.30, 2.60), (0.26, 2.76), (0.14, 2.88),
              (0.00, 2.92)], M["stein"], 32, x=s*PB, name="Pfeiler")
        flach(kugel(s*PB, 0, 3.00, 0.15, M["gold"], 12))
    rohr(bogen_pkt(-PB, PB, 2.30, 1.05, 13), 0.055, M["eisen"], 10, True, "Bogen")
    rohr(bogen_pkt(-PB*0.86, PB*0.86, 2.30, 0.80, 13), 0.038, M["eisen"], 8, True, "Bogen2")
    for s in (-1, 1):                                    # Fuellung im Bogenfeld
        rohr(volute_pkt(s*0.95, 2.72, 0.34, 1.5, 16, 0.0, s), 0.026, M["eisen"], 8, True, "V")
        rohr(volute_pkt(s*0.42, 2.98, 0.24, 1.4, 14, 0.0, -s), 0.022, M["eisen"], 8, True, "V")
    strebe((0, 0, 2.30), (0, 0, 3.32), 0.05, M["eisen"])
    flach(kugel(0, 0, 3.42, 0.16, M["gold"], 14))
    strebe((0, 0, 3.52), (0, 0, 3.85), 0.035, M["gold"])
    for s in (-1, 1):                                    # Torfluegel
        x0, x1 = (0.05*s, (PB - 0.34)*s)
        strebe((x0, 0, 0.16), (x1, 0, 0.16), 0.05, M["eisen"])
        strebe((x0, 0, 1.92), (x1, 0, 1.92), 0.05, M["eisen"])
        n = 7
        for k in range(n + 1):
            xx = x0 + (x1 - x0)*k/n
            hh = 1.92 + 0.20*math.sin(math.pi*abs(xx)/(PB - 0.34)*0.5)
            strebe((xx, 0, 0.14), (xx, 0, hh), 0.028, M["eisen"])
            if k < n:
                flach(kugel(xx + (x1-x0)/(2*n), 0, hh + 0.10, 0.045, M["gold"], 9))
        rohr(volute_pkt(x0 + (x1-x0)*0.5, 1.06, 0.42, 1.5, 16, 0.0, s), 0.024,
             M["eisen"], 8, True, "TorV")

def torbogen(): _modul("th35_torbogen", _b_torbogen, 0.008)

# ================================================================ 4) Pflanzschale
def _b_pflanzschale():
    """Zierschale auf Balusterfuss, 1,05 m Durchmesser, 1,12 m hoch.
    Ein Drehkoerper von Fuss bis Rand, dann Blueten."""
    M = _mats()
    dreh([(0.00, 0.00), (0.30, 0.00), (0.30, 0.09), (0.24, 0.14), (0.16, 0.22),
          (0.13, 0.34), (0.18, 0.44), (0.22, 0.50), (0.34, 0.56), (0.44, 0.66),
          (0.50, 0.80), (0.52, 0.92), (0.48, 0.98), (0.44, 0.92), (0.42, 0.80),
          (0.36, 0.66), (0.20, 0.58), (0.00, 0.56)], M["stein"], 44, name="Schale")
    kranz(lambda x, y, a, i: flach(kugel(x, y, 0.955, 0.036, M["gold"], 9)), 12, 0.505)
    scheibe(0, 0, 0.82, 0.42, M["laub"], 28)
    import random as _r
    rnd = _r.Random(35)
    for i in range(26):                                  # Bepflanzung
        a = rnd.uniform(0, TAU); rr = rnd.uniform(0.05, 0.44)
        x, y = math.cos(a)*rr, math.sin(a)*rr
        h = 0.86 + rnd.uniform(0.0, 0.16)
        flach(kugel(x, y, h, rnd.uniform(0.07, 0.11), M["laub"], 8))
        if i % 3 == 0:
            flach(kugel(x, y, h + 0.10, 0.055,
                        M["bluete"] if i % 2 else M["bluete2"], 8))
    # 🌿 ZWEI Anlaeufe gebraucht. Erst waren die Haenger 0,03 dicke Boegen, die vom
    # Rand nach AUSSEN schwangen — fuenf Henkel an einer Suppenterrine. Dann duenne
    # Rohre gerade nach unten — ein Fransenvorhang aus gruenen Stangen. Eine
    # ueberhaengende Pflanze ist gar keine Linie, sondern eine KETTE aus Blattballen,
    # die nach unten kleiner werden und seitlich wandern. Rohre koennen das nicht.
    for i in range(9):
        a = TAU*i/9 + 0.2
        # Kette dichter: mit 4-6 Kugeln auf 0,72 m Fall rissen die Ballen
        # auseinander und einzelne schwebten frei in der Luft.
        n = 7 + (i % 3)
        for k in range(n):
            t = k/(n - 1.0)
            aa = a + (0.30 if i % 2 else -0.30)*t*t          # seitliches Auswandern
            rr = 0.545 - 0.05*t*t
            flach(kugel(math.cos(aa)*rr, math.sin(aa)*rr, 0.90 - 0.62*t*t - 0.10*t,
                        0.078 - 0.040*t, M["laub"], 8))
        if i % 2 == 0:
            aa = a + (0.22 if i % 4 else -0.22)
            flach(kugel(math.cos(aa)*0.53, math.sin(aa)*0.53, 0.90 - 0.34*(n/6.0),
                        0.042, M["bluete"] if i % 4 else M["bluete2"], 8))

def pflanzschale(): _modul("th35_pflanzschale", _b_pflanzschale, 0.008)

# ================================================================ 5) Zierbank
def _b_bank():
    """Gusseiserne Parkbank mit Volutenwangen, 1,74 x 0,66 x 0,97 m.
    Die Wangen sind Rohre, Sitz und Lehne Holzlatten. Schauseite +y.

    ⚠️ Ein Rohrende steht NICHT auf `z - r`. Der Bevelkreis liegt quer zur
    Tangente; laeuft das Bein senkrecht aus, ist die Unterkante genau der
    Endpunkt. Erst hiess es z = 0,02 (zmin 0,016), dann z = 0,032 (zmin 0,028) —
    beide Male schwebte die Bank. Jetzt enden die Beine auf z = 0,03 und stehen
    auf vier gusseisernen Fussplatten, die den Rest ausfuellen."""
    M = _mats()
    B, SH = 1.84, 0.44
    for s in (-1, 1):
        x = s*(B/2 - 0.09)
        # Wange: Bein -> Sitzkante -> Armlehne -> Lehnenpfosten, in EINEM Zug
        rohr([(x, -0.20, 0.032), (x, -0.24, 0.30), (x, -0.26, SH),
              (x, -0.02, 0.62), (x, 0.20, 0.60), (x, 0.24, 0.46), (x, 0.22, 0.30)],
             0.030, M["eisen"], 8, True, "Wange")
        rohr([(x, 0.22, 0.032), (x, 0.24, 0.24), (x, 0.10, 0.40), (x, -0.10, 0.44)],
             0.030, M["eisen"], 8, True, "Bein")
        rohr([(x, -0.24, SH), (x, -0.30, 0.66), (x, -0.26, 0.86), (x, -0.12, 0.96)],
             0.030, M["eisen"], 8, True, "Lehnpfosten")
        rohr(volute_pkt(-0.10, 0.66, 0.16, 1.4, 14, x, s, 0.0, "yz"),
             0.020, M["eisen"], 8, True, "V")
    for k in range(5):                                   # Sitzlatten
        box(0, 0.16 - k*0.11, SH, B - 0.10, 0.085, 0.035, M["holz"])
    for k in range(4):                                   # Lehnenlatten
        box(0, -0.245 - k*0.014, 0.60 + k*0.11, B - 0.14, 0.045, 0.075, M["holz"])
    for s in (-1, 1):                                    # Armlehnen
        box(s*(B/2 - 0.09), -0.03, 0.635, 0.06, 0.34, 0.045, M["holz"])
    box(0, -0.05, 0.06, B - 0.24, 0.05, 0.05, M["eisen"])            # Querzug
    for s in (-1, 1):                                    # Fussplatten
        for yy in (-0.20, 0.22):
            dreh([(0.00, 0.00), (0.085, 0.00), (0.085, 0.018), (0.05, 0.034),
                  (0.00, 0.034)], M["eisen"], 16,
                 x=s*(B/2 - 0.09), y=yy, name="Fuss")

def bank(): _modul("th35_bank_zier", _b_bank, 0.007)

# ================================================================ 6) Rosenpergola
def _b_pergola():
    """Pergola mit Rundbogenjochen, 3,40 x 2,60 x 2,90 m — der Durchgang ist
    2,00 m breit und 2,20 hoch, man kann also hindurchlaufen."""
    M = _mats()
    BX, TY = 1.70, 1.10
    for sx in (-1, 1):
        for sy in (-1, 1):                               # Pfosten
            dreh([(0.00, 0.00), (0.16, 0.00), (0.16, 0.10), (0.11, 0.16),
                  (0.10, 2.28), (0.13, 2.36), (0.10, 2.44)],
                 M["holz"], 20, x=sx*BX, y=sy*TY, name="Pfosten")
    for sy in (-1, 1):                                   # Laengsbogen (Schauseiten)
        rohr(bogen_pkt(-BX, BX, 2.34, 0.42, 13, sy*TY), 0.055, M["holz"], 8, True, "Bogen")
    for sx in (-1, 1):                                   # Querbogen
        pts = [(sx*BX, -TY + 2*TY*i/8, 2.34 + 0.30*math.sin(math.pi*i/8)) for i in range(9)]
        rohr(pts, 0.048, M["holz"], 8, True, "QBogen")
    for k in range(7):                                   # Sparren quer ueber alles
        xx = -BX + 2*BX*k/6
        pts = [(xx, -TY - 0.22 + (2*TY + 0.44)*i/8,
                2.42 + 0.26*math.sin(math.pi*i/8)) for i in range(9)]
        rohr(pts, 0.032, M["holz"], 6, True, "Sparren")
    for sx in (-1, 1):                                   # Seitengitter
        for k in range(4):
            zz = 0.55 + k*0.48
            box(sx*BX, 0, zz, 0.05, 2*TY - 0.10, 0.05, M["holz"])
    import random as _r
    rnd = _r.Random(7)
    for i in range(70):                                  # Rosen ueber Bogen und Gitter
        sx = -1 if i % 2 else 1
        t = rnd.uniform(0, 1)
        if i % 3 == 0:
            x, y = sx*BX + rnd.uniform(-0.10, 0.10), -TY + 2*TY*t
            z = 0.5 + rnd.uniform(0, 1.8)
        else:
            x = -BX + 2*BX*t
            y = (-1 if i % 4 < 2 else 1)*TY + rnd.uniform(-0.12, 0.12)
            z = 2.34 + 0.42*math.sin(math.pi*t) + rnd.uniform(-0.10, 0.22)
        flach(kugel(x, y, z, rnd.uniform(0.10, 0.17), M["laub"], 8))
        if i % 4 == 0:
            flach(kugel(x + rnd.uniform(-0.08, 0.08), y, z + 0.11, 0.055,
                        M["bluete"] if i % 8 else M["bluete2"], 8))

def pergola(): _modul("th35_pergola", _b_pergola, 0.008)

# ================================================================ 7) Sonnenuhr
def _b_sonnenuhr():
    """Sonnenuhr auf Balustersaeule, 1,32 m hoch. Der Schattenzeiger steht
    unter 47 Grad — der Breite der Schweiz, nicht irgendein Winkel."""
    M = _mats()
    dreh([(0.00, 0.00), (0.42, 0.00), (0.42, 0.10), (0.34, 0.16), (0.30, 0.22),
          (0.20, 0.30), (0.17, 0.44), (0.22, 0.60), (0.23, 0.76), (0.16, 0.92),
          (0.14, 1.02), (0.20, 1.10), (0.30, 1.14), (0.30, 1.20), (0.00, 1.20)],
         M["stein"], 40, name="Saeule")
    p = dreh([(0.00, 1.20), (0.44, 1.20), (0.46, 1.24), (0.44, 1.28), (0.00, 1.28)],
             M["patina"], 48, name="Zifferblatt")
    for i in range(12):                                  # Stundenstriche
        a = TAU*i/12
        strebe((math.cos(a)*0.24, math.sin(a)*0.24, 1.285),
               (math.cos(a)*0.40, math.sin(a)*0.40, 1.285), 0.018, M["gold"])
    # Gnomon: Dreieck mit 47 Grad Neigung
    h = 0.34
    d = h/math.tan(math.radians(47))
    v = [(-0.02, -d/2, 1.28), (0.02, -d/2, 1.28), (0.02, d/2, 1.28),
         (-0.02, d/2, 1.28), (-0.02, d/2, 1.28 + h), (0.02, d/2, 1.28 + h)]
    f = [(0,1,2,3), (2,1,5), (3,2,5,4), (0,3,4), (0,4,5,1)]
    me = bpy.data.meshes.new("Gnomon"); me.from_pydata(v, [], f); me.update()
    g = bpy.data.objects.new("Gnomon", me); bpy.context.collection.objects.link(g)
    me.materials.append(M["gold"]); bpy.context.view_layer.objects.active = g
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    # 🪨 Vorher lag hier ein Kranz aus acht Laubkugeln — im Bild acht verstreute
    # Erbsen um den Fuss. Eine Sonnenuhr steht auf einer STUFE; die gibt ihr
    # Halt im Boden und wiederholt das Rund des Zifferblatts.
    dreh([(0.00, 0.00), (0.62, 0.00), (0.62, 0.09), (0.56, 0.13), (0.50, 0.13),
          (0.48, 0.16), (0.00, 0.16)], M["stein2"], 40, name="Stufe")

def sonnenuhr(): _modul("th35_sonnenuhr", _b_sonnenuhr, 0.007)

# ================================================================ 8) Balustrade
def _b_balustrade():
    """Balustraden-Modul, 2,00 m im Raster — reihbar wie die Wandmodule aus
    Charge 34: x += 2,00, Unterkante z=0, in x und y auf die Mitte zentriert.
    Sieben gedrechselte Balustren zwischen Sockel und Handlauf."""
    M = _mats()
    BR = 2.00
    box(0, 0, 0.07, BR, 0.36, 0.14, M["stein2"])                     # Sockel
    box(0, 0, 0.16, BR, 0.30, 0.06, M["stein"])
    n = 7
    for k in range(n):
        x = -BR/2 + BR*(k + 0.5)/n
        dreh([(0.00, 0.19), (0.10, 0.19), (0.10, 0.24), (0.07, 0.28), (0.06, 0.36),
              (0.10, 0.46), (0.115, 0.56), (0.09, 0.64), (0.055, 0.72), (0.05, 0.80),
              (0.08, 0.86), (0.10, 0.90), (0.10, 0.94), (0.00, 0.94)],
             M["stein"], 20, x=x, name="Balustre")
    box(0, 0, 0.99, BR, 0.34, 0.10, M["stein2"])                     # Handlauf
    box(0, 0, 1.06, BR, 0.28, 0.05, M["stein"])

def balustrade(): _modul("th35_balustrade", _b_balustrade, 0.008)

# ================================================================ 9) Schau-Ensemble
def _teil(fn, px, py, rot=0.0, pz=0.0):
    """Baut ein Teil und setzt es als GANZES an seinen Platz. Wie in Charge 34:
    das Empty bekommt bewusst KEINE matrix_parent_inverse — die Kinder SOLLEN
    sich mitbewegen."""
    vor = set(bpy.context.scene.objects)
    fn()
    emp = bpy.data.objects.new("Platz", None); bpy.context.collection.objects.link(emp)
    emp.location = (px, py, pz); emp.rotation_euler[2] = rot
    for o in list(bpy.context.scene.objects):
        if o in vor or o is emp: continue
        o.parent = emp
    return emp

def ensemble():
    """Brunnenplatz aus den Einzelteilen — zugleich der Beweis, dass die Massstaebe
    zueinander passen. Ein Teil allein sieht immer gut aus; erst nebeneinander
    faellt auf, wenn die Bank zu klein oder die Laterne zu gross ist."""
    neu()
    M = _mats()
    scheibe(0, 0, 0.005, 8.6, M["stein2"], 64)                       # Platzbelag
    _teil(_b_brunnen, 0, 0)
    # 🏛️ Balustrade in RUNS, nicht einzeln. Vier Module auf einem Kreis verteilt
    # lasen sich wie vier vergessene Zaunstuecke; erst aneinandergereiht wird
    # daraus eine Bruestung. Das Raster ist 2,00 — also x = ±1, ±3, ±5.
    for x in (-5, -3, 3, 5):
        _teil(_b_balustrade, x, 6.0, 0)                              # Nord, Tor in der Mitte
    for x in (-5, -3, -1, 1, 3, 5):
        _teil(_b_balustrade, x, -6.0, math.pi)                       # Sued, durchgehend
    for s in (-1, 1):
        _teil(_b_laterne, s*4.6, -4.0)
        _teil(_b_bank, s*5.2, 1.4, -s*math.pi/2)
        _teil(_b_pflanzschale, s*2.2, 4.4)
    _teil(_b_torbogen, 0, 6.0)
    _teil(_b_sonnenuhr, 0, -4.6)
    _teil(_b_pergola, -6.8, -1.0, math.pi/2)
    export("th35_ensemble", 0.010, 2)

if __name__ == "__main__":
    print("Asset-Charge 35 (th35, Zierwerk):")
    for fn in (brunnen, laterne, torbogen, pflanzschale, bank, pergola,
               sonnenuhr, balustrade, ensemble):
        fn()
    print("fertig")
