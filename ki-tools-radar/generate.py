#!/usr/bin/env python3
"""KI-Tools Radar — static site generator.

Reads the curated AI-tools database (data/tools.json from the Aban News repo)
plus an affiliate-link map, and renders a German-language, SEO-oriented static
site: a homepage, one page per tool, and one page per category.

Fully automatable: run on a schedule / on data change via GitHub Actions.
No external dependencies — pure stdlib.

Usage:
    python generate.py                       # uses defaults below
    python generate.py --data ../data/tools.json --out dist
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# --- Brand tokens (copied from Aban News css/styles.css :root) -----------------
ACCENT = "#d97706"
ACCENT_HOVER = "#b45309"
BG = "#fffbf5"
BG_ALT = "#fef3c7"
TEXT = "#1f2937"
MUTED = "#6b7280"
SUCCESS = "#059669"
BORDER = "#e5e7eb"

SITE_NAME = "KI-Tools Radar"
SITE_TAGLINE = "Ehrlich bewertete KI-Tools für den deutschsprachigen Raum"
# Set via repo settings before launch; used for canonical/OG URLs.
BASE_URL = "https://ki-tools-radar.de"

# Affiliate-disclosure required under German UWG / DSGVO for paid links.
AFFILIATE_DISCLOSURE = (
    "Transparenz: Einige Links sind Affiliate-Links (mit * markiert). Kaufst du "
    "über einen solchen Link, erhalten wir eine Provision — für dich ohne "
    "Mehrkosten. Die Bewertungen sind davon unabhängig."
)


def slugify(value: str) -> str:
    value = value.lower()
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def e(value) -> str:
    """HTML-escape any scalar."""
    return html.escape(str(value if value is not None else ""))


# --- HTML shell ----------------------------------------------------------------

def page(title: str, description: str, body: str, canonical: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_HOVER};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);
line-height:1.6;}}
a{{color:var(--accent-h);}}
.wrap{{max-width:880px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:24px 0;}}
header h1{{margin:0;font-size:1.4rem;}}
header p{{margin:4px 0 0;color:var(--muted);font-size:.95rem;}}
header a{{text-decoration:none;color:var(--text);}}
main{{padding:32px 0;}}
.card{{background:#fff;border:1px solid var(--border);border-radius:12px;
padding:18px 20px;margin:0 0 14px;}}
.card h2{{margin:0 0 6px;font-size:1.15rem;}}
.card h2 a{{text-decoration:none;color:var(--text);}}
.score{{display:inline-block;background:var(--success);color:#fff;border-radius:999px;
padding:2px 10px;font-size:.85rem;font-weight:600;}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.tag{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;
font-size:.8rem;margin:2px 4px 2px 0;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:10px 18px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;
border-radius:6px;margin:12px 0;font-size:.92rem;}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);
margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:24px 0;color:var(--muted);
font-size:.85rem;}}
.grid-meta{{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.88rem;color:var(--muted);}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="/"><h1>📡 {e(SITE_NAME)}</h1></a>
<p>{e(SITE_TAGLINE)}</p>
</div></header>
<main><div class="wrap">
{body}
<p class="disclosure">{e(AFFILIATE_DISCLOSURE)}</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/datenschutz.html">Datenschutz</a> ·
<a href="/impressum.html">Impressum</a> · Daten: kuratiert, KI-unterstützt recherchiert
</div></footer>
</body>
</html>"""


# --- Components ----------------------------------------------------------------

def affiliate_link(tool: dict, aff: dict) -> tuple[str, bool]:
    """Return (url, is_affiliate) for a tool's CTA."""
    entry = aff.get(tool["id"])
    if entry and entry.get("affiliate_url"):
        return entry["affiliate_url"], True
    return tool.get("url", "#"), False


def tool_card(tool: dict, aff: dict) -> str:
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    cats = "".join(f'<span class="tag">{e(c)}</span>' for c in tool.get("category", []))
    score = tool.get("worth_it_score", "—")
    pricing = tool.get("pricing", {})
    price = "kostenlos" if pricing.get("free_tier") else ""
    if pricing.get("paid_from_eur"):
        price = f"ab {pricing['paid_from_eur']} {pricing.get('currency','EUR')}"
    return f"""<article class="card">
<h2><a href="/tool/{e(slugify(tool['id']))}.html">{e(tool['name'])}</a>
<span class="score">{e(score)}/10</span></h2>
<div class="grid-meta">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(price or '—')}</span>
<span>🇩🇪 DACH-Relevanz {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p class="meta">{cats}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">
Zu {e(tool['name'])}{e(star)} →</a>
</article>"""


