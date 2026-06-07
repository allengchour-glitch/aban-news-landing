#!/usr/bin/env python3
"""Webbaukasten-Radar — static site generator (German, DACH-Fokus).

Reads the curated AI/no-code website-builder database (data/anbieter.json) and an
affiliate-link mapping (affiliate.json) and renders a small, SEO-oriented static
site:
  - homepage (list + comparison table + client-side search)
  - one page per tool (SoftwareApplication schema + FAQ + breadcrumb)
  - one page per category (tool type), one page per market focus
  - sitemap.xml, robots.txt, RSS feed, legal pages, 404

Structurally modelled on newsletter-radar/generate.py: same brand tokens, the
same page shell (canonical / OG / hreflang / JSON-LD), pure stdlib, DSGVO-safe
(system fonts, no tracking, no third-party requests). Aban voice: anti-hype,
du-Form — Website-Baukästen sind marketinglastig, hier wird ehrlich verglichen.

DATEN-INTEGRITÄT: Preise und Bewertungen werden NICHT erfunden. Sie kommen
ausschließlich aus data/anbieter.json (null oder "[Redaktion: prüfen]"), bis ein
Mensch sie verifiziert. Der interne Marker "[Redaktion: prüfen]" wird in
Besucher-Texten ausgeblendet.

Usage:
    python3 generate.py
    python3 generate.py --out dist
"""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path

# --- Brand tokens (identisch zu css/styles.css :root der Hauptseite) -----------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "Webbaukasten-Radar"
BASE_URL = "https://webbaukasten.abannews.com"
LANG = "de"
# Newsletter-CTA verweist auf die bestehende Audience (Cross-Linking).
NEWSLETTER_URL = "https://abannews.com/gratis-ki-tools.html"

# Interner Redaktions-Marker — Daten-Flag, kein Besucher-Text.
REDAKTION_RE = re.compile(r"\[Redaktion:[^\]]*\]\s*")

UI = {
    "tagline": "KI- & No-Code-Website-Baukästen, ehrlich verglichen — für den DACH-Raum",
    "all_tools": "← Alle Tools",
    "categories": "Kategorien",
    "focuses": "Schwerpunkt",
    "home_heading": "{n} Website-Baukästen im Überblick",
    "provider": "Anbieter",
    "type": "Typ",
    "focus": "Schwerpunkt",
    "language": "Sprache",
    "topics": "Funktionen",
    "format": "Art",
    "integration": "Integrationen",
    "de_ui": "Deutsche Oberfläche",
    "eu_stock": "EU-Hosting",
    "price": "Preis",
    "score": "Wertung",
    "editor_note": "Einordnung",
    "to_provider": "Zum Anbieter",
    "best_in": "Beste Website-Baukästen: {cat}",
    "focus_page": "Website-Baukästen: {foc}",
    "privacy": "Datenschutz",
    "imprint": "Impressum",
    "data_note": "Daten: kuratiert, Anbieter-URLs verifizierbar",
    "to_check": "noch nicht geprüft",
    "free": "kostenlos starten",
    "yes": "ja",
    "no": "nein",
    "unknown": "—",
    "skip": "Zum Inhalt springen",
    "theme": "Design",
    "tool": "Tool",
    "updated": "Stand",
    "faq_heading": "Häufige Fragen",
    "nl_title": "Täglich KI auf Deutsch",
    "nl_text": "Kuratierte KI-News, 5 Minuten, kein Hype — von aban news.",
    "nl_cta": "Kostenlos abonnieren",
    "search_ph": "Tool, Anbieter oder Funktion suchen…",
    "no_results": "Keine Treffer.",
    "disclosure": ("Transparenz: Einige Links sind Affiliate-Links (mit * markiert). "
                   "Schließt du darüber etwas ab, erhalten wir eine Provision — "
                   "für dich ohne Mehrkosten. Die Einordnung ist davon unabhängig. "
                   "Aktuell sind alle Links Direktlinks zum Anbieter, ohne Provision."),
    "honest": ("Ehrlich vorab: Ein Baukasten nimmt dir die Inhalte nicht ab — Text, Bilder und "
               "Struktur entscheiden mehr über den Erfolg als das Tool. KI-Generatoren liefern einen "
               "schnellen ersten Entwurf, den du fast immer nacharbeitest. Achte auf Folgekosten "
               "(Verlängerungspreise nach Aktionen), die Portabilität (Umzug weg vom Anbieter) und "
               "bei Kontaktformularen/Shop auf DSGVO und Hosting-Standort. Dieser Radar vergleicht "
               "Werkzeuge — er verspricht kein Google-Ranking."),
    "meta_home": ("{n} KI- & No-Code-Website-Baukästen im Vergleich: "
                  "EU-Hosting, deutsche Oberfläche, KI-Generierung, Online-Shop "
                  "— ehrlich, ohne Hype, für DACH-Selbstständige."),
    "meta_tool": "{name} ({anbieter}): Typ, Schwerpunkt, Integrationen, EU-Hosting und offizieller Link.",
    "meta_cat": "Die besten KI- & No-Code-Website-Baukästen im Bereich {cat} — ehrlich verglichen für DACH.",
    "meta_foc": "Website-Baukästen mit Schwerpunkt {foc} — Funktionen und offizielle Links im Vergleich.",
}


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def clean(text):
    """Internen [Redaktion: prüfen]-Marker für Besucher entfernen."""
    if not text:
        return ""
    return REDAKTION_RE.sub("", str(text)).strip()


