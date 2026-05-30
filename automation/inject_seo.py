#!/usr/bin/env python3
"""SEO depth for archive issue pages: topic-based "Weiterlesen" cross-links
and BreadcrumbList structured data.

Why: internal links between topically-related issues spread crawl/link equity
and give readers more entry points (lower bounce); BreadcrumbList JSON-LD lets
Google render breadcrumb rich results. Both are idempotent.

Run from repo root:  python3 automation/inject_seo.py
"""
import re
import html
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
SITE = "https://abannews.com"

H1_RE = re.compile(r'<h1 class="issue-title">(.*?)</h1>', re.S)
CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)"')
TOPIC_RE = re.compile(r'<span class="topic-badge">([^<]+)</span>')
DATE_META_RE = re.compile(r'<meta property="article:published_time" content="([^"]+)"')
CRUMB_RE = re.compile(r'<nav class="crumbs".*?<span>([^<]+)</span>\s*</nav>', re.S)
WD = {0: "Mo", 1: "Di", 2: "Mi", 3: "Do", 4: "Fr", 5: "Sa", 6: "So"}


def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip().lstrip("☕").strip()


def load_issues():
    items = []
    for p in sorted(ARCHIVE.glob("*.html")):
        t = p.read_text(encoding="utf-8")
        if '<article class="issue">' not in t:
            continue
        h1, canon, dm = H1_RE.search(t), CANON_RE.search(t), DATE_META_RE.search(t)
        if not (h1 and canon and dm):
            continue
        crumb = CRUMB_RE.search(t)
        items.append({
            "path": p,
            "url": canon.group(1),
            "title": clean(h1.group(1)),
            "topics": [x.strip() for x in TOPIC_RE.findall(t)],
            "date": dm.group(1),
            "label": clean(crumb.group(1)) if crumb else "Ausgabe",
        })
    return items


def short_date(iso):
    d = datetime.strptime(iso, "%Y-%m-%d")
    return f"{WD[d.weekday()]}, {d.strftime('%d.%m.%Y')}"


def related_for(issue, all_issues):
    others = [i for i in all_issues if i["url"] != issue["url"]]
    tset = set(issue["topics"])
    scored = sorted(
        others,
        key=lambda i: (len(tset & set(i["topics"])), i["date"]),
        reverse=True,
    )
    return scored[:3]


def related_block(issue, rel):
    lis = []
    for r in rel:
        href = r["url"].replace(SITE, "")  # root-relative internal link
        lis.append(
            f'<li><a href="{href}"><span class="rel-date">{short_date(r["date"])}</span> '
            f'<span class="rel-hook">{html.escape(r["title"])}</span></a></li>'
        )
    return (
        '    <section class="related-issues" aria-label="Weiterlesen">\n'
        '      <h2>Weiterlesen</h2>\n'
        '      <ul class="rel-list">' + "".join(lis) + "</ul>\n"
        "    </section>\n"
    )


def breadcrumb_ld(issue):
    label = html.escape(issue["label"])
    return (
        '  <script type="application/ld+json">\n'
        '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":'
        '[{"@type":"ListItem","position":1,"name":"Start","item":"' + SITE + '/"},'
        '{"@type":"ListItem","position":2,"name":"Archive","item":"' + SITE + '/archive/"},'
        '{"@type":"ListItem","position":3,"name":"' + label + '"}]}\n'
        "  </script>\n"
    )


def main():
    issues = load_issues()
    changed = 0
    for it in issues:
        t = it["path"].read_text(encoding="utf-8")
        orig = t

        # 1) related-issues section before the pager (idempotent-by-replace:
        #    strip any existing block first so re-runs refresh links/markup)
        t = re.sub(r'    <section class="related-issues".*?</section>\n\n?', "", t, flags=re.S)
        if '<nav class="pager"' in t:
            block = related_block(it, related_for(it, issues))
            t = t.replace('    <nav class="pager"', block + '\n    <nav class="pager"', 1)

        # 2) BreadcrumbList JSON-LD after the NewsArticle ld+json block (idempotent)
        if '"BreadcrumbList"' not in t:
            # insert right after the first ld+json </script>
            m = re.search(r'(application/ld\+json">.*?</script>\n)', t, re.S)
            if m:
                t = t[:m.end()] + breadcrumb_ld(it) + t[m.end():]

        if t != orig:
            it["path"].write_text(t, encoding="utf-8")
            changed += 1
    print(f"Issues gesamt: {len(issues)} · SEO neu angepasst: {changed}")


if __name__ == "__main__":
    main()
