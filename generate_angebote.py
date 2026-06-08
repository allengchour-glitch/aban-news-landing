#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_angebote.py — eine ehrliche Angebots-/Preisübersicht (Conversion).

Erzeugt angebote.html: alle Gratis- und Bezahl-Angebote auf einen Blick, gruppiert,
mit Preis, „für wen" und Link. Damit Besucher schnell das Richtige finden.
Preise nur aus den echten Produktseiten — keine erfundenen Zahlen.

Run:  python3 generate_angebote.py
"""
import html
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

GROUPS = [
    ("Kostenlos starten", [
        ("Newsletter", "gratis", "Mo–Fr, 5 Min KI auf Deutsch — ehrlich, ohne Hype.", "https://abannews.beehiiv.com/subscribe"),
        ("KI-Reels", "gratis", "Kurze, ehrliche Tool-Checks als Video — täglich neu.", "/reels"),
        ("KI-Tool-Datenbank", "gratis", "140+ Tools, bewertet, filterbar — ohne Login.", "/tools.html"),
        ("Online-Tools", "gratis", "Rechner, Generatoren & Helfer — ohne Login.", "/online-tools.html"),
        ("Hype-Watch", "gratis", "KI-Behauptungen mit Quellen gegengeprüft.", "/hype-watch"),
        ("KI-Sichtbarkeits-Check", "gratis", "Nennt dich ChatGPT & Co.? Sofort prüfen.", "/ki-erwaehnungs-check.html"),
    ]),
    ("Von KI gefunden werden", [
        ("KI-Sichtbarkeits-Monitor", "9 €/Monat", "Monatlicher Report, ob KI dich nennt + Maßnahmen.", "/ki-sichtbarkeit-monitor.html"),
        ("KI-Sichtbarkeit Komplett-Paket", "29 €", "Buch + 3 Monate Monitor + Maßnahmen-Vorlage.", "/ki-sichtbarkeit-paket.html"),
        ("Buch „Von KI gefunden werden“", "9,99 €", "14 Kapitel: wie lokale Anbieter in KI-Antworten auftauchen.", "/ki-sichtbarkeit-buch.html"),
        ("Für deine Branche", "ab gratis", "Handwerk, Praxen, Kanzleien, Steuer, Gastro & mehr.", "/ki-sichtbarkeit.html"),
    ]),
    ("Wissen & Umsetzung", [
        ("KI-Schnellstart (30-Tage-Plan)", "29 €", "KI im Betrieb einführen — ohne Chaos.", "/ki-schnellstart.html"),
        ("KI-Compliance-Pakete", "39 €", "Richtlinie + Checkliste + sichere Prompts (regulierte Berufe).", "/ki-compliance.html"),
        ("Klartext-Vorlagen-Set", "19 €", "Fertige Textbausteine für den Alltag.", "/vorlagen-set.html"),
        ("Branchen-Starter-Kits", "ab 12 €", "Spickzettel + Prompts + Datenschutz-Checkliste je Branche.", "/shop.html"),
    ]),
    ("Daten & Premium", [
        ("KI-Tools-Datensatz (DACH)", "19 € · Abo mögl.", "326 Tools als CSV + JSON, für Agenturen & Entwickler.", "/ki-tools-datensatz.html"),
        ("Premium-Briefing", "19 €/Monat", "Tiefere Analysen für Profis.", "/premium-briefing.html"),
        ("Anti-Hype-Buch", "zahl, was du willst", "KI ohne Bullshit einsetzen — das Original.", "/buch.html"),
    ]),
]

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff}
@media(prefers-color-scheme:dark){:root{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:880px;margin:0 auto;padding:0 20px}
a{color:var(--amber-dk);text-decoration:none}
:focus-visible{outline:3px solid var(--amber-dk);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--amber-dk);color:#fff;padding:10px;border-radius:8px}
header.site{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber)}
.btn{display:inline-block;background:var(--amber-dk);color:#fff;font-weight:700;padding:11px 20px;border-radius:9px;font-size:1rem}
.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.hero{padding:46px 0 8px;text-align:center}
.hero h1{font-size:clamp(26px,4.6vw,38px);font-weight:800;letter-spacing:-.02em;margin-bottom:10px}
.hero h1 .a{color:var(--amber)}
.hero p.lead{font-size:clamp(16px,2.2vw,18px);color:var(--ink2);max-width:600px;margin:0 auto}
.eyebrow{font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--amber-dk);margin:26px 0 6px;display:flex;align-items:center;gap:8px}
.eyebrow::before{content:"";width:18px;height:3px;background:var(--amber);border-radius:3px}
.grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:620px){.grid{grid-template-columns:1fr 1fr}}
.item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px}
.item:hover{border-color:var(--amber)}
.item .t{font-weight:700;font-size:1rem}.item .d{color:var(--muted);font-size:.86rem;margin-top:2px}
.item .r{flex:none;text-align:right}
.item .p{font-weight:800;color:var(--amber-dk);font-size:.92rem;white-space:nowrap}
.item .go{font-size:.8rem;font-weight:700}
.note{font-size:.85rem;color:var(--muted);margin:20px 0}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted);text-align:center}
footer a{color:var(--muted)}"""


