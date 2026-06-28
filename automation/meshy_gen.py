#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban Spielentwickler — 3D-Modelle per Meshy.ai (Text→3D) generieren.

UPGRADE: erzeugt echte 3D-Modelle (.glb) aus Text-Prompts — ohne Blender, ohne GPU.
Die .glb laufen in **Godot** (importiert glTF nativ) UND in den **Web-Spielen**
(Three.js GLTFLoader). Damit bekommen die Spiele richtige Grafik autonom.

Workflow (Meshy v2): preview (Geometrie) → refine (Textur) → GLB herunterladen.
Reine Stdlib. Braucht `MESHY_API_KEY` als Umgebungsvariable (NIE im Code/Chat!).

    export MESHY_API_KEY=...        # bzw. als CI-/lokales Secret
    python3 automation/meshy_gen.py            # erzeugt die Standard-Assets
    python3 automation/meshy_gen.py "neon spaceship, low poly" raumschiff
    python3 automation/meshy_gen.py --no-refine   # nur Geometrie (spart Credits)

Ausgabe: game/assets/<name>.glb
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "game" / "assets"
BASE = "https://api.meshy.ai/openapi/v2/text-to-3d"

# Standard-Assets für Neon Drift / Neon Survivor (name, prompt).
ASSETS = [
    ("glider", "sleek low-poly neon hover glider spaceship, cyan glowing edges, sci-fi, game asset"),
    ("enemy_drone", "low-poly menacing enemy drone, red glowing core, angular, sci-fi game asset"),
    ("orb", "glowing low-poly energy orb crystal, golden, faceted, game pickup"),
    ("pillar", "low-poly futuristic neon obstacle pillar, dark with glowing edges, sci-fi"),
]

ART_STYLE = "realistic"   # oder "sculpture"


def _req(url, data=None, method="GET"):
    key = (os.environ.get("MESHY_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("MESHY_API_KEY fehlt (als Umgebungsvariable setzen, nicht im Code).")
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def _poll(task_id, label):
    for _ in range(120):  # bis ~10 Min
        d = _req(f"{BASE}/{task_id}")
        st = d.get("status")
        if st == "SUCCEEDED":
            return d
        if st == "FAILED":
            raise RuntimeError(f"{label}: Task FAILED ({d.get('task_error')})")
        print(f"  … {label}: {st} {d.get('progress',0)}%", flush=True)
        time.sleep(5)
    raise RuntimeError(f"{label}: Timeout")


def generate(name, prompt, refine=True):
    print(f"▶ {name}: '{prompt[:50]}…'")
    pv = _req(BASE, {"mode": "preview", "prompt": prompt, "art_style": ART_STYLE,
                     "should_remesh": True}, "POST")
    pid = pv.get("result")
    _poll(pid, name + " preview")
    final = pid
    if refine:
        rf = _req(BASE, {"mode": "refine", "preview_task_id": pid}, "POST")
        final = rf.get("result")
        _poll(final, name + " refine")
    d = _req(f"{BASE}/{final}")
    glb = (d.get("model_urls") or {}).get("glb")
    if not glb:
        raise RuntimeError(f"{name}: keine GLB-URL in der Antwort")
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{name}.glb"
    with urllib.request.urlopen(glb, timeout=120) as r, open(dst, "wb") as f:
        f.write(r.read())
    print(f"  ✓ gespeichert: game/assets/{name}.glb")


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--no-refine"]
    refine = "--no-refine" not in sys.argv
    if not os.environ.get("MESHY_API_KEY"):
        print("MESHY_API_KEY nicht gesetzt → no-op. So setzen:  export MESHY_API_KEY=dein_key")
        return 0
    jobs = [(args[1], args[0])] if len(args) >= 2 else ASSETS
    for name, prompt in jobs:
        try:
            generate(name, prompt, refine)
        except Exception as e:  # noqa: BLE001 — ein Asset-Fehler stoppt nicht alle
            print(f"  ✗ {name}: {e}")
    print("Fertig. Modelle in game/assets/ → in Godot/Three.js (glTF) nutzbar.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
