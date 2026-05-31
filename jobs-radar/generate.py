#!/usr/bin/env python3
"""KI-Jobs Radar — static generator for a DACH AI/ML job board.

Reads jobs.json (auto-filled by fetch_jobs.py from the free Arbeitnow API) and
renders a German-language, filterable, SEO-oriented job board: an index with
client-side filtering, one page per job (with JobPosting JSON-LD for Google Jobs
eligibility), plus location/remote hubs. Monetization-ready: a labeled
"featured / sponsored" slot per page (fill via sponsors.json).

Pure stdlib, no deps. DSGVO-safe (system fonts, no tracking). German-first.

Honesty: job listings link to the original source; we don't fabricate salaries
or details. Every page shows the source + "ohne Gewähr".
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

ACCENT, ACCENT_H = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "KI-Jobs Radar"
TAGLINE = "KI- & Machine-Learning-Jobs im DACH-Raum — täglich aktualisiert"
BASE_URL = "https://jobs.abannews.com"
NEWSLETTER_URL = "https://abannews.de"


def slug(v: str) -> str:
    v = (v or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        v = v.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-") or "x"


def e(v) -> str:
    return html.escape(str(v if v is not None else ""))


def job_slug(j: dict) -> str:
    base = j.get("slug") or f'{j.get("title","")}-{j.get("company","")}'
    return slug(base)[:80]


def iso_date(ts) -> str:
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError):
        return date.today().isoformat()


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
.b.rem{{background:var(--success);color:#fff;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:9px 16px;
border-radius:8px;font-weight:600;margin-top:8px;}} .cta:hover{{background:var(--accent-h);}}
.feat{{border:2px solid var(--accent);border-radius:10px;padding:12px 16px;margin:14px 0;background:var(--card);}}
.feat-label{{display:inline-block;background:var(--accent);color:#fff;font-weight:600;font-size:.78rem;border-radius:999px;padding:2px 11px;margin-bottom:6px;}}
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
<a href="/"><h1>🤖 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(TAGLINE)}</div>
</div></header>
<main><div class="wrap">
{body}
<aside class="nl"><strong>📬 Neue KI-Jobs &amp; News</strong>
<span>Die besten KI-Jobs &amp; Tool-Tipps für DACH — kostenlos von Aban News.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a></aside>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/impressum.html">Impressum</a> ·
<a href="/datenschutz.html">Datenschutz</a> · Stellen verlinken zur Originalquelle, Angaben ohne Gewähr
</div></footer>
</body>
</html>"""


def job_jsonld(j: dict) -> str:
    """JobPosting JSON-LD — eligibility for Google for Jobs."""
    data = {
        "@context": "https://schema.org", "@type": "JobPosting",
        "title": j.get("title", ""),
        "description": (j.get("title", "") + " bei " + j.get("company", "")),
        "datePosted": iso_date(j.get("created_at")),
        "hiringOrganization": {"@type": "Organization", "name": j.get("company", "")},
        "employmentType": [t.upper() for t in j.get("types", [])] or "FULL_TIME",
        "directApply": False,
        "jobLocationType": "TELECOMMUTE" if j.get("remote") else None,
        "jobLocation": {"@type": "Place", "address": {
            "@type": "PostalAddress", "addressLocality": j.get("location", ""),
            "addressCountry": "DE"}},
    }
    data = {k: v for k, v in data.items() if v is not None}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def job_card(j: dict) -> str:
    rem = '<span class="b rem">Remote</span>' if j.get("remote") else ""
    tags = "".join(f'<span class="b">{e(t)}</span>' for t in j.get("tags", [])[:4])
    search = " ".join([j.get("title", ""), j.get("company", ""), j.get("location", "")]
                      + j.get("tags", [])).lower()
    return f"""<article class="card" data-s="{e(search)}" data-remote="{'1' if j.get('remote') else '0'}">
<h2><a href="/job/{e(job_slug(j))}.html">{e(j.get('title',''))}</a></h2>
<div class="badges"><span class="b">🏢 {e(j.get('company','—'))}</span>
<span class="b">📍 {e(j.get('location') or 'k. A.')}</span>{rem}{tags}</div>
</article>"""


def featured_slot(sponsors: dict) -> str:
    s = sponsors.get("_featured")
    if not s:
        return ""
    return (f'<div class="feat"><span class="feat-label">⭐ Gesponsert</span><br>'
            f'<strong>{e(s.get("title",""))}</strong> — {e(s.get("company",""))}<br>'
            f'<a class="cta" href="{e(s.get("url","#"))}" rel="sponsored nofollow" target="_blank">'
            f'{e(s.get("cta","Zur Stelle"))} →</a>'
            f'<br><small style="color:var(--muted)">Anzeige</small></div>')


