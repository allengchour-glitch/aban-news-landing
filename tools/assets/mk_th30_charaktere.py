# -*- coding: utf-8 -*-
"""Asset-Charge 28 (th30_*): CHARAKTERE — runde, organische Figuren.
KEINE Quaderketten: alles aus Kapseln und Ellipsoiden, glatt schattiert.

Konventionen wie th5-th29:
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * Eingang liegt auf Blender +y  ->  in three.js -z (glTF dreht die Achsen).
  * Jede Oeffnung >= 3.0 m licht, Innenhoehe >= 4.0 m, ueberall ein Boden.
  * Aussensockel und Innenboden enden BEIDE auf `FB` -> keine Schwelle in der Tuer.
"""
import bpy, bmesh, os, math

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

def neu(): bpy.ops.wm.read_factory_settings(use_empty=True)

def nur(o):
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.3):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m

def box(x, y, z, sx, sy, sz, m=None):
    # size=1 liefert bereits Kantenlaenge 1 -> Skalierung = gewuenschtes Mass (NICHT /2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object; o.scale = (sx, sy, sz)
    if m: o.data.materials.append(m)
    return o

def zyl(x, y, z, r, h, m=None, seg=16, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=12, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def runden(width=0.02, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        m = o.modifiers.new("Bevel", 'BEVEL')
        d_min = max(1e-4, min(o.dimensions))
        m.width = min(width, 0.28 * d_min)
        m.segments = segments
        m.use_clamp_overlap = True
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(winkel)
        try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
        except Exception: pass

def export(name, bevel=0.02, seg=2):
    runden(bevel, seg)
    for o in bpy.context.scene.objects: o.select_set(True)
    p1 = os.path.join(OUT_GLB, name + ".glb")
    # export_apply=True ist PFLICHT — sonst landet der Bevel NICHT im GLB.
    bpy.ops.export_scene.gltf(filepath=p1, export_format='GLB', use_selection=False, export_apply=True)
    p2 = os.path.join(OUT_STL, name + ".stl")
    try: bpy.ops.wm.stl_export(filepath=p2)
    except Exception: bpy.ops.export_mesh.stl(filepath=p2)
    print("  ->", name, os.path.getsize(p1), "B")

# ---------------------------------------------------------------- Boden
FB = 0.30   # Fussboden-Oberkante — Aussensockel UND Innenboden enden hier.
            # JEDES Einrichtungsstueck bekommt sein z relativ dazu.
            # (Teuerster Fehler dieser Charge: Moebel auf z=0 gesetzt, waehrend der
            #  begehbare Boden hoeher lag — Stuehle steckten komplett im Boden.)

def boden(B, T, m_sockel, m_boden, rand=2.0):
    box(0, 0, FB/2, B + rand, T + rand, FB, m_sockel)     # Vorplatz
    box(0, 0, FB/2, B, T, FB, m_boden)                    # Innenboden, buendig

# ---------------------------------------------------------------- Wand-Helfer
def wand_mit_tuer(cx, cy, laenge, dicke, hoehe, m, tuer_b=2.4, tuer_h=3.2,
                  achse='x', tuer_off=0.0):
    """Wand mit durchgehender Tueroeffnung: links + rechts + Sturz (kein Boolean noetig)."""
    seite = (laenge - tuer_b) / 2
    if achse == 'x':
        if seite > 0.01:
            box(cx + tuer_off - tuer_b/2 - seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
            box(cx + tuer_off + tuer_b/2 + seite/2, cy, hoehe/2, seite, dicke, hoehe, m)
        box(cx + tuer_off, cy, tuer_h + (hoehe-tuer_h)/2, tuer_b, dicke, hoehe-tuer_h, m)
    else:
        if seite > 0.01:
            box(cx, cy + tuer_off - tuer_b/2 - seite/2, hoehe/2, dicke, seite, hoehe, m)
            box(cx, cy + tuer_off + tuer_b/2 + seite/2, hoehe/2, dicke, seite, hoehe, m)
        box(cx, cy + tuer_off, tuer_h + (hoehe-tuer_h)/2, dicke, tuer_b, hoehe-tuer_h, m)

def oeffnungs_achsen(laenge, n, off_b):
    """x-Mitten der n Oeffnungen und der n+1 Pfeiler — damit man Stuetzen und
    Einbauten NICHT versehentlich in einen Durchgang stellt."""
    pf = (laenge - n*off_b) / (n + 1)
    pfeiler = [-laenge/2 + pf/2 + i*(pf + off_b) for i in range(n + 1)]
    oeff = [-laenge/2 + pf + off_b/2 + i*(pf + off_b) for i in range(n)]
    return oeff, pfeiler

def wand_mit_oeffnungen(cx, cy, laenge, dicke, hoehe, m, n=3, off_b=3.0, off_h=3.4, achse='x'):
    """Wand mit n gleichmaessig verteilten Durchgaengen (Hallenportale)."""
    oeff, pfeiler = oeffnungs_achsen(laenge, n, off_b)
    pf = (laenge - n*off_b) / (n + 1)
    for t in pfeiler:
        if pf > 0.01:
            if achse == 'x': box(cx + t, cy, hoehe/2, pf, dicke, hoehe, m)
            else:            box(cx, cy + t, hoehe/2, dicke, pf, hoehe, m)
    for t in oeff:
        if achse == 'x': box(cx + t, cy, off_h + (hoehe-off_h)/2, off_b, dicke, hoehe-off_h, m)
        else:            box(cx, cy + t, off_h + (hoehe-off_h)/2, dicke, off_b, hoehe-off_h, m)

def fensterband(cx, cy, laenge, dicke, zmit, hoehe, m_rahm, m_glas, n=3, achse='x'):
    for i in range(n):
        t = (i + 0.5)/n - 0.5
        if achse == 'x':
            box(cx + t*laenge, cy, zmit, laenge/n*0.62, dicke*1.2, hoehe, m_rahm)
            box(cx + t*laenge, cy, zmit, laenge/n*0.50, dicke*1.4, hoehe*0.80, m_glas)
        else:
            box(cx, cy + t*laenge, zmit, dicke*1.2, laenge/n*0.62, hoehe, m_rahm)
            box(cx, cy + t*laenge, zmit, dicke*1.4, laenge/n*0.50, hoehe*0.80, m_glas)

def platte_mit_loch(cx, cy, z, B, T, dicke, lb, lt, m):
    """Geschossdecke mit rechteckigem Luftraum (Galerie/Atrium) — 4 Streifen."""
    sv = (T - lt)/2.0
    sh = (B - lb)/2.0
    if sv > 0.01:
        box(cx, cy - lt/2 - sv/2, z, B, sv, dicke, m)
        box(cx, cy + lt/2 + sv/2, z, B, sv, dicke, m)
    if sh > 0.01:
        box(cx - lb/2 - sh/2, cy, z, sh, lt, dicke, m)
        box(cx + lb/2 + sh/2, cy, z, sh, lt, dicke, m)

def tonne(cx, cy, z, r, laenge, m, seg=24):
    """HALBES Tonnengewoelbe: Zylinder mit Achse in x, untere Haelfte weggeschnitten.
    Basis liegt exakt bei z, sitzt also buendig auf der Mauerkrone. Ein voller Zylinder
    taugt nicht: seine untere Haelfte steckt im Gebaeude und verdeckt von innen alles."""
    o = zyl(cx, cy, z, r, laenge, m, seg, rot=(0, math.pi/2, 0))
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

# ---------------------------------------------------------------- Gelaender + Treppe
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x'):
    """Handlauf + Staebe. achse='x': laeuft in x bei y=fest."""
    L = abs(a1 - a0)
    if L < 0.05: return            # degenerierter Aufruf wuerde nur Muell erzeugen
    c = (a0 + a1) / 2
    n = max(2, int(L / 1.4))
    if achse == 'x':
        box(c, fest, z + hoehe, L, 0.09, 0.09, m)
        for i in range(n + 1):
            box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, 0.07, 0.07, hoehe, m)
    else:
        box(fest, c, z + hoehe, 0.09, L, 0.09, m)
        for i in range(n + 1):
            box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, 0.07, 0.07, hoehe, m)

def bruestung(cx, cy, lb, lt, z, m, hoehe=1.05):
    """Gelaender an ALLEN 4 Kanten eines Galerie-Lochs — sonst faellt man seitlich runter."""
    gelaender(cx-lb/2, cx+lb/2, cy-lt/2, z, m, hoehe, 'x')
    gelaender(cx-lb/2, cx+lb/2, cy+lt/2, z, m, hoehe, 'x')
    gelaender(cy-lt/2, cy+lt/2, cx-lb/2, z, m, hoehe, 'y')
    gelaender(cy-lt/2, cy+lt/2, cx+lb/2, z, m, hoehe, 'y')

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.28,
           richtung=-1):
    """Treppenlauf mit begehbarer Steigung (~0.17 m) und mitlaufendem Gelaender.
    Gibt (n, y_ende, lauflaenge) zurueck, damit der Anschluss nachgerechnet werden kann."""
    n = max(1, int(round(hoehe_ges / steig)))
    st = hoehe_ges / n
    for i in range(n):
        box(cx, y0 + richtung*(i + 0.5)*auftritt, z0 + (i + 0.5)*st,
            breite, auftritt, st, m)
    if m_gel:
        for sx in (cx - breite/2 - 0.09, cx + breite/2 + 0.09):
            for i in range(0, n, 4):
                box(sx, y0 + richtung*(i + 0.5)*auftritt,
                    z0 + (i + 0.5)*st + 0.55, 0.06, 0.06, 1.10, m_gel)
            # Handlauf: schlanke Segmente, um den Steigungswinkel GEDREHT. Ungedreht
            # muessten sie so hoch wie die Steigung sein und wirken als fetter Klotz.
            winkel = richtung * math.atan2(st, auftritt)
            laenge = math.hypot(auftritt, st) * 1.06
            for i in range(n):
                o = box(sx, y0 + richtung*(i + 0.5)*auftritt,
                        z0 + (i + 0.5)*st + 1.06, 0.07, laenge, 0.08, m_gel)
                o.rotation_euler[0] = winkel
    return n, y0 + richtung*n*auftritt, n*auftritt



