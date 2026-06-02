#!/usr/bin/env python3
"""Automatisierungs-Radar — static site generator (German, DACH-Fokus).

Reads the curated automation-tool database (data/anbieter.json) and an
affiliate-link mapping (affiliate.json) and renders a small, SEO-oriented static
site:
  - homepage (list + comparison table + client-side search)
  - one page per tool (SoftwareApplication schema + FAQ + breadcrumb)
  - one page per category (tool type), one page per market focus
  - sitemap.xml, robots.txt, RSS feed, legal pages, 404

Structurally modelled on voice-radar/generate.py: same brand tokens, the
same page shell (canonical / OG / hreflang / JSON-LD), pure stdlib, DSGVO-safe
(system fonts, no tracking, no third-party requests). Aban voice: anti-hype,
du-Form — KI-Automatisierung ist hype-lastig, hier wird ehrlich verglichen.

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

SITE_NAME = "Automatisierungs-Radar"
BASE_URL = "https://automatisierung.abannews.com"
LANG = "de"
# Newsletter-CTA verweist auf die bestehende Audience (Cross-Linking).
NEWSLETTER_URL = "https://abannews.com/gratis-ki-tools.html"

# Interner Redaktions-Marker — Daten-Flag, kein Besucher-Text.
REDAKTION_RE = re.compile(r"\[Redaktion:[^\]]*\]\s*")

UI = {
    "tagline": "KI- & Workflow-Automatisierungs-Tools, ehrlich verglichen — für den DACH-Raum",
    "all_tools": "← Alle Tools",
    "categories": "Kategorien",
    "focuses": "Schwerpunkt",
    "home_heading": "{n} Automatisierungs-Tools im Überblick",
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
    "best_in": "Beste Automatisierungs-Tools: {cat}",
    "focus_page": "Automatisierungs-Tools: {foc}",
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
    "honest": ("Ehrlich vorab: Ein Automatisierungs-Tool spart erst Zeit, wenn der Prozess "
               "dahinter sauber durchdacht ist — sonst automatisierst du nur das Chaos schneller. "
               "Plane ein paar Stunden zum Bauen und Testen ein, und rechne mit laufender Wartung, "
               "wenn sich eine verbundene App ändert. Verbindest du Tools über deine Konten, fließen "
               "womöglich personenbezogene Daten durch einen Drittanbieter: Auftragsverarbeitung (AVV) "
               "und Hosting-Standort musst du selbst klären. Dieser Radar vergleicht Werkzeuge — "
               "er verspricht keine fertige Lösung per Knopfdruck."),
    "meta_home": ("{n} KI- und Workflow-Automatisierungs-Tools im Vergleich: "
                  "EU-Hosting, deutsche Oberfläche, No-Code-Workflows, iPaaS, KI-Agenten, "
                  "RPA — ehrlich, ohne Hype."),
    "meta_tool": "{name} ({anbieter}): Typ, Schwerpunkt, Preismodell, Integrationen, EU-Hosting und offizieller Link.",
    "meta_cat": "Die besten KI- & Workflow-Automatisierungs-Tools im Bereich {cat} — ehrlich verglichen für DACH.",
    "meta_foc": "Automatisierungs-Tools mit Schwerpunkt {foc} — Funktionen und offizielle Links im Vergleich.",
    "pricing_model": "Preismodell",
    "filter_all": "Alle",
    "filter_eu": "Nur EU-Hosting",
    "filter_label": "Filtern",
    "decide_heading": "Welches Tool für welche Aufgabe?",
    "decide_intro": ("Es gibt nicht das eine beste Automatisierungs-Tool — es kommt auf deinen Fall an. "
                     "Ein paar typische Situationen und welche Tools dafür einen Blick wert sind:"),
    "guide": "Ratgeber",
    "guide_nav": "Ratgeber: Tool auswählen",
    "vs_heading": "Direkte Vergleiche",
    "vs_popular": "Beliebte Vergleiche",
    "usecase_nav": "Nach Anwendungsfall",
    "vs_word": "vs.",
    "verdict": "Wann welches?",
    "guide_title": "Automatisierungs-Tool auswählen: der ehrliche Leitfaden",
    "meta_guide": ("Wie du das richtige Automatisierungs-Tool findest: No-Code vs. Code, EU-Hosting & DSGVO, "
                   "Preismodelle (pro Task, pro Operation, nach Laufzeit), typische Fehler — ohne Hype."),
}


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def vs_slug(id_a: str, id_b: str) -> str:
    """Kanonischer, eindeutiger Slug für ein Vergleichspaar (alphabetisch sortiert)."""
    a, b = sorted([slugify(id_a), slugify(id_b)])
    return f"{a}-vs-{b}"


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
    if kind == "vs":
        return f"/vergleich/{slug}.html"
    if kind == "usecase":
        return f"/fuer/{slug}.html"
    if kind == "guide":
        return "/automatisierungs-tools-auswaehlen.html"
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
    '<path d="M34 14l-12 18h9l-3 18 14-20h-9z" fill="#fff" '
    'stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>'
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
.filters{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px;}}
.filters .lbl{{color:var(--muted);font-size:.85rem;font-weight:600;margin-right:2px;}}
.fbtn{{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:999px;padding:5px 13px;font-size:.85rem;cursor:pointer;}}
.fbtn:hover{{border-color:var(--accent);}}
.fbtn.active{{background:var(--accent-h);color:#fff;border-color:var(--accent-h);}}
.fbtn.eu[aria-pressed="true"]{{background:var(--success);border-color:var(--success);color:#fff;}}
.decide{{margin:18px 0;}} .decide h2{{font-size:1.2rem;margin:0 0 8px;}}
.decide ul{{list-style:none;padding:0;margin:0;}}
.decide li{{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;padding:10px 14px;margin:0 0 8px;}}
.decide li b{{display:block;margin-bottom:3px;}}
.tablewrap{{overflow-x:auto;-webkit-overflow-scrolling:touch;}}
.ctab{{width:100%;border-collapse:collapse;margin:14px 0;font-size:.92rem;}}
.ctab th,.ctab td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--border);}}
.ctab th{{color:var(--muted);font-weight:600;}} .ctab tr:hover td{{background:var(--bg-alt);}}
.ctab.vs th:first-child{{white-space:nowrap;}} .ctab.vs td{{vertical-align:top;}}
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
<a href="/"><h1>⚡ {e(SITE_NAME)}</h1></a>
<div class="tag">{e(UI['tagline'])}</div>
</div></header>
<main id="main"><div class="wrap">
{body}
<aside class="nl">
<strong>⚡ {e(UI['nl_title'])}</strong>
<span>{e(UI['nl_text'])}</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">{e(UI['nl_cta'])} →</a>
</aside>
<p class="disclosure">{e(UI['disclosure'])}</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/automatisierungs-tools-auswaehlen.html">{e(UI['guide'])}</a> ·
<a href="/datenschutz.html">{e(UI['privacy'])}</a> ·
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
               {"ja": f"Ja, {name} bietet laut Anbieter eine deutschsprachige Oberfläche bzw. deutschen Support.",
                "nein": f"Nein, {name} ist primär englischsprachig — die Bedienoberfläche gibt es (noch) nicht auf Deutsch.",
                "—": "Bitte beim Anbieter prüfen — wir raten hier nichts."}[bool_str(tool.get("deutsche_oberflaeche"))]))
    # EU-Hosting (der zentrale DACH-/DSGVO-Faktor)
    qa.append((f"Hostet {name} in der EU (DSGVO-relevant)?",
               {"ja": "Ja, laut Anbieter gibt es EU-Hosting bzw. EU-Datenverarbeitung — das erleichtert die DSGVO-Konformität, wenn personenbezogene Daten durch deine Workflows laufen.",
                "nein": "Nein, die Datenverarbeitung erfolgt überwiegend außerhalb der EU — Auftragsverarbeitung (AVV) und Drittlandtransfer (z. B. Standardvertragsklauseln) selbst prüfen, bevor du personenbezogene Daten durch das Tool leitest.",
                "—": "Teilweise/abhängig vom Tarif oder Self-Hosting — vor dem Start beim Anbieter und in dessen AVV/DPA prüfen."}[bool_str(tool.get("eu_lager"))]))
    # Integrationen
    integ = ", ".join(tool.get("integration", [])) or "—"
    qa.append((f"Welche Apps und Systeme lassen sich mit {name} verbinden?",
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
    # Filter-Attribute (Client-Side, kein Tracking): EU-Flag, Kategorie- & Fokus-Slugs.
    eu = "1" if tool.get("eu_lager") is True else ""
    cat_slugs = " ".join(slugify(c) for c in tool.get("kategorie", []))
    foc_slug = slugify(tool.get("fokus", "")) if tool.get("fokus") else ""
    pm = tool.get("preismodell")
    return f"""<article class="card" data-s="{e(search)}" data-eu="{e(eu)}" data-cats="{e(cat_slugs)}" data-fokus="{e(foc_slug)}">
