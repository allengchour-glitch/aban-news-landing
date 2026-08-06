# -*- coding: utf-8 -*-
"""Asset-Charge 36 (th36_*): PARK- UND PLATZSCHMUCK.

Fortsetzung von Charge 35 (th35_*, Zierwerk) mit denselben zwei Werkzeugen —
`dreh()` fuer Drehkoerper, `rohr()` fuer Bogen und Voluten. Charge 35 hat das
Mobiliar eines Zierplatzes gebaut (Brunnen, Bank, Laterne, Balustrade); Charge 36
baut, was einen ganzen PARK ausmacht: ein Bauwerk zum Draufschauen, eine Bruecke
zum Druebergehen, eine Einfriedung zum Reihen und die kleinen Dinge dazwischen.

Konventionen wie th5-th35 (siehe models/TH5-ASSETS.md):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — Drehkoerper und Rohre sind davon
    ausgenommen (`nb`-Flag), sie sind schon rund.
  * Schauseite liegt auf Blender +y  ->  three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER — reihbare Teile, damit man ohne Nachmessen bauen kann:
      th36_zierzaun        2,000 (x)   ->  reihen: x += 2,00
      th35_balustrade      2,000 (x)   ->  gleiches Raster, mischbar

Das Werkzeug liegt in `th_werkzeug.py` und wird von Charge 35 UND 36 benutzt.
Vorher stand derselbe 200-Zeilen-Block in jeder Charge noch einmal; beim
Gold-Fix haette man ihn zweimal aendern muessen und die zweite Kopie vergessen.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, TAU)

def _mats():
    """Farbwelt wie Charge 35, damit beide Chargen auf demselben Platz stehen
    koennen, ohne dass der Stein zweierlei Grau hat."""
    return {
      "stein":  mat_bild("PsStein", "hausputz.png", (0.88,0.85,0.78), 0.88),
      "stein2": mat("PsStein2", (0.76,0.72,0.64), 0.90),
      "patina": mat("PsPatina", (0.36,0.62,0.55), 0.55, 0.25),
      "eisen":  mat("PsEisen",  (0.16,0.17,0.19), 0.45, 0.65),
      # Gold bleibt HALBmetallisch: mit metallic 0,90 wird es ohne Environment-Map
      # schwarz — in Charge 35 sahen die Zierkugeln aus wie Oliven.
      "gold":   mat("PsGold",   (0.90,0.74,0.36), 0.34, 0.45),
      "holz":   mat_bild("PsHolz", "bohlen.png", (0.72,0.55,0.36), 0.75),
      "dach":   mat("PsDach",   (0.44,0.30,0.28), 0.72),
      "kupfer": mat("PsKupfer", (0.42,0.66,0.58), 0.42, 0.40),
      "wasser": mat("PsWasser", (0.42,0.72,0.80), 0.10, 0.10),
      "licht":  leucht("PsLicht", (1.00,0.90,0.68), 3.2),
      "laub":   mat("PsLaub",   (0.27,0.48,0.24), 0.85),
      "laub2":  mat("PsLaub2",  (0.34,0.56,0.28), 0.85),
      "bluete": mat("PsBluete", (0.88,0.42,0.52), 0.70),
      "bluete2":mat("PsBluete2",(0.94,0.76,0.34), 0.70),
      "kies":   mat("PsKies",   (0.80,0.76,0.68), 0.95),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

# ================================================================ 1) Musikpavillon
def _b_pavillon():
    """Achteckiger Musikpavillon, 5,60 m Durchmesser, 4,85 m hoch.
    Podest mit drei Stufen, acht Saeulen, Bruestung dazwischen, geschweiftes
    Zeltdach als Drehkoerper, Bekroenung.

    Warum das Dach ein Drehkoerper ist und kein Kegel: ein Kegel ist gerade. Ein
    Pagodendach ist GESCHWEIFT — es faellt steil an und flacht zur Traufe aus.
    Genau diese Kurve macht den Unterschied zwischen Zirkuszelt und Pavillon."""
    M = _mats()
    R, N = 2.20, 8
    OH = 2.90                                       # Oberkante Saeule
    # Podest: drei Stufen, aussen abgetreppt — EIN Drehkoerper
    dreh([(0.00, 0.00), (2.80, 0.00), (2.80, 0.16), (2.62, 0.16), (2.62, 0.32),
          (2.46, 0.32), (2.46, 0.48), (2.34, 0.52), (0.00, 0.52)],
         M["stein2"], N, name="Podest")
    scheibe(0, 0, 0.525, 2.32, M["holz"], N)         # Buehnenboden
    def saeule(x, y, a, i):
        dreh([(0.00, 0.52), (0.19, 0.52), (0.19, 0.62), (0.14, 0.70), (0.13, OH-0.28),
              (0.16, OH-0.20), (0.13, OH-0.14), (0.19, OH-0.05), (0.19, OH), (0.00, OH)],
             M["holz"], 16, x=x, y=y, name="Saeule")
    kranz(saeule, N, R, start=math.pi/N)
    # Bruestung zwischen den Saeulen — nicht auf der Schauseite (+y offen)
    for i in range(N):
        a0 = math.pi/N + TAU*i/N
        a1 = math.pi/N + TAU*(i+1)/N
        am = (a0 + a1)/2
        if abs(((am - math.pi/2 + math.pi) % TAU) - math.pi) < 0.5: continue   # Zugang
        p0 = (math.cos(a0)*R, math.sin(a0)*R)
        p1 = (math.cos(a1)*R, math.sin(a1)*R)
        mx, my = (p0[0]+p1[0])/2, (p0[1]+p1[1])/2
        L = math.hypot(p1[0]-p0[0], p1[1]-p0[1])
        for (zz, hh) in ((0.60, 0.10), (1.02, 0.09)):
            b = box(mx, my, zz, L, 0.14, hh, M["holz"]); b.rotation_euler[2] = am + math.pi/2
        n = 4
        for k in range(1, n):
            t = k/float(n)
            dreh([(0.00, 0.62), (0.055, 0.62), (0.055, 0.67), (0.038, 0.72),
                  (0.032, 0.80), (0.055, 0.88), (0.045, 0.94), (0.055, 0.98),
                  (0.00, 0.98)], M["holz"], 12,
                 x=p0[0] + (p1[0]-p0[0])*t, y=p0[1] + (p1[1]-p0[1])*t, name="Docke")
    for i in range(N):                               # Bogenzwickel unter der Traufe
        a0 = math.pi/N + TAU*i/N
        a1 = math.pi/N + TAU*(i+1)/N
        p0 = (math.cos(a0)*R, math.sin(a0)*R, OH-0.10)
        p1 = (math.cos(a1)*R, math.sin(a1)*R, OH-0.10)
        pm = ((p0[0]+p1[0])/2*0.94, (p0[1]+p1[1])/2*0.94, OH-0.42)
        rohr([p0, pm, p1], 0.045, M["holz"], 8, True, "Zwickel")
    # Geschweiftes Zeltdach
    dreh([(0.00, OH - 0.02), (2.72, OH - 0.02), (2.78, OH + 0.10), (2.66, OH + 0.16),
          (2.30, OH + 0.30), (1.80, OH + 0.62), (1.24, OH + 1.02), (0.62, OH + 1.38),
          (0.22, OH + 1.58), (0.00, OH + 1.62)], M["dach"], N*3, name="Dach")
    dreh([(0.00, OH + 1.52), (0.26, OH + 1.58), (0.30, OH + 1.68), (0.20, OH + 1.76),
          (0.00, OH + 1.78)], M["kupfer"], 20, name="Laterne")
    flach(kugel(0, 0, OH + 1.86, 0.14, M["gold"], 14))
    strebe((0, 0, OH + 1.92), (0, 0, OH + 1.95), 0.035, M["gold"])
    for i in range(3):                               # Zugangstreppe auf der Schauseite
        box(0, 2.62 + i*0.20, 0.42 - i*0.16, 1.60 - i*0.08, 0.22, 0.16, M["stein2"])

def pavillon(): _modul("th36_musikpavillon", _b_pavillon, 0.010)

# ================================================================ 2) Zierzaun
def _b_zierzaun():
    """Schmiedeeisernes Zaunmodul, Raster 2,00 m, 1,42 m hoch — reihbar wie
    `th35_balustrade` (x += 2,00), damit Stein und Eisen mischbar sind.
    Speerspitzen, Voluten im Fries, zwei Riegel."""
    M = _mats()
    BR = 2.00
    box(0, 0, 0.05, BR, 0.26, 0.10, M["stein2"])                     # Sockelstein
    for s in (-1, 1):                                                # Pfosten
        dreh([(0.00, 0.08), (0.075, 0.08), (0.075, 1.22), (0.095, 1.28),
              (0.075, 1.34), (0.055, 1.40), (0.00, 1.44)], M["eisen"], 14,
             x=s*(BR/2 - 0.075), name="Pfosten")
        flach(kugel(s*(BR/2 - 0.075), 0, 1.50, 0.06, M["gold"], 10))
    for zz in (0.30, 1.02):                                          # Riegel
        box(0, 0, zz, BR - 0.15, 0.055, 0.055, M["eisen"])
    n = 9
    for k in range(n):                                               # Staebe mit Spitze
        x = -BR/2 + BR*(k + 0.5)/n
        strebe((x, 0, 0.10), (x, 0, 1.22), 0.024, M["eisen"])
        kegel(x, 0, 1.30, 0.05, 0.0, 0.18, M["gold"], 8)
    for k in range(4):                                               # Volutenfries
        x = -BR/2 + BR*(k + 0.5)/4
        rohr(volute_pkt(x, 0.66, 0.17, 1.3, 13, 0.0, 1 if k % 2 else -1),
             0.018, M["eisen"], 6, True, "V")

def zierzaun(): _modul("th36_zierzaun", _b_zierzaun, 0.007)

# ================================================================ 3) Bogenbruecke
def _b_bruecke():
    """Steinerne Bogenbruecke, 7,00 m lang, Durchfahrt 3,60 m breit.
    Der Gehweg folgt dem Bogen — eine gerade Platte auf einem Bogen sieht aus
    wie eine Bruecke, die schon eingebrochen ist."""
    M = _mats()
    L, BB, ST = 7.00, 2.40, 0.95      # Laenge, Breite, Stich
    def kurve(t):                     # Hoehe der Gehweg-MITTE ueber t in [0,1]
        # 🌉 Erst stand hier 0,55 + Stich. Die Bruecke endete damit 43 cm ueber dem
        # Boden und schwebte an beiden Enden — dazu zwei runde Kloetze als
        # Widerlager, die aussahen wie vergessene Sockel. Eine Bruecke MUSS am
        # Ufer den Boden beruehren, sonst ist sie eine Rampe ins Nichts.
        return 0.14 + ST*math.sin(math.pi*t)
    N = 16
    for s in (-1, 1):                 # Bruestungswangen als Bogenrohr
        rohr([(-L/2 + L*i/N, s*(BB/2), kurve(i/N) + 0.52) for i in range(N + 1)],
             0.075, M["stein2"], 8, True, "Handlauf")
    for i in range(N):                # Fahrbahnplatten folgen dem Bogen
        t, t2 = i/N, (i + 1)/N
        zm = (kurve(t) + kurve(t2))/2
        b = box(-L/2 + L*(t + t2)/2, 0, zm, L/N*1.10, BB + 0.30, 0.22, M["stein"])
        b.rotation_euler[1] = -math.atan2(kurve(t2) - kurve(t), L/N)
    for i in range(0, N + 1, 2):      # Bruestungsdocken
        t = i/N
        for s in (-1, 1):
            dreh([(0.00, 0.00), (0.075, 0.00), (0.075, 0.06), (0.05, 0.11),
                  (0.045, 0.22), (0.075, 0.34), (0.06, 0.42), (0.075, 0.48),
                  (0.00, 0.50)], M["stein"], 12,
                 x=-L/2 + L*t, y=s*(BB/2), z=kurve(t) + 0.06, name="Docke")
    for s in (-1, 1):                 # Fluegelmauern statt runder Kloetze
        for q in (-1, 1):
            box(s*(L/2 - 0.30), q*(BB/2 + 0.22), 0.16, 0.90, 0.30, 0.32, M["stein2"])
        box(s*(L/2 + 0.16), 0, 0.06, 0.44, BB + 0.60, 0.12, M["stein2"])   # Anschlussplatte
    # Bogenlaibung: die sichtbare Unterseite. Sie setzt am Boden an, nicht in der
    # Luft — ihre MITTE liegt aber auf z = r, sonst taucht das Rohr unter den
    # Boden (mit 0,02 mass die Bruecke zmin -0,123).
    for s in (-1, 1):
        rohr([(-L/2 + 0.45 + (L - 0.90)*i/N, s*(BB/2 + 0.14),
               0.17 + (ST - 0.10)*math.sin(math.pi*i/N)) for i in range(N + 1)],
             0.16, M["stein"], 10, True, "Laibung")

def bruecke(): _modul("th36_bogenbruecke", _b_bruecke, 0.010)

# ================================================================ 4) Vogeltraenke
def _b_vogeltraenke():
    """Vogeltraenke, 0,74 m Durchmesser, 0,92 m hoch — ein einziger Drehkoerper
    vom Fuss bis zum Beckenrand, plus Wasserspiegel und zwei Voegel."""
    M = _mats()
    dreh([(0.00, 0.00), (0.30, 0.00), (0.30, 0.07), (0.24, 0.11), (0.15, 0.17),
          (0.11, 0.28), (0.14, 0.42), (0.13, 0.56), (0.20, 0.66), (0.34, 0.74),
          (0.37, 0.82), (0.34, 0.88), (0.30, 0.82), (0.26, 0.74), (0.10, 0.70),
          (0.00, 0.70)], M["stein"], 40, name="Traenke")
    scheibe(0, 0, 0.795, 0.30, M["wasser"], 32)
    for (ax, ay, sc) in ((0.28, 0.10, 1.0), (-0.20, -0.22, 0.85)):    # zwei Voegel
        flach(kugel(ax, ay, 0.90*sc + 0.02, 0.055*sc, M["stein2"], 9))
        flach(kugel(ax + 0.05*sc, ay + 0.02, 0.94*sc + 0.02, 0.035*sc, M["stein2"], 8))
        kegel(ax + 0.09*sc, ay + 0.02, 0.94*sc + 0.02, 0.018*sc, 0.0, 0.05*sc,
              M["gold"], 6, rot=(0, math.pi/2, 0))

def vogeltraenke(): _modul("th36_vogeltraenke", _b_vogeltraenke, 0.006)

# ================================================================ 5) Denkmal-Obelisk
def _b_obelisk():
    """Obelisk auf gestuftem Sockel, 1,60 m Grundflaeche, 5,20 m hoch.
    Der Schaft verjuengt sich linear und traegt eine vergoldete Pyramidenspitze —
    ein Obelisk mit parallelen Kanten wirkt wie ein Kamin."""
    M = _mats()
    dreh([(0.00, 0.00), (1.15, 0.00), (1.15, 0.18), (1.00, 0.18), (1.00, 0.36),
          (0.88, 0.36), (0.88, 0.50), (0.80, 0.56), (0.00, 0.56)],
         M["stein2"], 4, name="Stufen")
    dreh([(0.00, 0.56), (0.62, 0.56), (0.62, 1.10), (0.68, 1.18), (0.72, 1.28),
          (0.62, 1.36), (0.00, 1.36)], M["stein"], 4, name="Postament")
    # Schaft: vier Seiten, oben schmaler — als Drehkoerper mit seg=4 ein Prisma
    dreh([(0.00, 1.36), (0.46, 1.36), (0.24, 4.62), (0.00, 4.62)],
         M["stein"], 4, name="Schaft")
    dreh([(0.00, 4.62), (0.26, 4.62), (0.00, 5.20)], M["gold"], 4, name="Spitze")
    for s in (-1, 1):                                   # Bronzetafel + Kraenze
        box(s*0.0, s*0.34, 2.30, 0.52, 0.05, 0.78, M["patina"])
    # 🌿 Acht einzelne Laubkugeln im Kreis lasen sich als verstreute Erbsen —
    # derselbe Fehler wie an der Sonnenuhr in Charge 35. Ein Buchskranz braucht
    # so viele Ballen, dass sie sich UEBERLAPPEN; dann ist es eine Hecke.
    for i in range(22):
        a = TAU*i/22
        flach(kugel(math.cos(a)*1.34, math.sin(a)*1.34, 0.20, 0.20,
                    M["laub"] if i % 2 else M["laub2"], 8))   # z = r, sonst zmin < 0

def obelisk(): _modul("th36_obelisk", _b_obelisk, 0.008)

# ================================================================ 6) Trinkbrunnen
def _b_trinkbrunnen():
    """Schweizer Dorfbrunnen: langer Trog, Stock mit Wasserspeier, 2,40 m lang.
    Der Trog ist bewusst KEIN Drehkoerper — er ist laenglich; gedreht waere er
    rund und saehe aus wie ein Planschbecken."""
    M = _mats()
    TL, TB, TH = 2.40, 0.86, 0.62
    box(0, 0, TH/2, TL, TB, TH, M["stein2"])                          # Trogkoerper
    box(0, 0, TH + 0.02, TL - 0.26, TB - 0.26, 0.10, M["wasser"])     # Wasser
    for s in (-1, 1):                                                 # Randwulst
        box(0, s*(TB/2 - 0.03), TH - 0.03, TL + 0.10, 0.12, 0.12, M["stein"])
        box(s*(TL/2 - 0.03), 0, TH - 0.03, 0.12, TB + 0.10, 0.12, M["stein"])
    box(0, 0, 0.07, TL + 0.16, TB + 0.16, 0.14, M["stein2"])          # Sockelleiste
    # Brunnenstock
    dreh([(0.00, 0.00), (0.22, 0.00), (0.22, 0.12), (0.16, 0.18), (0.14, 1.42),
          (0.19, 1.50), (0.16, 1.58), (0.14, 1.72), (0.00, 1.78)],
         M["stein"], 24, x=-TL/2 + 0.42, name="Stock")
    flach(kugel(-TL/2 + 0.42, 0, 1.86, 0.11, M["gold"], 12))
    zyl(-TL/2 + 0.42, 0.20, 1.20, 0.05, 0.30, M["kupfer"], 12, rot=(math.pi/2, 0, 0))
    rohr([(-TL/2 + 0.42, 0.34, 1.18), (-TL/2 + 0.42, 0.34, 0.94),
          (-TL/2 + 0.42, 0.30, 0.76)], 0.030, M["wasser"], 8, True, "Strahl")
    for s in (-1, 1):                                                 # Geranienkasten
        box(TL/2 - 0.55, s*(TB/2 + 0.16), TH + 0.14, 0.62, 0.22, 0.22, M["holz"])
        for k in range(5):
            flach(kugel(TL/2 - 0.80 + k*0.13, s*(TB/2 + 0.16), TH + 0.30,
                        0.085, M["laub"], 8))
            if k % 2 == 0:
                flach(kugel(TL/2 - 0.80 + k*0.13, s*(TB/2 + 0.16), TH + 0.38,
                            0.05, M["bluete"], 8))

def trinkbrunnen(): _modul("th36_trinkbrunnen", _b_trinkbrunnen, 0.008)

# ================================================================ 7) Blumenrondell
def _b_rondell():
    """Rundes Blumenbeet, 3,00 m Durchmesser, mit Steineinfassung, Buchsrand und
    einer Mitte aus hohen Blueten. Das Beet ist LEICHT gewoelbt — ein flaches
    Rund liest sich wie ein Deckel."""
    M = _mats()
    dreh([(0.00, 0.00), (1.50, 0.00), (1.50, 0.20), (1.42, 0.26), (1.36, 0.22),
          (1.30, 0.16), (0.00, 0.16)], M["stein2"], 40, name="Einfassung")
    dreh([(0.00, 0.30), (0.70, 0.28), (1.16, 0.22), (1.32, 0.17)],
         M["kies"], 40, name="Erde", zu_unten=False)
    import random as _r
    rnd = _r.Random(36)
    for i in range(46):                                # Buchskranz aussen
        a = TAU*i/46
        flach(kugel(math.cos(a)*1.22, math.sin(a)*1.22, 0.26, 0.155,
                    M["laub"] if i % 2 else M["laub2"], 8))
    for i in range(70):                                # Bepflanzung
        a = rnd.uniform(0, TAU); rr = rnd.uniform(0.0, 1.02)
        x, y = math.cos(a)*rr, math.sin(a)*rr
        h = 0.30 + (1.02 - rr)*0.30 + rnd.uniform(0, 0.10)
        flach(kugel(x, y, h, rnd.uniform(0.09, 0.14), M["laub2"], 8))
        if i % 2 == 0:
            flach(kugel(x + rnd.uniform(-0.05, 0.05), y, h + 0.10, 0.055,
                        M["bluete"] if i % 4 else M["bluete2"], 8))
    for i in range(5):                                 # Hochstauden in der Mitte
        a = TAU*i/5
        strebe((math.cos(a)*0.16, math.sin(a)*0.16, 0.34),
               (math.cos(a)*0.22, math.sin(a)*0.22, 0.92), 0.035, M["laub"])
        flach(kugel(math.cos(a)*0.22, math.sin(a)*0.22, 0.99, 0.13,
                    M["bluete2"] if i % 2 else M["bluete"], 9))

def rondell(): _modul("th36_rondell", _b_rondell, 0.008)

# ================================================================ 8) Ensemble
def _teil(fn, px, py, rot=0.0, pz=0.0):
    """Baut ein Teil und setzt es als GANZES an seinen Platz. Wie in Charge 34/35:
    das Empty bekommt bewusst KEINE matrix_parent_inverse."""
    vor = set(bpy.context.scene.objects)
    fn()
    emp = bpy.data.objects.new("Platz", None); bpy.context.collection.objects.link(emp)
    emp.location = (px, py, pz); emp.rotation_euler[2] = rot
    for o in list(bpy.context.scene.objects):
        if o in vor or o is emp: continue
        o.parent = emp
    return emp

def ensemble():
    """Kurpark: Pavillon auf der Achse, davor das Rondell, seitlich Trinkbrunnen
    und Vogeltraenke, hinten der Obelisk, eingefasst vom Zierzaun im Raster 2,00.
    Zugleich der Massstabs-Test — erst nebeneinander sieht man, ob die Teile
    zueinander passen."""
    neu()
    M = _mats()
    scheibe(0, 0, 0.005, 11.0, M["kies"], 64)
    _teil(_b_pavillon, 0, 2.6)
    _teil(_b_rondell, 0, -3.4)
    _teil(_b_obelisk, 0, 8.2)
    for s in (-1, 1):
        _teil(_b_trinkbrunnen, s*6.4, 1.0, s*math.pi/2)
        _teil(_b_vogeltraenke, s*3.6, -6.6)
        _teil(_b_bruecke, s*8.6, -5.0, math.pi/2)
    for x in (-7, -5, -3, 3, 5, 7):                    # Zaun vorn, Zugang in der Mitte
        _teil(_b_zierzaun, x, -9.0, math.pi)
    for y in (-1, 1, 3, 5, 7):                         # Zaun seitlich
        for s in (-1, 1):
            _teil(_b_zierzaun, s*9.0, y, s*math.pi/2)
    export("th36_ensemble", 0.010, 2)

if __name__ == "__main__":
    print("Asset-Charge 36 (th36, Park- und Platzschmuck):")
    for fn in (pavillon, zierzaun, bruecke, vogeltraenke, obelisk,
               trinkbrunnen, rondell, ensemble):
        fn()
    print("fertig")
