# -*- coding: utf-8 -*-
"""CHARGE 50 — GTA-Wagen: Gratis-Modelle, in Blender selbst bearbeitet.

User 2026-09-23: „traumhaus mit gta 5 style … hole gratis stl und bearbeite selber".

QUELLE: Quaternius „Cars Pack" (CC0 1.0, https://quaternius.com/packs/cars.html,
Download = oeffentlicher Google-Drive-Ordner 1fKlbDry77iY8KlEoxzUxIAZQL_XhzWlA).
Sieben Wagen als .blend. Das Skript holt sie selbst (`holen()`), wenn sie fehlen.

WAS HIER BEARBEITET WIRD (das ist die eigentliche Arbeit, nicht der Download):
  * STREIFENWAGEN: aus dem US-Schwarz-Weiss wird eine Schweizer Lackierung —
    ganz weiss, blau-leuchtgelbes Karomuster (zwei Reihen) an beiden Flanken,
    „POLIZEI" als 3D-Schriftzug auf den Tueren, der rot-weiss-blaue Balken wird
    zu ZWEI Blaulichtern (links/rechts getrennte Materialien, damit das Spiel sie
    abwechselnd blinken lassen kann). Karomuster und Schrift folgen der Flanke:
    ihre Punkte werden per Strahl auf die Karosserie gesucht, nicht geschaetzt.
  * ALLE: Materialien neu als PBR (Lack metallisch, Scheiben dunkel spiegelnd,
    Leuchten selbstleuchtend) und nach den Namen benannt, die traumhaus.html
    erwartet (`SdLack…` wird im Verkehr umgefaerbt, `SdScheibe` ist Glas).
  * RAEDER: die beiden Hinterraeder waren EIN Netz — die Radsuche im Spiel
    (`_raederAnlegen`, sucht zylindrische Einzelteile) fand dann 3 statt 4 und
    drehte gar nichts. Jetzt vier einzelne Raeder.
  * AUSRICHTUNG wie Charge 37: Front auf +x (three.js), Ursprung mittig,
    Unterkante exakt 0, Meter.

AUSGABE: models/th50_<name>.glb + models/stl/th50_<name>.stl

AUFRUF:  PYTHONPATH=/tmp/bpyenv python3 tools/assets/mk_th50_gta_wagen.py
         (bpy 4.2 als Python-Modul: pip download bpy==4.2.0 → pip install --target)
"""
import bpy, bmesh, os, math, urllib.request
from mathutils import Vector, Matrix

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(os.path.dirname(HIER))
OUT_GLB = os.path.join(WURZEL, "models")
OUT_STL = os.path.join(WURZEL, "models", "stl")
QUELLE = os.environ.get("TH50_QUELLE", "/tmp/th50_quelle")
os.makedirs(OUT_STL, exist_ok=True)
os.makedirs(QUELLE, exist_ok=True)

DRIVE = {  # Quaternius Cars Pack, Ordner „Blends"
    "Cop": "1dWk2t09F_mfUHF-6gwgbic6H89K67YDU",
    "NormalCar1": "1MrFb8LAbMrz5omQkvJ9t43omvQ2DWrHA",
    "NormalCar2": "1wg2lW4rDQavOtcu2i5qzWtHJXXY0kDDD",
    "SportsCar": "1N3u2xZnSx_x5wbYdFGQe1IgIvvbHeApM",
    "SportsCar2": "1Q9FIPBQuKP3KtW3bcRzmTUBf5U-16VSz",
    "SUV": "1i_J-m5wjrr6wxXy2-XONATGydBAdJWuL",
    "Taxi": "1zw7_r7wbli_XZCERfzFY2ge4lFDB9Zy2",
}
# Ausgabename: (Quelle, Art, Lackfarbe oder None = Originalfarbe behalten)
WAGEN = {
    "streife":    ("Cop",        "polizei", None),
    "taxi":       ("Taxi",       "taxi",    None),
    "limousine2": ("NormalCar1", "pkw",     (0.20, 0.33, 0.55)),   # Stahlblau statt Pastell
    "kompakt":    ("NormalCar2", "pkw",     (0.62, 0.64, 0.66)),   # Silber
    "coupe":      ("SportsCar",  "pkw",     (0.72, 0.16, 0.08)),   # Rot
    "gt":         ("SportsCar2", "pkw",     (0.06, 0.06, 0.07)),   # Schwarz
    "suv":        ("SUV",        "pkw",     (0.18, 0.26, 0.20)),   # Tannengruen
}


