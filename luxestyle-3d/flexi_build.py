#!/usr/bin/env python3
# flexi_build.py - Flexi-Keychain -> EINE druckfertige Mehrfarb-3MF (LuxeStyle).
# ---------------------------------------------------------------------------
# Rendert jede Farb-Region (body/white/black/rosa/orange) einzeln via OpenSCAD,
# wirft leere Regionen weg und fuegt den Rest ueber assemble.py zu einer 3MF
# zusammen (Farbe pro Dreieck -> Bambu fragt nur Farbe->Filament). Kein
# 5-fach-Import, kein Bemalen. Name wird in den Koerper graviert.
#
#   python3 flexi_build.py LOOK [NAME] [OUT.3mf]
#   z.B.  python3 flexi_build.py mimi Mia samples/flexi_mimi_mia.3mf
#         python3 flexi_build.py bear
#
# Voraussetzung: openscad + blender (headless). assemble.py liegt daneben.
# ---------------------------------------------------------------------------
import os, sys, subprocess, glob, struct, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SCAD = os.path.join(HERE, "flexi_cat_keychain.scad")
ASSEMBLE = os.path.join(HERE, "assemble.py")

# Koerperfarbe je Look (Filament-Farbe der Region "body")
BODY_RGB = {
    "mimi":   [0.90, 0.90, 0.90],   # weiss
    "pancake":[0.62, 0.63, 0.66],   # grau (Derp-Look)
    "dog":    [0.82, 0.66, 0.45],   # hellbraun
    "bear":   [0.55, 0.36, 0.20],   # braun
    "seal":   [0.60, 0.63, 0.67],   # grau
}
REGION_RGB = {
    "white":  [0.95, 0.95, 0.95],
    "black":  [0.04, 0.04, 0.04],
    "rosa":   [0.95, 0.60, 0.66],
    "orange": [0.90, 0.45, 0.10],
}
PARTS = ["body", "white", "black", "rosa", "orange"]


def stl_facets(path):
    """Dreieck-Anzahl einer STL (ASCII von OpenSCAD ODER binaer); 0 wenn leer."""
    try:
        with open(path, "rb") as f:
            data = f.read()
    except OSError:
        return 0
    if data[:5] == b"solid" and b"facet normal" in data:   # ASCII
        return data.count(b"facet normal")
    if len(data) >= 84:                                    # binaer
        return struct.unpack("<I", data[80:84])[0]
    return 0


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def main():
    look = sys.argv[1] if len(sys.argv) > 1 else "mimi"
    name = sys.argv[2] if len(sys.argv) > 2 else ""
    out  = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        HERE, "samples", "flexi_%s%s.3mf" % (look, "_" + name.lower() if name else ""))
    if look not in BODY_RGB:
        sys.exit("Unbekannter look=%s (erlaubt: %s)" % (look, ", ".join(BODY_RGB)))

    workdir = "/tmp/flexi_parts_%s" % look
    shutil.rmtree(workdir, ignore_errors=True)
    os.makedirs(workdir, exist_ok=True)

    palette = {"body": BODY_RGB[look]}
    kept = []
    for part in PARTS:
        stl = os.path.join(workdir, "color_%s.stl" % part)
        # check=False: OpenSCAD endet mit Exit 1 bei leerer Geometrie (Look hat
        # diese Farbregion nicht) - das ist kein Fehler, nur "ueberspringen".
        subprocess.run(["openscad", "-o", stl,
                        "-D", 'look="%s"' % look, "-D", 'part="%s"' % part,
                        "-D", 'txt="%s"' % name.replace('"', ""), SCAD],
                       stderr=subprocess.DEVNULL)
        n = stl_facets(stl)
        if n < 4:                       # leere Region (Look hat diese Farbe nicht)
            if os.path.exists(stl):
                os.remove(stl)
            print("  - %-7s leer, uebersprungen" % part)
            continue
        if part in REGION_RGB:
            palette[part] = REGION_RGB[part]
        kept.append(part)
        print("  + %-7s %d Dreiecke" % (part, n))

    os.makedirs(os.path.dirname(out), exist_ok=True)
    png = os.path.splitext(out)[0] + ".png"
    env = dict(os.environ, IN=workdir, OUT=out, PNG=png,
               PALETTE=__import__("json").dumps(palette))
    run(["blender", "--background", "--python", ASSEMBLE], env=env)
    print("FLEXI_3MF_DONE %s  (Regionen: %s)" % (out, ", ".join(kept)))


if __name__ == "__main__":
    main()
