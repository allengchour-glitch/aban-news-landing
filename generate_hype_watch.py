#!/usr/bin/env python3
"""Hype-Watch — Faktencheck-Serie für abannews.com.

Liest data/hype-watch.json und erzeugt:
  - hype-watch.html            (Hub: alle Fälle, CollectionPage + ItemList)
  - hype-watch/<id>.html       (ein Fall je Seite: ClaimReview + Article + Breadcrumb)

Reine Python-stdlib, statische Seiten ins Repo (wie die ki-fuer-*-Hubs), Aban-Voice
(anti-hype, du-Form), kein Tracking. ClaimReview-JSON-LD = Googles Faktencheck-Schema
(Chance auf Rich-Snippets). Selbst-wachsend: neuer Fall in der JSON -> neue Seite.

Bauen:  python3 generate_hype_watch.py
"""

from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "hype-watch.json"
BASE = "https://abannews.com"
NL = "https://abannews.beehiiv.com/subscribe"


def e(v) -> str:
    return html.escape(str(v if v is not None else ""))


def slug(s: str) -> str:
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "x"


CSS = """:focus-visible{outline:3px solid #d97706;outline-offset:2px;border-radius:3px}
:root{--bg:#fffbf5;--card:#fff;--ink:#1f2937;--muted:#6b7280;--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fef3c7;--line:#e5e7eb;--ok:#059669;--err:#dc2626;--r:16px;--shadow:0 4px 16px rgba(31,41,55,.08)}
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:17px}
.wrap{max-width:760px;margin:0 auto;padding:0 1.25rem}
header{background:var(--bg);border-bottom:1px solid var(--line);padding:.75rem 0;position:sticky;top:0;z-index:50}
header .wrap{display:flex;justify-content:space-between;align-items:center}
.brand{color:var(--ink);text-decoration:none;font-weight:700;font-size:1.1rem}
nav a{margin-left:1.2rem;color:var(--muted);text-decoration:none;font-size:.9rem}
nav a:hover{color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:.4rem;border:0;border-radius:12px;cursor:pointer;font-weight:700;font-size:.95rem;padding:.7rem 1.1rem;background:#b45309;color:#fff;text-decoration:none}
.hero{padding:2.5rem 0 1rem}
.badge{display:inline-block;background:var(--amber-lt);color:var(--amber);font-size:.82rem;font-weight:600;padding:.3rem .7rem;border-radius:999px;margin-bottom:1rem}
h1{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.12;letter-spacing:-.02em;font-weight:800;margin-bottom:.7rem}
.lead{font-size:1.05rem;color:var(--muted);max-width:60ch;margin-bottom:1rem}
.case{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1.5rem;margin-bottom:1.25rem;box-shadow:var(--shadow)}
.case h2{font-size:1.2rem;margin-bottom:.5rem}
.case h2 a{color:var(--ink);text-decoration:none}
.verdikt{display:inline-block;font-size:.8rem;font-weight:700;padding:.25rem .7rem;border-radius:999px;background:#fee2e2;color:#991b1b;margin-bottom:.6rem}
.claim{font-style:italic;color:var(--ink);border-left:3px solid var(--amber);padding-left:.8rem;margin:.4rem 0 .8rem}
.lbl{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-top:1rem}
.src{font-size:.85rem;color:var(--muted)}
.src a{color:var(--amber-dk)}
.cta-box{background:var(--amber-lt);border:2px solid var(--amber);border-radius:var(--r);padding:1.5rem;text-align:center;margin:2rem 0}
.cta-box h2{font-size:1.25rem;margin-bottom:.5rem}.cta-box p{color:var(--muted);margin-bottom:1rem;font-size:.95rem}
.meta-row{font-size:.85rem;color:var(--muted);margin-bottom:.4rem}
.disclaimer{font-size:.8rem;color:var(--muted);padding:1.4rem 0;border-top:1px solid var(--line);margin-top:1.5rem}
footer{padding:1.5rem 0;font-size:.82rem;color:var(--muted);border-top:1px solid var(--line)}
footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem}footer a{color:var(--muted)}
.skip{position:absolute;left:-9999px;top:0;z-index:100;background:#1c2530;color:#fff;padding:.7rem 1rem;border-radius:0 0 10px 0;font-weight:700;text-decoration:none}.skip:focus{left:0}"""


