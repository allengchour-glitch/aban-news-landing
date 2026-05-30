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


# --- Extra UI strings for the new page types (curated translations, all langs) -
NEW_UI = {
    "verdict": {"de": "Fazit", "en": "Verdict", "fr": "Verdict", "es": "Veredicto",
                "it": "Verdetto", "pt": "Veredito", "nl": "Conclusie", "pl": "Werdykt",
                "tr": "Sonuç", "ja": "結論", "zh": "结论"},
    "winner": {"de": "Vorne: {name}", "en": "Ahead: {name}", "fr": "En tête : {name}",
               "es": "Por delante: {name}", "it": "In testa: {name}", "pt": "À frente: {name}",
               "nl": "Voorop: {name}", "pl": "Na czele: {name}", "tr": "Önde: {name}",
               "ja": "優勢: {name}", "zh": "领先：{name}"},
    "tie": {"de": "Kopf-an-Kopf", "en": "Neck and neck", "fr": "Au coude-à-coude",
            "es": "Muy igualado", "it": "Testa a testa", "pt": "Empate técnico",
            "nl": "Nek aan nek", "pl": "Łeb w łeb", "tr": "Başa baş", "ja": "互角", "zh": "势均力敌"},
    "comparisons": {"de": "Vergleiche", "en": "Comparisons", "fr": "Comparatifs",
                    "es": "Comparativas", "it": "Confronti", "pt": "Comparações",
                    "nl": "Vergelijkingen", "pl": "Porównania", "tr": "Karşılaştırmalar",
                    "ja": "比較", "zh": "对比"},
    "by_use_case": {"de": "Nach Einsatzzweck", "en": "By use case", "fr": "Par cas d'usage",
                    "es": "Por caso de uso", "it": "Per caso d'uso", "pt": "Por caso de uso",
                    "nl": "Per toepassing", "pl": "Według zastosowania",
                    "tr": "Kullanım alanına göre", "ja": "用途別", "zh": "按用途"},
    "dsgvo_nav": {"de": "Top für DACH", "en": "Top for DACH", "fr": "Top pour DACH",
                  "es": "Top para DACH", "it": "Top per DACH", "pt": "Top para DACH",
                  "nl": "Top voor DACH", "pl": "Top dla DACH", "tr": "DACH için en iyi",
                  "ja": "DACH向けトップ", "zh": "DACH 首选"},
    "dsgvo_title": {
        "de": "Beste KI-Tools für den DACH-Raum",
        "en": "Best AI tools for the DACH region",
        "fr": "Meilleurs outils IA pour la région DACH",
        "es": "Mejores herramientas de IA para la región DACH",
        "it": "Migliori strumenti IA per l'area DACH",
        "pt": "Melhores ferramentas de IA para a região DACH",
        "nl": "Beste AI-tools voor de DACH-regio",
        "pl": "Najlepsze narzędzia AI dla regionu DACH",
        "tr": "DACH bölgesi için en iyi yapay zekâ araçları",
        "ja": "DACH地域に最適なAIツール",
        "zh": "DACH 地区最佳AI工具"},
    "dsgvo_intro": {
        "de": "Top-Tools für den deutschsprachigen Markt, nach DACH-Relevanz — mit Datenschutz-Hinweis, wo vorhanden.",
        "en": "Top tools for the German-speaking market, by DACH relevance — with data-protection notes where available.",
        "fr": "Meilleurs outils pour le marché germanophone, par pertinence DACH — avec notes RGPD si disponibles.",
        "es": "Mejores herramientas para el mercado germanoparlante, por relevancia DACH — con notas de privacidad si las hay.",
        "it": "Migliori strumenti per il mercato di lingua tedesca, per rilevanza DACH — con note privacy se disponibili.",
        "pt": "Melhores ferramentas para o mercado de língua alemã, por relevância DACH — com notas de privacidade quando houver.",
        "nl": "Toptools voor de Duitstalige markt, op DACH-relevantie — met privacynotities indien beschikbaar.",
        "pl": "Najlepsze narzędzia dla rynku niemieckojęzycznego, wg trafności DACH — z notami o prywatności, gdy są.",
        "tr": "Almanca konuşulan pazar için en iyi araçlar, DACH önemine göre — varsa gizlilik notlarıyla.",
        "ja": "ドイツ語圏市場向けのトップツール（DACH関連度順）。データ保護メモがある場合は併記。",
        "zh": "面向德语市场的顶级工具（按DACH相关度排序），如有数据保护说明则一并列出。"},
    "nl_title": {"de": "Täglich KI auf Deutsch", "en": "Daily AI, in plain language",
                 "fr": "L'IA au quotidien", "es": "IA cada día", "it": "IA ogni giorno",
                 "pt": "IA todos os dias", "nl": "Dagelijks AI", "pl": "Codziennie o AI",
                 "tr": "Her gün yapay zekâ", "ja": "毎日のAIニュース", "zh": "每日AI资讯"},
    "nl_text": {
        "de": "Kuratierte KI-News, 3–5 Min, kein Hype — von Aban News.",
        "en": "Curated AI news, 3–5 min, no hype — by Aban News.",
        "fr": "Actus IA triées, 3–5 min, sans hype — par Aban News.",
        "es": "Noticias de IA, 3–5 min, sin hype — de Aban News.",
        "it": "Notizie IA, 3–5 min, senza hype — da Aban News.",
        "pt": "Notícias de IA, 3–5 min, sem hype — da Aban News.",
        "nl": "Gecureerd AI-nieuws, 3–5 min, geen hype — van Aban News.",
        "pl": "Wyselekcjonowane newsy AI, 3–5 min, bez hype'u — od Aban News.",
        "tr": "Seçili YZ haberleri, 3–5 dk, abartısız — Aban News.",
        "ja": "厳選AIニュース、3〜5分、誇張なし — Aban News。",
        "zh": "精选AI新闻，3–5分钟，不浮夸 — Aban News。"},
    "nl_cta": {"de": "Kostenlos abonnieren", "en": "Subscribe free", "fr": "S'abonner gratuitement",
               "es": "Suscríbete gratis", "it": "Iscriviti gratis", "pt": "Assine grátis",
               "nl": "Gratis abonneren", "pl": "Subskrybuj za darmo", "tr": "Ücretsiz abone ol",
               "ja": "無料で購読", "zh": "免费订阅"},
}
# Newsletter box links to the existing owned audience (compounding revenue lever).
NEWSLETTER_URL = "https://abannews.de"


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

    # Merge the extra (curated) UI strings for the new page types into every locale.
    for code, loc in locales.items():
        for key, trans in NEW_UI.items():
            loc["ui"][key] = trans.get(code, trans["de"])
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
    if kind == "vs":
        return f"{prefix}/vergleich/{slug}.html"
    if kind == "uc":
        return f"{prefix}/fuer/{slug}.html"
    if kind == "dsgvo":
        return f"{prefix}/dsgvo.html"
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
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:22px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}}
.nl .cta{{margin-top:0;}}
.subnav{{font-size:.9rem;margin:6px 0 0;}}
.vs-col{{display:flex;flex-wrap:wrap;gap:14px;}} .vs-col>div{{flex:1;min-width:240px;}}
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
<aside class="nl">
<strong>📬 {e(ui['nl_title'])}</strong>
<span>{e(ui['nl_text'])}</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">{e(ui['nl_cta'])} →</a>
</aside>
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