<h2><a href="{e(page_path('tool', slugify(tool['id'])))}">{e(tool['name'])}</a> {score_html(tool)}</h2>
<div class="grid-meta">
<span>🏷 {e(tool.get('kategorie', ['—'])[0] if tool.get('kategorie') else '—')}</span>
<span>🌍 {e(tool.get('fokus','—'))}</span>
<span>💳 {e(pm or UI['unknown'])}</span>
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
            f'<td>{e(bool_str(t.get("eu_lager")))}</td>'
            f'<td>{e(bool_str(t.get("deutsche_oberflaeche")))}</td>'
            f'<td>{e(t.get("preismodell") or UI["unknown"])}</td>'
            f'<td><a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank" '
            f'style="padding:5px 12px">{e(UI["to_provider"])}{e(star)} →</a></td></tr>')
    return (f'<div class="tablewrap"><table class="ctab"><thead><tr><th>{e(UI["tool"])}</th>'
            f'<th>{e(UI["type"])}</th><th>{e(UI["eu_stock"])}</th>'
            f'<th>{e(UI["de_ui"])}</th><th>{e(UI["pricing_model"])}</th><th></th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


# --- Pages ---------------------------------------------------------------------

def tool_page(tool, aff, related, vs_partners=None):
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
    vs_html = ""
    if vs_partners:
        vlinks = " · ".join(
            f'<a href="{e(page_path("vs", vs_slug(tool["id"], p["id"])))}">'
            f'{e(tool["name"])} {e(UI["vs_word"])} {e(p["name"])}</a>'
            for p in vs_partners)
        vs_html = f'<p class="subnav"><strong>{e(UI["vs_heading"])}:</strong> {vlinks}</p>'
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
<span>💳 {e(UI['pricing_model'])}: {e(tool.get('preismodell') or UI['unknown'])}</span>
<span>💶 {e(UI['price'])}: {e(price_str(tool))}</span>
</div>
<p><strong>{e(UI['integration'])}:</strong><br>{integ or '—'}</p>
<p><strong>{e(UI['categories'])}:</strong><br>{cats or '—'}</p>
<p><strong>{e(UI['topics'])}:</strong><br>{themen or '—'}</p>
{('<div class="note"><strong>'+e(UI['editor_note'])+':</strong> '+e(note)+'</div>') if note else ''}
{('<div class="note"><strong>'+e(UI['price'])+':</strong> '+e(price_note)+'</div>') if price_note else ''}
{rel_html}
{vs_html}
<p class="subnav">📘 <a href="{e(page_path('guide'))}">{e(UI['guide_nav'])}</a></p>
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


# Kuratierte Situationen → passende Tools (per id). Reines Mapping, keine erfundenen
# Bewertungen — nur eine ehrliche Vorauswahl nach Einsatzzweck.
DECISIONS = [
    ("Du willst ohne Code starten und schnell zwei Apps verbinden",
     ["make", "zapier"]),
    ("EU-Hosting / DSGVO ist Pflicht (personenbezogene Daten im Spiel)",
     ["locoia", "make", "n8n", "bryter", "seatable"]),
    ("Du willst alles selbst hosten oder Open Source nutzen",
     ["n8n", "activepieces", "seatable"]),
    ("Du brauchst KI-Agenten, die Aufgaben eigenständig übernehmen",
     ["lindy", "gumloop", "bardeen", "relay-app"]),
    ("Enterprise: viele Systeme, RPA in Altsoftware ohne API",
     ["uipath", "automation-anywhere", "power-automate", "workato"]),
    ("Dein Betrieb läuft ohnehin auf Microsoft 365",
     ["power-automate"]),
    ("Du programmierst gern und willst eigenen Code zwischen den Schritten",
     ["pipedream", "n8n", "latenode"]),
]


def decide_section(tools):
    by_id = {t["id"]: t for t in tools}
    items = []
    for situation, ids in DECISIONS:
        links = " · ".join(
            f'<a href="{e(page_path("tool", slugify(i)))}">{e(by_id[i]["name"])}</a>'
            for i in ids if i in by_id)
        if links:
            items.append(f"<li><b>{e(situation)}</b>{links}</li>")
    return (f'<section class="decide"><h2>{e(UI["decide_heading"])}</h2>'
            f'<p class="meta">{e(UI["decide_intro"])}</p>'
            f'<ul>{"".join(items)}</ul></section>')


# Kuratierte Anwendungsfälle → passende Tools (per id). Reines Mapping aus echten Daten;
# der Generator erzeugt daraus je eine SEO-Seite /fuer/<slug>.html.
USE_CASES = [
    {"slug": "onlineshops", "name": "Onlineshops & E-Commerce",
     "intro": "Bestellungen, Lager, Newsletter und Buchhaltung verbinden — ohne dass du Daten "
              "von Hand hin- und herkopierst.",
     "ids": ["make", "zapier", "n8n", "parabola", "albato"]},
    {"slug": "marketing-agenturen", "name": "Marketing & Agenturen",
     "intro": "Leads, Kampagnen, Reporting und Tools wie HubSpot oder Slack zusammenspielen lassen "
              "— für mehrere Kund:innen parallel.",
     "ids": ["make", "zapier", "tray-ai", "workato", "gumloop"]},
    {"slug": "steuerberater-buchhaltung", "name": "Steuerberater & Buchhaltung",
     "intro": "Belege, DATEV, Rechnungen und Fristen automatisieren — mit Blick auf DSGVO und "
              "EU-Datenhaltung.",
     "ids": ["locoia", "make", "n8n", "power-automate", "bryter"]},
    {"slug": "vertrieb-crm", "name": "Vertrieb & CRM",
     "intro": "Neue Kontakte, Follow-ups und CRM-Pflege automatisieren, ohne dass Leads liegen bleiben.",
     "ids": ["bardeen", "lindy", "make", "zapier", "relay-app"]},
    {"slug": "dsgvo-sensible-branchen", "name": "DSGVO-sensible Branchen",
     "intro": "Wenn personenbezogene Daten im Spiel sind (Recht, Gesundheit, HR), zählt EU-Hosting "
              "und ein sauberer AVV mehr als der größte App-Katalog.",
     "ids": ["locoia", "bryter", "n8n", "seatable", "camunda"]},
    {"slug": "solo-selbststaendige", "name": "Solo-Selbstständige & kleine Teams",
     "intro": "Günstig starten, ohne IT-Abteilung: simple Verknüpfungen, die sofort Zeit sparen.",
     "ids": ["make", "zapier", "activepieces", "ifttt", "n8n"]},
]


def _yn(tool, key):
    return bool_str(tool.get(key))


def vs_verdict(a, b):
    """Ehrliche, datengetriebene Einordnung — kein erfundenes Ranking, nur reale Unterschiede."""
    pts = []
    na, nb = a["name"], b["name"]
    # EU-Hosting (zentraler DACH-Faktor)
    ea, eb = a.get("eu_lager"), b.get("eu_lager")
    if ea is True and eb is not True:
        pts.append(f"Brauchst du EU-Hosting/DSGVO-Nähe, ist {na} näher dran — bei {nb} musst du "
                   f"Datenregion und AVV genauer prüfen.")
    elif eb is True and ea is not True:
        pts.append(f"Brauchst du EU-Hosting/DSGVO-Nähe, ist {nb} näher dran — bei {na} musst du "
                   f"Datenregion und AVV genauer prüfen.")
    elif ea is True and eb is True:
        pts.append(f"Beide bieten EU-Hosting/EU-Datenverarbeitung — in puncto DSGVO sind {na} und "
                   f"{nb} gleichermaßen DACH-tauglich.")
    # Deutsche Oberfläche
    da, dba = a.get("deutsche_oberflaeche"), b.get("deutsche_oberflaeche")
    if da is True and dba is False:
        pts.append(f"{na} hat eine deutsche Oberfläche, {nb} ist englischsprachig.")
    elif dba is True and da is False:
        pts.append(f"{nb} hat eine deutsche Oberfläche, {na} ist englischsprachig.")
    # Preismodell
    pa, pb = a.get("preismodell"), b.get("preismodell")
    if pa and pb and pa != pb:
        pts.append(f"Abrechnung unterscheidet sich: {na} läuft über „{pa}“, {nb} über „{pb}“ — "
                   f"rechne mit deinem realen Volumen, nicht mit dem Einstiegspreis.")
    # Fokus
    fa, fb = a.get("fokus"), b.get("fokus")
    if fa and fb and fa != fb:
        pts.append(f"Schwerpunkt: {na} eher „{fa}“, {nb} eher „{fb}“ — wähle nach deinem Hauptzweck.")
    if not pts:
        pts.append(f"{na} und {nb} sind sich in den harten Fakten ähnlich — entscheide nach "
                   f"Integrationen, Bauchgefühl beim Editor und einem kurzen Praxistest.")
    return pts


def vs_compare_table(a, b):
    rows = [
        (UI["provider"], a.get("anbieter", "—"), b.get("anbieter", "—")),
        (UI["type"], ", ".join(a.get("kategorie", [])) or "—", ", ".join(b.get("kategorie", [])) or "—"),
        (UI["focus"], a.get("fokus", "—"), b.get("fokus", "—")),
        (UI["eu_stock"], _yn(a, "eu_lager"), _yn(b, "eu_lager")),
        (UI["de_ui"], _yn(a, "deutsche_oberflaeche"), _yn(b, "deutsche_oberflaeche")),
        (UI["pricing_model"], a.get("preismodell") or UI["unknown"], b.get("preismodell") or UI["unknown"]),
        (UI["language"], ", ".join(a.get("sprache", [])) or "—", ", ".join(b.get("sprache", [])) or "—"),
        (UI["format"], a.get("format", "—"), b.get("format", "—")),
        (UI["integration"], ", ".join(a.get("integration", [])) or "—", ", ".join(b.get("integration", [])) or "—"),
    ]
    trs = "".join(f"<tr><th>{e(label)}</th><td>{e(va)}</td><td>{e(vb)}</td></tr>"
                  for label, va, vb in rows)
    return (f'<div class="tablewrap"><table class="ctab vs"><thead><tr><th></th>'
            f'<th>{e(a["name"])}</th><th>{e(b["name"])}</th></tr></thead>'
            f'<tbody>{trs}</tbody></table></div>')


def vs_page(a, b, aff):
    """Vergleichsseite 'A vs. B' aus echten Daten (FAQPage + Breadcrumb-JSON-LD)."""
    # Reihenfolge stabil nach kanonischem Slug, damit Titel/URL konsistent sind.
    if slugify(a["id"]) > slugify(b["id"]):
        a, b = b, a
    slug = vs_slug(a["id"], b["id"])
    na, nb = a["name"], b["name"]
    title = f"{na} {UI['vs_word']} {nb}: ehrlicher Vergleich"
    ua, aff_a = affiliate_link(a, aff)
    ub, aff_b = affiliate_link(b, aff)
    sa, sb = (" *" if aff_a else ""), (" *" if aff_b else "")
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (f"{na} {UI['vs_word']} {nb}", page_path("vs", slug))])
    verdict = "".join(f"<li>{e(p)}</li>" for p in vs_verdict(a, b))
    note_a, note_b = clean(a.get("aban_note")), clean(b.get("aban_note"))
    faqs = [
        (f"Was ist der Hauptunterschied zwischen {na} und {nb}?",
         " ".join(vs_verdict(a, b))),
        (f"Welches Tool ist DSGVO-/EU-näher: {na} oder {nb}?",
         {("ja", "ja"): f"Beide bieten laut Anbieter EU-Hosting bzw. EU-Datenverarbeitung.",
          }.get((_yn(a, "eu_lager"), _yn(b, "eu_lager")),
                f"{na}: EU-Hosting {_yn(a,'eu_lager')}. {nb}: EU-Hosting {_yn(b,'eu_lager')}. "
                f"Maßgeblich ist die jeweilige Datenregion und der AVV — beim Anbieter prüfen.")),
    ]
    faq_html = "".join(
        f"<details><summary>{e(q)}</summary><p>{e(ans)}</p></details>" for q, ans in faqs)
    faq_schema = {"@context": "https://schema.org", "@type": "FAQPage",
                  "mainEntity": [{"@type": "Question", "name": q,
                                  "acceptedAnswer": {"@type": "Answer", "text": ans}}
                                 for q, ans in faqs]}
    schema = f'<script type="application/ld+json">{json.dumps(faq_schema, ensure_ascii=False)}</script>'
    body = f"""{crumb}{schema}
<p><a href="{e(page_path('home'))}">{e(UI['all_tools'])}</a></p>
<h1>{e(na)} {e(UI['vs_word'])} {e(nb)}</h1>
<p class="meta">Zwei {e(a.get('kategorie',['Automatisierungs'])[0] if a.get('kategorie') else 'Automatisierungs')}-Tools, ehrlich nebeneinandergestellt — echte Fakten, keine erfundenen Wertungen.</p>
{vs_compare_table(a, b)}
<div class="note"><strong>{e(UI['verdict'])}</strong><ul style="margin:8px 0 0">{verdict}</ul></div>
{('<h2>'+e(na)+'</h2><p>'+e(note_a)+'</p>') if note_a else ''}
{('<h2>'+e(nb)+'</h2><p>'+e(note_b)+'</p>') if note_b else ''}
<p>
<a class="cta" href="{e(ua)}" rel="sponsored nofollow" target="_blank">{e(na)}{e(sa)} →</a>
&nbsp;
<a class="cta" href="{e(ub)}" rel="sponsored nofollow" target="_blank">{e(nb)}{e(sb)} →</a>
</p>
<p class="subnav">Mehr: <a href="{e(page_path('tool', slugify(a['id'])))}">{e(na)} im Detail</a> ·
<a href="{e(page_path('tool', slugify(b['id'])))}">{e(nb)} im Detail</a> ·
📘 <a href="{e(page_path('guide'))}">{e(UI['guide_nav'])}</a></p>
<section class="faq"><h2>{e(UI['faq_heading'])}</h2>{faq_html}</section>"""
    desc = f"{na} {UI['vs_word']} {nb}: EU-Hosting, deutsche Oberfläche, Preismodell und Integrationen ehrlich verglichen — für DACH."
    return page(title=f"{title} — {SITE_NAME}", description=desc[:158], body=body,
                canonical=BASE_URL + page_path("vs", slug), kind="vs", slug=slug)


