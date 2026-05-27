#!/usr/bin/env python3
"""
aban news — Archive Static-Site Generator
Converts Markdown newsletter issues into browsable HTML archive pages.

Inputs:
    ~/OneDrive/Dokumente/Claude/Projects/ki news letter/ausgaben/*.md
    (ausgabe-XXX-*, probe-*, ultimate-probe-* patterns)

Outputs:
    ~/aban-deploy/archive/index.html       (browser with filter + search)
    ~/aban-deploy/archive/<slug>.html       (one per issue)
    ~/aban-deploy/sitemap.xml              (refreshed with archive URLs)
    ~/aban-deploy/archive.html             (rewritten as bridge to /archive/)

Constraints:
    - Vanilla JS only (no CDN, no external deps at runtime)
    - System-font stack, no Google Fonts
    - Mobile-first
    - DSGVO-friendly (no tracking)
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional
from xml.sax.saxutils import escape as xml_escape

import markdown  # type: ignore

# -------------------- paths --------------------
HOME = Path.home()
REPO = HOME / "aban-deploy"
SOURCE_DIR = HOME / "OneDrive" / "Dokumente" / "Claude" / "Projects" / "ki news letter" / "ausgaben"
ARCHIVE_DIR = REPO / "archive"
SITEMAP = REPO / "sitemap.xml"
ROOT_ARCHIVE = REPO / "archive.html"

SITE_URL = "https://abannews.com"

WEEKDAY_DE = {
    "mo": "Montag", "di": "Dienstag", "mi": "Mittwoch",
    "do": "Donnerstag", "fr": "Freitag", "sa": "Samstag", "so": "Sonntag",
}
MONTH_DE = {
    1: "Januar", 2: "Februar", 3: "März", 4: "April", 5: "Mai", 6: "Juni",
    7: "Juli", 8: "August", 9: "September", 10: "Oktober", 11: "November", 12: "Dezember",
}


# -------------------- data --------------------
@dataclass
class Issue:
    src_path: Path
    raw_md: str
    is_probe: bool
    is_ultimate: bool
    number: Optional[int]
    weekday_code: Optional[str]     # "mo", "di", ...
    date: datetime
    headline: str                   # first H2-with-emoji-style (e.g. "☕ China zerlegt …")
    hook: str                       # headline without leading emoji
    preview: str                    # first 220-280 chars of body
    word_count: int
    read_min: int
    topics: list[str] = field(default_factory=list)
    slug: str = ""                  # filename slug (no ext)
    out_path: Path = field(init=False)

    def __post_init__(self):
        self.out_path = ARCHIVE_DIR / f"{self.slug}.html"

    @property
    def url(self) -> str:
        return f"{SITE_URL}/archive/{self.slug}.html"

    @property
    def date_iso(self) -> str:
        return self.date.strftime("%Y-%m-%d")

    @property
    def date_human(self) -> str:
        wd = WEEKDAY_DE.get(self.weekday_code or "", self.date.strftime("%A"))
        return f"{wd}, {self.date.day}. {MONTH_DE[self.date.month]} {self.date.year}"

    @property
    def date_short(self) -> str:
        wd_short = (self.weekday_code or "").capitalize()
        return f"{wd_short}, {self.date.day:02d}.{self.date.month:02d}.{self.date.year}"

    @property
    def title(self) -> str:
        if self.number is not None:
            return f"Ausgabe {self.number:03d} — {self.hook}"
        if self.is_ultimate:
            return f"Ultimate-Probe — {self.hook}"
        return f"Probe-Ausgabe — {self.hook}"

    @property
    def kind_label(self) -> str:
        if self.is_ultimate: return "Ultimate-Probe"
        if self.is_probe:    return "Probe"
        return "Ausgabe"


# -------------------- parsing --------------------
FILENAME_RX = re.compile(
    r"^ausgabe-(?P<num>\d{3})-(?P<wd>[a-z]{2})-(?P<date>\d{4}-\d{2}-\d{2})\.md$"
)
PROBE_RX = re.compile(r"^probe-(?P<date>\d{4}-\d{2}-\d{2})\.md$")
ULTIMATE_RX = re.compile(r"^ultimate-probe-(?P<date>\d{4}-\d{2}-\d{2})\.md$")

# Headline patterns:
#   "## ☕ Etwas …"  (first H2 in document is the issue headline)
HEADLINE_RX = re.compile(r"^##\s+(.+?)\s*$", re.M)
# Words for read-time
WORD_RX = re.compile(r"\w+", re.UNICODE)
# Frontmatter blockquote header
SELFCHECK_RX = re.compile(r"<self_check>.*?</self_check>", re.S)


def detect_topics(md_text: str, filename: str) -> list[str]:
    """Heuristic topic tags based on filename and content keywords."""
    t = []
    lower = md_text.lower()
    fname = filename.lower()
    if "werkzeugkasten" in fname or "tool des tages" in lower or "freitag" in lower or fname.endswith("fr-" + filename.split("fr-",1)[-1]) if "fr-" in fname else False:
        pass
    # weekday rules
    if "-mo-" in fname:        t.append("News-Recap")
    elif "-di-" in fname:      t.append("Tool-Test")
    elif "-mi-" in fname:      t.append("Anti-Hype")
    elif "-do-" in fname:      t.append("DACH")
    elif "-fr-" in fname:      t.append("Werkzeugkasten")
    # content
    if "dsg" in lower or "datenschutz" in lower:              t.append("Datenschutz")
    if "openai" in lower or "anthropic" in lower or "claude" in lower or "deepseek" in lower:
        t.append("LLM-News")
    if "tool des tages" in lower:                             t.append("Tools")
    if "prompt" in lower:                                     t.append("Prompts")
    if "probe" in fname:                                      t.append("Probe")
    # dedupe, preserve order
    seen, out = set(), []
    for x in t:
        if x not in seen:
            seen.add(x); out.append(x)
    return out


def parse_issue(path: Path) -> Optional[Issue]:
    name = path.name
    raw = path.read_text(encoding="utf-8")

    m_ausg = FILENAME_RX.match(name)
    m_prob = PROBE_RX.match(name)
    m_ult  = ULTIMATE_RX.match(name)

    if m_ausg:
        number = int(m_ausg["num"])
        wd = m_ausg["wd"]
        date = datetime.strptime(m_ausg["date"], "%Y-%m-%d")
        is_probe = False
        is_ult = False
    elif m_ult:
        number = None
        wd = None
        date = datetime.strptime(m_ult["date"], "%Y-%m-%d")
        is_probe = True
        is_ult = True
    elif m_prob:
        number = None
        wd = None
        date = datetime.strptime(m_prob["date"], "%Y-%m-%d")
        is_probe = True
        is_ult = False
    else:
        return None

    # Find headline (first H2)
    headline = ""
    for match in HEADLINE_RX.finditer(raw):
        cand = match.group(1).strip()
        # skip "Einstieg", "Was heute zählt", etc. — but first H2 IS the issue headline in this format
        if cand and not cand.lower().startswith(("einstieg", "was heute", "tool des", "heute aus", "deine 60", "tool d", "outro", "bonus", "heute ausprob", "der detail", "kontext", "self_check", "länge")):
            headline = cand
            break
    if not headline:
        # fallback to first H1 minus "Ausgabe XYZ — "
        first_h1 = re.search(r"^#\s+(.+?)\s*$", raw, re.M)
        headline = first_h1.group(1) if first_h1 else name

    # hook = headline without leading emoji + space
    # Strip leading emoji/symbol chars but preserve German opening quotes („) at start.
    hook = re.sub(r"^\s*[☕📰🛠💡✨⚡🔥📊🎯]+\s*", "", headline).strip() or headline

    # preview = first content paragraph after first H2
    body_after = raw.split(f"## {headline}", 1)[-1] if f"## {headline}" in raw else raw
    body_after = SELFCHECK_RX.sub("", body_after)
    paras = [p.strip() for p in re.split(r"\n\s*\n", body_after) if p.strip()]
    preview = ""
    for p in paras:
        # skip headings, blockquotes, list-of-meta lines
        if p.startswith("#") or p.startswith(">") or p.startswith("---"):
            continue
        if p.lower().startswith(("einstieg", "outro")):
            continue
        # remove markdown emphasis
        clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", p)
        clean = re.sub(r"\*([^*]+)\*", r"\1", clean)
        clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", clean)
        clean = clean.replace("\n", " ").strip()
        if len(clean) < 60:
            continue
        preview = clean[:260].rsplit(" ", 1)[0] + ("…" if len(clean) > 260 else "")
        break

    # word count
    words = len(WORD_RX.findall(SELFCHECK_RX.sub("", raw)))
    read_min = max(2, round(words / 200))

    topics = detect_topics(raw, name)

    # slug
    if number is not None:
        slug_hook = re.sub(r"[^a-z0-9]+", "-", hook.lower()).strip("-")
        slug_hook = "-".join(slug_hook.split("-")[:5])  # max 5 words
        slug = f"{number:03d}-{date.strftime('%Y-%m-%d')}-{slug_hook}"
    elif is_ult:
        slug = f"ultimate-probe-{date.strftime('%Y-%m-%d')}"
    else:
        slug = f"probe-{date.strftime('%Y-%m-%d')}"

    return Issue(
        src_path=path, raw_md=raw, is_probe=is_probe, is_ultimate=is_ult,
        number=number, weekday_code=wd, date=date,
        headline=headline, hook=hook, preview=preview,
        word_count=words, read_min=read_min, topics=topics, slug=slug,
    )


# -------------------- HTML rendering --------------------
def md_to_html(text: str) -> str:
    # strip self_check before render
    text = SELFCHECK_RX.sub("", text).rstrip()
    return markdown.markdown(text, extensions=["extra", "sane_lists", "smarty"])


HEADER_HTML = """<header class="site-header">
  <div class="wrap">
    <a href="/" class="brand" aria-label="aban news Startseite">
      <span aria-hidden="true">☕</span>
      <span>aban news</span>
    </a>
    <nav class="nav" aria-label="Hauptnavigation">
      <a href="/archive/">Archive</a>
      <a href="/sponsoring.html">Werbung</a>
      <a href="/founding.html">Premium</a>
      <a href="/#signup" class="nav-cta">Abonnieren</a>
    </nav>
  </div>