# ---------------------------------------------------------------- Organik-Helfer
def glatt(o, winkel=62):
    """Organische Teile MUESSEN glatt schattiert werden. Der Standardwinkel von 38 Grad
    aus `runden()` laesst an Kapseln und Ellipsoiden die Facetten stehen — genau der
    Klotz-Eindruck, der hier vermieden werden soll."""
    nur(o)
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(winkel))
    except Exception:
        try: bpy.ops.object.shade_smooth()
        except Exception: pass
    return o

def ellipsoid(x, y, z, rx, ry, rz, m=None, seg=28):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(x, y, z),
                                         segments=seg, ring_count=max(10, seg//2))
    o = bpy.context.active_object
    o.scale = (rx, ry, rz)
    if m: o.data.materials.append(m)
    return glatt(o)

def kapsel(x0, y0, z0, x1, y1, z1, r, m=None, seg=22, r2=None):
    """Kapsel zwischen zwei Punkten: Zylinder plus zwei Halbkugeln, als EIN Objekt
    verschmolzen. Gliedmassen aus Quadern sehen aus wie Bauklotz-Figuren."""
    if r2 is None: r2 = r
    dx, dy, dz = x1-x0, y1-y0, z1-z0
    L = math.sqrt(dx*dx + dy*dy + dz*dz)
    mx, my, mz = (x0+x1)/2, (y0+y1)/2, (z0+z1)/2
    o = kegel(mx, my, mz, r, r2, L, m, seg)
    o.rotation_euler[1] = math.acos(max(-1.0, min(1.0, dz/max(L, 1e-6))))
    o.rotation_euler[2] = math.atan2(dy, dx) + math.pi/2
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for (px, py, pz, rr) in ((x0, y0, z0, r), (x1, y1, z1, r2)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=rr, location=(px, py, pz),
                                             segments=seg, ring_count=max(8, seg//2))
        k = bpy.context.active_object
        if m: k.data.materials.append(m)
        glatt(k)
    return glatt(o)

def figur(hoehe, HAUT, HAAR, OBEN, UNTEN, SCHUH, AKZ, weiblich=False, kind=False,
          helm=None, weste=None):
    """Eine Figur in leichter A-Pose, komplett aus Kapseln und Ellipsoiden.
    Alle Masse als Anteil der Gesamthoehe — damit stimmen Kind und Erwachsener."""
    H = hoehe
    kopf_r   = H*0.072
    hals_z   = H*0.855
    schult_z = H*0.820
    schult_b = H*0.108 if not weiblich else H*0.098
    hueft_z  = H*0.520
    hueft_b  = H*0.088 if not weiblich else H*0.098
    knie_z   = H*0.280
    knoech_z = H*0.045
    ell_z    = H*0.640
    hand_z   = H*0.455
    r_arm    = H*0.031 if not kind else H*0.036
    r_bein   = H*0.045 if not kind else H*0.050

    # --- Rumpf: Brustkorb und Becken als Ellipsoide, dazwischen die Taille
    ellipsoid(0, 0, H*0.735, schult_b*0.86, H*0.062, H*0.100, OBEN, 30)   # schmaler,
    #  der breite flache Ballen las sich als Platte statt als Brustkorb
    ellipsoid(0, 0, hueft_z + H*0.030, hueft_b*1.02, H*0.052, H*0.070, UNTEN, 30)
    kapsel(0, 0, hueft_z + H*0.050, 0, 0, H*0.700, H*0.062 if weiblich else H*0.068,
           OBEN, 26, H*0.070)
    ellipsoid(0, 0, schult_z, schult_b*1.02, H*0.052, H*0.040, OBEN, 30)
    # --- Hals und Kopf
    kapsel(0, 0, hals_z - H*0.030, 0, 0, hals_z + H*0.020, H*0.026, HAUT, 20)
    ellipsoid(0, 0, hals_z + kopf_r*0.92, kopf_r*0.86, kopf_r*0.92, kopf_r, HAUT, 32)
    # Gesicht auf +y — three.js dreht das auf -z, die Blickrichtung aller anderen Assets
    ellipsoid(0, kopf_r*0.62, hals_z + kopf_r*0.80, kopf_r*0.34, kopf_r*0.34,
              kopf_r*0.26, HAUT, 20)                       # Nasenpartie
    for sx in (-1, 1):                                      # Ohren, flach am Kopf
        ellipsoid(sx*kopf_r*0.80, -kopf_r*0.06, hals_z + kopf_r*0.90, kopf_r*0.09,
                  kopf_r*0.15, kopf_r*0.19, HAUT, 16)
    # Haare: flache Kalotte, hoeher angesetzt. Vorher war der Ballen fast so gross wie
    # der Kopf und sass so tief, dass er Stirn und halbes Gesicht verschluckt hat.
    ellipsoid(0, -kopf_r*0.12, hals_z + kopf_r*1.24, kopf_r*0.92, kopf_r*0.94,
              kopf_r*0.62, HAAR, 32)
    if weiblich:                                            # Langhaar NUR hinten
        ellipsoid(0, -kopf_r*0.62, hals_z + kopf_r*0.46, kopf_r*0.78, kopf_r*0.46,
                  kopf_r*1.00, HAAR, 28)
    for sx in (-1, 1):                                      # Augen + Braue
        ellipsoid(sx*kopf_r*0.33, kopf_r*0.76, hals_z + kopf_r*0.98,
                  kopf_r*0.13, kopf_r*0.09, kopf_r*0.15, AKZ, 16)
        ellipsoid(sx*kopf_r*0.34, kopf_r*0.72, hals_z + kopf_r*1.16,
                  kopf_r*0.17, kopf_r*0.07, kopf_r*0.05, HAAR, 14)
    # --- Arme in leichter A-Pose
    for sx in (-1, 1):
        sxb = sx*schult_b*0.94
        ellipsoid(sxb, 0, schult_z, H*0.036, H*0.036, H*0.034, OBEN, 24)   # Schulter
        kapsel(sxb, 0, schult_z - H*0.012,
               sx*(schult_b + H*0.030), 0, ell_z, r_arm, OBEN, 22, r_arm*0.90)
        kapsel(sx*(schult_b + H*0.030), 0, ell_z,
               sx*(schult_b + H*0.058), 0, hand_z, r_arm*0.88, HAUT, 22, r_arm*0.78)
        ellipsoid(sx*(schult_b + H*0.062), 0, hand_z - H*0.022,
                  H*0.026, H*0.017, H*0.032, HAUT, 20)                     # Hand
    # --- Beine
    for sx in (-1, 1):
        sxb = sx*hueft_b*0.52
        kapsel(sxb, 0, hueft_z, sxb, 0, knie_z, r_bein, UNTEN, 24, r_bein*0.82)
        kapsel(sxb, 0, knie_z, sxb, 0, knoech_z + H*0.012, r_bein*0.80, UNTEN, 24,
               r_bein*0.52)
        # Schuhmitte auf die halbe Schuhhoehe, sonst schwebt die Figur (gemessene 0,03)
        ellipsoid(sxb, H*0.020, H*0.030, H*0.038, H*0.062, H*0.030, SCHUH, 24)
    if weste:
        ellipsoid(0, 0, H*0.735, schult_b*1.04, H*0.064, H*0.088, weste, 30)
    if helm:
        ellipsoid(0, 0, hals_z + kopf_r*1.10, kopf_r*1.06, kopf_r*1.10, kopf_r*0.92,
                  helm, 30)
        ellipsoid(0, kopf_r*0.80, hals_z + kopf_r*0.98, kopf_r*0.90, kopf_r*0.40,
                  kopf_r*0.14, helm, 24)                   # Schirm

# ================================================================ 1) Mann
def mensch_mann():
    neu()
    HAUT = mat("Haut", (0.82,0.63,0.50), 0.62)
    HAAR = mat("Haar", (0.22,0.15,0.10), 0.80)
    OBEN = mat("Shirt", (0.24,0.42,0.62), 0.72)
    UNTEN= mat("Hose", (0.24,0.26,0.32), 0.80)
    SCHUH= mat("Schuh", (0.16,0.14,0.13), 0.60)
    AKZ  = mat("Auge", (0.14,0.12,0.11), 0.35)
    figur(1.80, HAUT, HAAR, OBEN, UNTEN, SCHUH, AKZ)
    export("th30_mensch_mann", 0.006, 2)

# ================================================================ 2) Frau
def mensch_frau():
    neu()
    HAUT = mat("Haut", (0.86,0.68,0.56), 0.62)
    HAAR = mat("Haar", (0.36,0.20,0.10), 0.78)
    OBEN = mat("Oberteil", (0.68,0.30,0.38), 0.72)
    UNTEN= mat("Hose", (0.28,0.30,0.38), 0.80)
    SCHUH= mat("Schuh", (0.20,0.16,0.16), 0.60)
    AKZ  = mat("Auge", (0.14,0.12,0.11), 0.35)
    figur(1.70, HAUT, HAAR, OBEN, UNTEN, SCHUH, AKZ, weiblich=True)
    export("th30_mensch_frau", 0.006, 2)

# ================================================================ 3) Kind
def kind():
    neu()
    HAUT = mat("Haut", (0.88,0.72,0.60), 0.62)
    HAAR = mat("Haar", (0.52,0.34,0.14), 0.78)
    OBEN = mat("Shirt", (0.92,0.72,0.22), 0.74)
    UNTEN= mat("Hose", (0.30,0.46,0.34), 0.80)
    SCHUH= mat("Schuh", (0.72,0.24,0.20), 0.60)
    AKZ  = mat("Auge", (0.14,0.12,0.11), 0.35)
    figur(1.24, HAUT, HAAR, OBEN, UNTEN, SCHUH, AKZ, kind=True)
    export("th30_kind", 0.005, 2)

# ================================================================ 4) Bauarbeiter
def arbeiter():
    neu()
    HAUT = mat("Haut", (0.80,0.60,0.46), 0.62)
    HAAR = mat("Haar", (0.18,0.13,0.09), 0.80)
    OBEN = mat("Arbeitshemd", (0.34,0.38,0.44), 0.78)
    UNTEN= mat("Arbeitshose", (0.30,0.28,0.24), 0.82)
    SCHUH= mat("Stiefel", (0.24,0.18,0.13), 0.60)
    AKZ  = mat("Auge", (0.14,0.12,0.11), 0.35)
    HELM = mat("Helm", (0.94,0.72,0.10), 0.35)
    WESTE= mat("Warnweste", (0.96,0.52,0.08), 0.70)
    figur(1.82, HAUT, HAAR, OBEN, UNTEN, SCHUH, AKZ, helm=HELM, weste=WESTE)
    export("th30_arbeiter", 0.006, 2)

# ================================================================ 5) Hund
def hund():
    neu()
    FELL = mat("Fell", (0.62,0.44,0.24), 0.82)
    FELL2= mat("FellHell", (0.86,0.76,0.58), 0.82)
    NASE = mat("Nase", (0.12,0.10,0.10), 0.40)
    AUGE = mat("Auge", (0.12,0.10,0.09), 0.35)
    L = 0.86                                     # Koerperlaenge, Kopf auf +y
    ellipsoid(0, 0, 0.40, 0.16, L*0.34, 0.155, FELL, 30)         # Rumpf, tiefer gelegt
    ellipsoid(0, L*0.30, 0.43, 0.14, 0.12, 0.135, FELL, 28)      # Brust
    kapsel(0, L*0.34, 0.47, 0, L*0.50, 0.55, 0.075, FELL, 22)    # Hals
    ellipsoid(0, L*0.56, 0.585, 0.095, 0.115, 0.10, FELL, 30)    # Kopf
    ellipsoid(0, L*0.72, 0.550, 0.055, 0.075, 0.055, FELL2, 26)  # Schnauze
    ellipsoid(0, L*0.80, 0.560, 0.030, 0.028, 0.026, NASE, 18)
    for sx in (-1, 1):
        ellipsoid(sx*0.062, L*0.60, 0.660, 0.030, 0.052, 0.062, FELL, 20)    # Ohr
        ellipsoid(sx*0.048, L*0.665, 0.603, 0.018, 0.012, 0.018, AUGE, 16)
        for (sy, zk) in ((L*0.24, 0.20), (-L*0.22, 0.20)):       # kurze, kraeftige Beine
            kapsel(sx*0.10, sy, 0.36, sx*0.10, sy, zk, 0.055, FELL, 20, 0.046)
            kapsel(sx*0.10, sy, zk, sx*0.10, sy + 0.015, 0.042, 0.044, FELL, 20, 0.038)
            ellipsoid(sx*0.10, sy + 0.030, 0.030, 0.048, 0.058, 0.030, FELL2, 20)
    kapsel(0, -L*0.34, 0.44, 0, -L*0.50, 0.56, 0.035, FELL, 18, 0.020)   # Rute
    export("th30_hund", 0.005, 2)

if __name__ == "__main__":
    print("Asset-Charge 28 (th30, Charaktere):")
    for fn in (mensch_mann, mensch_frau, kind, arbeiter, hund):
        fn()
    print("fertig")
