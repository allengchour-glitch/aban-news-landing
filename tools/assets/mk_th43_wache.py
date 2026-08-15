# -*- coding: utf-8 -*-
"""Asset-Charge 43 (th43_*): FEUERWACHE UND TANKSTELLE.

Die letzten beiden prozeduralen Quaderbauten der Stadt: die Feuerwache bei
(56|100) — Sockel, Korpus, Dachplatte, Tore als Bretter auf der Wand, Schlauchturm
aus einem Quader — und die Tankstelle bei (92|-74), deren Zapfsaeulen drei Boxen
sind. Damit ist die Reihe abgearbeitet, die mit den Stadthaeusern in Charge 37
begann.

Konventionen wie th5-th42 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Tore, Zapfseite, Tafel) auf Blender +y -> three.js -z.
  * FAHRZEUGE: Front auf +x (wie Charge 37, 38, 40).
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

⚠️ Die inzwischen teuer bezahlten Regeln sind hier von vornherein angewandt und
   in TH5-ASSETS.md ausgeschrieben:
     * Dach ist ein KOERPER (`_satteldach`, keil_y um z gedreht) — Charge 41.
     * Glas liegt 5 cm VOR der Wand — Charge 40.
     * Ein Rahmen sind VIER Balken, und er wird von der MITTE gerechnet
       (Unterkante z - h/2) — Charge 35/37/38 und 42.
     * Wand und Zierglied brauchen Abstand im Hellwert — Charge 37/41.
     * Wer mehrere Dinge in ein Modul packt, verteilt sie um den Ursprung — 42.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "rot":   mat_bild("FwRot", "hausputz.png", (0.55,0.14,0.11), 0.86, 0.0, True),
      "rot2":  mat("FwRot2",   (0.40,0.10,0.08), 0.86),
      "stein": mat("FwStein",  (0.95,0.94,0.90), 0.84),
      "sockel":mat("FwSockel", (0.38,0.36,0.33), 0.90),
      "dach":  mat("FwDach",   (0.26,0.27,0.31), 0.74),
      "dach2": mat("FwDach2",  (0.19,0.20,0.24), 0.76),
      "stahl": mat("FwStahl",  (0.58,0.60,0.64), 0.42, 0.60),
      "chrom": mat("FwChrom",  (0.78,0.80,0.84), 0.20, 0.80),
      "dunkel":mat("FwDunkel", (0.12,0.13,0.15), 0.68),
      "beton": mat("FwBeton",  (0.50,0.50,0.48), 0.93),
      "weiss": mat("FwWeiss",  (0.92,0.92,0.90), 0.55),
      "gelb":  mat("FwGelb",   (0.84,0.66,0.12), 0.68),
      "gruen": mat("FwGruen",  (0.14,0.44,0.32), 0.70),
      "reifen":mat("FwReifen", (0.07,0.07,0.08), 0.90),
      "felge": mat("FwFelge",  (0.60,0.62,0.66), 0.35, 0.55),
      "glas":  mat("FwGlas",   (0.16,0.24,0.30), 0.14, 0.20),
      "blau":  leucht("FwBlau",  (0.16,0.34,0.96), 1.5),
      "licht": leucht("FwLicht", (1.00,0.94,0.78), 1.3),
      "rueck": leucht("FwRueck", (0.95,0.16,0.10), 1.1),
      "anzeig":leucht("FwAnzeig",(0.30,0.98,0.72), 1.3),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """Vier Balken. ⚠️ Und von der MITTE gerechnet: die Unterkante ist z - h/2."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fenster(x, z, br, ho, m, yw, felder=2):
    """⚠️ Glas auf yw + 0,02 mit 6 cm Tiefe -> Aussenkante yw + 0,05, also VOR
    der Wand."""
    box(x, yw + 0.02, z, br, 0.06, ho, m["glas"])
    for k in range(1, felder):
        box(x, yw + 0.035, z - ho/2 + ho*k/felder, br - 0.03, 0.06, 0.05, m["stein"])
    box(x, yw + 0.035, z, 0.055, 0.06, ho - 0.04, m["stein"])
    _rahmen(x, yw + 0.05, z, br + 0.16, ho + 0.16, 0.11, m)