# --- URL helper ----------------------------------------------------------------

def page_path(kind: str, slug: str = "") -> str:
    if kind == "home":
        return "/"
    if kind == "tool":
        return f"/anbieter/{slug}.html"
    if kind == "cat":
        return f"/kategorie/{slug}.html"
    if kind == "focus":
        return f"/fokus/{slug}.html"
    if kind == "imprint":
        return "/impressum.html"
    if kind == "privacy":
        return "/datenschutz.html"
    return "/"


def out_file(out: Path, kind: str, slug: str = "") -> Path:
    p = page_path(kind, slug)
    if p.endswith("/"):
        p += "index.html"
    return out / p.lstrip("/")


# --- HTML shell ----------------------------------------------------------------

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    f'<rect width="64" height="64" rx="14" fill="{ACCENT}"/>'
    '<rect x="26" y="14" width="12" height="26" rx="6" fill="none" stroke="#fff" '
    'stroke-width="3"/>'
    '<path d="M18 32a14 14 0 0 0 28 0" fill="none" stroke="#fff" stroke-width="3" '
    'stroke-linecap="round"/>'
    '<path d="M32 46v6M24 52h16" fill="none" stroke="#fff" stroke-width="3" '
    'stroke-linecap="round"/></svg>'
)


def page(*, title, description, body, canonical, kind, slug=""):
    return f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<link rel="alternate" hreflang="de" href="{e(canonical)}">