def breadcrumb(items, lang):
    """BreadcrumbList JSON-LD. items = [(name, path), ...] relative to BASE_URL."""
    elems = [{"@type": "ListItem", "position": i + 1, "name": name,
              "item": BASE_URL + path} for i, (name, path) in enumerate(items)]
    data = {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": elems}
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


def tool_page(tool, aff, ui, loc_tools, lang, available, tools_by_id=None):
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
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (tool["name"], page_path(lang, "tool", slugify(tool["id"])))], lang)
    body = f"""{jsonld(tool)}{crumb}
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
{comparison_links(tool, tools_by_id or {}, ui, lang)}
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>"""
    desc = (note or ui["meta_tool"].format(name=tool["name"]))[:155]
    return page(lang=lang, ui=ui,
                title=f"{tool['name']} — {SITE_NAME}", description=desc, body=body,
                canonical=BASE_URL + page_path(lang, "tool", slugify(tool["id"])),
                available=available, kind="tool", slug=slugify(tool["id"]))


def vs_slug(a_id, b_id):
    x, y = sorted([slugify(a_id), slugify(b_id)])
    return f"{x}-vs-{y}"


def comparison_links(tool, tools_by_id, ui, lang):
    """Internal links from a tool page to its head-to-head comparisons."""
    alts = [tools_by_id[a] for a in tool.get("alternatives", []) if a in tools_by_id]
    if not alts:
        return ""
    links = " · ".join(
        f'<a href="{e(page_path(lang,"vs",vs_slug(tool["id"],a["id"])))}">'
        f'{e(tool["name"])} vs {e(a["name"])}</a>' for a in alts)
    return f'<p class="subnav"><strong>{e(ui["comparisons"])}:</strong> {links}</p>'


