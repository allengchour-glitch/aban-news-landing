#!/usr/bin/env python3
"""KI-Tools Radar — multilingual static site generator.

Reads the curated AI-tools database (data/tools.json) + per-language content
packs (lang/<code>.json) + a German pro/contra critique (content/critique.de.json),
and renders a multilingual, SEO-oriented static site:
  - one localized site per language (de at root, others under /<code>/)
  - homepage + one page per tool + one page per category, per language
  - hreflang alternate links + language switcher + sitemap + robots + JSON-LD

Fully automatable, pure stdlib, no external deps. DSGVO-safe (system fonts, no tracking).

Usage:
    python generate.py
    python generate.py --out dist
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# --- Brand tokens (from Aban News css/styles.css :root) ------------------------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "KI-Tools Radar"
BASE_URL = "https://ki-tools-radar.de"   # set to real domain before launch

# Languages: 'de' is the base (root). Others are loaded from lang/<code>.json.
# Add a code here + drop a lang/<code>.json to publish another language.
LANGUAGES = ["de", "en", "fr", "es", "it", "pt", "nl", "pl", "tr", "ja", "zh"]
LANG_NAMES = {
    "de": "Deutsch", "en": "English", "fr": "Français", "es": "Español",
    "it": "Italiano", "pt": "Português", "nl": "Nederlands", "pl": "Polski",
    "tr": "Türkçe", "ja": "日本語", "zh": "中文",
}

# --- Base (German) UI strings. Other languages override via lang/<code>.json["ui"]
UI_DE = {
    "tagline": "Ehrlich bewertete KI-Tools für den deutschsprachigen Raum",
    "all_tools": "← Alle Tools",
    "categories": "Kategorien",
    "home_heading": "{n} KI-Tools, ehrlich bewertet",
    "use_cases": "Einsatzgebiete",
    "editor_note": "Redaktions-Notiz",
    "dsgvo": "DSGVO",
    "pro": "Pro",
    "contra": "Contra",
    "alternatives": "Alternativen",
    "cta": "Zu {name}",
    "best_in": "Beste {cat}-Tools",
    "dach": "DACH-Relevanz",
    "free": "kostenlos",
    "price_from": "ab",
    "language": "Sprache",
    "privacy": "Datenschutz",
    "imprint": "Impressum",
    "data_note": "Daten: kuratiert, KI-unterstützt recherchiert",
    "disclosure": ("Transparenz: Einige Links sind Affiliate-Links (mit * markiert). "
                   "Kaufst du darüber, erhalten wir eine Provision — für dich ohne "
                   "Mehrkosten. Die Bewertungen sind davon unabhängig."),
    "meta_home": ("{n} KI-Tools für den DACH-Raum: ehrliche Bewertungen, Pricing, "
                  "DSGVO-Hinweise, Pro/Contra und Alternativen."),
    "meta_tool": "{name} im Test: Bewertung, Pro & Contra, Pricing, DSGVO, Alternativen.",
    "meta_cat": "Die besten {cat}-KI-Tools, ehrlich bewertet und verglichen.",
}


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


# --- Localization loading ------------------------------------------------------

def load_locales(here: Path) -> dict:
    """Build {lang: {"ui": {...}, "tools": {id: {...}}}} for every language.

    German UI is the in-code base; German tool notes come from tools.json plus
    content/critique.de.json (pro/contra). Other languages come from lang/<code>.json,
    falling back to German for any missing string/field.
    """
    locales = {}
    de_critique = {}
    crit_path = here / "content" / "critique.de.json"
    if crit_path.exists():
        de_critique = json.loads(crit_path.read_text(encoding="utf-8")).get("tools", {})
    locales["de"] = {"ui": dict(UI_DE), "tools": de_critique}

    for code in LANGUAGES:
        if code == "de":
            continue
        path = here / "lang" / f"{code}.json"
        if not path.exists():
            continue
        pack = json.loads(path.read_text(encoding="utf-8"))
        ui = dict(UI_DE)
        ui.update(pack.get("ui", {}))
        locales[code] = {"ui": ui, "tools": pack.get("tools", {})}
    return locales


def page_path(lang: str, kind: str, slug: str = "") -> str:
    """URL path for a page in a language. de lives at root, others under /<code>/."""
    prefix = "" if lang == "de" else f"/{lang}"
    if kind == "home":
        return f"{prefix}/" if prefix else "/"
    if kind == "tool":
        return f"{prefix}/tool/{slug}.html"
    if kind == "cat":
        return f"{prefix}/kategorie/{slug}.html"
    return prefix + "/"


def out_file(out: Path, lang: str, kind: str, slug: str = "") -> Path:
    p = page_path(lang, kind, slug)
    if p.endswith("/"):
        p += "index.html"
    return out / p.lstrip("/")


# --- HTML shell ----------------------------------------------------------------

def hreflang_block(available: list[str], kind: str, slug: str = "") -> str:
    out = []
    for code in available:
        out.append(
            f'<link rel="alternate" hreflang="{code}" '
            f'href="{e(BASE_URL + page_path(code, kind, slug))}">'
        )
    out.append(
        f'<link rel="alternate" hreflang="x-default" '
        f'href="{e(BASE_URL + page_path("de", kind, slug))}">'
    )
    return "\n".join(out)


def lang_switcher(available: list[str], current: str, kind: str, slug: str = "") -> str:
    links = []
    for code in available:
        label = LANG_NAMES.get(code, code)
        if code == current:
            links.append(f'<strong>{e(label)}</strong>')
        else:
            links.append(f'<a href="{e(page_path(code, kind, slug))}">{e(label)}</a>')
    return " · ".join(links)


def page(*, lang, ui, title, description, body, canonical,
         available, kind, slug=""):
    return f"""<!DOCTYPE html>