def _satteldach(B, T, HH, zbasis, m, ueber=0.70, mat_="dach"):
    """Satteldach als KOERPER, First auf x (Lehre aus Charge 41)."""
    TD = T/2 + ueber
    d = keil_y([(-TD, 0.0), (TD, 0.0), (TD, 0.26), (0.0, HH), (-TD, 0.26)],
               0.0, B + 2*ueber, m[mat_], cz=zbasis, name="Satteldach")
    d.rotation_euler[2] = math.pi/2
    for s in (-1, 1):
        box(0, s*(TD - 0.06), zbasis + 0.15, B + 2*ueber + 0.1, 0.13, 0.30, m["stein"])
    box(0, 0, zbasis + HH, B + 0.3, 0.38, 0.19, m["dach2"])
    return d

def _rolltor(x, yw, z, br, ho, m):
    """Rolltor in einer OEFFNUNG: Laibung dunkel, Panzer aus Lamellen davor,
    Sturz und Gewaende als Rahmen."""
    box(x, yw - 0.14, z, br, 0.32, ho, m["dunkel"])                     # Laibung
    n = max(4, int(ho/0.42))
    for k in range(n):
        box(x, yw + 0.03, z - ho/2 + ho*(k + 0.5)/n, br - 0.10, 0.07, ho/n - 0.035,
            m["weiss"] if k % 2 else m["stein"])
    _rahmen(x, yw + 0.07, z, br + 0.26, ho + 0.26, 0.17, m)
    box(x, yw + 0.10, z + ho/2 + 0.24, br + 0.40, 0.22, 0.16, m["stein"])   # Sturz

# ================================================================ 1) Feuerwache
def _b_feuerwache():
    """Feuerwache, 18,0 x 12,6 x 14,8 m. Tore auf +y.

    Zwei Rolltore in echten Oeffnungen, Sockel, Gesims, Satteldach, Wachschild,
    und ein Schlauchturm mit Lueftungslamellen und Pyramidendach — nicht ein
    Quader mit einem Kegel darauf."""
    m = _mats()
    B, T, H = 16.6, 10.8, 6.6
    box(0, 0, 0.34, B + 1.0, T + 1.0, 0.68, m["sockel"])
    box(0, 0, 0.90, B + 0.5, T + 0.5, 0.32, m["stein"])
    box(0, 0, H/2 + 1.06, B, T, H, m["rot"])
    for s in (-1, 1):                                                   # Ecklisenen
        box(s*(B/2 - 0.28), 0, H/2 + 1.14, 0.56, T + 0.14, H - 0.4, m["stein"])
    box(0, 0, H + 1.10, B + 0.5, T + 0.5, 0.30, m["stein"])             # Gesims
    for tx in (-3.9, 3.9):                                              # Zwei Rolltore
        _rolltor(tx, T/2, 3.10, 4.90, 4.20, m)
    for k in range(4):                                                  # Fenster oben
        xx = -6.4 + k*4.27
        if abs(xx) > 7.0: continue
        _fenster(xx, 6.05, 1.30, 1.10, m, T/2)
    for s in (-1, 1):                                                   # Giebelfenster
        for k in range(2):
            zz = 2.60 + k*3.10
            box(s*(B/2 + 0.02), 0, zz, 0.06, 1.20, 1.70, m["glas"])
            box(s*(B/2 + 0.06), 0, zz, 0.10, 1.38, 1.88, m["stein"])
            box(s*(B/2 + 0.10), 0, zz, 0.09, 1.20, 1.70, m["glas"])
    box(0, T/2 + 0.14, 5.85, 6.20, 0.26, 0.86, m["stein"])              # Wachschild
    box(0, T/2 + 0.26, 5.85, 5.70, 0.08, 0.56, m["rot2"])
    for k in range(9):
        box(-2.40 + k*0.60, T/2 + 0.31, 5.85, 0.34, 0.06, 0.30, m["stein"])
    for s in (-1, 1):                                                   # Blaulicht ueber den Toren
        flach(zyl(s*3.9, T/2 + 0.16, 5.62, 0.16, 0.22, m["blau"], 12))
        flach(zyl(s*3.9, T/2 + 0.16, 5.78, 0.19, 0.07, m["dunkel"], 12))
    _satteldach(B, T, 2.90, H + 1.26, m)
    # Schlauchturm: Lamellen statt glatter Wand, Pyramidendach mit Grat
    # ⚠️ Der Turm zog die Boxmitte auf -0,46. `bau()` setzt ueber den Ursprung:
    # naeher an den Baukoerper geruecht, dann deckt sich beides wieder.
    TX, TY = -B/2 + 2.10, -T/2 - 0.60
    box(TX, TY, 5.40, 2.60, 2.60, 10.80, m["rot"])
    for s in (-1, 1):
        box(TX + s*1.24, TY, 5.60, 0.22, 2.72, 10.20, m["stein"])
        box(TX, TY + s*1.24, 5.60, 2.72, 0.22, 10.20, m["stein"])
    for k in range(7):                                                  # Lueftungslamellen
        zz = 6.60 + k*0.42
        box(TX, TY + 1.28, zz, 1.60, 0.08, 0.22, m["dunkel"])
        lm = box(TX, TY + 1.33, zz, 1.56, 0.10, 0.16, m["stein"])
        lm.rotation_euler[0] = 0.42
    box(TX, TY, 10.94, 3.00, 3.00, 0.28, m["stein"])                    # Kranzgesims
    flach(kegel(TX, TY, 12.10, 2.10, 0.0, 2.05, m["dach2"], 4, rot=(0, 0, math.pi/4)))
    flach(zyl(TX, TY, 13.35, 0.05, 0.55, m["stahl"], 8))
    flach(kugel(TX, TY, 13.68, 0.13, m["stahl"], 8))
    # ⚠️ Hier lagen zwei gelbe Ausfahrtsbahnen auf dem Vorplatz. Sie machten das
    # Gebaeudemodell 20,97 tief statt 13,5 und hingen im Kontaktbogen als
    # freischwebende Striche neben dem Haus. Eine Fahrbahnmarkierung gehoert an
    # den ORT, nicht in das Gebaeude — im Spiel wird sie dort gezeichnet.

