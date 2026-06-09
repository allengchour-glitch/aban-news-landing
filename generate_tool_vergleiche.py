#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_tool_vergleiche.py — programmatische „X vs Y"-Vergleichsseiten aus data/tools.json.

Für jedes Tool-Paar aus dem `alternatives`-Feld (dedupliziert, qualitätsgefiltert) entsteht
eine ehrliche Vergleichsseite vergleich/<a>-vs-<b>.html + ein Hub ki-tool-vergleich.html.
Quelle der Wertung = redaktioneller Worth-it-Score von aban news (kein bezahltes Ranking).
Reine stdlib. Aban-Voice: anti-hype, du-Form, keine erfundenen Zahlen.

Run:  python3 generate_tool_vergleiche.py
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "vergleich")


def e(s):
    return html.escape(str(s or ""), quote=True)


def load():
    d = json.load(open(os.path.join(ROOT, "data", "tools.json"), encoding="utf-8"))
    tools = d.get("tools") or [v for v in d.values() if isinstance(v, list)][0]
    return {t["id"]: t for t in tools}, tools


def pairs(by, tools):
    seen = set()
    for t in tools:
        for alt in (t.get("alternatives") or []):
            if alt in by:
                a, b = sorted([t["id"], alt])
                if (a, b) in seen:
                    continue
                seen.add((a, b))
    out = []
    for a, b in seen:
        A, B = by[a], by[b]
        if A.get("worth_it_score") and B.get("worth_it_score") and (
            max(A.get("dach_relevance", 0), B.get("dach_relevance", 0)) >= 6
            or max(A["worth_it_score"], B["worth_it_score"]) >= 7.5
        ):
            out.append((a, b))
    return sorted(out)


def price(t):
    p = t.get("pricing") or {}
    if p.get("free_tier") and not p.get("paid_from_eur"):
        return "gratis"
    if p.get("free_tier"):
        return f"Free-Tier · ab {p['paid_from_eur']} €"
    if p.get("paid_from_eur"):
        return f"ab {p['paid_from_eur']} €"
    return p.get("model") or "—"


def verdict(A, B):
    sa, sb = A.get("worth_it_score", 0), B.get("worth_it_score", 0)
    if abs(sa - sb) < 0.5:
        win = None
    else:
        win = A if sa > sb else B
    if win:
        v = f"Fürs Gros: <b>{e(win['name'])}</b> (Worth-it {win['worth_it_score']} vs. {min(sa,sb)})."
    else:
        v = f"Kopf-an-Kopf (Worth-it {sa} vs. {sb}) — es kommt auf den Anwendungsfall an."
    da, db = A.get("dach_relevance", 0), B.get("dach_relevance", 0)
    if abs(da - db) >= 2:
        strong = A if da > db else B
        v += f" Für DACH/DSGVO meist die bessere Wahl: {e(strong['name'])}."
    return v


CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff;--ok:#15803d;--okbg:#ecfdf3}
@media(prefers-color-scheme:dark){:root{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19;--okbg:#1c2a1e}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:880px;margin:0 auto;padding:0 20px}
a{color:var(--amber-dk)}
header.site{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber);text-decoration:none}
.btn{display:inline-block;background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:9px;font-size:.95rem}
.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.hero{padding:38px 0 6px;text-align:center}
.hero h1{font-size:clamp(23px,4.4vw,33px);font-weight:800;letter-spacing:-.02em;line-height:1.14;margin-bottom:10px}
.hero h1 .a{color:var(--amber)}
.hero p{color:var(--ink2);max-width:600px;margin:0 auto}
.verdict{margin:22px 0;background:var(--okbg);border:1px solid var(--amber-lt);border-radius:12px;padding:14px 16px;color:var(--ink2)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}
@media(max-width:560px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.col h2{font-size:1.2rem;margin-bottom:2px}.col .v{color:var(--muted);font-size:.84rem;margin-bottom:10px}
.row{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding:7px 0;font-size:.92rem}
.row span:first-child{color:var(--muted)}.row b{color:var(--ink)}
.note{color:var(--ink2);font-size:.92rem;margin:10px 0}
.col .go{display:inline-block;margin-top:8px;font-weight:700;font-size:.9rem}
.disc{color:var(--muted);font-size:.82rem;margin:14px 0;text-align:center}
.band{margin:28px 0;background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:22px;text-align:center}
.band h2{font-size:1.15rem;margin-bottom:8px}.band p{color:var(--ink2);max-width:560px;margin:0 auto 12px}
.more{margin:20px 0;font-size:.9rem;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}
.hubgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}
@media(max-width:560px){.hubgrid{grid-template-columns:1fr}}
.hubgrid a{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 13px;text-decoration:none;color:var(--ink);font-size:.92rem;font-weight:600}
.hubgrid a:hover{border-color:var(--amber)}"""


def col(t):
    rows = [
        ("Worth-it-Score", f"{t.get('worth_it_score','–')}/10"),
        ("Preis", price(t)),
        ("DACH-Relevanz", f"{t.get('dach_relevance','–')}/10"),
        ("Kategorie", ", ".join(t.get("category") or [])[:60] or "—"),
    ]
    rh = "".join(f'<div class="row"><span>{e(k)}</span><b>{e(v)}</b></div>' for k, v in rows)
    ds = f'<p class="note">🔒 {e(t["dsgvo_note"])}</p>' if t.get("dsgvo_note") else ""
    an = f'<p class="note">{e(t["aban_note"])}</p>' if t.get("aban_note") else ""
    return (f'<div class="col"><h2>{e(t["name"])}</h2><div class="v">{e(t.get("vendor",""))}</div>'
            f'{rh}{an}{ds}<a class="go" href="{e(t.get("url","#"))}" target="_blank" rel="noopener">Zum Tool →</a></div>')


def page(A, B):
    title = f"{A['name']} vs {B['name']}"
    slug = f"{A['id']}-vs-{B['id']}"
    desc = f"{A['name']} oder {B['name']}? Ehrlicher Vergleich für DACH — Worth-it-Score, Preis, DSGVO und klares Urteil. Kein Affiliate-Hype."
    return f"""<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)} — ehrlicher Vergleich (DACH) | aban news</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/vergleich/{slug}.html">
