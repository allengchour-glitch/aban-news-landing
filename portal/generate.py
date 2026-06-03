#!/usr/bin/env python3
"""Aban-Netzwerk — portal that bundles the newsletter + all money projects.

A single static landing page linking Aban News (newsletter) and the three
programmatic sites (KI-Tools Radar, Förder-Radar, KI-Jobs Radar). Strengthens
internal linking between properties and gives the brand one hub. Pure stdlib,
DSGVO-safe (system fonts, no tracking).
"""

from __future__ import annotations

import html
import json
from datetime import date
from pathlib import Path

ACCENT, ACCENT_H = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, BORDER = "#1f2937", "#6b7280", "#e5e7eb"

SITE_NAME = "Aban-Netzwerk"
BASE_URL = "https://abannews.com"


def e(v) -> str:
    return html.escape(str(v if v is not None else ""))


CARDS = [
    {"emoji": "📬", "name": "Aban News", "tag": "Der tägliche KI-Newsletter",
     "desc": "Mo–Fr kuratierte KI-News auf Deutsch — 3–5 Minuten, kein Hype. Das Herz des Netzwerks.",
     "url": "https://abannews.de", "cta": "Kostenlos abonnieren"},
    {"emoji": "📡", "name": "KI-Tools Radar", "tag": "143 KI-Tools, ehrlich bewertet",
     "desc": "Vergleiche, Pro/Contra, Pricing und DSGVO-Hinweise — in 11 Sprachen. Finde das richtige KI-Tool.",
     "url": "https://radar.abannews.com", "cta": "Tools entdecken"},
    {"emoji": "🧭", "name": "Förder-Radar", "tag": "Fördermittel für DACH",
     "desc": "Zuschüsse, Kredite & Stipendien für Gründer und KMU — klar sortiert und filterbar.",
     "url": "https://foerder.abannews.com", "cta": "Förderungen finden"},
    {"emoji": "🤖", "name": "KI-Jobs Radar", "tag": "KI- & ML-Jobs im DACH-Raum",
     "desc": "Täglich aktualisierte Stellen rund um Künstliche Intelligenz und Machine Learning.",
     "url": "https://jobs.abannews.com", "cta": "Jobs ansehen"},
]


def build(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    cards = "\n".join(f"""<a class="card" href="{e(c['url'])}">
<div class="emoji">{c['emoji']}</div>
<h2>{e(c['name'])}</h2>
<p class="tag">{e(c['tag'])}</p>
<p class="desc">{e(c['desc'])}</p>
<span class="cta">{e(c['cta'])} →</span>
</a>""" for c in CARDS)

    schema = {
        "@context": "https://schema.org", "@type": "Organization",
        "name": SITE_NAME, "url": BASE_URL + "/",
        "description": ("Das Aban-Netzwerk: deutschsprachiger KI-Newsletter und automatisierte "
                        "KI-Tool-, Fördermittel- und Job-Verzeichnisse für den DACH-Raum."),
        "sameAs": [c["url"] for c in CARDS],
    }
    jsonld = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'

    body = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(SITE_NAME)} — KI-News, Tools, Förderungen & Jobs für DACH</title>
<meta name="description" content="Das Aban-Netzwerk: deutschsprachiger KI-Newsletter plus automatisierte Verzeichnisse für KI-Tools, Fördermittel und KI-Jobs im DACH-Raum.">
<link rel="canonical" href="{BASE_URL}/">
<meta property="og:title" content="{e(SITE_NAME)}">
<meta property="og:description" content="KI-News, Tools, Förderungen & Jobs für den DACH-Raum — ehrlich, kein Hype.">
<meta property="og:type" content="website">
<meta name="theme-color" content="{ACCENT}">
{jsonld}
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_H};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--border:{BORDER};--card:#fff;}}
@media(prefers-color-scheme:dark){{:root{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;
--muted:#a8a29e;--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);color:var(--text);line-height:1.6;}}
.wrap{{max-width:860px;margin:0 auto;padding:0 20px;}}
header{{text-align:center;padding:56px 0 28px;}}
header h1{{margin:0;font-size:2rem;}} header p{{color:var(--muted);font-size:1.05rem;margin:8px 0 0;}}
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:8px 0 40px;}}
@media(max-width:620px){{.grid{{grid-template-columns:1fr;}}}}
.card{{display:block;background:var(--card);border:1px solid var(--border);border-radius:16px;
padding:22px;text-decoration:none;color:var(--text);transition:transform .12s,box-shadow .12s;}}
.card:hover{{transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.08);}}
.emoji{{font-size:2rem;}} .card h2{{margin:8px 0 2px;font-size:1.25rem;}}
.tag{{color:var(--accent-h);font-weight:600;margin:0;font-size:.95rem;}}
.desc{{color:var(--muted);margin:8px 0 12px;font-size:.95rem;}}
.cta{{font-weight:600;color:var(--accent-h);}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;text-align:center;}}
footer a{{color:var(--muted);}}
</style>
</head>
<body>
<header><div class="wrap">
<h1>📡 {e(SITE_NAME)}</h1>
<p>KI-News, Tools, Förderungen &amp; Jobs für den deutschsprachigen Raum — ehrlich, kein Hype.</p>
</div></header>
<main><div class="wrap">
<div class="grid">{cards}</div>
</div></main>
<footer><div class="wrap">
© {date.today().year} Aban · Alleng Chour, Belp/CH ·
<a href="https://abannews.com/impressum.html">Impressum</a> ·
<a href="https://abannews.com/datenschutz.html">Datenschutz</a>
</div></footer>
</body>
</html>"""
    (out / "index.html").write_text(body, encoding="utf-8")
    (out / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")
    print(f"Built portal → {out}/index.html")


if __name__ == "__main__":
    build(Path(__file__).resolve().parent / "dist")
