#!/usr/bin/env python3
"""LuxeStyle - meshy_text.py : Text -> 3D (Meshy openapi v2).

Erzeugt aus einem Prompt ein GLB. Erst Preview, optional Refine (mehr Detail).
art_style ist bewusst "realistic" (in unseren Tests am saubersten fuer Figuren).

Key (NIE im Code/Git):  Umgebungsvariable MESHY_API_KEY  ODER  Datei in
MESHY_KEY_FILE (Default /tmp/meshy.key). Key nach Gebrauch im Dashboard rotieren.

Aufruf:
  MESHY_API_KEY=msy_... PROMPT="a cute cat figurine ..." REFINE=1 OUT=/tmp/x.glb \
    python3 meshy_text.py
Env:  PROMPT, REFINE(0/1), OUT(=/tmp/meshy_cat.glb)
"""
import os, json, time, sys, urllib.request, urllib.error

KEY = os.environ.get("MESHY_API_KEY")
if not KEY:
    kf = os.environ.get("MESHY_KEY_FILE", "/tmp/meshy.key")
    if os.path.exists(kf): KEY = open(kf).read().strip()
if not KEY:
    print("KEIN KEY: MESHY_API_KEY setzen oder MESHY_KEY_FILE anlegen.", flush=True); sys.exit(2)

H = {"Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
BASE = "https://api.meshy.ai/openapi/v2/text-to-3d"
PROMPT = os.environ.get("PROMPT", "a cute cat figurine, smooth stylized, solid")
REFINE = os.environ.get("REFINE", "0") == "1"
OUT = os.environ.get("OUT", "/tmp/meshy_cat.glb")

def req(url, method="GET", data=None):
    r = urllib.request.Request(url, method=method, headers=H,
                               data=(json.dumps(data).encode() if data else None))
    with urllib.request.urlopen(r, timeout=90) as resp:
        return json.loads(resp.read().decode())

def poll(task, label):
    for _ in range(200):
        try: s = req(BASE + "/" + task)
        except Exception as e: print("POLL_ERR", repr(e), flush=True); time.sleep(6); continue
        print(label, s.get("status"), s.get("progress"), flush=True)
        if s.get("status") == "SUCCEEDED": return s
        if s.get("status") in ("FAILED","EXPIRED","CANCELED"):
            print("FAILED", json.dumps(s)[:300], flush=True); sys.exit(1)
        time.sleep(6)
    print("TIMEOUT", flush=True); sys.exit(1)

try:
    out = req(BASE, "POST", {"mode":"preview","prompt":PROMPT,"art_style":"realistic","should_remesh":True})
except urllib.error.HTTPError as e:
    print("HTTP_ERROR", e.code, e.read().decode()[:600], flush=True); sys.exit(1)
ptask = out.get("result") or out.get("id")
print("PREVIEW_TASK", ptask, flush=True)
final = poll(ptask, "PREVIEW")

if REFINE:
    try: ro = req(BASE, "POST", {"mode":"refine","preview_task_id":ptask})
    except urllib.error.HTTPError as e:
        print("REFINE_HTTP_ERROR", e.code, e.read().decode()[:400], flush=True); ro=None
    if ro:
        rtask = ro.get("result") or ro.get("id"); print("REFINE_TASK", rtask, flush=True)
        final = poll(rtask, "REFINE")

u = final.get("model_urls", {}); model = u.get("glb") or u.get("obj") or u.get("fbx")
if not model: print("NO_MODEL", flush=True); sys.exit(1)
urllib.request.urlretrieve(model, OUT)
print("DOWNLOADED", OUT, os.path.getsize(OUT), flush=True)
