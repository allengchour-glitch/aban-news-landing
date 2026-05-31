#!/usr/bin/env python3
"""KI-Dienstleister-Verzeichnis DACH — static site generator (pure stdlib).

Verzeichnis fuer KI-Agenturen & -Freelancer im DACH-Raum. Geschaeftsmodell:
SICHTBARKEIT VERKAUFEN — kostenloser Basis-Eintrag vs. bezahltes Featured-Listing.
Der "Eintrag einreichen / Listing buchen"-Funnel steht im Mittelpunkt.

Datenintegritaet: Es werden KEINE Agenturen, Namen, Kontaktdaten oder Bewertungen
erfunden. data/agenturen.json startet leer bzw. mit klar markierten Platzhaltern
('platzhalter': true). Der Generator baut auch mit (nahezu) leerer Liste sauber
und zeigt dann einen "Sei der erste Eintrag"-Zustand.

Erzeugt: Startseite, Detailseite je Eintrag, Kategorie-Seiten (nach Leistung),
Stadt-/Land-Seiten (DE/AT/CH), preise/listing-buchen-Seite, Impressum, Datenschutz,
sitemap.xml, robots.txt, RSS, 404. JSON-LD: LocalBusiness/Organization, Breadcrumb,
ItemList, FAQPage. canonical/OG/lang="de". Aban-Voice, anti-hype, du-Form.

System-Fonts, kein Tracking, keine 3rd-Party-Requests (DSGVO).

Usage:
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

# --- Brand tokens (aus Aban News css/styles.css :root) -------------------------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "KI-Dienstleister-Verzeichnis DACH"
SITE_SHORT = "KI-Dienstleister DACH"
TAGLINE = "KI-Agenturen und -Freelancer im DACH-Raum — sachlich gelistet, kein Hype"
BASE_URL = "https://agenturen.abannews.com"
NEWSLETTER_URL = "https://abannews.com/gratis-ki-tools.html"

# Kontakt-Mail aus dem echten Impressum (impressum.html) — NICHT erfunden.
CONTACT_EMAIL = "hallo@abannews.com"
LISTING_SUBJECT_BASIS = "Verzeichnis-Eintrag (Basis, kostenlos)"
LISTING_SUBJECT_FEATURED = "Featured-Listing buchen"

# Leistungs-Kategorien (feste Achse). Jeder Eintrag waehlt daraus.
LEISTUNGEN = ["Beratung", "Entwicklung", "Automation", "Content"]
LEISTUNG_SLUG = {
    "Beratung": "beratung",
    "Entwicklung": "entwicklung",
    "Automation": "automation",
    "Content": "content",
}
LEISTUNG_EMOJI = {
    "Beratung": "🧭", "Entwicklung": "🛠️", "Automation": "⚙️", "Content": "✍️",
}
LEISTUNG_TEXT = {
    "Beratung": "Strategie, Use-Case-Findung und Umsetzungsbegleitung rund um KI.",
    "Entwicklung": "Bau von KI-Anwendungen, Integrationen und massgeschneiderter Software.",
    "Automation": "Prozesse automatisieren — von Workflows bis zu KI-Agenten.",
    "Content": "Texte, Bilder und Medien mit KI — redaktionell betreut.",
}

# Laender (feste Achse).
LAENDER = ["DE", "AT", "CH"]
LAND_NAME = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz"}
LAND_FLAG = {"DE": "🇩🇪", "AT": "🇦🇹", "CH": "🇨🇭"}


def slugify(value: str) -> str:
    value = (value or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


def clip(text: str, limit: int = 155) -> str:
    """Meta-Description an Wortgrenze kuerzen (sauberere SERP-Snippets)."""
    text = " ".join(str(text or "").split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:–-")
    return (cut or text[:limit]) + "…"


def strip_redaktion(text: str) -> str:
    """Internen Redaktions-Marker nicht im Fliesstext anzeigen."""
    return re.sub(r"\[Redaktion:[^\]]*\]\s*", "", text or "").strip()


# --- URL-/Pfad-Logik -----------------------------------------------------------

def page_path(kind: str, slug: str = "") -> str:
    if kind == "home":
        return "/"
    if kind == "agentur":
        return f"/agentur/{slug}.html"
    if kind == "leistung":
        return f"/leistung/{slug}.html"
    if kind == "land":
        return f"/land/{slug}.html"
    if kind == "preise":
        return "/preise.html"
    if kind == "einreichen":
        return "/eintrag-einreichen.html"
    if kind == "impressum":
        return "/impressum.html"
    if kind == "datenschutz":
        return "/datenschutz.html"
    return "/"


def out_file(out: Path, kind: str, slug: str = "") -> Path:
    p = page_path(kind, slug)
    if p.endswith("/"):
        p += "index.html"
    return out / p.lstrip("/")


# --- Listing-Funnel: mailto-Fallback (keine erfundenen Preise/Links) -----------

def mailto(subject: str, body: str = "") -> str:
    from urllib.parse import quote
    q = f"subject={quote(subject)}"
    if body:
        q += f"&body={quote(body)}"
    return f"mailto:{CONTACT_EMAIL}?{q}"


SUBMIT_BODY = (
    "Name der Agentur/des Freelancers:\n"
    "Website:\n"
    "Standort (Stadt, Land DE/AT/CH):\n"
    "Leistungen (Beratung/Entwicklung/Automation/Content):\n"
    "Ein Satz, was ihr tut:\n"
    "Kontakt-Mail fuer Rueckfragen:\n"
)


# --- HTML-Shell ----------------------------------------------------------------

def page(*, title, description, body, canonical, kind, slug="", og_image=None,
         noindex=False):
    og_img = og_image or (BASE_URL + "/og-default.png")
    robots = '<meta name="robots" content="noindex,follow">\n' if noindex else ""
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
{robots}<link rel="canonical" href="{e(canonical)}">
<link rel="alternate" type="application/rss+xml" title="{e(SITE_NAME)}" href="{e(BASE_URL)}/feed.xml">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE_NAME)}">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:image" content="{e(og_img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="{ACCENT}">
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
.wrap{{max-width:880px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
header .hnav{{margin-top:10px;font-size:.92rem;}} header .hnav a{{color:var(--accent-h);margin-right:14px;}}
main{{padding:28px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin:0 0 14px;}}
.card h2{{margin:0 0 6px;font-size:1.15rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:11px 20px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.cta.ghost{{background:none;color:var(--accent-h);border:1px solid var(--accent);}}
.hero{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px 24px;margin:0 0 22px;}}
.hero h1{{margin:0 0 10px;font-size:1.7rem;line-height:1.25;}}
.hero p{{color:var(--muted);margin:0 0 14px;}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.92rem;}}
.empty{{background:var(--card);border:2px dashed var(--accent);border-radius:14px;padding:28px 24px;text-align:center;margin:18px 0;}}
.empty h2{{margin:0 0 8px;}}
.subnav{{font-size:.9rem;margin:8px 0 0;}}
.feat{{border:2px solid var(--accent);border-radius:14px;padding:8px 14px 2px;margin:14px 0;background:var(--card);}}
.feat-label{{display:inline-block;background:var(--accent);color:#fff;font-weight:600;font-size:.82rem;border-radius:999px;padding:2px 12px;margin:4px 0 2px;}}
.feat .card{{border:none;margin:0;padding:10px 6px;}}
.ph{{display:inline-block;background:#9ca3af;color:#fff;border-radius:999px;padding:1px 9px;font-size:.74rem;font-weight:600;vertical-align:middle;}}
.grid-meta{{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.88rem;color:var(--muted);}}
.pricebox{{display:flex;flex-wrap:wrap;gap:16px;margin:18px 0;}}
.pricebox>div{{flex:1;min-width:240px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;}}
.pricebox .featured{{border:2px solid var(--accent);}}
.pricebox h3{{margin:0 0 4px;}}
.pricebox ul{{padding-left:18px;margin:10px 0;}}
.price{{font-size:1.2rem;font-weight:700;color:var(--accent-h);}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:22px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}} .nl .cta{{margin-top:0;}}
.faq details{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 14px;margin:0 0 8px;}}
.faq summary{{cursor:pointer;font-weight:600;}} .faq details p{{margin:8px 0 0;color:var(--muted);}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
footer a{{color:var(--accent-h);}}
</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
<header><div class="wrap">
<button class="themebtn" type="button" onclick="abanTheme()" aria-label="Design wechseln">🌓 Design</button>
<a href="{e(page_path('home'))}"><h1>📒 {e(SITE_SHORT)}</h1></a>
<div class="tag">{e(TAGLINE)}</div>
<nav class="hnav" aria-label="Hauptnavigation">
<a href="{e(page_path('home'))}">Verzeichnis</a>
<a href="{e(page_path('preise'))}">Preise &amp; Listing</a>
<a href="{e(page_path('einreichen'))}">Eintrag einreichen</a>
</nav>
</div></header>
<main id="main"><div class="wrap">
{body}
<aside class="nl">
<strong>📬 Täglich KI auf Deutsch</strong>
<span>Kuratierte KI-News fürs DACH-Business, 5 Minuten, kein Hype — von Aban News.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a>
</aside>
<p class="disclosure">Transparenz: Dieses Verzeichnis finanziert sich über bezahlte Featured-Listings.
Ein bezahltes Listing kauft Sichtbarkeit (Platzierung, Hervorhebung) — keine Bewertung und kein
redaktionelles Urteil. Basis-Einträge bleiben kostenlos.</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} ·
<a href="{e(page_path('preise'))}">Preise</a> ·
<a href="{e(page_path('einreichen'))}">Eintrag einreichen</a> ·
<a href="{e(page_path('datenschutz'))}">Datenschutz</a> ·
<a href="{e(page_path('impressum'))}">Impressum</a>
</div></footer>
<script>
function abanTheme(){{var h=document.documentElement;var t=h.getAttribute('data-theme')==='dark'?'light':'dark';
h.setAttribute('data-theme',t);try{{localStorage.setItem('aban-theme',t);}}catch(e){{}}}}
(function(){{try{{var t=localStorage.getItem('aban-theme');if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}}})();
</script>
</body>
</html>"""


