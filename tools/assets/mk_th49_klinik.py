# -*- coding: utf-8 -*-
"""Asset-Charge 49 (th49_*): KLINIK UND RETTUNGSDIENST.

Die Stadt hat eine Feuerwache (th43) und einen Polizeiapparat (39 Fundstellen im
Spiel) — der dritte Rettungsdienst fehlte komplett: kein Krankenhaus, keine
Notaufnahme, kein Rettungswagen, keine Praxis, keine Apotheke. Gesucht im
Spielcode nach `krankenhaus|klinik|hotel|kino|museum`: alles 0. Das hier schliesst
die groesste verbliebene Funktionsluecke.

Konventionen wie th5-th48 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Eingang, Front) auf Blender +y -> three.js -z.
  * FAHRZEUGE: Front auf +x.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th49_wartebank laeuft auf x += 1,90.

⚠️ KEIN ROTES KREUZ. Das Emblem des Roten Kreuzes ist nach den Genfer Abkommen
   geschuetzt; es gehoert nicht auf ein Spielobjekt. Verwendet werden die
   Zeichen, die auch in der Wirklichkeit stimmen: **weisses H auf Blau** fuer
   Klinik und Landeplatz (europaeische Wegweisung), **gruenes Kreuz** fuer die
   Apotheke (CH/FR-Konvention). Sieht richtiger aus und ist zugleich sauber.

⚠️ Angewandte Regeln aus den Vorchargen:
   * Glas VOR die Wandflucht, nie buendig (40/43) — `_scheibe_y`/`_scheibe_x`
     rechnen die Aussenkante aus, statt einen Wert zu raten.
   * Ein Rahmen sind VIER Balken, von der Mitte gerechnet (35/37/38/42/44).
   * Koerper statt Platten per `keil_y` (41/44) — Satteldach und Wagenkasten.
   * Ein Vordach braucht Stuetzen, sonst schwebt es (38/42/45).
   * Speichen machen aus der schwarzen Scheibe ein Rad (`rad`, 37/40).
   * Hellwertabstand: Fassade, Sockel und Rahmen duerfen sich nicht im selben
     Grauwert treffen (37/41).
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    return {
      "putz":  mat("KlPutz",   (0.90,0.90,0.88), 0.86),
      "putz2": mat("KlPutz2",  (0.78,0.79,0.80), 0.88),
      "sockel":mat("KlSockel", (0.50,0.51,0.52), 0.90),
      "band":  mat("KlBand",   (0.66,0.68,0.71), 0.72),
      "blau":  mat("KlBlau",   (0.12,0.30,0.58), 0.60),
      "blau2": mat("KlBlau2",  (0.08,0.20,0.42), 0.62),
      "gruen": mat("KlGruen",  (0.10,0.48,0.26), 0.58),
      "weiss": mat("KlWeiss",  (0.96,0.96,0.95), 0.70),
      "stahl": mat("KlStahl",  (0.58,0.60,0.64), 0.40, 0.60),
      "stahl2":mat("KlStahl2", (0.32,0.34,0.38), 0.48, 0.55),
      "dunkel":mat("KlDunkel", (0.11,0.12,0.14), 0.66),
      "holz":  mat("KlHolz",   (0.58,0.42,0.24), 0.86),
      "ziegel":mat("KlZiegel", (0.58,0.28,0.19), 0.88),
      "asphalt":mat("KlAsph",  (0.26,0.26,0.27), 0.95),
      "beton": mat("KlBeton",  (0.62,0.61,0.58), 0.93),
      "reifen":mat("KlReifen", (0.07,0.07,0.08), 0.90),
      "glas":  mat("KlGlas",   (0.20,0.30,0.38), 0.14, 0.25),
      "glas2": mat("KlGlas2",  (0.30,0.42,0.48), 0.12, 0.25),
      "gelb":  mat("KlGelb",   (0.86,0.68,0.10), 0.60),
      "rot":   mat("KlRot",    (0.66,0.16,0.13), 0.62),
      "blaulicht": leucht("KlBlaulicht", (0.22,0.42,1.00), 2.6),
      "licht": leucht("KlLicht",     (1.00,0.95,0.80), 1.5),
      "notlicht": leucht("KlNotlicht",(0.30,0.80,0.45), 1.8),
      "kreuz": leucht("KlKreuz",    (0.16,0.86,0.38), 2.2),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)


# ───────────────────────────────────────────────────────── Fassaden-Werkzeug
# ⚠️ Der teuerste Fehler der Charge 40 war eine Scheibe, die BUENDIG in der
# Wandflucht sass: rechnerisch am richtigen Ort, im Bild nicht vorhanden. Diese
# beiden Helfer bekommen die WANDFLAeCHE und die Richtung nach draussen und
# legen das Glas selbst davor. Keine Aufrufstelle rechnet das noch einmal nach.

def _scheibe_y(m, x, ywand, s, z, b, h, tiefe=0.06, glas="glas"):
    """Scheibe vor einer y-Wandflaeche. s = +1 (nach +y) oder -1."""
    y = ywand + s*(tiefe/2 + 0.012)
    box(x, y, z, b, tiefe, h, m[glas])
    return y

def _scheibe_x(m, y, xwand, s, z, b, h, tiefe=0.06, glas="glas"):
    """Scheibe vor einer x-Wandflaeche. b ist hier die Ausdehnung in y."""
    x = xwand + s*(tiefe/2 + 0.012)
    box(x, y, z, tiefe, b, h, m[glas])
    return x

def _rahmen_y(m, x, y, z, b, h, st=0.09, mat_="band"):
    """Vier Balken um eine Oeffnung auf einer y-Flaeche, von der MITTE gerechnet."""
    box(x, y, z + h/2 - st/2, b, 0.05, st, m[mat_])
    box(x, y, z - h/2 + st/2, b, 0.05, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), y, z, st, 0.05, h - 2*st, m[mat_])

def _rahmen_x(m, y, x, z, b, h, st=0.09, mat_="band"):
    box(x, y, z + h/2 - st/2, 0.05, b, st, m[mat_])
    box(x, y, z - h/2 + st/2, 0.05, b, st, m[mat_])
    for s in (-1, 1):
        box(x, y + s*(b/2 - st/2), z, 0.05, st, h - 2*st, m[mat_])

def _fenster_y(m, x, ywand, s, z, b, h, glas="glas"):
    y = _scheibe_y(m, x, ywand, s, z, b, h, glas=glas)
    _rahmen_y(m, x, y + s*0.02, z, b + 0.14, h + 0.14)

def _fenster_x(m, y, xwand, s, z, b, h, glas="glas"):
    x = _scheibe_x(m, y, xwand, s, z, b, h, glas=glas)
    _rahmen_x(m, y, x + s*0.02, z, b + 0.14, h + 0.14)

def _kreuz(m, x, y, z, arm, st, tiefe, mat_="kreuz"):
    """Ein Kreuz aus zwei Balken — Apotheke (gruen), nie in Rot."""
    box(x, y, z, arm, tiefe, st, m[mat_])
    box(x, y, z, st, tiefe, arm, m[mat_])

def _buchstabe_h(m, x, y, z, b, h, st, tiefe, mat_="weiss", eben=False):
    """Ein H aus drei Balken — die europaeische Klinik-Wegweisung.

    ⚠️ `eben=True` legt es FLACH auf eine Bodenflaeche: dann laeuft `h` in y und
       `tiefe` ist die Aufbauhoehe. Ohne den Schalter stand das H des Landeplatzes
       4,60 m HOCHKANT mitten im Deck — gemessen zmin -1,92. Ein Zeichen auf dem
       Boden hat keine Hoehe, es hat eine Laenge; dieselbe Verwechslung wie beim
       Basketballring (42), nur um die andere Achse."""
    if eben:
        for s in (-1, 1):
            box(x + s*(b/2 - st/2), y, z, st, h, tiefe, m[mat_])
        box(x, y, z, b - 2*st + 0.02, st, tiefe, m[mat_])
    else:
        for s in (-1, 1):
            box(x + s*(b/2 - st/2), y, z, st, tiefe, h, m[mat_])
        box(x, y, z, b - 2*st + 0.02, tiefe, st, m[mat_])


# ═════════════════════════════════════════════════════════════════ 1 · KLINIK
def _b_klinik():
    """Klinik, 26,60 x 18,80 x 13,67 m — drei Geschosse, Vordach, Dachaufbau.

    (Die 18,80 Tiefe enthalten das 3,40 m auskragende Vordach; der Baukoerper
    misst 26,0 x 15,0. Fuer den Kollider im Spiel zaehlt der Koerper.)

    ⚠️ Das Vordach steht auf zwei Stuetzen. Ein 3,4 m weit auskragendes Dach
       ohne Stuetzen liest sich als Fehler, egal wie sauber es sitzt (38/42/45)."""
    m = _mats()
    L, B, GH = 26.0, 15.0, 3.60
    H = 3*GH                                                    # 10,80 Wandhoehe
    flach(box(0, 0, 0.10, L + 0.6, B + 0.6, 0.20, m["sockel"]))  # Sockel
    box(0, 0, 0.20 + H/2, L, B, H, m["putz"])
    # Senkrechte Putzstreifen gliedern die lange Front (sonst eine Wandtapete)
    for k in range(7):
        xx = -L/2 + 1.8 + k*3.7
        for s in (-1, 1):
            box(xx, s*(B/2 + 0.03), 0.20 + H/2, 0.45, 0.10, H, m["putz2"])
    # Fensterbaender: je Geschoss, alle vier Seiten
    for g in range(3):
        zz = 0.20 + g*GH + GH/2 + 0.15
        for k in range(6):
            xx = -L/2 + 2.6 + k*4.2
            for s in (-1, 1):
                _fenster_y(m, xx, s*B/2, s, zz, 2.30, 1.70)
        for k in range(3):
            yy = -B/2 + 3.4 + k*4.1
            for s in (-1, 1):
                _fenster_x(m, yy, s*L/2, s, zz, 2.10, 1.70)
    # Erdgeschoss-Eingang auf +y: Glasfront zwischen zwei Wandstuecken
    _scheibe_y(m, 0, B/2, 1, 1.30, 7.20, 2.60, 0.08, "glas2")
    # ⚠️ Rahmenhoehe = Oeffnungshoehe, NICHT +0,14 wie bei den Fenstern: die
    # Glasfront steht auf dem Boden (0,00…2,60), ein umlaufend groesserer Rahmen
    # haette den unteren Balken auf -0,07 gelegt. Gemessen, nicht vermutet.
    _rahmen_y(m, 0, B/2 + 0.09, 1.30, 7.34, 2.60, 0.12)
    for k in range(3):                                          # Pfosten in der Front
        box(-2.4 + k*2.4, B/2 + 0.07, 1.30, 0.13, 0.10, 2.60, m["band"])
    box(0, B/2 + 0.07, 2.72, 7.34, 0.10, 0.22, m["blau"])       # Sturzband
    # Vordach mit zwei Stuetzen
    VT, VZ = 3.40, 3.30
    box(0, B/2 + VT/2, VZ, 9.20, VT, 0.26, m["weiss"])
    box(0, B/2 + VT/2, VZ + 0.18, 9.40, VT + 0.20, 0.10, m["band"])
    for s in (-1, 1):
        flach(zyl(s*4.10, B/2 + VT - 0.35, VZ/2, 0.13, VZ, m["stahl"]))
        box(s*4.10, B/2 + VT - 0.35, 0.14, 0.44, 0.44, 0.28, m["sockel"])
    # Wegweisung: weisses H auf blauer Tafel neben dem Eingang
    box(-6.10, B/2 + 0.08, 2.30, 1.60, 0.12, 1.60, m["blau"])
    _buchstabe_h(m, -6.10, B/2 + 0.17, 2.30, 0.94, 1.10, 0.24, 0.10)
    box(6.10, B/2 + 0.08, 2.30, 1.60, 0.12, 1.60, m["blau2"])   # Hinweistafel
    for k in range(4):
        box(6.10, B/2 + 0.16, 2.86 - k*0.36, 1.16, 0.06, 0.13, m["weiss"])
    # Attika (vier Balken, von der Mitte gerechnet) + Dachaufbauten
    AH, AS = 0.72, 0.26
    ztop = 0.20 + H
    for s in (-1, 1):
        box(0, s*(B/2 - AS/2), ztop + AH/2, L, AS, AH, m["putz2"])
        box(s*(L/2 - AS/2), 0, ztop + AH/2, AS, B - 2*AS, AH, m["putz2"])
    flach(box(0, 0, ztop + 0.05, L - 0.4, B - 0.4, 0.10, m["beton"]))
    box(-6.5, -1.0, ztop + 1.30, 5.40, 4.60, 2.40, m["putz2"])  # Technikaufbau
    box(-6.5, -1.0, ztop + 2.58, 5.70, 4.90, 0.18, m["band"])
    for k in range(3):                                          # Lueftergitter
        box(-6.5, -1.0 + 2.32, ztop + 1.90 - k*0.55, 4.20, 0.10, 0.34, m["stahl2"])
    box(7.4, 1.6, ztop + 1.05, 3.20, 3.20, 1.90, m["putz2"])    # Treppenhauskopf
    box(7.4, 1.6, ztop + 2.06, 3.50, 3.50, 0.16, m["band"])
    for s in (-1, 1):                                           # Rettungslicht
        box(s*(L/2 - 0.35), B/2 - 0.30, ztop + 0.30, 0.34, 0.34, 0.24, m["blaulicht"])

def klinik(): _modul("th49_klinik", _b_klinik, 0.012)


# ═══════════════════════════════════════════════════════════ 2 · NOTAUFNAHME
def _b_notaufnahme():
    """Notaufnahme, 16,50 x 18,15 x 5,98 m — Anfahrt unter dem Dach.

    (Koerper 16,0 x 11,0; die uebrigen 6,6 m Tiefe sind das Vordach.)

    ⚠️ Die Zufahrt ist der Sinn des Baus: das Vordach ist so hoch, dass ein
       Rettungswagen (2,74 m) darunter passt — 4,40 m lichte Hoehe, gemessen
       gegen th49_rettungswagen und nicht geschaetzt."""
    m = _mats()
    L, B, H = 16.0, 11.0, 5.40
    flach(box(0, 0, 0.09, L + 0.5, B + 0.5, 0.18, m["sockel"]))
    box(0, 0, 0.18 + H/2, L, B, H, m["putz"])
    box(0, 0, 0.18 + H + 0.20, L + 0.5, B + 0.5, 0.40, m["putz2"])   # Dachrand
    # Anfahrt: Vordach auf zwei Stuetzen, lichte Hoehe 4,40
    LICHT = 4.40
    VT = 6.60
    box(0, B/2 + VT/2, LICHT + 0.30, 11.60, VT, 0.60, m["weiss"])
    # ⚠️ Das blaue Band ist ein RAND, keine Platte. Erst lag hier ein volles
    # 11,90 x 6,84-Brett OBEN auf dem Vordach — im Render war das Dach dann
    # blau statt weiss mit blauer Kante. Ein Rand sind vier Balken, genau wie
    # ein Rahmen (35/37/38/42/44); derselbe Fehler wie der Beckenrand, der als
    # volle Platte ueber dem Wasser lag.
    RB, RS = LICHT + 0.66, 0.22
    for s in (-1, 1):
        box(0, B/2 + VT/2 + s*(VT/2 - RS/2), RB, 11.90, RS, 0.14, m["blau"])
        box(s*(11.90/2 - RS/2), B/2 + VT/2, RB, RS, VT - 2*RS, 0.14, m["blau"])
    for s in (-1, 1):
        flach(zyl(s*5.20, B/2 + VT - 0.55, LICHT/2 + 0.15, 0.19, LICHT + 0.30, m["stahl"]))
        box(s*5.20, B/2 + VT - 0.55, 0.16, 0.66, 0.66, 0.32, m["sockel"])
        for k in range(3):                                       # Rammschutz gelb
            box(s*5.20, B/2 + VT - 0.55, 0.55 + k*0.34, 0.42, 0.42, 0.17,
                m["gelb"] if k % 2 == 0 else m["stahl2"])
    flach(box(0, B/2 + VT/2, 0.02, 11.0, VT + 0.6, 0.04, m["asphalt"]))
    for k in range(9):                                           # Zufahrtsmarkierung
        flach(box(-4.6 + k*1.15, B/2 + VT - 0.2, 0.05, 0.60, 0.14, 0.02, m["weiss"]))
    # Tore: zwei breite Schiebetueren unter dem Dach
    for s in (-1, 1):
        _scheibe_y(m, s*2.55, B/2, 1, 1.55, 3.90, 3.10, 0.08, "glas2")
        _rahmen_y(m, s*2.55, B/2 + 0.10, 1.55, 4.04, 3.10, 0.13)  # steht auf 0,00
        box(s*2.55, B/2 + 0.08, 1.55, 0.12, 0.10, 3.10, m["band"])
    box(0, B/2 + 0.07, 1.55, 0.70, 0.12, 3.10, m["putz2"])       # Mittelpfeiler
    # Leuchtband ueber den Toren + gruenes Notfall-Signal
    box(0, B/2 + 0.10, 3.42, 9.20, 0.14, 0.46, m["notlicht"])
    # ⚠️ Das H sass an der WAND hinter dem Vordach — dort sieht es niemand, weil
    # 6,60 m Dach davor liegen. Es gehoert an die Blende des Vordachs, wo es auch
    # in Wirklichkeit haengt: das ist der Punkt, den man bei der Anfahrt sieht.
    # ⚠️ An die BLENDE, also an die senkrechte Stirnseite des Vordachs — nicht auf
    # dessen Oberkante. Beim ersten Versuch lag das Schild flach oben auf und las
    # sich im Render als schwarzes Loch im Dach. Die Blende reicht von 4,40 bis
    # 5,00; das Schild ist 0,46 hoch und sitzt mittig davor.
    yb = B/2 + VT + 0.07
    box(0, yb, LICHT + 0.30, 2.30, 0.10, 0.46, m["blau"])
    _buchstabe_h(m, 0, yb + 0.07, LICHT + 0.30, 0.40, 0.32, 0.09, 0.06)
    # Rueckseite: Fensterband und Nebentuer
    for k in range(4):
        _fenster_y(m, -5.4 + k*3.6, -B/2, -1, 3.40, 2.30, 1.50)
    box(5.9, -B/2 - 0.05, 1.28, 1.05, 0.10, 2.20, m["stahl2"])
    for s in (-1, 1):                                            # Seitenfenster
        for k in range(2):
            _fenster_x(m, -2.2 + k*4.4, s*L/2, s, 3.40, 2.10, 1.50)
    for s in (-1, 1):
        box(s*(L/2 - 0.30), B/2 - 0.25, 4.95, 0.30, 0.30, 0.22, m["blaulicht"])

def notaufnahme(): _modul("th49_notaufnahme", _b_notaufnahme, 0.010)


# ══════════════════════════════════════════════════════ 3 · RETTUNGSWAGEN
def _b_rettungswagen():
    """Rettungswagen, 6,68 x 2,35 x 2,68 m — Kastenaufbau, Front auf +x.

    ⚠️ Der Seitenriss wird als KOERPER extrudiert (`keil_y`), nicht aus Kisten
       gestapelt: die Windschutzscheibenneigung und der Absatz vom Fahrerhaus
       zum hohen Kasten bekommt man mit Quadern nie hin (41/44).
    ⚠️ Die Scheiben liegen VOR der Flanke. br/2 - 0.03 lag frueher komplett
       INNEN und kein einziges Fahrzeug der Charge 40 hatte Fenster."""
    m = _mats()
    BR = 2.20                                                    # Kastenbreite
    RAD_R, RAD_BR = 0.42, 0.26
    BOD = 0.46                                                   # Unterkante Aufbau
    # Seitenriss: Front (+x) rechts. Fahrerhaus niedrig, Kasten hoch.
    prof = [
        (-3.15, BOD), ( 3.05, BOD),                              # Unterkante
        ( 3.15, 0.86), ( 3.15, 1.30),                            # Schnauze
        ( 2.86, 1.52),                                           # Windschutz unten
        ( 2.10, 2.20),                                           # Windschutz oben
        ( 1.62, 2.32),                                           # Fahrerhausdach
        ( 1.30, 2.66),                                           # Absatz zum Kasten
        (-3.15, 2.66),                                           # Kastendach
    ]
    keil_y(prof, 0.0, BR, m["weiss"], name="RtwKoerper")
    # Kastenkanten: umlaufender Streifen, damit der Koerper Kanten bekommt
    box(-0.95, 0, BOD + 0.06, 4.40, BR + 0.04, 0.12, m["stahl2"])
    # Leuchtstreifen an beiden Flanken (das Erkennungsmerkmal)
    for s in (-1, 1):
        box(-0.60, s*(BR/2 + 0.03), 1.34, 5.10, 0.06, 0.30, m["gelb"])
        box(-0.60, s*(BR/2 + 0.045), 1.66, 5.10, 0.04, 0.13, m["blau"])
    # Fenster: Fahrerhaus seitlich + Kastenfenster, VOR der Flanke
    # ⚠️ Nur davorgesetztes Glas liest sich als aufgeklebte Platte. Erst der
    # umlaufende Rahmen macht daraus ein Fenster — dieselben vier Balken wie am
    # Bau, hier flach auf der Flanke.
    for s in (-1, 1):
        for x9, b9, z9, h9 in ((2.06, 1.05, 1.92, 0.62),
                               (0.30, 1.30, 2.16, 0.66),
                               (-1.90, 1.30, 2.16, 0.66)):
            box(x9, s*(BR/2 + 0.035), z9, b9, 0.07, h9, m["glas"])
            ya = s*(BR/2 + 0.055)
            box(x9, ya, z9 + h9/2 + 0.03, b9 + 0.12, 0.04, 0.06, m["stahl2"])
            box(x9, ya, z9 - h9/2 - 0.03, b9 + 0.12, 0.04, 0.06, m["stahl2"])
            for s9 in (-1, 1):
                box(x9 + s9*(b9/2 + 0.03), ya, z9, 0.06, 0.04, h9, m["stahl2"])
    # Windschutzscheibe: liegt schraeg, darum als eigener gekippter Koerper
    ws = box(2.48, 0, 1.86, 0.08, BR - 0.14, 1.00, m["glas"])
    ws.rotation_euler[1] = -0.72
    # Heck: Fluegeltueren mit Fenstern und Griffen
    box(-3.16, 0, 1.52, 0.07, BR - 0.10, 1.96, m["putz2"])
    for s in (-1, 1):
        box(-3.22, s*0.52, 2.10, 0.07, 0.86, 0.62, m["glas"])
        flach(zyl(-3.24, s*0.14, 1.30, 0.035, 0.30, m["stahl2"], 8, (0, math.pi/2, 0)))
    # Stossfaenger vorn und hinten
    for x9, b9 in ((3.18, 0.22), (-3.22, 0.20)):
        box(x9, 0, 0.66, b9, BR + 0.06, 0.34, m["stahl2"])
    box(3.22, 0, 1.06, 0.12, BR - 0.30, 0.26, m["stahl2"])       # Kuehlergrill
    for s in (-1, 1):                                            # Scheinwerfer
        box(3.20, s*(BR/2 - 0.34), 1.02, 0.10, 0.42, 0.24, m["licht"])
        box(-3.24, s*(BR/2 - 0.30), 0.94, 0.08, 0.34, 0.30, m["rot"])
    # Blaulichtbalken auf dem Fahrerhaus
    box(1.90, 0, 2.44, 0.86, BR - 0.36, 0.16, m["stahl2"])
    for s in (-1, 1):
        box(1.90, s*0.56, 2.56, 0.80, 0.30, 0.14, m["blaulicht"])
    for s in (-1, 1):                                            # Kasten-Blaulicht
        box(-3.10, s*0.70, 2.62, 0.16, 0.30, 0.12, m["blaulicht"])
    # Raeder
    for x9 in (2.14, -1.94):
        for s in (-1, 1):
            rad(x9, s*(BR/2 - RAD_BR/2 + 0.02), RAD_R, RAD_R, RAD_BR,
                m["stahl"], m["reifen"], m["stahl2"], 6)
    for x9 in (2.14, -1.94):                                     # Radlaeufe
        for s in (-1, 1):
            box(x9, s*(BR/2 + 0.01), RAD_R + 0.30, RAD_R*2.3, 0.06, 0.14, m["stahl2"])

def rettungswagen(): _modul("th49_rettungswagen", _b_rettungswagen, 0.008)


# ═════════════════════════════════════════════════════ 4 · HELILANDEPLATZ
def _b_helilandeplatz():
    """Landeplatz, 16,79 x 20,56 x 4,82 m — Achteckdeck, H-Markierung, Windsack.

    (Das Deck misst 14,0 im Durchmesser; Windsackmast und Zuweg machen den Rest.)

    ⚠️ Die Markierung liegt AUF dem Deck, nicht darin: 2 cm aufgesetzt. Beim
       Sportplatz (44) deckte eine buendige Linienflaeche den ganzen Rasen zu,
       weil Belag und Linie auf derselben Hoehe lagen."""
    m = _mats()
    R, DH = 7.00, 0.34
    # Achteckdeck aus einem gedrehten Zylinder mit 8 Segmenten
    flach(zyl(0, 0, DH/2, R, DH, m["beton"], 8))
    flach(zyl(0, 0, DH + 0.012, R - 0.55, 0.024, m["asphalt"], 8))
    # Randmarkierung + H, beide AUFGESETZT
    zm = DH + 0.036
    # ⚠️ TANGENTIAL heisst rotation_euler[2] = a, NICHT -a. Mit -a zeigten die acht
    # Randstriche wie ein Stern nach aussen (im Render sofort zu sehen, in den
    # Massen nie). Dieselbe Formel wie beim Kettenglied in Charge 46, nur um z:
    # die Laengsachse +y geht bei Drehung um a auf (-sin a, cos a) — genau die
    # Tangente am Punkt (cos a, sin a).
    # Und der Radius muss INNERHALB des Achtecks liegen: die Seitenmitten liegen
    # auf R*cos(22,5 Grad) = 6,47, bei 6,70 hingen die Striche in der Luft.
    for k in range(8):
        a = TAU*k/8 + TAU/16
        mk = box(math.cos(a)*(R - 1.05), math.sin(a)*(R - 1.05), zm, 0.28, 2.40, 0.02, m["weiss"])
        mk.rotation_euler[2] = a
        flach(mk)
    _buchstabe_h(m, 0, 0, zm, 3.40, 4.60, 0.72, 0.02, eben=True)  # H liegt flach
    for k in range(2):                                            # Anflugpfeil
        flach(box(0, -(R - 1.5) + k*0.55, zm, 1.60 - k*0.7, 0.34, 0.02, m["gelb"]))
    # Randbefeuerung auf kurzen Pfosten
    for k in range(8):
        a = TAU*k/8
        px, py = math.cos(a)*(R + 0.45), math.sin(a)*(R + 0.45)
        flach(zyl(px, py, 0.22, 0.07, 0.44, m["stahl2"]))
        flach(zyl(px, py, 0.50, 0.13, 0.14, m["licht"]))
    # Windsack: Mast, Ausleger, Sack aus drei Ringen
    MX, MY, MH = -(R + 1.9), (R - 1.2), 4.60
    flach(zyl(MX, MY, MH/2, 0.10, MH, m["stahl"]))
    box(MX, MY, 0.16, 0.62, 0.62, 0.32, m["sockel"])
    flach(zyl(MX + 0.34, MY, MH - 0.10, 0.05, 0.72, m["stahl2"], 8, (0, math.pi/2, 0)))
    for k in range(3):
        r9 = 0.34 - k*0.09
        sk = kegel(MX + 0.86 + k*0.46, MY, MH - 0.12 - k*0.05, r9, r9 - 0.08, 0.44,
                   m["gelb"] if k % 2 == 0 else m["rot"], 12, (0, math.pi/2, 0))
    # Zwei Loeschmittelschraenke am Rand
    for s in (-1, 1):
        box(s*(R - 1.2), -(R + 1.1), 0.62, 0.90, 0.50, 1.24, m["rot"])
        box(s*(R - 1.2), -(R + 1.36), 0.62, 0.72, 0.06, 1.04, m["stahl2"])
        box(s*(R - 1.2), -(R + 1.1), 1.30, 1.02, 0.62, 0.10, m["stahl2"])
    # Zuweg zur Klinik (Bahn aus Platten, damit der Platz angebunden wirkt)
    for k in range(4):
        flach(box(0, R + 0.7 + k*1.30, 0.03, 2.40, 1.10, 0.06, m["beton"]))

def helilandeplatz(): _modul("th49_helilandeplatz", _b_helilandeplatz, 0.010)


# ═══════════════════════════════════════════════════════════ 5 · ARZTPRAXIS
def _b_arztpraxis():
    """Arztpraxis, 12,00 x 11,69 x 8,58 m — Wohnhaus mit Praxisschild und Erker.

    ⚠️ Das Satteldach ist ein KOERPER (`keil_y`), keine vier Platten. In Charge
       41 standen die Stirnplatten 10 cm waagrecht heraus und der Bau war
       0,77 m zu hoch."""
    m = _mats()
    L, B, H = 11.0, 9.0, 5.60
    flach(box(0, 0, 0.11, L + 0.5, B + 0.5, 0.22, m["sockel"]))
    box(0, 0, 0.22 + H/2, L, B, H, m["putz"])
    # Satteldach als Koerper, First laeuft auf x
    zt = 0.22 + H
    dach = keil_y([(-B/2 - 0.45, 0), (B/2 + 0.45, 0), (0, 2.10)],
                  0.0, L + 0.9, m["ziegel"], cz=zt, name="PxDach")
    dach.rotation_euler[2] = math.pi/2
    box(0, 0, zt + 0.09, L + 1.0, B + 1.0, 0.18, m["band"])      # Traufband
    # Fenster: EG und OG auf +y, dazu Seiten
    for k in range(3):
        _fenster_y(m, -3.4 + k*3.4, B/2, 1, 4.30, 1.30, 1.55)
    for k in (-1, 1):
        _fenster_y(m, k*3.4, B/2, 1, 1.85, 1.30, 1.45)
    for s in (-1, 1):
        for k in range(2):
            _fenster_x(m, -2.0 + k*4.0, s*L/2, s, 4.30, 1.20, 1.45)
            _fenster_x(m, -2.0 + k*4.0, s*L/2, s, 1.85, 1.20, 1.35)
    for k in range(2):
        _fenster_y(m, -1.7 + k*3.4, -B/2, -1, 4.30, 1.20, 1.45)
    # Erker um den Eingang
    EB, ET = 3.20, 1.10
    box(0, B/2 + ET/2, 1.62, EB, ET, 3.05, m["putz2"])
    box(0, B/2 + ET/2, 3.24, EB + 0.30, ET + 0.30, 0.20, m["band"])
    _scheibe_y(m, 0, B/2 + ET, 1, 1.95, 2.30, 1.30, 0.06, "glas2")
    _rahmen_y(m, 0, B/2 + ET + 0.05, 1.95, 2.44, 1.44)
    box(0, B/2 + ET + 0.02, 1.10, 1.10, 0.10, 2.16, m["holz"])   # Tuer
    flach(zyl(0.38, B/2 + ET + 0.10, 1.10, 0.035, 0.20, m["stahl"], 8, (math.pi/2, 0, 0)))
    for k in range(3):                                            # Eingangsstufen
        box(0, B/2 + ET + 0.28 + k*0.32, 0.15 - k*0.05, 1.90, 0.34, 0.10, m["beton"])
    # Praxisschild neben dem Erker
    box(-2.85, B/2 + 0.09, 2.55, 1.35, 0.12, 0.95, m["weiss"])
    _kreuz(m, -2.85, B/2 + 0.17, 2.55, 0.62, 0.17, 0.06, "gruen")
    for k in range(2):
        box(-2.85, B/2 + 0.17, 2.16 - k*0.20, 0.98, 0.05, 0.09, m["stahl2"])
    # Schornstein
    box(3.10, -1.6, zt + 1.30, 0.72, 0.72, 2.60, m["ziegel"])
    box(3.10, -1.6, zt + 2.68, 0.92, 0.92, 0.16, m["sockel"])

def arztpraxis(): _modul("th49_arztpraxis", _b_arztpraxis, 0.010)


# ═════════════════════════════════════════════════════════════ 6 · APOTHEKE
def _b_apotheke():
    """Apotheke, 10,60 x 9,96 x 6,72 m — Schaufenster, Markise, gruenes Kreuz.

    ⚠️ Gruen, nicht rot: das rote Kreuz ist ein geschuetztes Emblem. Das gruene
       Kreuz ist ohnehin die Apothekenkennzeichnung in CH und FR."""
    m = _mats()
    L, B, H = 10.0, 8.0, 6.20
    flach(box(0, 0, 0.10, L + 0.5, B + 0.5, 0.20, m["sockel"]))
    box(0, 0, 0.20 + H/2, L, B, H, m["putz"])
    box(0, 0, 0.20 + H + 0.16, L + 0.6, B + 0.6, 0.32, m["putz2"])
    # Schaufensterfront auf +y: Glas VOR der Flucht, Pfosten davor
    _scheibe_y(m, -1.35, B/2, 1, 1.70, 5.10, 2.60, 0.08, "glas2")
    _rahmen_y(m, -1.35, B/2 + 0.09, 1.70, 5.24, 2.74, 0.12)
    for k in range(3):
        box(-3.30 + k*1.95, B/2 + 0.07, 1.70, 0.12, 0.10, 2.60, m["band"])
    box(2.65, B/2 + 0.02, 1.35, 1.20, 0.10, 2.30, m["holz"])     # Tuer
    box(2.65, B/2 + 0.05, 1.80, 0.86, 0.06, 1.20, m["glas"])
    _rahmen_y(m, 2.65, B/2 + 0.10, 1.35, 1.34, 2.44)
    # Markise ueber der Front (gekippt -> braucht Aufschlag, 38/42/45)
    mk = box(-0.6, B/2 + 0.82, 3.36, 7.60, 1.70, 0.10, m["gruen"])
    mk.rotation_euler[0] = -0.24
    box(-0.6, B/2 + 0.06, 3.58, 7.70, 0.16, 0.22, m["stahl2"])
    for s in (-1, 1):
        strebe((-0.6 + s*3.6, B/2 + 0.10, 3.52), (-0.6 + s*3.6, B/2 + 1.58, 3.16),
               0.06, m["stahl2"])
    # Gruenes Kreuz auf Ausleger, quer zur Fassade (von der Strasse lesbar)
    flach(zyl(-4.55, B/2 + 0.42, 4.55, 0.05, 0.84, m["stahl2"], 8, (math.pi/2, 0, 0)))
    _kreuz(m, -4.55, B/2 + 0.84, 4.55, 1.30, 0.36, 0.13, "kreuz")
    # Obergeschoss-Fenster
    for k in range(3):
        _fenster_y(m, -3.2 + k*3.2, B/2, 1, 4.80, 1.25, 1.35)
    for s in (-1, 1):
        for k in range(2):
            _fenster_x(m, -1.8 + k*3.6, s*L/2, s, 4.80, 1.20, 1.35)
            _fenster_x(m, -1.8 + k*3.6, s*L/2, s, 2.10, 1.20, 1.25)
    for k in range(2):
        _fenster_y(m, -1.6 + k*3.2, -B/2, -1, 4.80, 1.25, 1.35)
    box(3.4, -B/2 - 0.05, 1.20, 1.00, 0.10, 2.05, m["stahl2"])   # Lieferzugang

def apotheke(): _modul("th49_apotheke", _b_apotheke, 0.010)


# ═══════════════════════════════════════════════════════════ 7 · WARTEBANK
def _b_wartebank():
    """Wartebank, 1,80 x 0,62 x 0,86 m — drei Schalen auf Stahltraeger.

    RASTER x += 1,90 — Reihen im Wartebereich lassen sich damit aneinanderlegen.
    ⚠️ Die Schalen sitzen auf dem Traeger, nicht darin: der Traeger liegt auf
       0,40, die Sitzflaeche beginnt bei 0,44."""
    m = _mats()
    BR, T = 1.80, 0.58
    for s in (-1, 1):                                            # Fuesse
        box(s*(BR/2 - 0.16), 0, 0.20, 0.09, T - 0.10, 0.40, m["stahl2"])
        box(s*(BR/2 - 0.16), 0, 0.02, 0.26, T + 0.04, 0.04, m["stahl2"])
    box(0, -0.10, 0.42, BR, 0.09, 0.07, m["stahl"])              # Laengstraeger
    box(0,  0.16, 0.42, BR, 0.09, 0.07, m["stahl"])
    for k in range(3):                                           # Sitzschalen
        xx = -0.58 + k*0.58
        box(xx, 0.02, 0.47, 0.52, T - 0.06, 0.06, m["blau"])
        rl = box(xx, -0.24, 0.66, 0.52, 0.06, 0.40, m["blau"])
        rl.rotation_euler[0] = 0.16
        # ⚠️ Armlehne auf 0,62 lag nur 12 cm ueber der Sitzflaeche (Oberkante 0,50)
        # und stand ohne Stuetze in der Luft — im Render lag sie auf dem Sitz.
        # 0,70 ist der Abstand, den eine Armlehne wirklich hat, und sie braucht
        # einen Pfosten bis zum Traeger.
        for s in (-1, 1):
            if (k == 0 and s == -1) or (k == 2 and s == 1):
                box(xx + s*0.28, 0.02, 0.70, 0.05, 0.42, 0.05, m["stahl"])
                box(xx + s*0.28, 0.20, 0.58, 0.05, 0.05, 0.28, m["stahl"])

def wartebank(): _modul("th49_wartebank", _b_wartebank, 0.006)


# ═══════════════════════════════════════════════════════════ 8 · ROLLSTUHL
def _b_rollstuhl():
    """Rollstuhl, 0,96 x 0,84 x 0,95 m — Greifreifen, Lenkrollen, Fussstuetzen.

    ⚠️ Radachse auf y (`rot=(pi/2,0,0)`). Mit (0,pi/2,0) laege sie auf x und der
       Stuhl faehre seitwaerts — derselbe Griff wie beim Basketballring (42),
       nur andersherum."""
    m = _mats()
    BR, RR = 0.62, 0.31
    for s in (-1, 1):                                            # Grosse Raeder
        rad(-0.05, s*(BR/2 + 0.03), RR, RR, 0.05, m["stahl"], m["reifen"], m["stahl2"], 8)
        # ⚠️ Ein Greifreifen ist ein RING. Als `zyl` mit Radius RR-0.05 war er eine
        # volle SCHEIBE und deckte das ganze Rad zu — im Render ein weisser Deckel
        # ueber den Speichen, in den Massen unauffaellig. Dieselbe Familie wie
        # „ein Rahmen sind vier Balken": ein Ring ist keine Scheibe.
        # Tangential um die y-Achse: rot[1] = -(a + pi/2), die Formel aus Charge 46.
        for k in range(20):
            a = TAU*k/20
            sg = box(-0.05 + math.cos(a)*(RR - 0.045), s*(BR/2 + 0.10),
                     RR + math.sin(a)*(RR - 0.045),
                     (RR - 0.045)*0.36, 0.022, 0.022, m["stahl"])
            sg.rotation_euler[1] = -(a + math.pi/2)
    for s in (-1, 1):                                            # Lenkrollen
        flach(zyl(0.36, s*(BR/2 - 0.06), 0.09, 0.09, 0.04, m["dunkel"], 12, (math.pi/2, 0, 0)))
        box(0.36, s*(BR/2 - 0.06), 0.20, 0.05, 0.05, 0.22, m["stahl2"])
    box(0.06, 0, 0.48, 0.52, BR - 0.06, 0.05, m["blau"])         # Sitz
    rl = box(-0.20, 0, 0.70, 0.05, BR - 0.06, 0.44, m["blau"])   # Rueckenlehne
    rl.rotation_euler[1] = 0.14
    for s in (-1, 1):                                            # Rahmen
        strebe((0.34, s*(BR/2 - 0.04), 0.30), (0.30, s*(BR/2 - 0.04), 0.46), 0.035, m["stahl"])
        strebe((-0.24, s*(BR/2 - 0.04), 0.46), (-0.24, s*(BR/2 - 0.04), 0.90), 0.035, m["stahl"])
        box(0.30, s*(BR/2 - 0.04), 0.46, 0.60, 0.045, 0.045, m["stahl"])
        # Schiebegriff
        flach(zyl(-0.26, s*(BR/2 - 0.04), 0.92, 0.026, 0.14, m["dunkel"], 8, (0, math.pi/2, 0)))
        # Armlehne
        box(0.02, s*(BR/2 - 0.02), 0.66, 0.42, 0.05, 0.05, m["stahl2"])
        strebe((0.20, s*(BR/2 - 0.02), 0.50), (0.20, s*(BR/2 - 0.02), 0.66), 0.03, m["stahl2"])
        # Fussstuetze
        box(0.46, s*0.16, 0.14, 0.20, 0.13, 0.03, m["stahl2"])
        strebe((0.40, s*0.16, 0.30), (0.46, s*0.16, 0.16), 0.03, m["stahl"])

def rollstuhl(): _modul("th49_rollstuhl", _b_rollstuhl, 0.005)


# ═════════════════════════════════════════════════════ 9 · KLINIKGELAENDE
def _teil(bauer, x, y, rz=0.0):
    vor = set(bpy.context.scene.objects)
    bauer()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.location.x += x; o.location.y += y
        if rz:
            o.rotation_euler[2] += rz
            px, py = o.location.x - x, o.location.y - y
            c, s = math.cos(rz), math.sin(rz)
            o.location.x = x + px*c - py*s
            o.location.y = y + px*s + py*c

def _b_klinikgelaende():
    """Massstabs-Test: Klinikareal 48,00 x 40,41 m, nur aus den Teilen oben.

    ⚠️ SCHAUBILD, KEIN BEBAUUNGSPLAN. Die Teile stehen hier eng zusammen, damit
    sie aufs Bild passen. Wer diese Abstaende in die Karte uebernimmt, bekommt
    Ueberschneidungen — beim Einbau ist mir genau das mit 18 Stueck passiert."""
    m = _mats()
    flach(box(0, 0, 0.004, 48.0, 38.0, 0.008, m["asphalt"]))
    _teil(_b_klinik,        -8.0,  10.0)
    _teil(_b_notaufnahme,   12.0,  -2.0)
    _teil(_b_helilandeplatz, -14.0, -11.0)
    _teil(_b_arztpraxis,    16.0,  14.0)
    _teil(_b_apotheke,       2.0,  14.5)
    _teil(_b_rettungswagen,  12.0, -9.5, math.pi/2)
    _teil(_b_rettungswagen,  16.5, -9.5, math.pi/2)
    for k in range(3):
        _teil(_b_wartebank, -1.0 + k*1.90, 1.4)
    _teil(_b_rollstuhl,      3.6, 0.8, 0.6)
    export("th49_klinikgelaende", 0.010, 2)

def klinikgelaende(): neu(); _b_klinikgelaende()


if __name__ == "__main__":
    print("Asset-Charge 49 (th49, Klinik und Rettungsdienst):")
    for fn in (klinik, notaufnahme, rettungswagen, helilandeplatz, arztpraxis,
               apotheke, wartebank, rollstuhl, klinikgelaende):
        fn()
    print("fertig")
