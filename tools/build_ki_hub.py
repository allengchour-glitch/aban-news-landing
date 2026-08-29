#!/usr/bin/env python3
# =============================================================================
#  build_ki_hub.py — erzeugt ki-themen.html (Pillar-Übersicht aller KI-Hubs)
# -----------------------------------------------------------------------------
#  Bündelt ALLE ki-*.html-Themenseiten auf einer Übersicht (Pillar-Cluster-SEO):
#  bessere Crawl-Effizienz, jede KI-Seite ≤2 Klicks von der Startseite,
#  gebündelte Themen-Autorität. Liest H1 der Zielseiten, gruppiert alphabetisch.
#  Idempotent — läuft im Build (build-pages.sh) automatisch mit.
# =============================================================================
import re, glob, os, html, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "ki-themen.html")
SELF = "ki-themen.html"


def label(h):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.I | re.S)
    t = re.sub(r"<[^>]+>", "", m.group(1)) if m else ""
    t = re.sub(r"\s+", " ", t).strip()
    if not t:
        m = re.search(r"<title>(.*?)</title>", h, re.I | re.S)
        t = re.split(r"\s[—–|]\s", m.group(1))[0].strip() if m else ""
    # Der H1-Quelltext ist bereits escaped ("Anfragen &amp; Bewertungen"). Ohne
    # unescape hier macht html.escape() beim Ausgeben daraus "&amp;amp;" — im
    # Browser steht dann woertlich "&amp;" in der Linkbeschriftung.
    return html.unescape(t)


def main():
    items = []
    # ⚠️ Die Sammelregel ist der DATEINAME (`ki-*.html`). Zwei echte KI-Themenseiten
    # heissen anders und fehlten dadurch im Hub — sie hatten null eingehende Links
    # (gefunden mit tools/verwaiste_seiten.py). Wer eine KI-Seite ohne `ki-`-Praefix
    # anlegt, traegt sie hier ein.
    ZUSAETZLICH = ["kostenlose-ki-tools.html", "seedance-ki-video.html"]
    dateien = sorted(glob.glob(os.path.join(ROOT, "ki-*.html")))
    dateien += [os.path.join(ROOT, z) for z in ZUSAETZLICH if os.path.exists(os.path.join(ROOT, z))]
    for p in dateien:
        name = os.path.basename(p)
        if name == SELF:
            continue
        try:
            h = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I):
            continue
        lab = label(h)
        if lab:
            items.append((lab, name))
    items.sort(key=lambda x: x[0].lower())

    groups = {}
    for lab, name in items:
        k = lab[0].upper()
        if not k.isalpha():
            k = "#"
        groups.setdefault(k, []).append((lab, name))

    links_html = ""
    for k in sorted(groups):
        chips = "".join(
            f'<li><a href="/{html.escape(n)}">{html.escape(l)}</a></li>' for l, n in groups[k]
        )
        links_html += f'<section class="grp"><h2 id="g{k}">{k}</h2><ul class="chips">{chips}</ul></section>'

    n = len(items)
    faq = [
        ("Was finde ich in den KI-Themen?", f"Aktuell {n} kompakte, ehrliche KI-Ratgeber und Erklärungen — von Tool-Vergleichen über Datenschutz bis zu praktischen Anwendungen. Ohne Hype, auf den Punkt."),
        ("Kostet das etwas?", "Nein, alle KI-Themenseiten sind kostenlos und ohne Anmeldung lesbar."),
        ("Wie aktuell sind die Inhalte?", "Die Themen werden laufend ergänzt und gepflegt; diese Übersicht baut sich bei jeder Aktualisierung automatisch neu."),
    ]
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    faq_html = "".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in faq)
    az = "".join(f'<a href="#g{k}">{k}</a>' for k in sorted(groups))

    itemlist_ld = {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "name": "KI-Themen A–Z", "url": "https://abannews.com/ki-themen.html",
        "mainEntity": {"@type": "ItemList", "numberOfItems": n,
                       "itemListElement": [{"@type": "ListItem", "position": i + 1,
                                            "url": f"https://abannews.com/{name}", "name": lab}
                                           for i, (lab, name) in enumerate(items)]},
    }

    page = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KI-Themen A–Z — {n} ehrliche KI-Ratgeber im Überblick | aban</title>