def usecase_page(uc, members, aff):
    slug = uc["slug"]
    title = f"Beste Automatisierungs-Tools für {uc['name']}"
    crumb = breadcrumb([(SITE_NAME, page_path("home")), (title, page_path("usecase", slug))])
    body = (f'{crumb}{itemlist(members)}'
            f'<p><a href="{e(page_path("home"))}">{e(UI["all_tools"])}</a></p>\n'
            f'<h1>{e(title)}</h1>\n'
            f'<p>{e(uc["intro"])}</p>\n'
            f'<p class="meta">Ehrliche Vorauswahl nach Einsatzzweck — Preise/Bewertungen werden nicht '
            f'geschätzt. Prüfe Datenregion und AVV, wenn personenbezogene Daten durch die Workflows laufen.</p>\n'
            f'{comp_table(members, aff)}\n'
            + "\n".join(tool_card(t, aff) for t in members)
            + f'\n<p class="subnav">📘 <a href="{e(page_path("guide"))}">{e(UI["guide_nav"])}</a></p>')
    desc = f"Automatisierungs-Tools für {uc['name']}: {uc['intro']}"[:158]
    return page(title=f"{title} — {SITE_NAME}", description=desc,
                body=body, canonical=BASE_URL + page_path("usecase", slug), kind="usecase", slug=slug)


