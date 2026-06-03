#!/usr/bin/env python3
"""LuxeStyle - meshy_texture.py : bestehendes Modell von MESHY texturieren lassen.

Nimmt EIN fertiges Modell (GLB) - die Form bleibt unveraendert - und laesst Meshy
per Text-to-Texture eine echte Fell-Textur (PBR) erzeugen. So macht MESHY die
Farbe, nicht wir. Versucht zuerst model_url als Data-URI (kein externer Host);
faellt das aus, kann MODEL_URL (oeffentliche URL) gesetzt werden.

Key: MESHY_API_KEY oder /tmp/meshy.key (MESHY_KEY_FILE). Key danach rotieren.

Aufruf:
  MODEL=/tmp/cat_sitting.glb OBJ_PROMPT="a cat figurine" \
  STYLE="short grey tabby fur with darker stripes, white chest and paws, pink nose, black eyes" \
  OUT=/tmp/cat_textured.glb python3 meshy_texture.py
Env: MODEL, MODEL_URL(optional public url, sonst Data-URI), OBJ_PROMPT, STYLE,
     NEG, OUT(=/tmp/cat_textured.glb), PBR(1), ORIG_UV(1)
"""
import os, json, time, sys, base64, urllib.request, urllib.error

KEY=os.environ.get("MESHY_API_KEY")
if not KEY:
    kf=os.environ.get("MESHY_KEY_FILE","/tmp/meshy.key")
    if os.path.exists(kf): KEY=open(kf).read().strip()
if not KEY: print("KEIN KEY",flush=True); sys.exit(2)

H={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
BASE="https://api.meshy.ai/openapi/v1/retexture"
MODEL=os.environ.get("MODEL","/tmp/cat_sitting.glb")
OUT=os.environ.get("OUT","/tmp/cat_textured.glb")
OBJ_PROMPT=os.environ.get("OBJ_PROMPT","a cute cat figurine")
STYLE=os.environ.get("STYLE","short grey tabby fur, white chest and paws, small pink nose, dark eyes, soft")
NEG=os.environ.get("NEG","extra limbs, text, watermark, low quality, seams")
PBR=os.environ.get("PBR","1")=="1"; ORIG_UV=os.environ.get("ORIG_UV","1")=="1"

murl=os.environ.get("MODEL_URL")
if not murl:
    raw=open(MODEL,"rb").read()
    murl="data:model/gltf-binary;base64,"+base64.b64encode(raw).decode()
    print("model_url = Data-URI (%d bytes)"%len(raw),flush=True)
else:
    print("model_url =",murl,flush=True)

def req(url,method="GET",data=None):
    r=urllib.request.Request(url,method=method,headers=H,data=(json.dumps(data).encode() if data else None))
    with urllib.request.urlopen(r,timeout=120) as resp: return json.loads(resp.read().decode())

body={"model_url":murl,"text_style_prompt":(OBJ_PROMPT+", "+STYLE).strip(", "),
      "enable_original_uv":ORIG_UV,"enable_pbr":PBR}
try:
    out=req(BASE,"POST",body)
except urllib.error.HTTPError as e:
    print("HTTP_ERROR",e.code,e.read().decode()[:800],flush=True); sys.exit(1)
task=out.get("result") or out.get("id")
print("TEXTURE_TASK",task,flush=True)
if not task: print("NO_TASK",json.dumps(out)[:300],flush=True); sys.exit(1)

for _ in range(300):
    try: s=req(BASE+"/"+task)
    except Exception as e: print("POLL_ERR",repr(e),flush=True); time.sleep(6); continue
    print("STATUS",s.get("status"),s.get("progress"),flush=True)
    if s.get("status")=="SUCCEEDED":
        u=s.get("model_urls",{}); m=u.get("glb") or u.get("obj") or u.get("fbx")
        if not m: print("NO_MODEL",json.dumps(s)[:300],flush=True); sys.exit(1)
        urllib.request.urlretrieve(m,OUT); print("DOWNLOADED",OUT,os.path.getsize(OUT),flush=True); break
    if s.get("status") in ("FAILED","EXPIRED","CANCELED"):
        print("FAILED",json.dumps(s)[:400],flush=True); sys.exit(1)
    time.sleep(6)
