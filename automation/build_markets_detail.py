#!/usr/bin/env python3
"""Aban News — Detailseiten pro Markt-Wert (statisch, mit Chart), DE + EN.

Erzeugt aus data/markets.json je Wert zwei Seiten:
  • maerkte/<id>.html      (Deutsch)
  • en/maerkte/<id>.html   (Englisch)
mit 30-Tage-SVG-Chart, Live-Kurs, KI-Sentiment + Begründung, wert-spezifischen
News, Disclaimer und gegenseitigem hreflang. CSS wird aus maerkte.html übernommen.

Reine stdlib, no-op-sicher. Nutzung: python automation/build_markets_detail.py
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "markets.json"
SRC = ROOT / "maerkte.html"

SENT_LABEL = {"bullish": "Bullish", "neutral": "Neutral", "bearish": "Bearish"}

STR = {
    "de": {
        "out": ROOT / "maerkte", "base": "/maerkte/", "site": "/", "markets": "/maerkte.html",
        "loc": "de-DE", "numloc": "de-CH",
        "type": {"crypto": "Krypto", "stock": "Aktie", "index": "Index", "commodity": "Rohstoff"},
        "title": "{name} ({sym}) — Kurs, 30-Tage-Chart & KI-Sentiment | aban news",
        "desc": "{name} ({sym}): aktueller Kurs, 30-Tage-Chart, KI-Sentiment und wert-spezifische News. Anti-Hype, keine Anlageberatung.",
        "skip": "Zum Inhalt springen", "nav": "Hauptnavigation", "subscribe": "Gratis abonnieren",
        "back": "← Alle Märkte", "disc": "⚠️ Keine Anlageberatung. {typ} ist hochvolatil — du kannst eingesetztes Geld komplett verlieren. KI-Sentiment ist experimentell.",
        "eb_chart": "30-Tage-Verlauf", "h_chart": "Kursverlauf", "no_chart": "Kein Chart verfügbar.",
        "updated": "Stand: {u} · Krypto aktualisiert live.",
        "eb_ai": "Experimentell · KI-Einordnung", "h_ai": "KI-Sentiment",
        "eb_news": "News zu {sym}", "h_news": "Aktuelle Schlagzeilen", "no_news": "Aktuell keine wert-spezifischen News.",
        "cross": '<a href="/maerkte.html">← Zur Märkte-Übersicht</a> · <a href="/ki-und-krypto-daten.html">KI &amp; Krypto in Zahlen →</a>',
        "band_h": "Märkte täglich verstehen", "band_p": "Mo–Fr 7:30 Uhr das 5-Minuten-Briefing — ehrlich eingeordnet.",
        "mail": "deine@mail.de", "btn": "Gratis abonnieren →", "fine": "DSGVO-konform · 1-Klick-Abmeldung · kein Spam.",
        "foot_markets": "Märkte", "imp": "Impressum", "dat": "Datenschutz",
    },
    "en": {
        "out": ROOT / "en" / "maerkte", "base": "/en/maerkte/", "site": "/en/", "markets": "/en/maerkte.html",
        "loc": "en", "numloc": "en",
        "type": {"crypto": "Crypto", "stock": "Stock", "index": "Index", "commodity": "Commodity"},
        "title": "{name} ({sym}) — price, 30-day chart & AI sentiment | aban news",
        "desc": "{name} ({sym}): current price, 30-day chart, AI sentiment and asset-specific news. Anti-hype, not investment advice.",
        "skip": "Skip to content", "nav": "Main navigation", "subscribe": "Subscribe free",
        "back": "← All markets", "disc": "⚠️ Not investment advice. {typ} is highly volatile — you can lose all of the money you invest. AI sentiment is experimental.",
        "eb_chart": "30-day history", "h_chart": "Price history", "no_chart": "No chart available.",
        "updated": "As of: {u} · crypto updates live.",
        "eb_ai": "Experimental · AI assessment", "h_ai": "AI sentiment",
        "eb_news": "News on {sym}", "h_news": "Latest headlines", "no_news": "No asset-specific news right now.",
        "cross": '<a href="/en/maerkte.html">← Back to markets overview</a> · <a href="/ki-und-krypto-daten.html">AI &amp; crypto in numbers →</a>',
        "band_h": "Understand markets daily", "band_p": "Every weekday at 7:30 — the 5-minute briefing, honestly explained.",
        "mail": "you@mail.com", "btn": "Subscribe free →", "fine": "GDPR-compliant · 1-click unsubscribe · no spam.",
        "foot_markets": "Markets", "imp": "Imprint", "dat": "Privacy",
    },
    "fr": {
        "out": ROOT / "fr" / "maerkte", "base": "/fr/maerkte/", "site": "/fr/", "markets": "/fr/maerkte.html",
        "loc": "fr", "numloc": "fr-CH",
        "type": {"crypto": "Crypto", "stock": "Action", "index": "Indice", "commodity": "Matière première"},
        "title": "{name} ({sym}) — cours, graphique 30 jours & sentiment IA | aban news",
        "desc": "{name} ({sym}) : cours actuel, graphique 30 jours, sentiment IA et actualités spécifiques. Anti-hype, pas un conseil en investissement.",
        "skip": "Aller au contenu", "nav": "Navigation principale", "subscribe": "S'abonner",
        "back": "← Tous les marchés", "disc": "⚠️ Pas un conseil en investissement. {typ} est très volatil — vous pouvez perdre tout l'argent investi. Le sentiment IA est expérimental.",
        "eb_chart": "Historique 30 jours", "h_chart": "Évolution du cours", "no_chart": "Aucun graphique disponible.",
        "updated": "Au : {u} · crypto en direct.",
        "eb_ai": "Expérimental · analyse IA", "h_ai": "Sentiment IA",
        "eb_news": "Actus sur {sym}", "h_news": "Derniers titres", "no_news": "Pas d'actus spécifiques pour le moment.",
        "cross": '<a href="/fr/maerkte.html">← Retour à l\'aperçu des marchés</a> · <a href="/ki-und-krypto-daten.html">IA &amp; crypto en chiffres →</a>',
        "band_h": "Comprendre les marchés au quotidien", "band_p": "Du lundi au vendredi à 7h30 — le briefing de 5 minutes, sans hype.",
        "mail": "vous@mail.com", "btn": "S'abonner →", "fine": "Conforme RGPD · désinscription en 1 clic · pas de spam.",
        "foot_markets": "Marchés", "imp": "Mentions légales", "dat": "Confidentialité",
    },
    "it": {
        "out": ROOT / "it" / "maerkte", "base": "/it/maerkte/", "site": "/it/", "markets": "/it/maerkte.html",
        "loc": "it", "numloc": "it-CH",
        "type": {"crypto": "Cripto", "stock": "Azione", "index": "Indice", "commodity": "Materia prima"},
        "title": "{name} ({sym}) — prezzo, grafico 30 giorni & sentiment IA | aban news",
        "desc": "{name} ({sym}): prezzo attuale, grafico 30 giorni, sentiment IA e notizie specifiche. Anti-hype, non è consulenza finanziaria.",
        "skip": "Vai al contenuto", "nav": "Navigazione principale", "subscribe": "Iscriviti",
        "back": "← Tutti i mercati", "disc": "⚠️ Non è consulenza finanziaria. {typ} è molto volatile — puoi perdere tutto il capitale investito. Il sentiment IA è sperimentale.",
        "eb_chart": "Storico 30 giorni", "h_chart": "Andamento del prezzo", "no_chart": "Nessun grafico disponibile.",
        "updated": "Al: {u} · cripto in tempo reale.",
        "eb_ai": "Sperimentale · analisi IA", "h_ai": "Sentiment IA",
        "eb_news": "Notizie su {sym}", "h_news": "Ultimi titoli", "no_news": "Nessuna notizia specifica al momento.",
        "cross": '<a href="/it/maerkte.html">← Torna alla panoramica mercati</a> · <a href="/ki-und-krypto-daten.html">IA &amp; cripto in numeri →</a>',
        "band_h": "Capire i mercati ogni giorno", "band_p": "Da lunedì a venerdì alle 7:30 — il briefing di 5 minuti, senza hype.",
        "mail": "tu@mail.com", "btn": "Iscriviti →", "fine": "Conforme GDPR · disiscrizione in 1 clic · niente spam.",
        "foot_markets": "Mercati", "imp": "Note legali", "dat": "Privacy",
    },
}


# Labels für Kennzahlen, Analyse & verwandte Werte (4 Sprachen).
LBL = {
    "de": {"eb_stats": "Kennzahlen", "h_stats": "Im Überblick", "h_analysis": "Ausführliche Analyse",
           "eb_related": "Mehr aus der Kategorie", "h_related": "Verwandte Werte",
           "c24": "24 h", "c7": "7 Tage", "c30": "30 Tage", "hi": "30T-Hoch", "lo": "30T-Tief",
           "mcap": "Marktkap.", "vol": "Volumen", "ath": "Allzeithoch", "w52h": "52W-Hoch", "w52l": "52W-Tief"},
    "en": {"eb_stats": "Key figures", "h_stats": "At a glance", "h_analysis": "In-depth analysis",
           "eb_related": "More in this category", "h_related": "Related assets",
           "c24": "24 h", "c7": "7 days", "c30": "30 days", "hi": "30d high", "lo": "30d low",
           "mcap": "Market cap", "vol": "Volume", "ath": "All-time high", "w52h": "52w high", "w52l": "52w low"},
    "fr": {"eb_stats": "Indicateurs", "h_stats": "En bref", "h_analysis": "Analyse détaillée",
           "eb_related": "Plus dans cette catégorie", "h_related": "Valeurs liées",
           "c24": "24 h", "c7": "7 jours", "c30": "30 jours", "hi": "Plus haut 30j", "lo": "Plus bas 30j",
           "mcap": "Capitalisation", "vol": "Volume", "ath": "Plus haut historique", "w52h": "Plus haut 52s", "w52l": "Plus bas 52s"},
    "it": {"eb_stats": "Indicatori", "h_stats": "In sintesi", "h_analysis": "Analisi dettagliata",
           "eb_related": "Altro in questa categoria", "h_related": "Valori correlati",
           "c24": "24 h", "c7": "7 giorni", "c30": "30 giorni", "hi": "Max 30g", "lo": "Min 30g",
           "mcap": "Capitalizzazione", "vol": "Volume", "ath": "Massimo storico", "w52h": "Max 52sett", "w52l": "Min 52sett"},
}


def esc(s):
    return html.escape(str(s or ""), quote=True)


def fmt_num(v, unit=""):
    if v is None or not isinstance(v, (int, float)):
        return "—"
    a = abs(v)
    if a >= 1e12: s = f"{v/1e12:.2f} T"
    elif a >= 1e9: s = f"{v/1e9:.2f} Mrd"
    elif a >= 1e6: s = f"{v/1e6:.2f} Mio"
    elif a >= 1000: s = f"{v:,.0f}".replace(",", "’")
    elif a >= 1: s = f"{v:,.2f}".replace(",", "’")
    else: s = f"{v:.4f}"
    return (s + (" " + unit if unit else "")).strip()


def chg_cell(v):
    if v is None or not isinstance(v, (int, float)):
        return '<span class="chg flat">—</span>'
    cls = "up" if v > 0.04 else ("down" if v < -0.04 else "flat")
    return f'<span class="chg {cls}">{v:+.2f} %</span>'


def stats_html(asset, lbl):
    """Kennzahlen-Tabelle aus asset['stats'] + 24h-Change."""
    st = asset.get("stats") or {}
    idx = asset.get("type") == "index"
    unit = "Pkt" if idx else "USD"
    rows = [(lbl["c24"], chg_cell(asset.get("change_24h"))),
            (lbl["c7"], chg_cell(st.get("change_7d"))),
            (lbl["c30"], chg_cell(st.get("change_30d"))),
            (lbl["hi"], fmt_num(st.get("high_30d"), unit)),
            (lbl["lo"], fmt_num(st.get("low_30d"), unit))]
    if not idx and st.get("volume"):
        rows.append((lbl["vol"], fmt_num(st.get("volume"))))
    if asset.get("type") == "crypto":
        if st.get("market_cap"): rows.append((lbl["mcap"], fmt_num(st.get("market_cap"), "USD")))
        if st.get("ath"): rows.append((lbl["ath"], fmt_num(st.get("ath"), "USD")))
    if asset.get("type") in ("stock",):
        if st.get("week52_high"): rows.append((lbl["w52h"], fmt_num(st.get("week52_high"), "USD")))
        if st.get("week52_low"): rows.append((lbl["w52l"], fmt_num(st.get("week52_low"), "USD")))
    cells = "".join(f'<div class="kpi"><span class="kl">{esc(k)}</span>'
                    f'<span class="kv">{v}</span></div>' for k, v in rows)
    return f'<div class="kpis">{cells}</div>'


def analysis_html(asset):
    items = asset.get("analysis") or []
    if not items:
        return ""
    li = "".join(f"<li>{esc(x)}</li>" for x in items[:4])
    return f'<ul class="analysis">{li}</ul>'


def related_html(asset, all_assets, t, lbl):
    same = [x for x in all_assets if x.get("type") == asset.get("type") and x["id"] != asset["id"]][:4]
    if not same:
        return ""
    cards = "".join(
        f'<a class="relcard" href="{t["base"]}{x["id"]}.html">'
        f'<span class="rn">{esc(x.get("name"))}</span>'
        f'<span class="rs">{esc(x.get("symbol"))}</span></a>' for x in same)
    return (f'<section class="sec" style="padding-top:0"><div class="wrap">'
            f'<span class="eyebrow">{lbl["eb_related"]}</span><h2>{lbl["h_related"]}</h2>'
            f'<div class="relgrid">{cards}</div></div></section>')


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


def chart_svg(spark, up, no_chart):
    if not spark or len(spark) < 2:
        return f'<p class="muted">{no_chart}</p>'
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
        f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="30-day price history" style="display:block">'
        f'<path d="{area}" fill="{fill}" stroke="none"/>'
        f'<polyline points="{line}" fill="none" stroke="{color}" stroke-width="2.2" '
        f'stroke-linejoin="round" stroke-linecap="round"/></svg>'
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


def page(asset, css, updated, lang, all_assets):
    t = STR[lang]
    lbl = LBL[lang]
    langs = ["de", "en", "fr", "it"]
    aid, name, sym = asset["id"], asset.get("name", ""), asset.get("symbol", "")
    typ = t["type"].get(asset.get("type"), "")
    chg = asset.get("change_24h")
    chg_cls = "up" if (chg or 0) > 0.04 else ("down" if (chg or 0) < -0.04 else "flat")
    chg_txt = (f"{chg:+.2f} %" if chg is not None else "—")
    sent = asset.get("sentiment", "neutral")
    up = bool(asset.get("spark") and asset["spark"][-1] >= asset["spark"][0])
    title = t["title"].format(name=name, sym=sym)
    desc = t["desc"].format(name=name, sym=sym)
    canon = f"https://abannews.com{t['base']}{aid}.html"
    hreflangs = "\n".join(
        f'  <link rel="alternate" hreflang="{l}" href="https://abannews.com{STR[l]["base"]}{aid}.html">'
        for l in langs)
    hreflangs += f'\n  <link rel="alternate" hreflang="x-default" href="https://abannews.com/maerkte/{aid}.html">'
    switcher = "".join(
        (f'<a href="{STR[l]["base"]}{aid}.html" class="on" aria-current="page">{l.upper()}</a>'
         if l == lang else f'<a href="{STR[l]["base"]}{aid}.html">{l.upper()}</a>')
        for l in langs)
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{canon}">
{hreflangs}
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
    .kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.7rem;margin-top:1.4rem}}
    .kpi{{background:#fff;border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:.2rem}}
    .kpi .kl{{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:800}}
    .kpi .kv{{font-weight:800;font-variant-numeric:tabular-nums}}
    .analysis{{list-style:none;margin:1rem 0 0;padding:0;display:grid;gap:.6rem;max-width:680px}}
    .analysis li{{background:#fff;border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:10px;padding:.7rem .9rem;font-size:.95rem;color:var(--ink)}}
    .relgrid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.7rem;margin-top:1.4rem}}
    .relcard{{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;box-shadow:var(--shadow-sm);text-decoration:none;color:var(--ink)}}
    .relcard:hover{{border-color:var(--amber);color:var(--amber-dk)}}
    .relcard .rn{{font-weight:800}}.relcard .rs{{color:var(--muted);font-size:.85rem}}
  </style>
  <script type="application/ld+json">
  {{"@context":"https://schema.org","@type":"WebPage","name":{json.dumps(title)},"url":"{canon}","inLanguage":"{t['loc']}","isPartOf":{{"@type":"WebSite","name":"aban news","url":"https://abannews.com/"}}}}
  </script>
</head>
<body>
<a class="skip" href="#main">{t['skip']}</a>
<header>
  <div class="wrap">
    <a href="{t['site']}" class="brand"><span class="dot"></span> aban news</a>
    <nav class="hnav" aria-label="{t['nav']}">
      <a href="{t['markets']}" class="lk lk--keep">{t['foot_markets']}</a>
      <span class="lang" role="group" aria-label="Language">{switcher}</span>
      <a href="#signup" class="btn btn--amber btn--sm">{t['subscribe']}</a>
    </nav>
  </div>
</header>

<main id="main" tabindex="-1">
  <section class="hero">
    <div class="wrap">
      <a class="backlink" href="{t['markets']}">{t['back']}</a>
      <h1>{esc(name)} <span class="hl">{esc(sym)}</span></h1>
      <div class="detail-hero">
        <span class="px" id="livePrice" data-id="{aid}" data-type="{asset.get('type','')}">{fmt_asset_price(asset)}</span>
        <span class="chg {chg_cls}">{chg_txt}</span>
        <span class="tag-type">{typ}</span>
        <span class="badge {sent}">{SENT_LABEL.get(sent, "Neutral")}</span>
      </div>
      <p class="disclaimer">{t['disc'].format(typ=typ)}</p>
    </div>
  </section>

  <section class="sec" style="padding-top:1.2rem">
    <div class="wrap">
      <span class="eyebrow">{t['eb_chart']}</span>
      <h2>{t['h_chart']}</h2>
      <div class="chartbox">{chart_svg(asset.get("spark"), up, t['no_chart'])}</div>
      <p class="updated" style="margin-top:.7rem">{t['updated'].format(u=esc(updated))}</p>
      <span class="eyebrow" style="margin-top:1.6rem;display:inline-flex">{lbl['eb_stats']}</span>
      <h2 style="font-size:clamp(1.2rem,2.6vw,1.6rem)">{lbl['h_stats']}</h2>
      {stats_html(asset, lbl)}
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <span class="eyebrow">{t['eb_ai']}</span>
      <h2>{t['h_ai']}</h2>
      <div class="card" style="max-width:680px">
        <div class="chead"><span class="cname">{esc(name)} · {esc(sym)}</span><span class="badge {sent}">{SENT_LABEL.get(sent, "Neutral")}</span></div>
        {('<p class="csignal">' + esc(asset.get("signal")) + '</p>') if asset.get("signal") else ''}
        <p class="crat">{esc(asset.get("rationale"))}</p>
      </div>
      {('<h3 style="margin:1.6rem 0 0;font-size:1.05rem">' + lbl['h_analysis'] + '</h3>' + analysis_html(asset)) if asset.get("analysis") else ''}
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <span class="eyebrow">{t['eb_news'].format(sym=esc(sym))}</span>
      <h2>{t['h_news']}</h2>
      {news_html(asset.get("asset_news")) or f'<p class="muted">{t["no_news"]}</p>'}
      <p class="crosslink" style="margin-top:1.4rem">{t['cross']}</p>
    </div>
  </section>

  {related_html(asset, all_assets, t, lbl)}

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="band">
        <h2>{t['band_h']}</h2>
        <p>{t['band_p']}</p>
        <form class="cta" id="signup" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>
          <input type="email" name="email" placeholder="{t['mail']}" required autocomplete="email" inputmode="email" aria-label="Email">
          <button type="submit" class="btn btn--amber">{t['btn']}</button>
        </form>
        <p class="fine">{t['fine']}</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="footbar">
      <span>© 2026 aban news · Allen Chour, Belp (CH)</span>
      <span class="footbar-links"><a href="{t['markets']}">{t['foot_markets']}</a><a href="/impressum.html">{t['imp']}</a><a href="/datenschutz.html">{t['dat']}</a></span>
    </div>
  </div>
</footer>

<script>
(function(){{
  var el=document.getElementById('livePrice'); if(!el) return;
  var id=el.getAttribute('data-id'); var typ=el.getAttribute('data-type');
  function fmt(v){{ if(v==null)return null; var d=v>=1000?0:(v>=1?2:4);
    if(typ==='index'){{ try{{return new Intl.NumberFormat('{t['numloc']}',{{maximumFractionDigits:d,minimumFractionDigits:d}}).format(v)+' Pkt';}}catch(e){{return v.toFixed(d)+' Pkt';}} }}
    try{{return new Intl.NumberFormat('{t['numloc']}',{{style:'currency',currency:'USD',maximumFractionDigits:d,minimumFractionDigits:d}}).format(v);}}catch(e){{return v.toFixed(d)+' USD';}} }}
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
    total = 0
    for lang in ("de", "en", "fr", "it"):
        outdir = STR[lang]["out"]
        outdir.mkdir(parents=True, exist_ok=True)
        for a in data.get("assets", []):
            (outdir / f"{a['id']}.html").write_text(
                page(a, css, updated, lang, data.get("assets", [])), encoding="utf-8")
            total += 1
        print(f"[{lang}] {len(data.get('assets', []))} Detailseiten → {outdir}/")
    print(f"Gesamt {total} Detailseiten erzeugt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