def job_page(j: dict, sponsors: dict) -> str:
    rem = '<span class="b rem">Remote</span>' if j.get("remote") else ""
    tags = "".join(f'<span class="b">{e(t)}</span>' for t in j.get("tags", []))
    types = ", ".join(e(t) for t in j.get("types", [])) or "—"
    body = f"""{job_jsonld(j)}
<p><a href="/">← Alle KI-Jobs</a></p>
<h1>{e(j.get('title',''))}</h1>
<div class="badges"><span class="b">🏢 {e(j.get('company','—'))}</span>
<span class="b">📍 {e(j.get('location') or 'k. A.')}</span>{rem}</div>
<p><strong>Art:</strong> {types}<br>
<strong>Veröffentlicht:</strong> {e(iso_date(j.get('created_at')))}</p>
<p>{tags}</p>
<a class="cta" href="{e(j.get('url','#'))}" target="_blank" rel="noopener">Zur Original-Stellenanzeige →</a>
{featured_slot(sponsors)}
<p class="disc">⚠️ Stelle von {e(j.get('company','—'))}, verlinkt zur Originalquelle (arbeitnow.com).
Angaben ohne Gewähr — Details bitte beim Arbeitgeber prüfen.</p>"""
    return page(f"{j.get('title','')} bei {j.get('company','')} — {SITE_NAME}",
                f"{j.get('title','')} bei {j.get('company','')} ({j.get('location') or 'DACH'}). KI-/ML-Stelle.",
                body, BASE_URL + f"/job/{job_slug(j)}.html")


