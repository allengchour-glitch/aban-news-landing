#!/usr/bin/env python3
"""Aban News — KI-News-Aggregator (Rohmaterial zum Kuratieren).

Sammelt aktuelle Meldungen aus seriösen RSS/Atom-Feeds, filtert nach KI-Relevanz,
dedupliziert und legt sie als kuratierbare Markdown-Liste vor. ERZEUGT KEINE
fertigen News und erfindet nichts — es verlinkt nur echte Quellen. DU wählst aus,
prüfst und schreibst die Ausgabe in deiner Stimme.

Pure stdlib (urllib + Regex-Parsing, kein feedparser nötig).

Nutzung:
    python automation/news_aggregator.py                 # -> automation/news-roh-JJJJ-MM-TT.md
    python automation/news_aggregator.py --max 8          # max Einträge pro Feed
    python automation/news_aggregator.py --days 7         # nur Einträge der letzten N Tage (wenn Datum lesbar)
"""

from __future__ import annotations

import argparse
import html
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

FEEDS = {
    "OpenAI": "https://openai.com/blog/rss.xml",
    "Google AI": "https://blog.google/technology/ai/rss/",
    "Hugging Face": "https://huggingface.co/blog/feed.xml",
    "TechCrunch AI": "https://techcrunch.com/category/artificial-intelligence/feed/",
    "VentureBeat AI": "https://venturebeat.com/category/ai/feed/",
    "MIT Tech Review": "https://www.technologyreview.com/feed/",
    "heise": "https://www.heise.de/rss/heise-atom.xml",
    # Weitere etablierte DACH-Quellen (echte RSS/Atom-Feeds, breit -> KI-Filter greift):
    "Golem": "https://rss.golem.de/rss.php?feed=RSS2.0",
    "t3n": "https://t3n.de/rss.xml",
    "netzpolitik.org": "https://netzpolitik.org/feed/",
    "BSI": "https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed.xml",
}

# KI-Relevanz: nur Einträge behalten, die thematisch passen (heise/MIT sind breit).
KEYWORDS = re.compile(
    r"\b(ki|k\.i\.|künstliche intelligenz|ai|artificial intelligence|llm|gpt|chatgpt|"
    r"claude|gemini|mistral|openai|anthropic|machine learning|maschinelles lernen|"
    r"neural|deepseek|copilot|agent|genai|generative)\b", re.IGNORECASE)

HERE = Path(__file__).resolve().parent


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "aban-news-bot/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read().decode("utf-8", "ignore")


def _tag(block: str, *names: str) -> str:
    for n in names:
        m = re.search(rf"<{n}[^>]*>(.*?)</{n}>", block, re.S | re.I)
        if m:
            t = m.group(1)
            t = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", t, flags=re.S)
            t = re.sub(r"<[^>]+>", "", t)
            return html.unescape(t).strip()
    return ""


def _link(block: str) -> str:
    # RSS: <link>URL</link> · Atom: <link href="URL"/>
    m = re.search(r"<link[^>]*href=[\"']([^\"']+)[\"']", block, re.I)
    if m:
        return m.group(1)
    return _tag(block, "link")


def parse(xml: str, source: str, max_items: int) -> list[dict]:
    blocks = re.findall(r"<(?:item|entry)\b.*?</(?:item|entry)>", xml, re.S | re.I)
    out = []
    for b in blocks[: max_items * 3]:
        title = _tag(b, "title")
        if not title:
            continue
        desc = _tag(b, "description", "summary", "content")
        desc = re.sub(r"https?://\S+", "", desc).strip()  # Rest-URLs/Bildpfade raus
        link = _link(b)
        pub = _tag(b, "pubDate", "published", "updated")
        hay = f"{title} {desc}"
        # heise/MIT/TechCrunch breit -> KI-Filter; spezialisierte AI-Feeds immer durch
        ai_feed = source in ("OpenAI", "Google AI", "Hugging Face", "TechCrunch AI", "VentureBeat AI")
        if not ai_feed and not KEYWORDS.search(hay):
            continue
        out.append({"source": source, "title": title,
                    "desc": (desc[:200] + "…") if len(desc) > 200 else desc,
                    "link": link, "pub": pub})
        if len(out) >= max_items:
            break
    return out


def load_niche(niche: str):
    """data/niches.json (oder .example) lesen → (feeds_dict|None, keyword_regex|None, name)."""
    import json
    for fn in ("niches.json", "niches.example.json"):
        p = HERE.parent / "data" / fn
        if p.exists():
            for e in json.loads(p.read_text(encoding="utf-8")):
                if e.get("niche") == niche:
                    feeds = {f"Quelle {i+1}": u for i, u in enumerate(e.get("feeds", []))} or None
                    kws = e.get("keywords", [])
                    rx = re.compile("(" + "|".join(re.escape(k) for k in kws) + ")", re.I) if kws else None
                    return feeds, rx, e.get("name", niche)
    return None, None, niche


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=6, help="max Einträge pro Feed")
    ap.add_argument("--out", default=None, help="fester Ausgabepfad (sonst datiert)")
    ap.add_argument("--niche", default=None, help="Nischen-ID aus data/niches.json")
    args = ap.parse_args()

    feeds, niche_rx, niche_name = (FEEDS, None, "")
    if args.niche:
        nf, niche_rx, niche_name = load_niche(args.niche)
        if nf:
            feeds = nf

    all_items, seen = [], set()
    for source, url in feeds.items():
        try:
            items = parse(fetch(url), source, args.max)
        except Exception as ex:
            sys.stderr.write(f"  {source}: nicht erreichbar ({ex})\n")
            continue
        for it in items:
            if niche_rx and not niche_rx.search(f"{it['title']} {it['desc']}"):
                continue
            key = re.sub(r"\W+", "", it["title"].lower())[:60]
            if key and key not in seen:
                seen.add(key)
                all_items.append(it)

    if not all_items:
        sys.stderr.write("Keine Einträge gesammelt (Netzwerk/Nische zu eng?).\n")
        return 1

    today = date.today().isoformat()
    title = f"KI-News-Rohmaterial{(' — ' + niche_name) if args.niche else ''} — {today}"
    md = [f"# {title}",
          "",
          "> **Kuratier-Vorlage, KEINE fertige Ausgabe.** Echte Quellen, aggregiert. "
          "Wähle 3–5 relevante Meldungen, prüfe sie an der Quelle und schreibe sie in "
          "deiner Stimme (kein Hype). Dann via Werkbank/beehiiv versenden.",
          ""]
    by_src = {}
    for it in all_items:
        by_src.setdefault(it["source"], []).append(it)
    for source, items in by_src.items():
        md.append(f"## {source}")
        for it in items:
            md.append(f"- [ ] **[{it['title']}]({it['link']})**"
                      + (f"  \n  _{it['pub']}_" if it["pub"] else ""))
            if it["desc"]:
                md.append(f"  {it['desc']}")
        md.append("")
    md.append("---")
    md.append(f"Gesammelt: {len(all_items)} Meldungen aus {len(by_src)} Quellen. "
              "Quellen immer gegenprüfen — Aggregation ersetzt keine Recherche.")

    default_name = f"news-roh-{args.niche}-{today}.md" if args.niche else f"news-roh-{today}.md"
    dst = Path(args.out) if args.out else HERE / default_name
    dst.write_text("\n".join(md), encoding="utf-8")
    print(f"Gesammelt: {len(all_items)} Meldungen aus {len(by_src)} Quellen "
          f"→ {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
