#!/usr/bin/env python3
"""
ki-verzeichnis/generate.py — Aggregiert alle aban-Radar-Datensätze + data/tools.json
zu EINER durchsuchbaren KI-Tools-Authority-Site (DACH, anti-hype, du-Form).

Reines Python-stdlib-Generat → dist/. Kein Build-Step, kein Tracking, System-Fonts.
Quelle der Wahrheit bleiben die einzelnen Radar-Datensätze; hier wird nur gebündelt
und zurückverlinkt (Cross-Linking stärkt das ganze Netzwerk).

Daten-Integrität: Preise/Wertungen werden NICHT erfunden — null/„noch nicht geprüft",
bis ein Mensch sie verifiziert. eu_lager/deutsche_oberflaeche nur true/false, wenn sicher.
"""
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
OUT = ROOT / "dist"

# --- Brand tokens (identisch zu css/styles.css :root der Hauptseite) -----------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "KI-Tools-Verzeichnis"
BASE_URL = "https://tools.abannews.com"
LANG = "de"
NEWSLETTER_URL = "https://abannews.com/gratis-ki-tools.html"

REDAKTION_RE = re.compile(r"\[Redaktion:[^\]]*\]\s*")

# --- Bereiche: Radar-Slug -> (Label, Quell-Domain, Icon) ------------------------
# handwerk-radar bewusst NICHT dabei (listet Betriebe, keine KI-Tools).
BEREICHE = {
    "automatisierung-radar": ("Automatisierung & Workflows", "https://automatisierung.abannews.com", "⚙️"),
    "video-radar":           ("Video-Generierung",            "https://video.abannews.com",           "🎬"),
    "musik-radar":           ("Musik-Generierung",            "https://musik.abannews.com",           "🎵"),
    "voice-radar":           ("Voice & Transkription",        "https://voice.abannews.com",           "🎙️"),
    "chatbot-radar":         ("Kundenservice & Chatbots",     "https://chatbot.abannews.com",         "💬"),
    "buchhaltung-radar":     ("Buchhaltung & Rechnungen",     "https://buchhaltung.abannews.com",     "🧾"),
    "newsletter-radar":      ("Newsletter & E-Mail",          "https://newsletter.abannews.com",      "📧"),
    "dropshipping-radar":    ("Dropshipping & Print-on-Demand","https://dropshipping.abannews.com",   "📦"),
}
ALLGEMEIN = ("Weitere KI-Tools", None, "🧰")  # Bucket für data/tools.json


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