</header>"""

FOOTER_HTML = """<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h5>aban news</h5>
        <a href="/">Startseite</a>
        <a href="/archive/">Archive</a>
        <a href="/preview.html">Probe-Ausgabe</a>
        <a href="/founding.html">Founding Member</a>
        <a href="/sponsoring.html">Werbung schalten</a>
      </div>
      <div>
        <h5>Mehr lesen</h5>
        <a href="/about.html">Über Aban</a>
        <a href="/faq.html">FAQ</a>
        <a href="/resources.html">Resourcen</a>
        <a href="/roadmap.html">Roadmap</a>
        <a href="/press.html">Press-Kit</a>
      </div>
      <div>
        <h5>Rechtliches</h5>
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
      </div>
      <div>
        <h5>Kontakt</h5>
        <a href="mailto:hallo@abannews.com">hallo@abannews.com</a>
        <a href="mailto:sponsoring@abannews.com">sponsoring@abannews.com</a>
      </div>
    </div>
    <p class="foot-bottom">&copy; 2026 aban news · Geschrieben in der Schweiz, gelesen im DACH-Raum · <em>— Aban</em></p>
  </div>
</footer>"""


def make_jsonld(issue: Issue) -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": issue.title,
        "name": issue.hook,
        "datePublished": issue.date_iso,
        "dateModified": issue.date_iso,
        "wordCount": issue.word_count,
        "inLanguage": "de-DE",
        "url": issue.url,
        "mainEntityOfPage": {"@type": "WebPage", "@id": issue.url},
        "author": {"@type": "Person", "name": "Aban (Allen Chour)", "url": f"{SITE_URL}/about.html"},
        "publisher": {
            "@type": "Organization",
            "name": "aban news",
            "@id": f"{SITE_URL}/#organization",
            "logo": {"@type": "ImageObject", "url": f"{SITE_URL}/logo-icon.svg"},
        },
        "description": issue.preview or issue.hook,
        "keywords": ", ".join(issue.topics),
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def render_issue_page(issue: Issue, prev: Optional[Issue], nxt: Optional[Issue], week_siblings: list[Issue]) -> str:
    body_html = md_to_html(issue.raw_md)
    # Drop the first H1 (we render our own title block)
    body_html = re.sub(r"^<h1>.*?</h1>\s*", "", body_html, count=1, flags=re.S)
    # Drop the first H2 — it's the issue headline, already shown in the page header.
    # Use a one-shot replacement on the first H2 occurrence only.
    body_html = re.sub(r"<h2>[^<]*</h2>\s*", "", body_html, count=1)
    jsonld = make_jsonld(issue)

    nav_prev = (
        f'<a class="pager-link" href="/archive/{prev.slug}.html" rel="prev">'
        f'<span aria-hidden="true">←</span> {xml_escape(prev.hook)}</a>'
        if prev else '<span class="pager-empty"></span>'
    )
    nav_next = (
        f'<a class="pager-link pager-link--next" href="/archive/{nxt.slug}.html" rel="next">'
        f'{xml_escape(nxt.hook)} <span aria-hidden="true">→</span></a>'
        if nxt else '<span class="pager-empty"></span>'
    )

    sib_html = ""
    if week_siblings:
        items = []
        for s in week_siblings:
            cur = ' aria-current="page"' if s.slug == issue.slug else ""
            items.append(
                f'<li><a href="/archive/{s.slug}.html"{cur}>'
                f'<span class="sib-date">{xml_escape(s.date_short)}</span> '
                f'<span class="sib-hook">{xml_escape(s.hook)}</span></a></li>'
            )
        sib_html = (
            '<aside class="week-sidebar"><h2>Diese Woche</h2><ul class="sib-list">'
            + "".join(items) + "</ul></aside>"
        )

    topics_html = " ".join(
        f'<span class="topic-badge">{xml_escape(t)}</span>' for t in issue.topics
    )

    desc = (issue.preview or issue.hook)[:158]
    og_desc = desc

    md_rel = issue.src_path.name  # original .md filename

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{xml_escape(issue.title)} | aban news</title>
  <meta name="description" content="{xml_escape(desc)}">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{issue.url}">

  <meta property="og:title" content="{xml_escape(issue.title)}">
  <meta property="og:description" content="{xml_escape(og_desc)}">
  <meta property="og:image" content="{SITE_URL}/og-image.svg">
  <meta property="og:url" content="{issue.url}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="aban news">
  <meta property="article:published_time" content="{issue.date_iso}">
  <meta property="article:author" content="Aban (Allen Chour)">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{xml_escape(issue.title)}">
  <meta name="twitter:description" content="{xml_escape(og_desc)}">
  <meta name="twitter:image" content="{SITE_URL}/og-image.svg">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="aban news Archive RSS" href="/archive.rss">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/archive/archive.css">

  <script type="application/ld+json">
{jsonld}
  </script>
</head>
<body>

<a href="#main" class="skip">Zum Hauptinhalt springen</a>
{HEADER_HTML}

<main id="main">
  <div class="wrap issue-wrap">

    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">Start</a> ›
      <a href="/archive/">Archive</a> ›
      <span>{xml_escape(issue.kind_label)}{f" {issue.number:03d}" if issue.number else ""}</span>
    </nav>

    <article class="issue">
      <header class="issue-header">
        <p class="issue-meta">
          <time datetime="{issue.date_iso}">{xml_escape(issue.date_human)}</time>
          · {issue.read_min} Min Lesezeit
          · {issue.word_count:,} Wörter
        </p>
        <h1 class="issue-title">{xml_escape(issue.headline)}</h1>
        <p class="issue-kicker">{xml_escape(issue.kind_label)}{f" {issue.number:03d}" if issue.number else ""} · aban news</p>
        {('<p class="topics">' + topics_html + '</p>') if topics_html else ''}
      </header>

      <div class="issue-body">
        {body_html}
      </div>

      <footer class="issue-footer">
        <p class="issue-actions">
          <a class="btn btn--ghost" href="/#signup">☕ Per Mail abonnieren</a>
          <a class="btn btn--ghost btn--small" href="https://raw.githubusercontent.com/allenchour/aban-deploy/main/archive-src/{xml_escape(md_rel)}" download>Als Markdown herunterladen</a>
        </p>
      </footer>
    </article>

    <nav class="pager" aria-label="Vorherige und nächste Ausgabe">
      {nav_prev}
      {nav_next}
    </nav>

    {sib_html}

  </div>
</main>

{FOOTER_HTML}
</body>
</html>"""


