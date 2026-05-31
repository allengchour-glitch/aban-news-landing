#!/usr/bin/env python3
"""Baut archive.html als attraktive News-Magazin-Übersicht aller Newsletter-Ausgaben.

Statt einer drögen Liste: ein Magazin-Layout (wie eine News-Startseite) mit Hero-Bild,
Schlagzeile, Datum, Kategorie-Badge und Teaser pro Ausgabe — gespeist aus den Dateien in
archive/. Seriös, kein Boulevard: keine Clickbait-Schlagzeilen, echte Titel/Teaser aus den
Ausgaben. Self-contained Seite im Site-Look (eigenes Inline-CSS).

    python3 automation/build_news_magazine.py            # schreibt archive.html
    python3 automation/build_news_magazine.py --check     # CI: Exit 1 bei Drift

Quelle: archive/NNN-YYYY-MM-DD-slug.html (Titel + description + Hero img/issues/NNN.svg).
"""
import argparse
import glob
import html
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
OUT = ROOT / "archive.html"

# Kategorie aus Slug/Titel ableiten (seriös, faktisch — kein Clickbait)
CAT_RULES = [
    (r"werkzeugkasten|tool|getestet|selbsttest", "Tool-Test"),
    (r"dsgvo|eu ai|ai act|datenschutz|regul", "Regulierung"),
    (r"claude|gpt|gemini|mistral|sonnet|opus|aleph|modell", "Modelle"),
    (r"automat|agent|workflow|no-code", "Automatisierung"),
    (r"preis|kosten|markt|china|business", "Markt"),
]


def esc(s):
    return html.escape(str(s or ""), quote=True)


def category(slug, title):
    t = (slug + " " + title).lower()
    for pat, cat in CAT_RULES:
        if re.search(pat, t):
            return cat
    return "KI-News"


def headline(title):
    return re.sub(r"^Ausgabe\s+\d+\s*[—–-]\s*", "", title).strip()


def de_date(iso):
    y, m, d = iso.split("-")
    months = ["", "Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."]
    return f"{int(d)}. {months[int(m)]} {y}"


def collect():
    issues = []
    for f in sorted(glob.glob(str(ARCHIVE / "[0-9]*.html"))):
        s = open(f, encoding="utf-8").read()
        base = os.path.basename(f)
        m = re.match(r"(\d+)-(\d{4}-\d{2}-\d{2})-(.+)\.html", base)
        if not m:
            continue
        num, date, slug = m.groups()
        tm = re.search(r"<title>(.*?)</title>", s, re.S)
        title = html.unescape(tm.group(1).split("|")[0]).strip() if tm else f"Ausgabe {num}"
        dm = re.search(r'<meta name="description" content="(.*?)"', s, re.S)
        desc = html.unescape(dm.group(1)).strip() if dm else ""
        hero = ""
        if (ROOT / f"img/issues/{num}.svg").exists():
            hero = f"/img/issues/{num}.svg"
        elif (ROOT / f"img/og/{num}.png").exists():
            hero = f"/img/og/{num}.png"
        issues.append({
            "num": num, "date": date, "slug": slug,
            "title": title, "headline": headline(title),
            "desc": desc, "hero": hero, "file": "/archive/" + base,
            "cat": category(slug, title),
        })
    # neueste zuerst
    issues.sort(key=lambda i: i["num"], reverse=True)
    return issues


def card(it, featured=False):
    teaser = it["desc"]
    if len(teaser) > (220 if featured else 130):
        teaser = teaser[: (220 if featured else 130)].rsplit(" ", 1)[0] + " …"
    img = (f'<img src="{esc(it["hero"])}" alt="" loading="lazy" decoding="async" '
           f'width="1200" height="420">') if it["hero"] else ""
    cls = "card feat" if featured else "card"
    return (
        f'<a class="{cls}" href="{esc(it["file"])}">'
        f'<div class="thumb">{img}</div>'
        f'<div class="body">'
        f'<div class="meta"><span class="cat">{esc(it["cat"])}</span>'
        f'<time datetime="{esc(it["date"])}">{esc(de_date(it["date"]))}</time></div>'
        f'<h3>{esc(it["headline"])}</h3>'
        f'<p>{esc(teaser)}</p>'
        f'</div></a>'
    )