# --- JSON-LD-Helfer ------------------------------------------------------------

def script_ld(data) -> str:
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def breadcrumb(items) -> str:
    """items = [(name, path), ...] relativ zur BASE_URL."""
    elems = [{"@type": "ListItem", "position": i + 1, "name": name,
              "item": BASE_URL + path} for i, (name, path) in enumerate(items)]
    return script_ld({"@context": "https://schema.org", "@type": "BreadcrumbList",
                      "itemListElement": elems})


def itemlist_ld(entries) -> str:
    elems = [{"@type": "ListItem", "position": i + 1,
              "url": BASE_URL + page_path("agentur", a["id"]),
              "name": a["name"]} for i, a in enumerate(entries)]
    return script_ld({"@context": "https://schema.org", "@type": "ItemList",
                      "itemListElement": elems})


def localbusiness_ld(a) -> str:
    """LocalBusiness/Organization fuer einen Eintrag. Platzhalter -> nichts."""
    if a.get("platzhalter"):
        return ""
    data = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": a["name"],
        "url": BASE_URL + page_path("agentur", a["id"]),
    }
    desc = strip_redaktion(a.get("beschreibung") or a.get("tagline") or "")
    if desc:
        data["description"] = desc
    if a.get("website"):
        data["sameAs"] = [a["website"]]
    addr = {"@type": "PostalAddress", "addressCountry": a.get("land")}
    if a.get("stadt"):
        addr["addressLocality"] = a["stadt"]
    data["address"] = addr
    if a.get("email"):
        data["email"] = a["email"]
    if a.get("leistungen"):
        data["knowsAbout"] = a["leistungen"]
    return script_ld(data)


