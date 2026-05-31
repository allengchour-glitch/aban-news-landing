#!/usr/bin/env python3
"""Deutsche KI-Prompt-Bibliothek — statischer Site-Generator.

Liest data/prompts.json (selbst verfasste, sofort nutzbare deutsche Prompts) und
rendert eine durchsuchbare, SEO-orientierte statische Site nach dist/:
  - Startseite mit Live-Suche/Filter (Vanilla-JS, kein Framework)
  - Kategorie-Seiten nach Beruf und nach Aufgabe
  - eine Detailseite je Prompt mit Copy-Button (Vanilla-JS)
  - sitemap.xml, robots.txt, feed.xml (RSS)

Reine Python-stdlib, keine externen Abhaengigkeiten. DSGVO-sicher: System-Fonts,
kein Tracking, keine 3rd-Party-Requests. Aban-Voice: pragmatisch, anti-hype, du-Form.

Nutzung:
    python3 generate.py
    python3 generate.py --out dist
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# --- Brand-Tokens (aus Aban News css/styles.css :root) -------------------------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "Deutsche KI-Prompt-Bibliothek"
TAGLINE = "Praxistaugliche deutsche Prompts, sortiert nach Beruf und Aufgabe"
BASE_URL = "https://prompts.abannews.com"
NEWSLETTER_URL = "https://abannews.com/gratis-ki-tools.html"
LANG = "de"


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


# --- URL-Pfade -----------------------------------------------------------------

def page_path(kind: str, slug: str = "") -> str:
    if kind == "home":
        return "/"
    if kind == "prompt":
        return f"/prompt/{slug}.html"
    if kind == "beruf":
        return f"/beruf/{slug}.html"
    if kind == "aufgabe":
        return f"/aufgabe/{slug}.html"
    return "/"


def out_file(out: Path, kind: str, slug: str = "") -> Path:
    p = page_path(kind, slug)
    if p.endswith("/"):
        p += "index.html"
    return out / p.lstrip("/")


# --- HTML-Huelle ---------------------------------------------------------------

def jsonld(*objs) -> str:
    return "".join(
        f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>'
        for o in objs
    )


def breadcrumb(items) -> dict:
    return {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name,
             "item": BASE_URL + path}
            for i, (name, path) in enumerate(items)
        ],
    }


def page(*, title, description, body, canonical, kind, slug="", head_extra=""):
    og_img = BASE_URL + "/og/default.png"
    return f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<link rel="alternate" type="application/rss+xml" title="{e(SITE_NAME)}" href="{e(BASE_URL)}/feed.xml">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE_NAME)}">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:image" content="{e(og_img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{e(og_img)}">
<meta name="theme-color" content="{ACCENT}">
<meta property="og:updated_time" content="{date.today().isoformat()}">
{head_extra}
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_HOVER};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};--card:#fff;}}
@media (prefers-color-scheme: dark){{
  :root:not([data-theme="light"]){{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;
  --muted:#a8a29e;--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}
}}
:root[data-theme="dark"]{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;--muted:#a8a29e;
--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.skip{{position:absolute;left:-999px;top:0;background:var(--accent);color:#fff;padding:8px 14px;border-radius:0 0 8px 0;z-index:99;}}
.skip:focus{{left:0;}}
.themebtn{{background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:3px 9px;font-size:.82rem;cursor:pointer;float:right;margin-top:-2px;}}
@media (prefers-reduced-motion:no-preference){{.card{{transition:transform .12s,box-shadow .12s;}}}}
.wrap{{max-width:880px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
.subnav{{font-size:.9rem;margin:8px 0 0;}} .subnav a{{margin-right:12px;}}
main{{padding:28px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:0 0 14px;}}
.card:hover{{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.08);}}
.card h2{{margin:0 0 6px;font-size:1.1rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;text-decoration:none;color:var(--muted);}}
a.chip:hover{{color:var(--accent-h);}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:10px 18px;border-radius:8px;font-weight:600;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:14px 0;font-size:.92rem;}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:24px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}}
.search{{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 12px;background:var(--card);color:var(--text);}}
.search:focus{{outline:2px solid var(--accent);border-color:var(--accent);}}
.filters{{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;}}
.fbtn{{background:var(--bg-alt);border:1px solid var(--border);color:var(--text);border-radius:999px;padding:5px 13px;font-size:.85rem;cursor:pointer;}}
.fbtn[aria-pressed="true"]{{background:var(--accent);color:#fff;border-color:var(--accent);}}
.noresult{{color:var(--muted);padding:14px 0;}}
.count{{color:var(--muted);font-size:.85rem;margin:0 0 10px;}}
.prompt-box{{background:var(--bg-alt);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin:14px 0;}}
.prompt-box pre{{white-space:pre-wrap;word-wrap:break-word;margin:0 0 12px;font-family:inherit;font-size:1rem;line-height:1.55;}}
.copybtn{{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:.92rem;font-weight:600;cursor:pointer;}}
.copybtn:hover{{background:var(--accent-h);}}
.azlist{{columns:2;column-gap:32px;padding-left:18px;}} @media(max-width:600px){{.azlist{{columns:1;}}}}
.azlist li{{margin:3px 0;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
footer a{{color:var(--muted);}}
</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
<header><div class="wrap">
<button class="themebtn" type="button" onclick="abanTheme()" aria-label="Design wechseln">🌓 Design</button>
<a href="{e(page_path('home'))}"><h1>📚 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(TAGLINE)}</div>
<nav class="subnav">
<a href="{e(page_path('home'))}">Alle Prompts</a>
<a href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Newsletter</a>
</nav>
</div></header>
<main id="main"><div class="wrap">
{body}
<aside class="nl">
<strong>📬 Taeglich KI auf Deutsch</strong>
<span>Kuratierte KI-News fuer den Arbeitsalltag, 5 Minuten, kein Hype.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a>
</aside>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} ·
<a href="https://abannews.com/datenschutz.html">Datenschutz</a> ·
<a href="https://abannews.com/impressum.html">Impressum</a> ·
Prompts redaktionell erstellt, Platzhalter selbst ausfuellen
</div></footer>
<script>
function abanTheme(){{var h=document.documentElement;var t=h.getAttribute('data-theme')==='dark'?'light':'dark';
h.setAttribute('data-theme',t);try{{localStorage.setItem('aban-theme',t);}}catch(e){{}}}}
(function(){{try{{var t=localStorage.getItem('aban-theme');if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}}})();
</script>
</body>
</html>"""