# Kuratierte „beliebte Vergleiche" für die Startseite (nur Paare, die real existieren).
POPULAR_VS = [("n8n", "make"), ("make", "zapier"), ("n8n", "zapier"),
              ("uipath", "automation-anywhere"), ("zapier", "power-automate"),
              ("lindy", "gumloop")]


def home_page(tools, categories, focuses, aff):
    by_id = {t["id"]: t for t in tools}
    cat_links = " · ".join(
        f'<a href="{e(page_path("cat", slugify(c)))}">{e(c)}</a>' for c in categories)
    foc_links = " · ".join(
        f'<a href="{e(page_path("focus", slugify(f)))}">{e(f)}</a>' for f in focuses)
    uc_links = " · ".join(
        f'<a href="{e(page_path("usecase", uc["slug"]))}">{e(uc["name"])}</a>' for uc in USE_CASES)
    subnav = (f'<p class="subnav">📘 <a href="{e(page_path("guide"))}">{e(UI["guide_nav"])}</a></p>\n'
              f'<p class="subnav"><strong>{e(UI["categories"])}:</strong> {cat_links}</p>\n'
              f'<p class="subnav"><strong>{e(UI["focuses"])}:</strong> {foc_links}</p>\n'
              f'<p class="subnav"><strong>{e(UI["usecase_nav"])}:</strong> {uc_links}</p>')
    pop = [(a, b) for a, b in POPULAR_VS if a in by_id and b in by_id]
    vs_links = " · ".join(
        f'<a href="{e(page_path("vs", vs_slug(a, b)))}">{e(by_id[a]["name"])} {e(UI["vs_word"])} {e(by_id[b]["name"])}</a>'
        for a, b in pop)
    vs_block = (f'<p class="subnav"><strong>{e(UI["vs_popular"])}:</strong> {vs_links}</p>'
                if vs_links else "")
    # Interaktive Filter (Client-Side): Kategorie-Buttons + EU-Hosting-Toggle.
    cat_btns = (f'<button class="fbtn active" type="button" data-cat="">{e(UI["filter_all"])}</button>'
                + "".join(f'<button class="fbtn" type="button" data-cat="{e(slugify(c))}">{e(c)}</button>'
                          for c in categories))
    filters = (f'<div class="filters" id="filters" role="group" aria-label="{e(UI["filter_label"])}">'
               f'<span class="lbl">{e(UI["filter_label"])}:</span>{cat_btns}'
               f'<button class="fbtn eu" type="button" id="euToggle" aria-pressed="false">🇪🇺 {e(UI["filter_eu"])}</button>'
               f'</div>')
    search = (f'<input id="q" class="search" type="search" '
              f'placeholder="{e(UI["search_ph"])}" aria-label="{e(UI["search_ph"])}">')
    cards = "\n".join(tool_card(t, aff) for t in tools)
    body = (f'{site_schema()}{itemlist(tools)}'
            f'{subnav}\n'
            f'<div class="note">{e(UI["honest"])}</div>\n'
            f'{decide_section(tools)}\n'
            f'{vs_block}\n'
            f'<h2 style="margin:18px 0 12px">{e(UI["home_heading"].format(n=len(tools)))}</h2>\n'
            f'<p class="meta">Preise und Bewertungen werden nicht geschätzt. Was noch nicht '
            f'redaktionell geprüft ist, steht als „{e(UI["to_check"])}“ — bitte beim Anbieter prüfen. '
            f'„{e(UI["eu_stock"])}“ ist der wichtigste DACH-Filter: DSGVO-näher, EU-Datenverarbeitung, weniger Drittland-Aufwand, wenn personenbezogene Daten durch deine Workflows laufen.</p>\n'
            f'{comp_table(tools, aff)}\n'
            f'{search}\n{filters}\n<p id="nores" hidden>{e(UI["no_results"])}</p>\n{cards}\n'
            f'<script src="/search.js" defer></script>')
    return page(title=f"{SITE_NAME} — {UI['tagline']}",
                description=UI["meta_home"].format(n=len(tools)), body=body,
                canonical=BASE_URL + page_path("home"), kind="home")