def faqpage_ld(qa) -> str:
    return script_ld({"@context": "https://schema.org", "@type": "FAQPage",
                      "mainEntity": [{"@type": "Question", "name": q,
                                      "acceptedAnswer": {"@type": "Answer", "text": a}}
                                     for q, a in qa]})


def site_schema() -> str:
    return script_ld([
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME,
         "url": BASE_URL + "/", "inLanguage": "de", "description": TAGLINE},
        {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME,
         "url": BASE_URL + "/", "description": TAGLINE},
    ])


# --- Karten / Komponenten ------------------------------------------------------

def entry_card(a):
    is_ph = a.get("platzhalter")
    ph_badge = ' <span class="ph">Platzhalter</span>' if is_ph else ""
    feat_badge = ' <span class="chip">Featured</span>' if a.get("featured") else ""
    tagline = strip_redaktion(a.get("tagline") or "")
    leist = "".join(f'<span class="chip">{e(l)}</span>' for l in a.get("leistungen", []))
    ort = " · ".join(x for x in [a.get("stadt"), LAND_NAME.get(a.get("land"), a.get("land"))] if x)
    return f"""<article class="card">
<h2><a href="{e(page_path('agentur', a['id']))}">{e(a['name'])}</a>{ph_badge}{feat_badge}</h2>
{f'<p>{e(tagline)}</p>' if tagline else ''}
<div class="grid-meta">
<span>{LAND_FLAG.get(a.get('land'),'📍')} {e(ort or '[Redaktion: prüfen]')}</span>
</div>
<p class="meta">{leist or '<span class="chip">[Redaktion: prüfen]</span>'}</p>
</article>"""


def submit_cta_block(prominent=True):
    """Der zentrale Funnel-Block: Eintrag einreichen / Listing buchen."""
    cls = "empty" if prominent else "note"
    return f"""<div class="{cls}">
<h2>Steh im Verzeichnis — sei sichtbar für DACH-Kund:innen</h2>
<p class="meta">Kostenloser Basis-Eintrag oder bezahltes Featured-Listing für mehr Sichtbarkeit.
Kein erfundenes Ranking, keine Fake-Bewertungen — nur das, was du selbst lieferst.</p>
<a class="cta" href="{e(page_path('einreichen'))}">Eintrag einreichen →</a>
<a class="cta ghost" href="{e(page_path('preise'))}">Preise &amp; Featured-Listing ansehen</a>
</div>"""


# --- Seiten --------------------------------------------------------------------

