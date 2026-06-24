#!/usr/bin/env python3
# =============================================================================
#  build_feed.py — erzeugt feed.xml (RSS 2.0) aus den Newsletter-Ausgaben in archive/
# -----------------------------------------------------------------------------
#  Echte Distribution + Discoverability: RSS-Reader, Blogtrottr/IFTTT, AI-/RSS-
#  Aggregatoren können abonnieren; <link rel="alternate"> macht den Feed auffindbar.
#  Liest Titel/Beschreibung aus jeder archive/NNN-YYYY-MM-DD-slug.html, Datum aus
#  dem Dateinamen. Idempotent — läuft im Build (build-pages.sh) automatisch mit.
# =============================================================================
import re, glob, os, html
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, "archive")
OUT = os.path.join(ROOT, "feed.xml")
SITE = "https://abannews.com"
TZ = timezone(timedelta(hours=2))  # CH-Sommerzeit (Näherung), nur für pubDate-Offset

NAME_RE = re.compile(r"^(\d+)-(\d{4})-(\d{2})-(\d{2})-(.+)\.html$")


def field(h, pat):
    m = re.search(pat, h, re.I | re.S)
    if not m:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()


def main():
    items = []
    for p in glob.glob(os.path.join(ARCHIVE, "*.html")):
        name = os.path.basename(p)
        m = NAME_RE.match(name)
        if not m:
            continue
        num, y, mo, d, slug = m.groups()
        try:
            h = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I):
            continue
        title = field(h, r"<title>(.*?)</title>")
        title = re.split(r"\s*\|\s*aban", title)[0].strip() or f"Ausgabe {num}"
        desc = field(h, r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']')
        try:
            dt = datetime(int(y), int(mo), int(d), 8, 0, 0, tzinfo=TZ)
        except ValueError:
            continue
        items.append({
            "num": int(num), "title": title, "desc": desc,
            "url": f"{SITE}/archive/{name}", "dt": dt,
        })

    items.sort(key=lambda x: (x["dt"], x["num"]), reverse=True)

    last = items[0]["dt"] if items else datetime.now(TZ)
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "<channel>",
        "<title>aban news</title>",
        f"<link>{SITE}/</link>",
        "<description>Der ehrliche, Anti-Hype-KI-Newsletter für Selbstständige &amp; KMU in der Schweiz/DACH.</description>",
        "<language>de-CH</language>",
        f"<lastBuildDate>{format_datetime(last)}</lastBuildDate>",
        f'<atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>',
    ]
    for it in items:
        parts += [
            "<item>",
            f"<title>{html.escape(it['title'])}</title>",
            f"<link>{html.escape(it['url'])}</link>",
            f'<guid isPermaLink="true">{html.escape(it["url"])}</guid>',
            f"<pubDate>{format_datetime(it['dt'])}</pubDate>",
            f"<description>{html.escape(it['desc'])}</description>" if it["desc"] else "",
            "</item>",
        ]
    parts += ["</channel>", "</rss>", ""]
    open(OUT, "w", encoding="utf-8").write("\n".join(p for p in parts if p != ""))
    print(f"✔ feed.xml erzeugt: {len(items)} Ausgaben")


if __name__ == "__main__":
    main()