<link rel="alternate" hreflang="x-default" href="{e(canonical)}">
<link rel="alternate" type="application/rss+xml" title="{e(SITE_NAME)}" href="{e(BASE_URL)}/feed.xml">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE_NAME)}">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="{e(canonical)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="{ACCENT}">
<meta property="og:updated_time" content="{date.today().isoformat()}">
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
main{{padding:28px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin:0 0 14px;}}
.card:hover{{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.08);}}
.card h2{{margin:0 0 6px;font-size:1.15rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.score{{display:inline-block;background:var(--success);color:#fff;border-radius:999px;
padding:2px 10px;font-size:.85rem;font-weight:600;}}
.score.na{{background:var(--muted);}}
.flag{{display:inline-block;border-radius:999px;padding:2px 9px;font-size:.78rem;font-weight:600;}}
.flag.on{{background:var(--success);color:#fff;}} .flag.off{{background:var(--muted);color:#fff;}}
.flag.na{{background:var(--bg-alt);color:var(--muted);border:1px solid var(--border);}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:10px 18px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.92rem;}}
.grid-meta{{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.88rem;color:var(--muted);}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:22px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}}
.nl .cta{{margin-top:0;}}
.subnav{{font-size:.9rem;margin:6px 0 0;}}
.search{{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 14px;}}
.search:focus{{outline:2px solid var(--accent);border-color:var(--accent);}}
.ctab{{width:100%;border-collapse:collapse;margin:14px 0;font-size:.92rem;}}
.ctab th,.ctab td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--border);}}
.ctab th{{color:var(--muted);font-weight:600;}} .ctab tr:hover td{{background:var(--bg-alt);}}
.faq{{margin:22px 0;}} .faq h2{{font-size:1.1rem;margin:0 0 8px;}}
.faq details{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;margin:0 0 8px;}}
.faq summary{{cursor:pointer;font-weight:600;}} .faq details p{{margin:8px 0 0;color:var(--muted);}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
</style>
</head>
<body>
<a class="skip" href="#main">{e(UI['skip'])}</a>
<header><div class="wrap">
<button class="themebtn" type="button" onclick="abanTheme()" aria-label="{e(UI['theme'])}">🌓 {e(UI['theme'])}</button>
<a href="/"><h1>🎙️ {e(SITE_NAME)}</h1></a>
<div class="tag">{e(UI['tagline'])}</div>
</div></header>
<main id="main"><div class="wrap">
{body}
<aside class="nl">
<strong>🎙️ {e(UI['nl_title'])}</strong>
<span>{e(UI['nl_text'])}</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">{e(UI['nl_cta'])} →</a>
</aside>
<p class="disclosure">{e(UI['disclosure'])}</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/datenschutz.html">{e(UI['privacy'])}</a> ·
<a href="/impressum.html">{e(UI['imprint'])}</a> · {e(UI['data_note'])}
</div></footer>
<script>
function abanTheme(){{var h=document.documentElement;var t=h.getAttribute('data-theme')==='dark'?'light':'dark';
h.setAttribute('data-theme',t);try{{localStorage.setItem('aban-theme',t);}}catch(e){{}}}}
(function(){{try{{var t=localStorage.getItem('aban-theme');if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}}})();
</script>
</body>
</html>"""


# --- Provider helpers ----------------------------------------------------------

def price_str(tool):
    """Ehrlicher Preis-String: 0 -> kostenlos starten, Zahl -> Betrag, sonst 'noch nicht geprüft'."""
    p = tool.get("preis_eur")
    if p == 0:
        return UI["free"]
    if isinstance(p, (int, float)):
        return f"ab {p} EUR"
    return UI["to_check"]


def score_html(tool):
    s = tool.get("worth_it_score")
    if s is None:
        return f'<span class="score na" title="{e(UI["to_check"])}">–/10</span>'
    return f'<span class="score">{e(s)}/10</span>'


def affiliate_link(tool, aff):
    """Aktiver Affiliate-Link (falls freigeschaltet) sonst offizielle Anbieter-URL."""
    entry = aff.get(tool["id"])
    if entry and entry.get("affiliate_url"):
        return entry["affiliate_url"], True
    return tool.get("url", "#"), False


def bool_str(value):
    if value is True:
        return UI["yes"]
    if value is False:
        return UI["no"]
    return UI["unknown"]


def flag(label, value):
    """Farb-Badge für ja/nein/unbekannt (EU-Hosting, deutsche Oberfläche)."""
    if value is True:
        return f'<span class="flag on">{e(label)}: {e(UI["yes"])}</span>'
    if value is False:
        return f'<span class="flag off">{e(label)}: {e(UI["no"])}</span>'
    return f'<span class="flag na">{e(label)}: {e(UI["unknown"])}</span>'


# --- JSON-LD -------------------------------------------------------------------

def tool_jsonld(tool):
    data = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": tool["name"],
        "url": tool.get("url"),
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "inLanguage": tool.get("sprache", ["de"]),
        "publisher": {"@type": "Organization", "name": tool.get("anbieter", "")},
    }
    desc = clean(tool.get("aban_note")) or UI["meta_tool"].format(
        name=tool["name"], anbieter=tool.get("anbieter", ""))
    data["description"] = desc
    if tool.get("themen"):
        data["keywords"] = ", ".join(tool["themen"])
    # Preis NUR ausgeben, wenn echt vorhanden (0 oder Zahl) — niemals geschätzt.
    p = tool.get("preis_eur")
    if isinstance(p, (int, float)):
        data["offers"] = {"@type": "Offer", "price": str(p), "priceCurrency": "EUR",
                          "category": "Free" if p == 0 else "Paid",
                          "url": tool.get("url")}
    # Bewertung NUR ausgeben, wenn redaktionell geprüft (nicht null).
    s = tool.get("worth_it_score")
    if s is not None:
        data["review"] = {"@type": "Review",
                          "author": {"@type": "Organization", "name": SITE_NAME},
                          "reviewRating": {"@type": "Rating", "ratingValue": str(s),
                                           "bestRating": "10"}}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def breadcrumb(items):
    elems = [{"@type": "ListItem", "position": i + 1, "name": name, "item": BASE_URL + path}
             for i, (name, path) in enumerate(items)]
    data = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": elems}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def itemlist(members):
    elems = [{"@type": "ListItem", "position": i + 1,
              "url": BASE_URL + page_path("tool", slugify(t["id"])), "name": t["name"]}
             for i, t in enumerate(members)]
    data = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": elems}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def site_schema():
    data = [
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME,
         "url": BASE_URL + "/", "inLanguage": LANG, "description": UI["tagline"]},
        {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME,
         "url": BASE_URL + "/", "description": UI["tagline"]},
    ]
    return "".join(
        f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
        for x in data)


def faq_section(tool):
    """Sichtbares FAQ (Accordion) + FAQPage JSON-LD aus den Anbieterdaten."""
    name = tool["name"]
    anbieter = tool.get("anbieter", "")
    qa = []
    # Preis — ehrlich, ohne Erfindung.
    pricetxt = price_str(tool)
    if tool.get("preis_eur") is None:
        pricetxt = (f"Den aktuellen Preis prüfst du am besten direkt beim Anbieter "
                    f"({anbieter}). Wir schätzen keine Preise.")
    else:
        ph = clean(tool.get("preis_hinweis"))
        if ph:
            pricetxt = f"{pricetxt}. {ph}"
    qa.append((f"Was kostet {name}?", pricetxt))
    # Deutsche Oberfläche (DACH-relevant)
    qa.append((f"Hat {name} eine deutsche Oberfläche?",
               {"ja": f"Ja, {name} bietet laut Anbieter eine deutschsprachige Oberfläche.",
                "nein": f"Nein, {name} ist primär englischsprachig — die Oberfläche vor dem Einsatz testweise prüfen.",
                "—": "Bitte beim Anbieter prüfen — wir raten hier nichts."}[bool_str(tool.get("deutsche_oberflaeche"))]))
    # EU-Hosting (der zentrale DACH-/DSGVO-Faktor)
    qa.append((f"Hostet {name} in der EU (DSGVO-relevant)?",
               {"ja": "Ja, laut Anbieter gibt es EU-Hosting bzw. EU-Datenverarbeitung — das erleichtert die DSGVO-Konformität, gerade bei Kontaktformularen und Shop.",
                "nein": "Nein, die Datenverarbeitung erfolgt überwiegend außerhalb der EU — Auftragsverarbeitung (AVV) und Drittlandtransfer (z. B. Standardvertragsklauseln) selbst prüfen, bevor du personenbezogene Daten (Formulare, Bestellungen) verarbeitest.",
                "—": "Teilweise/abhängig vom Tarif — vor dem Start beim Anbieter und in dessen AVV/DPA prüfen."}[bool_str(tool.get("eu_lager"))]))
    # Integrationen
    integ = ", ".join(tool.get("integration", [])) or "—"
    qa.append((f"Mit welchen Systemen lässt sich {name} verbinden?",
               f"Laut Anbieter u. a.: {integ}."))
    # Eignung
    qa.append((f"Für wen eignet sich {name}?",
               f"Typ: {', '.join(tool.get('kategorie', [])) or '—'}. "
               f"Schwerpunkt: {tool.get('fokus', '—')}."))
    details = "".join(
        f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in qa)
    schema = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q,
                              "acceptedAnswer": {"@type": "Answer", "text": a}}
                             for q, a in qa]}
    script = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
    return f'<section class="faq"><h2>{e(UI["faq_heading"])}</h2>{details}</section>{script}'


# --- Components ----------------------------------------------------------------

def tool_card(tool, aff):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    cats = "".join(f'<span class="chip">{e(c)}</span>' for c in tool.get("kategorie", []))
    search = " ".join([tool["name"], tool.get("anbieter", ""), tool.get("fokus", "")]
                      + tool.get("kategorie", []) + tool.get("themen", [])
                      + tool.get("integration", [])).lower()
    return f"""<article class="card" data-s="{e(search)}">
<h2><a href="{e(page_path('tool', slugify(tool['id'])))}">{e(tool['name'])}</a> {score_html(tool)}</h2>
<div class="grid-meta">
<span>🏷 {e(tool.get('kategorie', ['—'])[0] if tool.get('kategorie') else '—')}</span>
<span>🌍 {e(tool.get('fokus','—'))}</span>
<span>💶 {e(price_str(tool))}</span>
</div>
<p style="margin:8px 0 4px">{flag(UI['eu_stock'], tool.get('eu_lager'))} {flag(UI['de_ui'], tool.get('deutsche_oberflaeche'))}</p>
<p class="meta">{cats}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(UI['to_provider'])}{e(star)} →</a>
</article>"""


def comp_table(tools, aff):
    rows = []
    for t in tools:
        url, is_aff = affiliate_link(t, aff)
        star = " *" if is_aff else ""
        rows.append(
            f'<tr><td><a href="{e(page_path("tool", slugify(t["id"])))}">{e(t["name"])}</a></td>'
            f'<td>{e(t.get("kategorie", ["—"])[0] if t.get("kategorie") else "—")}</td>'
            f'<td>{e(t.get("fokus","—"))}</td>'
            f'<td>{e(bool_str(t.get("eu_lager")))}</td>'
            f'<td>{e(price_str(t))}</td>'
            f'<td><a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank" '
            f'style="padding:5px 12px">{e(UI["to_provider"])}{e(star)} →</a></td></tr>')
    return (f'<table class="ctab"><thead><tr><th>{e(UI["tool"])}</th>'
            f'<th>{e(UI["type"])}</th><th>{e(UI["focus"])}</th>'
            f'<th>{e(UI["eu_stock"])}</th><th>{e(UI["price"])}</th><th></th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>')


# --- Pages ---------------------------------------------------------------------

def tool_page(tool, aff, related):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    slug = slugify(tool["id"])
    note = clean(tool.get("aban_note"))
    price_note = clean(tool.get("preis_hinweis"))
    cats = "".join(
        f'<a class="chip" href="{e(page_path("cat", slugify(c)))}">{e(c)}</a>'
        for c in tool.get("kategorie", []))
    themen = "".join(f'<span class="chip">{e(t)}</span>' for t in tool.get("themen", []))
    integ = "".join(f'<span class="chip">{e(i)}</span>' for i in tool.get("integration", []))
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (tool["name"], page_path("tool", slug))])
    rel_html = ""
    if related:
        links = " · ".join(
            f'<a href="{e(page_path("tool", slugify(r["id"])))}">{e(r["name"])}</a>'
            for r in related)
        rel_html = f'<p class="subnav"><strong>Ähnliche Tools:</strong> {links}</p>'
    body = f"""{tool_jsonld(tool)}{crumb}{itemlist([tool])}
<p><a href="{e(page_path('home'))}">{e(UI['all_tools'])}</a></p>
<h1 style="margin:0 0 6px">{e(tool['name'])} {score_html(tool)}</h1>
<p style="margin:6px 0 10px">{flag(UI['eu_stock'], tool.get('eu_lager'))} {flag(UI['de_ui'], tool.get('deutsche_oberflaeche'))}</p>
<div class="grid-meta" style="margin:10px 0">
<span>🕒 {e(UI['updated'])}: {date.today().strftime('%m/%Y')}</span>
<span>🏛 {e(UI['provider'])}: {e(tool.get('anbieter','—'))}</span>
<span>🏷 {e(UI['type'])}: {e(", ".join(tool.get('kategorie', [])) or '—')}</span>
<span>🌍 {e(UI['focus'])}: <a href="{e(page_path('focus', slugify(tool.get('fokus','x'))))}">{e(tool.get('fokus','—'))}</a></span>
<span>🗣 {e(UI['language'])}: {e(", ".join(tool.get("sprache", [])) or "—")}</span>
<span>🧩 {e(UI['format'])}: {e(tool.get('format','—'))}</span>
<span>💶 {e(UI['price'])}: {e(price_str(tool))}</span>
</div>
<p><strong>{e(UI['integration'])}:</strong><br>{integ or '—'}</p>
<p><strong>{e(UI['categories'])}:</strong><br>{cats or '—'}</p>
<p><strong>{e(UI['topics'])}:</strong><br>{themen or '—'}</p>
{('<div class="note"><strong>'+e(UI['editor_note'])+':</strong> '+e(note)+'</div>') if note else ''}
{('<div class="note"><strong>'+e(UI['price'])+':</strong> '+e(price_note)+'</div>') if price_note else ''}
{rel_html}
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(UI['to_provider'])} ({e(tool.get('anbieter',''))}){e(star)} →</a>
{faq_section(tool)}"""
    desc = (note or UI["meta_tool"].format(
        name=tool["name"], anbieter=tool.get("anbieter", "")))[:155]
    return page(title=f"{tool['name']} — {SITE_NAME}", description=desc, body=body,
                canonical=BASE_URL + page_path("tool", slug), kind="tool", slug=slug)


def category_page(cat, members, aff):
    slug = slugify(cat)
    title = UI["best_in"].format(cat=cat)
    crumb = breadcrumb([(SITE_NAME, page_path("home")), (title, page_path("cat", slug))])
    body = (f'{crumb}{itemlist(members)}'
            f'<p><a href="{e(page_path("home"))}">{e(UI["all_tools"])}</a></p>\n'
            f'<h1>{e(title)}</h1>\n{comp_table(members, aff)}\n'
            + "\n".join(tool_card(t, aff) for t in members))
    return page(title=f"{title} — {SITE_NAME}", description=UI["meta_cat"].format(cat=cat),
                body=body, canonical=BASE_URL + page_path("cat", slug), kind="cat", slug=slug)


def focus_page(foc, members, aff):
    slug = slugify(foc)
    title = UI["focus_page"].format(foc=foc)
    crumb = breadcrumb([(SITE_NAME, page_path("home")), (title, page_path("focus", slug))])
    body = (f'{crumb}{itemlist(members)}'
            f'<p><a href="{e(page_path("home"))}">{e(UI["all_tools"])}</a></p>\n'
            f'<h1>{e(title)}</h1>\n{comp_table(members, aff)}\n'
            + "\n".join(tool_card(t, aff) for t in members))
    return page(title=f"{title} — {SITE_NAME}", description=UI["meta_foc"].format(foc=foc),
                body=body, canonical=BASE_URL + page_path("focus", slug), kind="focus", slug=slug)


def home_page(tools, categories, focuses, aff):
    cat_links = " · ".join(
        f'<a href="{e(page_path("cat", slugify(c)))}">{e(c)}</a>' for c in categories)
    foc_links = " · ".join(
        f'<a href="{e(page_path("focus", slugify(f)))}">{e(f)}</a>' for f in focuses)
    subnav = (f'<p class="subnav"><strong>{e(UI["categories"])}:</strong> {cat_links}</p>\n'
              f'<p class="subnav"><strong>{e(UI["focuses"])}:</strong> {foc_links}</p>')
    search = (f'<input id="q" class="search" type="search" '
              f'placeholder="{e(UI["search_ph"])}" aria-label="{e(UI["search_ph"])}">')
    cards = "\n".join(tool_card(t, aff) for t in tools)
    body = (f'{site_schema()}{itemlist(tools)}'
            f'{subnav}\n'
            f'<div class="note">{e(UI["honest"])}</div>\n'
            f'<h2 style="margin:18px 0 12px">{e(UI["home_heading"].format(n=len(tools)))}</h2>\n'
            f'<p class="meta">Preise und Bewertungen werden nicht geschätzt. Was noch nicht '
            f'redaktionell geprüft ist, steht als „{e(UI["to_check"])}“ — bitte beim Anbieter prüfen. '
            f'„{e(UI["eu_stock"])}“ ist der wichtigste DACH-Filter: DSGVO-näher, EU-Datenverarbeitung, weniger Drittland-Aufwand bei Formularen und Shop.</p>\n'
            f'{comp_table(tools, aff)}\n'
            f'{search}\n<p id="nores" hidden>{e(UI["no_results"])}</p>\n{cards}\n'
            f'<script src="/search.js" defer></script>')
    return page(title=f"{SITE_NAME} — {UI['tagline']}",
                description=UI["meta_home"].format(n=len(tools)), body=body,
                canonical=BASE_URL + page_path("home"), kind="home")


# --- Legal (Operator: Alleng Chour, Belp/CH — wie ki-tools-radar) --------------
LEGAL_DOMAIN = "webbaukasten.abannews.com"
LEGAL_EMAIL = "hallo@abannews.com"
OPERATOR = {"name": "Alleng Chour", "addr1": "Hühnerhubelstrasse 37",
            "addr2": "3123 Belp", "country": "Schweiz"}


def imprint_page():
    o = OPERATOR
    body = f"""<p><a href="/">← {e(UI['all_tools'])}</a></p>
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>{e(SITE_NAME)}</strong><br>
{e(o['name'])}<br>{e(o['addr1'])}<br>{e(o['addr2'])}<br>{e(o['country'])}</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:{e(LEGAL_EMAIL)}">{e(LEGAL_EMAIL)}</a><br>Website: {e(LEGAL_DOMAIN)}</p>
<h2>Verantwortlich für den Inhalt</h2>
<p>{e(o['name'])}, {e(o['addr1'])}, {e(o['addr2'])}, {e(o['country'])}</p>
<h2>Haftung für Links</h2>
<p>Unser Angebot enthält Links zu externen Websites Dritter (Tool-Anbieter und Plattformen),
auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige
Anbieter verantwortlich. Preise, Konditionen, Hosting-Standorte und Verfügbarkeit können sich
beim Anbieter jederzeit ändern — maßgeblich ist die Anbieterseite.</p>
<h2>Kein Rechts-/Datenschutzberatung</h2>
<p>Dieser Radar vergleicht Werkzeuge und ersetzt keine Rechts- oder Datenschutzberatung. Pflichten
beim Einsatz von Website-Baukästen (z. B. DSGVO-konforme Kontaktformulare und Shops,
Auftragsverarbeitung nach Art. 28 DSGVO, ggf. Drittlandtransfer beim Hosting) liegen bei dir.</p>
<h2>Affiliate-Hinweis</h2>
<p>Diese Website kann Affiliate-Links enthalten (mit * gekennzeichnet). Erfolgt über einen
solchen Link ein Abschluss, erhalten wir eine Provision — ohne Mehrkosten für dich. Die
Einordnung ist davon unabhängig. Aktuell sind alle Links Direktlinks ohne Provision.</p>"""
    return page(title=f"Impressum — {SITE_NAME}", description="Impressum und Anbieterkennzeichnung.",
                body=body, canonical=BASE_URL + page_path("imprint"), kind="imprint")


def privacy_page():
    body = f"""<p><a href="/">← {e(UI['all_tools'])}</a></p>
