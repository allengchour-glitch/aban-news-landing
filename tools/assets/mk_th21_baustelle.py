# -*- coding: utf-8 -*-
"""Asset-Charge th21_*: BAUSTELLE.
Turmdrehkran, Geruest-Modul, Bauzaun-Modul, Kettenbagger, Radlader, Fahrmischer,
Baucontainer, Materialstapel, Sandhaufen, Betonrohre, begehbares Rohbau-Geschoss.
Familienfreundlich — Baumaschinen und Material, KEINE Waffen.

Konventionen wie th5-th20 (models/TH5-ASSETS.md, Abschnitt "Fallstricke"):
  * Ursprung mittig, Unterkante exakt z=0, Meter, PBR-Materialien.
  * Bevel + Auto-Smooth ueber `runden()` — KEINE harten Kanten.
  * `export_scene.gltf(..., export_apply=True)` ist PFLICHT, sonst fehlt der Bevel im GLB.
  * `primitive_cube_add(size=1)` -> Kantenlaenge 1, Skalierung = Mass (NICHT /2).
  * Schauseite (Front, Fahrerkabine, Auslegerspitze) liegt auf Blender +y -> three.js -z.
  * Raeder: `rot=(0, pi/2, 0)`. Zylinder, die aufstehen, brauchen GERADE Segmentzahl
    (22 Segmente haben unten eine Ecke -> das Rad schwebt 6 mm).
  * `kegel(vertices=4)` legt die ECKEN auf die Achsen — bei Modulmassen zwei Quader.
  * `rotation_euler[2] = pi` auf symmetrischen Quadern ist ein NO-OP -> Vorzeichen.
  * Metallic max 0.6, sonst rendert three.js ohne Environment-Map fast schwarz.
  * Dunkle Materialien rendern in three.js heller als in Blender -> nachdunkeln.
  * Deckungsgleiche Flaechen erzeugen z-Fighting -> mindestens 2 cm Versatz.
  * Gedrehte Quader: halbe Hoehe = (b*sin a + h*cos a)/2 — sonst taucht die Ecke
    unter z = 0 (Keile unter den Betonrohren, Schaltafeln im Rohbau).

Modul-Raster:
  th21_geruest_modul   x += 6.00   (Staenderraster 2.00, Riegel stossen bei +-3.00)
  th21_bauzaun_modul   x += 3.50   (Rahmen stossen bei +-1.75, Kupplung nur links)
  th21_baucontainer    z += 2.60   (Eckbeschlaege buendig, nichts ueber der Oberkante)
  th21_rohbau          z += 3.20   (Stuetze 0.00-2.96 + Decke 2.96-3.20)
"""
import bpy, bmesh, os, math
from mathutils import Vector

OUT_GLB = "/home/user/aban-news-landing/models"
OUT_STL = "/home/user/aban-news-landing/models/stl"
os.makedirs(OUT_STL, exist_ok=True)

TAU = math.tau

# ---------------------------------------------------------------- Grundhelfer
def neu():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Sicherheitsnetz: in einem Lauf lag danach trotzdem ein Default-Wuerfel (-1..1)
    # in der Szene und zog die Unterkante auf -1.00.
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

def nur(o):
    bpy.context.view_layer.objects.active = o
    for s_ in bpy.context.scene.objects: s_.select_set(False)
    o.select_set(True)

def mat(name, rgb, rough=0.7, metal=0.0, emit=None, estr=1.4, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], alpha)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = min(metal, 0.6)   # >0.6 rendert fast schwarz
    if "Alpha" in b.inputs: b.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        for attr, val in (("surface_render_method", 'BLENDED'), ("blend_method", 'BLEND')):
            try: setattr(m, attr, val)
            except Exception: pass
    if emit:
        b.inputs["Emission Color"].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs["Emission Strength"].default_value = estr
    return m

def leucht(name, rgb, estr=2.4):
    return mat(name, rgb, 0.25, 0.0, rgb, estr)

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