def home_page(entries):
    featured = [a for a in entries if a.get("featured")]
    rest = [a for a in entries if not a.get("featured")]
    crumb = breadcrumb([(SITE_NAME, page_path("home"))])

    leist_links = " · ".join(
        f'<a href="{e(page_path("leistung", LEISTUNG_SLUG[l]))}">{LEISTUNG_EMOJI[l]} {e(l)}</a>'
        for l in LEISTUNGEN)
    land_links = " · ".join(
        f'<a href="{e(page_path("land", c.lower()))}">{LAND_FLAG[c]} {e(LAND_NAME[c])}</a>'
        for c in LAENDER)

    hero = f"""<div class="hero">
<h1>KI-Agenturen &amp; -Freelancer im DACH-Raum finden</h1>
<p>Ein sachliches Verzeichnis: wer im deutschsprachigen Raum KI-Beratung, -Entwicklung,
-Automation oder -Content anbietet. Du suchst Unterstützung — oder willst selbst gefunden werden.</p>
<a class="cta" href="{e(page_path('einreichen'))}">Eintrag einreichen →</a>
<a class="cta ghost" href="{e(page_path('preise'))}">So funktioniert das Listing</a>
</div>"""

    nav = (f'<p class="subnav"><strong>Nach Leistung:</strong> {leist_links}</p>\n'
           f'<p class="subnav"><strong>Nach Land:</strong> {land_links}</p>')

    if not entries:
        listing = submit_cta_block(prominent=True)
    else:
        feat_html = ""
        if featured:
            feat_html = ('<div class="feat"><span class="feat-label">🏅 Featured-Listings</span>\n'
                         + "\n".join(entry_card(a) for a in featured) + "</div>\n")
        rest_html = "\n".join(entry_card(a) for a in rest)
        listing = (feat_html
                   + f'<h2 style="margin:18px 0 12px">Alle Einträge ({len(entries)})</h2>\n'
                   + (rest_html or '<p class="meta">Noch keine Basis-Einträge.</p>'))

    model_note = ('<div class="note"><strong>Wie das Verzeichnis funktioniert:</strong> '
                  'Basis-Eintrag ist kostenlos. Ein Featured-Listing kauft Sichtbarkeit — '
                  'Platzierung oben und Hervorhebung, keine Bewertung. '
                  f'<a href="{e(page_path("preise"))}">Details auf der Preise-Seite →</a></div>')

    body = (f'{site_schema()}{crumb}{itemlist_ld(entries)}'
            f'{hero}\n{nav}\n{model_note}\n{listing}\n'
            f'{submit_cta_block(prominent=False) if entries else ""}')
    desc = clip(f"Verzeichnis für KI-Agenturen und -Freelancer in DE, AT und CH — "
                f"nach Leistung und Land sortiert. Eintrag einreichen oder Featured-Listing buchen.")
    return page(title=f"{SITE_NAME} {date.today().year} — KI-Agenturen & -Freelancer finden",
                description=desc, body=body,
                canonical=BASE_URL + page_path("home"), kind="home")


def agentur_page(a):
    is_ph = a.get("platzhalter")
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (a["name"], page_path("agentur", a["id"]))])
    tagline = strip_redaktion(a.get("tagline") or "")
    beschr = strip_redaktion(a.get("beschreibung") or "")
    leist = "".join(f'<a class="chip" href="{e(page_path("leistung", LEISTUNG_SLUG[l]))}">{e(l)}</a> '
                    for l in a.get("leistungen", []) if l in LEISTUNG_SLUG)
    ort = " · ".join(x for x in [a.get("stadt"), LAND_NAME.get(a.get("land"), a.get("land"))] if x)

    ph_banner = ""
    if is_ph:
        ph_banner = ('<div class="note"><strong>Platzhalter-Eintrag.</strong> Dies ist ein '
                     'Struktur-Beispiel, keine echte Agentur. Hier könnte dein Eintrag stehen — '
                     f'<a href="{e(page_path("einreichen"))}">jetzt einreichen</a>.</div>')

    def row(label, val):
        return f'<span>{label}: {e(val)}</span>' if val else f'<span>{label}: <span class="chip">[Redaktion: prüfen]</span></span>'

    website = a.get("website")
    web_html = (f'<a href="{e(website)}" target="_blank" rel="nofollow noopener">{e(website)}</a>'
                if website else '<span class="chip">[Redaktion: prüfen]</span>')
    email = a.get("email")
    mail_html = (f'<a href="mailto:{e(email)}">{e(email)}</a>'
                 if email else '<span class="chip">[Redaktion: prüfen]</span>')

    feat_badge = ' <span class="chip">Featured</span>' if a.get("featured") else ""

    body = f"""{localbusiness_ld(a)}{crumb}
<p><a href="{e(page_path('home'))}">← Alle Einträge</a></p>
{ph_banner}
<h1 style="margin:0 0 6px">{e(a['name'])}{feat_badge}</h1>
{f'<p class="meta">{e(tagline)}</p>' if tagline else ''}
<div class="grid-meta" style="margin:10px 0">
<span>{LAND_FLAG.get(a.get('land'),'📍')} {e(ort or '[Redaktion: prüfen]')}</span>
{row('Teamgröße', a.get('teamgroesse'))}
{row('Gegründet', a.get('gegruendet'))}
</div>
<p><strong>Leistungen:</strong> {leist or '<span class="chip">[Redaktion: prüfen]</span>'}</p>
{f'<p>{e(beschr)}</p>' if beschr else ''}
<p><strong>Website:</strong> {web_html}<br>
<strong>Kontakt:</strong> {mail_html}</p>
<div class="note">Eintrag gehört dir und ist nicht korrekt — oder du willst ihn aufwerten?
<a href="{e(mailto('Eintrag aktualisieren: ' + a['name']))}">Schreib uns</a> ·
<a href="{e(page_path('preise'))}">Featured-Listing</a></div>"""
    desc = clip(tagline or beschr or f"{a['name']} im KI-Dienstleister-Verzeichnis DACH.")
    return page(title=f"{a['name']} — {SITE_SHORT}", description=desc, body=body,
                canonical=BASE_URL + page_path("agentur", a["id"]),
                kind="agentur", slug=a["id"], noindex=is_ph)


