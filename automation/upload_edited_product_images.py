#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LuxeStyle — upload_edited_product_images.py

Lädt für JEDES aktive cj-real-Produkt ein **bearbeitetes, schriftloses** Produktbild
(gen_post_image.render_product_clean: ganzes Produkt scharf & veredelt auf editorialem,
unscharf-abgedunkeltem Marken-Hintergrund — KEIN Text) in die Shopify-Produkt-Galerie.

- Nimmt automatisch das **grösste** vorhandene Produktfoto (max. Schärfe).
- **Idempotent:** überspringt Produkte, die bereits ein Bild mit alt-Prefix "LuxeStyle-Edit" haben.
- **Ausschluss:** Produkte aus automation/DO-NOT-POST.txt (z.B. Bali) werden übersprungen.
- Throttle gegen Rate-Limits; MAX_PER_RUN begrenzt eine Charge (0 = alle).

Auth (wie reel-analytics.mjs): SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (Client-Credentials)
ODER direkter SHOPIFY_ADMIN_TOKEN.  Benötigt Pillow + requests.

ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN),
     MAX_PER_RUN (Default 0=alle), DRY_RUN=1, ALT_PREFIX (Default "LuxeStyle-Edit"),
     PRODUCT_QUERY (Default "tag:cj-real status:active").
"""
import io
import os
import sys
import time
import json
import ssl
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_post_image as G          # render_product_clean, _excludes
from PIL import Image
import requests

API = os.environ.get("SHOPIFY_API_VERSION", "2025-01")
SHOP = os.environ.get("SHOPIFY_SHOP", "").strip()
CID = os.environ.get("SHOPIFY_CLIENT_ID", "").strip()
CSECRET = os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip()
TOK_STATIC = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
MAX = int(os.environ.get("MAX_PER_RUN", "0") or "0")
DRY = os.environ.get("DRY_RUN", "") == "1"
ALT_PREFIX = os.environ.get("ALT_PREFIX", "LuxeStyle-Edit")
PRODUCT_QUERY = os.environ.get("PRODUCT_QUERY", "tag:cj-real status:active")

if not SHOP:
    print("SHOPIFY_SHOP fehlt → No-op."); sys.exit(0)

_SSL = ssl.create_default_context(); _SSL.check_hostname = False; _SSL.verify_mode = ssl.CERT_NONE
EXCLUDES = G._excludes()


def token():
    if not (CID and CSECRET) and TOK_STATIC:
        return TOK_STATIC
    if CID and CSECRET:
        r = requests.post(f"https://{SHOP}/admin/oauth/access_token",
                          json={"client_id": CID, "client_secret": CSECRET,
                                "grant_type": "client_credentials"}, timeout=30)
        return r.json().get("access_token", "")
    return ""


TOKEN = token()
if not TOKEN:
    print("Kein gültiger Admin-Token (Client-Credentials/Token fehlen) → No-op."); sys.exit(0)
HEAD = {"Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN}


def gql(query, variables=None):
    r = requests.post(f"https://{SHOP}/admin/api/{API}/graphql.json",
                      headers=HEAD, json={"query": query, "variables": variables or {}}, timeout=60)
    j = r.json()
    if j.get("errors"):
        raise RuntimeError("GraphQL: " + json.dumps(j["errors"])[:400])
    return j["data"]


PRODUCTS_Q = """
query($q:String!,$after:String){ products(first:25, query:$q, after:$after){
  pageInfo{hasNextPage endCursor}
  edges{ node{ id title handle
    images(first:20){ edges{ node{ url width height } } }
    media(first:30){ edges{ node{ ... on MediaImage{ alt } } } } } } } }
"""

STAGED_M = """
mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){
  stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }
"""

CREATE_MEDIA_M = """
mutation($pid:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$pid, media:$media){
  media{ id status } mediaUserErrors{ field message } } }
"""


def excluded(title, handle):
    blob = (title + " " + handle).lower()
    return any(t in blob for t in EXCLUDES)


def already_done(node):
    for e in node["media"]["edges"]:
        alt = (e["node"] or {}).get("alt") or ""
        if alt.startswith(ALT_PREFIX):
            return True
    return False


def largest_image(node):
    best, area = None, -1
    for e in node["images"]["edges"]:
        n = e["node"]; a = (n.get("width") or 0) * (n.get("height") or 0)
        if a > area:
            area, best = a, n["url"]
    return best


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 LuxeStyle"})
    with urllib.request.urlopen(req, timeout=40, context=_SSL) as r:
        return Image.open(io.BytesIO(r.read()))


def upload_edited(jpg_bytes, filename):
    st = gql(STAGED_M, {"input": [{"resource": "IMAGE", "filename": filename,
                                   "mimeType": "image/jpeg", "httpMethod": "POST",
                                   "fileSize": str(len(jpg_bytes))}]})
    t = st["stagedUploadsCreate"]["stagedTargets"][0]
    files = {p["name"]: (None, p["value"]) for p in t["parameters"]}
    files["file"] = (filename, jpg_bytes, "image/jpeg")
    up = requests.post(t["url"], files=files, timeout=120)
    if up.status_code not in (200, 201):
        raise RuntimeError(f"GCS-Upload {up.status_code}: {up.text[:200]}")
    return t["resourceUrl"]


def process(node):
    title, handle, pid = node["title"], node["handle"], node["id"]
    if excluded(title, handle):
        print(f"⏭️  ausgeschlossen: {title}"); return "skip"
    if already_done(node):
        return "done-already"
    src_url = largest_image(node)
    if not src_url:
        print(f"⚠️  kein Bild: {title}"); return "skip"
    src = download(src_url)
    buf = io.BytesIO()
    G.render_product_clean(src, 1080, 1080).save(buf, "JPEG", quality=93, optimize=True)
    data = buf.getvalue()
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in handle)[:60]
    fname = f"{safe}-edit.jpg"
    if DRY:
        print(f"   DRY: {title} ({len(data)//1024}KB) würde hochgeladen."); return "ok"
    res_url = upload_edited(data, fname)
    cm = gql(CREATE_MEDIA_M, {"pid": pid, "media": [{"alt": f"{ALT_PREFIX} · {title}",
             "mediaContentType": "IMAGE", "originalSource": res_url}]})
    errs = cm["productCreateMedia"]["mediaUserErrors"]
    if errs:
        raise RuntimeError("productCreateMedia: " + json.dumps(errs)[:300])
    print(f"   ✅ {title}")
    return "ok"


def main():
    after, n_ok, n_skip, n_already, n_err = None, 0, 0, 0, 0
    while True:
        d = gql(PRODUCTS_Q, {"q": PRODUCT_QUERY, "after": after})
        conn = d["products"]
        for e in conn["edges"]:
            try:
                r = process(e["node"])
            except Exception as ex:
                n_err += 1; print(f"   ❌ {e['node'].get('title')}: {ex}")
                time.sleep(2); continue
            if r == "ok":
                n_ok += 1
                time.sleep(1.2)               # Throttle gegen Rate-Limit
                if MAX and n_ok >= MAX:
                    print(f"MAX_PER_RUN={MAX} erreicht.");
                    print(f"Fertig: {n_ok} hochgeladen, {n_already} schon vorhanden, {n_skip} skip, {n_err} Fehler.")
                    return
            elif r == "done-already":
                n_already += 1
            else:
                n_skip += 1
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
    print(f"Fertig: {n_ok} hochgeladen, {n_already} schon vorhanden, {n_skip} skip, {n_err} Fehler.")


if __name__ == "__main__":
    main()