# --- Komponenten ---------------------------------------------------------------

def prompt_card(p: dict) -> str:
    search = " ".join([
        p["titel"], p["kategorie"], p["aufgabe"],
        p.get("erklaerung", ""), p.get("prompt_text", ""),
    ]).lower()
    return f"""<article class="card" data-s="{e(search)}" data-beruf="{e(p['kategorie'])}" data-aufgabe="{e(p['aufgabe'])}">
<h2><a href="{e(page_path('prompt', p['slug']))}">{e(p['titel'])}</a></h2>
<p class="meta">{e(p.get('erklaerung',''))}</p>
<p><a class="chip" href="{e(page_path('beruf', p['beruf_slug']))}">👤 {e(p['kategorie'])}</a>
<a class="chip" href="{e(page_path('aufgabe', p['aufgabe_slug']))}">🎯 {e(p['aufgabe'])}</a></p>
</article>"""


def itemlist_schema(prompts) -> dict:
    return {
        "@context": "https://schema.org", "@type": "ItemList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1,
             "url": BASE_URL + page_path("prompt", p["slug"]),
             "name": p["titel"]}
            for i, p in enumerate(prompts)
        ],
    }


# --- Seiten --------------------------------------------------------------------

def home_page(prompts, berufe, aufgaben) -> str:
    fb = "".join(
        f'<button class="fbtn" type="button" data-type="beruf" data-val="{e(b)}" '
        f'aria-pressed="false" onclick="abanFilter(this)">{e(b)}</button>'
        for b in berufe
    )
    fa = "".join(
        f'<button class="fbtn" type="button" data-type="aufgabe" data-val="{e(a)}" '
        f'aria-pressed="false" onclick="abanFilter(this)">{e(a)}</button>'
        for a in aufgaben
    )
    cards = "\n".join(prompt_card(p) for p in prompts)
    body = f"""<h1>{len(prompts)} deutsche KI-Prompts, sofort nutzbar</h1>
<p>Kopiere einen Prompt, fuelle die [Platzhalter] aus, fertig. Sortiert nach Beruf
und Aufgabe. Kein Konto, kein Tracking, kostenlos.</p>
<input class="search" id="q" type="search" placeholder="Prompt suchen, z.B. Angebot, E-Mail, Handwerker…"
 aria-label="Prompts durchsuchen" oninput="abanSearch()">
<div class="filters" id="f-beruf"><span class="chip" style="cursor:default">👤 Beruf:</span>{fb}</div>
<div class="filters" id="f-aufgabe"><span class="chip" style="cursor:default">🎯 Aufgabe:</span>{fa}</div>
<p class="count" id="count"></p>
<div id="list">
{cards}
</div>
<p class="noresult" id="noresult" hidden>Keine passenden Prompts. Suche oder Filter zuruecksetzen.</p>
<script>
(function(){{
  var list=document.getElementById('list');
  var cards=Array.prototype.slice.call(list.querySelectorAll('.card'));
  var q=document.getElementById('q');
  var active={{beruf:null,aufgabe:null}};
  function apply(){{
    var term=(q.value||'').trim().toLowerCase();
    var shown=0;
    cards.forEach(function(c){{
      var okText=!term||c.getAttribute('data-s').indexOf(term)>-1;
      var okB=!active.beruf||c.getAttribute('data-beruf')===active.beruf;
      var okA=!active.aufgabe||c.getAttribute('data-aufgabe')===active.aufgabe;
      var ok=okText&&okB&&okA;
      c.hidden=!ok; if(ok) shown++;
    }});
    document.getElementById('count').textContent=shown+' von '+cards.length+' Prompts';
    document.getElementById('noresult').hidden=shown>0;
  }}
  window.abanSearch=apply;
  window.abanFilter=function(btn){{
    var type=btn.getAttribute('data-type'),val=btn.getAttribute('data-val');
    var on=active[type]===val;
    active[type]=on?null:val;
    document.querySelectorAll('#f-'+type+' .fbtn').forEach(function(b){{
      b.setAttribute('aria-pressed', (!on && b===btn)?'true':'false');
    }});
    apply();
  }};
  apply();
}})();
</script>"""
    schema = jsonld(
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME,
         "url": BASE_URL + "/", "inLanguage": "de", "description": TAGLINE},
        {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME,
         "url": BASE_URL + "/", "description": TAGLINE},
        itemlist_schema(prompts),
    )
    desc = (f"{len(prompts)} praxistaugliche deutsche KI-Prompts fuer Beruf und Alltag: "
            "Angebote, E-Mails, Social Media, Recherche und mehr. Kopieren und nutzen.")
    return page(title=f"{SITE_NAME} — {len(prompts)} Prompts zum Kopieren",
                description=desc, body=schema + body,
                canonical=BASE_URL + page_path("home"), kind="home")