def kugel(x, y, z, r, m=None, seg=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=seg, ring_count=max(6, seg//2))
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def kegel(x, y, z, r1, r2, h, m=None, seg=14, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=(x,y,z), vertices=seg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def ring(x, y, z, r, rr, m=None, seg=16, rseg=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(location=(x,y,z), major_radius=r, minor_radius=rr,
                                     major_segments=seg, minor_segments=rseg, rotation=rot)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def rad(x, y, z, r, breite, m=None, seg=20):
    """Fahrzeugrad, Achse auf x (Fahrtrichtung y). GERADE Segmentzahl!"""
    return zyl(x, y, z, r, breite, m, seg, rot=(0, math.pi/2, 0))

def laufrad(x, y, z, r, breite, m=None, seg=14):
    """Rolle mit Achse in y (Fahrtrichtung x) — Laufkatze, Seilrolle."""
    return zyl(x, y, z, r, breite, m, seg, rot=(math.pi/2, 0, 0))

def halbkugel(x, y, z, r, m=None, seg=16, flach=1.0):
    """Echte Kuppel: untere Haelfte weggeschnitten, Basis exakt bei z."""
    o = kugel(x, y, z, r, m, seg)
    o.scale[2] = flach
    nur(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=(0,0,0), plane_no=(0,0,1), clear_inner=True)
    bmesh.ops.holes_fill(bm, edges=bm.edges[:])
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return o

def strebe(p0, p1, d, m=None):
    """Stab mit quadratischem Querschnitt zwischen zwei Punkten (Fachwerk, Seile)."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, d, d, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def balken(p0, p1, breite, hoehe, m=None):
    """Wie `strebe`, aber rechteckig: `breite` quer, `hoehe` senkrecht dazu."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = box(c.x, c.y, c.z, breite, hoehe, L, m)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def stab(p0, p1, r, m=None, seg=12):
    """Runder Stab (Hydraulik, Rohr, Seil) zwischen zwei Punkten."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = zyl(c.x, c.y, c.z, r, L, m, seg)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def konus(p0, p1, r0, r1, m=None, seg=16):
    """Kegelstumpf zwischen zwei Punkten (Mischtrommel). r0 liegt bei p0."""
    p0 = Vector(p0); p1 = Vector(p1); v = p1 - p0; L = v.length
    if L < 1e-4: return None
    c = (p0 + p1) / 2.0
    o = kegel(c.x, c.y, c.z, r0, r1, L, m, seg)
    o.rotation_euler = v.to_track_quat('Z', 'Y').to_euler()
    return o

def strebe_xz(x1, z1, x2, z2, y, breite_z, tiefe_y, m):
    L = math.hypot(x2-x1, z2-z1)
    o = box((x1+x2)/2, y, (z1+z2)/2, L, tiefe_y, breite_z, m)
    o.rotation_euler[1] = -math.atan2(z2-z1, x2-x1)
    return o

def strebe_yz(y1, z1, y2, z2, x, breite_z, tiefe_x, m):
    L = math.hypot(y2-y1, z2-z1)
    o = box(x, (y1+y2)/2, (z1+z2)/2, tiefe_x, L, breite_z, m)
    o.rotation_euler[0] = math.atan2(z2-z1, y2-y1)
    return o

def rohr(cx, cy, cz, ra, ri, L, m=None, seg=24, achse='y'):
    """ECHTES Rohr (Hohlzylinder) als eigenes Mesh: Aussenmantel, Innenmantel und
    zwei Kreisringe. Zwei ineinandergestellte Zylinder waeren massiv — man saehe
    kein Loch. cx/cy/cz = Mittelpunkt, `achse` = Rohrachse."""
    bm = bmesh.new()
    ao, ai, bo, bi = [], [], [], []
    for i in range(seg):
        a = i/seg*TAU
        co, si = math.cos(a), math.sin(a)
        ao.append(bm.verts.new((co*ra, si*ra, -L/2)))
        ai.append(bm.verts.new((co*ri, si*ri, -L/2)))
        bo.append(bm.verts.new((co*ra, si*ra,  L/2)))
        bi.append(bm.verts.new((co*ri, si*ri,  L/2)))
    for i in range(seg):
        j = (i+1) % seg
        bm.faces.new((ao[i], ao[j], bo[j], bo[i]))     # Aussenmantel
        bm.faces.new((ai[i], bi[i], bi[j], ai[j]))     # Innenmantel
        bm.faces.new((ao[j], ao[i], ai[i], ai[j]))     # Kreisring unten
        bm.faces.new((bo[i], bo[j], bi[j], bi[i]))     # Kreisring oben
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("Rohr"); bm.to_mesh(me); bm.free(); me.update()
    o = bpy.data.objects.new("Rohr", me); bpy.context.collection.objects.link(o)
    o.location = (cx, cy, cz)
    if achse == 'y': o.rotation_euler[0] = math.pi/2
    elif achse == 'x': o.rotation_euler[1] = math.pi/2
    if m: o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    return o

def runden(width=0.02, segments=2, winkel=42):
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nur(o)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        # Teile mit "nb" sind schon rund (Torus-Reifen) oder winzig — ein Bevel
        # kostet dort ~200 Dreiecke und bringt nichts.
        if o.get("nb"):
            try: bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
            except Exception: pass
            continue
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

# ---------------------------------------------------------- RUNDE KAROSSERIEN
# Eine Kette einzelner Quader liest sich als TREPPE — an Fahrzeugen faellt das am
# staerksten auf (dieselbe Lehre wie bei den Schiffsruempfen, `hull()` in
# mk_th15_hafen.py). `karosse()` loftet deshalb EIN Mesh aus verrundeten
# Rechteck-Querschnitten; alle Masse duerfen Zahl ODER Funktion von y sein, damit
# Front, Dach und Taille flie3end ineinander uebergehen.
def _f(v):
    return v if callable(v) else (lambda _y, _v=v: _v)

def rprofil(hb_u, hb_o, z0, z1, r_u, r_o, n=3):
    """EIN Querschnitt in der x-z-Ebene: unten 2*hb_u breit, oben 2*hb_o, z0..z1
    hoch, alle vier Ecken verrundet. Punktzahl ist immer 4*(n+1) — nur mit
    konstanter Punktzahl lassen sich beliebige Profile zu einem Mesh loften."""
    h = max(1e-3, z1 - z0)
    ru = max(0.0, min(r_u, hb_u*0.92, h*0.46))
    ro = max(0.0, min(r_o, hb_o*0.92, h*0.46))
    p = []
    for (cx, cz, rr, a0) in ((hb_u - ru, z0 + ru, ru, -math.pi/2),
                             (hb_o - ro, z1 - ro, ro, 0.0),
                             (-hb_o + ro, z1 - ro, ro, math.pi/2),
                             (-hb_u + ru, z0 + ru, ru, math.pi)):
        for k in range(n + 1):
            a = a0 + k*(math.pi/2)/n
            p.append((cx + math.cos(a)*rr, cz + math.sin(a)*rr))
    return p

def karosse(ys, hb, z0, z1, m, r_u=0.16, r_o=0.28, n=3, hb_o=None,
            kappen=(True, True), name="Karosserie"):
    """Karosserie/Aufbau als EIN geloftetes Mesh ueber die Stationen `ys`."""
    fhb = _f(hb); fho = _f(hb if hb_o is None else hb_o)
    fz0, fz1, fru, fro = _f(z0), _f(z1), _f(r_u), _f(r_o)
    verts, faces = [], []
    for y in ys:
        for (x, z) in rprofil(max(0.02, fhb(y)), max(0.02, fho(y)),
                              fz0(y), fz1(y), fru(y), fro(y), n):
            verts.append((x, y, z))
    P = 4*(n + 1)
    for i in range(len(ys) - 1):
        a, b = i*P, (i + 1)*P
        for k in range(P):
            k2 = (k + 1) % P
            faces.append((a + k, a + k2, b + k2, b + k))
    if kappen[0]: faces.append(tuple(range(P - 1, -1, -1)))                 # Heck (-y)
    if kappen[1]: faces.append(tuple(range((len(ys) - 1)*P, len(ys)*P)))    # Front (+y)
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def prisma_x(pts_yz, breite, m=None, x=0.0, name="Prisma"):
    """Gewoelbtes Bauteil (Loeffel, Schaufel, Kotfluegel): ein Polygonzug in der
    y-z-Ebene wird in x extrudiert. Drei gestufte Bodenbleche sind keine Schaufel —
    mit dem Profil bekommt sie eine echte Rundung."""
    t = breite/2.0
    n = len(pts_yz)
    v = [(x - t, p[0], p[1]) for p in pts_yz] + [(x + t, p[0], p[1]) for p in pts_yz]
    f = [tuple(range(n)), tuple(range(2*n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        f.append((i, n + i, n + j, j))
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if m: me.materials.append(m)
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free(); me.update()
    return o

def flach(o):
    """Bauteil vom globalen Bevel ausnehmen. Ein Torus-Reifen ist schon rund, und
    jedes gebevelte 5-cm-Kaestchen kostet ~200 Dreiecke."""
    if o is not None: o["nb"] = 1
    return o

def weich(o, w=0.055, seg=4, winkel=54):
    """DEUTLICH staerkerer Bevel fuer alles, was die Silhouette bestimmt
    (Stossstange, Dachkante, Kotfluegel, Leuchten)."""
    if o is None: return o
    md = o.modifiers.new("Weich", 'BEVEL')
    md.width = w; md.segments = seg; md.use_clamp_overlap = True
    md.limit_method = 'ANGLE'; md.angle_limit = math.radians(winkel)
    return o

def torus_x(x, y, z, R, r, m=None, mj=20, mn=8):
    """Ring mit Achse in x — Reifenprofil, Nabenring."""
    bpy.ops.mesh.primitive_torus_add(location=(x, y, z), rotation=(0, math.pi/2, 0),
                                     major_radius=R, minor_radius=r,
                                     major_segments=mj, minor_segments=mn)
    o = bpy.context.active_object
    if m: o.data.materials.append(m)
    return o

def radlauf(x, y, z, R, dicke, breite, m, n=9, spanne=None):
    """Radlauf als HALBER Bogen aus tangential gedrehten Kaestchen. Ein voller Torus
    taucht unter z = 0 — die Unterkante muss exakt 0,00 bleiben."""
    sp = spanne if spanne else math.pi
    ch = 2*R*math.sin(sp/(2*n))*1.15
    for i in range(n):
        a = math.pi/2 - sp/2 + sp*(i + 0.5)/n
        o = box(x, y + math.cos(a)*R, z + math.sin(a)*R, breite, ch, dicke, m)
        o.rotation_euler[0] = a - math.pi/2
        flach(o)

def rad_voll(x, y, z, r, breite, m_reif, m_felge, seg=24, speichen=5, sx=0,
             stollen=0, m_stoll=None):
    """Rad mit RUNDEM Reifenprofil (Torus statt Klotz-Zylinder), Felgenschuessel,
    Speichenloechern und Nabe. `seg` MUSS gerade sein: bei ungerader Zahl steht
    unten eine Ecke statt einer Kante und das Rad schwebt (teuer gelernt an th17).
    `sx` = -1/+1 bringt die Felgendetails nur auf die sichtbare Aussenseite."""
    if seg % 2: seg += 1
    rm = min(breite*0.5, r*0.34)
    rf = max(0.04, r - 2*rm)
    flach(torus_x(x, y, z, r - rm, rm, m_reif, seg, 8))                 # Lauf + Flanken
    flach(zyl(x, y, z, r - rm + 0.004, breite*0.55, m_reif, seg, rot=(0, math.pi/2, 0)))
    flach(zyl(x, y, z, rf*1.02, breite*0.80, m_felge, seg, rot=(0, math.pi/2, 0)))
    for s in ((sx,) if sx else (-1, 1)):
        xf = x + s*breite*0.44
        flach(zyl(xf, y, z, rf*0.99, breite*0.06, m_felge, seg, rot=(0, math.pi/2, 0)))
        for i in range(speichen):
            a = i/max(1, speichen)*math.tau + 0.35
            flach(zyl(xf + s*0.012, y + math.cos(a)*rf*0.56, z + math.sin(a)*rf*0.56,
                      rf*0.27, breite*0.05, m_reif, 10, rot=(0, math.pi/2, 0)))
        flach(zyl(xf + s*0.024, y, z, rf*0.32, breite*0.08, m_felge, 12,
                  rot=(0, math.pi/2, 0)))
    for i in range(stollen):                                            # Stollenprofil
        a = i/stollen*math.tau
        o = box(x, y + math.cos(a)*(r - rm*0.5), z + math.sin(a)*(r - rm*0.5),
                breite*0.94, r*0.19, rm*0.80, m_stoll or m_reif)
        o.rotation_euler[0] = a - math.pi/2
        flach(o)

def scheibe(p0, p1, breite, m, dicke=0.05, aus=0.035):
    """Schraege Scheibe zwischen zwei Punkten (Windschutz-, Heckscheibe), um `aus`
    nach AUSSEN versetzt — im Blech steckend waere sie unsichtbar (Fallstrick 3).
    Rotation um x: lokale z-Achse auf die Sehne, also atan2(-vy, vz)."""
    ax, ay, az = p0; bx, by, bz = p1
    vy, vz = by - ay, bz - az
    L = math.hypot(vy, vz)
    if L < 1e-5: return None
    ny, nz = -vz/L, vy/L
    if ny < 0: ny, nz = -ny, -nz
    o = box((ax + bx)/2, (ay + by)/2 + ny*aus, (az + bz)/2 + nz*aus,
            breite, dicke, L, m)
    o.rotation_euler[0] = math.atan2(-vy, vz)
    return o

# ---------------------------------------------------------------- Bau-Helfer
def gelaender(a0, a1, fest, z, m, hoehe=1.05, achse='x', d=0.07):
    L = abs(a1 - a0)
    if L < 0.05: return
    c = (a0 + a1) / 2
    n = max(2, int(L / 1.4))
    if achse == 'x':
        box(c, fest, z + hoehe, L, d+0.02, d+0.02, m)
        box(c, fest, z + hoehe*0.55, L, d*0.7, d*0.7, m)
        for i in range(n + 1):
            box(a0 + (a1-a0)*i/n, fest, z + hoehe/2, d, d, hoehe, m)
    else:
        box(fest, c, z + hoehe, d+0.02, L, d+0.02, m)
        box(fest, c, z + hoehe*0.55, d*0.7, L, d*0.7, m)
        for i in range(n + 1):
            box(fest, a0 + (a1-a0)*i/n, z + hoehe/2, d, d, hoehe, m)

def leiter(cx, cy, z0, z1, m, breite=0.52, sprosse=0.30, holm=0.06, achse='y'):
    """Senkrechte Leiter. achse='y': Holme in x versetzt, Leiter blickt nach +y."""
    h = z1 - z0
    for s in (-1, 1):
        if achse == 'y': box(cx + s*breite/2, cy, z0 + h/2, holm, holm*1.4, h, m)
        else:            box(cx, cy + s*breite/2, z0 + h/2, holm*1.4, holm, h, m)
    n = max(1, int(h / sprosse))
    for i in range(n):
        z = z0 + (i + 0.6)*h/n
        if achse == 'y': box(cx, cy, z, breite, holm*1.1, holm*0.8, m)
        else:            box(cx, cy, z, holm*1.1, breite, holm*0.8, m)

def treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel=None, steig=0.17, auftritt=0.28,
           richtung=-1):
    """Lauf mit begehbarer Steigung. n = round(Hoehe/Steigung) — RECHNEN, nicht raten."""
    n = max(1, int(round(hoehe_ges / steig)))
    st = hoehe_ges / n
    for i in range(n):
        box(cx, y0 + richtung*(i + 0.5)*auftritt, z0 + (i + 0.5)*st,
            breite, auftritt, st, m)
    if m_gel:
        winkel = richtung * math.atan2(st, auftritt)
        laenge = math.hypot(auftritt, st) * 1.06
        for sx in (cx - breite/2 - 0.08, cx + breite/2 + 0.08):
            for i in range(0, n, 3):
                box(sx, y0 + richtung*(i + 0.5)*auftritt,
                    z0 + (i + 0.5)*st + 0.52, 0.05, 0.05, 1.04, m_gel)
            for i in range(n):
                o = box(sx, y0 + richtung*(i + 0.5)*auftritt,
                        z0 + (i + 0.5)*st + 1.02, 0.06, laenge, 0.07, m_gel)
                o.rotation_euler[0] = winkel
    return n, y0 + richtung*n*auftritt, n*auftritt

def wand_mit_oeffnungen(cx, cy, laenge, dicke, hoehe, m, n=2, off_b=2.2, off_h=1.70,
                        achse='x', bruestung=0.90):
    """Wand mit n gleichmaessig verteilten Fenstern (Bruestung + Sturz)."""
    pf = (laenge - n*off_b) / (n + 1)
    pfeiler = [-laenge/2 + pf/2 + i*(pf + off_b) for i in range(n + 1)]
    oeff    = [-laenge/2 + pf + off_b/2 + i*(pf + off_b) for i in range(n)]
    for t in pfeiler:
        if pf > 0.01:
            if achse == 'x': box(cx + t, cy, hoehe/2, pf, dicke, hoehe, m)
            else:            box(cx, cy + t, hoehe/2, dicke, pf, hoehe, m)
    for t in oeff:
        ot = bruestung + off_h
        if hoehe - ot > 0.01:
            if achse == 'x': box(cx + t, cy, ot + (hoehe-ot)/2, off_b, dicke, hoehe-ot, m)
            else:            box(cx, cy + t, ot + (hoehe-ot)/2, dicke, off_b, hoehe-ot, m)
        if bruestung > 0.01:
            if achse == 'x': box(cx + t, cy, bruestung/2, off_b, dicke, bruestung, m)
            else:            box(cx, cy + t, bruestung/2, dicke, off_b, bruestung, m)
    return oeff, pfeiler

FUGE_V, FUGE_D = 0.015, 0.020    # Versatz vor der Wand, Banddicke -> steht 2.5 cm vor

def fugen(cx, cy, z0, z1, laenge, dicke, m, achse='x', schicht=0.50):
    """Moertelfugen als duenne Baender VOR der Wand — nicht koplanar (z-Fighting),
    aber flach genug, dass die Wand nicht wie eine Bretterschalung wirkt."""
    n = max(1, int((z1 - z0) / schicht))
    for i in range(1, n):
        z = z0 + i*schicht
        if achse == 'x':
            for sy in (-1, 1):
                box(cx, cy + sy*(dicke/2 + FUGE_V), z, laenge*0.99, FUGE_D, 0.030, m)
        else:
            for sx in (-1, 1):
                box(cx + sx*(dicke/2 + FUGE_V), cy, z, FUGE_D, laenge*0.99, 0.030, m)

def palette(cx, cy, cz, m, b=1.20, t=0.80, h=0.145):
    """Europalette: 3 Kufen laengs y, Bodenbretter, 5 Deckbretter. cz = Unterkante."""
    for sx in (-1, 0, 1):
        box(cx + sx*(b/2 - 0.05), cy, cz + h*0.45, 0.10, t, h*0.62, m)
    for i in range(3):
        box(cx + (i-1)*(b/2 - 0.05), cy, cz + h*0.07, 0.10, t, h*0.14, m)
    for i in range(5):
        box(cx, cy - t/2 + t*(i + 0.5)/5, cz + h - 0.011, b, t/5*0.78, 0.022, m)

def kette(cx, cy, r, L, breite, m_kette, m_rad, n_pad=26, seg=24, ph=0.11):
    """Raupenkette als Stadion-Umlauf: 2 Umlenkraeder, Laufrollen, Kettenglieder.
    Die Glieder liegen AUSSEN auf der Laufbahn: Laufbahn-Unterkante = ph, Gliedmitte
    = ph - ph/2, Aussenflaeche exakt 0. Die Radmitte sitzt deshalb auf r + ph (nicht
    auf r — sonst schwebt die ganze Raupe um ph). Gerade Segmentzahl, sonst steht das
    Umlenkrad auf einer Ecke."""
    a = L/2 - r
    zc = r + ph                                                    # Radmitte
    zb = ph                                                        # Laufbahn unten
    for sy in (-a, a):
        rad(cx, cy + sy, zc, r*0.94, breite*0.84, m_rad, seg)
        rad(cx, cy + sy, zc, r*0.42, breite*0.94, m_kette, 12)
    box(cx, cy, zc, breite*0.70, 2*a, r*1.10, m_rad)               # Kettenrahmen
    for i in range(5):                                             # Laufrollen
        rad(cx, cy - a*0.86 + i*a*0.43, zb + r*0.40, r*0.40, breite*0.92, m_kette, 12)
    P = 4*a + TAU*r
    pl = P/n_pad*0.86
    # Auf dem Bogen ist das Glied eine SEHNE: seine Ecke liegt weiter aussen als die
    # Bahn. Ohne diese Korrektur tauchte die vorderste Kettenecke 2.4 cm unter z = 0.
    korr = math.hypot(r + ph, pl/2) - (r + ph)
    for i in range(n_pad):
        s = P*i/n_pad
        bogen = True
        if s < 2*a:                                                # Untertrum
            py, pz, ang, bogen = -a + s, 0.0, 0.0, False
        elif s < 2*a + math.pi*r:                                  # Bogen vorn (+y)
            t = (s - 2*a)/r
            py, pz, ang = a + math.sin(t)*r, r - math.cos(t)*r, t
        elif s < 4*a + math.pi*r:                                  # Obertrum
            py, pz, ang, bogen = a - (s - 2*a - math.pi*r), 2*r, math.pi, False
        else:                                                      # Bogen hinten
            t = (s - 4*a - math.pi*r)/r
            py, pz, ang = -a - math.sin(t)*r, r + math.cos(t)*r, math.pi + t
        off = ph/2 - (korr if bogen else 0.0)
        nz, ny = -math.cos(ang), math.sin(ang)                     # Aussennormale
        o = box(cx, cy + py + ny*off, zb + pz + nz*off, breite, pl, ph, m_kette)
        o.rotation_euler[0] = ang
        if abs(ang - math.pi) < 0.01:     # Stollenrippe NUR auf dem Obertrum: unten
            o = box(cx, cy + py + ny*(off + ph*0.42),      # zeigt die Aussenseite nach
                    zb + pz + nz*(off + ph*0.42),          # UNTEN — die Rippe stand
                    breite*0.32, pl*0.40, ph*0.6, m_kette) # 2.4 cm unter z = 0
            o.rotation_euler[0] = ang

def loeffel(cx, cy, cz, breite, m, m_zahn, tiefe=0.88, hoehe=1.16, zaehne=5, sy=1):
    """Tiefloeffel: Rueckwand bei cy, gewoelbter Boden, zwei Wangen, Zaehne.
    sy=+1 -> Zaehne auf +y, sy=-1 -> eingerollt zur Maschine hin (Parkstellung).
    Gespiegelt wird ueber das VORZEICHEN der Offsets, nie ueber rotation_euler[2].
    cz = Unterkante der Schneide."""
    box(cx, cy, cz + hoehe/2 + 0.10, breite, 0.10, hoehe, m)                 # Rueckwand
    for k in range(3):
        t = k/2.0
        box(cx, cy + sy*(0.10 + tiefe*(k + 0.5)/3), cz + 0.06 + (1-t)*0.22,
            breite, tiefe/3*1.06, 0.10, m)                                   # Boden
    for s in (-1, 1):
        box(cx + s*(breite/2 - 0.03), cy + sy*(0.10 + tiefe/2), cz + hoehe*0.42,
            0.06, tiefe + 0.10, hoehe*0.84, m)                               # Wangen
    box(cx, cy + sy*(0.10 + tiefe), cz + 0.10, breite, 0.14, 0.16, m)        # Schneide
    for i in range(zaehne):
        px = cx - breite*0.38 + breite*0.76*i/(zaehne - 1)
        kegel(px, cy + sy*(0.10 + tiefe + 0.16), cz + 0.10, 0.07, 0.02, 0.26, m_zahn, 8,
              rot=(-sy*math.pi/2, 0, 0))    # -pi/2 legt die Spitze auf +y

def gitterstoss(z0, z1, hb, d, m, diag=0.09, dr=1):
    """Ein Turmschuss: 4 Eckstiele, Horizontalriegel oben, je Seite eine Diagonale."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*hb, sy*hb, (z0+z1)/2, d, d, z1-z0, m)
    for sy in (-1, 1): box(0, sy*hb, z1, 2*hb, d*0.72, d*0.72, m)
    for sx in (-1, 1): box(sx*hb, 0, z1, d*0.72, 2*hb, d*0.72, m)
    for sy in (-1, 1):
        strebe((-hb*dr, sy*hb, z0), (hb*dr, sy*hb, z1), diag, m)
    for sx in (-1, 1):
        strebe((sx*hb, -hb*dr, z0), (sx*hb, hb*dr, z1), diag, m)

# ================================================================ 1) Turmdrehkran
def turmdrehkran():
    """Turmdrehkran ~34 m: Kreuzfundament mit Ballast, 10 Gitterstoesse, Drehkranz,
    Turmspitze, 24-m-Ausleger, Gegenausleger mit Ballast, Laufkatze, Haken, Kabine."""
    neu()
    GELB = mat("KranGelb", (0.88,0.66,0.09), 0.55)
    GEL2 = mat("KranGelb dunkel", (0.70,0.51,0.07), 0.62)
    STAH = mat("Kranstahl", (0.56,0.58,0.61), 0.42, 0.5)
    DKL  = mat("Stahl dunkel", (0.22,0.24,0.27), 0.62, 0.3)
    BET  = mat("Fundamentbeton", (0.58,0.57,0.54), 0.94)
    BAL  = mat("Ballastblock", (0.50,0.49,0.47), 0.95)
    GLAS = mat("Kabinenglas", (0.40,0.56,0.66), 0.14, 0.2)
    ROT  = leucht("Warnlicht", (1.0,0.24,0.18), 2.6)
    HB, D = 0.85, 0.17                    # halbe Turmbreite, Eckstiel
    Z0, NS, HS = 0.55, 10, 2.68           # Turmfuss, Anzahl Stoesse, Stosshoehe
    ZT = Z0 + NS*HS                       # Turmkopf = 27.35
    # --- Kreuzfundament mit vier Ballastbloecken
    box(0, 0, Z0/2, 5.20, 1.70, Z0, BET)
    box(0, 0, Z0/2, 1.70, 5.20, Z0, BET)
    for (px, py) in ((1.95, 0), (-1.95, 0), (0, 1.95), (0, -1.95)):
        box(px, py, Z0 + 0.35, 1.40 if px else 1.60, 1.60 if px else 1.40, 0.70, BAL)
    box(0, 0, Z0 + 0.22, 2.30, 2.30, 0.44, DKL)
    # --- Turm
    for i in range(NS):
        gitterstoss(Z0 + i*HS, Z0 + (i+1)*HS, HB, D, GELB, 0.09, 1 if i % 2 == 0 else -1)
    for sy in (-1, 1): box(0, sy*HB, Z0, 2*HB, D*0.72, D*0.72, GELB)
    for sx in (-1, 1): box(sx*HB, 0, Z0, D*0.72, 2*HB, D*0.72, GELB)
    leiter(0, 0.30, Z0 + 0.40, ZT - 0.30, STAH, 0.50, 0.32, 0.055, 'y')
    for i in range(4):                                            # Ruhepodeste
        box(0, 0, Z0 + 2.4 + i*6.7, 1.30, 1.30, 0.06, STAH)
    # --- Drehkranz und Drehbuehne
    zyl(0, 0, ZT + 0.22, 1.05, 0.44, STAH, 24)
    zyl(0, 0, ZT + 0.50, 1.18, 0.16, DKL, 24)
    box(0, 0, ZT + 0.88, 2.40, 2.80, 0.60, GELB)
    ZD = ZT + 1.18                                                # 28.53
    # --- Turmspitze (Pylon)
    ZP = 33.60
    for sx in (-1, 1):
        for sy in (-1, 1):
            strebe((sx*0.62, sy*0.72, ZD), (0, 0, ZP), 0.13, GELB)
    for k in range(3):
        zz = ZD + (ZP - ZD)*(k + 1)/4.0
        f = 1 - (k + 1)/4.0
        for sy in (-1, 1): box(0, sy*0.72*f, zz, 1.24*f, 0.09, 0.09, GELB)
        for sx in (-1, 1): box(sx*0.62*f, 0, zz, 0.09, 1.44*f, 0.09, GELB)
    kugel(0, 0, ZP + 0.22, 0.20, ROT, 10)
    # --- Ausleger 24 m nach +y, Dreiecksquerschnitt
    YA0, YA1 = -0.70, 23.30
    ZOB, ZUN = ZD + 1.20, ZD + 0.16
    for sx in (-1, 1):
        box(sx*0.52, (YA0+YA1)/2, ZOB, 0.13, YA1-YA0, 0.13, GELB)
    box(0, (YA0+YA1)/2, ZUN, 0.13, YA1-YA0, 0.13, GELB)
    nf = 12
    for i in range(nf):
        y0 = YA0 + (YA1-YA0)*i/nf
        y1 = YA0 + (YA1-YA0)*(i+1)/nf
        for sx in (-1, 1):
            strebe((sx*0.52, y0, ZOB), (0, y1, ZUN), 0.075, GELB)
            strebe((sx*0.52, y1, ZOB), (0, y0, ZUN), 0.075, GELB)
        box(0, y1, ZOB, 1.04, 0.08, 0.08, GELB)
    box(0, YA1 + 0.20, ZOB - 0.52, 1.10, 0.40, 1.30, GELB)        # Auslegerkopf
    laufrad(0, YA1 + 0.30, ZOB - 0.10, 0.24, 0.16, STAH, 14)
    kugel(0, YA1 + 0.34, ZOB + 0.34, 0.16, ROT, 10)
    # --- Gegenausleger 8.4 m nach -y
    YG = -9.10
    for sx in (-1, 1):
        box(sx*0.68, (YG - 0.70)/2, ZD + 0.30, 0.15, -YG - 0.70, 0.15, GELB)
        box(sx*0.68, (YG - 0.70)/2, ZD + 1.10, 0.15, -YG - 0.70, 0.15, GELB)
        for i in range(6):
            y0, y1 = -0.70 - i*1.40, -0.70 - (i+1)*1.40
            strebe((sx*0.68, y0, ZD + 0.30), (sx*0.68, y1, ZD + 1.10), 0.08, GELB)
    for i in range(5):
        box(0, -1.40 - i*1.55, ZD + 0.30, 1.36, 0.10, 0.10, GELB)
    box(0, -5.20, ZD + 1.22, 1.36, 7.80, 0.08, STAH)              # Laufsteg 29.75
    # Ballast haengt IM Endrahmen (Oberkante 29.70) — sonst schneidet die Abspannung
    for i in range(3):
        box(0, -7.05 - i*0.54, ZD + 0.37, 2.30, 0.48, 1.60, BAL)
    box(0, -2.90, ZD + 1.98, 1.90, 2.60, 1.40, GEL2)              # Maschinenhaus
    box(0, -2.90, ZD + 2.72, 2.05, 2.75, 0.12, DKL)
    zyl(0, -1.52, ZD + 1.80, 0.48, 0.90, DKL, 16, rot=(0, math.pi/2, 0))
    for sy in (-0.72, 0.72):
        gelaender(-6.60, -4.40, sy, ZD + 1.26, STAH, 0.98, 'y', 0.05)
    # --- Abspannungen
    for sx in (-1, 1):
        strebe((0, 0, ZP - 0.20), (sx*0.52, 8.40, ZOB), 0.065, STAH)
        strebe((sx*0.52, 8.40, ZOB), (sx*0.52, 20.60, ZOB), 0.065, STAH)
        strebe((0, 0, ZP - 0.20), (sx*0.68, -8.60, ZD + 1.10), 0.065, STAH)
    # --- Laufkatze mit Haken
    YK = 12.60
    box(0, YK, ZUN - 0.28, 1.00, 1.30, 0.30, GEL2)
    for sy in (-0.44, 0.44):
        for sx in (-0.34, 0.34):
            laufrad(sx, YK + sy, ZUN - 0.09, 0.13, 0.10, DKL, 12)
    ZH = 4.90
    for sx in (-0.16, 0.16):
        zyl(sx, YK, (ZH + ZUN - 0.34)/2, 0.028, ZUN - 0.34 - ZH, STAH, 8)
    box(0, YK, ZH - 0.34, 0.46, 0.34, 0.68, DKL)                  # Hakenflasche
    laufrad(0, YK, ZH - 0.14, 0.18, 0.30, STAH, 14)
    box(0, YK, ZH + 0.06, 0.54, 0.42, 0.10, GEL2)
    zyl(0, YK, 4.30, 0.07, 0.42, STAH, 10)
    pts = [(0, YK + math.cos(math.radians(95 - i*29))*0.30,
            3.86 + math.sin(math.radians(95 - i*29))*0.30) for i in range(11)]
    for i in range(len(pts) - 1):
        strebe(pts[i], pts[i+1], 0.095, STAH)                     # Hakenbogen
    # --- Fuehrerkabine am Turmkopf
    KX, KY, KZ = 1.62, 1.30, ZT + 0.60
    box(KX, KY, KZ + 0.95, 1.40, 1.80, 1.90, GELB)
    box(KX, KY, KZ + 1.96, 1.55, 1.95, 0.12, GEL2)
    box(KX, KY + 0.92, KZ + 1.00, 1.20, 0.08, 1.50, GLAS)
    box(KX + 0.72, KY, KZ + 1.00, 0.08, 1.55, 1.50, GLAS)
    box(KX - 0.72, KY, KZ + 1.10, 0.08, 1.55, 1.30, GLAS)
    box(KX, KY, KZ + 0.02, 1.60, 1.95, 0.10, DKL)
    strebe((KX - 0.75, KY - 0.70, KZ + 0.02), (HB, 0.60, ZT + 0.10), 0.10, STAH)
    strebe((KX - 0.75, KY + 0.70, KZ + 0.02), (HB, 0.60, ZT + 0.30), 0.10, STAH)
    box(KX + 0.52, KY, KZ + 0.02, 1.05, 1.95, 0.06, STAH)
    gelaender(KY - 0.95, KY + 0.95, KX + 1.02, KZ + 0.02, STAH, 1.00, 'y', 0.05)
    export("th21_turmdrehkran", 0.012, 1)

# ================================================================ 2) Geruest-Modul
def geruest_modul():
    """Fassadengeruest, exakt 6.00 m breit und 8.00 m hoch, reihbar mit x += 6.00.
    Staender NUR bei -2.952 / -0.952 / +1.048 — der rechte Staender gehoert zum
    Nachbarmodul, sonst stuenden an jeder Fuge zwei Rohre nebeneinander. Riegel und
    Belaege spannen exakt -3.00 .. +3.00 und stossen stumpf. Alles, was am Randstaender
    sitzt (Fussplatte, Kupplung), ist in x auf 0.096 begrenzt, damit das Modul nicht
    breiter als 6.00 wird."""
    neu()
    STAH = mat("Geruestrohr", (0.62,0.64,0.67), 0.38, 0.5)
    STA2 = mat("Rohr dunkel", (0.44,0.46,0.49), 0.45, 0.45)
    HOLZ = mat("Geruestbohle", (0.62,0.48,0.28), 0.85)
    HOL2 = mat("Bohle dunkel", (0.50,0.37,0.20), 0.88)
    ALU  = mat("Belagrahmen", (0.72,0.73,0.75), 0.35, 0.5)
    BLAU = mat("Kupplung", (0.24,0.34,0.52), 0.5, 0.3)
    L, H = 6.00, 8.00
    YV, YH = 0.58, -0.58
    XP = (-2.952, -0.952, 1.048)
    LAGEN = (2.00, 4.00, 6.00)
    NIV = LAGEN + (7.95,)
    XL = -2.00                                     # Achse von Leiter und Durchstieg
    for px in XP:
        for py in (YV, YH):
            zyl(px, py, H/2, 0.048, H, STAH, 12)                    # Staender
            box(px, py, 0.025, 0.096, 0.22, 0.05, STA2)             # Fussplatte
            zyl(px, py, 0.13, 0.030, 0.22, STA2, 10)                # Spindel
            for z in NIV:
                box(px, py, z - 0.09, 0.094, 0.16, 0.15, BLAU)      # Kupplung
    for z in LAGEN:
        for py in (YV, YH):
            zyl(0, py, z - 0.16, 0.036, L, STAH, 10, rot=(0, math.pi/2, 0))   # Laengsriegel
            zyl(0, py, z + 0.50, 0.036, L, STAH, 10, rot=(0, math.pi/2, 0))   # Zwischenholm
            zyl(0, py, z + 1.00, 0.036, L, STAH, 10, rot=(0, math.pi/2, 0))   # Handlauf
        for px in XP:
            zyl(px, 0, z - 0.086, 0.036, 2*YV, STAH, 10, rot=(math.pi/2, 0, 0))
    for py in (YV, YH):
        zyl(0, py, 7.95, 0.038, L, STAH, 10, rot=(0, math.pi/2, 0))
    for px in XP:
        zyl(px, 0, 7.95, 0.038, 2*YV, STAH, 10, rot=(math.pi/2, 0, 0))
    # --- Belaege: 4 Bohlen je Lage, exakt 6.00 lang; zwei davon mit Durchstiegsluke
    for z in LAGEN:
        for k in range(4):
            py = -0.51 + k*0.34
            if k < 2:                                   # Luke bei x = -2.60 .. -1.40
                for (x0, x1) in ((-3.00, -2.60), (-1.40, 3.00)):
                    box((x0+x1)/2, py, z - 0.025, x1-x0, 0.32, 0.05, HOLZ if k % 2 == 0 else HOL2)
                    box((x0+x1)/2, py, z - 0.065, x1-x0, 0.34, 0.03, ALU)
            else:
                box(0, py, z - 0.025, L, 0.32, 0.05, HOLZ if k % 2 == 0 else HOL2)
                box(0, py, z - 0.065, L, 0.34, 0.03, ALU)
        box(0, YV + 0.02, z + 0.075, L, 0.03, 0.15, HOL2)           # Bordbrett
        box(0, YH - 0.02, z + 0.075, L, 0.03, 0.15, HOL2)
    # --- Diagonalen in der Aussenebene, in jedem Modul gleich gerichtet
    stab((-2.952, YV + 0.09, 0.14), (1.048, YV + 0.09, NIV[0] - 0.16), 0.030, STA2, 8)
    for k in range(1, len(NIV)):
        stab((-2.952, YV + 0.09, NIV[k-1] - 0.16), (1.048, YV + 0.09, NIV[k] - 0.16),
             0.030, STA2, 8)
    # --- Aufstieg: Leitern durch die Luke, Lagen 0->2->4->6
    for k, z0 in enumerate((0.02,) + LAGEN[:-1]):
        leiter(XL, -0.34, z0, LAGEN[k] - 0.03, STA2, 0.44, 0.30, 0.045, 'y')
    export("th21_geruest_modul", 0.012, 1)

# ================================================================ 3) Bauzaun-Modul
def bauzaun_modul():
    """Bauzaun-Gitterelement mit Betonfuessen, exakt 3.50 m breit, reihbar x += 3.50.
    Die waagrechten Rahmenrohre spannen -1.75 .. +1.75 und bestimmen das Mass; die
    Kupplung sitzt NUR am linken Stoss, sonst haette jede Fuge zwei Klemmen."""
    neu()
    VERZ = mat("Verzinkt", (0.68,0.70,0.72), 0.36, 0.5)
    VER2 = mat("Draht", (0.58,0.60,0.63), 0.42, 0.45)
    BET  = mat("Betonfuss", (0.46,0.45,0.43), 0.95)
    BET2 = mat("Beton hell", (0.55,0.54,0.51), 0.93)
    ORA  = mat("Kupplung", (0.80,0.42,0.08), 0.55)
    L, ZU, ZO = 3.50, 0.10, 2.10
    RX = L/2 - 0.02
    for sx in (-1, 1):
        zyl(sx*RX, 0, (ZU + ZO)/2, 0.020, ZO - ZU, VERZ, 10)
    for z in (ZU + 0.02, ZO - 0.02):
        zyl(0, 0, z, 0.020, L, VERZ, 10, rot=(0, math.pi/2, 0))
    zyl(0, 0, 1.10, 0.017, L, VERZ, 10, rot=(0, math.pi/2, 0))
    for i in range(23):                                            # Gittermatte
        box(-1.68 + i*0.153, 0.012, (ZU + ZO)/2 + 0.01, 0.017, 0.017, ZO - ZU - 0.09, VER2)
    for k in range(7):
        box(0, -0.012, ZU + 0.18 + k*0.295, L - 0.09, 0.017, 0.017, VER2)
    for sx in (-1.16, 1.16):                                       # Betonfuesse
        box(sx, 0, 0.065, 0.30, 0.78, 0.13, BET)
        box(sx, 0, 0.115, 0.24, 0.60, 0.05, BET2)
        for sy in (-0.30, 0.30):
            box(sx, sy, 0.135, 0.13, 0.10, 0.03, BET2)
        zyl(sx, 0, 0.20, 0.032, 0.30, VERZ, 10)
        box(sx, 0, 0.34, 0.10, 0.10, 0.06, VERZ)
    for z in (0.45, 1.75):                                         # Kupplung, nur links
        box(-L/2 + 0.06, 0, z, 0.11, 0.13, 0.16, ORA)
        zyl(-L/2 + 0.06, 0.09, z, 0.022, 0.10, VERZ, 8, rot=(math.pi/2, 0, 0))
    export("th21_bauzaun_modul", 0.010, 1)

# ================================================================ 4) Bagger
def bagger():
    """Kettenbagger: 2 Raupen, Drehkranz, Oberwagen mit Kabine und Kontergewicht,
    zweiteiliger Ausleger mit Hydraulik und Tieffloeffel. Front (Ausleger) auf +y."""
    neu()
    GELB = mat("Baggergelb", (0.87,0.63,0.07), 0.52)
    GEL2 = mat("Gelb dunkel", (0.68,0.48,0.06), 0.6)
    DKL  = mat("Fahrwerk", (0.20,0.21,0.23), 0.7, 0.25)
    KETT = mat("Kettenglied", (0.28,0.29,0.31), 0.6, 0.35)
    STAH = mat("Hydraulikstahl", (0.60,0.62,0.65), 0.30, 0.55)
    CHR  = mat("Kolbenstange", (0.74,0.75,0.77), 0.22, 0.6)
    GLAS = mat("Kabinenglas", (0.38,0.54,0.64), 0.14, 0.2)
    SCHW = mat("Schwarz", (0.13,0.13,0.14), 0.75)
    ROT  = leucht("Rundumleuchte", (1.0,0.55,0.10), 2.2)
    RK, LK, BK, GX = 0.44, 4.30, 0.60, 1.22
    for s in (-1, 1):
        kette(s*GX, 0.0, RK, LK, BK, KETT, DKL, 26, 24)
    box(0, 0, 0.76, 2*GX - 0.30, 3.10, 0.34, DKL)                 # Unterwagen
    box(0, 0, 0.98, 1.60, 2.40, 0.24, GEL2)
    zyl(0, 0, 1.14, 0.92, 0.26, STAH, 24)                         # Drehkranz
    ZO = 1.27
    box(0, -0.25, ZO + 0.13, 2.60, 4.10, 0.26, GEL2)              # Drehbuehne
    box(0, -2.42, ZO + 0.62, 2.66, 0.72, 1.24, DKL)               # Kontergewicht
    def _tb(y, mitte=-1.45, flanke=0.72):
        return max(0.0, abs(y - mitte) - flanke)
    karosse([-2.52, -2.30, -1.90, -1.45, -1.00, -0.62, -0.40],
            lambda y: 1.20 - 0.20*_tb(y)**1.3,
            ZO + 0.13,
            lambda y: ZO + 1.51 - 0.13*_tb(y)**1.5,
            GELB, r_u=0.12, r_o=0.34, n=3,
            hb_o=lambda y: 1.04 - 0.20*_tb(y)**1.3, name="Motorhaube")
    for i in range(6):
        box(1.22, -1.45, ZO + 0.50 + i*0.16, 0.06, 1.60, 0.08, SCHW)
    box(0, -0.30, ZO + 0.70, 2.30, 0.30, 1.10, GEL2)
    zyl(-0.72, -2.10, ZO + 1.85, 0.08, 0.90, SCHW, 10)            # Auspuff
    zyl(-0.72, -2.10, ZO + 2.34, 0.10, 0.12, STAH, 10)
    KX, KY = -0.80, 0.72                                          # Kabine
    def _tk(y, mitte=KY, flanke=0.62):
        return max(0.0, abs(y - mitte) - flanke)
    karosse([KY-0.96, KY-0.78, KY-0.30, KY+0.30, KY+0.78, KY+0.96],
            lambda y: 0.60 - 0.13*_tk(y)**1.3,
            ZO + 0.13,
            lambda y: ZO + 2.10 - 0.12*_tk(y)**1.5,
            GELB, r_u=0.10, r_o=0.30, n=3,
            hb_o=lambda y: 0.52 - 0.13*_tk(y)**1.3, name="Kabine")
    box(KX, KY, ZO + 2.16, 1.30, 2.00, 0.10, GEL2)
    box(KX, KY + 0.96, ZO + 1.14, 1.00, 0.07, 1.62, GLAS)
    box(KX - 0.62, KY, ZO + 1.14, 0.07, 1.62, 1.50, GLAS)
    box(KX + 0.62, KY - 0.30, ZO + 1.20, 0.07, 1.00, 1.40, GLAS)
    box(KX, KY - 0.97, ZO + 1.20, 1.00, 0.07, 1.40, GLAS)
    box(KX, KY + 0.30, ZO + 0.42, 0.60, 0.60, 0.30, SCHW)         # Sitz
    box(KX, KY + 0.05, ZO + 0.72, 0.60, 0.14, 0.50, SCHW)
    box(KX, KY, ZO + 2.24, 0.26, 0.30, 0.12, ROT)
    for k in range(3):
        box(KX - 0.68, KY - 0.60 - k*0.03, ZO - 0.34 + k*0.30, 0.44, 0.34, 0.06, STAH)
    box(0.90, 0.90, ZO + 0.29, 0.90, 1.60, 0.06, STAH)            # Laufsteg
    gelaender(0.10, 1.70, 1.34, ZO + 0.29, STAH, 0.95, 'y', 0.05)
    # --- Ausleger, Stiel, Loeffel
    P0 = (0.55, 1.35, ZO + 0.55)
    P1 = (0.55, 2.55, ZO + 2.90)
    P2 = (0.55, 4.30, ZO + 3.05)
    P3 = (0.55, 4.86, ZO + 0.30)
    balken(P0, P1, 0.52, 0.68, GELB)
    balken(P1, P2, 0.52, 0.62, GELB)
    balken(P2, P3, 0.38, 0.50, GEL2)
    for p in (P0, P1, P2, P3):
        zyl(p[0], p[1], p[2], 0.17, 0.66, STAH, 14, rot=(0, math.pi/2, 0))
    for s in (-1, 1):                                             # Hubzylinder
        a = (0.55 + s*0.42, 1.55, ZO + 0.34); b = (0.55 + s*0.42, 2.32, ZO + 2.06)
        mid = tuple(a[i] + (b[i]-a[i])*0.55 for i in range(3))
        stab(a, mid, 0.11, STAH, 12); stab(mid, b, 0.065, CHR, 10)
        stab((0.55 + s*0.22, 1.60, ZO + 0.92), (0.55 + s*0.22, 2.60, ZO + 2.96),
             0.035, SCHW, 8)                                      # Hydraulikleitung
    a = (0.55, 2.72, ZO + 3.24); b = (0.55, 4.32, ZO + 3.42)      # Stielzylinder
    mid = tuple(a[i] + (b[i]-a[i])*0.6 for i in range(3))
    stab(a, mid, 0.12, STAH, 12); stab(mid, b, 0.07, CHR, 10)
    a = (0.55, 4.30, ZO + 2.68); b = (0.55, 4.74, ZO + 0.86)      # Loeffelzylinder
    mid = tuple(a[i] + (b[i]-a[i])*0.62 for i in range(3))
    stab(a, mid, 0.10, STAH, 12); stab(mid, b, 0.06, CHR, 10)
    strebe((0.55, 4.74, ZO + 0.86), (0.55, 5.02, ZO + 0.34), 0.10, STAH)
    # Loeffel EINGEROLLT (sy=-1): die Zaehne zeigen zur Maschine. Nach aussen gedreht
    # sah der Bagger aus, als wolle er von sich weg schaufeln.
    loeffel(0.55, 5.25, 0.06, 1.10, GEL2, CHR, 0.88, 1.16, 5, -1)
    strebe((0.55, 4.86, ZO + 0.30), (0.55, 5.25, 1.30), 0.16, GEL2)
    export("th21_bagger", 0.014, 2)

# ================================================================ 5) Radlader
def radlader():
    """Radlader mit Knicklenkung: Hinterwagen mit Motor und Kabine, Knickgelenk mit
    Lenkzylindern, Vorderwagen mit Hubarm und Schaufel. Schaufel (Front) auf +y."""
    neu()
    GELB = mat("Ladergelb", (0.88,0.65,0.08), 0.52)
    GEL2 = mat("Gelb dunkel", (0.68,0.48,0.06), 0.6)
    DKL  = mat("Rahmen", (0.22,0.23,0.25), 0.68, 0.25)
    REIF = mat("Reifen", (0.09,0.09,0.10), 0.9)
    FELG = mat("Felge", (0.72,0.70,0.16), 0.5)
    STAH = mat("Stahl", (0.58,0.60,0.63), 0.32, 0.55)
    CHR  = mat("Kolbenstange", (0.76,0.77,0.79), 0.2, 0.6)
    GLAS = mat("Kabinenglas", (0.38,0.54,0.64), 0.14, 0.2)
    SCHW = mat("Kunststoff", (0.14,0.14,0.15), 0.75)
    LICHT= leucht("Arbeitsscheinwerfer", (1.0,0.94,0.72), 2.0)
    ROT  = leucht("Rundumleuchte", (1.0,0.52,0.10), 2.2)
    RR, BR, GX = 0.72, 0.48, 1.02
    for sx in (-1, 1):
        for sy in (-1.42, 1.42):
            rad(sx*GX, sy, RR, RR, BR, REIF, 24)
            rad(sx*GX, sy, RR, RR*0.46, BR + 0.04, FELG, 14)
            zyl(sx*GX, sy, RR, 0.13, BR + 0.14, STAH, 10, rot=(0, math.pi/2, 0))
            for i in range(12):                       # Stollen bilden den Aussenradius
                o = box(sx*GX, sy + math.cos(i/12*TAU)*(RR - 0.05),
                        RR + math.sin(i/12*TAU)*(RR - 0.05), BR, 0.19, 0.10, REIF)
                o.rotation_euler[0] = i/12*TAU - math.pi/2
    box(0, -1.45, 0.78, 1.70, 2.90, 0.42, DKL)                    # Hinterwagen
    # Motorhaube als EIN geloftetes Mesh statt zweier Quader — die Silhouette ist
    # das, woran man einen Klotz erkennt.
    def _t(y, mitte=-2.05, flanke=0.62):
        return max(0.0, abs(y - mitte) - flanke)
    karosse([-3.02, -2.82, -2.50, -2.05, -1.60, -1.28, -1.10],
            lambda y: 1.03 - 0.16*_t(y)**1.3,
            0.97,
            lambda y: 1.87 - 0.10*_t(y)**1.5,
            GELB, r_u=0.12, r_o=0.30, n=3,
            hb_o=lambda y: 0.90 - 0.16*_t(y)**1.3, name="Haube")
    box(0, -2.98, 1.38, 2.10, 0.34, 0.94, GEL2)
    box(0, -3.14, 0.86, 2.16, 0.24, 0.50, DKL)                    # Kontergewicht
    for i in range(6):
        box(0, -3.24, 1.10 + i*0.16, 1.60, 0.06, 0.08, SCHW)
    zyl(0.70, -1.20, 2.20, 0.075, 0.70, SCHW, 10)
    zyl(0.70, -1.20, 2.58, 0.095, 0.12, STAH, 10)
    for sx in (-1, 1):
        for sy in (-1.42, 1.42):                                  # Kotfluegel
            box(sx*GX, sy, 1.32, BR + 0.20, 1.70, 0.10, GEL2)
            box(sx*(GX + BR/2 + 0.08), sy, 1.18, 0.06, 1.70, 0.30, GEL2)
    box(0, -0.62, 1.10, 1.72, 1.66, 0.22, DKL)                    # Kabine
    for sx in (-0.78, 0.78):
        for sy in (-1.38, 0.14):
            box(sx, sy, 1.95, 0.10, 0.10, 1.48, GEL2)
    # Kabinendach geloftet: der flache Deckel war das, was die Zelle als Kiste zeigte
    def _tc(y, mitte=-0.62, flanke=0.62):
        return max(0.0, abs(y - mitte) - flanke)
    karosse([-1.55, -1.34, -0.90, -0.62, -0.34, 0.10, 0.31],
            lambda y: 0.95 - 0.22*_tc(y)**1.25,
            2.62,
            lambda y: 2.92 - 0.14*_tc(y)**1.4,
            GELB, r_u=0.10, r_o=0.26, n=3,
            hb_o=lambda y: 0.80 - 0.22*_tc(y)**1.25, name="Kabinendach")
    box(0, 0.18, 1.98, 1.56, 0.07, 1.42, GLAS)
    box(0, -1.42, 1.98, 1.56, 0.07, 1.42, GLAS)
    for sx in (-0.82, 0.82):
        box(sx, -0.62, 1.98, 0.07, 1.50, 1.36, GLAS)
    box(0, -0.90, 1.45, 0.58, 0.56, 0.28, SCHW)                   # Sitz
    box(0, -1.16, 1.80, 0.58, 0.14, 0.52, SCHW)
    box(0, -0.28, 1.52, 0.09, 0.09, 0.56, SCHW)
    o = zyl(0, -0.20, 1.84, 0.20, 0.05, SCHW, 14); o.rotation_euler[0] = math.radians(64)
    box(0.62, -0.62, 2.90, 0.24, 0.28, 0.14, ROT)
    for sx in (-0.66, 0.66):
        box(sx, -0.60, 2.84, 0.24, 0.10, 0.14, LICHT)
    for sx in (-1, 1):                                            # Aufstieg
        # Die Stufen brauchen eine Wange bis zum Rahmen — frei stehend sahen sie
        # aus wie drei in der Luft schwebende Bleche.
        box(sx*0.86, -0.62, 0.76, 0.05, 0.44, 1.06, STAH)
        for k in range(3):
            box(sx*0.94, -0.62 - k*0.03, 0.42 + k*0.32, 0.34, 0.32, 0.06, STAH)
        box(sx*0.90, -0.80, 1.40, 0.06, 0.06, 1.40, STAH)
    box(0, 0.30, 0.92, 1.10, 0.70, 0.70, DKL)                     # Knickgelenk
    for z in (0.62, 1.28):
        box(0, 0.30, z, 1.30, 0.90, 0.14, STAH)
    zyl(0, 0.30, 0.95, 0.13, 0.90, CHR, 12)
    for s in (-1, 1):
        stab((s*0.62, -0.20, 1.06), (s*0.30, 0.66, 1.06), 0.09, STAH, 10)
    box(0, 1.55, 0.86, 1.60, 2.10, 0.46, DKL)                     # Vorderwagen
    box(0, 1.42, 1.28, 1.30, 1.40, 0.42, GEL2)
    for s in (-1, 1):                                             # Hubarm, abgesenkt
        A0 = (s*0.62, 0.72, 1.42); A1 = (s*0.62, 2.52, 0.92)
        balken(A0, A1, 0.16, 0.34, GELB)
        zyl(A0[0], A0[1], A0[2], 0.11, 0.24, STAH, 12, rot=(0, math.pi/2, 0))
        zyl(A1[0], A1[1], A1[2], 0.10, 0.24, STAH, 12, rot=(0, math.pi/2, 0))
        a = (s*0.46, 0.86, 0.98); b = (s*0.60, 2.00, 1.12)
        mid = tuple(a[i] + (b[i]-a[i])*0.55 for i in range(3))
        stab(a, mid, 0.10, STAH, 10); stab(mid, b, 0.06, CHR, 10)
    box(0, 1.30, 1.62, 1.24, 0.24, 0.20, GEL2)
    a = (0, 0.86, 1.66); b = (0, 2.06, 1.50)                      # Kippzylinder
    mid = tuple(a[i] + (b[i]-a[i])*0.58 for i in range(3))
    stab(a, mid, 0.11, STAH, 12); stab(mid, b, 0.07, CHR, 10)
    strebe((0, 2.06, 1.50), (0, 2.60, 1.34), 0.14, STAH)
    # --- Schaufel als extrudiertes Profil statt gestufter Bleche: Rueckwand zur
    # Maschine (-y), Boden nach vorn (+y) durchgezogen, Schneide vorn unten.
    SY, SZ = 3.62, 0.30
    prof = [(-0.10, 1.62), (-0.10, 0.10), (0.24, 0.02), (0.86, 0.00),
            (1.44, 0.10), (1.52, 0.26), (1.10, 0.30), (0.52, 0.36),
            (0.16, 0.62), (0.10, 1.30), (0.16, 1.66)]
    o = prisma_x([(SY + p[0], SZ + p[1]) for p in prof], 2.36, GELB, 0.0, "Schaufel")
    for sx in (-1.10, 1.10):                                      # Seitenwangen
        box(sx, SY + 0.62, SZ + 0.82, 0.10, 1.66, 1.62, GEL2)
    for k in range(6):                                            # Zaehne an der Schneide
        box(-0.98 + k*0.39, SY + 1.56, SZ + 0.22, 0.24, 0.34, 0.12, STAH)
    export("th21_radlader", 0.014, 2)

# ================================================================ 6) Betonmischer
def betonmischer():
    """Fahrmischer: 3-achsiger LKW mit Tandem-Zwillingsraedern, geneigte Mischtrommel
    mit Spiralrippen, Einfuelltrichter, abgeklappte Rutsche, Aufstieg. Kabine auf +y."""
    neu()
    ROT  = mat("Fahrerhaus", (0.72,0.16,0.12), 0.5)
    ROT2 = mat("Rot dunkel", (0.54,0.11,0.09), 0.58)
    WEIS = mat("Trommelweiss", (0.84,0.84,0.82), 0.55)
    GRAU = mat("Trommelband", (0.58,0.58,0.58), 0.6)
    RAHM = mat("Rahmen", (0.26,0.27,0.29), 0.65, 0.25)
    STAH = mat("Stahl", (0.58,0.60,0.63), 0.34, 0.55)
    REIF = mat("Reifen", (0.09,0.09,0.10), 0.9)
    FELG = mat("Felge", (0.62,0.63,0.65), 0.4, 0.5)
    GLAS = mat("Scheibe", (0.38,0.54,0.64), 0.14, 0.2)
    SCHW = mat("Kunststoff", (0.14,0.14,0.15), 0.75)
    LICHT= leucht("Scheinwerfer", (1.0,0.94,0.74), 2.0)
    ORA  = leucht("Warnleuchte", (1.0,0.52,0.10), 2.2)
    BET  = mat("Restbeton", (0.56,0.55,0.52), 0.95)
    RR, BRE = 0.52, 0.32
    for sx in (-1, 1):
        rad(sx*1.06, 3.05, RR, RR, BRE, REIF, 24)                 # Vorderachse
        rad(sx*1.06, 3.05, RR, RR*0.5, BRE + 0.04, FELG, 14)
        for sy in (-1.85, -3.25):                                 # Tandem, Zwillingsbereifung
            for k in (-0.15, 0.15):
                rad(sx*(1.06 + k), sy, RR, RR, BRE*0.92, REIF, 24)
            rad(sx*1.10, sy, RR, RR*0.5, BRE*1.2, FELG, 14)
    box(0, 3.05, 0.52, 2.10, 0.22, 0.20, RAHM)
    for sy in (-1.85, -3.25):
        box(0, sy, 0.52, 2.10, 0.26, 0.26, RAHM)
    for sx in (-1, 1):                                            # Leiterrahmen
        box(sx*0.42, -0.30, 0.98, 0.16, 8.10, 0.34, RAHM)
    for i in range(7):
        box(0, -3.60 + i*1.20, 0.98, 0.90, 0.14, 0.26, RAHM)
    box(0, 3.90, 0.86, 2.30, 0.30, 0.26, RAHM)
    def _tm(y, mitte=2.95, flanke=0.72):
        return max(0.0, abs(y - mitte) - flanke)
    karosse([1.98, 2.20, 2.60, 2.95, 3.30, 3.70, 3.92],
            lambda y: 1.21 - 0.20*_tm(y)**1.3,
            1.03,
            lambda y: 3.09 - 0.16*_tm(y)**1.45,
            ROT, r_u=0.14, r_o=0.34, n=3,
            hb_o=lambda y: 1.06 - 0.20*_tm(y)**1.3, name="Fahrerhaus")
    box(0, 2.95, 3.06, 2.30, 1.86, 0.10, ROT2)
    box(0, 3.90, 2.28, 2.06, 0.09, 1.06, GLAS)
    for sx in (-1.19, 1.19):
        box(sx, 2.86, 2.24, 0.09, 1.30, 0.96, GLAS)
        box(sx*1.04, 3.62, 2.62, 0.10, 0.34, 0.44, SCHW)
        box(sx*1.20, 3.62, 2.62, 0.24, 0.10, 0.40, SCHW)
        box(sx*0.82, 3.96, 1.44, 0.40, 0.10, 0.24, LICHT)
        box(sx*0.62, 3.02, 1.02, 0.34, 0.30, 0.06, STAH)
        box(sx*0.62, 3.02, 1.38, 0.34, 0.30, 0.06, STAH)
    box(0, 3.94, 1.90, 2.30, 0.10, 0.60, ROT2)
    for i in range(4):
        box(0, 4.00, 1.72 + i*0.14, 1.90, 0.05, 0.06, SCHW)
    box(0, 2.95, 3.14, 1.00, 0.34, 0.12, ORA)
    box(0, 2.02, 1.62, 2.30, 0.12, 1.10, ROT2)
    box(0, -0.60, 1.22, 1.90, 5.40, 0.26, RAHM)                   # Hilfsrahmen
    box(0, 1.62, 1.86, 1.60, 0.60, 1.10, RAHM)                    # Lagerboecke
    box(0, -3.30, 1.62, 1.70, 0.70, 0.60, RAHM)
    # --- Trommel, Achse um 15 Grad geneigt (vorn tief, hinten hoch)
    RD = 1.18
    a = math.radians(15)
    AX0 = Vector((0, 1.90, 1.95))
    d = Vector((0, -math.cos(a), math.sin(a)))
    P = lambda t: tuple(AX0 + d*t)
    konus(P(0.05), P(1.35), 0.50, RD, WEIS, 24)
    konus(P(1.35), P(3.35), RD, RD, WEIS, 24)
    konus(P(3.35), P(4.55), RD, 0.80, WEIS, 24)
    konus(P(4.55), P(5.00), 0.80, 0.56, GRAU, 24)
    for k in range(5):                                            # Spiralrippen
        t = 1.30 + k*0.68
        rw = RD if t <= 3.35 else RD - (t - 3.35)/1.20*0.38
        c = P(t)
        o = ring(c[0], c[1], c[2], rw + 0.04, 0.055, GRAU, 24, 6)
        o.rotation_euler[0] = math.pi/2 - a
    box(0, 1.72, 2.60, 1.10, 0.44, 0.56, GRAU)                    # Antriebsgetriebe
    zyl(0, 1.52, 2.60, 0.32, 0.30, STAH, 16, rot=(math.pi/2, 0, 0))
    HT = P(5.00)                                                  # Einfuelltrichter
    konus((HT[0], HT[1] + 0.12, HT[2] + 0.82), (HT[0], HT[1] + 0.04, HT[2] + 0.12),
          0.60, 0.32, GRAU, 16)
    box(0, HT[1] + 0.12, HT[2] + 0.96, 1.26, 1.06, 0.12, GRAU)
    box(0, -3.95, 1.30, 2.10, 0.24, 1.40, RAHM)                   # Heckrahmen
    box(0, -4.06, 0.62, 2.20, 0.20, 0.36, RAHM)
    for sx in (-0.80, 0.80):
        box(sx, -4.12, 1.10, 0.34, 0.12, 0.24, ORA)
    ZR0, ZR1 = (0, -4.06, 2.28), (0, -5.30, 1.34)                 # Rutsche
    balken(ZR0, ZR1, 0.52, 0.06, STAH)
    for s in (-1, 1):
        balken((s*0.26, ZR0[1], ZR0[2] + 0.02), (s*0.26, ZR1[1], ZR1[2] + 0.02),
               0.05, 0.24, STAH)
    zyl(0, -3.98, 2.38, 0.16, 0.70, GRAU, 14, rot=(0, math.pi/2, 0))
    # Restbeton liegt am BODEN unter dem Auslauf — auf 1.20 schwebte der Klumpen
    box(0, -5.48, 0.05, 0.70, 0.50, 0.10, BET)
    halbkugel(0.18, -5.60, 0.0, 0.16, BET, 10, 0.55)   # Kugel haette -0.08 ergeben
    leiter(0.92, -3.86, 0.62, 3.00, STAH, 0.44, 0.30, 0.05, 'y')  # Aufstieg bis fast
    box(0.92, -4.02, 0.52, 0.60, 0.24, 0.05, STAH)                # zum Trittblech
    box(0.92, -3.55, 3.06, 0.90, 0.80, 0.06, STAH)
    gelaender(-3.95, -3.15, 1.40, 3.08, STAH, 0.95, 'y', 0.05)
    zyl(-1.06, 0.90, 1.62, 0.36, 1.20, GRAU, 16, rot=(0, math.pi/2, 0))   # Wassertank
    zyl(-1.06, 0.90, 1.62, 0.10, 1.30, STAH, 10, rot=(0, math.pi/2, 0))
    for sx in (-1, 1):
        for sy in (-1.85, -3.25):
            box(sx*1.16, sy, 1.32, 0.62, 0.90, 0.10, RAHM)
        box(sx*1.16, 3.05, 1.34, 0.56, 1.30, 0.10, ROT2)
    box(-1.20, -0.50, 1.30, 0.20, 1.20, 0.50, STAH)               # Werkzeugkasten
    export("th21_betonmischer", 0.014, 2)

# ================================================================ 7) Baucontainer
def baucontainer():
    """Buerocontainer 6.06 x 2.44 x 2.60 — stapelbar mit z += 2.60: die Eckbeschlaege
    sitzen buendig, NICHTS ragt ueber 2.60 hinaus. Tuer und Fenster auf +y, davor ein
    Podest mit zwei Stufen (Bodenniveau 0.30 = Oberkante Bodenwanne)."""
    neu()
    WEIS = mat("Containerblech", (0.80,0.80,0.78), 0.6)
    WEI2 = mat("Blech dunkel", (0.66,0.66,0.64), 0.65)
    BLAU = mat("Rahmenprofil", (0.20,0.32,0.48), 0.55, 0.25)
    ECK  = mat("Eckbeschlag", (0.30,0.31,0.33), 0.55, 0.4)
    # Tuer und Glas bewusst dunkler als in Blender gewuenscht — three.js rendert die
    # Flaechen ohne Tone-Mapping deutlich heller; mit 0.30/0.42/0.58 war die Tuer weiss.
    TUER = mat("Tuerblatt", (0.16,0.26,0.42), 0.55)
    RAHM = mat("Fensterrahmen", (0.66,0.66,0.64), 0.5)
    GLAS = mat("Fensterglas", (0.24,0.38,0.50), 0.13, 0.2)
    STAH = mat("Stahl", (0.58,0.60,0.63), 0.35, 0.5)
    DACH = mat("Dachblech", (0.62,0.62,0.60), 0.7)
    SCHW = mat("Dichtung", (0.16,0.16,0.17), 0.8)
    L, B, H = 6.06, 2.44, 2.60
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(sx*(B/2 - 0.06), sy*(L/2 - 0.06), H/2, 0.12, 0.12, H, BLAU)
            for zz in (0.13, H - 0.13):
                box(sx*(B/2 - 0.10), sy*(L/2 - 0.14), zz, 0.20, 0.28, 0.24, ECK)
    for sy in (-1, 1):
        box(0, sy*(L/2 - 0.06), 0.13, B, 0.12, 0.26, BLAU)
        box(0, sy*(L/2 - 0.06), H - 0.13, B, 0.12, 0.26, BLAU)
    for sx in (-1, 1):
        box(sx*(B/2 - 0.06), 0, 0.13, 0.12, L, 0.26, BLAU)
        box(sx*(B/2 - 0.06), 0, H - 0.13, 0.12, L, 0.26, BLAU)
    for sx in (-1, 1):                                             # Wandpanele
        box(sx*(B/2 - 0.10), 0, H/2, 0.08, L - 0.16, H - 0.34, WEIS)
        for i in range(11):
            box(sx*(B/2 - 0.055), -L/2 + 0.45 + i*0.52, H/2, 0.03, 0.10, H - 0.40, WEI2)
    for sy in (-1, 1):
        box(0, sy*(L/2 - 0.10), H/2, B - 0.20, 0.08, H - 0.34, WEIS)
        for i in range(5):
            box(-1.00 + i*0.50, sy*(L/2 - 0.055), H/2, 0.10, 0.03, H - 0.40, WEI2)
    box(0, 0, 0.05, B - 0.20, L - 0.20, 0.10, ECK)                 # Bodenwanne
    box(0, 0, 0.26, B - 0.24, L - 0.24, 0.08, WEI2)                # Fussboden 0.30
    box(0, 0, H - 0.05, B - 0.06, L - 0.06, 0.10, DACH)            # Dach, Oberkante 2.60
    box(0, 0, H - 0.13, B - 0.02, L - 0.02, 0.05, WEI2)
    # REIHENFOLGE VON INNEN NACH AUSSEN: Zarge/Rahmen zurueck, Blatt bzw. Scheibe DAVOR.
    # Erste Fassung hatte die Zarge 3 cm VOR dem Tuerblatt — sie deckte Tuer und
    # Fenster komplett zu, die Front sah aus wie eine leere weisse Platte.
    TX = 0.45                    # Tuerachse: Podest + Handlauf bleiben in der Breite
    box(TX, L/2 - 0.055, 1.275, 1.04, 0.05, 2.07, RAHM)            # Zarge
    box(TX, L/2 - 0.03, 1.275, 0.90, 0.08, 1.95, TUER)             # Tuerblatt
    box(TX - 0.34, L/2 + 0.015, 1.20, 0.10, 0.08, 0.28, STAH)      # Griff
    box(TX, L/2 + 0.012, 1.90, 0.44, 0.04, 0.40, GLAS)             # Tuerfenster
    box(TX, L/2 - 0.075, 1.275, 1.10, 0.04, 2.13, SCHW)            # Dichtung dahinter
    for (fx, fy, fb) in ((-0.72, L/2, 0.86), (0.0, -L/2, 1.30)):   # Front-/Heckfenster
        s = 1 if fy > 0 else -1
        box(fx, fy - s*0.075, 1.62, fb + 0.12, 0.05, 1.12, RAHM)
        box(fx, fy - s*0.035, 1.62, fb, 0.04, 1.00, GLAS)
        box(fx, fy - s*0.025, 1.62, 0.06, 0.04, 1.00, RAHM)
    for sx in (-1, 1):                                             # Seitenfenster
        box(sx*(B/2 - 0.075), -0.90, 1.62, 0.05, 1.42, 1.12, RAHM)
        box(sx*(B/2 - 0.045), -0.90, 1.62, 0.04, 1.30, 1.00, GLAS)
        box(sx*(B/2 - 0.025), -0.90, 1.62, 0.04, 0.06, 1.00, RAHM)
    box(0, 0, H - 0.02, 0.30, 0.30, 0.04, ECK)                     # Dachdurchfuehrung
    # --- Podest mit zwei Stufen (hoechster Punkt 1.35 — bleibt unter 2.60)
    PY = L/2 + 0.50
    box(TX, PY, 0.27, 1.30, 0.94, 0.06, STAH)
    for i in range(5):
        box(TX, PY - 0.36 + i*0.18, 0.31, 1.24, 0.09, 0.03, STAH)
    for sx in (-1, 1):
        box(TX + sx*0.60, PY, 0.14, 0.08, 0.94, 0.28, STAH)
        for sy in (-0.40, 0.40):
            box(TX + sx*0.60, PY + sy, 0.81, 0.06, 0.06, 1.02, STAH)
        box(TX + sx*0.60, PY, 1.31, 0.07, 0.94, 0.07, STAH)
        box(TX + sx*0.60, PY, 0.86, 0.05, 0.94, 0.05, STAH)
    # Zwei Stufen an SCHRAEGEN WANGEN, oben am Podest befestigt: im Stapel haengt die
    # Treppe dann am Podest, statt mit senkrechten Stuetzen frei in der Luft zu stehen.
    for sx in (-1, 1):
        strebe_yz(PY + 0.44, 0.30, PY + 1.08, 0.075, TX + sx*0.52, 0.09, 0.06, STAH)
        box(TX + sx*0.52, PY + 1.08, 0.018, 0.09, 0.13, 0.036, STAH)
    for k, zz in enumerate((0.21, 0.12)):
        box(TX, PY + 0.58 + k*0.26, zz, 1.04, 0.24, 0.04, STAH)
    export("th21_baucontainer", 0.014, 2)

# ================================================================ 8) Materialstapel
def materialstapel():
    """Palettenstapel: zwei Ziegelpaletten mit Spannband, eine Kalksandstein-Palette,
    ein Rohrbuendel auf Kanthoelzern, Zementsaecke und ein Bretterstapel."""
    neu()
    HOLZ = mat("Palettenholz", (0.58,0.44,0.26), 0.88)
    HOL2 = mat("Kantholz", (0.48,0.35,0.20), 0.9)
    BRET = mat("Schalbrett", (0.66,0.54,0.35), 0.86)
    ZIEG = mat("Ziegelrot", (0.56,0.24,0.15), 0.88)
    ZIE2 = mat("Ziegelfuge", (0.42,0.18,0.11), 0.9)
    ZIE3 = mat("Kalksandstein", (0.72,0.70,0.66), 0.9)
    FOLI = mat("Schrumpffolie", (0.30,0.40,0.56), 0.4, 0.0, None, 1.4, 0.55)
    ROHR = mat("Kunststoffrohr", (0.78,0.42,0.10), 0.55)
    ROH2 = mat("Rohr grau", (0.44,0.45,0.47), 0.6)
    SACK = mat("Zementsack", (0.72,0.68,0.58), 0.92)
    SAC2 = mat("Sack bedruckt", (0.60,0.56,0.46), 0.92)
    BAND = mat("Spannband", (0.14,0.14,0.15), 0.7)
    def ziegelpaket(cx, cy, cz, m, m2, b=1.16, t=0.76, h=0.62):
        box(cx, cy, cz + h/2, b, t, h, m)
        for k in range(1, 5):                                      # Lagerfugen, 2 cm vor
            for s in (-1, 1):
                box(cx + s*(b/2 + 0.02), cy, cz + k*h/5, 0.03, t*0.98, 0.025, m2)
                box(cx, cy + s*(t/2 + 0.02), cz + k*h/5, b*0.98, 0.03, 0.025, m2)
        for k in range(4):                                         # Stossfugen
            for s in (-1, 1):
                box(cx + s*(b/2 + 0.02), cy - t/2 + t*(k + 0.5)/4, cz + h/2,
                    0.03, 0.025, h*0.96, m2)
        box(cx, cy, cz + h + 0.015, b + 0.03, t + 0.03, 0.03, FOLI)
    palette(-1.55, 0.55, 0.00, HOLZ)
    ziegelpaket(-1.55, 0.55, 0.145, ZIEG, ZIE2)
    palette(-1.55, 0.55, 0.775, HOLZ)
    ziegelpaket(-1.55, 0.55, 0.920, ZIEG, ZIE2)
    for sy in (0.25, 0.85):
        box(-1.55, sy, 0.795, 1.22, 0.03, 1.42, BAND)
    palette(-1.55, -0.55, 0.00, HOLZ)
    ziegelpaket(-1.55, -0.55, 0.145, ZIE3, ZIE2, 1.16, 0.76, 0.72)
    for sy in (-1.10, 1.10):                                       # Rohrbuendel
        box(0.85, sy, 0.06, 1.60, 0.12, 0.12, HOL2)
        box(0.85, sy, 0.21, 0.10, 0.36, 0.30, HOL2)
    RA, DZ = 0.115, 0.199
    for lage, n in enumerate((5, 4, 3)):
        for i in range(n):
            px = 0.85 - (n - 1)*RA + i*2*RA
            rohr(px, 0.0, 0.12 + RA + lage*DZ, RA, RA*0.78, 2.80,
                 ROHR if (i + lage) % 3 else ROH2, 16, 'y')
    for lage in range(3):                                          # Zementsaecke
        for i in range(3 - (lage % 2)):
            # frei neben dem Bretterstapel — hinter ihm waren sie komplett verdeckt
            o = box(2.30 + (lage % 2)*0.20 + i*0.42, -1.95 + (lage % 2)*0.06,
                    0.09 + lage*0.17, 0.40, 0.72, 0.17,
                    SACK if (i + lage) % 2 else SAC2)
            o.rotation_euler[2] = 0.10 if (i + lage) % 2 else -0.08
    for sy in (-0.55, 0.55):                                       # Bretterstapel
        box(2.90, sy, 0.06, 0.90, 0.12, 0.12, HOL2)
    for k in range(7):
        box(2.90, 0.0, 0.145 + k*0.055, 0.86, 2.40, 0.05, BRET if k % 2 else HOLZ)
    box(2.90, 0.0, 0.53, 0.90, 2.44, 0.03, FOLI)
    export("th21_materialstapel", 0.012, 2)

# ================================================================ 9) Sandhaufen
def sandhaufen():
    """Drei Schuettkegel (Sand, Kies, Splitt) mit weichem Fuss, Aufwerfungen und
    Streugut, dazu eine Trennwand aus Kanthoelzern und eine Schaufel im Sand.
    Kegelbasis liegt exakt auf z = 0."""
    neu()
    SAND = mat("Bausand", (0.72,0.58,0.32), 0.96)
    SAN2 = mat("Sand hell", (0.80,0.66,0.40), 0.95)
    KIES = mat("Rundkies", (0.44,0.43,0.40), 0.96)
    KIE2 = mat("Kies hell", (0.54,0.53,0.49), 0.95)
    SPLI = mat("Splitt dunkel", (0.26,0.26,0.27), 0.97)
    SPL2 = mat("Splitt hell", (0.34,0.34,0.35), 0.96)
    HOLZ = mat("Trennwand", (0.50,0.37,0.21), 0.9)
    STAH = mat("Schaufelblatt", (0.60,0.62,0.65), 0.35, 0.5)
    HOL2 = mat("Schaufelstiel", (0.62,0.48,0.28), 0.85)
    def haufen(cx, cy, r, h, m, m2, seg=20, fx=1.0, fy=1.0, bumps=6):
        o = kegel(cx, cy, h/2, r, r*0.10, h, m, seg); o.scale = (fx, fy, 1.0)
        # flacher Fusssaum: mit 0.42 stand eine deutliche Stufe um den Kegel
        o = halbkugel(cx, cy, 0.0, r*0.99, m2, seg, 0.26); o.scale = (fx*1.03, fy*1.03, 1.0)
        for i in range(bumps):
            a = i/bumps*TAU + 0.4
            halbkugel(cx + math.cos(a)*r*fx*0.84, cy + math.sin(a)*r*fy*0.84,
                      0.0, r*0.24, m2 if i % 2 else m, 10, 0.40)
    # Abstaende so, dass sich die Fussflaechen NICHT durchdringen (erste Fassung
    # liess Sand und Kies ineinanderlaufen und die Trennwand steckte im Sandkegel).
    haufen(-2.60, 0.25, 2.00, 1.65, SAND, SAN2, 22, 1.06, 0.92, 7)
    haufen( 1.55, -0.35, 1.70, 1.32, KIES, KIE2, 20, 1.00, 1.08, 6)
    haufen( 4.40, 1.45, 1.20, 0.95, SPLI, SPL2, 18, 1.08, 0.94, 5)
    for i in range(9):
        # halb eingegraben: eine ganze Kugel auf z=0.05 hing 10 cm unter den Boden
        halbkugel(-0.10 + math.cos(i*2.4)*2.6, 1.9 + math.sin(i*2.4)*1.4, 0.0,
                  0.10 + (i % 3)*0.03, KIE2 if i % 2 else SAN2, 8, 0.55)
    for k in range(3):                                             # Trennwand im Spalt
        box(-0.32, 0.10, 0.11 + k*0.22, 0.14, 2.60, 0.22, HOLZ)
    for sy in (-1.05, 1.15):
        box(-0.32, sy, 0.36, 0.16, 0.16, 0.72, HOLZ)
    o = box(-1.35, -0.85, 0.90, 0.06, 0.30, 1.50, HOL2)            # Schaufel im Sand
    o.rotation_euler[0] = math.radians(-24)
    o = box(-1.35, -1.24, 0.19, 0.30, 0.36, 0.05, STAH)
    o.rotation_euler[0] = math.radians(-24)
    box(-1.35, -0.52, 1.62, 0.22, 0.14, 0.05, HOL2)
    export("th21_sandhaufen", 0.016, 2)

# ================================================================ 10) Betonrohre
def betonrohre():
    """Betonrohre in Pyramide (4/3/2) auf Keilen, zwei kleinere Rohre daneben und ein
    aufgestelltes Stueck. ECHTE Hohlrohre — man schaut hindurch. Rohrachse in y.
    Die Muffe bestimmt die Aufstandshoehe: Rohrmitte auf ra + Muffenueberstand."""
    neu()
    BET  = mat("Betonrohr", (0.60,0.59,0.56), 0.92)
    BET2 = mat("Rohr dunkel", (0.50,0.49,0.46), 0.93)
    MUFF = mat("Muffenring", (0.54,0.53,0.50), 0.9)
    HOLZ = mat("Keil", (0.50,0.37,0.21), 0.9)
    STAH = mat("Bewehrung", (0.52,0.44,0.34), 0.6, 0.3)
    RA, RI, LR, MU = 0.60, 0.46, 2.50, 0.07
    DX, DZ = 2*RA, 2*RA*math.sin(math.radians(60))
    for lage, n in enumerate((4, 3, 2)):
        for i in range(n):
            px = -(n - 1)*RA + i*DX
            pz = RA + MU + lage*DZ
            rohr(px, 0, pz, RA, RI, LR, BET if (i + lage) % 2 else BET2, 28, 'y')
            for sy in (-1, 1):
                rohr(px, sy*(LR/2 - 0.09), pz, RA + MU, RA - 0.005, 0.18, MUFF, 28, 'y')
    for sx in (-1, 1):                                             # Keile gegen Wegrollen
        for sy in (-0.85, 0.85):
            o = box(sx*2.32, sy, 0.22, 0.44, 0.34, 0.24, HOLZ)
            o.rotation_euler[1] = sx*math.radians(20)
    for k, (px, py) in enumerate(((3.35, -0.55), (3.35, 0.85))):   # kleinere Rohre
        rohr(px, py, 0.42, 0.36, 0.26, 1.90, BET2 if k else BET, 24, 'y')
        rohr(px, py + (0.86 if k else -0.86), 0.42, 0.42, 0.355, 0.16, MUFF, 24, 'y')
        for sy in (-1, 1):
            o = box(px + sy*0.42, py, 0.16, 0.30, 0.26, 0.18, HOLZ)
            o.rotation_euler[1] = sy*math.radians(22)
    rohr(-3.10, 1.05, 0.62, 0.46, 0.35, 1.24, BET, 24, 'z')        # aufgestelltes Stueck
    rohr(-3.10, 1.05, 1.16, 0.52, 0.455, 0.16, MUFF, 24, 'z')
    for i in range(6):                                             # Bewehrungsstaebe
        zyl(-3.05 + (i % 3)*0.05, -1.30 + (i // 3)*0.09, 0.035 + (i // 3)*0.07,
            0.017, 3.20, STAH, 8, rot=(math.pi/2, 0, 0))
    export("th21_betonrohre", 0.014, 2)

# ================================================================ 11) Rohbau
def rohbau():
    """BEGEHBAR: Rohbau-Geschoss, exakt 12.00 x 12.00 m, stapelbar mit z += 3.20.
    Stuetzen 0.00-2.96, Decke 2.96-3.20 (= Fussboden des naechsten Geschosses),
    halbfertige Waende, Betontreppe durch das Deckenauge. NICHTS ragt ueber 3.20
    hinaus (deshalb hat die Treppe kein Gelaender — im Rohbau auch korrekt so),
    damit der Stapel fugenlos sitzt. Front (+y) offen: 3.00 m Durchgang."""
    neu()
    BET  = mat("Sichtbeton", (0.58,0.57,0.55), 0.93)
    BET2 = mat("Beton dunkel", (0.48,0.47,0.45), 0.94)
    BET3 = mat("Schalungsbeton", (0.63,0.62,0.60), 0.9)
    ZIEG = mat("Mauerziegel", (0.55,0.26,0.17), 0.9)
    FUGE = mat("Moertelfuge", (0.66,0.64,0.60), 0.95)
    PORE = mat("Porenbeton", (0.74,0.73,0.70), 0.92)
    STAH = mat("Bewehrungsstahl", (0.48,0.40,0.30), 0.62, 0.3)
    ROT  = mat("Baustuetze", (0.72,0.20,0.14), 0.55)
    HOLZ = mat("Schaltafel", (0.62,0.48,0.28), 0.86)
    HOL2 = mat("Kantholz", (0.48,0.35,0.20), 0.9)
    GELB = mat("Materialkiste", (0.84,0.68,0.12), 0.6)
    S, HG, DD = 12.00, 3.20, 0.24
    ZS = HG - DD                                  # Stuetzenkopf / Deckenunterkante 2.96
    WD = 0.24
    # Wandachse 3.5 cm weiter innen: die Moertelfugen stehen 3.5 cm vor der Wand und
    # sollen die 12.00-m-Flucht bilden — sonst misst das Modul 12.07 statt 12.00.
    WA = S/2 - WD/2 - (FUGE_V + FUGE_D/2)
    LX0, LX1, LY0, LY1 = 2.40, 4.60, -4.20, -0.40      # Deckenauge
    XM = (LX0 + LX1)/2
    RASTER = (-5.70, -1.90, 1.90, 5.70)
    for px in RASTER:                             # Stuetzen
        for py in RASTER:
            box(px, py, ZS/2, 0.36, 0.36, ZS, BET)
            box(px, py, ZS - 0.10, 0.44, 0.44, 0.20, BET2)
            for i in range(3):
                box(px, py, 0.60 + i*0.78, 0.39, 0.39, 0.025, BET3)
    for px in RASTER:                             # Unterzuege
        box(px, 0, ZS - 0.18, 0.40, S - 0.40, 0.36, BET2)
    for py in (-5.70, 5.70):
        box(0, py, ZS - 0.18, S - 0.40, 0.40, 0.36, BET2)
    zc = ZS + DD/2                                # Decke in vier Streifen um das Auge
    box(0, (LY0 - S/2)/2, zc, S, LY0 + S/2, DD, BET)
    box(0, (LY1 + S/2)/2, zc, S, S/2 - LY1, DD, BET)
    box((LX0 - S/2)/2, (LY0 + LY1)/2, zc, LX0 + S/2, LY1 - LY0, DD, BET)
    box((LX1 + S/2)/2, (LY0 + LY1)/2, zc, S/2 - LX1, LY1 - LY0, DD, BET)
    for lx, s in ((LX0, -1), (LX1, 1)):
        box(lx + s*0.03, (LY0+LY1)/2, ZS + 0.04, 0.06, LY1 - LY0, 0.08, BET2)
    box(XM, LY1 - 0.03, ZS + 0.04, LX1 - LX0, 0.06, 0.08, BET2)
    # --- Waende, halbfertig
    wand_mit_oeffnungen(0, -WA, S, WD, ZS, ZIEG, 2, 2.20, 1.70, 'x', 0.90)
    fugen(0, -WA, 0, ZS, S, WD, FUGE, 'x', 0.50)
    wand_mit_oeffnungen(-WA, 0, S - 2*WD, WD, ZS, ZIEG, 2, 2.20, 1.70, 'y', 0.90)
    fugen(-WA, 0, 0, ZS, S - 2*WD, WD, FUGE, 'y', 0.50)
    box(WA, -2.60, 0.62, WD, 6.40, 1.24, PORE)                     # rechts nur angemauert
    fugen(WA, -2.60, 0, 1.24, 6.40, WD, FUGE, 'y', 0.50)
    box(WA, 3.60, ZS/2, WD, 4.40, ZS, PORE)
    fugen(WA, 3.60, 0, ZS, 4.40, WD, FUGE, 'y', 0.50)
    for sx in (-1, 1):                                             # Front: Ecken + Bruestung
        box(sx*4.55, WA, ZS/2, 2.90, WD, ZS, ZIEG)
        fugen(sx*4.55, WA, 0, ZS, 2.90, WD, FUGE, 'x', 0.50)
        box(sx*2.30, WA, 0.55, 1.60, WD, 1.10, PORE)
        fugen(sx*2.30, WA, 0, 1.10, 1.60, WD, FUGE, 'x', 0.50)
    # --- Betontreppe: 18 Stufen, endet exakt an der Deckenkante LY0
    NS, AU = 18, 0.28
    ST = HG/NS
    Y0 = LY0 + NS*AU
    treppe(XM, Y0, 0.0, 1.60, HG, BET3, None, ST, AU, -1)
    stg = ST/AU
    ang = math.atan(stg)
    hv = (0.30/2)/math.cos(ang)          # senkrechter Versatz: Wangenoberkante trifft
    # die inneren Stufenecken. Die UNTERE Ecke der Wange liegt 0.15*cos(a) unter der
    # Mittellinie — mit hv gerechnet tauchte sie 7 cm unter den Boden.
    ya = Y0 - (hv + 0.15*math.cos(ang) + 0.02)/stg                 # Wange erst ab hier
    strebe_yz(ya, (Y0-ya)*stg - hv, LY0, (Y0-LY0)*stg - hv, XM, 0.30, 1.62, BET2)
    box(XM, (ya + Y0)/2 + 0.06, 0.03, 1.62, Y0 - ya + 0.50, 0.06, BET3)   # Antrittsplatte
    # --- Bewehrung, Baustuetzen, Material
    for px in RASTER:
        for py in RASTER:
            for (ox, oy) in ((-0.11,-0.11), (0.11,-0.11), (-0.11,0.11), (0.11,0.11)):
                zyl(px + ox, py + oy, ZS + 0.12, 0.014, 0.20, STAH, 6)
    for (px, py) in ((-3.80, 3.30), (-3.80, 0.80), (0.20, 3.30)):  # Baustuetzen
        zyl(px, py, ZS/2, 0.05, ZS, ROT, 10)
        box(px, py, 0.02, 0.24, 0.24, 0.04, STAH)
        box(px, py, ZS - 0.04, 0.28, 0.28, 0.05, STAH)
        zyl(px, py, ZS*0.52, 0.075, 0.14, STAH, 10)
    for k in range(4):                                             # Schaltafeln an der Wand
        o = box(-5.10 + k*0.10, -3.40 + k*0.06, 1.30, 0.06, 1.10, 2.40, HOLZ)
        o.rotation_euler[0] = math.radians(-9)
    for k in range(3):
        box(-4.20, -5.00, 0.06 + k*0.10, 1.60, 0.90, 0.10, HOL2)
    palette(4.60, -5.00, 0.0, HOL2)
    for k in range(4):
        box(4.60, -5.00, 0.20 + k*0.11, 1.10, 0.72, 0.11, ZIEG if k % 2 else PORE)
    for k in range(6):
        box(3.20, 4.40, 0.03 + k*0.045, 2.10, 1.60, 0.045, STAH)   # Bewehrungsmatten
    box(-2.20, 5.10, 0.32, 0.90, 0.90, 0.64, GELB)
    box(-2.20, 5.10, 0.66, 0.96, 0.96, 0.06, HOL2)
    export("th21_rohbau", 0.016, 2)


if __name__ == "__main__":
    print("Asset-Charge th21 (Baustelle):")
    for fn in (turmdrehkran, geruest_modul, bauzaun_modul, bagger, radlader,
               betonmischer, baucontainer, materialstapel, sandhaufen,
               betonrohre, rohbau):
        fn()
    print("fertig")