def render(issues):
    n = len(issues)
    feat = card(issues[0], featured=True) if issues else ""
    rest = "\n        ".join(card(i) for i in issues[1:])
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>aban news — alle Ausgaben | KI-News für DACH, ehrlich kuratiert</title>
  <meta name="description" content="Alle Ausgaben von aban news auf einen Blick: die wichtigsten KI-News für den DACH-Raum, ehrlich eingeordnet — Modelle, Tools, Regulierung, Automatisierung. Kein Hype.">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://abannews.com/archive.html">

  <meta property="og:title" content="aban news — alle Ausgaben">
  <meta property="og:description" content="Die wichtigsten KI-News für DACH, ehrlich kuratiert. Modelle, Tools, Regulierung, Automatisierung — kein Hype.">
  <meta property="og:image" content="https://abannews.com/img/og/page-archive.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="aban news · alle Ausgaben">
  <meta property="og:url" content="https://abannews.com/archive.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="aban news">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="aban news — alle Ausgaben">
  <meta name="twitter:description" content="Die wichtigsten KI-News für DACH, ehrlich kuratiert. Kein Hype.">
  <meta name="twitter:image" content="https://abannews.com/img/og/page-archive.png">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="aban news" href="/archive.rss">

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "aban news — alle Ausgaben",
    "url": "https://abannews.com/archive.html",
    "description": "Alle Ausgaben von aban news: KI-News für den DACH-Raum, ehrlich kuratiert.",
    "publisher": {{ "@type": "Person", "name": "Aban (Allen Chour)", "url": "https://abannews.com/" }}
  }}
  </script>

  <style>
    :root{{--bg:#fafaf9;--card:#fff;--ink:#1c2530;--muted:#5b6772;--line:#e7e3dd;
      --amber:#d97706;--amber-dk:#b45309;--amber-lt:#fef3c7;--r:14px;
      --shadow:0 1px 3px rgba(40,30,20,.06),0 10px 28px rgba(40,30,20,.05)}}
    *{{box-sizing:border-box;margin:0}}
    body{{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);
      color:var(--ink);line-height:1.55;-webkit-text-size-adjust:100%}}
    a{{color:inherit;text-decoration:none}}
    .wrap{{max-width:1080px;margin:0 auto;padding:0 1.1rem}}
    .skip{{position:absolute;left:-999px}}.skip:focus{{left:1rem;top:1rem;background:#fff;padding:.5rem;z-index:10}}

    header.top{{background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:40}}
    header.top .wrap{{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1.1rem}}
    .brand{{display:flex;align-items:center;gap:.5rem;font-weight:800;font-size:1.05rem}}
    .brand .dot{{width:13px;height:13px;border-radius:4px;background:var(--amber)}}
    .top nav a{{margin-left:1rem;color:var(--muted);font-size:.9rem}}
    .top nav a:hover{{color:var(--ink)}}
    .top .cta{{background:var(--amber);color:#fff;padding:.45rem .9rem;border-radius:9px;font-weight:700;font-size:.88rem}}

    .masthead{{padding:2rem 0 1rem;text-align:center}}
    .masthead h1{{font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:-.02em}}
    .masthead p{{color:var(--muted);max-width:60ch;margin:.5rem auto 0}}
    .ticker{{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin-top:1rem}}
    .ticker span{{background:var(--amber-lt);color:var(--amber-dk);font-size:.78rem;font-weight:700;
      padding:.25rem .7rem;border-radius:999px}}

    .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;padding:1.5rem 0 2.5rem}}
    .card{{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);
      border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);transition:transform .15s,border-color .15s}}
    .card:hover{{transform:translateY(-3px);border-color:var(--amber)}}
    .card .thumb{{aspect-ratio:1200/420;background:var(--amber-lt);overflow:hidden}}
    .card .thumb img{{width:100%;height:100%;object-fit:cover;display:block}}
    .card .body{{padding:.9rem 1rem 1.1rem;display:flex;flex-direction:column;gap:.4rem}}
    .card .meta{{display:flex;align-items:center;gap:.6rem;font-size:.76rem;color:var(--muted)}}
    .card .cat{{background:var(--ink);color:#fff;padding:.12rem .55rem;border-radius:999px;font-weight:700;font-size:.72rem}}
    .card h3{{font-size:1.08rem;line-height:1.25}}
    .card p{{color:var(--muted);font-size:.9rem}}
    /* Featured (erste Ausgabe groß) */
    .card.feat{{grid-column:1 / -1;flex-direction:row}}
    .card.feat .thumb{{flex:0 0 55%;aspect-ratio:auto}}
    .card.feat .body{{justify-content:center;padding:1.6rem 1.8rem}}
    .card.feat h3{{font-size:1.7rem;line-height:1.15}}
    .card.feat p{{font-size:1rem}}

    .sub-cta{{background:var(--ink);color:#fff;border-radius:var(--r);padding:1.6rem;text-align:center;margin-bottom:2rem}}
    .sub-cta h2{{margin-bottom:.3rem}}
    .sub-cta p{{color:#cdd6df;margin-bottom:1rem}}
    .sub-cta form{{display:flex;gap:.5rem;max-width:420px;margin:0 auto;flex-wrap:wrap;justify-content:center}}
    .sub-cta input{{flex:1;min-width:200px;padding:.6rem .7rem;border:0;border-radius:9px;font-size:1rem}}
    .sub-cta button{{background:var(--amber);color:#fff;border:0;border-radius:9px;padding:.6rem 1.2rem;font-weight:700;cursor:pointer}}
    .sub-cta .small{{font-size:.78rem;color:#9aa6b2;margin-top:.6rem}}

    footer{{border-top:1px solid var(--line);background:var(--card)}}
    footer .wrap{{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;justify-content:center;padding:1.1rem;font-size:.83rem;color:var(--muted)}}

    @media(max-width:820px){{
      .grid{{grid-template-columns:1fr 1fr}}
      .card.feat{{flex-direction:column}}.card.feat .thumb{{flex:none;aspect-ratio:1200/420}}
      .card.feat h3{{font-size:1.3rem}}
    }}
    @media(max-width:520px){{.grid{{grid-template-columns:1fr}}.top nav{{display:none}}}}
  </style>
</head>
<body>
<a href="#main" class="skip">Zum Hauptinhalt springen</a>

<header class="top">
  <div class="wrap">
    <a href="/" class="brand"><span class="dot" aria-hidden="true"></span> aban news</a>
    <nav aria-label="Navigation">
      <a href="/tools.html">Tools</a>
      <a href="/netzwerk.html">Netzwerk</a>
      <a href="/#signup" class="cta">Abonnieren</a>
    </nav>
  </div>
</header>

<main id="main">
  <div class="wrap">
    <div class="masthead">
      <h1>Alle Ausgaben</h1>
      <p>Die wichtigsten KI-Entwicklungen für den DACH-Raum — ehrlich eingeordnet, kein Hype. {n} Ausgaben, Mo–Fr neu.</p>
      <div class="ticker">
        <span>🤖 Modelle</span><span>🧰 Tool-Tests</span><span>⚖️ Regulierung</span><span>⚙️ Automatisierung</span><span>📊 Markt</span>
      </div>
    </div>

    <div class="grid">
        {feat}
        {rest}
    </div>

    <div class="sub-cta">
      <h2>Keine Ausgabe verpassen</h2>
      <p>Jeden Morgen (Mo–Fr) die wichtigsten KI-News in 5 Minuten. Gratis, kein Hype.</p>
      <form action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>
        <input type="email" name="email" placeholder="deine@mail.de" required autocomplete="email" inputmode="email" aria-label="E-Mail-Adresse">
        <button type="submit">Gratis abonnieren →</button>
      </form>
      <p class="small">1-Klick-Abmeldung · kein Spam · kein Tracking</p>
    </div>
  </div>
</main>

<footer>
  <div class="wrap">
    <span>© 2026 aban news · Geschrieben in der Schweiz, gelesen im DACH-Raum</span>
    <a href="/">Startseite</a>
    <a href="/tools.html">Tools</a>
    <a href="/archive.rss">RSS</a>
    <a href="/impressum.html">Impressum</a>
    <a href="/datenschutz.html">Datenschutz</a>
  </div>
</footer>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    issues = collect()
    if not issues:
        raise SystemExit("Keine Ausgaben in archive/ gefunden.")
    out = render(issues)
    if args.check:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if cur != out:
            print("::error::archive.html nicht synchron — build_news_magazine.py ausführen.")
            return 1
        print(f"archive.html synchron ({len(issues)} Ausgaben).")
        return 0
    OUT.write_text(out, encoding="utf-8")
    print(f"archive.html neu gebaut: {len(issues)} Ausgaben als Magazin-Layout.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