<html lang="{e(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
{hreflang_block(available, kind, slug)}
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_HOVER};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.wrap{{max-width:880px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
.langbar{{font-size:.82rem;color:var(--muted);margin-top:8px;}}
.langbar a{{color:var(--muted);}}
main{{padding:28px 0;}}
.card{{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin:0 0 14px;}}
.card h2{{margin:0 0 6px;font-size:1.15rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.score{{display:inline-block;background:var(--success);color:#fff;border-radius:999px;
padding:2px 10px;font-size:.85rem;font-weight:600;}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:10px 18px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.92rem;}}
.pc{{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0;}}
.pc>div{{flex:1;min-width:220px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 16px;}}
.pc h3{{margin:0 0 6px;font-size:1rem;}} .pc .pro h3{{color:var(--success);}} .pc .contra h3{{color:#b91c1c;}}
.pc ul{{margin:0;padding-left:18px;}}
.grid-meta{{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.88rem;color:var(--muted);}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="{e(page_path(lang,'home'))}"><h1>📡 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(ui['tagline'])}</div>
<div class="langbar">🌐 {lang_switcher(available, lang, kind, slug)}</div>
</div></header>
<main><div class="wrap">
{body}
<p class="disclosure">{e(ui['disclosure'])}</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="{e(page_path(lang,'home'))}datenschutz.html">{e(ui['privacy'])}</a> ·
<a href="{e(page_path(lang,'home'))}impressum.html">{e(ui['imprint'])}</a> · {e(ui['data_note'])}
</div></footer>
</body>
</html>"""


# --- Content components --------------------------------------------------------

def price_str(tool, ui):
    p = tool.get("pricing", {})
    if p.get("paid_from_eur"):
        return f"{ui['price_from']} {p['paid_from_eur']} {p.get('currency','EUR')}"
    return ui["free"] if p.get("free_tier") else "—"


def affiliate_link(tool, aff):
    entry = aff.get(tool["id"])
    if entry and entry.get("affiliate_url"):
        return entry["affiliate_url"], True
    return tool.get("url", "#"), False


def tool_card(tool, aff, ui, lang):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    cats = "".join(f'<span class="chip">{e(c)}</span>' for c in tool.get("category", []))
    return f"""<article class="card">
<h2><a href="{e(page_path(lang,'tool',slugify(tool['id'])))}">{e(tool['name'])}</a>
<span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h2>
<div class="grid-meta">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(price_str(tool, ui))}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p class="meta">{cats}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>
</article>"""


def jsonld(tool):
    p = tool.get("pricing", {})
    data = {
        "@context": "https://schema.org", "@type": "SoftwareApplication",
        "name": tool["name"], "applicationCategory": (tool.get("category") or ["AI"])[0],
        "operatingSystem": "Web", "url": tool.get("url"),
    }
    if tool.get("vendor"):
        data["author"] = {"@type": "Organization", "name": tool["vendor"]}
    if p.get("paid_from_eur") is not None or p.get("free_tier"):
        data["offers"] = {"@type": "Offer", "price": str(p.get("paid_from_eur", 0)),
                          "priceCurrency": p.get("currency", "EUR")}
    if tool.get("worth_it_score") is not None:
        data["review"] = {"@type": "Review",
                          "author": {"@type": "Organization", "name": SITE_NAME},
                          "reviewRating": {"@type": "Rating",
                                           "ratingValue": str(tool["worth_it_score"]),
                                           "bestRating": "10"}}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def pro_contra(loc_tool, ui):
    pros = loc_tool.get("pro") or []
    contras = loc_tool.get("contra") or []
    if not pros and not contras:
        return ""
    pli = "".join(f"<li>{e(x)}</li>" for x in pros)
    cli = "".join(f"<li>{e(x)}</li>" for x in contras)
    return f"""<div class="pc">
<div class="pro"><h3>✓ {e(ui['pro'])}</h3><ul>{pli}</ul></div>
<div class="contra"><h3>✗ {e(ui['contra'])}</h3><ul>{cli}</ul></div>
</div>"""


def tool_page(tool, aff, ui, loc_tools, lang, available):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    loc = loc_tools.get(tool["id"], {})
    note = loc.get("aban_note") or tool.get("aban_note")
    dsgvo = loc.get("dsgvo_note") or tool.get("dsgvo_note")
    use_cases = loc.get("use_cases") or tool.get("use_cases", [])
    uc = "".join(f'<span class="chip">{e(u)}</span>' for u in use_cases)
    alts = ", ".join(e(a) for a in tool.get("alternatives", [])) or "—"
    p = tool.get("pricing", {})
    price_extra = (f" · {ui['price_from']} {p['paid_from_eur']} {p.get('currency','EUR')}"
                   if p.get("paid_from_eur") else "")
    body = f"""{jsonld(tool)}
<p><a href="{e(page_path(lang,'home'))}">{e(ui['all_tools'])}</a></p>
<h1 style="margin:0">{e(tool['name'])} <span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h1>
<div class="grid-meta" style="margin:10px 0">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(p.get('model','—'))}{e(price_extra)}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p><strong>{e(ui['use_cases'])}:</strong><br>{uc or '—'}</p>
{pro_contra(loc, ui)}
{'<div class="note"><strong>'+e(ui['editor_note'])+':</strong> '+e(note)+'</div>' if note else ''}
{'<div class="note"><strong>'+e(ui['dsgvo'])+':</strong> '+e(dsgvo)+'</div>' if dsgvo else ''}
<p><strong>{e(ui['alternatives'])}:</strong> {alts}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>"""
    desc = (note or ui["meta_tool"].format(name=tool["name"]))[:155]
    return page(lang=lang, ui=ui,
                title=f"{tool['name']} — {SITE_NAME}", description=desc, body=body,
                canonical=BASE_URL + page_path(lang, "tool", slugify(tool["id"])),
                available=available, kind="tool", slug=slugify(tool["id"]))


# --- Build ---------------------------------------------------------------------

def build(data_path: Path, aff_path: Path, out: Path, here: Path) -> int:
    db = json.loads(data_path.read_text(encoding="utf-8"))
    tools = db.get("tools", [])
    aff = {}
    if aff_path.exists():
        aff = json.loads(aff_path.read_text(encoding="utf-8")).get("links", {})

    locales = load_locales(here)
    available = [c for c in LANGUAGES if c in locales]

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    tools_sorted = sorted(
        tools, key=lambda t: (t.get("worth_it_score", 0), t.get("dach_relevance", 0)),
        reverse=True)
    categories = sorted({c for t in tools for c in t.get("category", [])})

    pages = 0
    for lang in available:
        ui = locales[lang]["ui"]
        loc_tools = locales[lang]["tools"]

        # Homepage
        cat_links = " · ".join(
            f'<a href="{e(page_path(lang,"cat",slugify(c)))}">{e(c)}</a>' for c in categories)
        cards = "\n".join(tool_card(t, aff, ui, lang) for t in tools_sorted)
        home_body = (f'<p class="meta">{e(ui["categories"])}: {cat_links}</p>\n'
                     f'<h2 style="margin:18px 0 12px">{e(ui["home_heading"].format(n=len(tools)))}</h2>\n{cards}')
        of = out_file(out, lang, "home")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(page(lang=lang, ui=ui,
                           title=f"{SITE_NAME} — {ui['tagline']}",
                           description=ui["meta_home"].format(n=len(tools)),
                           body=home_body, canonical=BASE_URL + page_path(lang, "home"),
                           available=available, kind="home"), encoding="utf-8")
        pages += 1

        # Tool pages
        for t in tools:
            of = out_file(out, lang, "tool", slugify(t["id"]))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(tool_page(t, aff, ui, loc_tools, lang, available), encoding="utf-8")
            pages += 1

        # Category pages
        for c in categories:
            members = [t for t in tools_sorted if c in t.get("category", [])]
            body = (f'<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
                    f'<h1>{e(ui["best_in"].format(cat=c))}</h1>\n'
                    + "\n".join(tool_card(t, aff, ui, lang) for t in members))
            of = out_file(out, lang, "cat", slugify(c))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(page(lang=lang, ui=ui,
                              title=ui["best_in"].format(cat=c) + f" — {SITE_NAME}",
                              description=ui["meta_cat"].format(cat=c), body=body,
                              canonical=BASE_URL + page_path(lang, "cat", slugify(c)),
                              available=available, kind="cat", slug=slugify(c)), encoding="utf-8")
            pages += 1

    # sitemap.xml across all languages
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for lang in available:
        for url in ([BASE_URL + page_path(lang, "home")]
                    + [BASE_URL + page_path(lang, "tool", slugify(t["id"])) for t in tools]
                    + [BASE_URL + page_path(lang, "cat", slugify(c)) for c in categories]):
            sm.append(f"  <url><loc>{e(url)}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")
    (out / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")

    print(f"Built {pages} pages across {len(available)} languages "
          f"({', '.join(available)}) + sitemap + robots → {out}/")
    return pages


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here.parent / "data" / "tools.json"))
    ap.add_argument("--affiliate", default=str(here / "affiliate.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.affiliate), Path(args.out), here)


if __name__ == "__main__":
    main()