# -------------------- index page --------------------
def render_index(issues: list[Issue]) -> str:
    # Sort issues newest first
    items = sorted(issues, key=lambda i: (i.date, i.number or 0), reverse=True)

    cards = []
    for i in items:
        topics = " ".join(f'<span class="topic-badge">{xml_escape(t)}</span>' for t in i.topics)
        # data attrs for filtering
        data_kind = "probe" if i.is_probe else "ausgabe"
        data_topics = " ".join(i.topics).lower()
        search_blob = f"{i.hook} {i.preview} {' '.join(i.topics)} {i.date_iso}".lower()
        weekday = WEEKDAY_DE.get(i.weekday_code or "", "")
        cards.append(f"""<article class="arc-card" data-kind="{data_kind}" data-topics="{xml_escape(data_topics)}" data-date="{i.date_iso}" data-search="{xml_escape(search_blob)}">
        <p class="arc-card-meta">
          <time datetime="{i.date_iso}">{xml_escape(i.date_human)}</time>
          · {i.read_min} Min
        </p>
        <h2 class="arc-card-title"><a href="/archive/{i.slug}.html">{xml_escape(i.hook)}</a></h2>
        <p class="arc-card-preview">{xml_escape(i.preview)}</p>
        <p class="arc-card-topics">{topics}</p>
        <p class="arc-card-cta"><a href="/archive/{i.slug}.html">Lesen →</a></p>
      </article>""")

    cards_html = "\n      ".join(cards)
    count = len(items)

    # Build topic set for filter dropdown
    all_topics = sorted({t for i in items for t in i.topics})
    topic_options = "".join(f'<option value="{xml_escape(t)}">{xml_escape(t)}</option>' for t in all_topics)

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archive — Alle Ausgaben | aban news</title>
  <meta name="description" content="Das komplette Archiv von aban news mit {count} Ausgaben. Filterbar nach Datum, Topic und Volltextsuche.">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{SITE_URL}/archive/">

  <meta property="og:title" content="aban news Archive — {count} Ausgaben">
  <meta property="og:description" content="Alle Ausgaben filterbar nach Datum und Thema.">
  <meta property="og:image" content="{SITE_URL}/og-image.svg">
  <meta property="og:url" content="{SITE_URL}/archive/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="aban news">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="aban news Archive">
  <meta name="twitter:description" content="{count} Ausgaben filterbar.">
  <meta name="twitter:image" content="{SITE_URL}/og-image.svg">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="aban news Archive RSS" href="/archive.rss">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/archive/archive.css">

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "aban news Archive",
    "url": "{SITE_URL}/archive/",
    "description": "Das komplette Archiv aller aban news Ausgaben.",
    "inLanguage": "de-DE",
    "blogPost": [
{",".join(json.dumps({"@type":"BlogPosting","headline":i.hook,"datePublished":i.date_iso,"url":i.url}, ensure_ascii=False) for i in items[:30])}
    ]
  }}
  </script>
