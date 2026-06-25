#!/usr/bin/env python3
# =============================================================================
#  add_answer_first_branchen.py — sichtbarer "Auf einen Blick"-Block auf ki-fuer-*
# -----------------------------------------------------------------------------
#  Surfacet die bereits vorhandene, echte erste FAQ-Antwort jeder Branchen-Seite
#  als sichtbaren Antwort-Block direkt vor dem ersten <h2> (statt nur im
#  <details>-Accordion versteckt) -> besser zitierbar fuer Featured Snippets +
#  AI-Engines. KEIN generiertes Boilerplate (nur vorhandener Text wird sichtbar
#  gemacht). Idempotent (Marker data-aban-answer). Aufruf: python3 tools/add_answer_first_branchen.py
# =============================================================================
import re, glob, os, html as _html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "data-aban-answer"
BOX = ('<p class="answer-first" {mark} style="background:#fff7ed;border:1px solid #fed7aa;'
       'border-left:4px solid #d97706;border-radius:12px;padding:13px 16px;margin:0 0 18px;'
       'font-size:1.02rem"><strong>Auf einen Blick:</strong> {ans}</p>\n')

# erste FAQ-Antwort: <details ...><summary ...>Q</summary><p ...>ANSWER</p></details>
FAQ_RE = re.compile(r"<details[^>]*>\s*<summary[^>]*>.*?</summary>\s*<p[^>]*>(.*?)</p>", re.I | re.S)


def first_answer(h):
    m = FAQ_RE.search(h)
    if not m:
        return ""
    a = re.sub(r"<[^>]+>", "", m.group(1))      # inner tags raus
    a = re.sub(r"\s+", " ", a).strip()
    return a


def main():
    changed = 0
    for p in sorted(glob.glob(os.path.join(ROOT, "ki-fuer-*.html"))):
        h = open(p, encoding="utf-8", errors="ignore").read()
        if MARK in h:
            continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I):
            continue
        ans = first_answer(h)
        if not ans or len(ans) < 40:            # nur sinnvolle Antworten
            continue
        # Einfügen direkt vor dem ersten <h2 (= Start des Inhalts nach dem Intro)
        m = re.search(r"<h2\b", h, re.I)
        if not m:
            continue
        box = BOX.format(mark=MARK, ans=_html.escape(ans, quote=False))
        h = h[:m.start()] + box + h[m.start():]
        open(p, "w", encoding="utf-8").write(h)
        changed += 1
    print(f"✔ Answer-First-Block ergänzt auf {changed} Branchen-Seiten")


if __name__ == "__main__":
    main()
