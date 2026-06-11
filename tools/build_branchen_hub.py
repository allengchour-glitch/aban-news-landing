#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Branchen-Hub-Generator.

Listet ALLE ki-fuer-*.html (root) auf einer einzigen crawlbaren Hub-Seite
(branchen.html) — der zentrale Indexierungs-Hebel: so erreicht Google jede
Branchenseite in 1 Klick von einer gut verlinkten Seite. Label = Titel-Teil
vor dem Gedankenstrich. Alphabetisch sortiert. Markentreue Inline-Shell.

  python3 tools/build_branchen_hub.py
"""
import os, re, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def label_of(path):
    s = open(path, encoding="utf-8", errors="ignore").read(4000)
    m = re.search(r"<title>(.*?)</title>", s, re.S)
    t = html.unescape(m.group(1)).strip() if m else os.path.basename(path)
    # vor dem ersten Gedankenstrich / Pipe abschneiden
    t = re.split(r"\s+[—–-]\s+|\s*\|\s*", t)[0].strip()
    t = re.sub(r"\s*\(20\d\d\)\s*$", "", t).strip()
    return t

def main():
    files = sorted(f for f in glob.glob("ki-fuer-*.html"))
    items = []
    for f in files:
        items.append((label_of(f), "/" + f))
    items.sort(key=lambda x: x[0].lower())
    n = len(items)

    cards = "\n".join(
        f'    <li><a href="{href}">{html.escape(lbl)}</a></li>'
        for lbl, href in items
    )

    page = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KI für deine Branche — alle {n} Branchen-Guides | aban news</title>
<meta name="description" content="KI praktisch erklärt für {n}+ Branchen — von Handwerk über Praxen bis Gastronomie und Tierberufe. Konkrete Anwendungsfälle, ehrliche Grenzen, kein Hype. Wähle deine Branche.">
<link rel="canonical" href="https://abannews.com/branchen.html">
<meta property="og:type" content="website">
<meta property="og:title" content="KI für deine Branche — alle Branchen-Guides">
<meta property="og:description" content="KI praktisch erklärt für über {n} Branchen. Konkrete Fälle, ehrliche Grenzen, kein Hype.">
<meta property="og:url" content="https://abannews.com/branchen.html">
<meta property="og:image" content="https://abannews.com/og-hype.png">
<meta name="twitter:card" content="summary">
<style>
  :root{{--amber-dk:#b45309;--accent:#d97706;--bg:#fffbf5;--field:#fffdf9;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4}}
  *{{box-sizing:border-box}}
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}}
  a{{color:var(--amber-dk)}}
  header{{border-bottom:1px solid var(--line);background:#fff}}
  header .wrap{{max-width:1040px;margin:0 auto;display:flex;align-items:center;gap:1rem;padding:14px 20px}}
  .brand{{display:flex;align-items:center;gap:.5rem;font-weight:800;text-decoration:none;color:var(--ink)}}
  .brand .dot{{width:10px;height:10px;border-radius:50%;background:var(--accent);display:inline-block}}
  .hnav{{margin-left:auto;display:flex;align-items:center;gap:1.1rem;font-size:.92rem;flex-wrap:wrap}}
  .hnav a{{color:var(--muted);text-decoration:none}}
  .btn{{background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:600;padding:8px 15px;border-radius:8px;font-size:.9rem}}
  main{{max-width:1040px;margin:0 auto;padding:0 20px}}
  h1{{font-size:2rem;line-height:1.2;margin:34px 0 10px}}
  .lead{{font-size:1.12rem;color:var(--ink2);max-width:70ch}}
  .note{{background:var(--field);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;padding:14px 16px;margin:22px 0;color:var(--ink2);font-size:.96rem}}
  .filter{{width:100%;max-width:420px;font-size:1rem;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--field);margin:8px 0 18px}}
  ul.cols{{list-style:none;padding:0;margin:0;columns:3;column-gap:26px}}
  ul.cols li{{break-inside:avoid;margin:0 0 8px}}
  ul.cols a{{text-decoration:none;font-size:.95rem}}
  ul.cols a:hover{{text-decoration:underline}}
  @media(max-width:880px){{ul.cols{{columns:2}}}}
  @media(max-width:560px){{ul.cols{{columns:1}}}}
  .cta{{background:var(--field);border:1px solid var(--line);border-radius:14px;padding:20px;margin:34px 0;text-align:center}}
  footer{{border-top:1px solid var(--line);margin-top:40px;background:#fff}}
  footer .wrap{{max-width:1040px;margin:0 auto;padding:18px 20px;color:var(--muted);font-size:.88rem;display:flex;gap:14px;flex-wrap:wrap}}
  footer a{{color:var(--muted)}}
</style>
</head>
<body>
<header>
  <div class="wrap">
    <a href="/" class="brand"><span class="dot"></span> aban news</a>
    <nav class="hnav" aria-label="Navigation">
      <a href="/online-tools.html">Tools</a>
      <a href="/geld-und-ki.html">Geld &amp; KI</a>
      <a href="/founding.html">Premium</a>
      <a href="https://abannews.beehiiv.com/subscribe" class="btn" target="_blank" rel="noopener">Gratis abonnieren</a>
    </nav>
  </div>
</header>

<main id="main">
  <h1>KI für deine Branche</h1>
  <p class="lead">Konkrete KI-Anwendungsfälle für über {n} Branchen — von Handwerk über Praxen, Gastronomie und Kanzleien bis zu Tierberufen. Immer ehrlich: was KI dir abnimmt und wo ihre Grenzen sind. Kein Hype, kein Vorwissen nötig.</p>

  <input type="search" id="filter" class="filter" placeholder="Branche suchen … (z. B. Friseur, Praxis, Café)" aria-label="Branche filtern">

  <ul class="cols" id="list">
{cards}
  </ul>

  <div class="cta">
    <h2 style="margin-top:0">Deine Branche ist nicht dabei?</h2>
    <p style="margin:.4rem 0 1rem;color:var(--ink2)">Abonniere den Newsletter — ich zeige täglich, wo KI im Business wirklich hilft, quer durch alle Branchen. Gratis, ehrlich, in 5 Minuten.</p>
    <a href="https://abannews.beehiiv.com/subscribe" class="btn" target="_blank" rel="noopener">Gratis abonnieren →</a>
  </div>
</main>

<footer>
  <div class="wrap">
    <span>© 2026 aban news · Allen Chour · Belp (CH)</span>
    <a href="/online-tools.html">Tools</a>
    <a href="/geld-und-ki.html">Geld &amp; KI</a>
    <a href="/founding.html">Premium</a>
    <a href="/impressum.html">Impressum</a>
    <a href="/datenschutz.html">Datenschutz</a>
  </div>
</footer>
<script>
(function(){{
  var f=document.getElementById('filter'),items=[].slice.call(document.querySelectorAll('#list li'));
  f.addEventListener('input',function(){{
    var q=f.value.trim().toLowerCase();
    items.forEach(function(li){{li.style.display=li.textContent.toLowerCase().indexOf(q)>-1?'':'none';}});
  }});
}})();
</script>
<script defer src="/js/announce.js"></script>
</body>
</html>
"""
    open("branchen.html", "w", encoding="utf-8").write(page)
    print(f"branchen.html erzeugt mit {n} Branchen-Links.")

if __name__ == "__main__":
    main()