def feuerwache(): _modul("th43_feuerwache", _b_feuerwache)

# ================================================================ 2) Loeschfahrzeug
def _b_loeschfahrzeug():
    """Loeschfahrzeug, 7,60 x 2,50 x 3,20 m. Front auf +x.

    Rollladenkaesten an der Flanke, Aufbauleiter auf dem Dach, Blaulichtbalken,
    Haspel am Heck. Ein Feuerwehrauto ohne Rollladenfugen ist ein roter Kasten."""
    m = _mats()
    L, B, H = 7.60, 2.50, 2.60
    prof = [(-L/2 + 0.10, 0.34), (L/2 - 0.60, 0.34), (L/2 - 0.18, 0.56),
            (L/2, 1.10), (L/2 - 0.26, 1.86), (L/2 - 0.34, H), (-L/2 + 0.14, H),
            (-L/2, H - 0.24), (-L/2, 0.62)]
    keil_y(prof, 0.0, B, m["rot"], cz=0.34, name="Aufbau")
    box(0, 0, 0.34, L - 0.30, B - 0.10, 0.22, m["rot2"])                # Schuerze
    box(L/2 - 0.52, 0, 2.14, 0.66, B - 0.26, 0.62, m["glas"])           # Windschutz
    for s in (-1, 1):                                                   # Seitenscheiben Fahrerhaus
        box(L/2 - 1.35, s*(B/2 - 0.015), 2.06, 0.86, 0.06, 0.56, m["glas"])
        box(L/2 - 1.35, s*(B/2 - 0.035), 2.06, 0.94, 0.05, 0.64, m["rot2"])
    for s in (-1, 1):                                                   # Rollladenkaesten
        for k in range(3):
            xx = -2.30 + k*1.55
            box(xx, s*(B/2 - 0.02), 1.30, 1.36, 0.06, 1.30, m["rot2"])
            for r9 in range(6):
                box(xx, s*(B/2 + 0.012), 0.74 + r9*0.22, 1.26, 0.05, 0.16, m["stahl"])
            flach(zyl(xx, s*(B/2 + 0.03), 0.70, 0.04, 0.30, m["chrom"], 8, (0, math.pi/2, 0)))
    # ⚠️ Galerie, Leiter und Blaulichtbalken sassen auf z 2,72…3,06 — der Aufbau
    # reicht aber bis 0,34 + 2,60 = 2,94. Alles darunter steckte IM Dach: im
    # Kontaktbogen war von der Leiter nichts zu sehen. Dieselbe Rechnung wie beim
    # Glas in Charge 40, nur senkrecht: Bauteilkante gegen Koerperkante pruefen.
    DACH = 0.34 + H                                                     # 2,94
    box(0, 0, DACH + 0.06, L - 1.4, B - 0.30, 0.10, m["stahl"])         # Dachgalerie
    for s in (-1, 1):                                                   # Leiterholme
        flach(zyl(-0.40, s*0.42, DACH + 0.24, 0.05, 5.20, m["stahl"], 8, (0, math.pi/2, 0)))
    for k in range(11):                                                 # Sprossen
        flach(zyl(-2.90 + k*0.52, 0, DACH + 0.24, 0.035, 0.84, m["stahl"], 6,
                  (math.pi/2, 0, 0)))
    box(L/2 - 1.05, 0, DACH + 0.14, 1.30, B - 0.42, 0.16, m["blau"])    # Blaulichtbalken
    box(L/2 - 1.05, 0, DACH + 0.25, 1.36, B - 0.36, 0.09, m["dunkel"])
    for s in (-1, 1):
        flach(zyl(L/2 + 0.01, s*0.72, 0.90, 0.14, 0.05, m["licht"], 14, (0, math.pi/2, 0)))
        box(-L/2 - 0.01, s*0.72, 0.96, 0.05, 0.22, 0.30, m["rueck"])
        strebe((L/2 - 0.62, s*(B/2), 2.30), (L/2 - 0.54, s*(B/2 + 0.17), 2.40),
               0.04, m["dunkel"])
        box(L/2 - 0.50, s*(B/2 + 0.20), 2.42, 0.06, 0.12, 0.26, m["dunkel"])
    flach(zyl(-L/2 + 0.55, 0, 1.40, 0.52, 0.60, m["stahl"], 18, (0, math.pi/2, 0)))  # Haspel
    flach(zyl(-L/2 + 0.55, 0, 1.40, 0.30, 0.66, m["rot2"], 14, (0, math.pi/2, 0)))
    box(0, 0, 0.86, L - 1.0, B + 0.04, 0.10, m["stein"])                # Zierstreifen
    for x in (L/2 - 1.45, -0.60, -2.55):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.18), 0.50, 0.50, 0.28, m["felge"], m["reifen"], m["chrom"], 6)

