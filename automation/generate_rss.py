#!/usr/bin/env python3
"""Rebuild archive.rss from the published archive issues.

The feed previously held a single hand-written item pointing at preview.html,
so the 25 published issues were invisible to RSS readers. This regenerates the
feed from each issue's own metadata (title, canonical URL, date, description),
newest first. Run from repo root:  python3 automation/generate_rss.py
"""
import re
import html
from pathlib import Path
from datetime import datetime, timezone, timedelta
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
RSS = ROOT / "archive.rss"
SITE = "https://abannews.com"

ISSUE_RE = re.compile(r"^(\d{3})-(\d{4}-\d{2}-\d{2})-")
H1_RE = re.compile(r'<h1 class="issue-title">(.*?)</h1>', re.S)
CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)"')
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)"')

TZ = timezone(timedelta(hours=2))  # CEST, matches existing feed (+0200)


def rfc822(date_iso: str) -> str:
    dt = datetime.strptime(date_iso, "%Y-%m-%d").replace(hour=7, tzinfo=TZ)
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def text_of(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", raw)).strip().lstrip("☕").strip()


def main():
    items = []
    for path in sorted(ARCHIVE.glob("*.html")):
        m = ISSUE_RE.match(path.name)
        if not m:
            continue
        num, date_iso = m.group(1), m.group(2)
        t = path.read_text(encoding="utf-8")
        h1 = H1_RE.search(t)
        canon = CANON_RE.search(t)
        desc = DESC_RE.search(t)
        if not (h1 and canon):
            print(f"!! Metadaten fehlen in {path.name}, übersprungen")
            continue
        items.append({
            "num": num,
            "date": date_iso,
            "title": text_of(h1.group(1)),
            "link": canon.group(1),
            "desc": html.unescape(desc.group(1)) if desc else "",
        })

    # newest first
    items.sort(key=lambda i: (i["date"], i["num"]), reverse=True)
    newest = rfc822(items[0]["date"]) if items else rfc822("2026-05-27")
    # lastBuildDate == newest item, so it never predates the latest pubDate
    build = newest

    item_xml = []
    for it in items:
        item_xml.append(f'''    <item>
      <title>{escape(it["title"])}</title>
      <link>{escape(it["link"])}</link>
      <guid isPermaLink="true">{escape(it["link"])}</guid>
      <pubDate>{rfc822(it["date"])}</pubDate>
      <description><![CDATA[{it["desc"]}]]></description>
      <author>hallo@abannews.com (Aban)</author>
      <category>AI</category>
      <category>DACH</category>
    </item>''')

    feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>aban news</title>
    <link>{SITE}</link>
    <description>Täglicher AI-Newsletter für DACH, Mo–Fr morgens, 3-5 Min, kein Hype.</description>
    <language>de-DE</language>
    <copyright>Allen Chour, 2026</copyright>
    <managingEditor>hallo@abannews.com (Aban)</managingEditor>
    <webMaster>hallo@abannews.com (Aban)</webMaster>
    <pubDate>{newest}</pubDate>
    <lastBuildDate>{build}</lastBuildDate>
    <category>Künstliche Intelligenz</category>
    <category>Newsletter</category>
    <generator>aban news archive RSS generator</generator>
    <atom:link href="{SITE}/archive.rss" rel="self" type="application/rss+xml"/>
{chr(10).join(item_xml)}
  </channel>
</rss>
'''
    RSS.write_text(feed, encoding="utf-8")
    print(f"RSS neu gebaut: {len(items)} Items, neuestes {items[0]['date']}")


if __name__ == "__main__":
    main()
