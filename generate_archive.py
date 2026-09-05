#!/usr/bin/env python3
"""Aban News — Archiv-Index-Generator.

Liest die echten Newsletter-Ausgaben in archive/*.html (von Aban selbst
geschrieben), extrahiert Titel, Datum und Teaser aus deren Meta-Tags und baut
daraus eine durchsuchbare Übersichtsseite (archive.html) + RSS-Feed (archive.rss).

ERFINDET NICHTS — nutzt nur, was schon in den Ausgaben steht. Jede Ausgabe ist
eine indexierbare Seite → bringt SEO-Traffic + zeigt neuen Lesern, dass es den
Newsletter wirklich gibt (Vertrauen).

Pure stdlib. Aufruf:  python generate_archive.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / "archive"
BASE = "https://abannews.com"

ACCENT, ACCENT_H, BG, BG_ALT = "#d97706", "#b45309", "#fffbf5", "#fef3c7"
TEXT, MUTED, BORDER = "#1f2937", "#6b7280", "#e5e7eb"


def meta(content: str, *names: str) -> str:
    for n in names:
        m = re.search(rf'<meta[^>]*(?:name|property)="{re.escape(n)}"[^>]*content="([^"]*)"', content, re.I)
        if not m:
            m = re.search(rf'<meta[^>]*content="([^"]*)"[^>]*(?:name|property)="{re.escape(n)}"', content, re.I)
        if m:
            return html.unescape(m.group(1)).strip()
    return ""


def read_issues():
    issues = []
    for f in sorted(ARCHIVE.glob("*.html")):
        s = f.read_text(encoding="utf-8", errors="ignore")
        title = ""
        mt = re.search(r"<title>(.*?)</title>", s, re.S | re.I)
        if mt:
            title = html.unescape(re.sub(r"\s*\|\s*aban news\s*$", "", mt.group(1)).strip())
        date = meta(s, "article:published_time") or ""
        if not date:
            md = re.match(r"\d{3}-(\d{4}-\d{2}-\d{2})", f.name)
            date = md.group(1) if md else ""
        num = (re.match(r"(\d{3})", f.name) or [None, ""])[1]
        desc = meta(s, "description")
        if len(desc) > 160:
            desc = desc[:157].rsplit(" ", 1)[0] + "…"
        issues.append({"file": f.name, "title": title or f.name,
                       "date": date, "num": num, "desc": desc})
    # neueste zuerst (nach Dateiname/Nummer absteigend)
    issues.sort(key=lambda x: x["num"], reverse=True)
    return issues


def build_index(issues):
    rows = []
    for it in issues:
        rows.append(f"""<article class="issue">