def loeschfahrzeug(): _modul("th43_loeschfahrzeug", _b_loeschfahrzeug, 0.010)

# ================================================================ 3) Hydrant
def _b_hydrant():
    """Ueberflurhydrant, 0,46 x 0,52 x 0,92 m — Drehkoerper mit zwei Abgaengen."""
    m = _mats()
    flach(dreh([(0.00, 0.00), (0.22, 0.00), (0.22, 0.07), (0.15, 0.11),
                (0.13, 0.62), (0.17, 0.68), (0.16, 0.76), (0.11, 0.80),
                (0.09, 0.86), (0.00, 0.88)], m["rot2"], 18, name="Hydrant"))
    for s in (-1, 1):                                                   # Abgaenge
        flach(zyl(0, s*0.20, 0.50, 0.075, 0.20, m["rot2"], 12, (math.pi/2, 0, 0)))
        flach(zyl(0, s*0.26, 0.50, 0.090, 0.05, m["stahl"], 12, (math.pi/2, 0, 0)))
    flach(zyl(0, 0, 0.90, 0.055, 0.06, m["stahl"], 10))                 # Deckelmutter
    box(0, 0, 0.90, 0.16, 0.05, 0.05, m["stahl"])
    box(0, 0.14, 0.70, 0.17, 0.04, 0.13, m["stein"])                    # Schild

