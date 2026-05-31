#!/usr/bin/env python3
"""Generiert SEO-Vergleichsseiten aus data/tools.json (echter Google-Traffic-Hebel).

Pro Kategorie eine Seite vergleich-<slug>.html mit den Top-Tools dieser Kategorie
(sortiert nach worth_it_score). Zusätzlich eine Seite vergleich-kostenlos.html mit
allen Tools, die einen Free-Tier haben.

Die Seiten existieren noch nicht — das Skript schreibt sie KOMPLETT im exakten
Site-Template (Head/Header/Footer wie tools.html / foerder.html). Der dynamisch
aus tools.json erzeugte Tool-Block steht zwischen idempotenten Markern
<!-- COMPARE:START --> / <!-- COMPARE:END -->, ebenso die beiden JSON-LD-Blöcke
(#compare-itemlist / #compare-faq). So ist alles regenerierbar.

    python3 automation/build_compare_pages.py            # schreibt alle vergleich-*.html
    python3 automation/build_compare_pages.py --check     # nur prüfen (CI), Exit 1 bei Drift

Exit: 0 = ok / in sync, 1 = Drift (nur --check) oder harter Fehler.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "data" / "tools.json"
SITEMAP = ROOT / "sitemap.xml"
TOP_N = 15

BLOCK_START = "<!-- COMPARE:START -->"
BLOCK_END = "<!-- COMPARE:END -->"

# Welche Kategorien bekommen eine Seite (die ~8 stärksten nach Tool-Anzahl) +
# Slug + SEO-Texte. "keyword" geht in Title/H1, "thema" in den Intro-Fließtext.
CATEGORIES = [
    {
        "cat": "Writing",
        "slug": "writing",
        "keyword": "Texte",
        "thema": "Texte schreiben, übersetzen und korrigieren",
    },
    {
        "cat": "Image-Gen",
        "slug": "image-gen",
        "keyword": "Bildgenerierung",
        "thema": "Bilder aus Text generieren",
    },
    {
        "cat": "Coding",
        "slug": "coding",
        "keyword": "Coding",
        "thema": "Programmieren mit KI-Unterstützung",
    },
    {
        "cat": "Video-Gen",
        "slug": "video-gen",
        "keyword": "Videogenerierung",
        "thema": "Videos mit KI erstellen und schneiden",
    },
    {
        "cat": "Productivity",
        "slug": "productivity",
        "keyword": "Produktivität",
        "thema": "den Arbeitsalltag mit KI organisieren",
    },
    {
        "cat": "Marketing-AI",
        "slug": "marketing-ai",
        "keyword": "Marketing",
        "thema": "Marketing, Leads und Kampagnen",
    },
    {
        "cat": "API",
        "slug": "api",
        "keyword": "APIs & Modell-Zugriff",
        "thema": "KI-Modelle per API einbinden",
    },
    {
        "cat": "AI-Chat",
        "slug": "ai-chat",
        "keyword": "Chat-Assistenten",
        "thema": "im Chat mit einem KI-Assistenten arbeiten",
    },
]


def esc(s):
    """Entspricht der esc()-Funktion in tools.html."""
    s = "" if s is None else str(s)
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def price_label(t):
    pricing = t.get("pricing") or {}
    if pricing.get("free_tier"):
        out = '<span class="badge badge-free">Free-Tier</span>'
    else:
        out = '<span class="badge badge-paid">Paid</span>'
    pfe = pricing.get("paid_from_eur")
    if pfe and pfe > 0:
        out += ' <span class="muted" style="font-size:.8rem">ab ' + str(pfe) + " €</span>"
    return out


def render_row(t):
    """Eine Tabellenzeile für die Vergleichstabelle."""
    tid = esc(t.get("id"))
    return (
        "<tr>"
        + '<td data-label="Tool"><a href="/tools.html#' + tid + '"><strong>'
        + esc(t.get("name")) + "</strong></a><span class=\"cmp-vendor\">"
        + esc(t.get("vendor")) + "</span></td>"
        + '<td data-label="Worth-it" class="cmp-num"><strong>'
        + str(t.get("worth_it_score") or 0) + "</strong>/10</td>"
        + '<td data-label="DACH" class="cmp-num">'
        + str(t.get("dach_relevance") or 0) + "/10</td>"
        + '<td data-label="Preis">' + price_label(t) + "</td>"
        + '<td data-label="aban-Notiz" class="cmp-note">' + esc(t.get("aban_note")) + "</td>"
        + "</tr>"
    )


def render_table(tools):
    rows = "\n".join(render_row(t) for t in tools)
    return (
        '<div class="cmp-table-wrap">\n'
        + '<table class="cmp-table">\n'
        + "<thead><tr>"
        + "<th>Tool</th><th>Worth-it</th><th>DACH</th><th>Preis</th><th>aban-Notiz</th>"
        + "</tr></thead>\n"
        + "<tbody>\n" + rows + "\n</tbody>\n"
        + "</table>\n"
        + "</div>"
    )


def jsonld_itemlist(page, tools):
    items = []
    for i, t in enumerate(tools):
        items.append({
            "@type": "ListItem",
            "position": i + 1,
            "name": t.get("name"),
            "url": "https://abannews.com/tools.html#" + str(t.get("id")),
        })
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": page["h1"],
        "description": page["meta_desc"],
        "url": "https://abannews.com/" + page["file"],
        "numberOfItems": len(tools),
        "itemListElement": items,
    }


def jsonld_faq(page, tools):
    top = tools[0]["name"] if tools else "—"
    free = [t for t in tools if (t.get("pricing") or {}).get("free_tier")]
    free_names = ", ".join(t["name"] for t in free[:3]) or "keine in dieser Auswahl"
    qa = [
        (
            "Welches KI-Tool für " + page["keyword"] + " lohnt sich 2026 am meisten?",
            "Nach unserem Worth-it-Score liegt aktuell " + top + " vorn. "
            "Der Score wägt Preis, Lernkurve und echten Mehrwert für Solos und "
            "kleine Teams ab — er ist subjektiv und basiert auf eigener Nutzung.",
        ),
        (
            "Gibt es kostenlose Tools für " + page["keyword"] + "?",
            "Ja. Tools mit Free-Tier in dieser Auswahl: " + free_names + ". "
            "Ein Free-Tier reicht oft zum Testen; für produktiven Einsatz lohnt "
            "sich meist der bezahlte Plan.",
        ),
        (
            "Sind diese Tools DSGVO-konform für DACH nutzbar?",
            "Das hängt vom Anbieter ab. Wir bewerten die DACH-Relevanz separat und "
            "notieren je Tool eine DSGVO-Einordnung. Prüfe vor produktivem Einsatz "
            "immer AVV, Datenstandort und ob ein Free-Tier deine Daten fürs Training "
            "verwendet.",
        ),
    ]
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in qa
        ],
    }


def build_block(page, tools):
    """Der regenerierbare Inhalt zwischen den Markern (Tabelle)."""
    return (
        BLOCK_START + "\n"
        + render_table(tools) + "\n"
        + BLOCK_END
    )


PAGE_STYLE = """  <style>
    .cmp-table-wrap{overflow-x:auto;margin:1.5rem 0;border:1px solid var(--c-border);border-radius:var(--r-lg)}
    .cmp-table{width:100%;border-collapse:collapse;font-size:.9rem;background:#fff;min-width:640px}
    .cmp-table th,.cmp-table td{text-align:left;padding:.7rem .8rem;border-bottom:1px solid var(--c-border);vertical-align:top}
    .cmp-table thead th{background:var(--c-bg-alt);color:var(--c-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;position:sticky;top:0}
    .cmp-table tbody tr:last-child td{border-bottom:none}
    .cmp-table a{color:var(--c-accent-hi);text-decoration:none;font-weight:600}
    .cmp-table a:hover{text-decoration:underline}
    .cmp-vendor{display:block;color:var(--c-muted);font-size:.78rem;font-weight:400;margin-top:.15rem}
    .cmp-num{white-space:nowrap}
    .cmp-num strong{color:var(--c-accent-hi);font-size:1rem}
    .cmp-note{color:var(--c-text-2);max-width:34ch;line-height:1.45}
    .badge{display:inline-block;padding:.1rem .5rem;border-radius:99px;font-size:.75rem;font-weight:600}
    .badge-free{background:#d1fae5;color:#065f46}
    .badge-paid{background:#fef3c7;color:#92400e}
    .cmp-faq details{border:1px solid var(--c-border);border-radius:var(--r);padding:.4rem .9rem;margin:.6rem 0;background:#fff}
    .cmp-faq summary{cursor:pointer;font-weight:600;padding:.4rem 0}
    .cmp-faq p{margin:.4rem 0 .6rem;color:var(--c-text-2)}
  </style>"""


def faq_html(page, tools):
    ld = jsonld_faq(page, tools)
    parts = ['<div class="cmp-faq">']
    for qa in ld["mainEntity"]:
        q = esc(qa["name"])
        a = esc(qa["acceptedAnswer"]["text"])
        parts.append("<details><summary>" + q + "</summary><p>" + a + "</p></details>")
    parts.append("</div>")
    return "\n".join(parts)


def render_page(page, tools):
    """Erzeugt die komplette HTML-Datei im Site-Template."""
    title = page["title"]
    desc = page["meta_desc"]
    h1 = page["h1"]
    url = "https://abannews.com/" + page["file"]
    n = len(tools)

    itemlist = json.dumps(jsonld_itemlist(page, tools), ensure_ascii=False, indent=2)
    faq_ld = json.dumps(jsonld_faq(page, tools), ensure_ascii=False, indent=2)
    block = build_block(page, tools)
    faq = faq_html(page, tools)

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="theme-color" content="#d97706">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{url}">

  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:image" content="https://abannews.com/og-image.png">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="aban news">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(h1)}">
  <meta name="twitter:description" content="{esc(desc)}">
  <meta name="twitter:image" content="https://abannews.com/og-image.png">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/conversion.css">
  <link rel="stylesheet" href="/css/modern.css">

{PAGE_STYLE}

  <script type="application/ld+json" id="compare-itemlist">
{itemlist}
  </script>
  <script type="application/ld+json" id="compare-faq">
{faq_ld}
  </script>
</head>
<body>

<a href="#main" class="skip">Zum Hauptinhalt springen</a>

<header class="site-header">
  <div class="wrap">
    <a href="/" class="brand" aria-label="aban news Startseite">
      <span aria-hidden="true">☕</span>
      <span>aban news</span>
    </a>
    <nav class="nav" aria-label="Hauptnavigation">
      <a href="/sponsoring.html">Werbung</a>
      <a href="/tools.html">Tools</a>
      <a href="/netzwerk.html">Netzwerk</a>
      <a href="/founding.html">Premium</a>
      <a href="/#signup" class="nav-cta">Abonnieren</a>
    </nav>
  </div>
</header>

<main id="main">

  <section class="hero">
    <div class="wrap">
      <span class="chip-status"><span class="pulse"></span> {n} Tools verglichen · DACH · ehrlich bewertet</span>
      <h1>{esc(h1)}</h1>
      <p class="lead">{esc(page["intro"])}</p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <h2>Die {n} Tools im Vergleich</h2>
      <p class="muted">Sortiert nach Worth-it-Score (lohnt sich's für einen Solo oder ein kleines Team?). Die Bewertung ist subjektiv und basiert auf eigener Nutzung plus Marktbeobachtung — kein Affiliate-Ranking. Klick auf einen Tool-Namen führt zum vollen Profil in der <a href="/tools.html">Tool-Database</a>.</p>
{block}
      <p class="muted" style="margin-top:1rem"><strong>Hinweis:</strong> Preise und Free-Tier-Bedingungen ändern sich häufig — der Stand ist 2026-05. Prüfe vor dem Kauf immer die Anbieter-Seite. Mehr Details, Alternativen und DSGVO-Notizen pro Tool findest du in der <a href="/tools.html">vollen Datenbank</a>.</p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <h2>Häufige Fragen</h2>
{faq}
    </div>
  </section>

  <section>
    <div class="wrap">
      <h2 class="center">Newsletter: jeden Werktag ein ehrlicher KI-Tipp</h2>
      <p class="center muted">Neue Tools, getestet aus DACH-Sicht — Mo–Fr morgens, 3–5 Minuten, kein Hype. Kostenlos.</p>
      <p class="center mt-5"><a href="/#signup" class="btn btn--lg">aban news abonnieren — gratis</a></p>
      <p class="center muted mt-5">Mehr aus dem aban-Netzwerk: <a href="/tools.html">Tool-Database</a> · <a href="/netzwerk.html">Netzwerk</a> · <a href="/deals.html">KI-Deals</a></p>
    </div>
  </section>

</main>

<div class="mobile-cta" aria-hidden="true">
  <a href="/#signup" class="btn">☕ Kostenlos abonnieren</a>
</div>

<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <p class="foot-h">aban news</p>
        <a href="/">Startseite</a>
        <a href="/preview.html">Probe-Ausgabe</a>
        <a href="/founding.html">Founding Member</a>
        <a href="/sponsoring.html">Werbung schalten</a>
      </div>
      <div>
        <p class="foot-h">Resourcen</p>
        <a href="/resources.html">Prompts + Templates</a>
        <a href="/tools.html">Tool-Database</a>
        <a href="/glossary.html">KI-Glossar</a>
        <a href="/archive.html">Archiv</a>
      </div>
      <div>
        <p class="foot-h">Mehr lesen</p>
        <a href="/about.html">Über Aban</a>
        <a href="/faq.html">FAQ</a>
        <a href="/roadmap.html">Roadmap</a>
        <a href="/press.html">Press-Kit</a>
      </div>
      <div>
        <p class="foot-h">aban-Netzwerk</p>
        <a href="/netzwerk.html">Alle Angebote</a>
        <a href="/deals.html">KI-Deals</a>
        <a href="/foerder.html">Förder-Radar</a>
        <a href="/jobs.html">KI-Jobs</a>
        <a href="/kurse.html">KI-Kurse</a>
      </div>
      <div>
        <p class="foot-h">Rechtliches</p>
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="mailto:hallo@abannews.com">hallo@abannews.com</a>
      </div>
    </div>
    <p class="foot-bottom">
      &copy; 2026 aban news · Geschrieben in der Schweiz, gelesen im DACH-Raum · <em>— Aban</em>
    </p>
  </div>
</footer>

<script src="/js/subscribe-prompt.js" defer></script>
<script src="/js/reveal.js" defer></script>
</body>
</html>
"""


def select_tools_for_category(tools, cat):
    sel = [t for t in tools if cat in (t.get("category") or [])]
    sel.sort(key=lambda t: -(t.get("worth_it_score") or 0))
    return sel[:TOP_N]


def select_free_tools(tools):
    sel = [t for t in tools if (t.get("pricing") or {}).get("free_tier")]
    sel.sort(key=lambda t: -(t.get("worth_it_score") or 0))
    return sel[:TOP_N]


def pages_spec(tools):
    """Liefert (page_meta, selected_tools) für jede zu erzeugende Seite."""
    out = []
    for c in CATEGORIES:
        sel = select_tools_for_category(tools, c["cat"])
        if not sel:
            continue
        n = len(sel)
        page = {
            "file": "vergleich-" + c["slug"] + ".html",
            "keyword": c["keyword"],
            "title": f"Beste KI-Tools für {c['keyword']} 2026 — {n} verglichen für DACH | aban news",
            "h1": f"Beste KI-Tools für {c['keyword']} 2026",
            "meta_desc": (
                f"{n} KI-Tools für {c['thema']}, ehrlich verglichen für DACH-Solos "
                f"und KMU: Worth-it-Score, DACH-Relevanz, Free vs. Paid. Ohne "
                f"Affiliate-Bias."
            ),
            "intro": (
                f"Welche KI-Tools für {c['keyword']} lohnen sich 2026 wirklich? "
                f"Hier {n} Optionen für {c['thema']}, sortiert nach unserem "
                f"Worth-it-Score und bewertet aus DACH-Sicht. Keine Affiliate-Links, "
                f"kein Sponsoring — nur eine ehrliche Einordnung, was Preis und "
                f"Aufwand bringen."
            ),
        }
        out.append((page, sel))

    # Sonderseite: kostenlose Tools
    free = select_free_tools(tools)
    if free:
        n = len(free)
        page = {
            "file": "vergleich-kostenlos.html",
            "keyword": "kostenlose KI-Tools",
            "title": f"Beste kostenlose KI-Tools 2026 — {n} mit Free-Tier für DACH | aban news",
            "h1": f"Beste kostenlose KI-Tools 2026",
            "meta_desc": (
                f"{n} KI-Tools mit echtem Free-Tier, ehrlich verglichen für "
                f"DACH-Solos und KMU: Worth-it-Score, DACH-Relevanz, ab wann sich "
                f"Paid lohnt. Ohne Affiliate-Bias."
            ),
            "intro": (
                f"Kostenlos heißt nicht gleich gut — aber diese {n} KI-Tools haben "
                f"einen Free-Tier, der wirklich etwas taugt. Sortiert nach "
                f"Worth-it-Score und bewertet aus DACH-Sicht. Wo der Gratis-Plan "
                f"endet und sich Paid lohnt, steht jeweils dabei. Keine "
                f"Affiliate-Links, kein Sponsoring."
            ),
        }
        out.append((page, free))
    return out


def update_sitemap(filenames):
    """Fügt die vergleich-*.html-Seiten in sitemap.xml ein (vor </urlset>)."""
    sm = SITEMAP.read_text(encoding="utf-8")
    existing = set(re.findall(r"<loc>https://abannews\.com/([^<]+)</loc>", sm))
    entries = []
    for fn in filenames:
        if fn in existing:
            continue
        entries.append(
            "  <url>\n"
            f"    <loc>https://abannews.com/{fn}</loc>\n"
            "    <lastmod>2026-05-31</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.7</priority>\n"
            "  </url>\n"
        )
    if not entries:
        return sm
    return sm.replace("</urlset>", "".join(entries) + "</urlset>")


def main():
    ap = argparse.ArgumentParser(description="SEO-Vergleichsseiten aus data/tools.json bauen.")
    ap.add_argument("--check", action="store_true", help="Nur prüfen, Exit 1 bei Drift.")
    args = ap.parse_args()

    data = json.loads(TOOLS.read_text(encoding="utf-8"))
    tools = data.get("tools") if isinstance(data, dict) else data
    if not tools:
        raise SystemExit("FEHLER: keine Tools in data/tools.json.")

    specs = pages_spec(tools)
    drift = []
    written = []

    for page, sel in specs:
        path = ROOT / page["file"]
        new_html = render_page(page, sel)
        old_html = path.read_text(encoding="utf-8") if path.exists() else None
        if old_html != new_html:
            if args.check:
                drift.append(page["file"])
            else:
                path.write_text(new_html, encoding="utf-8")
                written.append((page["file"], len(sel)))

    # Sitemap
    filenames = [p["file"] for p, _ in specs]
    new_sm = update_sitemap(filenames)
    old_sm = SITEMAP.read_text(encoding="utf-8")
    sm_changed = new_sm != old_sm
    if sm_changed:
        if args.check:
            drift.append("sitemap.xml")
        else:
            SITEMAP.write_text(new_sm, encoding="utf-8")

    if args.check:
        if drift:
            print("::error::Vergleichsseiten nicht synchron mit data/tools.json. "
                  "Bitte `python3 automation/build_compare_pages.py` ausführen und committen.")
            for d in drift:
                print("   - Drift:", d)
            return 1
        print(f"Vergleichsseiten synchron ({len(specs)} Seiten, {len(tools)} Tools gesamt).")
        return 0

    print(f"Vergleichsseiten gebaut ({len(specs)} Seiten von {len(tools)} Tools):")
    for fn, n in written:
        print(f"   - {fn} ({n} Tools)")
    if not written:
        print("   (alle bereits synchron)")
    if sm_changed:
        print("sitemap.xml aktualisiert.")
    else:
        print("sitemap.xml bereits aktuell.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
