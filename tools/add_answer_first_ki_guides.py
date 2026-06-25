#!/usr/bin/env python3
# Answer-First nur auf reine GUIDE-Seiten (ki-*.html ohne Tool-UI). Surfacet die
# echte erste FAQ-Antwort vor dem ersten <h2>. Idempotent (data-aban-answer).
import re, glob, os, html as _html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "data-aban-answer"
SKIP_PREFIX = ("ki-fuer-", "ki-sichtbarkeit", "ki-automation")
SKIP_EXACT = {"ki-themen.html"}
# Tool-Slugs hart ausschliessen (auch falls UI-Heuristik mal nicht greift)
TOOL_RE = re.compile(r"(rechner|generator|checker|detektor|studio|werkzeug|bingo|prompt-check)", re.I)
BOX = ('<p class="answer-first" {m} style="background:#fff7ed;border:1px solid #fed7aa;'
       'border-left:4px solid #d97706;border-radius:12px;padding:13px 16px;margin:0 0 18px;'
       'font-size:1.02rem"><strong>Auf einen Blick:</strong> {a}</p>\n')
FAQ_RE = re.compile(r"<details[^>]*>\s*<summary[^>]*>.*?</summary>\s*<p[^>]*>(.*?)</p>", re.I|re.S)
def has_tool(h):
    return bool(re.search(r'/api/|<textarea|id="result"|onclick=', h, re.I))
def first_answer(h):
    m = FAQ_RE.search(h)
    if not m: return ""
    return re.sub(r"\s+"," ", re.sub(r"<[^>]+>","", m.group(1))).strip()
def main():
    n=0; done=[]
    for p in sorted(glob.glob(os.path.join(ROOT,"ki-*.html"))):
        name=os.path.basename(p)
        if name in SKIP_EXACT or name.startswith(SKIP_PREFIX) or TOOL_RE.search(name): continue
        h=open(p,encoding="utf-8",errors="ignore").read()
        if MARK in h or has_tool(h): continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',h,re.I): continue
        ans=first_answer(h)
        if not ans or len(ans)<40: continue
        m=re.search(r"<h2\b",h,re.I)
        if not m: continue
        open(p,"w",encoding="utf-8").write(h[:m.start()]+BOX.format(m=MARK,a=_html.escape(ans,quote=False))+h[m.start():])
        n+=1; done.append(name)
    print(f"✔ {n} Guide-Seiten:", ", ".join(done[:40]))
main()