def hydrant(): _modul("th43_hydrant", _b_hydrant, 0.004)

# ================================================================ 4) Tankstelle
def _b_tankstelle():
    """Tankstellen-Kiosk mit Vordach, 12,4 x 9,0 x 5,4 m. Verkaufsseite auf +y.

    ⚠️ Das Vordach traegt sich auf VIER Stuetzen, und die stehen im Belag, nicht
    auf ihm: ohne Fundamentteller sieht ein Vordach aus, als schwebe es."""
    m = _mats()
    # ⚠️ Kiosk links, Vordach rechts — die Boxmitte lag dadurch auf +0,85.
    # VER schiebt die ganze Gruppe zurueck auf den Ursprung.
    K_B, K_T, K_H = 7.20, 4.80, 3.40
    VER = -0.85
    box(VER-2.40, -1.70, K_H/2 + 0.16, K_B, K_T, K_H, m["stein"])          # Kiosk
    box(VER-2.40, -1.70, 0.10, K_B + 0.4, K_T + 0.4, 0.20, m["sockel"])
    box(VER-2.40, -1.70, K_H + 0.44, K_B + 0.7, K_T + 0.7, 0.34, m["gruen"])
    box(VER-2.40, -1.70 + K_T/2 + 0.02, K_H + 0.44, K_B + 0.5, 0.10, 0.24, m["weiss"])
    for k in range(3):                                                  # Schaufenster
        xx = VER-4.60 + k*2.20
        box(xx, -1.70 + K_T/2 + 0.02, 1.95, 1.90, 0.06, 2.10, m["glas"])
        _rahmen(xx, -1.70 + K_T/2 + 0.05, 1.95, 2.06, 2.26, 0.12, m)
    box(VER+0.44, -1.70 + K_T/2 + 0.02, 1.60, 1.10, 0.06, 2.40, m["glas"])  # Tuer
    _rahmen(VER+0.44, -1.70 + K_T/2 + 0.06, 1.60, 1.24, 2.54, 0.13, m)
    for s in (-1, 1):                                                   # Vordach-Stuetzen
        for q in (-1, 1):
            sx, sy = VER + 1.60 + (s + 1)*2.30, q*2.55
            box(sx, sy, 0.09, 0.70, 0.70, 0.18, m["beton"])
            flach(zyl(sx, sy, 2.30, 0.16, 4.30, m["stein"], 12))
    box(VER+3.90, 0, 4.62, 8.20, 6.60, 0.34, m["stein"])                    # Vordach
    box(VER+3.90, 0, 4.92, 8.00, 6.40, 0.28, m["gruen"])
    for s in (-1, 1):                                                   # Blende
        box(VER+3.90, s*3.30, 4.62, 8.30, 0.14, 0.46, m["gruen"])
        box(VER+3.90, s*3.37, 4.62, 7.20, 0.08, 0.24, m["weiss"])
    box(VER-0.20, 0, 4.62, 0.14, 6.70, 0.46, m["gruen"])
    for k in range(5):                                                  # Deckenleuchten
        flach(zyl(VER + 1.20 + k*1.35, 0, 4.42, 0.34, 0.08, m["licht"], 14))

def tankstelle(): _modul("th43_tankstelle", _b_tankstelle)

