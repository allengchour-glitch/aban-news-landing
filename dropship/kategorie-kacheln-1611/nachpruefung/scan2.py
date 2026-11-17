#!/usr/bin/env python3
"""Nachmessung aller 742 Menü-Kategorieseiten NACH dem Kachel-Fix (16.11. 22:05 UTC). Nur lesen, gedrosselt."""
import json, re, time, html, urllib.request, urllib.error, urllib.parse
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
     "Accept": "text/html,application/xhtml+xml", "Accept-Language": "de-CH,de;q=0.9"}
handles = json.load(open("../handles.json"))
fertig = set()
try:
    for l in open("scan_nachher.jsonl"):
        fertig.add(json.loads(l)["h"])
except FileNotFoundError:
    pass
out = open("scan_nachher.jsonl", "a")
def holen(url):
    for v in range(5):
        try:
            req = urllib.request.Request(url, headers=H)
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.status, r.geturl(), r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(60 * (v + 1)); continue
            return e.code, url, e.read() if hasattr(e, "read") else b""
        except Exception:
            time.sleep(10)
    return 0, url, b""
def hd(href):
    h = href.split("/collections/")[-1].split("?")[0].split("#")[0]
    return urllib.parse.unquote(h).lower()
def txt(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s)).split() and " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split()) or ""
for i, (h, pfad) in enumerate(handles):
    if h in fertig:
        continue
    st, final, body = holen(f"https://luxestyle.ch/collections/{h}")
    t = body.decode("utf-8", "replace")
    f = " ".join(t.split())
    grid = re.search(r'<ul id="lx-welten-grid-[^"]*" class="([^"]*)"', f)
    kacheln = []
    for m in re.finditer(r'<a class="lx-welten__card[^"]*" href="([^"]+)"[^>]*>(.*?)</a>', f):
        inner = m.group(2)
        img = re.search(r'<img src="([^"]+)"', inner)
        tit = re.search(r'<span class="lx-welten__card-title">(.*?)</span>', inner)
        ib = img.group(1).split("?")[0].split("/")[-1] if img else ""
        kacheln.append([hd(m.group(1)), txt(tit.group(1)) if tit else "", ib])
    knopf = re.search(r'<button type="button" id="lx-welten-mehr-[^"]*"[^>]*>(.*?)</button>', f)
    sib = re.search(r'lx-collection-details__siblings(.*?)</ul>', f)
    geschw = [[hd(a), txt(b)] for a, b in re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', sib.group(1))] if sib else []
    pf = re.search(r'<nav class="lx-kp__pfad"[^>]*>(.*?)</nav>', f)
    ld = re.search(r'"@type":\s*"BreadcrumbList".*?\]', f)
    zeile = {"h": h, "menuepfad": pfad, "status": st, "final": final.replace("https://luxestyle.ch", ""), "bytes": len(body),
             "liquid": t.count("Liquid error"), "h1n": len(re.findall(r"<h1[\s>]", t)),
             "noindex": 1 if re.search(r'<meta name="robots" content="[^"]*noindex', f) else 0,
             "karten": len(re.findall(r'class="product-card[" ]', t)),
             "grid": grid.group(1) if grid else None, "kacheln": kacheln, "knopf": txt(knopf.group(1)) if knopf else "",
             "geschw": geschw, "pfad": txt(pf.group(1)) if pf else "", "ld": ld.group(0) if ld else ""}
    out.write(json.dumps(zeile, ensure_ascii=False) + "\n"); out.flush()
    if i % 25 == 0:
        print(i, h, st, len(body), len(kacheln), flush=True)
    time.sleep(5)
print("FERTIG", flush=True)
