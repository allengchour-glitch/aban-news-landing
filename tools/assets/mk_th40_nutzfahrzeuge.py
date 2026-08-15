# -*- coding: utf-8 -*-
"""Asset-Charge 40 (th40_*): NUTZFAHRZEUGE UND OeV.

Seit Charge 39 stehen zwei Wartehaeuschen an den Zubringern — und es haelt nichts
daran. Der einzige Bus im Spiel ist prozedural aus acht Quadern gebaut und faehrt
nur die Suedstrasse. Diese Ladung liefert die Wagen, die auf einer Landstrasse
sonst noch unterwegs sind.

Konventionen wie th5-th39 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * FRONT auf +x (wie die Wagen aus Charge 37 und der Traktor aus Charge 38) —
    Fahrzeuge stehen an einer Strasse, nicht auf einem Sockel.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

⚠️ Die Fallen, die hier am ehesten zuschlagen, stehen als Kommentar an Ort und
   Stelle: Radachse auf y, Seitenriss per `keil_y` statt gestapelter Kisten,
   und ein Fensterband ist eine VERTIEFUNG, keine aufgeklebte Platte.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats(lack=(0.86,0.72,0.18), zier=(0.16,0.18,0.22)):
    """Materialsatz mit waehlbarer Lackfarbe.

    ⚠️ Das Glas ist DUNKLER als der Lack. In Charge 37 war es heller, und die
    Fenster lasen sich als aufgeklebte weisse Rechtecke statt als Oeffnungen."""
    return {
      "lack":  mat("NfLack",   lack, 0.38, 0.10),
      "lack2": mat("NfLack2",  tuple(c*0.80 for c in lack), 0.42, 0.10),
      "zier":  mat("NfZier",   zier, 0.55),
      "glas":  mat("NfGlas",   (0.13,0.19,0.24), 0.12, 0.30),
      "chrom": mat("NfChrom",  (0.78,0.80,0.84), 0.20, 0.80),
      "reifen":mat("NfReifen", (0.07,0.07,0.08), 0.90),
      "felge": mat("NfFelge",  (0.62,0.64,0.68), 0.35, 0.55),
      "dunkel":mat("NfDunkel", (0.12,0.12,0.14), 0.70),
      "blech": mat("NfBlech",  (0.52,0.55,0.58), 0.45, 0.55),
      "holz":  mat("NfHolz",   (0.46,0.31,0.18), 0.86),
      "weiss": mat("NfWeiss",  (0.92,0.92,0.90), 0.55),
      "licht": leucht("NfLicht", (1.00,0.95,0.80), 1.3),
      "rueck": leucht("NfRueck", (0.95,0.16,0.10), 1.1),
      "blink": leucht("NfBlink", (0.98,0.62,0.10), 1.2),
      "ziel":  leucht("NfZiel",  (0.98,0.72,0.26), 1.6),
    }

def _modul(name, bauer, bevel=0.014):
    neu(); bauer(); export(name, bevel, 2)

# ---------------------------------------------------------------- Bausteine
def _leuchten(M, xv, xh, br, zv, zh):
    """Front- und Rueckleuchten paarweise, plus Blinker.

    ⚠️ Sie sitzen 1 cm VOR der Stirnflaeche. Buendig eingesetzt verschwinden sie
    im Bevel des Wagenkastens und der Wagen sieht nachts blind aus."""
    for s in (-1, 1):
        flach(zyl(xv + 0.01, s*br*0.34, zv, 0.13, 0.05, M["licht"], 14, (0, math.pi/2, 0)))
        flach(zyl(xv + 0.005, s*br*0.34, zv, 0.155, 0.03, M["chrom"], 14, (0, math.pi/2, 0)))
        flach(zyl(xv + 0.01, s*br*0.42, zv - 0.22, 0.06, 0.05, M["blink"], 10, (0, math.pi/2, 0)))
        box(xh - 0.01, s*br*0.34, zh, 0.05, 0.20, 0.26, M["rueck"])
        box(xh - 0.01, s*br*0.42, zh - 0.24, 0.05, 0.13, 0.10, M["blink"])

def _spiegel(M, x, br, z):
    for s in (-1, 1):
        strebe((x, s*(br/2), z), (x + 0.10, s*(br/2 + 0.30), z + 0.10), 0.045, M["zier"])
        sp = box(x + 0.12, s*(br/2 + 0.34), z + 0.14, 0.06, 0.14, 0.30, M["zier"])
        sp.rotation_euler[2] = -s*0.18

def _fensterband(M, x0, x1, br, z, ho, felder):
    """Seitliches Fensterband als VERTIEFUNG mit Pfosten dazwischen.

    ⚠️ Nicht als eine dunkle Platte AUF die Flanke legen — das liest sich als
    Aufkleber. Das Glas liegt 3 cm innerhalb der Flanke, die Pfosten stehen in
    Lackfarbe wieder buendig davor; erst dieser Versatz macht Fenster daraus."""
    for s in (-1, 1):
        box((x0 + x1)/2, s*(br/2 - 0.03), z, x1 - x0, 0.05, ho, M["glas"])
        for k in range(felder + 1):
            xx = x0 + (x1 - x0)*k/felder
            box(xx, s*(br/2 - 0.005), z, 0.09, 0.05, ho + 0.02, M["lack"])
        box((x0 + x1)/2, s*(br/2 - 0.008), z + ho/2 + 0.03, x1 - x0, 0.05, 0.07, M["lack2"])
        box((x0 + x1)/2, s*(br/2 - 0.008), z - ho/2 - 0.03, x1 - x0, 0.05, 0.07, M["lack2"])

def _tuer(M, x, br, z, hoch, breit):
    """Doppelfaltuer: zwei Fluegel mit Fuge, Glas oben, Griffleiste."""
    for s in (-1, 1):
        for f in (-1, 1):
            box(x + f*breit/4, s*(br/2 - 0.01), z, breit/2 - 0.02, 0.05, hoch, M["lack2"])
            box(x + f*breit/4, s*(br/2 - 0.035), z + hoch*0.16,
                breit/2 - 0.14, 0.05, hoch*0.54, M["glas"])
        box(x, s*(br/2 - 0.002), z, 0.035, 0.05, hoch, M["zier"])       # Mittelfuge

def _dachaufbau(M, x0, x1, br, zd):
    """Klimakasten, Luken und Antenne — ein Busdach ist nie glatt."""
    box((x0 + x1)/2, 0, zd + 0.10, (x1 - x0)*0.44, br*0.62, 0.20, M["weiss"])
    for k in range(3):
        box(x0 + (x1 - x0)*(0.16 + k*0.30), 0, zd + 0.045, 0.62, br*0.44, 0.09, M["weiss"])
    flach(zyl(x0 + 0.30, br*0.28, zd + 0.30, 0.02, 0.60, M["zier"], 6))

# ================================================================ 1) Stadtbus
def _b_bus():
    """Stadtbus, 11,00 x 2,55 x 3,18 m. Front auf +x.

    ⚠️ Der Kasten kommt aus `keil_y`, nicht aus gestapelten Quadern: Bug und Heck
    sind oben eingezogen und unten leicht vorgewoelbt, und genau diese Silhouette
    unterscheidet einen Bus von einem Container auf Raedern."""
    M = _mats((0.14,0.42,0.66))
    L, B, H = 11.00, 2.55, 2.98
    prof = [(-L/2 + 0.10, 0.34), (L/2 - 0.16, 0.34), (L/2, 0.62), (L/2, H - 0.34),
            (L/2 - 0.26, H), (-L/2 + 0.26, H), (-L/2, H - 0.34), (-L/2, 0.62)]
    keil_y(prof, 0.0, B, M["lack"], cz=0.30, name="Buskasten")
    box(0, 0, 0.30, L - 0.30, B - 0.10, 0.24, M["lack2"])               # Schuerze
    _fensterband(M, -L/2 + 0.55, L/2 - 2.10, B, 2.12, 0.92, 7)
    _tuer(M, L/2 - 1.35, B, 1.44, 1.98, 1.20)
    _tuer(M, -L/2 + 1.70, B, 1.44, 1.98, 1.20)
    box(L/2 - 0.02, 0, 2.30, 0.06, B - 0.34, 0.98, M["glas"])           # Windschutz
    box(-L/2 + 0.02, 0, 2.30, 0.06, B - 0.40, 0.86, M["glas"])          # Heckscheibe
    box(L/2 - 0.03, 0, 2.98, 0.10, 1.90, 0.30, M["ziel"])               # Zielanzeige
    box(L/2 - 0.06, 0, 2.98, 0.10, 1.98, 0.38, M["zier"])
    _leuchten(M, L/2, -L/2, B, 0.86, 0.92)
    _spiegel(M, L/2 - 0.28, B, 2.52)
    _dachaufbau(M, -L/2 + 0.40, L/2 - 0.40, B, H + 0.30)
    for x in (L/2 - 2.05, -L/2 + 2.60, -L/2 + 1.20):                    # Raeder
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.20), 0.52, 0.52, 0.30, M["felge"], M["reifen"], M["chrom"], 6)
    box(0, 0, 1.02, L - 1.6, B + 0.03, 0.09, M["zier"])                 # Zierleiste

def bus(): _modul("th40_bus", _b_bus)

# ================================================================ 2) Postauto
def _b_postauto():
    """Postbus, 8,60 x 2,45 x 2,92 m — gelb, mit Gepaeckklappe und Dreiklanghorn.

    Die Klappe ueber der Hinterachse ist das, woran man ein Postauto erkennt:
    ein Bus mit Kofferraum."""
    M = _mats((0.94,0.76,0.10))
    L, B, H = 8.60, 2.45, 2.72
    prof = [(-L/2 + 0.12, 0.36), (L/2 - 0.20, 0.36), (L/2, 0.66), (L/2, H - 0.40),
            (L/2 - 0.34, H), (-L/2 + 0.22, H), (-L/2, H - 0.30), (-L/2, 0.66)]
    keil_y(prof, 0.0, B, M["lack"], cz=0.28, name="Postkasten")
    box(0, 0, 0.28, L - 0.34, B - 0.10, 0.22, M["lack2"])
    _fensterband(M, -L/2 + 1.90, L/2 - 1.90, B, 2.00, 0.86, 5)
    _tuer(M, L/2 - 1.05, B, 1.36, 1.86, 1.00)
    box(L/2 - 0.02, 0, 2.14, 0.06, B - 0.32, 0.92, M["glas"])
    box(-L/2 + 0.02, 0, 2.10, 0.06, B - 0.36, 0.78, M["glas"])
    for s in (-1, 1):                                                   # Gepaeckklappe
        box(-L/2 + 1.55, s*(B/2 - 0.01), 1.00, 1.80, 0.05, 0.72, M["lack2"])
        box(-L/2 + 1.55, s*(B/2 - 0.03), 1.00, 1.66, 0.05, 0.58, M["lack"])
        flach(zyl(-L/2 + 2.30, s*(B/2 + 0.02), 1.00, 0.05, 0.06, M["chrom"], 10,
                  (math.pi/2, 0, 0)))
    box(L/2 - 0.05, 0, 2.74, 0.10, 1.50, 0.26, M["ziel"])
    box(L/2 - 0.08, 0, 2.74, 0.10, 1.58, 0.34, M["zier"])
    for k in range(3):                                                  # Dreiklanghorn
        flach(zyl(L/2 - 1.15 + k*0.10, 0, H + 0.34, 0.055, 0.30, M["chrom"], 10,
                  (0, math.pi/2, 0)))
    _leuchten(M, L/2, -L/2, B, 0.82, 0.88)
    _spiegel(M, L/2 - 0.26, B, 2.34)
    for x in (L/2 - 1.75, -L/2 + 1.95):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.18), 0.50, 0.50, 0.28, M["felge"], M["reifen"], M["chrom"], 6)
    box(0, 0, 1.66, L - 1.2, B + 0.03, 0.10, M["zier"])                 # Zierband

def postauto(): _modul("th40_postauto", _b_postauto)

# ================================================================ 3) Kleinbus
def _b_kleinbus():
    """Minibus, 5,80 x 2,08 x 2,52 m — Schiebetuer, Dachreling."""
    M = _mats((0.90,0.90,0.88))
    L, B, H = 5.80, 2.08, 2.30
    prof = [(-L/2 + 0.10, 0.30), (L/2 - 0.55, 0.30), (L/2 - 0.06, 0.52),
            (L/2, 1.06), (L/2 - 0.30, 1.72), (L/2 - 0.42, H), (-L/2 + 0.18, H),
            (-L/2, H - 0.26), (-L/2, 0.58)]
    keil_y(prof, 0.0, B, M["lack"], cz=0.22, name="Buskasten")
    box(0, 0, 0.22, L - 0.30, B - 0.08, 0.18, M["lack2"])
    _fensterband(M, -L/2 + 0.42, L/2 - 1.55, B, 1.78, 0.62, 4)
    for s in (-1, 1):                                                   # Schiebetuer-Fuge
        box(0.32, s*(B/2 - 0.004), 1.28, 0.03, 0.05, 1.44, M["zier"])
        box(-1.16, s*(B/2 - 0.004), 1.28, 0.03, 0.05, 1.44, M["zier"])
        flach(zyl(0.16, s*(B/2 + 0.015), 1.16, 0.035, 0.20, M["chrom"], 8, (0, math.pi/2, 0)))
    box(L/2 - 0.34, 0, 1.88, 0.30, B - 0.26, 0.66, M["glas"])           # Windschutz schraeg
    box(-L/2 + 0.04, 0, 1.86, 0.06, B - 0.30, 0.60, M["glas"])
    for s in (-1, 1):                                                   # Dachreling
        strebe((-L/2 + 0.45, s*(B/2 - 0.22), H + 0.30), (L/2 - 0.70, s*(B/2 - 0.22), H + 0.30),
               0.055, M["chrom"])
        for k in range(3):
            box(-L/2 + 0.70 + k*1.55, s*(B/2 - 0.22), H + 0.18, 0.09, 0.09, 0.24, M["chrom"])
    _leuchten(M, L/2 - 0.02, -L/2, B, 0.72, 1.40)
    _spiegel(M, L/2 - 0.85, B, 1.86)
    for x in (L/2 - 1.30, -L/2 + 1.15):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.14), 0.38, 0.38, 0.22, M["felge"], M["reifen"], M["chrom"], 5)

def kleinbus(): _modul("th40_kleinbus", _b_kleinbus)

# ================================================================ 4) Kehrichtwagen
def _b_muellwagen():
    """Kehrichtwagen, 8,40 x 2,50 x 3,26 m — Fahrerhaus, Presse, Schuettung.

    ⚠️ Fahrerhaus und Aufbau sind ZWEI Koerper mit einer Fuge dazwischen. Als ein
    durchgehender Kasten sieht das Fahrzeug aus wie ein Lieferwagen mit Hoehe."""
    M = _mats((0.16,0.44,0.28))
    L, B = 8.40, 2.50
    fh = [(2.30, 0.52), (L/2 - 0.10, 0.52), (L/2, 0.80), (L/2, 1.72),
          (L/2 - 0.36, 2.44), (2.30, 2.44)]
    keil_y(fh, 0.0, B, M["lack"], cz=0.30, name="Fahrerhaus")
    box(3.30, 0, 2.16, 1.30, B - 0.24, 0.72, M["glas"])                 # Seitenscheiben
    box(L/2 - 0.22, 0, 2.10, 0.34, B - 0.28, 0.70, M["glas"])           # Windschutz
    box(0.10, 0, 1.86, 4.30, B, 2.60, M["lack2"])                       # Pressaufbau
    for k in range(5):                                                  # Sicken
        box(-1.90 + k*1.02, 0, 1.86, 0.10, B + 0.03, 2.44, M["lack"])
    box(-L/2 + 0.72, 0, 1.70, 1.42, B - 0.10, 2.10, M["blech"])         # Schuettung
    box(-L/2 + 0.28, 0, 0.92, 0.60, B - 0.30, 0.86, M["dunkel"])        # Einwurf
    for s in (-1, 1):                                                   # Hubarme
        strebe((-L/2 + 1.30, s*(B/2 - 0.16), 0.72), (-L/2 + 0.55, s*(B/2 - 0.16), 1.62),
               0.11, M["blech"])
    box(-L/2 + 0.10, 0, 0.30, 0.24, B - 0.20, 0.28, M["blech"])         # Heckstossfaenger
    for k in range(2):                                                  # Rundumleuchten
        flach(zyl(2.40, (k - 0.5)*1.30, 2.56, 0.10, 0.16, M["blink"], 12))
    _leuchten(M, L/2, -L/2 + 0.10, B, 0.86, 0.62)
    _spiegel(M, L/2 - 0.30, B, 2.10)
    for x in (L/2 - 1.55, -1.10, -2.30):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.20), 0.52, 0.52, 0.30, M["felge"], M["reifen"], M["chrom"], 6)

def muellwagen(): _modul("th40_muellwagen", _b_muellwagen)

# ================================================================ 5) Pritschenwagen
def _b_pritsche():
    """Pritschenwagen mit Ladung, 6,50 x 2,28 x 2,54 m — Bordwaende, Kisten, Plane.

    Die Bordwaende sind vier einzelne Klappen mit Scharnieren, keine Kiste ohne
    Deckel: an den Scharnieren erkennt man, dass sie sich oeffnen lassen."""
    M = _mats((0.72,0.24,0.16))
    L, B = 6.50, 2.28
    fh = [(0.70, 0.44), (L/2 - 0.12, 0.44), (L/2, 0.72), (L/2, 1.50),
          (L/2 - 0.42, 2.16), (0.70, 2.16)]
    keil_y(fh, 0.0, B, M["lack"], cz=0.26, name="Fahrerhaus")
    box(1.42, 0, 1.86, 1.00, B - 0.22, 0.64, M["glas"])
    box(L/2 - 0.26, 0, 1.82, 0.36, B - 0.26, 0.62, M["glas"])
    box(-0.85, 0, 0.86, 3.60, B, 0.16, M["holz"])                       # Ladeflaeche
    for s in (-1, 1):                                                   # Seiten-Bordwaende
        for f in (-1, 1):
            box(-0.85 + f*0.92, s*(B/2 - 0.05), 1.20, 1.72, 0.08, 0.56, M["lack2"])
            for k in range(2):
                flach(zyl(-0.85 + f*0.92 + (k - 0.5)*1.10, s*(B/2 + 0.01), 0.94,
                          0.045, 0.10, M["chrom"], 8, (math.pi/2, 0, 0)))
    box(-L/2 + 0.12, 0, 1.20, 0.08, B - 0.10, 0.56, M["lack2"])         # Heckklappe
    box(0.72, 0, 1.42, 0.10, B - 0.10, 1.00, M["blech"])                # Stirnwand
    for k in range(3):                                                  # Ladung
        kx = -1.85 + k*0.98
        box(kx, ((k % 2) - 0.5)*0.44, 1.24, 0.82, 0.72, 0.60, M["holz"])
        box(kx, ((k % 2) - 0.5)*0.44, 1.55, 0.86, 0.76, 0.03, M["blech"])
    _leuchten(M, L/2, -L/2 + 0.06, B, 0.80, 1.10)
    _spiegel(M, L/2 - 0.34, B, 1.86)
    for x in (L/2 - 1.20, -1.75):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.16), 0.44, 0.44, 0.26, M["felge"], M["reifen"], M["chrom"], 5)

def pritsche(): _modul("th40_pritsche", _b_pritsche)

# ================================================================ 6) Anhaenger
def _b_anhaenger():
    """Landwirtschaftlicher Kipp-Anhaenger, 5,40 x 2,20 x 1,96 m.

    Passt an den Traktor aus Charge 38: Deichsel auf +x, Zugoese auf Kupplungs-
    hoehe (0,92 m ueber Grund, dieselbe wie th38_traktor)."""
    M = _mats((0.16,0.34,0.18))
    L, B = 5.40, 2.20
    box(-0.35, 0, 1.02, 3.70, B - 0.12, 0.14, M["blech"])               # Boden
    for s in (-1, 1):
        box(-0.35, s*(B/2 - 0.06), 1.42, 3.70, 0.10, 0.74, M["lack"])
        for k in range(4):                                              # Rippen
            box(-1.90 + k*1.05, s*(B/2 - 0.01), 1.42, 0.10, 0.10, 0.74, M["lack2"])
    for x9, br9 in ((1.52, B - 0.12), (-2.22, B - 0.12)):               # Stirn und Heck
        box(x9, 0, 1.42, 0.10, br9, 0.74, M["lack"])
    box(-0.35, 0, 0.86, 3.20, 0.28, 0.22, M["blech"])                   # Laengstraeger
    strebe((1.46, 0, 0.94), (2.62, 0, 0.92), 0.14, M["blech"])          # Deichsel
    flach(zyl(2.70, 0, 0.92, 0.11, 0.10, M["blech"], 14, (0, math.pi/2, 0)))
    flach(zyl(2.70, 0, 0.92, 0.055, 0.12, M["dunkel"], 12, (0, math.pi/2, 0)))
    box(1.05, 0, 0.52, 0.12, 0.12, 0.86, M["blech"])                    # Stuetzfuss
    flach(zyl(1.05, 0, 0.06, 0.16, 0.06, M["blech"], 12))
    for s in (-1, 1):                                                   # Raeder
        rad(-0.95, s*(B/2 - 0.14), 0.56, 0.56, 0.28, M["felge"], M["reifen"], M["chrom"], 6)
        box(-2.28, s*0.66, 1.06, 0.08, 0.22, 0.24, M["rueck"])
    for s in (-1, 1):                                                   # Kotfluegel
        b9 = box(-0.95, s*(B/2 - 0.14), 1.22, 1.30, 0.36, 0.08, M["lack2"])
        b9.rotation_euler[1] = 0.0

def anhaenger(): _modul("th40_anhaenger", _b_anhaenger)

# ================================================================ 7) Wohnmobil
def _b_wohnmobil():
    """Wohnmobil mit Alkoven, 6,90 x 2,38 x 3,08 m.

    ⚠️ Der Alkoven ueber dem Fahrerhaus ist die Silhouette. Ohne ihn ist es ein
    Kastenwagen; mit ihm erkennt man von weitem, was es ist."""
    M = _mats((0.93,0.92,0.88))
    L, B, H = 6.90, 2.38, 2.86
    prof = [(-L/2 + 0.10, 0.42), (L/2 - 1.05, 0.42), (L/2 - 0.62, 0.62),
            (L/2 - 0.10, 1.16), (L/2 - 0.28, 1.72), (L/2, 1.86), (L/2, H - 0.30),
            (L/2 - 0.28, H), (-L/2 + 0.22, H), (-L/2, H - 0.28), (-L/2, 0.66)]
    keil_y(prof, 0.0, B, M["lack"], cz=0.24, name="Aufbau")
    box(L/2 - 0.55, 0, 1.62, 0.62, B - 0.28, 0.56, M["glas"])           # Windschutz
    box(L/2 - 0.06, 0, 2.42, 0.08, B - 0.44, 0.52, M["glas"])           # Alkovenfenster
    for s in (-1, 1):                                                   # Wohnraumfenster
        box(-0.30, s*(B/2 - 0.03), 2.02, 1.50, 0.05, 0.68, M["glas"])
        box(-0.30, s*(B/2 - 0.005), 2.02, 1.58, 0.05, 0.76, M["lack2"])
        box(-2.20, s*(B/2 - 0.03), 2.02, 0.72, 0.05, 0.62, M["glas"])
        box(-2.20, s*(B/2 - 0.005), 2.02, 0.80, 0.05, 0.70, M["lack2"])
    box(1.30, B/2 - 0.02, 1.44, 0.86, 0.06, 1.86, M["lack2"])           # Aufbautuer
    box(1.30, B/2 - 0.05, 1.86, 0.60, 0.06, 0.56, M["glas"])
    flach(zyl(0.92, B/2 + 0.03, 1.36, 0.04, 0.24, M["chrom"], 8, (math.pi/2, 0, 0)))
    m9 = box(-1.10, 0, H + 0.34, 2.40, B*0.52, 0.10, M["weiss"])        # Markise + Dachluke
    m9.rotation_euler[1] = 0.0
    box(0.40, 0, H + 0.30, 0.66, 0.66, 0.14, M["glas"])
    for s in (-1, 1):
        box(-2.90, s*(B/2 - 0.30), H + 0.30, 0.50, 0.40, 0.10, M["weiss"])
    _leuchten(M, L/2 - 0.04, -L/2, B, 0.86, 1.18)
    _spiegel(M, L/2 - 0.72, B, 1.76)
    for x in (L/2 - 1.60, -L/2 + 1.45):
        for s in (-1, 1):
            rad(x, s*(B/2 - 0.16), 0.42, 0.42, 0.26, M["felge"], M["reifen"], M["chrom"], 5)

def wohnmobil(): _modul("th40_wohnmobil", _b_wohnmobil)

# ================================================================ 8) Busbahnhof
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_busbahnhof():
    """Massstabs-Test: alle sechs Wagen auf einem Vorplatz, 34 x 22 m."""
    M = _mats()
    b = box(0, 0, 0.004, 34.0, 22.0, 0.008, M["blech"]); flach(b)
    _teil(_b_bus,        -5.0,  6.4, 0.0)
    _teil(_b_postauto,   -6.2,  2.6, 0.0)
    _teil(_b_kleinbus,   -8.0, -0.6, 0.0)
    _teil(_b_muellwagen,  6.4, -4.4, math.pi)
    _teil(_b_pritsche,   -3.0, -4.4, math.pi)
    _teil(_b_wohnmobil,  -2.6, -8.0, 0.0)
    _teil(_b_anhaenger,   8.0, -8.0, math.pi)
    export("th40_busbahnhof", 0.014, 2)

def busbahnhof(): neu(); _b_busbahnhof()

if __name__ == "__main__":
    print("Asset-Charge 40 (th40, Nutzfahrzeuge und OeV):")
    for fn in (bus, postauto, kleinbus, muellwagen, pritsche, anhaenger,
               wohnmobil, busbahnhof):
        fn()
    print("fertig")
