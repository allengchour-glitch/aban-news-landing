#!/usr/bin/env python3
# Answer-First auf FR/IT-Guide-Seiten (fr/*.html "En bref :", it/*.html "In breve:").
# Handhabt FAQ-Antwort in <p> ODER <div class="a">. Tool-Seiten ausgeschlossen. Idempotent.
import re, glob, os, html as _html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "data-aban-answer"
TOOL_RE = re.compile(r"(rechner|generator|checker|detektor|studio|werkzeug|calculator|bingo|buch|prompt-check)", re.I)
LABEL = {"fr": "En bref :", "it": "In breve:"}
BOX = ('<p class="answer-first" {m} style="background:#fff7ed;border:1px solid #fed7aa;'
       'border-left:4px solid #d97706;border-radius:12px;padding:13px 16px;margin:0 0 18px;'
       'font-size:1.02rem"><strong>{lab}</strong> {a}</p>\n')
FAQ_RE = re.compile(r'<details[^>]*>\s*<summary[^>]*>.*?</summary>\s*(?:<p[^>]*>|<div[^>]*class="a"[^>]*>)(.*?)(?:</p>|</div>)', re.I|re.S)
def has_tool(h): return bool(re.search(r'/api/|<textarea|id="result"|onclick=', h, re.I))
def first_answer(h):
    m=FAQ_RE.search(h)
    return re.sub(r"\s+"," ", re.sub(r"<[^>]+>","",m.group(1))).strip() if m else ""
def main():
    n=0
    for lang in ("fr","it"):
        for p in sorted(glob.glob(os.path.join(ROOT,lang,"*.html"))):
            name=os.path.basename(p)
            if TOOL_RE.search(name): continue
            h=open(p,encoding="utf-8",errors="ignore").read()
            if MARK in h or has_tool(h): continue
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',h,re.I): continue
            ans=first_answer(h)
            if not ans or len(ans)<40: continue
            m=re.search(r"<h2\b",h,re.I)
            if not m: continue
            box=BOX.format(m=MARK,lab=LABEL[lang],a=_html.escape(ans,quote=False))
            open(p,"w",encoding="utf-8").write(h[:m.start()]+box+h[m.start():]); n+=1
    print(f"✔ Answer-First auf {n} FR/IT-Seiten")
main()
