#!/usr/bin/env python3
"""glb2stl.py — Spielmodelle (GLB) als Druck-/Referenzdatei (STL) nach models/stl/.

WOZU. models/stl/ hielt 398 STL fuer 530 th-Modelle; der Erzeuger lag nicht im Repo.
132 Modelle (die fruehen Serien th_, th2, th3, th4) hatten keine. Hier steht der
Erzeuger jetzt EINMAL, mit der gemessenen Konvention der vorhandenen Dateien:

  * binaer, Dreieckszahl = Dreieckszahl des GLB (14 060 = 14 060 bei th10_bahnhof),
    also kein Ausduennen, keine Reparatur (die alten sind auch nicht wasserdicht);
  * Meter bleiben Meter;
  * Y-hoch (glTF) -> Z-hoch (Druck): GLB-Huelle [x 0..24 y | z] wird STL [x | y 0..24 z].
    Gemessen an th10_bahnhof: GLB y 0..24,04 = STL z 0..24,04, GLB z +-14,2 = STL y +-14,2.

⚠️ KEINE WAFFEN. STL ist ein Druckformat; massgetreue Waffenteile gehoeren nicht in
dieses Repo (models/TH5-ASSETS.md, Zeile ~796). Namen mit Waffenbegriffen werden
uebersprungen und gemeldet, nicht stillschweigend gebaut.

Aufruf:  python3 spiele-dev/tools/glb2stl.py [--alle] [--pruefe NAME] [NAME ...]
   ohne Argumente: nur die th-Modelle OHNE STL
   --alle:         alle th-Modelle neu schreiben (nur fuer Vergleiche!)
   --pruefe NAME:  vorhandene STL gegen frische Umwandlung vergleichen (Huelle, Dreiecke)
"""
import sys, os, glob, re
import numpy as np
import trimesh

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MOD = os.path.join(REPO, "models"); STL = os.path.join(MOD, "stl")
WAFFE = re.compile(r"waffe|pistol|gewehr|revolver|kanone|schwert|messer|dolch|munition|granat|bombe", re.I)
Y_ZU_Z = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])   # y-hoch -> z-hoch

def lade(name):
    sc = trimesh.load(os.path.join(MOD, name + ".glb"), force="scene")
    m = trimesh.util.concatenate([g.copy().apply_transform(sc.graph[n][0])
                                  for n, g in ((n, sc.geometry[sc.graph[n][1]]) for n in sc.graph.nodes_geometry)])
    m.apply_transform(Y_ZU_Z)
    return m

def schreibe(name):
    m = lade(name)
    m.export(os.path.join(STL, name + ".stl"), file_type="stl")   # binaer
    return len(m.faces)

def pruefe(name):
    alt = trimesh.load(os.path.join(STL, name + ".stl"))
    neu = lade(name)
    d = np.abs(alt.bounds - neu.bounds).max()
    ok = len(alt.faces) == len(neu.faces) and d < 1e-3
    print(f"{'✅' if ok else '❌'} {name}: Dreiecke {len(alt.faces)} / {len(neu.faces)} · Huellen-Abweichung {d:.4f} m")
    return ok

if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--pruefe"]:
        sys.exit(0 if all(pruefe(n) for n in args[1:]) else 1)
    alle = "--alle" in args; args = [a for a in args if a != "--alle"]
    namen = args or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(MOD, "th*.glb")))
                     if alle or not os.path.exists(os.path.join(STL, os.path.basename(p)[:-4] + ".stl"))]
    n_ok = 0; uebersprungen = []
    for name in namen:
        if WAFFE.search(name):
            uebersprungen.append(name); continue
        try:
            f = schreibe(name); n_ok += 1
            print(f"  {name}.stl  {f} Dreiecke")
        except Exception as e:
            print(f"  ❌ {name}: {e}")
    print(f"\n{n_ok} STL geschrieben" + (f" · {len(uebersprungen)} uebersprungen (Waffenbegriff): {', '.join(uebersprungen)}" if uebersprungen else ""))
