#!/usr/bin/env python3
# Ergaenzt das bestehende Article-JSON-LD (data-aban-article) um speakable
# (zeigt auf H1 + .answer-first = die zitierfaehige Kern-Antwort). Idempotent.
import re, glob, os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    pats = ["*-kaufen-schweiz.html", "ki-fuer-*.html", "ki-*.html", os.path.join("en","*.html")]
    files = []
    for p in pats: files += glob.glob(os.path.join(ROOT, p))
    n = 0
    for path in sorted(set(files)):
        h = open(path, encoding="utf-8", errors="ignore").read()
        m = re.search(r'(<script[^>]+data-aban-article>)(.*?)(</script>)', h, re.S)
        if not m: continue
        try: ld = json.loads(m.group(2))
        except Exception: continue
        if "speakable" in ld: continue
        sel = ["h1"]
        if 'class="answer-first"' in h or "answer-first" in h: sel.append(".answer-first")
        ld["speakable"] = {"@type": "SpeakableSpecification", "cssSelector": sel}
        new = m.group(1) + json.dumps(ld, ensure_ascii=False) + m.group(3)
        h = h[:m.start()] + new + h[m.end():]
        open(path, "w", encoding="utf-8").write(h)
        n += 1
    print(f"✔ speakable ergaenzt auf {n} Seiten")
main()
