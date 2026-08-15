# -*- coding: utf-8 -*-
"""Asset-Charge 41 (th41_*): BAHNANLAGEN.

Am Gleis bei z = 112 steht seit langem ein Bahnhof — aber als Quaderkiste:
Sockel, Kasten, flache Dachplatte, Fenster als aufgeklebte Rechtecke, Baenke aus
drei Boxen. Genau der Zustand, in dem die Stadthaeuser vor Charge 37 waren. Dazu
fehlt dem Bahnsteig alles, was einen Bahnsteig ausmacht: Kante, Signal,
Fahrleitungsmast, Anzeigetafel, Prellbock.

Konventionen wie th5-th40 (siehe models/TH5-ASSETS.md), Werkzeug aus th_werkzeug.py:
  * Ursprung mittig, Unterkante exakt z = 0, Meter, PBR-Materialien.
  * Schauseite (Empfangsseite, Signalkopf, Tafel) auf Blender +y -> three.js -z.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT.

RASTER: th41_bahnsteigkante laeuft auf x += 6,00.

⚠️ Die Lehre aus Charge 40 gilt hier fuer jede Scheibe: die AUSSENKANTE des
   Glases ausrechnen (Mitte + Tiefe/2) und mit der Wandflaeche vergleichen.
   Liegt sie dahinter, ist das Fenster unsichtbar — in Charge 40 hatte deshalb
   kein einziger von sechs Wagen Scheiben.
"""
import os, math
import th_werkzeug as W
from th_werkzeug import (bpy, bmesh, neu, mat, mat_bild, leucht, box, zyl, kugel,
                         kegel, scheibe, flach, dreh, rohr, bogen_pkt, volute_pkt,
                         strebe, kranz, runden, export, keil_y, rad, TAU)

def _mats():
    """Bahnfarben: Sandstein, Werkstein fast weiss, Ziegelrot, verzinkter Stahl."""
    return {
      "putz":  mat_bild("BnPutz", "hausputz.png", (0.80,0.72,0.58), 0.88, 0.0, True),
      "putz2": mat("BnPutz2",  (0.68,0.60,0.47), 0.88),
      "stein": mat("BnStein",  (0.95,0.94,0.91), 0.84),
      "sockel":mat("BnSockel", (0.52,0.47,0.40), 0.90),
      "dach":  mat("BnDach",   (0.38,0.20,0.16), 0.76),
      "holz":  mat("BnHolz",   (0.40,0.26,0.16), 0.86),
      "stahl": mat("BnStahl",  (0.60,0.62,0.66), 0.42, 0.62),
      "dunkel":mat("BnDunkel", (0.14,0.15,0.17), 0.65),
      "beton": mat("BnBeton",  (0.72,0.71,0.67), 0.92),
      "grau":  mat("BnGrau",   (0.55,0.55,0.53), 0.94),
      "gelb":  mat("BnGelb",   (0.86,0.68,0.14), 0.70),
      "rost":  mat("BnRost",   (0.42,0.24,0.14), 0.88),
      # ⚠️ Glas DUNKLER als die Wand — heller liest es sich als aufgeklebtes
      # weisses Rechteck statt als Oeffnung (Befund aus Charge 37).
      "glas":  mat("BnGlas",   (0.20,0.28,0.34), 0.14, 0.20),
      "rot":   leucht("BnRot",   (0.95,0.14,0.10), 1.5),
      "gruen": leucht("BnGruen", (0.20,0.90,0.35), 1.5),
      "orange":leucht("BnOrange",(0.98,0.66,0.12), 1.4),
      "licht": leucht("BnLicht", (1.00,0.94,0.78), 1.2),
    }

def _modul(name, bauer, bevel=0.012):
    neu(); bauer(); export(name, bevel, 2)