def holen():
    for name, fid in DRIVE.items():
        ziel = os.path.join(QUELLE, name + ".blend")
        if os.path.exists(ziel) and os.path.getsize(ziel) > 100000:
            continue
        url = "https://drive.google.com/uc?export=download&id=" + fid
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(ziel, "wb") as f:
            f.write(r.read())
        print("geholt:", name, os.path.getsize(ziel), "Bytes")


# ── Materialien ───────────────────────────────────────────────────────────────
def pbr(name, farbe, metall=0.0, rauh=0.6, leucht=None, staerke=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*farbe, 1)
    b.inputs["Metallic"].default_value = metall
    b.inputs["Roughness"].default_value = rauh
    if leucht:
        b.inputs["Emission Color"].default_value = (*leucht, 1)
        b.inputs["Emission Strength"].default_value = staerke
    m.diffuse_color = (*farbe, 1)
    return m


def rolle(altname, art):
    """Welche Aufgabe hat ein Originalmaterial? (Namen aus dem Quaternius-Pack)"""
    n = altname.lower()
    if n.startswith("window"): return "glas"
    if n == "black": return "gummi"
    if n == "grey": return "chrom"
    if n.startswith("headlight"): return "vorn"
    if n.startswith("taillight"): return "hinten"
    if n.startswith("bluelight"): return "blau"
    if n.startswith("whitelight"): return "balken"
    if n == "darkorange": return "zier"
    return "lack"


def materialien(art, lack):
    M = {}
    M["glas"] = pbr("SdScheibe", (0.082, 0.11, 0.15), 0.6, 0.06)
    M["gummi"] = pbr("SdGummi", (0.035, 0.035, 0.04), 0.0, 0.85)
    M["chrom"] = pbr("SdChrom", (0.55, 0.56, 0.58), 0.85, 0.28)
    M["vorn"] = pbr("SdLichtVorn", (1.0, 0.95, 0.82), 0.0, 0.2, (1.0, 0.95, 0.8), 0.9)
    M["hinten"] = pbr("SdLichtHinten", (0.75, 0.05, 0.04), 0.0, 0.3, (0.8, 0.05, 0.03), 0.6)
    M["zier"] = pbr("SdZier", (0.08, 0.08, 0.09), 0.3, 0.4)
    if art == "polizei":
        M["lack"] = pbr("PolizeiWeiss", (0.9, 0.91, 0.92), 0.25, 0.32)
    elif art == "taxi":
        M["lack"] = pbr("TaxiGelb", (0.86, 0.62, 0.05), 0.35, 0.3)
    else:
        M["lack"] = pbr("SdLack", lack, 0.45, 0.28)
    return M


