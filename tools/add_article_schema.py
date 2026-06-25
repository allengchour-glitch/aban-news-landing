#!/usr/bin/env python3
# Fuegt Content-Seiten ein Article-JSON-LD mit echten git-Daten hinzu
# (datePublished=erster Commit, dateModified=letzter), verknuepft mit Person/Org.
# Staerkt Freshness + Attribution fuer AI-Zitate. Idempotent (data-aban-article).
import re, glob, os, json, subprocess, html as _html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://abannews.com"
MARK = "data-aban-article"

def date_maps():
    out = subprocess.run(["git","log","--format=C%cs","--name-only","--no-renames","--","*-kaufen-schweiz.html","ki-fuer-*.html"],
                         cwd=ROOT, capture_output=True, text=True, timeout=300).stdout
    mod, pub, cur = {}, {}, ""
    for line in out.splitlines():
        if line.startswith("C") and re.match(r"C\d{4}-\d{2}-\d{2}$", line):
            cur = line[1:]
        elif line.strip() and cur:
            f = line.strip()
            if f not in mod: mod[f] = cur   # erste Sichtung = neuester
            pub[f] = cur                     # letzte Sichtung = aeltester
    return mod, pub

def h1(h):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.I|re.S)
    if not m: return ""
    return re.sub(r"\s+"," ", re.sub(r"<[^>]+>","",m.group(1))).strip()

def main():
    mod, pub = date_maps()
    patterns = ["*-kaufen-schweiz.html", "ki-fuer-*.html"]
    files = []
    for p in patterns: files += glob.glob(os.path.join(ROOT, p))
    n = 0
    for path in sorted(set(files)):
        name = os.path.basename(path)
        h = open(path, encoding="utf-8", errors="ignore").read()
        if MARK in h: continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I): continue
        m = mod.get(name); pb = pub.get(name)
        title = h1(h)
        if not (m and pb and title): continue
        ld = {"@context":"https://schema.org","@type":"Article",
              "headline": title[:110],
              "datePublished": pb, "dateModified": m,
              "author": {"@id": SITE+"/#person"},
              "publisher": {"@id": SITE+"/#org"},
              "mainEntityOfPage": f"{SITE}/{name}",
              "inLanguage": "de-CH"}
        block = '<script type="application/ld+json" '+MARK+'>'+json.dumps(ld, ensure_ascii=False)+'</script>'
        pos = h.lower().rfind("</head>")
        if pos < 0: continue
        open(path,"w",encoding="utf-8").write(h[:pos]+block+"\n"+h[pos:])
        n += 1
    print(f"✔ Article-Schema auf {n} Content-Seiten")
main()