<meta property="og:title" content="{e(title)} — ehrlicher Vergleich"><meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="https://abannews.com/vergleich/{slug}.html">
<meta property="og:image" content="https://abannews.com/og-tools.png"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>{CSS}</style>
</head><body>
<header class="site"><div class="wrap"><a href="/" class="brand">aban news</a>
<a href="/welche-ki-fuer-was.html" class="btn ghost">Tool-Finder</a></div></header>
<main><div class="wrap">
  <section class="hero">
    <h1><span class="a">{e(A['name'])}</span> vs {e(B['name'])}</h1>
    <p>Ehrlicher Vergleich für DACH — Worth-it-Score, Preis, DSGVO. Kein Affiliate-Hype, redaktionelle Einschätzung von aban news.</p>
  </section>
  <div class="verdict">⚖️ {verdict(A,B)}</div>
  <div class="cols">{col(A)}{col(B)}</div>
  <p class="disc">Worth-it-Score = ehrliche Redaktions-Einschätzung (0–10), kein bezahltes Ranking. Preise/Funktionen ändern sich — prüf beim Anbieter.</p>
  <div class="band">
    <h2>Unsicher, was zu dir passt?</h2>
    <p>Der <a href="/welche-ki-fuer-was.html">Tool-Finder</a> filtert 175 Tools nach Aufgabe, Budget &amp; DSGVO. Und der Newsletter testet Mo–Fr ehrlich — ohne Hype.</p>
    <a class="btn" href="https://abannews.beehiiv.com/subscribe">Newsletter gratis abonnieren</a>
  </div>
  <p class="more"><a href="/ki-tool-vergleich.html">← Alle Tool-Vergleiche</a></p>
</div></main>
<footer><div class="wrap">&copy; 2026 aban news &middot; <a href="/welche-ki-fuer-was.html">Tool-Finder</a> &middot; <a href="/ki-werkzeug.html">KI-Werkzeug</a> &middot; <a href="/impressum.html">Impressum</a></div></footer>
<script defer src="/js/announce.js"></script>
</body></html>"""


def hub(items, by):
    links = "".join(
        f'<a href="/vergleich/{a}-vs-{b}.html">{e(by[a]["name"])} vs {e(by[b]["name"])}</a>'
        for a, b in items)
    return f"""<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KI-Tool-Vergleiche — {len(items)} ehrliche Duelle (DACH) | aban news</title>
<meta name="description" content="{len(items)} ehrliche KI-Tool-Vergleiche für DACH: Worth-it-Score, Preis, DSGVO und klares Urteil. Kein Affiliate-Hype.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/ki-tool-vergleich.html">
<meta property="og:title" content="KI-Tool-Vergleiche — ehrliche Duelle"><meta property="og:description" content="{len(items)} Vergleiche, ehrlich bewertet. Kein Hype.">
<meta property="og:type" content="website"><meta property="og:url" content="https://abannews.com/ki-tool-vergleich.html">
<meta property="og:image" content="https://abannews.com/og-tools.png"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>{CSS}</style>
</head><body>
<header class="site"><div class="wrap"><a href="/" class="brand">aban news</a>
<a href="/welche-ki-fuer-was.html" class="btn ghost">Tool-Finder</a></div></header>
<main><div class="wrap">
  <section class="hero">
    <h1><span class="a">KI-Tool-Vergleiche</span></h1>
    <p>{len(items)} ehrliche Duelle für DACH — Worth-it-Score, Preis, DSGVO, klares Urteil. Such dein Paar:</p>
  </section>
  <div class="hubgrid">{links}</div>
  <div class="band">
    <h2>Lieber nach Aufgabe filtern?</h2>
    <p>Der <a href="/welche-ki-fuer-was.html">Tool-Finder</a> zeigt dir aus 175 Tools die passenden — nach Aufgabe, Budget &amp; DSGVO.</p>
    <a class="btn" href="/welche-ki-fuer-was.html">Zum Tool-Finder →</a>
  </div>
</div></main>
<footer><div class="wrap">&copy; 2026 aban news &middot; <a href="/welche-ki-fuer-was.html">Tool-Finder</a> &middot; <a href="/ki-werkzeug.html">KI-Werkzeug</a> &middot; <a href="/impressum.html">Impressum</a></div></footer>
<script defer src="/js/announce.js"></script>
</body></html>"""


def main():
    by, tools = load()
    items = pairs(by, tools)
    os.makedirs(OUT, exist_ok=True)
    for a, b in items:
        open(os.path.join(OUT, f"{a}-vs-{b}.html"), "w", encoding="utf-8").write(page(by[a], by[b]))
    open(os.path.join(ROOT, "ki-tool-vergleich.html"), "w", encoding="utf-8").write(hub(items, by))
    print(f"✓ {len(items)} Vergleichsseiten + Hub erzeugt")
    # Sitemap-Fragment für Copy/Verify
    with open(os.path.join(OUT, "_sitemap-fragment.txt"), "w", encoding="utf-8") as f:
        for a, b in items:
            f.write(f'  <url><loc>https://abannews.com/vergleich/{a}-vs-{b}.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n')


if __name__ == "__main__":
    main()
