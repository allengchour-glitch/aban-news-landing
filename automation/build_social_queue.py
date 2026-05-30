#!/usr/bin/env python3
"""Build a platform-agnostic social-post queue from the archive issues.

Output: automation/social_queue.json — a list of items, newest first, each:
  {id, url, title, short, long}
- short  : <=260 chars (fits X 280 / Bluesky 300 incl. URL)
- long   : <=480 chars (fits Mastodon 500; also used for Telegram/LinkedIn)

Voice stays anti-hype/du. No tracking. Run from repo root:
    python3 automation/build_social_queue.py
"""
import re
import json
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
OUT = ROOT / "automation" / "social_queue.json"

ISSUE_RE = re.compile(r"^(\d{3})-(\d{4}-\d{2}-\d{2})-")
H1_RE = re.compile(r'<h1 class="issue-title">(.*?)</h1>', re.S)
CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)"')
# first paragraph after the "Einstieg" heading = the hook
EINSTIEG_RE = re.compile(r'<h2>Einstieg</h2>\s*<p>(.*?)</p>', re.S)
HASHTAGS = "#KI #DACH"


def text_of(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def first_sentence(s, limit):
    s = re.sub(r"\s+", " ", s).strip()
    # cut at sentence end if reasonably early, else hard trim on word boundary
    m = re.search(r"(.+?[.!?])(\s|$)", s)
    cand = m.group(1) if m and len(m.group(1)) <= limit else s
    if len(cand) > limit:
        cand = cand[:limit].rsplit(" ", 1)[0].rstrip(".,;: ") + " …"
    return cand


def build():
    items = []
    for p in sorted(ARCHIVE.glob("*.html")):
        m = ISSUE_RE.match(p.name)
        if not m:
            continue
        t = p.read_text(encoding="utf-8")
        h1, canon = H1_RE.search(t), CANON_RE.search(t)
        if not (h1 and canon):
            continue
        title = text_of(h1.group(1)).lstrip("☕").strip()
        url = canon.group(1)
        eins = EINSTIEG_RE.search(t)
        hook_src = text_of(eins.group(1)) if eins else title

        # long: hook (trimmed) + url + hashtags, <=480
        hook_long = first_sentence(hook_src, 330)
        long = f"{hook_long}\n\n{url}\n\n{HASHTAGS}"
        if len(long) > 480:
            hook_long = first_sentence(hook_src, 330 - (len(long) - 480))
            long = f"{hook_long}\n\n{url}\n\n{HASHTAGS}"

        # short: hook trimmed so hook + newline + url <= 260
        budget = 260 - (len(url) + 1)
        hook_short = first_sentence(hook_src, max(40, budget))
        short = f"{hook_short}\n{url}"
        if len(short) > 260:
            short = short[:260]

        items.append({
            "id": m.group(1),
            "date": m.group(2),
            "url": url,
            "title": title,
            "short": short,
            "long": long,
        })

    items.sort(key=lambda i: (i["date"], i["id"]), reverse=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"social_queue.json: {len(items)} Posts (neueste zuerst)")


if __name__ == "__main__":
    build()