# ================================================================ 5) Zapfsaeule
def _b_zapfsaeule():
    """Zapfsaeule, 1,10 x 0,74 x 2,05 m — Anzeige, zwei Zapfventile, Schlauch.

    ⚠️ Der Schlauch ist ein `rohr()` mit Durchhang. Als gerader Stab liest er
    sich als Rohr an der Wand, nicht als Schlauch."""
    m = _mats()
    box(0, 0, 0.09, 1.06, 0.70, 0.18, m["beton"])                       # Insel
    flach(dreh([(0.00, 0.00), (0.30, 0.00), (0.32, 0.06), (0.32, 1.52),
                (0.28, 1.62), (0.00, 1.64)], m["rot2"], 20, z=0.18, name="Saeule"))
    for s in (-1, 1):                                                   # Anzeigen
        box(0, s*0.24, 1.28, 0.46, 0.10, 0.34, m["dunkel"])
        box(0, s*0.28, 1.28, 0.38, 0.05, 0.24, m["anzeig"])
        box(0, s*0.28, 1.02, 0.34, 0.05, 0.10, m["dunkel"])
    box(0, 0, 1.86, 0.70, 0.52, 0.26, m["stein"])                       # Haube
    box(0, 0, 1.98, 0.62, 0.44, 0.10, m["gruen"])
    for s in (-1, 1):                                                   # Zapfventile
        flach(zyl(s*0.36, 0.0, 1.06, 0.05, 0.28, m["stahl"], 10, (0, math.pi/2, 0)))
        box(s*0.42, 0, 1.20, 0.09, 0.09, 0.30, m["gruen"] if s > 0 else m["weiss"])
        rohr([(s*0.30, 0.02, 1.44), (s*0.52, 0.16, 1.10), (s*0.46, 0.06, 1.26)],
             0.030, m["dunkel"], 6, True, "Schlauch")

def zapfsaeule(): _modul("th43_zapfsaeule", _b_zapfsaeule, 0.006)

# ================================================================ 6) Preistafel
def _b_preistafel():
    """Preistotem, 1,90 x 0,50 x 5,20 m — drei Preiszeilen, Markenfeld oben."""
    m = _mats()
    for s in (-1, 1):
        flach(zyl(s*0.55, 0, 1.90, 0.11, 3.80, m["stein"], 12))
    box(0, 0, 0.12, 1.30, 0.62, 0.24, m["beton"])
    box(0, 0, 4.36, 1.80, 0.42, 1.44, m["gruen"])                       # Tafelkoerper
    box(0, 0, 4.86, 1.62, 0.10, 0.48, m["weiss"])                       # Markenfeld
    for k in range(3):                                                  # Preiszeilen
        zz = 4.16 - k*0.36
        box(0, 0.22, zz, 1.56, 0.06, 0.28, m["dunkel"])
        box(-0.52, 0.25, zz, 0.36, 0.05, 0.20, m["weiss"])
        box(0.34, 0.25, zz, 0.62, 0.05, 0.20, m["anzeig"])
    box(0, 0, 5.12, 1.94, 0.50, 0.16, m["stein"])

def preistafel(): _modul("th43_preistafel", _b_preistafel, 0.006)

# ================================================================ 7) Luftstation
def _b_luftstation():
    """Luft- und Wasserstation, 1,30 x 0,90 x 1,80 m — Saeule, Schlauchtrommel,
    Wassereimer."""
    m = _mats()
    box(-0.25, 0, 0.06, 1.10, 0.86, 0.12, m["beton"])
    box(-0.25, 0, 0.92, 0.52, 0.46, 1.60, m["gruen"])
    box(-0.25, 0.24, 1.42, 0.38, 0.06, 0.34, m["dunkel"])
    box(-0.25, 0.27, 1.42, 0.30, 0.05, 0.24, m["anzeig"])
    flach(zyl(-0.25, 0.28, 0.86, 0.20, 0.14, m["stahl"], 16, (math.pi/2, 0, 0)))
    rohr([(-0.25, 0.34, 0.86), (0.16, 0.42, 0.55), (0.34, 0.28, 0.30)],
         0.026, m["dunkel"], 6, True, "Luftschlauch")
    flach(dreh([(0.00, 0.00), (0.17, 0.00), (0.19, 0.30), (0.17, 0.34), (0.00, 0.34)],
               m["stahl"], 14, x=0.46, y=-0.14, name="Eimer"))
    rohr([(0.30, -0.14, 0.34), (0.46, -0.14, 0.50), (0.62, -0.14, 0.34)],
         0.014, m["stahl"], 5, True, "Buegel")
    box(-0.25, -0.26, 1.72, 0.44, 0.05, 0.16, m["weiss"])

def luftstation(): _modul("th43_luftstation", _b_luftstation, 0.005)

