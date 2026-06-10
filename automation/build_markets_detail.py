#!/usr/bin/env python3
"""Aban News — Detailseiten pro Markt-Wert (statisch, mit Chart).

Erzeugt aus data/markets.json je Wert eine Seite maerkte/<id>.html:
  • großer 30-Tage-SVG-Chart (serverseitig gerendert → SEO + kein JS nötig)
  • aktueller Kurs (live nachladbar), 24h-Änderung, KI-Sentiment + Begründung
  • wert-spezifische News, Disclaimer, Zurück-Link

Das CSS wird aus maerkte.html übernommen (identischer Look). Reine stdlib.
No-op-sicher: fehlt markets.json, passiert nichts.

Nutzung: python automation/build_markets_detail.py
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "markets.json"
OUTDIR = ROOT / "maerkte"
SRC = ROOT / "maerkte.html"

SENT_LABEL = {"bullish": "Bullish", "neutral": "Neutral", "bearish": "Bearish"}
TYPE_LABEL = {"crypto": "Krypto", "stock": "Aktie", "index": "Index", "commodity": "Rohstoff"}


def esc(s):
    return html.escape(str(s or ""), quote=True)


def fmt_asset_price(a):
    v = a.get("price")
    if v is None:
        return "—"
    unit = "Pkt" if a.get("type") == "index" else "USD"
    if v >= 1000:
        return f"{v:,.0f}".replace(",", "’") + " " + unit
    if v >= 1:
        return f"{v:,.2f}".replace(",", "’") + " " + unit
    return f"{v:.4f} " + unit


def chart_svg(spark, up):
    """Großer Linien-/Flächen-Chart als Inline-SVG aus den 30T-Punkten."""
    if not spark or len(spark) < 2:
        return '<p class="muted">Kein Chart verfügbar.</p>'
    W, H, pad = 640, 200, 8
    lo, hi = min(spark), max(spark)
    span = (hi - lo) or 1
    n = len(spark)
    pts = []
    for i, v in enumerate(spark):
        x = pad + i / (n - 1) * (W - 2 * pad)
        y = pad + (1 - (v - lo) / span) * (H - 2 * pad)
        pts.append((round(x, 1), round(y, 1)))
    line = " ".join(f"{x},{y}" for x, y in pts)
    area = f"M{pts[0][0]},{H-pad} " + " ".join(f"L{x},{y}" for x, y in pts) + f" L{pts[-1][0]},{H-pad} Z"
    color = "#0f9d6b" if up else "#dc2626"
    fill = "rgba(15,157,107,.12)" if up else "rgba(220,38,38,.10)"
    return (
        f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" '
        f'aria-label="30-Tage-Kursverlauf" style="display:block">'
        f'<path d="{area}" fill="{fill}" stroke="none"/>'
        f'<polyline points="{line}" fill="none" stroke="{color}" stroke-width="2.2" '
        f'stroke-linejoin="round" stroke-linecap="round"/>'
        f'</svg>'
    )


def news_html(items):
    if not items:
        return ""
    li = []
    for n in items:
        li.append(
            f'<li><a href="{esc(n.get("url"))}" target="_blank" rel="noopener">{esc(n.get("title"))}</a>'
            f'<div class="meta"><span>{esc(n.get("source"))}</span>'
            f'<span>· {esc(n.get("datum"))}</span></div></li>'
        )
    return '<ul class="news">' + "".join(li) + "</ul>"


def page(asset, css, updated):
    aid, name, sym = asset["id"], asset.get("name", ""), asset.get("symbol", "")
    typ = TYPE_LABEL.get(asset.get("type"), "Wert")
    price = asset.get("price")
    chg = asset.get("change_24h")
    chg_cls = "up" if (chg or 0) > 0.04 else ("down" if (chg or 0) < -0.04 else "flat")
    chg_txt = (f"{chg:+.2f} %" if chg is not None else "—")
    sent = asset.get("sentiment", "neutral")
    up = bool(asset.get("spark") and asset["spark"][-1] >= asset["spark"][0])
    title = f"{name} ({sym}) — Kurs, 30-Tage-Chart & KI-Sentiment | aban news"
    desc = (f"{name} ({sym}): aktueller Kurs, 30-Tage-Chart, KI-Sentiment und "
            f"wert-spezifische News. Anti-Hype, keine Anlageberatung.")
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://abannews.com/maerkte/{aid}.html">
  <meta name="theme-color" content="#d97706">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:image" content="https://abannews.com/og-image.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{css}
  <style>
    .detail-hero{{display:flex;flex-wrap:wrap;align-items:baseline;gap:.6rem 1rem;margin:.6rem 0 0}}
    .detail-hero .px{{font-size:clamp(1.8rem,4vw,2.6rem);font-weight:900;letter-spacing:-.02em}}
    .chartbox{{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:1.2rem;box-shadow:var(--shadow-sm);margin-top:1.4rem}}
    .muted{{color:var(--muted)}}
    .backlink{{display:inline-block;margin:.4rem 0 0;color:var(--amber-dk);font-weight:700;text-decoration:none}}
  </style>
  <script type="application/ld+json">
  {{"@context":"https://schema.org","@type":"WebPage","name":{json.dumps(title)},"url":"https://abannews.com/maerkte/{aid}.html","inLanguage":"de-DE","isPartOf":{{"@type":"WebSite","name":"aban news","url":"https://abannews.com/"}}}}
  </script>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
<header>
  <div class="wrap">
    <a href="/" class="brand"><span class="dot"></span> aban news</a>
    <nav class="hnav" aria-label="Hauptnavigation">
      <a href="/maerkte.html" class="lk lk--keep">Märkte</a>
      <span class="lang" role="group" aria-label="Sprache"><a href="/maerkte/{aid}.html" class="on" aria-current="page">DE</a></span>
      <a href="#signup" class="btn btn--amber btn--sm">Gratis abonnieren</a>
    </nav>
  </div>
</header>

<main id="main" tabindex="-1">
  <section class="hero">
    <div class="wrap">
      <a class="backlink" href="/maerkte.html">← Alle Märkte</a>
      <h1>{esc(name)} <span class="hl">{esc(sym)}</span></h1>
      <div class="detail-hero">
        <span class="px" id="livePrice" data-id="{aid}" data-type="{asset.get('type','')}">{fmt_asset_price(asset)}</span>
        <span class="chg {chg_cls}">{chg_txt}</span>
        <span class="tag-type">{typ}</span>
        <span class="badge {sent}">{SENT_LABEL.get(sent, "Neutral")}</span>
      </div>
      <p class="disclaimer">⚠️ Keine Anlageberatung. {esc(typ)} ist hochvolatil — du kannst eingesetztes Geld komplett verlieren. KI-Sentiment ist experimentell.</p>
    </div>
  </section>

  <section class="sec" style="padding-top:1.2rem">
    <div class="wrap">
      <span class="eyebrow">30-Tage-Verlauf</span>
      <h2>Kursverlauf</h2>
      <div class="chartbox">{chart_svg(asset.get("spark"), up)}</div>
      <p class="updated" style="margin-top:.7rem">Stand: {esc(updated)} · Krypto aktualisiert live.</p>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <span class="eyebrow">Experimentell · KI-Einordnung</span>
      <h2>KI-Sentiment</h2>
      <div class="card" style="max-width:680px">
        <div class="chead"><span class="cname">{esc(name)} · {esc(sym)}</span><span class="badge {sent}">{SENT_LABEL.get(sent, "Neutral")}</span></div>
        {('<p class="csignal">' + esc(asset.get("signal")) + '</p>') if asset.get("signal") else ''}
        <p class="crat">{esc(asset.get("rationale"))}</p>
      </div>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <span class="eyebrow">News zu {esc(sym)}</span>
      <h2>Aktuelle Schlagzeilen</h2>
      {news_html(asset.get("asset_news")) or '<p class="muted">Aktuell keine wert-spezifischen News.</p>'}
      <p class="crosslink" style="margin-top:1.4rem"><a href="/maerkte.html">← Zur Märkte-Übersicht</a> · <a href="/ki-und-krypto-daten.html">KI &amp; Krypto in Zahlen →</a></p>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="band">
        <h2>Märkte täglich verstehen</h2>
        <p>Mo–Fr 7:30 Uhr das 5-Minuten-Briefing — ehrlich eingeordnet.</p>
        <form class="cta" id="signup" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>
          <input type="email" name="email" placeholder="deine@mail.de" required autocomplete="email" inputmode="email" aria-label="E-Mail-Adresse">
          <button type="submit" class="btn btn--amber">Gratis abonnieren →</button>
        </form>
        <p class="fine">DSGVO-konform · 1-Klick-Abmeldung · kein Spam.</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="footbar">
      <span>© 2026 aban news · Allen Chour, Belp (CH)</span>
      <span class="footbar-links"><a href="/maerkte.html">Märkte</a><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a></span>
    </div>
  </div>
</footer>

<script>
// Live-Kurs aus markets.json nachladen (CSP-safe, no-op bei Fehler).
(function(){{
  var el=document.getElementById('livePrice'); if(!el) return;
  var id=el.getAttribute('data-id'); var typ=el.getAttribute('data-type');
  function fmt(v){{ if(v==null)return null; var d=v>=1000?0:(v>=1?2:4);
    if(typ==='index'){{ try{{return new Intl.NumberFormat('de-CH',{{maximumFractionDigits:d,minimumFractionDigits:d}}).format(v)+' Pkt';}}catch(e){{return v.toFixed(d)+' Pkt';}} }}
    try{{return new Intl.NumberFormat('de-CH',{{style:'currency',currency:'USD',maximumFractionDigits:d,minimumFractionDigits:d}}).format(v);}}catch(e){{return v.toFixed(d)+' USD';}} }}
  function upd(){{ fetch('/data/markets.json',{{cache:'no-store'}}).then(function(r){{return r.ok?r.json():null;}}).then(function(d){{
    if(!d)return; var a=(d.assets||[]).filter(function(x){{return x.id===id;}})[0];
    if(a&&typeof a.price==='number'){{ var s=fmt(a.price); if(s)el.textContent=s; }}
  }}).catch(function(){{}}); }}
  upd(); setInterval(upd, 90000);
}})();
</script>
<script defer src="/js/analytics.js"></script>
<script defer src="/js/assistant.js"></script>
<script defer src="/js/announce.js"></script>
</body>
</html>
"""


def main() -> int:
    if not DATA.exists() or not SRC.exists():
        sys.stderr.write("markets.json oder maerkte.html fehlt → nichts zu tun.\n")
        return 0
    data = json.loads(DATA.read_text(encoding="utf-8"))
    m = re.search(r"<style>.*?</style>", SRC.read_text(encoding="utf-8"), re.S)
    css = m.group(0) if m else "<style></style>"
    updated = data.get("last_updated", "")
    OUTDIR.mkdir(exist_ok=True)
    count = 0
    for a in data.get("assets", []):
        (OUTDIR / f"{a['id']}.html").write_text(page(a, css, updated), encoding="utf-8")
        count += 1
    print(f"{count} Detailseiten erzeugt → {OUTDIR}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
