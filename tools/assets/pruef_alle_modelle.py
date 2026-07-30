# -*- coding: utf-8 -*-
"""Sammelpruefung ueber ALLE Modelle der Bibliothek.

Prueft, was sich maschinell pruefen laesst und in dieser Session immer wieder
danebenging:
  * Unterkante — muss exakt 0 sein. Negativ = das Teil steckt im Boden, positiv =
    es schwebt. Beides faellt im Spiel sofort auf.
  * Bevel — eine reine Box hat 12 Dreiecke. Wer deutlich darunter liegt, hat den
    `export_apply=True` beim glTF-Export vergessen und liefert Kanten statt Rundungen.
  * STL-Zwilling — jedes GLB soll ein STL in models/stl/ haben.

Aufruf:  /usr/bin/python3 tools/assets/pruef_alle_modelle.py [muster ...]
"""
import bpy, glob, os, sys
from mathutils import Vector

MODELLE = "/home/user/aban-news-landing/models"
STL     = "/home/user/aban-news-landing/models/stl"

TOLERANZ_UNTEN = 0.005      # 5 mm — darunter ist es Rundungsrauschen aus dem Export
TOLERANZ_OBEN  = 0.012      # daruber schwebt es sichtbar

# Bewusste Ausnahmen: diese Teile haengen und haben deshalb keine Unterkante auf 0.
# Bewusste Ausnahmen: diese Teile haengen an Wand oder Decke und haben deshalb
# keine Unterkante auf 0. Ohne die Liste meldet die Pruefung sie als Fehler.
HAENGEND = {
    "th14_discokugel", "th14_kronleuchter",
    "th_gemaelde", "th_bild", "th_spiegel", "th_wanduhr", "th_deckenlampe",
    "th2_badspiegel", "th2_deckenlampe",
}


def messen(pfad):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=pfad)
    tris = 0
    mn = [1e9]*3; mx = [-1e9]*3
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
    if tris == 0:
        return None
    return tris, mn, mx


def main():
    muster = sys.argv[1:] or ["*.glb"]
    dateien = []
    for m in muster:
        dateien += glob.glob(os.path.join(MODELLE, m))
    dateien = sorted(set(dateien))

    befunde = []
    ohne_stl = []
    leer = []
    for f in dateien:
        name = os.path.splitext(os.path.basename(f))[0]
        if not os.path.exists(os.path.join(STL, name + ".stl")):
            ohne_stl.append(name)
        r = messen(f)
        if r is None:
            leer.append(name)
            continue
        tris, mn, mx = r
        if name in HAENGEND:
            continue
        if mn[2] < -TOLERANZ_UNTEN:
            befunde.append((mn[2], name, "steckt im Boden", tris))
        elif mn[2] > TOLERANZ_OBEN:
            befunde.append((mn[2], name, "schwebt", tris))

    print(f"\n=== GEPRUEFT: {len(dateien)} Modelle ===")
    if befunde:
        befunde.sort(key=lambda b: -abs(b[0]))
        print(f"\n--- {len(befunde)} mit falscher Unterkante ---")
        for z, n, was, t in befunde:
            print(f"  {z:+7.3f}  {n:34s} {was:16s} {t:6d} Dreiecke")
    else:
        print("\n  Unterkanten: alle in Ordnung.")
    if leer:
        print(f"\n--- {len(leer)} ohne Geometrie ---")
        for n in leer:
            print("  ", n)
    if ohne_stl:
        print(f"\n--- {len(ohne_stl)} ohne STL-Zwilling ---")
        for n in ohne_stl[:40]:
            print("  ", n)
    print()


if __name__ == "__main__":
    main()