def _rahmen(x, yf, z, b, h, st, m, mat_="stein"):
    """⚠️ EIN RAHMEN SIND VIER BALKEN. Eine Platte in Fenstergroesse davor deckt
    die Scheibe zu — der Fehler aus Charge 35, 37, 37 und 38."""
    box(x, yf, z + h/2 - st/2, b, 0.07, st, m[mat_])
    box(x, yf, z - h/2 + st/2, b, 0.07, st, m[mat_])
    for s in (-1, 1):
        box(x + s*(b/2 - st/2), yf, z, st, 0.07, h - 2*st, m[mat_])

def _fenster(x, z, br, ho, m, yw, bogen=True):
    """Fenster mit Sprossenkreuz, optional mit Rundbogen darueber.

    ⚠️ Glas auf yw + 0,02 mit 6 cm Tiefe: Aussenkante yw + 0,05, also 5 cm VOR
    der Wand. Dahinter waere es unsichtbar (Lehre aus Charge 40)."""
    box(x, yw + 0.02, z, br, 0.06, ho, m["glas"])
    box(x, yw + 0.03, z, 0.055, 0.06, ho - 0.04, m["stein"])            # Sprosse senkrecht
    box(x, yw + 0.03, z, br - 0.04, 0.06, 0.05, m["stein"])             # Sprosse waagrecht
    _rahmen(x, yw + 0.05, z, br + 0.16, ho + 0.16, 0.11, m)
    box(x, yw + 0.07, z - ho/2 - 0.13, br + 0.30, 0.14, 0.09, m["stein"])   # Sohlbank
    if bogen:
        rohr(bogen_pkt(x - br/2 - 0.08, x + br/2 + 0.08, z + ho/2 + 0.06, br*0.42, 9),
             0.075, m["stein"], 8, True, "Bogen")

def _dachhaelfte(x, y, z, br, tf, neig, m, mat_="dach"):
    """Eine geneigte Dachflaeche. Vier davon ergeben ein Walmdach — ohne
    Giebeldreiecke und damit ohne die Eulerfalle aus Charge 39."""
    d = box(x, y, z, br, tf, 0.22, m[mat_])
    d.rotation_euler[0] = neig
    return d