</head>
<body>

<a href="#main" class="skip">Zum Hauptinhalt springen</a>
{HEADER_HTML}

<main id="main">

  <section class="hero">
    <div class="wrap">
      <p class="crumbs"><a href="/">Start</a> › <span>Archive</span></p>
      <h1 class="hero-headline">Alle Ausgaben — aban news Archive</h1>
      <p class="lead">
        {count} Ausgaben. Such, filter, lies — alles client-side, kein Tracking, kein Cookie.
      </p>
      <p>
        <a href="/archive.rss" class="btn btn--ghost">📡 RSS-Feed</a>
        <a href="/#signup" class="btn btn--lg" style="margin-left:.5rem;">Per Mail kriegen</a>
      </p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <div class="arc-filters" role="search">
        <div class="arc-filter">
          <label for="q">Suchen</label>
          <input id="q" type="search" placeholder="Stichwort, Tool, Thema …" autocomplete="off">
        </div>
        <div class="arc-filter">
          <label for="topic">Topic</label>
          <select id="topic">
            <option value="">Alle Themen</option>
            {topic_options}
          </select>
        </div>
        <div class="arc-filter">
          <label for="kind">Typ</label>
          <select id="kind">
            <option value="">Alle</option>
            <option value="ausgabe">Reguläre Ausgaben</option>
            <option value="probe">Probe-Ausgaben</option>
          </select>
        </div>
        <div class="arc-filter">
          <label for="month">Monat</label>
          <select id="month">
            <option value="">Alle Monate</option>
          </select>
        </div>
        <div class="arc-filter arc-filter--clear">
          <button type="button" id="clear-filters" class="btn btn--ghost btn--small">Zurücksetzen</button>
        </div>
      </div>
      <p class="arc-count"><span id="visible-count">{count}</span> von {count} Ausgaben sichtbar</p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="arc-grid" id="arc-grid">
        {cards_html}
      </div>
      <p class="arc-empty" id="arc-empty" hidden>Keine Ausgaben gefunden. Filter zurücksetzen?</p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <h2 class="center">Verpass keine Ausgabe</h2>
      <p class="center muted">Per Mail direkter als das Archive — täglich morgens, 3 bis 5 Min.</p>
      <p class="center mt-5"><a href="/#signup" class="btn btn--lg">aban news abonnieren</a></p>
    </div>
  </section>

