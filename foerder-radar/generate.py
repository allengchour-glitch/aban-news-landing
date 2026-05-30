#!/usr/bin/env python3
"""Förder-Radar — static generator for a DACH funding-program directory.

Reads foerderungen.json (curated real programs) and renders a German-language,
filterable, SEO-oriented static directory: an index with client-side filtering,
one page per program, plus region/type/area hubs. Monetization-ready: a clearly
labeled lead-gen / consultant CTA slot per program (fill via leadgen.json).

Pure stdlib, no deps. DSGVO-safe (system fonts, no tracking). German-first
(Fördermittel are DACH-specific — depth in German is the moat, per strategy).

IMPORTANT (honesty): funding amounts/deadlines change. This site never invents
them — it links to the official source and shows an "ohne Gewähr" disclaimer.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path

# Brand tokens (shared with KI-Tools Radar / Aban).
ACCENT, ACCENT_H = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "Förder-Radar"
TAGLINE = "Fördermittel für DACH — klar sortiert, ehrlich erklärt"
BASE_URL = "https://foerder.abannews.com"   # subdomain (set up like radar)
NEWSLETTER_URL = "https://abannews.de"

REGION_NAME = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz", "EU": "EU"}


def slug(v: str) -> str:
    v = v.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        v = v.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-") or "x"


def e(v) -> str:
    return html.escape(str(v if v is not None else ""))


def page(title, description, body, canonical):
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
<meta name="theme-color" content="{ACCENT}">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_H};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};--card:#fff;}}
@media(prefers-color-scheme:dark){{:root{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;
--muted:#a8a29e;--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.wrap{{max-width:900px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
main{{padding:26px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:0 0 12px;}}
.card h2{{margin:0 0 4px;font-size:1.12rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.badges{{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}}
.b{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 9px;font-size:.78rem;}}
.b.art{{background:var(--accent);color:#fff;}} .b.reg{{background:var(--success);color:#fff;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:9px 16px;
border-radius:8px;font-weight:600;margin-top:8px;}} .cta:hover{{background:var(--accent-h);}}
.lead{{background:var(--bg-alt);border:1px dashed var(--accent);border-radius:10px;padding:12px 16px;margin:14px 0;font-size:.92rem;}}
.filter{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;}}
.filter select,.filter input{{padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:.95rem;}}
.filter input{{flex:1;min-width:160px;}}
.disc{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:22px;padding-top:12px;}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin:20px 0;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;}}
.nl span{{color:var(--muted);flex:1;min-width:200px;}} .nl .cta{{margin-top:0;}}
footer{{border-top:1px solid var(--border);padding:20px 0;color:var(--muted);font-size:.85rem;}}
h1{{font-size:1.6rem;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="/"><h1>🧭 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(TAGLINE)}</div>
</div></header>
<main><div class="wrap">
{body}
<aside class="nl"><strong>📬 Förder- &amp; KI-News</strong>
<span>Neue Programme &amp; KI-Tipps für DACH — kostenlos von Aban News.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a></aside>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/impressum.html">Impressum</a> ·
<a href="/datenschutz.html">Datenschutz</a> · Angaben ohne Gewähr
</div></footer>
</body>
</html>"""


def jsonld(p):
    data = {"@context": "https://schema.org", "@type": "GovernmentService",
            "name": p["name"], "serviceType": p.get("art", "Förderung"),
            "provider": {"@type": "Organization", "name": p.get("traeger", "")},
            "areaServed": REGION_NAME.get(p.get("region"), p.get("region", "")),
            "url": BASE_URL + f"/programm/{slug(p['id'])}.html"}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def card(p):
    badges = (f'<span class="b reg">{e(REGION_NAME.get(p.get("region"), p.get("region","")))}</span>'
              f'<span class="b art">{e(p.get("art",""))}</span>'
              + "".join(f'<span class="b">{e(b)}</span>' for b in p.get("bereich", [])))
    search = " ".join([p["name"], p.get("traeger", ""), p.get("art", "")]
                      + p.get("bereich", []) + p.get("zielgruppe", [])).lower()
    return f"""<article class="card" data-s="{e(search)}" data-region="{e(p.get('region',''))}" data-art="{e(p.get('art',''))}">
<h2><a href="/programm/{e(slug(p['id']))}.html">{e(p['name'])}</a></h2>
<div class="badges">{badges}</div>
<p>{e(p.get('kurz',''))}</p>
<p style="color:var(--muted);font-size:.85rem">Träger: {e(p.get('traeger','—'))}</p>
</article>"""