# ================================================================ 1) Empfangsgebaeude
def _b_bahnhof():
    """Empfangsgebaeude, 24,0 x 11,4 x 10,6 m. Empfangsseite auf +y.

    Das bestehende Gebaeude im Spiel ist ein Kasten mit flacher Platte darauf.
    Was ihm fehlt, ist genau das, was Charge 37 den Stadthaeusern gegeben hat:
    Sockel mit Absatz, Eckquaderung, Gesims, Walmdach mit Ziegelreihen,
    Rundbogenfenster mit Sprossen, ein Portal mit Vordach — und Kamine."""
    m = _mats()
    B, T, H = 23.0, 10.4, 7.4
    box(0, 0, 0.32, B + 1.0, T + 1.0, 0.64, m["sockel"])                # Sockel
    box(0, 0, 0.92, B + 0.5, T + 0.5, 0.36, m["putz2"])
    box(0, 0, H/2 + 1.10, B, T, H, m["putz"])                           # Korpus
    for s in (-1, 1):                                                   # Eckquaderung
        for k in range(9):
            bq = 0.85 if k % 2 else 0.55
            box(s*(B/2 - bq/2 + 0.03), 0, 1.35 + k*0.80, bq, T + 0.06, 0.72, m["stein"])
            box(0, s*(T/2 - bq/2 + 0.03), 1.35 + k*0.80, B + 0.06, bq, 0.72, m["stein"])
    box(0, 0, H + 1.28, B + 0.7, T + 0.7, 0.34, m["stein"])             # Hauptgesims
    box(0, 0, H + 1.02, B + 0.4, T + 0.4, 0.20, m["stein"])
    # Fenster: fuenf auf der Empfangsseite, drei je Giebelseite, Obergeschoss
    for k in range(5):
        xx = -8.4 + k*4.2
        if abs(xx) > 1.6: _fenster(xx, 3.10, 1.55, 2.30, m, T/2)
        _fenster(xx, 6.20, 1.35, 1.60, m, T/2, False)
        _fenster(xx, 3.10, 1.55, 2.30, m, -T/2 - 0.12, True)
    for s in (-1, 1):
        for k in range(2):
            zz = 3.10 + k*3.10
            box(s*(B/2 + 0.02), 0, zz, 0.06, 1.35, 2.10 if k == 0 else 1.50, m["glas"])
            box(s*(B/2 + 0.05), 0, zz, 0.10, 1.51, 2.26 if k == 0 else 1.66, m["stein"])
            box(s*(B/2 + 0.09), 0, zz, 0.10, 1.35, 2.10 if k == 0 else 1.50, m["glas"])
    # Portal mit Vordach — die Tuer ist eine OEFFNUNG, kein Brett auf der Wand
    box(0, T/2 - 0.10, 2.35, 3.10, 0.34, 3.90, m["dunkel"])
    for s in (-1, 1):
        box(s*0.72, T/2 + 0.06, 2.35, 1.40, 0.10, 3.70, m["holz"])
        box(s*0.72, T/2 + 0.12, 3.30, 1.06, 0.06, 1.60, m["glas"])
    _rahmen(0, T/2 + 0.14, 2.35, 3.34, 4.14, 0.20, m)
    rohr(bogen_pkt(-1.60, 1.60, 4.34, 0.70, 9), 0.10, m["stein"], 8, True, "Portalbogen")
    for k in range(3):                                                  # Freitreppe
        box(0, T/2 + 0.62 + k*0.34, 0.60 - k*0.20, 4.20 - k*0.30, 0.36, 0.20, m["sockel"])
    box(0, T/2 + 0.20, 5.55, 6.40, 0.16, 0.62, m["stein"])              # Bahnhofsschild
    box(0, T/2 + 0.28, 5.55, 6.00, 0.06, 0.42, m["dunkel"])
    for k in range(9):                                                  # Schriftbalken
        box(-2.40 + k*0.60, T/2 + 0.32, 5.55, 0.34, 0.05, 0.22, m["stein"])
    vd = box(0, T/2 + 0.85, 4.95, 5.20, 1.90, 0.16, m["stahl"])         # Vordach
    vd.rotation_euler[0] = -0.16
    for s in (-1, 1):
        strebe((s*2.20, T/2 + 0.06, 4.20), (s*2.20, T/2 + 1.62, 4.86), 0.075, m["stahl"])
    # Bahnhofsuhr im Giebelfeld
    flach(zyl(0, T/2 + 0.10, 6.35, 0.86, 0.14, m["stein"], 24, (math.pi/2, 0, 0)))
    flach(zyl(0, T/2 + 0.17, 6.35, 0.70, 0.06, m["licht"], 24, (math.pi/2, 0, 0)))
    for k in range(12):                                                 # Stundenstriche
        a = TAU*k/12
        flach(zyl(math.cos(a)*0.58, T/2 + 0.21, 6.35 + math.sin(a)*0.58,
                  0.035, 0.03, m["dunkel"], 6, (math.pi/2, 0, 0)))
    for lg, aw in ((0.44, 1.10), (0.60, 2.60)):                         # Zeiger
        zg = box(math.cos(aw)*lg/2, T/2 + 0.23, 6.35 + math.sin(aw)*lg/2,
                 lg, 0.04, 0.06, m["dunkel"])
        zg.rotation_euler[1] = -aw
    # ⚠️ Erster Versuch: Walmdach aus vier geneigten PLATTEN. Die beiden
    # Stirnplatten waren 10,1 x 11,8 gross und standen im Render als schraege
    # Bretter waagrecht aus dem Haus heraus (Gesamthoehe 12,77 statt 12,0).
    # Ein Dach ist ein KOERPER, keine Sammlung von Platten. `keil_y` zieht den
    # Giebelquerschnitt zu genau diesem Koerper aus — inklusive geschlossener
    # Giebelflaechen. Der First soll auf x laufen, das Profil liegt aber in x-z:
    # also einmal um z drehen, danach zeigt die Extrusionsachse auf x.
    TD, HH = T/2 + 0.75, 3.30
    dachk = keil_y([(-TD, 0.0), (TD, 0.0), (TD, 0.30), (0.0, HH), (-TD, 0.30)],
                   0.0, B + 1.5, m["dach"], cz=H + 1.44, name="Satteldach")
    dachk.rotation_euler[2] = math.pi/2
    for s in (-1, 1):                                                   # Traufbrett
        box(0, s*(TD - 0.06), H + 1.62, B + 1.6, 0.14, 0.34, m["stein"])
    for k in range(9):                                                  # Ziegelreihen
        zz = H + 1.66 + k*(HH - 0.40)/9
        yy = TD*(1 - k/9.4)
        for s in (-1, 1):
            box(0, s*yy, zz, B + 1.5, 0.10, 0.07, m["putz2"])
    box(0, 0, H + 1.44 + HH, B + 0.4, 0.42, 0.22, m["stein"])           # Firstziegel
    # Rinne und Fallrohre — ein Dach ohne Entwaesserung endet als Kante in der Luft
    for s in (-1, 1):
        flach(zyl(0, s*(TD + 0.09), H + 1.50, 0.10, B + 1.6, m["stahl"], 10,
                  (0, math.pi/2, 0)))
        for q in (-1, 1):
            flach(zyl(q*(B/2 - 0.35), s*(T/2 + 0.14), (H + 1.50)/2, 0.075, H + 1.50,
                      m["stahl"], 10))
            for k in range(4):
                flach(zyl(q*(B/2 - 0.35), s*(T/2 + 0.14), 1.4 + k*1.9, 0.095, 0.14,
                          m["stahl"], 10))
    for k in range(2):                                                  # Kamine
        cx = -6.5 + k*13.0
        box(cx, 0, H + 3.05, 1.10, 1.10, 2.10, m["putz2"])
        box(cx, 0, H + 4.20, 1.40, 1.40, 0.24, m["stein"])
        for q in range(4):
            flach(zyl(cx + ((q % 2) - 0.5)*0.42, ((q//2) - 0.5)*0.42, H + 4.44,
                      0.13, 0.30, m["rost"], 10))

def bahnhof(): _modul("th41_bahnhof", _b_bahnhof)

# ================================================================ 2) Bahnsteigkante
def _b_bahnsteigkante():
    """Bahnsteigkanten-Modul, Raster 6,00 m, Oberkante 0,55 m ueber Grund.

    ⚠️ Der weisse Sicherheitsstreifen und die geriffelte Taststreifenzone sind
    das, woran man eine Bahnsteigkante erkennt — ohne sie ist es eine Stufe."""
    m = _mats()
    BR = 6.00
    # ⚠️ Koerper GRAU, Streifen weiss. Beton auf Werkstein war im Render
    # weiss auf weiss — Kantenstein und Sicherheitsstreifen verschwanden,
    # uebrig blieb eine glatte Platte.
    box(0, 0, 0.275, BR, 3.60, 0.55, m["grau"])                         # Plattenkoerper
    box(0, -1.72, 0.28, BR, 0.16, 0.56, m["stein"])                     # Kantenstein
    box(0, -1.40, 0.556, BR, 0.46, 0.02, m["stein"])                    # Sicherheitsstreifen
    for k in range(24):                                                 # Taststreifen
        box(-BR/2 + 0.12 + k*(BR - 0.24)/23, -0.98, 0.565, 0.06, 0.34, 0.03, m["gelb"])
    for k in range(3):                                                  # Plattenfugen
        box(-BR/2 + (k + 1)*BR/4, 0, 0.556, 0.05, 3.60, 0.014, m["dunkel"])

def bahnsteigkante(): _modul("th41_bahnsteigkante", _b_bahnsteigkante, 0.006)

# ================================================================ 3) Hauptsignal
def _b_signal():
    """Lichtsignal, 0,90 x 0,70 x 5,60 m — Mast, Schirm, drei Lichter, Leiter.

    Der Schirm ueber jedem Licht ist kein Zierrat: ohne ihn liest sich der Kopf
    als drei Punkte auf einem Brett."""
    m = _mats()
    flach(zyl(0, 0, 2.30, 0.09, 4.60, m["stahl"], 12))
    flach(zyl(0, 0, 0.14, 0.30, 0.28, m["beton"], 14))                  # Fundament
    for k in range(9):                                                  # Steigleiter
        box(0.20, 0, 0.65 + k*0.34, 0.30, 0.035, 0.035, m["stahl"])
    for s in (-1, 1):
        strebe((0.34, s*0.02, 0.60), (0.34, s*0.02, 3.60), 0.035, m["stahl"])
    box(0, 0, 4.62, 0.44, 0.34, 1.66, m["dunkel"])                      # Signalkasten
    box(0, 0, 4.62, 0.52, 0.30, 1.74, m["stahl"])
    for k, farbe in enumerate(("rot", "orange", "gruen")):
        zz = 5.24 - k*0.56
        flach(zyl(0, 0.19, zz, 0.115, 0.06, m[farbe], 14, (math.pi/2, 0, 0)))
        flach(zyl(0, 0.16, zz, 0.135, 0.05, m["dunkel"], 14, (math.pi/2, 0, 0)))
        sch = box(0, 0.30, zz + 0.15, 0.30, 0.24, 0.035, m["dunkel"])   # Schirm
        sch.rotation_euler[0] = 0.42
    box(0, 0.06, 3.62, 0.62, 0.10, 0.24, m["stein"])                    # Signaltafel
    box(0, 0.12, 3.62, 0.52, 0.06, 0.16, m["dunkel"])

def signal(): _modul("th41_signal", _b_signal, 0.006)

# ================================================================ 4) Prellbock
def _b_prellbock():
    """Prellbock, 2,70 x 1,95 x 1,32 m — Schienenrahmen, Prellbalken, Warnfeld.

    ⚠️ Der erste Versuch benutzte `strebe()` fuer die Schraegen und legte
    zusaetzliche Balken quer darueber. Im Render war das ein Haufen Kanthoelzer,
    in dem kein Prellbock mehr zu erkennen war. Jetzt eine klare Kette: zwei
    Grundschienen auf Spurweite, je eine Schraege nach oben, ein Pfosten, ein
    durchgehender Prellbalken quer davor. Fuenf Teile je Seite, kein Gewirr.

    ⚠️ Er sitzt AUF dem Gleis: die Rahmenschenkel stehen auf Spurweite 1,435 m."""
    m = _mats()
    SP = 1.435
    # ⚠️ Zweiter Anlauf. Beim ersten blieben die Grundschienen 2,50 lang und
    # liefen rechts ins Leere — zwei Stangen, die aus einem Gestaenge ragen.
    # Ein Prellbock liest sich als geschlossenes DREIECK: Untergurt, Schraege,
    # Endpfosten. Was ueber die Ecken hinaussteht, macht daraus ein Geruest.
    for s in (-1, 1):
        y = s*SP/2
        box(-0.10, y, 0.13, 1.90, 0.13, 0.26, m["rost"])                # Untergurt
        sr = box(-0.08, y, 0.60, 1.52, 0.14, 0.18, m["rost"])           # Schraege
        sr.rotation_euler[1] = -0.60
        box(0.78, y, 0.30, 0.16, 0.13, 0.60, m["rost"])                 # Endpfosten
        box(-0.62, y, 0.64, 0.16, 0.13, 0.90, m["rost"])                # Kopfpfosten
        box(0.10, y, 0.66, 0.14, 0.11, 0.14, m["rost"])                 # Knotenblech
    box(-0.74, 0, 1.02, 0.24, SP + 0.50, 0.44, m["rost"])               # Prellbalken
    box(-0.88, 0, 1.02, 0.10, SP + 0.50, 0.48, m["dunkel"])             # Puffergummi
    for k in range(5):                                                  # Warnfeld
        box(-0.93, -SP/2 - 0.16 + k*(SP + 0.32)/4, 1.02, 0.05, 0.24, 0.46,
            m["rot"] if k % 2 else m["stein"])
    box(-0.62, 0, 0.28, 0.18, SP + 0.10, 0.16, m["rost"])               # Querverband
    for s in (-1, 1):                                                   # Pufferteller
        flach(zyl(-1.00, s*0.30, 1.02, 0.15, 0.14, m["stein"], 14, (0, math.pi/2, 0)))

def prellbock(): _modul("th41_prellbock", _b_prellbock, 0.008)

# ================================================================ 5) Fahrleitungsmast
def _b_fahrleitungsmast():
    """Fahrleitungsmast mit Ausleger, 2,90 x 0,50 x 7,40 m.

    ⚠️ Der Ausleger zeigt auf +x, also QUER zum Mast und ueber das Gleis. Im
    Spiel steht schon ein Mast, dessen Ausleger auf 7,5 m Hoehe skaliert 11,2 m
    breit wurde — die Ausladung gehoert in dieselbe Groessenordnung wie der
    Gleisabstand, nicht in die des Mastes."""
    m = _mats()
    HM = 7.20
    for s in (-1, 1):                                                   # Gittermast
        for q in (-1, 1):
            strebe((s*0.13, q*0.13, 0.20), (s*0.09, q*0.09, HM), 0.055, m["stahl"])
    for k in range(14):                                                 # Verstrebungen
        zz = 0.40 + k*(HM - 0.6)/13
        f = 0.13 - 0.04*k/13
        for s in (-1, 1):
            box(s*f, 0, zz, 0.05, f*2, 0.05, m["stahl"])
            box(0, s*f, zz, f*2, 0.05, 0.05, m["stahl"])
        if k % 2 == 0:
            dg = box(0, 0, zz + 0.14, f*2.4, 0.05, 0.05, m["stahl"])
            dg.rotation_euler[1] = 0.55
    box(0, 0, 0.16, 0.62, 0.62, 0.32, m["beton"])                       # Fundament
    strebe((0.10, 0, HM - 0.30), (2.55, 0, HM - 0.10), 0.065, m["stahl"])   # Ausleger
    strebe((0.10, 0, HM - 1.40), (2.45, 0, HM - 0.22), 0.055, m["stahl"])   # Schraegzug
    box(2.42, 0, HM - 0.55, 0.06, 0.06, 0.70, m["stahl"])               # Haenger
    flach(zyl(2.42, 0, HM - 0.92, 0.045, 0.34, m["stahl"], 8, (0, math.pi/2, 0)))
    for s in (-1, 1):                                                   # Isolatoren
        for k in range(4):
            flach(zyl(0.30 + s*0.0, 0, HM - 0.24 - k*0.0, 0.07, 0.05, m["stein"], 10))
    for k in range(4):
        flach(zyl(0.34 + k*0.12, 0, HM - 0.22, 0.075, 0.09, m["stein"], 10))

def fahrleitungsmast(): _modul("th41_fahrleitungsmast", _b_fahrleitungsmast, 0.005)

# ================================================================ 6) Anzeigetafel
def _b_anzeigetafel():
    """Abfahrtstafel auf zwei Masten, 2,60 x 0,40 x 3,10 m.

    ⚠️ Die Zeilen sind aufgesetzte Leisten, keine Textur — das Modell soll auch
    als STL ohne Bild als Anzeigetafel erkennbar bleiben."""
    m = _mats()
    for s in (-1, 1):
        flach(zyl(s*0.95, 0, 1.20, 0.055, 2.40, m["stahl"], 10))
        flach(zyl(s*0.95, 0, 0.03, 0.14, 0.06, m["stahl"], 12))
    box(0, 0, 2.52, 2.50, 0.16, 1.06, m["dunkel"])                      # Kasten
    box(0, 0.10, 2.52, 2.30, 0.06, 0.88, m["orange"])                   # Leuchtflaeche
    for k in range(4):                                                  # Zeilen
        box(-0.10, 0.14, 2.86 - k*0.22, 1.90, 0.05, 0.075, m["dunkel"])
        box(1.00, 0.14, 2.86 - k*0.22, 0.28, 0.05, 0.075, m["dunkel"])
    box(0, 0, 3.06, 2.66, 0.30, 0.10, m["stahl"])                       # Blende oben
    box(0, 0, 1.86, 2.20, 0.10, 0.30, m["stein"])                       # Gleisnummernschild
    box(0, 0.06, 1.86, 0.34, 0.06, 0.22, m["dunkel"])

def anzeigetafel(): _modul("th41_anzeigetafel", _b_anzeigetafel, 0.006)

# ================================================================ 7) Gepaeckkarre
def _b_gepaeckkarre():
    """Gepaeckkarre mit Koffern, 2,20 x 1,10 x 1,30 m."""
    m = _mats()
    box(0, 0, 0.62, 1.90, 0.92, 0.10, m["holz"])                        # Ladeflaeche
    for k in range(6):
        box(-0.85 + k*0.34, 0, 0.66, 0.22, 0.92, 0.05, m["holz"])
    for s in (-1, 1):                                                   # Rungen
        box(0, s*0.44, 0.82, 1.90, 0.07, 0.26, m["holz"])
        for k in range(3):
            box(-0.70 + k*0.70, s*0.44, 0.86, 0.09, 0.09, 0.34, m["rost"])
    strebe((0.92, 0, 0.62), (1.34, 0, 1.02), 0.075, m["rost"])          # Deichsel
    flach(zyl(1.42, 0, 1.06, 0.05, 0.52, m["rost"], 10, (math.pi/2, 0, 0)))
    for s in (-1, 1):                                                   # Raeder
        rad(-0.42, s*0.50, 0.30, 0.30, 0.10, m["stahl"], m["dunkel"], m["stahl"], 6)
        rad(0.52, s*0.50, 0.22, 0.22, 0.09, m["stahl"], m["dunkel"], m["stahl"], 5)
    for k, (kx, kz, kb) in enumerate(((-0.52, 0.86, 0.60), (0.04, 0.90, 0.68),
                                      (-0.28, 1.14, 0.46))):            # Koffer
        kf = box(kx, ((k % 2) - 0.5)*0.20, kz, kb, 0.42, 0.34,
                 m["holz"] if k % 2 else m["rost"])
        kf.rotation_euler[2] = 0.12*(k - 1)
        box(kx, ((k % 2) - 0.5)*0.20, kz + 0.18, kb*0.30, 0.06, 0.05, m["stahl"])

def gepaeckkarre(): _modul("th41_gepaeckkarre", _b_gepaeckkarre, 0.008)

# ================================================================ 8) Bahnsteigbank
def _b_bahnsteigbank():
    """Bahnsteigbank mit Laterne daneben, 3,05 x 0,86 x 3,42 m.

    ⚠️ Erster Versuch: der Laternenmast stand MITTEN in der Sitzflaeche, und die
    Wangen bekamen eine Volute in der y-z-Ebene, die 2,30 m tief ausschlug
    (gemessen als Bautiefe). Auf dem Kontaktbogen war das ein flaches
    Lattenraster mit einem Mast hindurch. Jetzt steht die Laterne NEBEN der
    Bank, und die Wangen sind einfache Winkel — eine Bank erkennt man an Sitz
    und Lehne, nicht am Schnoerkel."""
    m = _mats()
    BX = -0.62
    for s in (-1, 1):                                                   # Wangen
        box(BX + s*0.86, 0.10, 0.22, 0.10, 0.58, 0.44, m["rost"])
        box(BX + s*0.86, -0.20, 0.74, 0.10, 0.14, 0.76, m["rost"])
        box(BX + s*0.86, 0.02, 0.47, 0.12, 0.72, 0.09, m["rost"])       # Sitztraeger
        for q in (-1, 1):                                               # Fussplatten
            box(BX + s*0.86, q*0.24, 0.03, 0.20, 0.16, 0.06, m["rost"])
    for k in range(4):                                                  # Sitzlatten
        box(BX, -0.20 + k*0.17, 0.52, 1.82, 0.14, 0.055, m["holz"])
    for k in range(3):                                                  # Lehnenlatten
        box(BX, -0.26, 0.76 + k*0.18, 1.82, 0.075, 0.14, m["holz"])
    LX = 1.32
    flach(zyl(LX, 0, 1.58, 0.055, 3.10, m["rost"], 10))                 # Laternenmast
    flach(zyl(LX, 0, 0.05, 0.16, 0.10, m["rost"], 12))
    flach(zyl(LX, 0, 0.62, 0.09, 0.12, m["rost"], 10))
    box(LX, 0, 2.94, 0.34, 0.34, 0.42, m["licht"])
    for q in range(4):                                                  # Laternenkanten
        a = TAU*q/4 + 0.785
        box(LX + math.cos(a)*0.18, math.sin(a)*0.18, 2.94, 0.05, 0.05, 0.46, m["rost"])
    flach(dreh([(0.00, 0.00), (0.28, 0.07), (0.32, 0.17), (0.22, 0.22), (0.00, 0.24)],
               m["rost"], 14, x=LX, y=0.0, z=3.16, name="Laternendach"))
    flach(kugel(LX, 0, 3.44, 0.07, m["rost"], 8))

def bahnsteigbank(): _modul("th41_bahnsteigbank", _b_bahnsteigbank, 0.008)

# ================================================================ 9) Bahnsteig (Ensemble)
def _teil(fn, px, py, rot=0.0, pz=0.0):
    vor = set(bpy.context.scene.objects)
    fn()
    for o in bpy.context.scene.objects:
        if o in vor: continue
        o.rotation_euler[2] += rot
        o.location = (px + math.cos(rot)*o.location[0] - math.sin(rot)*o.location[1],
                      py + math.sin(rot)*o.location[0] + math.cos(rot)*o.location[1],
                      pz + o.location[2])

def _b_bahnsteig():
    """Massstabs-Test: Bahnsteig mit Gebaeude, Kante, Ausstattung — 44 x 30 m."""
    m = _mats()
    flach(box(0, 4.0, 0.004, 44.0, 30.0, 0.008, m["beton"]))
    _teil(_b_bahnhof, 0.0, 11.0)
    for k in range(6):
        _teil(_b_bahnsteigkante, -15.0 + k*6.0, -1.2)
    for k in range(3):
        _teil(_b_bahnsteigbank, -11.0 + k*11.0, 0.9, math.pi)
    _teil(_b_anzeigetafel, -5.0, 0.6, math.pi)
    _teil(_b_gepaeckkarre, 7.5, 0.4, 0.25)
    _teil(_b_signal, 18.0, -5.4, math.pi)
    _teil(_b_prellbock, -19.5, -5.4)
    for k in range(3):
        _teil(_b_fahrleitungsmast, -14.0 + k*14.0, -8.6, math.pi)
    export("th41_bahnsteig", 0.012, 2)

def bahnsteig(): neu(); _b_bahnsteig()

if __name__ == "__main__":
    print("Asset-Charge 41 (th41, Bahnanlagen):")
    for fn in (bahnhof, bahnsteigkante, signal, prellbock, fahrleitungsmast,
               anzeigetafel, gepaeckkarre, bahnsteigbank, bahnsteig):
        fn()
    print("fertig")