def guide_page(tools, categories, focuses):
    """SEO-Cornerstone: ehrlicher Ratgeber zur Tool-Auswahl (Article + FAQPage + Breadcrumb)."""
    by_id = {t["id"]: t for t in tools}

    def link(i):
        return (f'<a href="{e(page_path("tool", slugify(i)))}">{e(by_id[i]["name"])}</a>'
                if i in by_id else e(i))

    def catlink(c):
        return f'<a href="{e(page_path("cat", slugify(c)))}">{e(c)}</a>'

    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (UI["guide_nav"], page_path("guide"))])
    faqs = [
        ("Brauche ich ein No-Code-Tool oder darf es Code sein?",
         "No-Code-Tools wie Make oder Zapier sind schneller eingerichtet und brauchen kein "
         "Programmieren. Sobald Logik komplexer wird oder du eigene APIs ansprichst, sparen "
         "Tools mit Code-Knoten (n8n, Pipedream, Latenode) langfristig Zeit — kosten aber "
         "etwas Einarbeitung. Faustregel: einfache Verknüpfungen No-Code, individuelle Logik mit Code."),
        ("Worauf muss ich beim Datenschutz (DSGVO) achten?",
         "Sobald personenbezogene Daten durch ein Tool laufen, brauchst du einen "
         "Auftragsverarbeitungsvertrag (AVV) und Klarheit über den Hosting-Standort. EU-Hosting "
         "(z. B. Locoia, Make EU-Region, BRYTER, SeaTable, self-gehostetes n8n) erspart dir den "
         "Aufwand mit Drittlandtransfer. Bei US-Tools die Standardvertragsklauseln und das aktuelle "
         "Datenschutz-Framework prüfen."),
        ("Was bedeuten die Preismodelle (pro Task, pro Operation, nach Laufzeit)?",
         "„pro Task“ (Zapier) zählt jede ausgeführte Aktion, „pro Operation“ (Make) jeden einzelnen "
         "Schritt im Szenario — bei vielen Schritten kann das teurer werden. „nach Laufzeit“ "
         "(Latenode) rechnet die Ausführungszeit ab, „Credits“ verbrauchen KI-Schritte. Rechne mit "
         "deinem realen Volumen durch, nicht mit dem Einstiegspreis."),
        ("Sind KI-Agenten in der Automatisierung schon zuverlässig?",
         "KI-Agenten (Lindy, Gumloop, Bardeen) können Aufgaben wie E-Mails sortieren oder Daten "
         "aufbereiten übernehmen — sie machen aber Fehler. Setze sie mit Kontrolle ein "
         "(Mensch bestätigt wichtige Schritte, z. B. mit Relay.app) und nicht blind auf Autopilot."),
        ("Was ist der häufigste Fehler beim Automatisieren?",
         "Einen unsauberen Prozess zu automatisieren. Ein Tool macht einen schlechten Ablauf nur "
         "schneller, nicht besser. Erst den Prozess klären und vereinfachen, dann automatisieren — "
         "und mit einem kleinen, gut testbaren Workflow anfangen."),
    ]
    faq_html = "".join(
        f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faqs)
    faq_schema = {"@context": "https://schema.org", "@type": "FAQPage",
                  "mainEntity": [{"@type": "Question", "name": q,
                                  "acceptedAnswer": {"@type": "Answer", "text": a}}
                                 for q, a in faqs]}
    art_schema = {"@context": "https://schema.org", "@type": "Article",
                  "headline": UI["guide_title"], "inLanguage": LANG,
                  "author": {"@type": "Organization", "name": SITE_NAME},
                  "publisher": {"@type": "Organization", "name": SITE_NAME},
                  "dateModified": date.today().isoformat(),
                  "description": UI["meta_guide"],
                  "mainEntityOfPage": BASE_URL + page_path("guide")}
    schema = ("".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
                      for x in (art_schema, faq_schema)))
    body = f"""{crumb}{schema}
<p><a href="{e(page_path('home'))}">{e(UI['all_tools'])}</a></p>
<h1>{e(UI['guide_title'])}</h1>
<p>Automatisierung wird gern als Wundermittel verkauft. Hier steht ohne Hype, wie du in fünf
Schritten das passende Tool findest — und welche Fehler dich Zeit und Geld kosten.</p>

<h2>1. Erst den Prozess klären, dann das Tool</h2>
<p>Bevor du ein Tool wählst: Schreib den Ablauf auf, den du automatisieren willst. Wo kommen die
Daten her, was soll passieren, wo landen sie? Ein automatisierter Chaos-Prozess bleibt Chaos —
nur schneller. Fang mit einem kleinen, klar abgegrenzten Workflow an.</p>

<h2>2. No-Code oder mit Code?</h2>
<p>Für einfache Verknüpfungen reichen No-Code-Werkzeuge wie {link('make')} oder {link('zapier')}.
Wird die Logik komplex oder brauchst du eigene APIs, lohnen Tools mit Code-Knoten wie
{link('n8n')}, {link('pipedream')} oder {link('latenode')}. Mehr dazu unter
{catlink('Workflow-Automatisierung (No-Code)')} und {catlink('iPaaS / App-Integration')}.</p>

<h2>3. EU-Hosting &amp; DSGVO prüfen (der DACH-Faktor)</h2>
<p>Laufen personenbezogene Daten durch das Tool, ist der Hosting-Standort entscheidend. EU-Hosting
spart dir den Aufwand mit Drittlandtransfer. Anbieter mit EU-Fokus: {link('locoia')},
{link('make')} (EU-Region), {link('bryter')}, {link('seatable')} und self-gehostetes {link('n8n')}.
Vertiefung: {catlink('Prozess-Orchestrierung / BPM')} und der Schwerpunkt
<a href="{e(page_path('focus', slugify('EU-Hosting / DSGVO')))}">EU-Hosting / DSGVO</a>.</p>

<h2>4. Preismodell zum eigenen Volumen rechnen</h2>
<p>Nicht der Einstiegspreis zählt, sondern dein reales Volumen. „pro Task“, „pro Operation“,
„nach Laufzeit“ oder „Credits“ verhalten sich bei vielen Schritten sehr unterschiedlich. Die
Spalte <em>{e(UI['pricing_model'])}</em> in der Übersicht zeigt dir das Modell jedes Tools.</p>

<h2>5. KI-Agenten: mit Kontrolle einsetzen</h2>
<p>KI-Agenten wie {link('lindy')}, {link('gumloop')} oder {link('bardeen')} übernehmen Aufgaben
eigenständig — machen aber Fehler. Baue Kontroll- und Freigabeschritte ein (z. B. mit
{link('relay-app')}), statt blind auf Autopilot zu vertrauen. Mehr unter
<a href="{e(page_path('focus', slugify('KI-Agenten')))}">KI-Agenten</a>.</p>

<section class="faq"><h2>{e(UI['faq_heading'])}</h2>{faq_html}</section>
<p class="subnav"><a href="{e(page_path('home'))}">→ Alle {len(tools)} Tools im Vergleich ansehen</a></p>"""
    return page(title=f"{UI['guide_title']} — {SITE_NAME}", description=UI["meta_guide"],
                body=body, canonical=BASE_URL + page_path("guide"), kind="guide")


