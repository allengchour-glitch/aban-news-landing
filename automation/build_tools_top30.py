#!/usr/bin/env python3
"""Bäckt die Top-30-Tools statisch in tools.html (SEO + Speed).

Warum: tools.html rendert alle Tool-Karten erst client-seitig per fetch(tools.json).
Crawler und No-JS-Nutzer sehen im Quelltext keinen Tool-Inhalt. Dieses Skript
liest data/tools.json, sortiert nach worth_it_score (stabil, wie das JS-Default)
und schreibt die 30 besten Karten als echtes HTML zwischen die Marker
<!-- TOP30:START --> / <!-- TOP30:END --> im #tools-grid. Zusätzlich wird der
statische JSON-LD-ItemList-Block (#tools-jsonld) mit denselben Top-30 befüllt.

Die HTML-Karten sind 1:1 zur JS-Funktion renderTool() — so übernimmt das JS beim
Laden nahtlos (Progressive Enhancement), und der Rest wird per "Mehr laden"
lazy nachgeladen.

    python3 automation/build_tools_top30.py            # schreibt tools.html
    python3 automation/build_tools_top30.py --check     # nur prüfen (CI), Exit 1 bei Drift

Exit: 0 = ok / in sync, 1 = Drift (nur --check) oder harter Fehler.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "data" / "tools.json"
PAGE = ROOT / "tools.html"
TOP_N = 30

CARDS_START = "<!-- TOP30:START -->"
CARDS_END = "<!-- TOP30:END -->"


def esc(s):
    """Entspricht der esc()-Funktion in tools.html."""
    s = "" if s is None else str(s)
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def stars(score, max_=10):
    """Entspricht stars() in tools.html (Math.round, dann 5 Zeichen)."""
    full = int(score + 0.5)  # Math.round (half up)
    chars = "".join("★" if i <= full else "☆" for i in range(1, max_ + 1))
    label = ("%g" % score)
    return ('<span class="stars" aria-label="' + label + ' von ' + str(max_) + '">'
            + chars[:5] + "</span>")


def render_card(t):
    """1:1-Port von renderTool() aus tools.html."""
    tid = esc(t.get("id"))
    pricing = t.get("pricing") or {}
    if pricing.get("free_tier"):
        price = '<span class="badge badge-free">Free-Tier</span>'
    else:
        price = '<span class="badge badge-paid">Paid</span>'
    pfe = pricing.get("paid_from_eur")
    if pfe and pfe > 0:
        price += ' <span class="muted" style="font-size:.8rem">ab ' + str(pfe) + " €</span>"

    cats = "".join("<span>" + esc(c) + "</span>" for c in (t.get("category") or []))
    dach = t.get("dach_relevance") or 0
    score = t.get("worth_it_score") or 0
    mentions = "".join(
        '<a href="/archive/" title="Ausgabe ' + esc(m) + '">#' + esc(m) + "</a>"
        for m in (t.get("ausgaben_mentions") or [])
    )
    alts = ", ".join('<a href="#' + esc(a) + '">' + esc(a) + "</a>"
                     for a in (t.get("alternatives") or []))
    uses = ", ".join(esc(u) for u in (t.get("use_cases") or []))

    more = ""
    if uses:
        more += "<h4>Use-Cases</h4><p>" + uses + "</p>"
    if mentions:
        more += '<h4>Newsletter-Erwähnungen</h4><p class="ausgaben-mentions">' + mentions + "</p>"
    if alts:
        more += "<h4>Alternativen</h4><p>" + alts + "</p>"
    if t.get("dsgvo_note"):
        more += "<h4>DSGVO-Notiz</h4><p>" + esc(t["dsgvo_note"]) + "</p>"

    return (
        '<article class="tool-card" id="' + tid + '">'
        + "<h3>" + esc(t.get("name")) + "</h3>"
        + '<div class="vendor">von ' + esc(t.get("vendor")) + "</div>"
        + "<div>" + price + "</div>"
        + '<div class="tool-cats">' + cats + "</div>"
        + '<div class="scores">'
        + '<div class="score-block"><span>DACH</span><strong>' + str(dach) + "/10</strong></div>"
        + '<div class="score-block"><span>Worth-it</span><strong>' + str(score) + "/10</strong></div>"
        + "</div>"
        + "<div>" + stars(dach / 2) + "</div>"
        + '<p class="tool-note">' + esc(t.get("aban_note")) + "</p>"
        + '<div class="tool-actions">'
        + '<a href="' + esc(t.get("url")) + '" target="_blank" rel="noopener nofollow">' + esc(t.get("name")) + " →</a>"
        + '<button class="toggle-btn" data-id="' + tid + '">Mehr ↓</button>'
        + "</div>"
        + '<div class="tool-more" id="more-' + tid + '">' + more + "</div>"
        + "</article>"
    )


def jsonld_item(t, pos):
    pricing = t.get("pricing") or {}
    pfe = pricing.get("paid_from_eur")
    return {
        "@type": "ListItem",
        "position": pos,
        "item": {
            "@type": "SoftwareApplication",
            "name": t.get("name"),
            "applicationCategory": ", ".join(t.get("category") or []),
            "url": t.get("url"),
            "operatingSystem": "Web",
            "offers": {
                "@type": "Offer",
                "price": str(pfe) if pfe else "0",
                "priceCurrency": pricing.get("currency") or "EUR",
            },
        },
    }


def sync_counts(html, total):
    """Hält die statischen Tool-Zähler auf tools.html synchron (verankerte Muster)."""
    repls = [
        (r'(id="tool-count">)\d+\+?(</span>)', r"\g<1>%d\g<2>" % total),
        (r'(2026 — )\d+\+?( Tools mit Aban-Ratings)', r"\g<1>%d\g<2>" % total),
        (r'(Datenbank mit )\d+\+?( AI-Tools, ehrlich)', r"\g<1>%d\g<2>" % total),
        (r'(content=")\d+\+?( AI-Tools mit ehrlichen DACH-Ratings)', r"\g<1>%d\g<2>" % total),
    ]
    for pat, rep in repls:
        html = re.sub(pat, rep, html)
    return html


def build(html, tools):
    total = len(tools)
    html = sync_counts(html, total)
    # Stabile Sortierung nach worth_it_score absteigend (= JS-Default "score")
    top = sorted(tools, key=lambda t: -(t.get("worth_it_score") or 0))[:TOP_N]

    # 1) Karten zwischen die Marker
    cards = "\n".join(render_card(t) for t in top)
    block = CARDS_START + "\n" + cards + "\n" + CARDS_END
    pat = re.compile(re.escape(CARDS_START) + r".*?" + re.escape(CARDS_END), re.DOTALL)
    if not pat.search(html):
        raise SystemExit("FEHLER: TOP30-Marker nicht in tools.html gefunden.")
    html = pat.sub(lambda _m: block, html, count=1)

    # 2) Statisches JSON-LD (#tools-jsonld) mit Top-30 befüllen
    ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "AI-Tool-Database 2026 — aban news",
        "description": f"{total} AI-Tools für DACH-Solos, kuratiert und bewertet von aban news.",
        "url": "https://abannews.com/tools.html",
        "numberOfItems": total,
        "itemListElement": [jsonld_item(t, i + 1) for i, t in enumerate(top)],
    }
    ld_json = json.dumps(ld, ensure_ascii=False, indent=2)
    ld_pat = re.compile(
        r'(<script[^>]+id="tools-jsonld"[^>]*>)(.*?)(</script>)', re.DOTALL
    )
    if not ld_pat.search(html):
        raise SystemExit("FEHLER: #tools-jsonld Block nicht gefunden.")
    html = ld_pat.sub(lambda m: m.group(1) + "\n" + ld_json + "\n  " + m.group(3), html, count=1)
    return html


def main():
    ap = argparse.ArgumentParser(description="Top-30-Tools statisch in tools.html backen.")
    ap.add_argument("--check", action="store_true", help="Nur prüfen, Exit 1 bei Drift.")
    args = ap.parse_args()

    data = json.loads(TOOLS.read_text(encoding="utf-8"))
    tools = data.get("tools") if isinstance(data, dict) else data
    if not tools:
        raise SystemExit("FEHLER: keine Tools in data/tools.json.")

    original = PAGE.read_text(encoding="utf-8")
    updated = build(original, tools)

    if args.check:
        if updated != original:
            print("::error::tools.html ist nicht synchron mit data/tools.json. "
                  "Bitte `python3 automation/build_tools_top30.py` ausführen und committen.")
            return 1
        print(f"tools.html Top-{TOP_N} ist synchron ({len(tools)} Tools gesamt).")
        return 0

    if updated != original:
        PAGE.write_text(updated, encoding="utf-8")
        print(f"tools.html aktualisiert: Top-{TOP_N} von {len(tools)} Tools gebacken.")
    else:
        print(f"tools.html bereits synchron (Top-{TOP_N} von {len(tools)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