<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2>
<p>{e(OPERATOR['name'])}, {e(OPERATOR['addr1'])}, {e(OPERATOR['addr2'])}, {e(OPERATOR['country'])}<br>
E-Mail: <a href="mailto:{e(LEGAL_EMAIL)}">{e(LEGAL_EMAIL)}</a></p>
<h2>2. Allgemeine Hinweise</h2>
<p>Diese Website ist als statische Seite ohne Nutzerkonten, ohne Tracking und ohne
Werbe-Cookies aufgebaut. Es werden nur Daten verarbeitet, die technisch zur Auslieferung
der Seite nötig sind.</p>
<h2>3. Server-Logs &amp; Hosting</h2>
<p>Beim Aufruf erhebt unser Hosting-Anbieter (Cloudflare Pages) automatisch Server-Logdaten
(z. B. IP-Adresse, Zeitpunkt, abgerufene Seite). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
DSGVO (sicherer Betrieb). Es besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.</p>
<h2>4. Keine Cookies, kein Tracking</h2>
<p>Wir setzen keine Analyse- oder Marketing-Cookies und binden keine externen Schriftarten
oder Tracking-Dienste ein. Ein Cookie-Banner ist daher nicht erforderlich.</p>
<h2>5. Affiliate-Links</h2>
<p>Auf Anbieterseiten verlinken wir auf Tools und Plattformen. Erst wenn du einen solchen Link
anklickst, wirst du zum Anbieter weitergeleitet, der dann nach seiner eigenen
Datenschutzerklärung ein Cookie zur Provisionszuordnung setzen kann. Vorher findet keine
Übermittlung deiner Daten an die Anbieter statt.</p>
<h2>6. Hinweis zu den verglichenen Baukästen</h2>
<p>Die hier verglichenen Website-Baukästen laufen bei den jeweiligen Anbietern, nicht auf dieser
Website. Sobald du dort eine Seite baust und z. B. ein Kontaktformular oder einen Shop betreibst,
verarbeitest du womöglich personenbezogene Daten Dritter. Hosting-Standort, Auftragsverarbeitung
(AVV) und ggf. Drittlandtransfer klärst du direkt mit dem Anbieter — diese Website ist daran
nicht beteiligt.</p>
<h2>7. Newsletter</h2>
<p>Interessierst du dich für den Newsletter (aban news), wirst du auf dessen eigene Seite
weitergeleitet; Anmeldung und Datenverarbeitung erfolgen dort.</p>
<h2>8. Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
und Widerspruch (Art. 15–21 DSGVO) sowie ein Beschwerderecht bei einer Aufsichtsbehörde.</p>
<h2>9. Stand</h2>
<p>Stand: {date.today().strftime('%m/%Y')}.</p>"""
    return page(title=f"Datenschutz — {SITE_NAME}", description="Datenschutzerklärung dieser Website.",
                body=body, canonical=BASE_URL + page_path("privacy"), kind="privacy")


def notfound_page():
    body = (f'<h1>🎙️ 404 — Seite nicht gefunden</h1>\n'
            f'<p class="meta">Diese Seite gibt es nicht. Zurück zur Übersicht aller Website-Baukästen.</p>\n'
            f'<a class="cta" href="{e(page_path("home"))}">{e(SITE_NAME)} →</a>')
    return page(title=f"404 — {SITE_NAME}", description="Seite nicht gefunden.", body=body,
                canonical=BASE_URL + page_path("home"), kind="home")


# --- Feeds / sitemap -----------------------------------------------------------

def rss_feed(tools):
    now = date.today().strftime("%a, %d %b %Y 00:00:00 +0000")
    items = []
    for t in tools:
        link = BASE_URL + page_path("tool", slugify(t["id"]))
        desc = clean(t.get("aban_note")) or f"{t['name']} von {t.get('anbieter','')}"
        items.append(f"<item><title>{e(t['name'])} ({e(t.get('anbieter',''))})</title>"
                     f"<link>{e(link)}</link><guid>{e(link)}</guid>"
                     f"<pubDate>{now}</pubDate><description>{e(desc)}</description></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0"><channel>'
            f"<title>{e(SITE_NAME)}</title><link>{e(BASE_URL)}/</link>"
            f"<description>{e(UI['tagline'])}</description><language>de</language>"
            f"<lastBuildDate>{now}</lastBuildDate>" + "".join(items) + "</channel></rss>")


SEARCH_JS = """// Webbaukasten-Radar — client-side filter (no deps, no tracking)
(function () {
  var q = document.getElementById('q');
  if (!q) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('article.card'));
  var nores = document.getElementById('nores');
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var show = !v || (c.dataset.s || '').indexOf(v) !== -1;
      c.style.display = show ? '' : 'none';
      if (show) n++;
    });
    if (nores) nores.hidden = n > 0;
  });
})();
"""


# --- Build ---------------------------------------------------------------------

def build(data_path: Path, aff_path: Path, out: Path) -> int:
    db = json.loads(data_path.read_text(encoding="utf-8"))
    tools = db.get("anbieter", [])
    categories = db.get("kategorien") or sorted({c for t in tools for c in t.get("kategorie", [])})
    focuses = db.get("fokus") or sorted({t.get("fokus", "") for t in tools if t.get("fokus")})

    aff = {}
    if aff_path.exists():
        aff = json.loads(aff_path.read_text(encoding="utf-8")).get("links", {})
    # Deaktivierte Slots (Key mit '_'-Präfix) ignorieren — Fallback = offizielle URL.
    aff = {k: v for k, v in aff.items() if not k.startswith("_")}

    if out.exists():
        import shutil
        shutil.rmtree(out)
    out.mkdir(parents=True)

    # Sortierung: EU-Hosting zuerst (DACH-Relevanz), dann geprüfte Wertung, dann alphabetisch.
    # Kein erfundener Default-Score — null bleibt hinten.
    def sort_key(t):
        eu_rank = 0 if t.get("eu_lager") is True else (1 if t.get("eu_lager") is None else 2)
        return (eu_rank, -(t.get("worth_it_score") or -1), t["name"].lower())
    tools_sorted = sorted(tools, key=sort_key)

    by_cat = {}
    for t in tools_sorted:
        for cat in t.get("kategorie", []):
            by_cat.setdefault(cat, []).append(t)
    by_focus = {}
    for t in tools_sorted:
        if t.get("fokus"):
            by_focus.setdefault(t["fokus"], []).append(t)

    # Ähnliche Tools: bis zu 4 mit gemeinsamer Kategorie.
    related_map = {}
    for t in tools:
        seen, rel = {t["id"]}, []
        for cat in t.get("kategorie", []):
            for cand in by_cat.get(cat, []):
                if cand["id"] not in seen:
                    seen.add(cand["id"])
                    rel.append(cand)
        related_map[t["id"]] = rel[:4]

    used_cats = [c for c in categories if c in by_cat]
    used_focuses = [f for f in focuses if f in by_focus]

    pages = 0
    # Homepage
    out_file(out, "home").write_text(
        home_page(tools_sorted, used_cats, used_focuses, aff), encoding="utf-8")
    pages += 1

    # Tool-Detailseiten
    for t in tools:
        of = out_file(out, "tool", slugify(t["id"]))
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(tool_page(t, aff, related_map.get(t["id"])), encoding="utf-8")
        pages += 1

    # Kategorie-Seiten
    for cat in used_cats:
        of = out_file(out, "cat", slugify(cat))
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(category_page(cat, by_cat[cat], aff), encoding="utf-8")
        pages += 1

    # Schwerpunkt-Seiten
    for foc in used_focuses:
        of = out_file(out, "focus", slugify(foc))
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(focus_page(foc, by_focus[foc], aff), encoding="utf-8")
        pages += 1

    # Rechtsseiten + 404
    out_file(out, "imprint").write_text(imprint_page(), encoding="utf-8")
    out_file(out, "privacy").write_text(privacy_page(), encoding="utf-8")
    pages += 2
    (out / "404.html").write_text(notfound_page(), encoding="utf-8")

    # RSS
    (out / "feed.xml").write_text(rss_feed(tools_sorted), encoding="utf-8")

    # Sitemap
    today = date.today().isoformat()
    urls = ([BASE_URL + page_path("home"),
             BASE_URL + page_path("imprint"), BASE_URL + page_path("privacy")]
            + [BASE_URL + page_path("tool", slugify(t["id"])) for t in tools]
            + [BASE_URL + page_path("cat", slugify(c)) for c in used_cats]
            + [BASE_URL + page_path("focus", slugify(f)) for f in used_focuses])
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        sm.append(f"  <url><loc>{e(url)}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")

    # robots.txt — KI-Crawler ausdrücklich erlauben (GEO/AEO: zitierbar bleiben).
    ai_bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
               "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
               "Bytespider", "CCBot", "Amazonbot", "meta-externalagent"]
    lines = ["User-agent: *", "Allow: /", ""]
    for bot in ai_bots:
        lines += [f"User-agent: {bot}", "Allow: /", ""]
    lines.append(f"Sitemap: {BASE_URL}/sitemap.xml")
    (out / "robots.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Statische Assets (favicon, client-side search).
    (out / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    (out / "search.js").write_text(SEARCH_JS, encoding="utf-8")

    print(f"Built {pages} HTML pages from {len(tools)} providers "
          f"({len(used_cats)} Kategorien, {len(used_focuses)} Schwerpunkt-Seiten) + sitemap + RSS → {out}/")
    return pages


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Webbaukasten-Radar generator")
    ap.add_argument("--data", default=str(here / "data" / "anbieter.json"))
    ap.add_argument("--affiliate", default=str(here / "affiliate.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.affiliate), Path(args.out))


if __name__ == "__main__":
    main()
