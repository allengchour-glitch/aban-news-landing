#!/usr/bin/env python3
"""Themen-Generator: 1 Eintrag in data/themen.json -> volle SEO-Themenseite.

Workflow für ein neues Thema:
  1. In data/themen.json einen Block ergänzen (slug, titel, intro, sektionen, faq, related)
  2. python3 automation/build_themen.py
  -> erzeugt themen/<slug>.html (vollständige Seite, Aban-Stil, JSON-LD, FAQ, CTA)
     und themen/index.html (Übersicht aller Themen).

  python3 automation/build_themen.py --check   # CI: Exit 1 bei Drift

Selbst-erzeugt, kein externes Framework, Inline-CSS im aban-Coffee-Stil.
"""
import argparse
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "themen.json"
OUT_DIR = ROOT / "themen"
SITE = "https://abannews.com"


def esc(s):
    return html.escape(str(s or ""), quote=True)


HEAD_CSS = """  <style>
    *{box-sizing:border-box;margin:0}
    :root{--bg:#fffbf5;--card:#fff;--ink:#1f2937;--muted:#6b7280;--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fef3c7;--line:#e5e7eb;--r:16px;--shadow:0 4px 16px rgba(31,41,55,.08)}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:17px}
    .wrap{max-width:760px;margin:0 auto;padding:0 1.25rem}
    a{color:inherit}
    header{background:var(--bg);border-bottom:1px solid var(--line);padding:.75rem 0;position:sticky;top:0;z-index:50}
    header .wrap{display:flex;justify-content:space-between;align-items:center}
    .brand{color:var(--ink);text-decoration:none;font-weight:700;font-size:1.1rem}
    nav a{margin-left:1.2rem;color:var(--muted);text-decoration:none;font-size:.9rem}
    nav a:hover{color:var(--ink)}
    .btn{display:inline-flex;align-items:center;gap:.4rem;border:0;border-radius:12px;cursor:pointer;font-weight:700;font-size:.95rem;padding:.7rem 1.1rem;background:var(--amber);color:#fff;text-decoration:none}
    .hero{padding:3rem 0 1.5rem}
    .eyebrow{display:inline-flex;align-items:center;gap:.45rem;font-size:.76rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--amber-dk);margin-bottom:.6rem}
    .eyebrow::before{content:"";width:22px;height:2px;border-radius:2px;background:var(--amber)}
    h1{font-size:clamp(1.8rem,4vw,2.7rem);line-height:1.1;letter-spacing:-.02em;font-weight:800;margin-bottom:.7rem}
    .lead{font-size:1.1rem;color:var(--muted);margin-bottom:1rem}
    article{padding:1rem 0 2rem}
    article h2{font-size:1.45rem;margin:2rem 0 .6rem;letter-spacing:-.01em}
    article p{margin-bottom:.9rem}
    article ul{margin:.2rem 0 1.2rem 1.2rem}
    article li{margin-bottom:.45rem}
    .faq{margin:1.5rem 0}
    .faq details{background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:.6rem;padding:0 .2rem}
    .faq summary{cursor:pointer;padding:.85rem 1rem;font-weight:600;list-style:none}
    .faq summary::-webkit-details-marker{display:none}
    .faq .a{padding:0 1rem .85rem;color:#3b4654}
    .cta-box{background:var(--amber-lt);border:2px solid var(--amber);border-radius:var(--r);padding:1.5rem;text-align:center;margin:2.2rem 0}
    .cta-box h2{margin:0 0 .4rem;font-size:1.25rem}
    .cta-box p{color:var(--muted);margin-bottom:1rem;font-size:.95rem}
    .related{border-top:1px solid var(--line);padding:1.5rem 0;margin-top:1rem}
    .related h2{font-size:1rem;color:var(--muted);margin-bottom:.6rem}
    .related a{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;margin:0 .4rem .4rem 0;font-size:.9rem;text-decoration:none;font-weight:600}
    .related a:hover{border-color:var(--amber);color:var(--amber-dk)}
    footer{padding:1.5rem 0;font-size:.82rem;color:var(--muted);border-top:1px solid var(--line)}
    footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
    footer a{color:var(--muted);text-decoration:none}
    /* Index-Grid */
    .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:1rem 0 2rem}
    .tcard{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:1.3rem;text-decoration:none;color:var(--ink);transition:transform .15s,box-shadow .15s,border-color .15s}
    .tcard:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--amber)}
    .tcard h2{font-size:1.15rem;margin-bottom:.3rem}
    .tcard p{color:var(--muted);font-size:.92rem}
    @media(max-width:560px){.tgrid{grid-template-columns:1fr}}
  </style>"""


def page_header(active=""):
    return f"""<header>
  <div class="wrap">
    <a href="/" class="brand">☕ aban news</a>
    <nav>
      <a href="/themen.html">Themen</a>
      <a href="/tools.html">Tools</a>
      <a href="/geld-verdienen-mit-ki.html">KI &amp; Geld</a>
      <a href="/#signup" class="btn">Abonnieren</a>
    </nav>
  </div>
</header>"""


PAGE_FOOTER = """<footer>
  <div class="wrap">
    <span>© 2026 aban news · Allen Chour, Belp (CH)</span>
    <span><a href="/themen.html">Themen</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></span>
  </div>
</footer>"""