def slugify(value: str) -> str:
    value = (value or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def clean(text):
    if not text:
        return ""
    return REDAKTION_RE.sub("", str(text)).strip()


def norm_name(name: str) -> str:
    """Dedup-Schlüssel: kleingeschrieben, ohne Suffixe/Sonderzeichen."""
    n = (name or "").lower()
    n = re.sub(r"\b(ai|\.ai|\.io|\.com|music|video|app)\b", "", n)
    n = re.sub(r"[^a-z0-9]", "", n)
    return n


# --- Datenaufnahme -------------------------------------------------------------

def load_all():
    """Sammelt normalisierte Tool-Records aus allen Radars + data/tools.json."""
    by_key = {}

    def add(record, bereich_slug, bereich_label, bereich_icon, quelle_url):
        key = norm_name(record["name"])
        if not key:
            return
        if key in by_key:
            t = by_key[key]
            if bereich_label not in [b["label"] for b in t["bereiche"]]:
                t["bereiche"].append({"slug": bereich_slug, "label": bereich_label,
                                      "icon": bereich_icon, "quelle": quelle_url})
            # bekannte EU-/Score-/Preis-Infos auffüllen, wenn bisher leer
            for f in ("eu_lager", "deutsche_oberflaeche", "worth_it_score", "preis"):
                if t.get(f) is None and record.get(f) is not None:
                    t[f] = record[f]
            if not t.get("aban_note") and record.get("aban_note"):
                t["aban_note"] = record["aban_note"]
            return
        record["bereiche"] = [{"slug": bereich_slug, "label": bereich_label,
                               "icon": bereich_icon, "quelle": quelle_url}]
        record["slug"] = slugify(record["name"])
        by_key[key] = record

    # 1) Radar-Datensätze (kuratiert, EU-geflaggt, gleiches Schema)
    for radar, (label, domain, icon) in BEREICHE.items():
        path = REPO / radar / "data" / "anbieter.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for a in data.get("anbieter", []):
            tid = a.get("id") or slugify(a.get("name", ""))
            quelle = f"{domain}/anbieter/{slugify(tid)}.html" if domain else None
            preis = a.get("preis_eur")
            add({
                "name": clean(a.get("name", "")),
                "url": a.get("url", "#"),
                "typ": clean(a.get("kategorie") or ""),
                "eu_lager": a.get("eu_lager"),
                "deutsche_oberflaeche": a.get("deutsche_oberflaeche"),
                "worth_it_score": a.get("worth_it_score"),
                "preis": preis if isinstance(preis, (int, float)) else None,
                "aban_note": clean(a.get("aban_note") or ""),
            }, radar, label, icon, quelle)

    # 2) data/tools.json (breiter Katalog, anderes Schema, eu unbekannt)
    tj = REPO / "data" / "tools.json"
    if tj.exists():
        d = json.loads(tj.read_text(encoding="utf-8"))
        tools = d if isinstance(d, list) else d.get("tools", [])
        for t in tools:
            name = clean(t.get("name", ""))
            if not name:
                continue
            add({
                "name": name,
                "url": t.get("url", "#"),
                "typ": clean(t.get("category") or ""),
                "eu_lager": None,
                "deutsche_oberflaeche": None,
                "worth_it_score": t.get("worth_it_score"),
                "preis": None,
                "aban_note": clean(t.get("aban_note") or ""),
                "vendor": clean(t.get("vendor") or ""),
            }, "weitere", ALLGEMEIN[0], ALLGEMEIN[2], None)

    tools = sorted(by_key.values(), key=sort_key)
    return tools


def sort_key(t):
    """EU-Hosting zuerst, dann mit Wertung, dann alphabetisch."""
    eu = 0 if t.get("eu_lager") is True else (1 if t.get("eu_lager") is None else 2)
    has_score = 0 if t.get("worth_it_score") is not None else 1
    return (eu, has_score, t["name"].lower())


# --- HTML shell ----------------------------------------------------------------

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    f'<rect width="64" height="64" rx="14" fill="{ACCENT}"/>'
    '<circle cx="24" cy="24" r="7" fill="none" stroke="#fff" stroke-width="4"/>'
    '<line x1="30" y1="30" x2="42" y2="42" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="44" cy="20" r="4" fill="#fff"/></svg>'
)

CSS = f"""
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
.wrap{{max-width:900px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
main{{padding:28px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:0 0 12px;}}
.card:hover{{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.08);}}
.card h2{{margin:0 0 6px;font-size:1.12rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.score{{display:inline-block;background:var(--success);color:#fff;border-radius:999px;padding:2px 10px;font-size:.85rem;font-weight:600;}}
.score.na{{background:var(--muted);}}
.flag{{display:inline-block;border-radius:999px;padding:2px 9px;font-size:.78rem;font-weight:600;}}
.flag.on{{background:var(--success);color:#fff;}} .flag.off{{background:var(--muted);color:#fff;}}
.flag.na{{background:var(--bg-alt);color:var(--muted);border:1px solid var(--border);}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;text-decoration:none;color:var(--text);}}
a.chip:hover{{background:var(--accent);color:#fff;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.92rem;}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:22px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}}
.nl .cta{{margin-top:0;}}
.search{{width:100%;padding:12px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 12px;background:var(--card);color:var(--text);}}
.search:focus{{outline:2px solid var(--accent);border-color:var(--accent);}}
.filters{{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 8px;}}
.fbtn{{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:999px;padding:5px 13px;font-size:.85rem;cursor:pointer;}}
.fbtn[aria-pressed="true"]{{background:var(--accent);color:#fff;border-color:var(--accent);}}
.count{{color:var(--muted);font-size:.85rem;margin:4px 0 14px;}}
.bereich-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:18px 0;}}
.bcard{{display:block;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-decoration:none;color:var(--text);}}
.bcard:hover{{border-color:var(--accent);transform:translateY(-2px);}}
.bcard b{{display:block;font-size:1.02rem;margin:6px 0 2px;}}
.bcard span{{color:var(--muted);font-size:.85rem;}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
"""