</main>

{FOOTER_HTML}

<script src="/archive/archive.js"></script>
</body>
</html>"""


# -------------------- CSS + JS --------------------
ARCHIVE_CSS = """/* archive-specific overrides — extends /css/styles.css */
.crumbs {
  font-size: 0.9rem;
  color: var(--c-muted);
  margin-bottom: 1rem;
}
.crumbs a { color: var(--c-muted); text-decoration: underline; }
.crumbs a:hover { color: var(--c-accent); }

/* Filters bar */
.arc-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 0.75rem;
}
@media (max-width: 720px) {
  .arc-filters { grid-template-columns: 1fr 1fr; }
  .arc-filter--clear { grid-column: 1 / -1; }
}
.arc-filter label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-muted);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.arc-filter input,
.arc-filter select {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: var(--r);
  border: 1px solid var(--c-border);
  background: var(--c-card);
  font: inherit;
  color: var(--c-text);
}
.arc-filter input:focus,
.arc-filter select:focus {
  outline: 2px solid var(--c-accent);
  outline-offset: 1px;
}
.arc-count {
  color: var(--c-muted);
  font-size: 0.9rem;
  margin: 0.25rem 0 0;
}

/* Card grid */
.arc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.arc-card {
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 1.25rem;
  transition: transform var(--t), box-shadow var(--t);
  display: flex;
  flex-direction: column;
}
.arc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--c-shadow-lg);
}
.arc-card-meta {
  font-size: 0.82rem;
  color: var(--c-muted);
  margin: 0 0 0.5rem;
}
.arc-card-title {
  font-size: 1.15rem;
  line-height: 1.35;
  margin: 0 0 0.5rem;
}
.arc-card-title a {
  color: var(--c-text);
  text-decoration: none;
}
.arc-card-title a:hover { color: var(--c-accent); }
.arc-card-preview {
  color: var(--c-text-2);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 0.75rem;
  flex: 1;
}
.arc-card-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 0.75rem;
}
.topic-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.18rem 0.55rem;
  border-radius: 99px;
  background: var(--c-bg-alt);
  color: var(--c-accent-hi);
  border: 1px solid var(--c-accent-soft);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.arc-card-cta a {
  font-weight: 600;
  color: var(--c-accent);
  text-decoration: none;
}
.arc-card-cta a:hover { text-decoration: underline; }
.arc-empty {
  text-align: center;
  color: var(--c-muted);
  padding: 3rem 1rem;
  font-style: italic;
}