# ── Hilfen ────────────────────────────────────────────────────────────────────
def alle_meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def waehle(objs, aktiv=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = aktiv or (objs[0] if objs else None)


def anwenden(objs):
    waehle(objs)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def trenne_hinterraeder(o):
    """EIN Netz mit beiden Hinterraedern → zwei Netze, links und rechts."""
    waehle([o])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    teile = [x for x in bpy.context.selected_objects]
    links = [t for t in teile if schwerpunkt(t).x > 0]
    rechts = [t for t in teile if schwerpunkt(t).x <= 0]
    out = []
    for gruppe, name in ((links, "Rad_HL"), (rechts, "Rad_HR")):
        if not gruppe:
            continue
        waehle(gruppe)
        if len(gruppe) > 1:
            bpy.ops.object.join()
        g = bpy.context.view_layer.objects.active
        g.name = name
        out.append(g)
    return out


def schwerpunkt(o):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    return sum(vs, Vector()) / max(1, len(vs))


def strahl(o, start, richtung):
    """Treffer auf der Karosserie (Weltkoordinaten; Transformationen sind angewandt)."""
    ok, loc, nor, _ = o.ray_cast(start, richtung, distance=10)
    return (loc, nor) if ok else (None, None)


# ── Polizei: Karomuster, Schrift, Blaulichter ───────────────────────────────
def karomuster(k, blau, gelb):
    """Zwei Reihen Quadrate an beiden Flanken, per Strahl auf die Karosserie gelegt."""
    bb = [k.matrix_world @ Vector(c) for c in k.bound_box]
    y0, y1 = min(v.y for v in bb), max(v.y for v in bb)
    z0, z1 = min(v.z for v in bb), max(v.z for v in bb)
    L, H = y1 - y0, z1 - z0
    reihen = [z0 + H * 0.30, z0 + H * 0.38, z0 + H * 0.46]   # zwei Reihen, Tuermitte bis Schweller
    feld = (reihen[1] - reihen[0])                               # Quadrate: Laenge = Reihenhoehe
    ya, yb = y0 + L * 0.2, y1 - L * 0.2
    n = max(4, int((yb - ya) / feld))
    me = bpy.data.meshes.new("Karomuster")
    bm = bmesh.new()
    mats = []
    for seite in (1, -1):
        for r in range(2):
            for i in range(n):
                ys = [ya + (yb - ya) * i / n, ya + (yb - ya) * (i + 1) / n]
                pts = []
                for yy, zz in ((ys[0], reihen[r]), (ys[1], reihen[r]), (ys[1], reihen[r + 1]), (ys[0], reihen[r + 1])):
                    loc, nor = strahl(k, Vector((seite * 3, yy, zz)), Vector((-seite, 0, 0)))
                    if loc is None:
                        break
                    pts.append(loc + Vector((seite * 0.006, 0, 0)))
                if len(pts) < 4:
                    continue
                vs = [bm.verts.new(p) for p in pts]
                if seite < 0:
                    vs.reverse()
                f = bm.faces.new(vs)
                f.material_index = (i + r) % 2
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("Karomuster", me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(blau)
    me.materials.append(gelb)
    return o


def schriftzug(k, text, farbe):
    """POLIZEI als 3D-Schrift auf beide Tueren — Schrift liest sich von aussen richtig."""
    bb = [k.matrix_world @ Vector(c) for c in k.bound_box]
    y0, y1 = min(v.y for v in bb), max(v.y for v in bb)
    z0, z1 = min(v.z for v in bb), max(v.z for v in bb)
    ym, zm = (y0 + y1) / 2 + (y1 - y0) * 0.02, z0 + (z1 - z0) * 0.555
    teile = []
    for seite in (1, -1):
        loc, nor = strahl(k, Vector((seite * 3, ym, zm)), Vector((-seite, 0, 0)))
        if loc is None:
            continue
        cu = bpy.data.curves.new("Schrift", "FONT")
        cu.body = text
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.size = (y1 - y0) * 0.068
        cu.extrude = 0.003
        ob = bpy.data.objects.new("Schrift", cu)
        bpy.context.scene.collection.objects.link(ob)
        # Die Flanke ist nicht senkrecht (sie kippt nach oben ein) — eine senkrecht
        # gestellte Schrift taucht oben in die Tuer ein (erster Render). Darum steht
        # die Schrift auf der NORMALE der Flanke: Schrift-z = Normale, Schrift-x =
        # Leserichtung von aussen (±y), Schrift-y = der Rest (zeigt nach oben).
        n = Vector((nor.x, 0, nor.z)).normalized() if abs(nor.x) > 0.2 else Vector((seite, 0, 0))
        xa = Vector((0, seite, 0))
        ya = n.cross(xa).normalized()
        if ya.z < 0:
            ya = -ya
        rot = Matrix((xa, ya, n)).transposed().to_4x4()
        ob.matrix_world = Matrix.Translation(loc + n * 0.012) @ rot
        waehle([ob])
        bpy.ops.object.convert(target="MESH")
        ob.data.materials.clear()
        ob.data.materials.append(farbe)
        teile.append(ob)
    return teile


def blaulichter(k, M):
    """Den Lichtbalken auf dem Dach in eigenes Netz trennen: links/rechts blau, Mitte weiss."""
    bb = [k.matrix_world @ Vector(c) for c in k.bound_box]
    ztop = max(v.z for v in bb)
    namen = [s.material.name if s.material else "" for s in k.material_slots]
    waehle([k])
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(k.data)
    for f in bm.faces:
        mn = namen[f.material_index] if f.material_index < len(namen) else ""
        f.select = (f.calc_center_median().z > ztop - 0.22) and mn in ("SdLichtHinten", "BlaulichtBlau", "Lichtbalken")
    bmesh.update_edit_mesh(k.data)
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    balken = [o for o in bpy.context.selected_objects if o != k][0]
    balken.name = "Blaulichtbalken"
    bl = pbr("BlaulichtL", (0.1, 0.25, 1.0), 0.0, 0.2, (0.15, 0.35, 1.0), 1.0)
    br = pbr("BlaulichtR", (0.1, 0.25, 1.0), 0.0, 0.2, (0.15, 0.35, 1.0), 1.0)
    weiss = M["balken"]
    balken.data.materials.clear()
    for m in (bl, br, weiss):
        balken.data.materials.append(m)
    for p in balken.data.polygons:
        c = balken.matrix_world @ p.center
        p.material_index = 0 if c.x > 0.1 else (1 if c.x < -0.1 else 2)
    return balken


# ── Ein Wagen ─────────────────────────────────────────────────────────────────
def baue(name, quelle, art, lack):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(QUELLE, quelle + ".blend"))
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            bpy.data.objects.remove(o)
    M = materialien(art, lack)
    if art == "polizei":
        M["blau"] = pbr("BlaulichtBlau", (0.1, 0.25, 1.0), 0.0, 0.2, (0.15, 0.35, 1.0), 1.0)
        M["balken"] = pbr("Lichtbalken", (0.95, 0.95, 0.95), 0.0, 0.3, (0.9, 0.9, 0.9), 0.4)
    objs = alle_meshes()
    anwenden(objs)
    # Materialien je Slot nach Rolle ersetzen
    for o in objs:
        koerper = not ("Wheel" in o.name)
        for s in o.material_slots:
            alt = s.material.name if s.material else "Black"
            r = rolle(alt, art)
            if art == "polizei" and koerper and r == "gummi":
                r = "lack"                         # US-Schwarz → Schweizer Weiss
            s.material = M.get(r) or M["zier"]
    # Raeder
    raeder = []
    for o in list(alle_meshes()):
        if o.name.endswith("_BackWheels"):
            raeder += trenne_hinterraeder(o)
        elif o.name.endswith("_FrontLeftWheel"):
            o.name = "Rad_VL"; raeder.append(o)
        elif o.name.endswith("_FrontRightWheel"):
            o.name = "Rad_VR"; raeder.append(o)
    koerper = bpy.data.objects[quelle]
    koerper.name = "Karosserie"
    extra = []
    if art == "polizei":
        # Balken zuerst: er sucht die Leuchten-Materialien oben auf dem Dach
        extra.append(blaulichter(koerper, M))
        blau = pbr("PolizeiBlau", (0.04, 0.12, 0.42), 0.2, 0.35)
        gelb = pbr("Leuchtgelb", (0.9, 0.86, 0.05), 0.0, 0.4, (0.35, 0.33, 0.0), 0.5)
        extra.append(karomuster(koerper, blau, gelb))
        extra += schriftzug(koerper, "POLIZEI", blau)
    alles = alle_meshes()
    # Front von -y (Quaternius) auf +x (Charge-37-Konvention), dann mittig und auf den Boden
    for o in alles:
        o.matrix_world = Matrix.Rotation(math.radians(90), 4, "Z") @ o.matrix_world
    anwenden(alles)
    pts = [o.matrix_world @ Vector(c) for o in alles for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    versatz = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
    for o in alles:
        o.location += versatz
    anwenden(alles)
    # Ursprung jedes Rades in seine Mitte (Drehachse)
    for r in raeder:
        waehle([r])
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    # Export
    waehle(alles)
    glb = os.path.join(OUT_GLB, "th50_" + name + ".glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True)
    stl = os.path.join(OUT_STL, "th50_" + name + ".stl")
    try:
        bpy.ops.wm.stl_export(filepath=stl, export_selected_objects=True)
    except Exception:
        bpy.ops.export_mesh.stl(filepath=stl, use_selection=True)
    L = mx - mn
    print("%-12s %5.2f x %4.2f x %4.2f m  Raeder %d  %6.0f kB" % (
        name, L.x, L.y, L.z, len(raeder), os.path.getsize(glb) / 1024))


if __name__ == "__main__":
    holen()
    for name, (quelle, art, lack) in WAGEN.items():
        baue(name, quelle, art, lack)