<a href="/archive/{html.escape(it['file'])}"><h2>{html.escape(it['title'])}</h2></a>
<p class="meta">Ausgabe {html.escape(it['num'])} · {html.escape(it['date'])}</p>
<p class="desc">{html.escape(it['desc'])}</p>
</article>""")
    body = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Archiv — alle Ausgaben | aban news</title>
<meta name="description" content="Alle bisherigen Ausgaben von aban news — dem deutschsprachigen KI-Newsletter. Ehrlich, kein Hype, zum Nachlesen.">
<link rel="canonical" href="{BASE}/archive.html">
<link rel="alternate" type="application/rss+xml" title="aban news" href="{BASE}/archive.rss">
<meta property="og:title" content="aban news — Archiv">
<meta property="og:description" content="Alle bisherigen Ausgaben zum Nachlesen.">
<meta property="og:image" content="{BASE}/og-archive.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{BASE}/og-archive.png">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_H};--bg:{BG};--bg-alt:{BG_ALT};--text:{TEXT};--muted:{MUTED};--border:{BORDER};}}
@media(prefers-color-scheme:dark){{:root{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;--muted:#a8a29e;--border:#3a332d;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}}
.wrap{{max-width:760px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:28px 0;text-align:center;}}
header h1{{margin:0;}} header a{{color:var(--accent-h);text-decoration:none;}}
header p{{color:var(--muted);margin:6px 0 0;}}
main{{padding:26px 0;}}
.search{{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 18px;background:#fff;}}
.issue{{border-bottom:1px solid var(--border);padding:14px 0;}}
.issue h2{{margin:0;font-size:1.15rem;}} .issue a{{text-decoration:none;color:var(--text);}}
.issue .meta{{color:var(--muted);font-size:.85rem;margin:2px 0;}}
.issue .desc{{color:var(--muted);margin:4px 0 0;font-size:.95rem;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;text-align:center;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="/"><h1>aban news — Archiv</h1></a>
<p>Alle {len(issues)} Ausgaben zum Nachlesen · Mo–Fr, kein Hype</p>
<p style="margin-top:14px;"><a class="cta" href="/dossiers.html">📚 Themen-Dossiers</a> <a class="cta" href="/gratis-ki-tools.html" style="margin-left:8px;">Kostenlos abonnieren →</a></p>
</div></header>
<main><div class="wrap">
<input id="q" class="search" type="search" placeholder="Ausgaben durchsuchen…" aria-label="Suche" oninput="abanFilter()">
<div id="list">
{"".join(rows)}
</div>
<section style="background:#fffaf2;border:2px solid #d97706;border-radius:14px;padding:1.2rem;margin:26px 0;text-align:center">
<strong style="display:block;font-size:1.08rem;margin-bottom:.55rem">Täglich solche Einordnungen — gratis per Mail</strong>
<form action="https://abannews.beehiiv.com/subscribe" method="get" style="display:flex;gap:.5rem;max-width:420px;margin:0 auto;flex-wrap:wrap;justify-content:center">
<input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="deine@mail.de" aria-label="E-Mail-Adresse" style="flex:1;min-width:190px;border:1px solid var(--border);border-radius:10px;padding:.72rem .9rem;font-size:1rem;background:#fff">
<button type="submit" style="background:var(--accent);color:#fff;border:0;border-radius:10px;padding:.72rem 1.15rem;font-weight:700;cursor:pointer;white-space:nowrap">Gratis abonnieren →</button>
</form>
<span style="display:block;font-size:.78rem;color:var(--muted);margin-top:.55rem">Mo–Fr · 5 Minuten · kein Spam · kein Tracking</span>
</section>
</div></main>
<footer><div class="wrap">
© <span id="y"></span> aban news · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/archive.rss">RSS</a>
</div></footer>
<script>
document.getElementById('y').textContent=new Date().getFullYear();
function abanFilter(){{var q=document.getElementById('q').value.toLowerCase();
document.querySelectorAll('.issue').forEach(function(a){{a.style.display=a.textContent.toLowerCase().indexOf(q)>-1?'':'none';}});}}
</script>
</body>
</html>"""
    (ROOT / "archive.html").write_text(body, encoding="utf-8")


def build_rss(issues):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    items = []
    for it in issues[:30]:
        link = f"{BASE}/archive/{it['file']}"
        items.append(f"<item><title>{html.escape(it['title'])}</title>"
                     f"<link>{link}</link><guid>{link}</guid>"
                     f"<description>{html.escape(it['desc'])}</description></item>")
    rss = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
           f"<title>aban news</title><link>{BASE}</link>"
           "<description>Der deutschsprachige KI-Newsletter — ehrlich, kein Hype.</description>"
           f"<language>de</language><lastBuildDate>{now}</lastBuildDate>"
           + "".join(items) + "</channel></rss>")
    (ROOT / "archive.rss").write_text(rss, encoding="utf-8")


def build_index_en(issues):
    """Englischsprachige Archiv-Übersicht (/en/archive.html). Verweist auf die
    (deutschen) Ausgabenseiten mit klarem '(in German)'-Hinweis — ehrlich, kein
    erfundener Inhalt. Englische Chrome + Abo-CTA für die /en/-Besucher."""
    rows = []
    for it in issues:
        rows.append(f"""<article class="issue">
<a href="/archive/{html.escape(it['file'])}"><h2>{html.escape(it['title'])}</h2></a>
<p class="meta">Issue {html.escape(it['num'])} · {html.escape(it['date'])} · <span class="lng">in German</span></p>
<p class="desc">{html.escape(it['desc'])}</p>
</article>""")
    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Archive — all issues | aban news</title>