/* Issue page */
.issue-wrap {
  max-width: var(--w);
  padding-top: 1.5rem;
  padding-bottom: 3rem;
}
.issue-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--c-border);
}
.issue-meta {
  color: var(--c-muted);
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}
.issue-kicker {
  color: var(--c-accent-hi);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0.25rem 0;
}
.issue-title {
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  line-height: 1.2;
  margin: 0.25rem 0 0.5rem;
}
.issue-body {
  font-size: 1.05rem;
  line-height: 1.7;
}
.issue-body h2 {
  margin-top: 2.5rem;
  padding-top: 0.5rem;
  font-size: 1.4rem;
  border-top: 1px solid var(--c-border);
}
.issue-body h3 {
  margin-top: 2rem;
  font-size: 1.15rem;
  color: var(--c-text);
}
.issue-body blockquote {
  border-left: 3px solid var(--c-accent-soft);
  background: var(--c-bg-alt);
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  border-radius: 0 var(--r) var(--r) 0;
  color: var(--c-text-2);
}
.issue-body pre {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: var(--r);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.5;
}
.issue-body code {
  background: var(--c-bg-alt);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.issue-body pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}
.issue-body a {
  color: var(--c-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.issue-body a:hover { color: var(--c-accent-hi); }
.issue-body hr {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid var(--c-border);
}
.topics { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.75rem 0; }

.issue-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--c-border);
}
.issue-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.btn--small { padding: 0.45rem 0.85rem; font-size: 0.85rem; }

.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 2rem 0;
}
.pager-link {
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: var(--r);
  padding: 0.85rem 1rem;
  color: var(--c-text);
  text-decoration: none;
  font-weight: 500;
  display: block;
  transition: border-color var(--t), background var(--t);
}
.pager-link:hover {
  border-color: var(--c-accent);
  background: var(--c-bg-alt);
}
.pager-link--next { text-align: right; }
.pager-empty { display: block; }

