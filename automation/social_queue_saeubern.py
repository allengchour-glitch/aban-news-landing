#!/usr/bin/env python3
"""Räumt die Social-Warteschlangen auf: nur postbare Zeilen bleiben «ready».

Betreiber 03.09.2026 («mach alles sauber»), nach dem Screenshot mit dem doppelten
Serpent-Armreif. Geprüft wird je ready-Zeile:

  dead-url-skip      Medium liegt auf abannews.com — die Domain ist tot (Lehre 28.08.).
  dup-produkt-skip   Diese WARE wurde schon gepostet oder steht weiter oben in der Queue.
                     Schlüssel aus post_guard.produktKey (« »-Name > Produkt-ID > Slug).
  saison-skip        Der Text bewirbt einen vergangenen Anlass (Sommer, Muttertag, 1. August).
                     Im September ist «Sommer-Liebling» keine Werbung, sondern ein Datum.
  produkt-weg-skip   Das beworbene Produkt ist nicht mehr ACTIVE — genau die Falle, wegen der
                     ein Reel einmal gedraftete Klimaanlagen bewarb.

NICHTS WIRD GELÖSCHT. Es ändert sich nur die Status-Spalte; jede Zeile bleibt lesbar und
lässt sich von Hand zurücksetzen. DRY=1 zeigt nur.
"""
import csv, json, os, re, sys, time, urllib.request
from collections import Counter

DRY  = os.environ.get("DRY") == "1"
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["social/posts_image.csv", "social/video_queue.csv",
           "automation/reels_seed.csv", "social/tiktok_queue.csv"]

# Anlässe, die am 03.09. VORBEI sind. Herbst, Halloween, Advent stehen bewusst NICHT hier —
# die kommen erst. Ein Saisonwort ist nur dann ein Fehler, wenn die Saison vorbei ist.
VORBEI = re.compile(r"\b(sommer\w*|summer|muttertag\w*|vatertag\w*|ostern|ostern?\w*|"
                    r"1\.\s*august|erster august|fasnacht\w*|wm\s*2026|badesaison)\b", re.I)

def produkt_key(cap, zid):
    m = re.search(r'[«"„]([^»"“]{2,40})[»"“]', cap or "")
    if m: return "name:" + re.sub(r"[^a-zäöüß0-9]", "", m.group(1).lower())
    i = re.search(r"(\d{12,})\s*$", zid or "")
    if i: return "pid:" + i.group(1)
    s = re.sub(r"[^a-z0-9-]", "", re.sub(r"-\d{6,}$", "", re.sub(r"-\d{4}-\d{2}-\d{2}$", "",
        re.sub(r"^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto)-", "", (zid or "").lower()))))
    return "slug:" + s if len(s) >= 6 else ""

def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    for i in range(5):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=45))
            if d.get("data"): return d
        except Exception: pass
        time.sleep(2 ** i)
    return {}

def status_von(ids):
    """Live-Status je Produkt-ID. Bei Ausfall LEERES dict — dann wird NICHT gedraftet
    (ein Nullergebnis aus einer kaputten Abfrage ist kein Befund)."""
    out = {}
    ids = [i for i in ids if i]
    for i in range(0, len(ids), 50):
        d = gql("query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status}}}",
                {"ids": ["gid://shopify/Product/" + x for x in ids[i:i+50]]})
        for n in ((d.get("data") or {}).get("nodes") or []):
            if n: out[n["id"].split("/")[-1]] = n["status"]
    return out

gepostet = set()
if os.path.exists("dropship/_posted_produkte.txt"):
    gepostet = {l.strip() for l in open("dropship/_posted_produkte.txt", encoding="utf-8") if l.strip()}

gesamt = Counter()
for datei in DATEIEN:
    if not os.path.exists(datei): continue
    with open(datei, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f); felder = rd.fieldnames; rows = list(rd)
    ready = [r for r in rows if (r.get("status") or "").strip() == "ready"]
    pids = [ (re.search(r"(\d{12,})\s*$", r.get("id") or "") or [None,None])[1] for r in ready ]
    live = status_von([p for p in pids if p])
    gesehen = set(gepostet)
    n = Counter()
    for r in ready:
        medium = (r.get("image_url") or r.get("video_url") or r.get("url") or "")
        cap    = r.get("caption") or ""
        zid    = r.get("id") or ""
        pid    = (re.search(r"(\d{12,})\s*$", zid) or [None,None])[1]
        k      = produkt_key(cap, zid)
        neu = None
        if "abannews.com" in medium:                      neu = "dead-url-skip"
        elif k and k in gesehen:                          neu = "dup-produkt-skip"
        elif VORBEI.search(cap):                          neu = "saison-skip"
        elif pid and live.get(pid) and live[pid] != "ACTIVE": neu = "produkt-weg-skip"
        if neu:
            n[neu] += 1
            if not DRY: r["status"] = neu
        else:
            n["bleibt ready"] += 1
            if k: gesehen.add(k)
    if not DRY and n:
        with open(datei, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=felder); w.writeheader(); w.writerows(rows)
    print(f"{datei:32s} ready {len(ready):4d} → " + " · ".join(f"{k} {v}" for k, v in n.most_common()))
    gesamt.update(n)
print(("DRY — " if DRY else "") + "GESAMT: " + " · ".join(f"{k} {v}" for k, v in gesamt.most_common()))