def prompt_page(p, related) -> str:
    crumb = breadcrumb([
        (SITE_NAME, page_path("home")),
        (p["kategorie"], page_path("beruf", p["beruf_slug"])),
        (p["titel"], page_path("prompt", p["slug"])),
    ])
    howto = {
        "@context": "https://schema.org", "@type": "HowTo",
        "name": p["titel"], "description": p.get("erklaerung", ""),
        "inLanguage": "de",
        "step": [
            {"@type": "HowToStep", "position": 1, "name": "Prompt kopieren",
             "text": "Kopiere den Prompt-Text mit dem Button."},
            {"@type": "HowToStep", "position": 2, "name": "Platzhalter ausfuellen",
             "text": "Ersetze alle [Platzhalter] durch deine Angaben."},
            {"@type": "HowToStep", "position": 3, "name": "In die KI einfuegen",
             "text": "Fuege den Prompt in dein KI-Werkzeug ein und pruefe das Ergebnis."},
        ],
    }
    related_html = ""
    if related:
        items = "\n".join(
            f'<li><a href="{e(page_path("prompt", r["slug"]))}">{e(r["titel"])}</a></li>'
            for r in related
        )
        related_html = (f'<h2 style="font-size:1.1rem;margin:22px 0 8px">Verwandte Prompts</h2>'
                        f'<ul>{items}</ul>')
    tipp_html = ""
    if p.get("tipp"):
        tipp_html = f'<div class="note"><strong>Tipp:</strong> {e(p["tipp"])}</div>'
    body = f"""<nav class="subnav"><a href="{e(page_path('home'))}">← Alle Prompts</a></nav>
<h1>{e(p['titel'])}</h1>
<p>
<a class="chip" href="{e(page_path('beruf', p['beruf_slug']))}">👤 {e(p['kategorie'])}</a>
<a class="chip" href="{e(page_path('aufgabe', p['aufgabe_slug']))}">🎯 {e(p['aufgabe'])}</a>
</p>
<p>{e(p.get('erklaerung',''))}</p>
<div class="prompt-box">
<pre id="prompt-text">{e(p['prompt_text'])}</pre>
<button class="copybtn" type="button" onclick="abanCopy(this)" data-target="prompt-text">📋 Prompt kopieren</button>
</div>
{tipp_html}
{related_html}
<script>
function abanCopy(btn){{
  var t=document.getElementById(btn.getAttribute('data-target')).innerText;
  var done=function(){{var o=btn.textContent;btn.textContent='✓ Kopiert';setTimeout(function(){{btn.textContent=o;}},1600);}};
  if(navigator.clipboard&&navigator.clipboard.writeText){{
    navigator.clipboard.writeText(t).then(done,function(){{abanFallback(t,done);}});
  }}else{{abanFallback(t,done);}}
}}
function abanFallback(t,cb){{
  var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.focus();ta.select();
  try{{document.execCommand('copy');cb();}}catch(e){{}}
  document.body.removeChild(ta);
}}
</script>"""
    desc = (p.get("erklaerung") or p["titel"])[:155]
    return page(title=f"{p['titel']} — Prompt fuer {p['kategorie']} | {SITE_NAME}",
                description=desc, body=jsonld(crumb, howto) + body,
                canonical=BASE_URL + page_path("prompt", p["slug"]),
                kind="prompt", slug=p["slug"])