def tool_page(tool: dict, aff: dict) -> str:
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    use_cases = "".join(f'<span class="tag">{e(u)}</span>' for u in tool.get("use_cases", []))
    alts = ", ".join(e(a) for a in tool.get("alternatives", [])) or "—"
    aban = tool.get("aban_note")
    dsgvo = tool.get("dsgvo_note")
    pricing = tool.get("pricing", {})
    body = f"""<p><a href="/">← Alle Tools</a></p>
<h1 style="margin:0">{e(tool['name'])} <span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h1>
<div class="grid-meta" style="margin:10px 0">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(pricing.get('model','—'))}{(' · ab '+str(pricing['paid_from_eur'])+' '+pricing.get('currency','EUR')) if pricing.get('paid_from_eur') else ''}</span>
<span>🇩🇪 DACH-Relevanz {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p><strong>Einsatzgebiete:</strong><br>{use_cases or '—'}</p>
{'<div class="note"><strong>Aban-Notiz:</strong> '+e(aban)+'</div>' if aban else ''}
{'<div class="note"><strong>DSGVO:</strong> '+e(dsgvo)+'</div>' if dsgvo else ''}
<p><strong>Alternativen:</strong> {alts}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">
Zu {e(tool['name'])}{e(star)} →</a>"""
    desc = (aban or f"{tool['name']} im Test: Bewertung, Pricing, DSGVO und Alternativen.")[:155]
    return page(
        f"{tool['name']} Test & Bewertung — {SITE_NAME}",
        desc,
        body,
        f"{BASE_URL}/tool/{slugify(tool['id'])}.html",
    )


# --- Build ---------------------------------------------------------------------

def build(data_path: Path, aff_path: Path, out: Path) -> int:
    db = json.loads(data_path.read_text(encoding="utf-8"))
    tools = db.get("tools", [])
    aff = {}
    if aff_path.exists():
        aff = json.loads(aff_path.read_text(encoding="utf-8")).get("links", {})

    if out.exists():
        shutil.rmtree(out)
    (out / "tool").mkdir(parents=True)
    (out / "kategorie").mkdir(parents=True)

    # Sort by worth_it_score desc, then DACH relevance.
    tools_sorted = sorted(
        tools,
        key=lambda t: (t.get("worth_it_score", 0), t.get("dach_relevance", 0)),
        reverse=True,
    )

    # Homepage
    cards = "\n".join(tool_card(t, aff) for t in tools_sorted)
    categories = sorted({c for t in tools for c in t.get("category", [])})
    cat_links = " · ".join(
        f'<a href="/kategorie/{slugify(c)}.html">{e(c)}</a>' for c in categories
    )
    home_body = f"""<p class="meta">Kategorien: {cat_links}</p>
<h2 style="margin:18px 0 12px">{len(tools)} KI-Tools, ehrlich bewertet</h2>
{cards}"""
    (out / "index.html").write_text(
        page(
            f"{SITE_NAME} — {SITE_TAGLINE}",
            f"{len(tools)} KI-Tools für den DACH-Raum: ehrliche Bewertungen, Pricing, DSGVO-Hinweise und Alternativen.",
            home_body,
            BASE_URL + "/",
        ),
        encoding="utf-8",
    )

    # Per-tool pages
    for t in tools:
        (out / "tool" / f"{slugify(t['id'])}.html").write_text(
            tool_page(t, aff), encoding="utf-8"
        )

    # Per-category pages
    for c in categories:
        members = [t for t in tools_sorted if c in t.get("category", [])]
        body = f'<p><a href="/">← Alle Tools</a></p>\n<h1>Beste {e(c)}-Tools</h1>\n'
        body += "\n".join(tool_card(t, aff) for t in members)
        (out / "kategorie" / f"{slugify(c)}.html").write_text(
            page(
                f"Beste {c}-KI-Tools im Vergleich — {SITE_NAME}",
                f"Die besten {c}-KI-Tools für den DACH-Raum, ehrlich bewertet und verglichen.",
                body,
                f"{BASE_URL}/kategorie/{slugify(c)}.html",
            ),
            encoding="utf-8",
        )

    total = 1 + len(tools) + len(categories)
    print(f"Built {total} pages → {out}/ "
          f"({len(tools)} tools, {len(categories)} categories)")
    return total


def main() -> None:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here.parent / "data" / "tools.json"))
    ap.add_argument("--affiliate", default=str(here / "affiliate.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.affiliate), Path(args.out))


if __name__ == "__main__":
    main()