def leistung_page(leistung, members):
    slug = LEISTUNG_SLUG[leistung]
    title = f"KI-{leistung}: Agenturen &amp; Freelancer im DACH-Raum"
    title_plain = f"KI-{leistung}: Agenturen & Freelancer im DACH-Raum"
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (f"KI-{leistung}", page_path("leistung", slug))])
    intro = LEISTUNG_TEXT.get(leistung, "")
    if members:
        listing = "\n".join(entry_card(a) for a in members)
    else:
        listing = (f'<div class="empty"><h2>Noch kein Eintrag für KI-{e(leistung)}</h2>'
                   f'<p class="meta">Sei der erste Eintrag in dieser Kategorie.</p>'
                   f'<a class="cta" href="{e(page_path("einreichen"))}">Eintrag einreichen →</a></div>')
    body = (f'{crumb}{itemlist_ld(members)}'
            f'<p><a href="{e(page_path("home"))}">← Verzeichnis</a></p>\n'
            f'<h1>{LEISTUNG_EMOJI[leistung]} {title}</h1>\n'
            f'<p class="meta">{e(intro)}</p>\n{listing}\n'
            f'{submit_cta_block(prominent=False)}')
    return page(title=f"{title_plain} {date.today().year} — {SITE_SHORT}",
                description=clip(f"Agenturen und Freelancer für KI-{leistung} in DE, AT und CH. {intro}"),
                body=body, canonical=BASE_URL + page_path("leistung", slug),
                kind="leistung", slug=slug)


def land_page(code, members):
    slug = code.lower()
    name = LAND_NAME[code]
    title = f"KI-Agenturen &amp; -Freelancer in {name}"
    title_plain = f"KI-Agenturen & -Freelancer in {name}"
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        (name, page_path("land", slug))])
    if members:
        listing = "\n".join(entry_card(a) for a in members)
    else:
        listing = (f'<div class="empty"><h2>Noch kein Eintrag für {LAND_FLAG[code]} {e(name)}</h2>'
                   f'<p class="meta">Sei der erste Eintrag aus {e(name)}.</p>'
                   f'<a class="cta" href="{e(page_path("einreichen"))}">Eintrag einreichen →</a></div>')
    body = (f'{crumb}{itemlist_ld(members)}'
            f'<p><a href="{e(page_path("home"))}">← Verzeichnis</a></p>\n'
            f'<h1>{LAND_FLAG[code]} {title}</h1>\n{listing}\n'
            f'{submit_cta_block(prominent=False)}')
    return page(title=f"{title_plain} {date.today().year} — {SITE_SHORT}",
                description=clip(f"KI-Agenturen und -Freelancer aus {name} im DACH-Verzeichnis — "
                                 f"nach Leistung sortiert. Eintrag einreichen."),
                body=body, canonical=BASE_URL + page_path("land", slug),
                kind="land", slug=slug)