.week-sidebar {
  background: var(--c-bg-alt);
  border-radius: var(--r-lg);
  padding: 1.25rem;
  margin-top: 1rem;
}
.week-sidebar h2 {
  font-size: 1.05rem;
  margin: 0 0 0.75rem;
  color: var(--c-accent-hi);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.sib-list {
  list-style: none;
  margin: 0; padding: 0;
}
.sib-list li { margin: 0.4rem 0; }
.sib-list a {
  display: flex;
  gap: 0.6rem;
  padding: 0.45rem 0.6rem;
  border-radius: var(--r-sm);
  text-decoration: none;
  color: var(--c-text);
  align-items: baseline;
}
.sib-list a:hover { background: var(--c-card); }
.sib-list a[aria-current="page"] {
  background: var(--c-card);
  border-left: 3px solid var(--c-accent);
  font-weight: 600;
}
.sib-date {
  color: var(--c-muted);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  min-width: 8em;
  flex-shrink: 0;
}
.sib-hook { color: var(--c-text-2); }
"""


ARCHIVE_JS = """/* aban news Archive — client-side filter & search
 * Vanilla JS only, no deps, no tracking.
 */
(function () {
  'use strict';

  var grid = document.getElementById('arc-grid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.arc-card'));
  var q = document.getElementById('q');
  var topic = document.getElementById('topic');
  var kind = document.getElementById('kind');
  var monthSel = document.getElementById('month');
  var clear = document.getElementById('clear-filters');
  var visCount = document.getElementById('visible-count');
  var empty = document.getElementById('arc-empty');

  // Build month list
  var monthsMap = {};
  cards.forEach(function (c) {
    var d = c.getAttribute('data-date'); // YYYY-MM-DD
    var key = d.substring(0, 7);
    monthsMap[key] = true;
  });
  var months = Object.keys(monthsMap).sort().reverse();
  var monthLabels = {
    '01':'Januar','02':'Februar','03':'März','04':'April','05':'Mai','06':'Juni',
    '07':'Juli','08':'August','09':'September','10':'Oktober','11':'November','12':'Dezember'
  };
  months.forEach(function (m) {
    var opt = document.createElement('option');
    opt.value = m;
    var parts = m.split('-');
    opt.textContent = monthLabels[parts[1]] + ' ' + parts[0];
    monthSel.appendChild(opt);
  });

  function tokenize(s) {
    return s.toLowerCase().split(/\\s+/).filter(Boolean);
  }

  function apply() {
    var qv = tokenize(q.value || '');
    var tv = (topic.value || '').toLowerCase();
    var kv = (kind.value || '').toLowerCase();
    var mv = (monthSel.value || '');
    var visible = 0;

    cards.forEach(function (c) {
      var blob = c.getAttribute('data-search') || '';
      var ct = c.getAttribute('data-topics') || '';
      var ck = c.getAttribute('data-kind') || '';
      var cd = c.getAttribute('data-date') || '';

      var matchesQ = qv.length === 0 || qv.every(function (t) { return blob.indexOf(t) !== -1; });
      var matchesT = !tv || ct.indexOf(tv) !== -1;
      var matchesK = !kv || ck === kv;
      var matchesM = !mv || cd.substring(0, 7) === mv;

      var show = matchesQ && matchesT && matchesK && matchesM;
      c.hidden = !show;
      if (show) visible++;
    });

    visCount.textContent = visible;
    empty.hidden = visible !== 0;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  q.addEventListener('input', debounce(apply, 80));
  topic.addEventListener('change', apply);
  kind.addEventListener('change', apply);
  monthSel.addEventListener('change', apply);
  clear.addEventListener('click', function () {
    q.value = ''; topic.value = ''; kind.value = ''; monthSel.value = '';
    apply();
    q.focus();
  });

  // Sync state from URL hash (?q=foo&topic=Tools)
  try {
    var qs = new URLSearchParams(window.location.search);
    if (qs.get('q')) q.value = qs.get('q');
    if (qs.get('topic')) topic.value = qs.get('topic');
    if (qs.get('kind')) kind.value = qs.get('kind');
    if (qs.get('month')) monthSel.value = qs.get('month');
    apply();
  } catch (e) {}
})();
"""


# -------------------- sitemap --------------------
def update_sitemap(issues: list[Issue]) -> int:
    """Refresh sitemap.xml — keep static pages, replace archive section."""
    today = datetime.now().strftime("%Y-%m-%d")
    static_urls = [
        ("/", "1.0", "daily"),
        ("/about.html", "0.8", "monthly"),
        ("/faq.html", "0.7", "monthly"),
        ("/archive/", "0.9", "daily"),
        ("/archive.html", "0.5", "weekly"),
        ("/preview.html", "0.7", "monthly"),
        ("/founding.html", "0.7", "monthly"),
        ("/sponsoring.html", "0.6", "monthly"),
        ("/werbung.html", "0.4", "monthly"),
        ("/resources.html", "0.6", "weekly"),
        ("/roadmap.html", "0.5", "monthly"),
        ("/press.html", "0.4", "monthly"),
        ("/brand.html", "0.4", "monthly"),
        ("/launch.html", "0.5", "weekly"),
        ("/stats.html", "0.4", "monthly"),
        ("/willkommen.html", "0.4", "monthly"),
        ("/datenschutz.html", "0.3", "yearly"),
        ("/impressum.html", "0.3", "yearly"),
    ]
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, prio, freq in static_urls:
        parts.append(f"  <url>")
        parts.append(f"    <loc>{SITE_URL}{path}</loc>")
        parts.append(f"    <lastmod>{today}</lastmod>")
        parts.append(f"    <changefreq>{freq}</changefreq>")
        parts.append(f"    <priority>{prio}</priority>")
        parts.append(f"  </url>")
    for i in issues:
        parts.append(f"  <url>")
        parts.append(f"    <loc>{i.url}</loc>")
        parts.append(f"    <lastmod>{i.date_iso}</lastmod>")
        parts.append(f"    <changefreq>monthly</changefreq>")
        parts.append(f"    <priority>0.8</priority>")
        parts.append(f"  </url>")
    parts.append("</urlset>")
    SITEMAP.write_text("\n".join(parts) + "\n", encoding="utf-8")
    return len(issues)


def update_root_archive():
    """Replace existing /archive.html with a thin bridge to /archive/."""
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archive — aban news</title>
  <meta name="description" content="Das aban-news-Archive ist umgezogen — alle Ausgaben jetzt unter /archive/.">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{SITE_URL}/archive/">
  <meta http-equiv="refresh" content="0; url=/archive/">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <main class="wrap" style="padding: 4rem 1rem; text-align:center;">
    <h1>Archive umgezogen</h1>
    <p>Das komplette Archive findest du jetzt unter <a href="/archive/">/archive/</a>.</p>
    <p><a href="/archive/" class="btn btn--lg">Zum Archive</a></p>
  </main>
</body>
</html>
"""
    ROOT_ARCHIVE.write_text(html, encoding="utf-8")


# -------------------- main --------------------
def main() -> int:
    if not SOURCE_DIR.exists():
        print(f"ERROR: source dir not found: {SOURCE_DIR}")
        return 1

    issues: list[Issue] = []
    for f in sorted(SOURCE_DIR.iterdir()):
        if not f.is_file(): continue
        if not f.name.endswith(".md"): continue
        if not (f.name.startswith("ausgabe-") or f.name.startswith("probe-") or f.name.startswith("ultimate-probe-")):
            continue
        try:
            iss = parse_issue(f)
            if iss:
                issues.append(iss)
        except Exception as e:
            print(f"WARN: failed to parse {f.name}: {e}", file=sys.stderr)

    print(f"Parsed {len(issues)} issues")

    # Sort by number / date for prev-next nav
    ausgaben = sorted([i for i in issues if i.number is not None], key=lambda i: i.number or 0)
    probes = sorted([i for i in issues if i.number is None], key=lambda i: i.date)
    ordered = ausgaben + probes

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    (ARCHIVE_DIR / "archive.css").write_text(ARCHIVE_CSS, encoding="utf-8")
    (ARCHIVE_DIR / "archive.js").write_text(ARCHIVE_JS, encoding="utf-8")

    # Build week-buckets (Mon-Fri of the same week) — only for regular ausgaben
    from datetime import timedelta
    def week_key(d: datetime) -> tuple[int, int]:
        iso = d.isocalendar()
        return (iso[0], iso[1])
    week_buckets: dict[tuple[int, int], list[Issue]] = {}
    for i in ausgaben:
        week_buckets.setdefault(week_key(i.date), []).append(i)
    for k in week_buckets:
        week_buckets[k].sort(key=lambda x: x.date)

    sizes = []
    for idx, iss in enumerate(ordered):
        prev = ordered[idx - 1] if idx > 0 else None
        nxt = ordered[idx + 1] if idx + 1 < len(ordered) else None
        if iss.number is not None:
            siblings = week_buckets.get(week_key(iss.date), [])
        else:
            siblings = []
        html = render_issue_page(iss, prev, nxt, siblings)
        iss.out_path.write_text(html, encoding="utf-8")
        sizes.append(iss.out_path.stat().st_size)

    # Index page
    index_html = render_index(issues)
    (ARCHIVE_DIR / "index.html").write_text(index_html, encoding="utf-8")
    sizes.append((ARCHIVE_DIR / "index.html").stat().st_size)

    # Sitemap + root bridge
    n = update_sitemap(issues)
    update_root_archive()

    total_kb = sum(sizes) / 1024
    avg_kb = total_kb / len(sizes) if sizes else 0
    print(f"Generated {len(ordered)} issue pages + index. Sitemap +{n} URLs.")
    print(f"Total archive size: {total_kb:.1f} KB ({avg_kb:.1f} KB avg/page)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