def head(title, desc, canonical, extra_jsonld=""):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#d97706">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{e(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:image" content="{BASE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" hreflang="de" href="{e(canonical)}">
<link rel="alternate" hreflang="x-default" href="{e(canonical)}">
<style>{CSS}</style>
{extra_jsonld}
</head>
<body>
<a href="#main" class="skip">Zum Inhalt springen</a>
<header><div class="wrap">
<a href="/" class="brand">☕ aban news</a>
<nav><a href="/hype-filter.html">Hype-Filter</a><a href="/geld-verdienen-mit-ki.html">KI &amp; Geld</a><a href="{NL}" class="btn">Abonnieren</a></nav>
</div></header>
<main id="main"><div class="wrap">"""


FOOT = f"""</div></main>
<footer><div class="wrap">
<span>© {date.today().year} aban news · Allen Chour, Belp (CH)</span>
<span><a href="/">Startseite</a> · <a href="/hype-watch.html">Hype-Watch</a> · <a href="/impressum.html">Impressum</a></span>
</div></footer>
</body>
</html>"""

NL_BOX = f"""<div class="cta-box">
<h2>Kein Hype, jeden Morgen</h2>
<p>aban news liefert dir Mo–Fr in 5 Minuten die relevanten KI-Updates — ehrlich eingeordnet, ohne Buzzword-Bingo.</p>
<a href="{NL}" class="btn" style="font-size:1.05rem;padding:.85rem 1.3rem;">5-Min-Briefing gratis →</a>
</div>"""


def claimreview(c, url):
    data = {
        "@context": "https://schema.org", "@type": "ClaimReview",
        "url": url, "claimReviewed": c["claim"], "datePublished": c["datum"],
        "author": {"@type": "Organization", "name": "aban news", "url": BASE},
        "reviewRating": {"@type": "Rating", "ratingValue": c.get("rating", 2),
                         "bestRating": 5, "worstRating": 1,
                         "alternateName": c["verdikt"]},
        "itemReviewed": {"@type": "Claim",
                         "author": {"@type": "Organization", "name": c.get("behauptung_von", "")}},
    }
    art = {"@context": "https://schema.org", "@type": "Article",
           "headline": c["claim"], "datePublished": c["datum"], "inLanguage": "de",
           "author": {"@type": "Person", "name": "Aban (Allen Chour)"},
           "publisher": {"@type": "Organization", "name": "aban news"}}
    crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList",
             "itemListElement": [
                 {"@type": "ListItem", "position": 1, "name": "Hype-Watch", "item": f"{BASE}/hype-watch.html"},
                 {"@type": "ListItem", "position": 2, "name": c["claim"][:60], "item": url}]}
    return "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
                   for x in (data, art, crumb))


def case_page(c):
    url = f"{BASE}/hype-watch/{c['id']}.html"
    quellen = "".join(
        f'<li class="src"><a href="{e(q["url"])}" rel="noopener noreferrer nofollow" target="_blank">{e(q["titel"])}</a></li>'
        for q in c.get("quellen", []))
    desc = f"Faktencheck: {c['claim']} — {c['verdikt']}. Was wirklich belegt ist, mit Quellen."
    body = f"""{head('Hype-Watch: '+c['claim'][:60]+' — aban news', desc, url, claimreview(c, url))}
<p class="meta-row"><a href="/hype-watch.html">← Hype-Watch</a> · {e(c['datum'])}</p>
<span class="verdikt">Verdikt: {e(c['verdikt'])}</span>
<h1>{e(c['claim'])}</h1>
<p class="meta-row">Behauptet von: {e(c.get('behauptung_von',''))}</p>
<p class="lbl">Der Hype</p><p>{e(c['der_hype'])}</p>
<p class="lbl">Die Realität</p><p>{e(c['die_realitaet'])}</p>
<p class="lbl">Aban-Einordnung</p><p>{e(c['einordnung'])}</p>
<p class="lbl">Quellen</p><ul>{quellen or '<li class="src">—</li>'}</ul>
{NL_BOX}
<p class="disclaimer">Faktencheck nach bestem Wissen, mit verlinkten Primär-/Sekundärquellen. Sachfehler gefunden? Schreib an hallo@abannews.com — wir korrigieren transparent.</p>
{FOOT}"""
    return body


def hub_page(db):
    faelle = db["faelle"]
    url = f"{BASE}/hype-watch.html"
    items = {"@context": "https://schema.org", "@type": "CollectionPage",
             "name": db["titel"], "url": url, "inLanguage": "de",
             "description": db["untertitel"],
             "mainEntity": {"@type": "ItemList", "itemListElement": [
                 {"@type": "ListItem", "position": i + 1,
                  "url": f"{BASE}/hype-watch/{c['id']}.html", "name": c["claim"][:80]}
                 for i, c in enumerate(faelle)]}}
    jsonld = f'<script type="application/ld+json">{json.dumps(items, ensure_ascii=False)}</script>'
    cards = ""
    for c in faelle:
        cards += f"""<article class="case">
<span class="verdikt">{e(c['verdikt'])}</span>
<h2><a href="/hype-watch/{e(c['id'])}.html">{e(c['claim'])}</a></h2>
<p class="claim">„{e(c['der_hype'][:160])}…"</p>
<p>{e(c['die_realitaet'][:200])}…</p>
<p><a href="/hype-watch/{e(c['id'])}.html"><strong>Ganzer Faktencheck →</strong></a></p>
</article>"""
    body = f"""{head(db['titel']+' — KI-Behauptungen im Faktencheck | aban news', db['untertitel'], url, jsonld)}
<div class="hero">
<span class="badge">Faktencheck-Serie · {len(faelle)} Fälle · läuft weiter</span>
<h1>{e(db['titel'])}</h1>
<p class="lead">{e(db['untertitel'])} {e(db['hinweis'])}</p>
</div>
{cards}
{NL_BOX}
<p class="disclaimer">Du kennst eine überhypte KI-Behauptung, die wir auseinandernehmen sollen? Schreib an hallo@abannews.com.</p>
{FOOT}"""
    return body


def build():
    db = json.loads(DATA.read_text(encoding="utf-8"))
    (ROOT / "hype-watch.html").write_text(hub_page(db), encoding="utf-8")
    outdir = ROOT / "hype-watch"
    outdir.mkdir(exist_ok=True)
    for c in db["faelle"]:
        (outdir / f"{c['id']}.html").write_text(case_page(c), encoding="utf-8")
    print(f"Hype-Watch: Hub + {len(db['faelle'])} Fall-Seiten gebaut.")
    # Sitemap-URLs zum Einfügen (Hub wird separat gepflegt):
    print("Sitemap-URLs:")
    print(f"  {BASE}/hype-watch.html")
    for c in db["faelle"]:
        print(f"  {BASE}/hype-watch/{c['id']}.html")


if __name__ == "__main__":
    build()