def preise_page():
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        ("Preise & Listing", page_path("preise"))])
    qa = [
        ("Was kostet ein Basis-Eintrag?",
         "Der Basis-Eintrag ist kostenlos. Du reichst deine Daten ein, wir prüfen sie "
         "redaktionell und nehmen dich ins Verzeichnis auf."),
        ("Was bringt ein Featured-Listing?",
         "Ein Featured-Listing kauft Sichtbarkeit: Platzierung oben auf der Startseite und "
         "den passenden Kategorie-Seiten plus Hervorhebung. Es ist keine Bewertung und kein "
         "redaktionelles Gütesiegel — du kaufst Aufmerksamkeit, kein Urteil."),
        ("Was kostet das Featured-Listing?",
         "Der Preis steht noch nicht final fest. Frag den aktuellen Tarif per Mail an — wir "
         "nennen dir Laufzeit und Konditionen."),
        ("Beeinflusst Geld die Reihenfolge der normalen Einträge?",
         "Basis-Einträge werden sachlich sortiert, nicht nach Zahlung. Bezahlte Listings sind "
         "klar als Featured gekennzeichnet, damit der Unterschied transparent bleibt."),
    ]
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(an)}</p></details>" for q, an in qa)

    body = f"""{crumb}{faqpage_ld(qa)}
<p><a href="{e(page_path('home'))}">← Verzeichnis</a></p>
<h1>Preise &amp; Listing — Sichtbarkeit, klar erklärt</h1>
<p class="meta">Wir verkaufen Sichtbarkeit, keine Bewertungen. So sieht das Modell aus:</p>

<div class="pricebox">
<div>
<h3>Basis-Eintrag</h3>
<p class="price">0 €</p>
<ul>
<li>Name, Standort, Leistungen, ein Satz Positionierung</li>
<li>Eigene Detailseite mit Link zu deiner Website</li>
<li>Auf den Kategorie- und Land-Seiten gelistet</li>
<li>Redaktionell geprüft, sachlich sortiert</li>
</ul>
<a class="cta" href="{e(mailto(LISTING_SUBJECT_BASIS, SUBMIT_BODY))}">Basis-Eintrag einreichen →</a>
</div>
<div class="featured">
<h3>Featured-Listing 🏅</h3>
<p class="price">[Redaktion: festlegen] — Preis per Anfrage</p>
<ul>
<li>Alles aus dem Basis-Eintrag</li>
<li>Platzierung oben auf Startseite und passenden Kategorie-Seiten</li>
<li>Hervorhebung mit Featured-Markierung</li>
<li>Ausführlichere Beschreibung möglich</li>
</ul>
<a class="cta" href="{e(mailto(LISTING_SUBJECT_FEATURED, SUBMIT_BODY))}">Featured-Listing anfragen →</a>
</div>
</div>

<div class="note"><strong>Ehrlich gesagt:</strong> Ein Featured-Listing macht dich sichtbarer,
nicht besser. Wir tun nicht so, als wäre eine Zahlung eine Auszeichnung. Genau deshalb
kennzeichnen wir bezahlte Listings deutlich.</div>

<h2>Häufige Fragen</h2>
<div class="faq">{faq}</div>

<p>Noch offen? Schreib an <a href="mailto:{e(CONTACT_EMAIL)}">{e(CONTACT_EMAIL)}</a>.</p>"""
    return page(title=f"Preise & Listing buchen — {SITE_SHORT}",
                description="Basis-Eintrag kostenlos, Featured-Listing per Anfrage. So funktioniert "
                            "das Listing-Modell im KI-Dienstleister-Verzeichnis DACH.",
                body=body, canonical=BASE_URL + page_path("preise"), kind="preise")


def einreichen_page():
    crumb = breadcrumb([(SITE_NAME, page_path("home")),
                        ("Eintrag einreichen", page_path("einreichen"))])
    body = f"""{crumb}
<p><a href="{e(page_path('home'))}">← Verzeichnis</a></p>
<h1>Eintrag einreichen</h1>
<p>Du bietest KI-Beratung, -Entwicklung, -Automation oder -Content im DACH-Raum an?
Trag dich ins Verzeichnis ein — der Basis-Eintrag ist kostenlos.</p>

<div class="note"><strong>So läuft es:</strong>
<ol>
<li>Schick uns deine Daten per Mail (Vorlage unten).</li>
<li>Wir prüfen sie redaktionell — keine Fantasie-Angaben, keine erfundenen Bewertungen.</li>
<li>Dein Eintrag geht live. Featured-Listing optional dazubuchbar.</li>
</ol>
</div>

<p>Bitte diese Angaben mitschicken:</p>
<ul>
<li>Name der Agentur / des Freelancers</li>
<li>Website</li>
<li>Standort (Stadt, Land: DE / AT / CH)</li>
<li>Leistungen (Beratung, Entwicklung, Automation, Content)</li>
<li>Ein Satz, was ihr tut — sachlich, ohne Hype</li>
<li>Kontakt-Mail für Rückfragen</li>
</ul>

<a class="cta" href="{e(mailto(LISTING_SUBJECT_BASIS, SUBMIT_BODY))}">Eintrag per Mail senden →</a>
<a class="cta ghost" href="{e(page_path('preise'))}">Featured-Listing &amp; Preise ansehen</a>

<p class="meta" style="margin-top:18px">Oder direkt an
<a href="mailto:{e(CONTACT_EMAIL)}">{e(CONTACT_EMAIL)}</a>.</p>"""
    return page(title=f"Eintrag einreichen — {SITE_SHORT}",
                description="Kostenlosen Basis-Eintrag im KI-Dienstleister-Verzeichnis DACH "
                            "einreichen. Featured-Listing optional.",
                body=body, canonical=BASE_URL + page_path("einreichen"), kind="einreichen")


# --- Rechtliche Seiten (Betreiber-Daten aus dem Aban-News-Impressum) -----------

OPERATOR = {
    "name": "Allen Chour",
    "addr1": "Hühnerhubelstrasse 37",
    "addr2": "3123 Belp",
    "country": "Schweiz",
}
LEGAL_DOMAIN = "agenturen.abannews.com"