def vs_column(tool, aff, ui, loc_tools, lang):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    loc = loc_tools.get(tool["id"], {})
    return f"""<div>
<h2 style="margin:0 0 6px"><a href="{e(page_path(lang,'tool',slugify(tool['id'])))}"
style="text-decoration:none;color:var(--text)">{e(tool['name'])}</a>
<span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h2>
<div class="grid-meta"><span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(price_str(tool, ui))}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span></div>
{pro_contra(loc, ui)}
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>
</div>"""


def comparison_page(a, b, aff, ui, loc_tools, lang, available):
    sa = a.get("worth_it_score") or 0
    sb = b.get("worth_it_score") or 0
    if abs(sa - sb) < 0.3:
        verdict = ui["tie"]
    else:
        verdict = ui["winner"].format(name=(a if sa > sb else b)["name"])
    slug = vs_slug(a["id"], b["id"])
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (f"{a['name']} vs {b['name']}", page_path(lang, "vs", slug))], lang)
    body = f"""{jsonld(a)}{jsonld(b)}{crumb}
<p><a href="{e(page_path(lang,'home'))}">{e(ui['all_tools'])}</a></p>
<h1 style="margin:0 0 4px">{e(a['name'])} vs {e(b['name'])}</h1>
<p class="note"><strong>{e(ui['verdict'])}:</strong> {e(verdict)}</p>
<div class="vs-col">{vs_column(a, aff, ui, loc_tools, lang)}{vs_column(b, aff, ui, loc_tools, lang)}</div>"""
    return page(lang=lang, ui=ui,
                title=f"{a['name']} vs {b['name']} — {SITE_NAME}",
                description=f"{a['name']} vs {b['name']}: {ui['verdict']}, Pro & Contra, Pricing, {ui['dsgvo']}.",
                body=body, canonical=BASE_URL + page_path(lang, "vs", slug),
                available=available, kind="vs", slug=slug)


def usecase_page(uc_display, uc_slug, members, aff, ui, lang, available):
    body = (f'<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>{e(ui["best_in"].format(cat=uc_display))}</h1>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui,
                title=ui["best_in"].format(cat=uc_display) + f" — {SITE_NAME}",
                description=ui["meta_cat"].format(cat=uc_display), body=body,
                canonical=BASE_URL + page_path(lang, "uc", uc_slug),
                available=available, kind="uc", slug=uc_slug)