<meta name="description" content="Alle KI-Ratgeber von abannews.com auf einen Blick: {n} ehrliche Erklärungen, Tool-Vergleiche und Praxis-Tipps rund um künstliche Intelligenz — ohne Hype, A–Z sortiert.">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="https://abannews.com/ki-themen.html">
<meta property="og:title" content="KI-Themen A–Z — {n} ehrliche KI-Ratgeber">
<meta property="og:description" content="Von Tool-Vergleichen bis Datenschutz: alle KI-Ratgeber gebündelt, ehrlich und ohne Hype.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://abannews.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{--amber:#d97706;--amber-dk:#b45309;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#e6e1d6;--bg:#fffdf9;--card:#fff}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}}
a{{color:var(--amber-dk);text-decoration:none}}
.top{{max-width:1000px;margin:0 auto;padding:14px 18px;display:flex;gap:10px;align-items:center;font-size:.85rem}}
.top .brand{{font-weight:900;color:var(--amber-dk);font-size:20px}}
.top .lnk{{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}}
.top .lnk a{{color:var(--ink2);font-weight:700;border:1px solid var(--line);border-radius:18px;padding:6px 11px}}
.hero{{max-width:1000px;margin:18px auto 0;padding:0 18px}}
.hero .inner{{border-radius:20px;background:radial-gradient(120% 140% at 88% 0%,#23304a,#1b2335 58%,#141a28);color:#eef2f8;padding:clamp(24px,4vw,38px) clamp(20px,3vw,32px)}}
.hero .badge{{display:inline-block;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:4px 12px;font-size:.8rem;font-weight:800;color:#7cc0ff;margin-bottom:12px}}
.hero h1{{font-size:clamp(1.7rem,5vw,2.6rem);font-weight:900;letter-spacing:-.02em;margin:0;color:#fff}}
.hero p{{color:#d7deea;max-width:680px;margin-top:10px}}
.az{{max-width:1000px;margin:14px auto 0;padding:0 18px;display:flex;flex-wrap:wrap;gap:6px}}
.az a{{background:var(--cream);border-radius:8px;padding:4px 10px;font-weight:800;font-size:.85rem}}
main{{max-width:1000px;margin:0 auto;padding:8px 18px 40px}}
.grp{{margin-top:22px}}
.grp h2{{font-size:1.2rem;border-bottom:2px solid var(--line);padding-bottom:5px;margin-bottom:12px}}
.chips{{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0}}
.chips li a{{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:7px 13px;font-size:.9rem;color:var(--ink2);font-weight:600}}
.chips li a:hover{{border-color:var(--amber);color:var(--amber-dk)}}
.faq{{max-width:1000px;margin:10px auto 0;padding:0 18px}}
.faq h2{{font-size:1.3rem;margin:18px 0 10px}}
details{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 16px;margin-bottom:10px}}
summary{{cursor:pointer;font-weight:700;padding:13px 0}}
details p{{color:var(--ink2);padding:0 0 14px}}
footer{{max-width:1000px;margin:0 auto;padding:18px;font-size:.82rem;color:var(--muted);text-align:center}}
</style>
</head>
<body>
<div class="top">
  <a class="brand" href="/">aban</a>
  <span class="lnk"><a href="/ki-studio.html">KI-Studio</a><a href="/ki-anleitungen.html">KI-Anleitungen</a><a href="/suchmaschine.html">Suche</a></span>
</div>
<div class="hero"><div class="inner">
  <span class="badge">🤖 {n} KI-Themen</span>
  <h1>KI-Themen A–Z</h1>
  <p>Alle KI-Ratgeber von abannews.com auf einen Blick: ehrliche Erklärungen, Tool-Vergleiche und Praxis-Tipps rund um künstliche Intelligenz — kompakt, aktuell und ohne Hype. Wähle ein Thema oder spring per A–Z direkt hin.</p>
</div></div>
<nav class="az" aria-label="Alphabet">{az}</nav>
<main>
{links_html}
</main>
<section class="faq">
  <h2>Häufige Fragen</h2>
  {faq_html}
</section>
<footer>aban news · {n} KI-Themen · <a href="/ki-studio.html">KI-Studio</a> · <a href="/kaufberater-schweiz.html">Kaufberater Schweiz</a> · <a href="/">Start</a> · <a href="/impressum.html">Impressum</a></footer>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(itemlist_ld, ensure_ascii=False)}</script>
</body>
</html>
"""
    open(OUT, "w", encoding="utf-8").write(page)
    print(f"✔ ki-themen.html erzeugt: {n} KI-Themen verlinkt")


if __name__ == "__main__":
    main()