def lead_slot(p, leadgen):
    """Clearly labeled lead-gen / consultant CTA. Filled via leadgen.json."""
    entry = leadgen.get(p["id"]) or leadgen.get("_default")
    if not entry:
        return ""
    return (f'<div class="lead"><strong>Beratung gewünscht?</strong> {e(entry.get("text",""))}'
            f' <a class="cta" href="{e(entry.get("url","#"))}" rel="sponsored nofollow" '
            f'target="_blank">{e(entry.get("cta","Kostenlose Erstberatung"))} →</a>'
            f'<br><small style="color:var(--muted)">Anzeige · unabhängig von der Programm-Info</small></div>')


def program_page(p, leadgen, disclaimer):
    badges = (f'<span class="b reg">{e(REGION_NAME.get(p.get("region"), p.get("region","")))}</span>'
              f'<span class="b art">{e(p.get("art",""))}</span>'
              + "".join(f'<span class="b">{e(b)}</span>' for b in p.get("bereich", [])))
    zg = ", ".join(e(z) for z in p.get("zielgruppe", [])) or "—"
    body = f"""{jsonld(p)}
<p><a href="/">← Alle Förderungen</a></p>
<h1>{e(p['name'])}</h1>
<div class="badges">{badges}</div>
<p>{e(p.get('kurz',''))}</p>
<p><strong>Träger:</strong> {e(p.get('traeger','—'))}<br>
<strong>Region:</strong> {e(REGION_NAME.get(p.get('region'), p.get('region','—')))}<br>
<strong>Art:</strong> {e(p.get('art','—'))}<br>
<strong>Zielgruppe:</strong> {zg}</p>
<a class="cta" href="{e(p.get('url','#'))}" target="_blank" rel="noopener">Zur offiziellen Programm-Seite →</a>
{lead_slot(p, leadgen)}
<p class="disc">⚠️ {e(disclaimer)}</p>"""
    return page(f"{p['name']} — Förderung im Überblick | {SITE_NAME}",
                p.get("kurz", "")[:155], body,
                BASE_URL + f"/programm/{slug(p['id'])}.html")