# ================================================================ 8) Waschbox
def _b_waschbox():
    """Selbstbedienungs-Waschbox, 5,20 x 6,60 x 3,60 m — drei Wandscheiben,
    Pultdach, Schwenkarm mit Lanze."""
    m = _mats()
    B, T, H = 4.80, 6.20, 3.10
    flach(box(0, 0, 0.012, B + 0.6, T + 0.6, 0.024, m["beton"]))
    for s in (-1, 1):                                                   # Seitenwaende
        box(s*(B/2 - 0.09), 0, H/2, 0.18, T, H, m["stein"])
        for k in range(5):
            box(s*(B/2 - 0.02), -T/2 + 0.8 + k*(T - 1.6)/4, H/2, 0.06, 0.14, H - 0.2, m["gruen"])
    box(0, -T/2 + 0.09, H/2, B, 0.18, H, m["stein"])                    # Rueckwand
    dk = box(0, 0.20, H + 0.30, B + 0.50, T + 0.60, 0.16, m["gruen"])   # Pultdach
    dk.rotation_euler[0] = 0.12
    for k in range(7):
        dr = box(-B/2 - 0.2 + k*(B + 0.4)/6, 0.20, H + 0.40, 0.09, T + 0.60, 0.05, m["dach2"])
        dr.rotation_euler[0] = 0.12
    box(0, -T/2 + 0.22, 2.35, B - 0.9, 0.10, 0.52, m["weiss"])          # Beschriftungsband
    for k in range(4):
        box(-1.35 + k*0.90, -T/2 + 0.28, 2.35, 0.52, 0.05, 0.26, m["dunkel"])
    # Schwenkarm mit Lanze
    flach(zyl(-B/2 + 0.55, -T/2 + 0.60, 1.55, 0.09, 3.10, m["stahl"], 12))
    strebe((-B/2 + 0.55, -T/2 + 0.60, 2.95), (0.90, -T/2 + 1.90, 2.95), 0.06, m["stahl"])
    rohr([(0.90, -T/2 + 1.90, 2.90), (1.10, -T/2 + 2.40, 1.90),
          (0.85, -T/2 + 2.70, 1.15)], 0.030, m["dunkel"], 6, True, "Schlauch")
    box(0.85, -T/2 + 2.72, 0.98, 0.06, 0.06, 0.46, m["gelb"])           # Lanze
    box(-B/2 + 0.62, -T/2 + 0.95, 1.30, 0.30, 0.26, 0.66, m["gelb"])    # Muenzautomat
    box(-B/2 + 0.62, -T/2 + 1.10, 1.46, 0.22, 0.05, 0.24, m["dunkel"])

def waschbox(): _modul("th43_waschbox", _b_waschbox, 0.008)

# ================================================================ 9) Ensemble
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_wachhof():
    """Massstabs-Test: Feuerwache und Tankstelle nebeneinander, 46 x 32 m."""
    m = _mats()
    flach(box(0, 0, 0.004, 46.0, 32.0, 0.008, m["beton"]))
    _teil(_b_feuerwache,     -12.0,  8.0)
    _teil(_b_loeschfahrzeug,  -8.0, -6.0, math.pi/2)
    _teil(_b_loeschfahrzeug,  -16.0, -6.0, math.pi/2)
    _teil(_b_hydrant,          -2.0, -2.0)
    _teil(_b_tankstelle,       13.0,  6.0)
    _teil(_b_zapfsaeule,       15.0,  1.6)
    _teil(_b_zapfsaeule,       18.5,  1.6)
    _teil(_b_preistafel,        6.5, -6.0)
    _teil(_b_luftstation,      21.0, -3.0)
    _teil(_b_waschbox,         17.0, -10.0)
    export("th43_wachhof", 0.012, 2)

def wachhof(): neu(); _b_wachhof()

if __name__ == "__main__":
    print("Asset-Charge 43 (th43, Feuerwache und Tankstelle):")
    for fn in (feuerwache, loeschfahrzeug, hydrant, tankstelle, zapfsaeule,
               preistafel, luftstation, waschbox, wachhof):
        fn()
    print("fertig")
