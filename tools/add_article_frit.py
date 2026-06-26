#!/usr/bin/env python3
# Article+Speakable auf FR/IT-Answer-First-Seiten (data-aban-answer ohne data-aban-article).
# Echte git-Daten, inLanguage fr-CH/it-CH, speakable->h1+.answer-first. Idempotent.
import re, glob, os, json, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://abannews.com"; MARK = "data-aban-article"
def date_maps():
    out = subprocess.run(["git","log","--format=C%cs","--name-only","--no-renames","--","fr/*.html","it/*.html"],
                         cwd=ROOT, capture_output=True, text=True, timeout=300).stdout
    mod, pub, cur = {}, {}, ""
    for line in out.splitlines():
        if line.startswith("C") and re.match(r"C\d{4}-\d{2}-\d{2}$", line): cur=line[1:]
        elif line.strip() and cur:
            f=line.strip()
            if f not in mod: mod[f]=cur
            pub[f]=cur
    return mod, pub
def h1(h):
    m=re.search(r"<h1[^>]*>(.*?)</h1>",h,re.I|re.S)
    return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",m.group(1))).strip() if m else ""
def main():
    mod,pub=date_maps(); n=0
    for lang in ("fr","it"):
        for path in sorted(glob.glob(os.path.join(ROOT,lang,"*.html"))):
            rel=f"{lang}/"+os.path.basename(path)
            h=open(path,encoding="utf-8",errors="ignore").read()
            if MARK in h or "data-aban-answer" not in h: continue
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',h,re.I): continue
            m=mod.get(rel); pb=pub.get(rel); t=h1(h)
            if not (m and pb and t): continue
            sel=["h1"]+([".answer-first"] if "answer-first" in h else [])
            ld={"@context":"https://schema.org","@type":"Article","headline":t[:110],
                "datePublished":pb,"dateModified":m,"author":{"@id":SITE+"/#person"},
                "publisher":{"@id":SITE+"/#org"},"mainEntityOfPage":f"{SITE}/{rel}",
                "inLanguage":lang+"-CH","speakable":{"@type":"SpeakableSpecification","cssSelector":sel}}
            pos=h.lower().rfind("</head>")
            if pos<0: continue
            block='<script type="application/ld+json" '+MARK+'>'+json.dumps(ld,ensure_ascii=False)+'</script>'
            open(path,"w",encoding="utf-8").write(h[:pos]+block+"\n"+h[pos:]); n+=1
    print(f"✔ Article+Speakable auf {n} FR/IT-Seiten")
main()