<meta name="description" content="All past issues of aban news — the daily German AI newsletter. Honest, no hype. Issues are written in German.">
<link rel="canonical" href="{BASE}/en/archive.html">
<link rel="alternate" hreflang="de" href="{BASE}/archive/">
<link rel="alternate" hreflang="en" href="{BASE}/en/archive.html">
<link rel="alternate" hreflang="x-default" href="{BASE}/archive/">
<link rel="alternate" type="application/rss+xml" title="aban news" href="{BASE}/archive.rss">
<meta property="og:title" content="aban news — Archive">
<meta property="og:description" content="All past issues to read back (in German).">
<meta property="og:image" content="{BASE}/og-archive.png">
<meta property="og:type" content="website"><meta property="og:locale" content="en_US">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_H};--bg:{BG};--bg-alt:{BG_ALT};--text:{TEXT};--muted:{MUTED};--border:{BORDER};}}
@media(prefers-color-scheme:dark){{:root{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;--muted:#a8a29e;--border:#3a332d;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}}
.wrap{{max-width:760px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:28px 0;text-align:center;}}
header h1{{margin:0;}} header a{{color:var(--accent-h);text-decoration:none;}}
header p{{color:var(--muted);margin:6px 0 0;}}
main{{padding:26px 0;}}
.note{{background:var(--bg-alt);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--muted);font-size:.92rem;margin:0 0 18px;}}
.search{{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 18px;background:#fff;}}
.issue{{border-bottom:1px solid var(--border);padding:14px 0;}}
.issue h2{{margin:0;font-size:1.15rem;}} .issue a{{text-decoration:none;color:var(--text);}}
.issue .meta{{color:var(--muted);font-size:.85rem;margin:2px 0;}}
.lng{{background:var(--bg-alt);border:1px solid var(--border);border-radius:99px;padding:.02rem .45rem;font-size:.75rem;}}
.issue .desc{{color:var(--muted);margin:4px 0 0;font-size:.95rem;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;text-align:center;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="/en/"><h1>aban news — Archive</h1></a>
<p>All {len(issues)} issues to read back · Mon–Fri, no hype</p>
<p style="margin-top:14px;"><a class="cta" href="/en/dossiers.html">📚 Topic dossiers</a> <a class="cta" href="https://abannews.beehiiv.com/subscribe" style="margin-left:8px;">Subscribe free →</a></p>
</div></header>
<main><div class="wrap">
<p class="note">📝 The issues are written in <strong>German</strong> (aban news is a German-language newsletter). Opening one takes you to the original issue page.</p>
<input id="q" class="search" type="search" placeholder="Search issues…" aria-label="Search" oninput="abanFilter()">
<div id="list">
{"".join(rows)}
</div>
</div></main>
<footer><div class="wrap">
© <span id="y"></span> aban news · <a href="/impressum.html">Imprint</a> · <a href="/datenschutz.html">Privacy</a> · <a href="/archive/">Deutsch</a>
</div></footer>
<script>
document.getElementById('y').textContent=new Date().getFullYear();
function abanFilter(){{var q=document.getElementById('q').value.toLowerCase();
document.querySelectorAll('.issue').forEach(function(a){{a.style.display=a.textContent.toLowerCase().indexOf(q)>-1?'':'none';}});}}
</script>
</body>
</html>"""
    (ROOT / "en" / "archive.html").write_text(body, encoding="utf-8")


if __name__ == "__main__":
    issues = read_issues()
    build_index(issues)
    build_index_en(issues)
    build_rss(issues)
    print(f"Archiv gebaut: {len(issues)} Ausgaben → archive.html + en/archive.html + archive.rss")
