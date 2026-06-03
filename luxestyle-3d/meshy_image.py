#!/usr/bin/env python3
"""LuxeStyle - meshy_image.py : Bild -> 3D (Meshy openapi v1).

Erzeugt aus EINEM Referenzbild (z. B. Gemini-Render) ein texturiertes GLB.
In unseren Tests treffsicherer als Text, wenn man eine genaue Vorlage hat
(Augenform, Pose, Farbe werden aus dem Bild uebernommen).

Key (NIE im Code/Git):  MESHY_API_KEY  ODER  Datei in MESHY_KEY_FILE
(Default /tmp/meshy.key). Key nach Gebrauch im Dashboard rotieren.

Aufruf:
  MESHY_API_KEY=msy_... IMG=/tmp/cat_ref.jpg OUT=/tmp/meshy_cat.glb python3 meshy_image.py
Env:  IMG(=/tmp/cat_ref.jpg), OUT(=/tmp/meshy_cat.glb)
"""
import os, json, time, sys, base64, urllib.request, urllib.error

KEY = os.environ.get("MESHY_API_KEY")
if not KEY:
    kf = os.environ.get("MESHY_KEY_FILE", "/tmp/meshy.key")
    if os.path.exists(kf): KEY = open(kf).read().strip()
if not KEY:
    print("KEIN KEY: MESHY_API_KEY setzen oder MESHY_KEY_FILE anlegen.", flush=True); sys.exit(2)

H = {"Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
BASE = "https://api.meshy.ai/openapi/v1/image-to-3d"
IMG = os.environ.get("IMG", "/tmp/cat_ref.jpg")
OUT = os.environ.get("OUT", "/tmp/meshy_cat.glb")

raw = open(IMG, "rb").read()
mime = "image/png" if IMG.lower().endswith(".png") else "image/jpeg"
data_uri = "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode())

def req(url, method="GET", data=None):
    r = urllib.request.Request(url, method=method, headers=H,
                               data=(json.dumps(data).encode() if data else None))
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read().decode())

try:
    out = req(BASE, "POST", {"image_url": data_uri, "should_remesh": True, "should_texture": True})
except urllib.error.HTTPError as e:
    print("HTTP_ERROR", e.code, e.read().decode()[:600], flush=True); sys.exit(1)
task = out.get("result") or out.get("id")
print("TASK", task, flush=True)
if not task: print("NO_TASK", json.dumps(out)[:300], flush=True); sys.exit(1)

for _ in range(200):
    try: s = req(BASE + "/" + task)
    except Exception as e: print("POLL_ERR", repr(e), flush=True); time.sleep(6); continue
    print("STATUS", s.get("status"), s.get("progress"), flush=True)
    if s.get("status") == "SUCCEEDED":
        u = s.get("model_urls", {}); m = u.get("glb") or u.get("obj") or u.get("fbx")
        urllib.request.urlretrieve(m, OUT); print("DOWNLOADED", OUT, os.path.getsize(OUT), flush=True); break
    if s.get("status") in ("FAILED","EXPIRED","CANCELED"):
        print("FAILED", json.dumps(s)[:400], flush=True); sys.exit(1)
    time.sleep(6)