def dsgvo_page(members, aff, ui, lang, available):
    body = (f'<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>🏆 {e(ui["dsgvo_title"])}</h1>\n<p class="meta">{e(ui["dsgvo_intro"])}</p>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui, title=ui["dsgvo_title"] + f" — {SITE_NAME}",
                description=ui["dsgvo_intro"], body=body,
                canonical=BASE_URL + page_path(lang, "dsgvo"),
                available=available, kind="dsgvo")


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
    tools_by_id = {t["id"]: t for t in tools}
    categories = sorted({c for t in tools for c in t.get("category", [])})

    # Head-to-head pairs from the curated "alternatives" (deduped, both must exist).
    pairs = {}
    for t in tools:
        for alt in t.get("alternatives", []):
            if alt in tools_by_id and alt != t["id"]:
                key = tuple(sorted([t["id"], alt]))
                pairs[key] = (tools_by_id[key[0]], tools_by_id[key[1]])
    pairs = list(pairs.values())

    # Use-case hubs (canonical English use_case -> members), only if >=3 tools.
    uc_map = {}
    for t in tools:
        for uc in t.get("use_cases", []):
            uc_map.setdefault(uc, []).append(t)
    use_cases = sorted([(uc, sorted(ms, key=lambda x: x.get("worth_it_score", 0), reverse=True))
                        for uc, ms in uc_map.items() if len(ms) >= 3])

    # Best-for-DACH list: strong DACH relevance (privacy notes shown where present).
    dsgvo_members = sorted(
        [t for t in tools if (t.get("dach_relevance") or 0) >= 7],
        key=lambda t: (t.get("dach_relevance", 0), t.get("worth_it_score", 0)), reverse=True)

    pages = 0
    for lang in available:
        ui = locales[lang]["ui"]
        loc_tools = locales[lang]["tools"]

        # Homepage (with sub-navigation to DSGVO + use-case hubs)
        cat_links = " · ".join(
            f'<a href="{e(page_path(lang,"cat",slugify(c)))}">{e(c)}</a>' for c in categories)
        uc_links = " · ".join(
            f'<a href="{e(page_path(lang,"uc",slugify(uc)))}">{e(uc)}</a>' for uc, _ in use_cases)
        subnav = (f'<p class="subnav">🏆 <a href="{e(page_path(lang,"dsgvo"))}">{e(ui["dsgvo_nav"])}</a></p>\n'
                  f'<p class="subnav"><strong>{e(ui["by_use_case"])}:</strong> {uc_links}</p>')
        cards = "\n".join(tool_card(t, aff, ui, lang) for t in tools_sorted)
        home_body = (f'<p class="meta">{e(ui["categories"])}: {cat_links}</p>\n{subnav}\n'
                     f'<h2 style="margin:18px 0 12px">{e(ui["home_heading"].format(n=len(tools)))}</h2>\n{cards}')
        of = out_file(out, lang, "home")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(page(lang=lang, ui=ui,
                           title=f"{SITE_NAME} — {ui['tagline']}",
                           description=ui["meta_home"].format(n=len(tools)),
                           body=home_body, canonical=BASE_URL + page_path(lang, "home"),
                           available=available, kind="home"), encoding="utf-8")
        pages += 1

        # Tool pages (with internal comparison links)
        for t in tools:
            of = out_file(out, lang, "tool", slugify(t["id"]))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(tool_page(t, aff, ui, loc_tools, lang, available, tools_by_id),
                          encoding="utf-8")
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

        # Comparison pages
        for a, b in pairs:
            of = out_file(out, lang, "vs", vs_slug(a["id"], b["id"]))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(comparison_page(a, b, aff, ui, loc_tools, lang, available),
                          encoding="utf-8")
            pages += 1

        # Use-case hub pages
        for uc, members in use_cases:
            of = out_file(out, lang, "uc", slugify(uc))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(usecase_page(uc, slugify(uc), members, aff, ui, lang, available),
                          encoding="utf-8")
            pages += 1

        # DSGVO page
        of = out_file(out, lang, "dsgvo")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(dsgvo_page(dsgvo_members, aff, ui, lang, available), encoding="utf-8")
        pages += 1

    # sitemap.xml across all languages
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for lang in available:
        urls = ([BASE_URL + page_path(lang, "home"), BASE_URL + page_path(lang, "dsgvo")]
                + [BASE_URL + page_path(lang, "tool", slugify(t["id"])) for t in tools]
                + [BASE_URL + page_path(lang, "cat", slugify(c)) for c in categories]
                + [BASE_URL + page_path(lang, "vs", vs_slug(a["id"], b["id"])) for a, b in pairs]
                + [BASE_URL + page_path(lang, "uc", slugify(uc)) for uc, _ in use_cases])
        for url in urls:
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
