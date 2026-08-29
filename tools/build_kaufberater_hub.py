#!/usr/bin/env python3
# =============================================================================
#  build_kaufberater_hub.py — erzeugt kaufberater-schweiz.html (Pillar-Seite)
# -----------------------------------------------------------------------------
#  Bündelt ALLE *-kaufen-schweiz.html-Ratgeber auf einer Übersichtsseite
#  (Pillar-Cluster-SEO): bessere Crawl-Effizienz, jede Ratgeberseite ist ≤2
#  Klicks von der Startseite, gebündelte Themen-Autorität. Liest H1/Titel der
#  Zielseiten, gruppiert alphabetisch, schreibt eine saubere, schema-getaggte
#  Übersicht. Idempotent — läuft im Build (build-pages.sh) automatisch mit.
# =============================================================================
import re, glob, os, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "kaufberater-schweiz.html")


def label(h):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.I | re.S)
    t = m.group(1) if m else ""
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace(" in der Schweiz", "").strip()
    t = re.sub(r"\s+(kaufen|mieten|finden)$", "", t, flags=re.I).strip()
    # siehe build_ki_hub.py: escaped rein, escaped raus = doppelt escaped.
    return html.unescape(t)


def main():
    items = []
    for p in sorted(glob.glob(os.path.join(ROOT, "*-kaufen-schweiz.html"))):
        name = os.path.basename(p)
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

    # alphabetisch gruppieren
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
        ("Was sind die aban-Kaufberater?", f"Kurze, ehrliche Ratgeber zu aktuell {n} Produkten — was beim Kauf in der Schweiz zählt: Worauf achten, typische Fehler, häufige Fragen. Ohne Hype, mit Vergleichs-Suche zu echten Angeboten."),
        ("Kosten die Kaufberater etwas?", "Nein, alle Ratgeber sind kostenlos und ohne Anmeldung lesbar."),
        ("Woher kommen die Angebote auf den Seiten?", "Die Live-Angebote stammen aus echten Marktplatz-Quellen (z. B. eBay). Wir kennzeichnen Werbe-/Affiliate-Links transparent."),
    ]
    faq_ld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq],
    }
    import json
    faq_html = "".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in faq)

    itemlist_ld = {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "name": "Kaufberater Schweiz", "url": "https://abannews.com/kaufberater-schweiz.html",
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
<title>Kaufberater Schweiz — {n} ehrliche Ratgeber im Überblick | aban</title>
<meta name="description" content="Alle aban-Kaufberater für die Schweiz auf einen Blick: {n} ehrliche Ratgeber von Elektronik über Möbel bis Garten — worauf beim Kauf achten, plus Vergleichs-Suche zu echten Angeboten.">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="https://abannews.com/kaufberater-schweiz.html">
<meta property="og:title" content="Kaufberater Schweiz — {n} ehrliche Ratgeber im Überblick">
<meta property="og:description" content="Von Elektronik bis Garten: alle Schweizer Kaufberater gebündelt — ehrlich, ohne Hype, mit Vergleichs-Suche.">
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
.hero .inner{{border-radius:20px;background:radial-gradient(120% 140% at 88% 0%,#2a221a,#161310 60%,#0f0d0b);color:#f6efe2;padding:clamp(24px,4vw,38px) clamp(20px,3vw,32px)}}
.hero .badge{{display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:4px 12px;font-size:.8rem;font-weight:800;color:#f0a93a;margin-bottom:12px}}
.hero h1{{font-size:clamp(1.7rem,5vw,2.6rem);font-weight:900;letter-spacing:-.02em;margin:0;color:#fff}}
.hero p{{color:#e6dcc9;max-width:680px;margin-top:10px}}
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
  <span class="lnk"><a href="/marktplatz.html">Marktplatz</a><a href="/suchmaschine.html">Suche</a><a href="/angebote-suche.html">Angebote</a></span>
</div>
<div class="hero"><div class="inner">
  <span class="badge">📚 {n} Ratgeber · Schweiz</span>
  <h1>Kaufberater Schweiz</h1>
  <p>Von Elektronik über Möbel und Küche bis Garten, Auto und Baby: kompakte, ehrliche Kaufberater für die Schweiz — worauf du beim Kauf achten solltest, typische Fehler und häufige Fragen, jeweils mit Vergleichs-Suche zu echten Angeboten. Ohne Hype.</p>
</div></div>
<nav class="az" aria-label="Alphabet">{''.join(f'<a href="#g{k}">{k}</a>' for k in sorted(groups))}</nav>
<main>
{links_html}
</main>
<section class="faq">
  <h2>Häufige Fragen</h2>
  {faq_html}
</section>
<footer>aban news · {n} Kaufberater für die Schweiz · <a href="/ki-themen.html">KI-Themen A–Z</a> · <a href="/marktplatz.html">Marktplatz</a> · <a href="/">Start</a> · <a href="/impressum.html">Impressum</a></footer>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(itemlist_ld, ensure_ascii=False)}</script>
</body>
</html>
"""
    open(OUT, "w", encoding="utf-8").write(page)
    print(f"✔ kaufberater-schweiz.html erzeugt: {n} Kaufberater verlinkt")


if __name__ == "__main__":
    main()