def e(s):
    return html.escape(str(s))


def main():
    sections = ""
    for title, items in GROUPS:
        cards = ""
        for name, price, desc, url in items:
            ext = url.startswith("http")
            tgt = ' target="_blank" rel="noopener"' if ext else ""
            cards += (f'<a class="item" href="{url}"{tgt}><span><span class="t">{e(name)}</span>'
                      f'<span class="d">{e(desc)}</span></span>'
                      f'<span class="r"><span class="p">{e(price)}</span><br><span class="go">Ansehen →</span></span></a>')
        sections += f'<div class="eyebrow">{e(title)}</div><div class="grid">{cards}</div>'

    page = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Angebote &amp; Preise — alles auf einen Blick · aban news</title>
<meta name="description" content="Alle Angebote von aban news auf einer Seite: kostenlose Tools, KI-Sichtbarkeit, Compliance, Schnellstart, Datensatz & mehr — mit Preisen, ehrlich und ohne Hype.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/angebote.html">
<meta property="og:title" content="Angebote &amp; Preise — alles auf einen Blick">
<meta property="og:description" content="Kostenlose Tools + faire Produkte für DACH-Selbstständige. Eine Seite, alle Preise.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://abannews.com/angebote.html">
<meta property="og:image" content="https://abannews.com/og-image.png">
<meta property="og:site_name" content="aban news"><meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap">
  <a href="/" class="brand">☕ aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a>
</div></header>
<main id="main"><div class="wrap">
  <section class="hero">
    <h1>Angebote &amp; Preise — <span class="a">alles auf einen Blick</span></h1>
    <p class="lead">Viel ist kostenlos. Die Bezahl-Produkte sind fair, ehrlich und ohne Hype — wähl, was zu dir passt.</p>
  </section>
  <section>
    {sections}
    <p class="note">Preise inkl. zutreffender MwSt. Digitale Produkte: sofort als Download. Fragen? <a href="mailto:hallo@abannews.com">hallo@abannews.com</a> — oder frag den Assistenten unten rechts.</p>
    <p style="text-align:center;margin:8px 0 0"><a class="btn" href="/start">Link-in-Bio-Übersicht →</a></p>
  </section>
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/start">Alles auf einen Blick</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
<script defer src="/js/assistant.js"></script>
</body>
</html>
"""
    open(os.path.join(ROOT, "angebote.html"), "w", encoding="utf-8").write(page)
    n = sum(len(i) for _, i in GROUPS)
    print(f"✓ angebote.html erzeugt ({n} Angebote in {len(GROUPS)} Gruppen)")


if __name__ == "__main__":
    main()