def listing_page(kind, label, slug, prompts, intro) -> str:
    nav_label = "Beruf" if kind == "beruf" else "Aufgabe"
    crumb = breadcrumb([
        (SITE_NAME, page_path("home")),
        (label, page_path(kind, slug)),
    ])
    cards = "\n".join(prompt_card(p) for p in prompts)
    body = f"""<nav class="subnav"><a href="{e(page_path('home'))}">← Alle Prompts</a></nav>
<h1>{e(label)}: {len(prompts)} Prompts</h1>
<p>{e(intro)}</p>
{cards}"""
    desc = f"{label}: {len(prompts)} praxistaugliche deutsche KI-Prompts zum Kopieren. {intro}"[:155]
    return page(title=f"{label} — KI-Prompts ({nav_label}) | {SITE_NAME}",
                description=desc, body=jsonld(crumb, itemlist_schema(prompts)) + body,
                canonical=BASE_URL + page_path(kind, slug), kind=kind, slug=slug)


# --- Feeds / Sitemap -----------------------------------------------------------

def rss_feed(prompts) -> str:
    now = date.today().strftime("%a, %d %b %Y 00:00:00 +0000")
    items = []
    for p in prompts:
        link = BASE_URL + page_path("prompt", p["slug"])
        items.append(
            f"<item><title>{e(p['titel'])}</title><link>{e(link)}</link>"
            f"<guid>{e(link)}</guid><pubDate>{now}</pubDate>"
            f"<description>{e(p.get('erklaerung',''))}</description>"
            f"<category>{e(p['kategorie'])}</category></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0"><channel>'
            f"<title>{e(SITE_NAME)}</title><link>{e(BASE_URL)}/</link>"
            f"<description>{e(TAGLINE)}</description><language>de</language>"
            f"<lastBuildDate>{now}</lastBuildDate>" + "".join(items) +
            "</channel></rss>")