def imprint_page():
    o = OPERATOR
    body = f"""<p><a href="{e(page_path('home'))}">← Verzeichnis</a></p>
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>aban news</strong><br>
{e(o['name'])}<br>{e(o['addr1'])}<br>{e(o['addr2'])}<br>{e(o['country'])}</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:{e(CONTACT_EMAIL)}">{e(CONTACT_EMAIL)}</a><br>
Website: {e(LEGAL_DOMAIN)}</p>
<h2>Vertretungsberechtigte Person</h2>
<p>{e(o['name'])}</p>
<h2>Mehrwertsteuer-Status</h2>
<p>Diese Webseite wird von einer in der Schweiz ansässigen natürlichen Person betrieben.
Eine Eintragung im UID-Register erfolgt erst bei Überschreiten der Mehrwertsteuer-Pflicht.
Die Mehrwertsteuer wird gemäß Art. 10 Abs. 2 lit. a MWSTG (Schweiz) nicht erhoben, da der
Jahresumsatz unter CHF 100'000 liegt.</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>{e(o['name'])}, {e(o['addr1'])}, {e(o['addr2'])}, {e(o['country'])}</p>
<h2>Hinweis zu Verzeichnis-Einträgen</h2>
<p>Einträge im Verzeichnis stammen von den jeweiligen Anbietern selbst und werden vor
Veröffentlichung redaktionell gesichtet. Für die Richtigkeit der eingereichten Angaben ist
der jeweilige Anbieter verantwortlich. Featured-Listings sind bezahlte Platzierungen und als
solche gekennzeichnet.</p>
<h2>Haftung für Links</h2>
<p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich.</p>
<h2>EU-Streitschlichtung</h2>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a>.
Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
Verbraucherschlichtungsstelle teilzunehmen.</p>"""
    return page(title=f"Impressum — {SITE_SHORT}",
                description="Impressum und Anbieterkennzeichnung.", body=body,
                canonical=BASE_URL + page_path("impressum"), kind="impressum", noindex=True)


def privacy_page():
    o = OPERATOR
    body = f"""<p><a href="{e(page_path('home'))}">← Verzeichnis</a></p>
<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2>
<p>{e(o['name'])}, {e(o['addr1'])}, {e(o['addr2'])}, {e(o['country'])}<br>
E-Mail: <a href="mailto:{e(CONTACT_EMAIL)}">{e(CONTACT_EMAIL)}</a></p>
<h2>2. Allgemeine Hinweise</h2>
<p>Diese Website ist als statische Seite ohne Nutzerkonten, ohne Tracking und ohne
Werbe-Cookies aufgebaut. Es werden nur die Daten verarbeitet, die technisch zur Auslieferung
der Seite nötig sind.</p>
<h2>3. Server-Logs</h2>
<p>Beim Aufruf erhebt unser Hosting-Anbieter automatisch Server-Logdaten (z. B. IP-Adresse,
Datum/Uhrzeit, abgerufene Seite, Browsertyp). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
(sicherer Betrieb).</p>
<h2>4. Hosting</h2>
<p>Die Website wird über Cloudflare Pages (Cloudflare Inc.) ausgeliefert. Es besteht ein
Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.</p>
<h2>5. Keine Cookies, kein Tracking</h2>
<p>Wir setzen keine Analyse- oder Marketing-Cookies und binden keine externen Schriftarten
oder Tracking-Dienste ein. Ein Cookie-Banner ist daher nicht erforderlich.</p>
<h2>6. Verzeichnis-Einträge und Kontaktaufnahme</h2>
<p>Wenn du einen Eintrag einreichst oder uns per Mail kontaktierst, verarbeiten wir die von
dir übermittelten Daten ausschließlich zur Bearbeitung deiner Anfrage bzw. zur
Veröffentlichung deines Eintrags. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO.</p>
<h2>7. Newsletter</h2>
<p>Der Newsletter (Aban News) wird auf einer eigenen Seite betrieben; Anmeldung und
Datenverarbeitung erfolgen dort nach der dortigen Datenschutzerklärung.</p>
<h2>8. Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO).</p>
<h2>9. SSL/TLS</h2>
<p>Diese Seite nutzt aus Sicherheitsgründen eine TLS-Verschlüsselung (https).</p>
<p class="meta">Stand: {date.today().strftime('%m/%Y')}.</p>"""
    return page(title=f"Datenschutz — {SITE_SHORT}",
                description="Datenschutzerklärung dieser Website.", body=body,
                canonical=BASE_URL + page_path("datenschutz"), kind="datenschutz", noindex=True)


def notfound_page():
    body = (f'<h1>404 — Seite nicht gefunden</h1>\n'
            f'<p class="meta">Diese Seite gibt es nicht. Zurück zum Verzeichnis.</p>\n'
            f'<a class="cta" href="{e(page_path("home"))}">Zum Verzeichnis →</a>')
    return page(title=f"404 — {SITE_SHORT}", description="Seite nicht gefunden.",
                body=body, canonical=BASE_URL + page_path("home"), kind="home", noindex=True)


# --- RSS / Sitemap / robots / Assets -------------------------------------------