def build(data_path: Path, out: Path, here: Path):
    db = json.loads(data_path.read_text(encoding="utf-8"))
    progs = db.get("programme", [])
    disclaimer = db.get("disclaimer", "Angaben ohne Gewähr — bitte offiziell prüfen.")
    lg_path = here / "leadgen.json"
    leadgen = json.loads(lg_path.read_text(encoding="utf-8")).get("links", {}) if lg_path.exists() else {}

    import shutil
    if out.exists():
        shutil.rmtree(out)
    (out / "programm").mkdir(parents=True)
    (out / "region").mkdir(parents=True)
    (out / "art").mkdir(parents=True)

    regions = sorted({p["region"] for p in progs if p.get("region")})
    arten = sorted({p["art"] for p in progs if p.get("art")})

    # Index with client-side filters
    reg_opts = "".join(f'<option value="{e(r)}">{e(REGION_NAME.get(r,r))}</option>' for r in regions)
    art_opts = "".join(f'<option value="{e(a)}">{e(a)}</option>' for a in arten)
    filt = (f'<div class="filter">'
            f'<input id="q" type="search" placeholder="Suchen (z. B. KI, Gründung, Energie)…" aria-label="Suche">'
            f'<select id="fr"><option value="">Alle Regionen</option>{reg_opts}</select>'
            f'<select id="fa"><option value="">Alle Arten</option>{art_opts}</select></div>')
    cards = "\n".join(card(p) for p in progs)
    reg_links = " · ".join(f'<a href="/region/{slug(r)}.html">{e(REGION_NAME.get(r,r))}</a>' for r in regions)
    art_links = " · ".join(f'<a href="/art/{slug(a)}.html">{e(a)}</a>' for a in arten)
    home = (f'<h1>{len(progs)} Förderprogramme für den DACH-Raum</h1>'
            f'<p class="tag" style="color:var(--muted)">Nach Region: {reg_links} · Nach Art: {art_links}</p>'
            f'{filt}<p id="nores" hidden>Keine Treffer.</p>{cards}'
            f'<script src="/filter.js" defer></script>'
            f'<p class="disc">⚠️ {e(disclaimer)}</p>')
    (out / "index.html").write_text(
        page(f"{SITE_NAME} — {TAGLINE}",
             f"{len(progs)} Förderprogramme (Zuschuss, Kredit, Stipendium) für Gründer und KMU in DACH & EU, klar sortiert.",
             home, BASE_URL + "/"), encoding="utf-8")

    for p in progs:
        (out / "programm" / f"{slug(p['id'])}.html").write_text(
            program_page(p, leadgen, disclaimer), encoding="utf-8")

    for r in regions:
        members = [p for p in progs if p.get("region") == r]
        body = (f'<p><a href="/">← Alle Förderungen</a></p><h1>Förderungen in {e(REGION_NAME.get(r,r))}</h1>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "region" / f"{slug(r)}.html").write_text(
            page(f"Förderungen {REGION_NAME.get(r,r)} — {SITE_NAME}",
                 f"Förderprogramme in {REGION_NAME.get(r,r)}, klar sortiert.", body,
                 BASE_URL + f"/region/{slug(r)}.html"), encoding="utf-8")

    for a in arten:
        members = [p for p in progs if p.get("art") == a]
        body = (f'<p><a href="/">← Alle Förderungen</a></p><h1>{e(a)}-Förderungen</h1>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "art" / f"{slug(a)}.html").write_text(
            page(f"{a}-Förderungen im DACH-Raum — {SITE_NAME}",
                 f"Alle {a}-Förderprogramme, klar sortiert.", body,
                 BASE_URL + f"/art/{slug(a)}.html"), encoding="utf-8")

    # filter.js (no deps, no tracking)
    (out / "filter.js").write_text(FILTER_JS, encoding="utf-8")

    # Legal pages (operator: Alleng Chour, abannews.com / Belp CH).
    imp = """<p><a href="/">← Startseite</a></p><h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>Förder-Radar</strong><br>Alleng Chour<br>Hühnerhubelstrasse 37<br>3123 Belp<br>Schweiz</p>
<h2>Kontakt</h2><p>E-Mail: <a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Haftung für Inhalte</h2><p>Die Förder-Informationen werden sorgfältig zusammengestellt, sind aber
unverbindlich und ohne Gewähr. Maßgeblich sind allein die Angaben der jeweiligen Förderträger. Für
externe Links ist der jeweilige Anbieter verantwortlich.</p>
<h2>Kennzeichnung</h2><p>Als „Anzeige" markierte Beratungs-/Partnerangebote sind bezahlte Platzierungen
bzw. Vermittlungslinks. Die redaktionelle Programm-Information ist davon unabhängig.</p>"""
    (out / "impressum.html").write_text(
        page(f"Impressum — {SITE_NAME}", "Impressum.", imp, BASE_URL + "/impressum.html"),
        encoding="utf-8")
    dat = f"""<p><a href="/">← Startseite</a></p><h1>Datenschutzerklärung</h1>
<h2>Verantwortlicher</h2><p>Alleng Chour, Hühnerhubelstrasse 37, 3123 Belp, Schweiz ·
<a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Allgemeines</h2><p>Diese Website ist statisch, ohne Nutzerkonten, ohne Tracking und ohne
Werbe-Cookies. Es werden nur technisch nötige Daten verarbeitet.</p>
<h2>Hosting</h2><p>Auslieferung über Cloudflare Pages (EU/Standardvertragsklauseln, AV-Vertrag nach Art. 28 DSGVO).</p>
<h2>Beratungs-/Partnerlinks</h2><p>Erst beim Klick auf einen als „Anzeige" markierten Link wirst du zum
Partner weitergeleitet, der dann nach seiner eigenen Datenschutzerklärung Daten verarbeitet.</p>
<h2>Deine Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch (Art. 15–21 DSGVO)
sowie Beschwerde bei einer Aufsichtsbehörde. Stand: {date.today().strftime('%m/%Y')}.</p>"""
    (out / "datenschutz.html").write_text(
        page(f"Datenschutz — {SITE_NAME}", "Datenschutzerklärung.", dat, BASE_URL + "/datenschutz.html"),
        encoding="utf-8")

    # sitemap + robots
    urls = ([BASE_URL + "/"] + [BASE_URL + f"/programm/{slug(p['id'])}.html" for p in progs]
            + [BASE_URL + f"/region/{slug(r)}.html" for r in regions]
            + [BASE_URL + f"/art/{slug(a)}.html" for a in arten])
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"  <url><loc>{e(u)}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")
    (out / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\n"
        "User-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\n"
        f"Sitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")

    total = 1 + len(progs) + len(regions) + len(arten)
    print(f"Built {total} pages ({len(progs)} programs, {len(regions)} regions, "
          f"{len(arten)} types) → {out}/")
    return total


FILTER_JS = """// Förder-Radar — client-side filter (no deps, no tracking)
(function(){
  var q=document.getElementById('q'),fr=document.getElementById('fr'),fa=document.getElementById('fa');
  if(!q)return;
  var cards=[].slice.call(document.querySelectorAll('article.card')),no=document.getElementById('nores');
  function run(){
    var t=q.value.trim().toLowerCase(),r=fr.value,a=fa.value,n=0;
    cards.forEach(function(c){
      var ok=(!t||(c.dataset.s||'').indexOf(t)!==-1)&&(!r||c.dataset.region===r)&&(!a||c.dataset.art===a);
      c.style.display=ok?'':'none'; if(ok)n++;
    });
    if(no)no.hidden=n>0;
  }
  [q,fr,fa].forEach(function(el){el.addEventListener('input',run);});
})();
"""


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here / "foerderungen.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.out), here)


if __name__ == "__main__":
    main()