def sitemap(urls) -> str:
    today = date.today().isoformat()
    body = "\n".join(
        f"<url><loc>{e(BASE_URL + u)}</loc><lastmod>{today}</lastmod></url>"
        for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{body}\n</urlset>")


def robots() -> str:
    return ("User-agent: *\n"
            "Allow: /\n"
            "User-agent: GPTBot\n"
            "Allow: /\n"
            "User-agent: ClaudeBot\n"
            "Allow: /\n"
            "User-agent: PerplexityBot\n"
            "Allow: /\n"
            f"Sitemap: {BASE_URL}/sitemap.xml\n")


# --- Build ---------------------------------------------------------------------

def write(out: Path, kind: str, html_text: str, slug: str = "") -> str:
    f = out_file(out, kind, slug)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html_text, encoding="utf-8")
    return page_path(kind, slug)


def build(data_path: Path, out: Path) -> int:
    data = json.loads(data_path.read_text(encoding="utf-8"))
    prompts = data["prompts"]

    # Slugs + abgeleitete Slugs anreichern, Eindeutigkeit pruefen.
    seen = set()
    for p in prompts:
        p["slug"] = p.get("slug") or slugify(p["id"])
        if p["slug"] in seen:
            raise ValueError(f"Doppelter Slug: {p['slug']}")
        seen.add(p["slug"])
        p["beruf_slug"] = slugify(p["kategorie"])
        p["aufgabe_slug"] = slugify(p["aufgabe"])

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    # Gruppierungen (Reihenfolge stabil nach erstem Auftreten).
    berufe, aufgaben = [], []
    by_beruf, by_aufgabe = {}, {}
    for p in prompts:
        if p["kategorie"] not in by_beruf:
            by_beruf[p["kategorie"]] = []
            berufe.append(p["kategorie"])
        by_beruf[p["kategorie"]].append(p)
        if p["aufgabe"] not in by_aufgabe:
            by_aufgabe[p["aufgabe"]] = []
            aufgaben.append(p["aufgabe"])
        by_aufgabe[p["aufgabe"]].append(p)
    berufe.sort()
    aufgaben.sort()

    urls = []
    urls.append(write(out, "home", home_page(prompts, berufe, aufgaben)))

    for p in prompts:
        # Verwandt: gleiche Aufgabe ODER gleicher Beruf, ausser sich selbst.
        related = [r for r in prompts
                   if r["slug"] != p["slug"]
                   and (r["aufgabe"] == p["aufgabe"] or r["kategorie"] == p["kategorie"])][:4]
        urls.append(write(out, "prompt", prompt_page(p, related), p["slug"]))

    for b in berufe:
        items = by_beruf[b]
        slug = slugify(b)
        intro = (f"Prompts fuer {b}: konkrete Vorlagen fuer den Arbeitsalltag, "
                 "zum Kopieren und Ausfuellen.")
        urls.append(write(out, "beruf", listing_page("beruf", b, slug, items, intro), slug))

    for a in aufgaben:
        items = by_aufgabe[a]
        slug = slugify(a)
        intro = (f"Prompts fuer die Aufgabe {a}, ueber verschiedene Berufe hinweg.")
        urls.append(write(out, "aufgabe", listing_page("aufgabe", a, slug, items, intro), slug))

    (out / "feed.xml").write_text(rss_feed(prompts), encoding="utf-8")
    (out / "sitemap.xml").write_text(sitemap(urls), encoding="utf-8")
    (out / "robots.txt").write_text(robots(), encoding="utf-8")

    pages = len(urls)
    print(f"OK: {len(prompts)} Prompts, {len(berufe)} Berufe, {len(aufgaben)} Aufgaben")
    print(f"    {pages} HTML-Seiten + feed.xml + sitemap.xml + robots.txt -> {out}")
    return pages


def main():
    ap = argparse.ArgumentParser(description="Build der Deutschen KI-Prompt-Bibliothek")
    ap.add_argument("--out", default="dist", help="Ausgabeverzeichnis (Default: dist)")
    args = ap.parse_args()
    here = Path(__file__).resolve().parent
    out = Path(args.out)
    if not out.is_absolute():
        out = here / out
    build(here / "data" / "prompts.json", out)


if __name__ == "__main__":
    main()