def rss_feed(entries):
    now = date.today().strftime("%a, %d %b %Y 00:00:00 +0000")
    items = []
    for a in entries:
        if a.get("platzhalter"):
            continue
        link = BASE_URL + page_path("agentur", a["id"])
        desc = strip_redaktion(a.get("tagline") or a.get("beschreibung") or "")
        items.append(f"<item><title>{e(a['name'])}</title><link>{e(link)}</link>"
                     f"<guid>{e(link)}</guid><pubDate>{now}</pubDate>"
                     f"<description>{e(desc)}</description></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0"><channel>'
            f"<title>{e(SITE_NAME)}</title><link>{e(BASE_URL)}/</link>"
            f"<description>{e(TAGLINE)}</description><language>de</language>"
            f"<lastBuildDate>{now}</lastBuildDate>" + "".join(items) + "</channel></rss>")


FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    f'<rect width="64" height="64" rx="14" fill="{ACCENT}"/>'
    '<rect x="16" y="14" width="32" height="36" rx="3" fill="none" stroke="#fff" stroke-width="3"/>'
    '<line x1="22" y1="24" x2="42" y2="24" stroke="#fff" stroke-width="3"/>'
    '<line x1="22" y1="32" x2="42" y2="32" stroke="#fff" stroke-width="3"/>'
    '<line x1="22" y1="40" x2="34" y2="40" stroke="#fff" stroke-width="3"/></svg>'
)


def write_static_assets(out: Path):
    (out / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    manifest = {
        "name": SITE_NAME, "short_name": "KI-Dienstleister",
        "description": TAGLINE, "start_url": "/", "display": "standalone",
        "background_color": BG, "theme_color": ACCENT,
    }
    (out / "site.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False), "utf-8")


# --- Build ---------------------------------------------------------------------

def build(data_path: Path, out: Path) -> int:
    db = json.loads(data_path.read_text(encoding="utf-8"))
    entries = db.get("agenturen", [])

    # Sortierung: Featured zuerst, dann alphabetisch. Platzhalter mitgelistet,
    # aber als solche markiert (Detailseiten noindex).
    entries = sorted(entries, key=lambda a: (not a.get("featured"), (a.get("name") or "").lower()))

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    pages = 0

    # Startseite
    of = out_file(out, "home")
    of.parent.mkdir(parents=True, exist_ok=True)
    of.write_text(home_page(entries), encoding="utf-8")
    pages += 1

    # Detailseiten
    for a in entries:
        of = out_file(out, "agentur", a["id"])
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(agentur_page(a), encoding="utf-8")
        pages += 1

    # Leistungs-Seiten (immer alle 4, auch leer -> "Sei der erste Eintrag")
    for l in LEISTUNGEN:
        members = [a for a in entries if l in a.get("leistungen", [])]
        of = out_file(out, "leistung", LEISTUNG_SLUG[l])
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(leistung_page(l, members), encoding="utf-8")
        pages += 1

    # Land-Seiten (immer alle 3)
    for c in LAENDER:
        members = [a for a in entries if a.get("land") == c]
        of = out_file(out, "land", c.lower())
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(land_page(c, members), encoding="utf-8")
        pages += 1

    # Funnel- und Info-Seiten
    for kind, builder in (("preise", preise_page), ("einreichen", einreichen_page),
                          ("impressum", imprint_page), ("datenschutz", privacy_page)):
        of = out_file(out, kind)
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(builder(), encoding="utf-8")
        pages += 1

    # 404
    (out / "404.html").write_text(notfound_page(), encoding="utf-8")

    # RSS
    (out / "feed.xml").write_text(rss_feed(entries), encoding="utf-8")

    # Sitemap (Platzhalter-Detailseiten ausgenommen — noindex)
    today = date.today().isoformat()
    urls = [BASE_URL + page_path("home"),
            BASE_URL + page_path("preise"),
            BASE_URL + page_path("einreichen")]
    urls += [BASE_URL + page_path("leistung", LEISTUNG_SLUG[l]) for l in LEISTUNGEN]
    urls += [BASE_URL + page_path("land", c.lower()) for c in LAENDER]
    urls += [BASE_URL + page_path("agentur", a["id"]) for a in entries if not a.get("platzhalter")]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        sm.append(f"  <url><loc>{e(url)}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")

    # robots.txt — AI-Crawler ausdruecklich willkommen (Auffindbarkeit).
    ai_bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
               "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
               "CCBot", "Amazonbot", "meta-externalagent"]
    lines = ["User-agent: *", "Allow: /", ""]
    for bot in ai_bots:
        lines += [f"User-agent: {bot}", "Allow: /", ""]
    lines.append(f"Sitemap: {BASE_URL}/sitemap.xml")
    (out / "robots.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Statische Assets
    write_static_assets(out)

    real = [a for a in entries if not a.get("platzhalter")]
    print(f"Built {pages} pages ({len(entries)} entries, {len(real)} real / "
          f"{len(entries) - len(real)} placeholders) + sitemap + RSS → {out}/")
    return pages


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here / "data" / "agenturen.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.out))


if __name__ == "__main__":
    main()
