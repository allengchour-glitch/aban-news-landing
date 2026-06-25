#!/usr/bin/env python3
# =============================================================================
#  link_audit.py — schnelles Static-Site-QA: interne 404s, fehlende Pflicht-Metas,
#  kaputte JSON-LD. Read-only (aendert nichts). Exit 1 bei Fehlern (CI-tauglich).
#  Aufruf:  python3 tools/link_audit.py
# =============================================================================
import re, glob, os, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def is_noindex(h): return bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I))

def main():
    files = {os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.html"))}
    missing_link = {}   # page -> [dead targets]
    no_canonical, no_viewport, no_title, bad_ld = [], [], [], []
    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    for p in pages:
        name = os.path.basename(p)
        h = open(p, encoding="utf-8", errors="ignore").read()
        nx = is_noindex(h)
        # interne Links auf Root-HTML pruefen
        dead = []
        for href in set(re.findall(r'href="/([a-z0-9][a-z0-9\-]*\.html)"', h, re.I)):
            if href not in files:
                dead.append(href)
        if dead: missing_link[name] = sorted(dead)
        # JSON-LD validieren
        for block in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', h, re.S|re.I):
            try: json.loads(block)
            except Exception: bad_ld.append(name); break
        if nx: continue
        if not re.search(r'rel=["\']canonical["\']', h, re.I): no_canonical.append(name)
        if not re.search(r'name=["\']viewport["\']', h, re.I): no_viewport.append(name)
        if not re.search(r"<title>\s*\S", h, re.I): no_title.append(name)
    errors = sum(len(v) for v in missing_link.values()) + len(bad_ld)
    print(f"Geprueft: {len(pages)} Root-HTML")
    print(f"  interne 404-Links : {sum(len(v) for v in missing_link.values())} (auf {len(missing_link)} Seiten)")
    print(f"  kaputte JSON-LD   : {len(bad_ld)}")
    print(f"  ohne canonical    : {len(no_canonical)}")
    print(f"  ohne viewport     : {len(no_viewport)}")
    print(f"  ohne <title>      : {len(no_title)}")
    for pg, dead in list(missing_link.items())[:20]:
        print(f"   404 in {pg}: {', '.join(dead)}")
    for pg in bad_ld[:20]: print(f"   bad JSON-LD: {pg}")
    sys.exit(1 if errors else 0)

main()
