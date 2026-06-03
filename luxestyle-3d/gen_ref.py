#!/usr/bin/env python3
"""LuxeStyle - gen_ref.py : Text -> Referenzbild (fuer image-to-3D).

Erzeugt EIN sauberes Vorlagen-Bild (PNG), das danach `meshy_image.py` in ein 3D-
Modell mit gebackenem Gesicht verwandelt. Fuellt die dokumentierte Luecke: bisher
kamen Vorlagen von aussen (Gemini von Hand). Reines stdlib-urllib, kein SDK.

Key (NIE im Code/Git):
  OpenAI : OPENAI_API_KEY      (Default-Provider, wenn gesetzt)
  Google : GEMINI_API_KEY oder GOOGLE_API_KEY
  ODER Datei in IMGKEY_FILE (Default /tmp/imgkey.key) + PROVIDER=openai|gemini.

Aufruf:
  PROMPT="..." OUT=/tmp/cat_ref.png python3 gen_ref.py
Env:  PROMPT, OUT(=/tmp/cat_ref.png), PROVIDER(auto), MODEL(provider-default),
      SIZE(=1024x1024, nur OpenAI)
"""
import os, sys, json, base64, urllib.request, urllib.error

PROMPT = os.environ.get("PROMPT",
    "a cute chibi cat figurine, compact loaf pose lying down, front view, big "
    "clear round eyes, small pink nose, smooth stylized, soft studio lighting, "
    "single figure, plain white background, product photo")
OUT = os.environ.get("OUT", "/tmp/cat_ref.png")
PROVIDER = os.environ.get("PROVIDER", "").lower()

def keyfile():
    kf = os.environ.get("IMGKEY_FILE", "/tmp/imgkey.key")
    return open(kf).read().strip() if os.path.exists(kf) else None

OPENAI = os.environ.get("OPENAI_API_KEY")
GEMINI = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not PROVIDER:
    if OPENAI: PROVIDER = "openai"
    elif GEMINI: PROVIDER = "gemini"
    elif keyfile(): PROVIDER = "gemini"  # neutraler Default fuer Keyfile? -> erzwinge via PROVIDER
if PROVIDER == "openai" and not OPENAI: OPENAI = keyfile()
if PROVIDER == "gemini" and not GEMINI: GEMINI = keyfile()

if PROVIDER not in ("openai", "gemini"):
    print("KEIN KEY/PROVIDER: OPENAI_API_KEY oder GEMINI_API_KEY setzen "
          "(oder IMGKEY_FILE + PROVIDER=openai|gemini).", flush=True); sys.exit(2)

def post(url, payload, headers):
    r = urllib.request.Request(url, method="POST",
        data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(r, timeout=180) as resp:
        return json.loads(resp.read().decode())

def save_png(raw_bytes):
    with open(OUT, "wb") as f: f.write(raw_bytes)
    print("SAVED", OUT, len(raw_bytes), flush=True)

try:
    if PROVIDER == "openai":
        model = os.environ.get("MODEL", "gpt-image-1")
        size = os.environ.get("SIZE", "1024x1024")
        out = post("https://api.openai.com/v1/images/generations",
                   {"model": model, "prompt": PROMPT, "size": size, "n": 1},
                   {"Authorization": "Bearer " + OPENAI, "Content-Type": "application/json"})
        d = out["data"][0]
        if d.get("b64_json"):
            save_png(base64.b64decode(d["b64_json"]))
        elif d.get("url"):
            save_png(urllib.request.urlopen(d["url"], timeout=120).read())
        else:
            print("NO_IMAGE", json.dumps(out)[:300], flush=True); sys.exit(1)
    else:  # gemini
        model = os.environ.get("MODEL", "gemini-2.5-flash-image-preview")
        url = ("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s"
               % (model, GEMINI))
        out = post(url,
                   {"contents": [{"parts": [{"text": PROMPT}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"]}},
                   {"Content-Type": "application/json"})
        img = None
        for c in out.get("candidates", []):
            for p in c.get("content", {}).get("parts", []):
                inl = p.get("inlineData") or p.get("inline_data")
                if inl and inl.get("data"):
                    img = inl["data"]; break
            if img: break
        if not img:
            print("NO_IMAGE", json.dumps(out)[:400], flush=True); sys.exit(1)
        save_png(base64.b64decode(img))
except urllib.error.HTTPError as e:
    print("HTTP_ERROR", e.code, e.read().decode()[:500], flush=True); sys.exit(1)