# --- Legal (Operator: Alleng Chour, Belp/CH — wie ki-tools-radar) --------------
LEGAL_DOMAIN = "automatisierung.abannews.com"
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
beim Einsatz von Automatisierungs-Tools (z. B. Auftragsverarbeitung nach Art. 28 DSGVO, ggf.
Drittlandtransfer, wenn personenbezogene Daten durch deine Workflows laufen) liegen bei dir.</p>
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
<h2>6. Hinweis zu den verglichenen Automatisierungs-Tools</h2>
<p>Die hier verglichenen Automatisierungs-Tools laufen bei den jeweiligen Anbietern, nicht auf
dieser Website. Verbindest du dort deine Konten und Apps, fließen womöglich personenbezogene
Daten Dritter durch den Anbieter. Hosting-Standort, Auftragsverarbeitung (AVV) und ggf.
Drittlandtransfer klärst du direkt mit dem Anbieter — diese Website ist daran nicht beteiligt.</p>
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
    body = (f'<h1>⚡ 404 — Seite nicht gefunden</h1>\n'
            f'<p class="meta">Diese Seite gibt es nicht. Zurück zur Übersicht aller Automatisierungs-Tools.</p>\n'
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


SEARCH_JS = """// Automatisierungs-Radar — client-side suche + filter (no deps, no tracking)
(function () {
  var q = document.getElementById('q');
  var cards = Array.prototype.slice.call(document.querySelectorAll('article.card'));
  if (!cards.length) return;
  var nores = document.getElementById('nores');
  var catBtns = Array.prototype.slice.call(document.querySelectorAll('.fbtn[data-cat]'));
  var euBtn = document.getElementById('euToggle');
  var activeCat = '', euOnly = false;

  function apply() {
    var v = q ? q.value.trim().toLowerCase() : '', n = 0;
    cards.forEach(function (c) {
      var okText = !v || (c.dataset.s || '').indexOf(v) !== -1;
      var okCat = !activeCat || (' ' + (c.dataset.cats || '') + ' ').indexOf(' ' + activeCat + ' ') !== -1;
      var okEu = !euOnly || c.dataset.eu === '1';
      var show = okText && okCat && okEu;
      c.style.display = show ? '' : 'none';
      if (show) n++;
    });
    if (nores) nores.hidden = n > 0;
  }

  if (q) q.addEventListener('input', apply);
  catBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      activeCat = b.getAttribute('data-cat') || '';
      catBtns.forEach(function (x) { x.classList.toggle('active', x === b); });
      apply();
    });
  });
  if (euBtn) euBtn.addEventListener('click', function () {
    euOnly = !euOnly;
    euBtn.setAttribute('aria-pressed', euOnly ? 'true' : 'false');
    apply();
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

    # Vergleichspaare: alle Tools mit ≥1 gemeinsamer Kategorie (relevant statt thin).
    # Wächst automatisch mit jedem neuen Tool in der Datenbasis.
    import itertools
    by_id = {t["id"]: t for t in tools}
    vs_pairs = []
    vs_partners_map = {t["id"]: [] for t in tools}
    for a, b in itertools.combinations(tools_sorted, 2):
        if set(a.get("kategorie", [])) & set(b.get("kategorie", [])):
            vs_pairs.append((a, b))
            vs_partners_map[a["id"]].append(b)
            vs_partners_map[b["id"]].append(a)

    pages = 0
    # Homepage
    out_file(out, "home").write_text(
        home_page(tools_sorted, used_cats, used_focuses, aff), encoding="utf-8")
    pages += 1

    # Tool-Detailseiten (mit direkten Vergleichs-Links)
    for t in tools:
        of = out_file(out, "tool", slugify(t["id"]))
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(tool_page(t, aff, related_map.get(t["id"]),
                                vs_partners_map.get(t["id"], [])[:8]), encoding="utf-8")
        pages += 1

    # Vergleichsseiten „A vs. B" (programmatische SEO aus echten Daten)
    for a, b in vs_pairs:
        of = out_file(out, "vs", vs_slug(a["id"], b["id"]))
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(vs_page(a, b, aff), encoding="utf-8")
        pages += 1

    # Anwendungsfall-Seiten /fuer/<slug> (kuratiert, nur real existierende Tools)
    for uc in USE_CASES:
        members = [by_id[i] for i in uc["ids"] if i in by_id]
        if not members:
            continue
        of = out_file(out, "usecase", uc["slug"])
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(usecase_page(uc, members, aff), encoding="utf-8")
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

    # SEO-Ratgeber (Cornerstone)
    out_file(out, "guide").write_text(
        guide_page(tools_sorted, used_cats, used_focuses), encoding="utf-8")
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
    urls = ([BASE_URL + page_path("home"), BASE_URL + page_path("guide"),
             BASE_URL + page_path("imprint"), BASE_URL + page_path("privacy")]
            + [BASE_URL + page_path("tool", slugify(t["id"])) for t in tools]
            + [BASE_URL + page_path("cat", slugify(c)) for c in used_cats]
            + [BASE_URL + page_path("focus", slugify(f)) for f in used_focuses]
            + [BASE_URL + page_path("vs", vs_slug(a["id"], b["id"])) for a, b in vs_pairs]
            + [BASE_URL + page_path("usecase", uc["slug"]) for uc in USE_CASES
               if any(i in by_id for i in uc["ids"])])
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

    n_uc = sum(1 for uc in USE_CASES if any(i in by_id for i in uc["ids"]))
    print(f"Built {pages} HTML pages from {len(tools)} providers "
          f"({len(used_cats)} Kategorien, {len(used_focuses)} Schwerpunkte, "
          f"{len(vs_pairs)} Vergleiche, {n_uc} Anwendungsfälle) + sitemap + RSS → {out}/")
    return pages


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Automatisierungs-Radar generator")
    ap.add_argument("--data", default=str(here / "data" / "anbieter.json"))
    ap.add_argument("--affiliate", default=str(here / "affiliate.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.affiliate), Path(args.out))


if __name__ == "__main__":
    main()
