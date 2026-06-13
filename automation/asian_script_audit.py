#!/usr/bin/env python3
"""LuxeStyle — Asian-Script / MADE-IN-CHINA Bild-Audit (Gemini Vision).

Prüft Produktbilder auf asiatische Schrift, „MADE IN CHINA" oder Lieferanten-Overlays
und gibt die zu bereinigenden Produkt-IDs aus (FLAG). Erfüllt die feste Bild-Regel
(CLAUDE.md): solche Bilder NIE live/posten → Produkt archivieren + aus Post-Queue nehmen.

ENV: GEMINI_API_KEY (transient oder Secret) — NIE im Code/Repo.
INPUT: TSV/Textdatei, je Zeile  "<productId> <bildUrl>"  (Arg 1) — z. B. aus Shopify-MCP exportiert.
MODELL: gemini-2.5-flash (gemini-2.0-flash ist abgekündigt → 404).

Lauf:  GEMINI_API_KEY=… python3 automation/asian_script_audit.py /tmp/prod.tsv
Ausgabe je Zeile: "FLAG <id> {json}" / "ok <id> {json}" / "ERR <id> …";  FLAGs am Ende in flagged.txt.
"""
import urllib.request, json, base64, re, time, os, sys

KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
API = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
PROMPT = ('Look at this e-commerce product image. Reply ONLY compact JSON '
          '{"asian":bool,"china":bool,"overlay":bool} where asian=true if it contains ANY '
          'Chinese/Japanese/Korean characters anywhere; china=true if it shows text like '
          '"MADE IN CHINA"; overlay=true if there is a supplier brand watermark or marketing '
          'text overlay. No prose.')

if not KEY:
    print("GEMINI_API_KEY fehlt → No-op."); sys.exit(0)
src = sys.argv[1] if len(sys.argv) > 1 else "/dev/stdin"
rows = [l.split(None, 1) for l in open(src) if l.strip() and not l.startswith("#")]

flagged = []
for pid, url in rows:
    url = url.strip()
    mime = "image/png" if url.lower().split("?")[0].endswith(".png") else "image/jpeg"
    try:
        b = urllib.request.urlopen(url, timeout=30).read()
        body = json.dumps({"contents": [{"parts": [
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(b).decode()}}]}]}).encode()
        req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
        r = json.load(urllib.request.urlopen(req, timeout=60))
        txt = r["candidates"][0]["content"]["parts"][0]["text"]
        m = re.search(r'\{.*\}', txt, re.S); j = json.loads(m.group(0)) if m else {}
        flag = bool(j.get("asian") or j.get("china"))
        if flag: flagged.append(pid)
        print(("FLAG " if flag else "ok   ") + pid + " " + json.dumps(j), flush=True)
    except Exception as e:
        print("ERR  " + pid + " " + str(e)[:80], flush=True)
    time.sleep(0.4)
open("flagged.txt", "w").write("\n".join(flagged))
print("DONE flagged=%d -> flagged.txt" % len(flagged), flush=True)
