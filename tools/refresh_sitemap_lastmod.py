#!/usr/bin/env python3
# Setzt <lastmod> jeder Sitemap-URL auf das echte git-Last-Commit-Datum der
# lokalen Datei. Baut die Datums-Map in EINEM git-Durchlauf (schnell).
import re, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SM = os.path.join(ROOT, "sitemap.xml")

def build_map():
    out = subprocess.run(["git","log","--format=C%cs","--name-only","--no-renames"],
                         cwd=ROOT, capture_output=True, text=True, timeout=120).stdout
    m, cur = {}, ""
    for line in out.splitlines():
        if line.startswith("C") and re.match(r"C\d{4}-\d{2}-\d{2}$", line):
            cur = line[1:]
        elif line.strip() and cur:
            f = line.strip()
            if f not in m:   # erste Sichtung = neuester Commit (git log ist neueste-zuerst)
                m[f] = cur
    return m

def local(loc):
    p = loc.replace("https://abannews.com/","").split("?")[0].split("#")[0]
    if p == "": p = "index.html"
    if p.endswith("/"): p += "index.html"
    return p

def main():
    dates = build_map()
    s = open(SM, encoding="utf-8").read()
    blocks = re.split(r"(?=<url>)", s)
    upd = 0
    for i, b in enumerate(blocks):
        m = re.search(r"<loc>([^<]+)</loc>", b)
        if not m: continue
        rel = local(m.group(1))
        d = dates.get(rel, "")
        if not re.match(r"\d{4}-\d{2}-\d{2}$", d or ""): continue
        if "<lastmod>" in b:
            nb = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{d}</lastmod>", b, count=1)
        else:
            nb = re.sub(r"(</loc>)", rf"\1\n    <lastmod>{d}</lastmod>", b, count=1)
        if nb != b: upd += 1; blocks[i] = nb
    open(SM, "w", encoding="utf-8").write("".join(blocks))
    print(f"✔ {upd} lastmod aktualisiert/ergaenzt (Map: {len(dates)} Dateien)")
main()