def build(data_path: Path, out: Path, here: Path):
    db = json.loads(data_path.read_text(encoding="utf-8"))
    jobs = db.get("jobs", [])
    fetched = db.get("fetched", date.today().isoformat())
    sp_path = here / "sponsors.json"
    sponsors = json.loads(sp_path.read_text(encoding="utf-8")).get("slots", {}) if sp_path.exists() else {}

    if out.exists():
        shutil.rmtree(out)
    (out / "job").mkdir(parents=True)

    # newest first
    jobs = sorted(jobs, key=lambda j: j.get("created_at") or 0, reverse=True)

    # Data-driven hubs (scale automatically as more jobs arrive):
    #  - Remote hub  - City hubs (location before comma, >=3 jobs)
    import collections
    _not_city = {"remote", "anywhere", "worldwide", "europe", "european", "emea",
                 "americas", "america", "global", "eu", "dach", "usa", "us", "uk"}
    def city_of(j):
        loc = (j.get("location") or "").split(",")[0].strip()
        return loc if loc and loc.lower() not in _not_city else ""
    city_count = collections.Counter(city_of(j) for j in jobs if city_of(j))
    cities = sorted([c for c, n in city_count.items() if n >= 3])
    remote_jobs = [j for j in jobs if j.get("remote")]

    hub_links = []
    if remote_jobs:
        hub_links.append('<a href="/remote.html">Remote</a>')
    hub_links += [f'<a href="/ort/{slug(c)}.html">{e(c)}</a>' for c in cities]
    hubnav = (f'<p class="tag" style="color:var(--muted)">Beliebt: {" · ".join(hub_links)}</p>'
              if hub_links else "")

    filt = ('<div class="filter">'
            '<input id="q" type="search" placeholder="Suchen (Titel, Firma, Ort, Tag)…" aria-label="Suche">'
            '<select id="fr"><option value="">Alle</option>'
            '<option value="1">Nur Remote</option><option value="0">Vor Ort</option></select></div>')
    cards = "\n".join(job_card(j) for j in jobs)
    home = (f'<h1>{len(jobs)} KI- & ML-Jobs im DACH-Raum</h1>'
            f'<p class="tag" style="color:var(--muted)">Stand: {e(fetched)} · Quelle: {e(db.get("source","arbeitnow.com"))}</p>'
            f'{hubnav}'
            f'{featured_slot(sponsors)}{filt}<p id="nores" hidden>Keine Treffer.</p>{cards}'
            f'<script src="/filter.js" defer></script>'
            f'<p class="disc">⚠️ Stellen werden automatisch aggregiert und verlinken zur Originalquelle. '
            f'Angaben ohne Gewähr.</p>')
    (out / "index.html").write_text(
        page(f"{SITE_NAME} — {TAGLINE}",
             f"{len(jobs)} aktuelle KI-, Machine-Learning- und Data-Science-Jobs im DACH-Raum, täglich aktualisiert.",
             home, BASE_URL + "/"), encoding="utf-8")

    for j in jobs:
        (out / "job" / f"{job_slug(j)}.html").write_text(job_page(j, sponsors), encoding="utf-8")

    # Remote hub
    if remote_jobs:
        body = (f'<p><a href="/">← Alle Jobs</a></p><h1>Remote KI-Jobs im DACH-Raum</h1>'
                f'<p class="tag" style="color:var(--muted)">{len(remote_jobs)} Remote-Stellen rund um KI & ML.</p>'
                + "\n".join(job_card(j) for j in remote_jobs))
        (out / "remote.html").write_text(
            page(f"Remote KI-Jobs — {SITE_NAME}",
                 f"{len(remote_jobs)} aktuelle Remote-Jobs rund um KI und Machine Learning im DACH-Raum.",
                 body, BASE_URL + "/remote.html"), encoding="utf-8")

    # City hubs
    (out / "ort").mkdir(exist_ok=True)
    for c in cities:
        members = [j for j in jobs if city_of(j) == c]
        body = (f'<p><a href="/">← Alle Jobs</a></p><h1>KI-Jobs in {e(c)}</h1>'
                f'<p class="tag" style="color:var(--muted)">{len(members)} KI- & ML-Stellen in {e(c)}.</p>'
                + "\n".join(job_card(j) for j in members))
        (out / "ort" / f"{slug(c)}.html").write_text(
            page(f"KI-Jobs in {c} — {SITE_NAME}",
                 f"Aktuelle KI-, ML- und Data-Science-Jobs in {c}.", body,
                 BASE_URL + f"/ort/{slug(c)}.html"), encoding="utf-8")

    (out / "filter.js").write_text(FILTER_JS, encoding="utf-8")

    # Legal pages (operator: Alleng Chour, abannews.com / Belp CH)
    imp = """<p><a href="/">← Startseite</a></p><h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>KI-Jobs Radar</strong><br>Alleng Chour<br>Hühnerhubelstrasse 37<br>3123 Belp<br>Schweiz</p>
<h2>Kontakt</h2><p>E-Mail: <a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Haftung & Quellen</h2><p>Stellenanzeigen werden automatisiert von öffentlichen Quellen (arbeitnow.com)
aggregiert und verlinken zur Originalanzeige. Für deren Inhalte ist der jeweilige Arbeitgeber/die Quelle
verantwortlich; Angaben ohne Gewähr.</p>
<h2>Kennzeichnung</h2><p>Als „Anzeige"/„Gesponsert" markierte Stellen sind bezahlte Platzierungen.</p>"""
    (out / "impressum.html").write_text(
        page(f"Impressum — {SITE_NAME}", "Impressum.", imp, BASE_URL + "/impressum.html"), encoding="utf-8")
    dat = f"""<p><a href="/">← Startseite</a></p><h1>Datenschutzerklärung</h1>
<h2>Verantwortlicher</h2><p>Alleng Chour, Hühnerhubelstrasse 37, 3123 Belp, Schweiz ·
<a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Allgemeines</h2><p>Statische Website ohne Nutzerkonten, ohne Tracking, ohne Werbe-Cookies.
Nur technisch nötige Daten werden verarbeitet.</p>
<h2>Hosting</h2><p>Auslieferung über Cloudflare Pages (EU/SCC, AV-Vertrag nach Art. 28 DSGVO).</p>
<h2>Externe Links</h2><p>Stellen verlinken zu externen Quellen/Arbeitgebern mit eigener Datenverarbeitung.</p>
<h2>Deine Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch (Art. 15–21 DSGVO),
Beschwerderecht. Stand: {date.today().strftime('%m/%Y')}.</p>"""
    (out / "datenschutz.html").write_text(
        page(f"Datenschutz — {SITE_NAME}", "Datenschutzerklärung.", dat, BASE_URL + "/datenschutz.html"),
        encoding="utf-8")

    # sitemap + AI-friendly robots
    urls = ([BASE_URL + "/"] + [BASE_URL + f"/job/{job_slug(j)}.html" for j in jobs]
            + ([BASE_URL + "/remote.html"] if remote_jobs else [])
            + [BASE_URL + f"/ort/{slug(c)}.html" for c in cities])
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

    print(f"Built {1 + len(jobs)} pages ({len(jobs)} jobs) → {out}/")
    return 1 + len(jobs)


FILTER_JS = """// KI-Jobs Radar — client-side filter (no deps, no tracking)
(function(){
  var q=document.getElementById('q'),fr=document.getElementById('fr');
  if(!q)return;
  var cards=[].slice.call(document.querySelectorAll('article.card')),no=document.getElementById('nores');
  function run(){
    var t=q.value.trim().toLowerCase(),r=fr.value,n=0;
    cards.forEach(function(c){
      var ok=(!t||(c.dataset.s||'').indexOf(t)!==-1)&&(r===''||c.dataset.remote===r);
      c.style.display=ok?'':'none'; if(ok)n++;
    });
    if(no)no.hidden=n>0;
  }
  [q,fr].forEach(function(el){el.addEventListener('input',run);});
})();
"""


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here / "jobs.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.out), here)


if __name__ == "__main__":
    main()