def shell(*, title, description, body, canonical, jsonld=None):
    ld = ""
    if jsonld:
        for block in jsonld:
            ld += f'<script type="application/ld+json">{json.dumps(block, ensure_ascii=False)}</script>\n'
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
<style>{CSS}</style>
{ld}</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
<header><div class="wrap">
<button class="themebtn" type="button" onclick="abanTheme()" aria-label="Design wechseln">🌓 Design</button>
<a href="/"><h1>🔎 {e(SITE_NAME)}</h1></a>
<div class="tag">Alle KI-Tools für DACH an einem Ort — ehrlich verglichen, EU-Hosting markiert, kein Hype.</div>
</div></header>
<main id="main"><div class="wrap">
{body}
<aside class="nl">
<strong>☕ Täglich KI auf Deutsch</strong>
<span>Kuratierte KI-News, 5 Minuten, kein Hype — von aban news.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a>
</aside>
<p class="disclosure">Transparenz: Einige Tool-Links können künftig Affiliate-Links sein (dann mit * markiert). Aktuell sind alle Links Direktlinks zum Anbieter, ohne Provision. Die Einordnung ist davon unabhängig. Daten: kuratiert aus den aban-Radars, Anbieter-URLs verifizierbar.</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · ein Projekt von <a href="https://abannews.com">aban news</a> ·
<a href="/datenschutz.html">Datenschutz</a> · <a href="/impressum.html">Impressum</a>
</div></footer>
<script>
function abanTheme(){{var h=document.documentElement;var t=h.getAttribute('data-theme')==='dark'?'light':'dark';
h.setAttribute('data-theme',t);try{{localStorage.setItem('aban-theme',t);}}catch(e){{}}}}
(function(){{try{{var t=localStorage.getItem('aban-theme');if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}}})();
</script>
</body>
</html>"""


# --- Komponenten ---------------------------------------------------------------

def eu_flag(t):
    v = t.get("eu_lager")
    if v is True:
        return '<span class="flag on">EU-Hosting</span>'
    if v is False:
        return '<span class="flag off">kein EU-Hosting</span>'
    return '<span class="flag na">EU-Hosting: ?</span>'


def score_badge(t):
    s = t.get("worth_it_score")
    if s is None:
        return '<span class="score na" title="noch nicht geprüft">–/10</span>'
    return f'<span class="score">{e(s)}/10</span>'


def tool_card(t):
    bereiche = " ".join(f'<a class="chip" href="/bereich/{e(b["slug"])}.html">{b["icon"]} {e(b["label"])}</a>'
                        for b in t["bereiche"])
    data_b = " ".join(b["slug"] for b in t["bereiche"])
    eu = "yes" if t.get("eu_lager") is True else ("no" if t.get("eu_lager") is False else "unknown")
    typ = f'<span class="chip">{e(t["typ"])}</span>' if t.get("typ") else ""
    return f"""<article class="card" data-name="{e(t['name'].lower())}" data-bereich="{e(data_b)}" data-eu="{eu}" data-typ="{e((t.get('typ') or '').lower())}">
<h2><a href="/tool/{e(t['slug'])}.html">{e(t['name'])}</a> {score_badge(t)}</h2>
<div class="meta">{eu_flag(t)} {typ}</div>
<div>{bereiche}</div>
</article>"""


def tool_jsonld(t):
    block = {
        "@context": "https://schema.org", "@type": "SoftwareApplication",
        "name": t["name"], "applicationCategory": t.get("typ") or "AI Tool",
        "operatingSystem": "Web", "url": t.get("url"),
    }
    return block


def breadcrumb(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": BASE_URL + p}
                                for i, (n, p) in enumerate(items)]}


# --- Seiten --------------------------------------------------------------------

def tool_page(t):
    bereiche = "".join(
        f'<li>{b["icon"]} <strong>{e(b["label"])}</strong>'
        + (f' — <a href="{e(b["quelle"])}" rel="noopener">Detail-Vergleich im {e(b["label"])}-Radar →</a>' if b.get("quelle") else "")
        + '</li>'
        for b in t["bereiche"])
    note = f'<div class="note">{e(t["aban_note"])}</div>' if t.get("aban_note") else ""
    typ = f'<p class="meta">Typ: {e(t["typ"])}</p>' if t.get("typ") else ""
    desc = f"{t['name']}: KI-Tool — Bereich, EU-Hosting und offizieller Link. Ehrlich eingeordnet von aban news."
    body = f"""<p class="meta"><a href="/">← Alle KI-Tools</a></p>
<h1>{e(t['name'])} {score_badge(t)}</h1>
<div class="meta">{eu_flag(t)}</div>
{typ}
{note}
<h2>In diesen Bereichen gelistet</h2>
<ul>{bereiche}</ul>
<p><a class="cta" href="{e(t.get('url','#'))}" target="_blank" rel="noopener">Zum Anbieter →</a></p>
<p class="meta">Preis &amp; Detail-Wertung pflegen wir im jeweiligen Fach-Radar (siehe oben) — dort, wo wir die Daten verifiziert haben.</p>"""
    crumb = breadcrumb([(SITE_NAME, "/"), (t["name"], f"/tool/{t['slug']}.html")])
    return shell(title=f"{t['name']} — KI-Tool im {SITE_NAME}", description=desc,
                 body=body, canonical=f"{BASE_URL}/tool/{t['slug']}.html",
                 jsonld=[tool_jsonld(t), crumb])


def bereich_page(slug, label, icon, tools):
    members = [t for t in tools if any(b["slug"] == slug for b in t["bereiche"])]
    cards = "\n".join(tool_card(t) for t in members)
    quelle = ""
    for radar, (lab, dom, ic) in BEREICHE.items():
        if radar == slug and dom:
            quelle = f'<p class="meta">Tiefen-Vergleich mit Preisen und Wertungen: <a href="{e(dom)}" rel="noopener">{e(lab)}-Radar →</a></p>'
    body = f"""<p class="meta"><a href="/">← Alle KI-Tools</a></p>
<h1>{icon} {e(label)}</h1>
<p class="count">{len(members)} Tools in diesem Bereich.</p>
{quelle}
{cards}"""
    crumb = breadcrumb([(SITE_NAME, "/"), (label, f"/bereich/{slug}.html")])
    items = {"@context": "https://schema.org", "@type": "ItemList",
             "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": t["name"],
                                  "url": f"{BASE_URL}/tool/{t['slug']}.html"} for i, t in enumerate(members)]}
    return shell(title=f"{label}: {len(members)} KI-Tools im Vergleich — {SITE_NAME}",
                 description=f"Alle KI-Tools für {label} in DACH: EU-Hosting markiert, ehrlich eingeordnet, kein Hype.",
                 body=body, canonical=f"{BASE_URL}/bereich/{slug}.html", jsonld=[items, crumb])


def home_page(tools):
    bereich_counts = {}
    for t in tools:
        for b in t["bereiche"]:
            bereich_counts[b["slug"]] = bereich_counts.get(b["slug"], 0) + 1
    # Bereich-Kacheln (Radars in fester Reihenfolge, dann Weitere)
    tiles = ""
    order = list(BEREICHE.items()) + [("weitere", ALLGEMEIN)]
    for slug, (label, dom, icon) in order:
        n = bereich_counts.get(slug, 0)
        if not n:
            continue
        tiles += f'<a class="bcard" href="/bereich/{e(slug)}.html"><span>{icon}</span><b>{e(label)}</b><span>{n} Tools →</span></a>'
    # Filter-Buttons
    fbtns = '<button class="fbtn" data-f="all" aria-pressed="true">Alle</button>'
    fbtns += '<button class="fbtn" data-f="eu" aria-pressed="false">Nur EU-Hosting</button>'
    for slug, (label, dom, icon) in order:
        if bereich_counts.get(slug):
            fbtns += f'<button class="fbtn" data-f="b:{e(slug)}" aria-pressed="false">{icon} {e(label)}</button>'
    cards = "\n".join(tool_card(t) for t in tools)
    eu_n = sum(1 for t in tools if t.get("eu_lager") is True)
    body = f"""<h1>{len(tools)} KI-Tools für DACH — an einem Ort</h1>
<p>Wir bündeln alle aban-Radars zu einem Verzeichnis: Automatisierung, Video, Musik, Voice,
Chatbots, Buchhaltung, Newsletter, Dropshipping — plus weitere KI-Tools. <strong>{eu_n}</strong>
davon laufen nachweislich mit EU-Hosting. Preise und Detail-Wertungen pflegen wir im jeweiligen
Fach-Radar, wo die Daten verifiziert sind. Kein Hype, keine erfundenen Zahlen.</p>

<div class="bereich-grid">{tiles}</div>

<h2>Alle Tools durchsuchen</h2>
<input class="search" id="q" type="search" placeholder="Tool, Anbieter oder Funktion suchen…" aria-label="Tools durchsuchen">
<div class="filters" id="filters">{fbtns}</div>
<p class="count" id="count">{len(tools)} Tools</p>
<div id="list">{cards}</div>
<p class="count" id="empty" style="display:none">Keine Treffer. Tipp: andere Schreibweise oder Filter zurücksetzen.</p>

<script>
(function(){{
  var q=document.getElementById('q'),list=document.getElementById('list'),
      cards=[].slice.call(list.children),count=document.getElementById('count'),
      empty=document.getElementById('empty'),filters=document.getElementById('filters'),
      mode='all',term='';
  function apply(){{
    var shown=0;
    cards.forEach(function(c){{
      var okT=!term||c.dataset.name.indexOf(term)>=0||(c.dataset.typ||'').indexOf(term)>=0||(c.dataset.bereich||'').indexOf(term)>=0;
      var okF=mode==='all'||(mode==='eu'&&c.dataset.eu==='yes')||(mode.indexOf('b:')===0&&(' '+c.dataset.bereich+' ').indexOf(' '+mode.slice(2)+' ')>=0);
      var show=okT&&okF;c.style.display=show?'':'none';if(show)shown++;
    }});
    count.textContent=shown+' Tools';empty.style.display=shown?'none':'';
  }}
  q.addEventListener('input',function(){{term=q.value.trim().toLowerCase();apply();}});
  filters.addEventListener('click',function(ev){{
    var b=ev.target.closest('.fbtn');if(!b)return;
    [].forEach.call(filters.children,function(x){{x.setAttribute('aria-pressed','false');}});
    b.setAttribute('aria-pressed','true');mode=b.dataset.f;apply();
  }});
}})();
</script>"""
    site = [
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME,
         "url": BASE_URL + "/", "inLanguage": LANG},
        {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME,
         "url": BASE_URL + "/"},
        {"@context": "https://schema.org", "@type": "CollectionPage", "name": SITE_NAME,
         "url": BASE_URL + "/", "description": f"{len(tools)} KI-Tools für DACH, ehrlich verglichen."},
    ]
    return shell(title=f"{len(tools)} KI-Tools für DACH, ehrlich verglichen — {SITE_NAME}",
                 description=f"Das große KI-Tools-Verzeichnis für DACH: {len(tools)} Tools aus 8 Bereichen, "
                             "EU-Hosting markiert, kein Hype. Von aban news.",
                 body=body, canonical=BASE_URL + "/", jsonld=site)


def legal_pages():
    imp = """<h1>Impressum</h1>
<p>Angaben gemäß Schweizer Recht / § 5 TMG (für DACH-Besucher):</p>
<p><strong>Allen Chour</strong><br>Hühnerhubelstrasse 37<br>3123 Belp<br>Schweiz</p>
<p>Kontakt: <a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<p>Dieses Verzeichnis ist ein redaktionelles Vergleichsprojekt von aban news. Anbieter-Daten
sind kuratiert; Anbieter-Namen und Marken gehören ihren jeweiligen Inhabern.</p>"""
    dat = """<h1>Datenschutz</h1>
<p>Diese Seite ist statisch und setzt <strong>kein Tracking</strong>, keine Cookies und keine
3rd-Party-Skripte ein. Es werden keine personenbezogenen Daten erhoben. Der Theme-Schalter
speichert deine Auswahl nur lokal in deinem Browser (localStorage), nicht auf einem Server.</p>
<p>Beim Klick auf einen Anbieter-Link verlässt du diese Seite; dann gelten die Datenschutz-
Bestimmungen des jeweiligen Anbieters.</p>
<p>Verantwortlich: Allen Chour, Belp (CH) · <a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>"""
    return imp, dat


# --- Build ---------------------------------------------------------------------

def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build():
    tools = load_all()
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    # Home
    write(OUT / "index.html", home_page(tools))

    # Tool-Seiten
    for t in tools:
        write(OUT / "tool" / f"{t['slug']}.html", tool_page(t))

    # Bereich-Seiten
    order = list(BEREICHE.items()) + [("weitere", ALLGEMEIN)]
    bereich_slugs = []
    for slug, (label, dom, icon) in order:
        members = [t for t in tools if any(b["slug"] == slug for b in t["bereiche"])]
        if members:
            write(OUT / "bereich" / f"{slug}.html", bereich_page(slug, label, icon, tools))
            bereich_slugs.append(slug)

    # Legal
    imp, dat = legal_pages()
    write(OUT / "impressum.html", shell(title=f"Impressum — {SITE_NAME}",
          description="Impressum des KI-Tools-Verzeichnisses.", body=imp, canonical=BASE_URL + "/impressum.html"))
    write(OUT / "datenschutz.html", shell(title=f"Datenschutz — {SITE_NAME}",
          description="Datenschutz: kein Tracking, keine Cookies.", body=dat, canonical=BASE_URL + "/datenschutz.html"))
    write(OUT / "404.html", shell(title=f"Nicht gefunden — {SITE_NAME}",
          description="Seite nicht gefunden.",
          body='<h1>404 — nicht gefunden</h1><p><a href="/">← Zurück zum Verzeichnis</a></p>',
          canonical=BASE_URL + "/404.html"))

    # favicon
    write(OUT / "favicon.svg", FAVICON_SVG)

    # robots
    write(OUT / "robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n")

    # sitemap
    urls = ["/", "/impressum.html", "/datenschutz.html"]
    urls += [f"/bereich/{s}.html" for s in bereich_slugs]
    urls += [f"/tool/{t['slug']}.html" for t in tools]
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"<url><loc>{BASE_URL}{u}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    write(OUT / "sitemap.xml", "\n".join(sm))

    # RSS (neueste Bereiche als Einstieg)
    rss = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0"><channel>',
           f"<title>{SITE_NAME}</title><link>{BASE_URL}/</link>",
           f"<description>KI-Tools für DACH, ehrlich verglichen.</description>"]
    for slug, (label, dom, icon) in order:
        if slug in bereich_slugs:
            rss.append(f"<item><title>{e(label)}</title><link>{BASE_URL}/bereich/{slug}.html</link>"
                       f"<guid>{BASE_URL}/bereich/{slug}.html</guid></item>")
    rss.append("</channel></rss>")
    write(OUT / "feed.xml", "\n".join(rss))

    # _headers (Security/CSP — Inline-Script für Suche/Theme erlaubt)
    write(OUT / "_headers",
          "/*\n"
          "  X-Content-Type-Options: nosniff\n"
          "  X-Frame-Options: DENY\n"
          "  Referrer-Policy: strict-origin-when-cross-origin\n"
          "  Content-Security-Policy: default-src 'self'; img-src 'self' data:; "
          "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
          "base-uri 'self'; form-action 'self'\n")

    n_pages = 3 + len(bereich_slugs) + len(tools)
    print(f"Built {n_pages} HTML pages from {len(tools)} unique tools "
          f"({len(bereich_slugs)} Bereiche) + sitemap + RSS → {OUT}")


if __name__ == "__main__":
    build()