CTA = """    <div class="cta-box">
      <h2>Jeden Morgen die wichtigsten KI-Updates</h2>
      <p>aban news liefert dir Mo–Fr in 5 Minuten, was für deinen Arbeitstag zählt — kein Hype.</p>
      <a href="/#signup" class="btn">aban news gratis abonnieren →</a>
    </div>"""


def render_topic(t, by_slug):
    secs = ""
    for s in t["sektionen"]:
        secs += f"      <h2>{esc(s['h2'])}</h2>\n      <p>{esc(s['text'])}</p>\n"
        if s.get("punkte"):
            secs += "      <ul>\n" + "".join(f"        <li>{esc(p)}</li>\n" for p in s["punkte"]) + "      </ul>\n"
    faq_html = ""
    faq_ld = []
    if t.get("faq"):
        faq_html = '    <div class="faq">\n      <h2>Häufige Fragen</h2>\n'
        for qa in t["faq"]:
            faq_html += f'      <details><summary>{esc(qa["q"])}</summary><div class="a">{esc(qa["a"])}</div></details>\n'
            faq_ld.append({"@type": "Question", "name": qa["q"],
                           "acceptedAnswer": {"@type": "Answer", "text": qa["a"]}})
        faq_html += "    </div>\n"
    rel = ""
    if t.get("related"):
        links = []
        for r in t["related"]:
            rt = by_slug.get(r)
            if rt:
                links.append(f'<a href="/themen/{esc(r)}.html">{esc(rt["titel"])}</a>')
        if links:
            rel = '    <div class="related">\n      <h2>Verwandte Themen</h2>\n      ' + "".join(links) + "\n    </div>\n"

    ld_blocks = [{"@context": "https://schema.org", "@type": "Article",
                  "headline": t["titel"], "description": t["kurz"],
                  "author": {"@type": "Person", "name": "Aban (Allen Chour)"},
                  "publisher": {"@type": "Organization", "name": "aban news"},
                  "url": f"{SITE}/themen/{t['slug']}.html"}]
    if faq_ld:
        ld_blocks.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq_ld})
    ld = "\n".join(f'  <script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>' for b in ld_blocks)

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(t['titel'])} | aban news</title>
  <meta name="description" content="{esc(t['kurz'])}">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{SITE}/themen/{t['slug']}.html">
  <meta property="og:title" content="{esc(t['titel'])}">
  <meta property="og:description" content="{esc(t['kurz'])}">
  <meta property="og:image" content="{SITE}/og-image.png">
  <meta property="og:url" content="{SITE}/themen/{t['slug']}.html">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{SITE}/og-image.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{ld}
{HEAD_CSS}
</head>
<body>
{page_header()}
<main>
  <div class="wrap">
    <div class="hero">
      <span class="eyebrow">{esc(t.get('eyebrow','Thema'))}</span>
      <h1>{esc(t['titel'])}</h1>
      <p class="lead">{esc(t['intro'])}</p>
    </div>
    <article>
{secs}    </article>
{faq_html}{CTA}
{rel}  </div>
</main>
{PAGE_FOOTER}
</body>
</html>
"""


def render_index(themen):
    cards = ""
    for t in themen:
        cards += (f'        <a class="tcard" href="/themen/{esc(t["slug"])}.html">'
                  f'<h2>{esc(t["titel"])}</h2><p>{esc(t["kurz"])}</p></a>\n')
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Themen — KI verständlich für DACH | aban news</title>
  <meta name="description" content="Alle Themen von aban news auf einen Blick: KI-Tools, DSGVO, Einstieg und mehr — ehrlich erklärt für Solos und KMU im DACH-Raum.">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{SITE}/themen.html">
  <meta property="og:title" content="Themen — aban news">
  <meta property="og:description" content="KI-Themen ehrlich erklärt für DACH — Tools, DSGVO, Einstieg und mehr.">
  <meta property="og:image" content="{SITE}/og-image.png">
  <meta property="og:url" content="{SITE}/themen.html">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{SITE}/og-image.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{HEAD_CSS}
</head>
<body>
{page_header()}
<main>
  <div class="wrap">
    <div class="hero">
      <span class="eyebrow">Wissen</span>
      <h1>Themen</h1>
      <p class="lead">KI verständlich erklärt für Solos und KMU im DACH-Raum — ehrlich, ohne Hype. {len(themen)} Themen, laufend erweitert.</p>
    </div>
    <div class="tgrid">
{cards}    </div>
{CTA}
  </div>
</main>
{PAGE_FOOTER}
</body>
</html>
"""


def build():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    themen = data["themen"]
    by_slug = {t["slug"]: t for t in themen}
    files = {OUT_DIR / f"{t['slug']}.html": render_topic(t, by_slug) for t in themen}
    files[ROOT / "themen.html"] = render_index(themen)  # Index liegt im Root als /themen.html
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = build()
    if args.check:
        drift = [p.name for p, c in files.items() if not p.exists() or p.read_text(encoding="utf-8") != c]
        if drift:
            print(f"::error::Themen nicht synchron: {drift}")
            return 1
        print(f"Themen synchron ({len(files)} Dateien).")
        return 0
    n = 0
    for p, c in files.items():
        if not p.exists() or p.read_text(encoding="utf-8") != c:
            p.write_text(c, encoding="utf-8")
            n += 1
    print(f"Themen gebaut: {len(files)} Dateien, {n} neu/aktualisiert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
