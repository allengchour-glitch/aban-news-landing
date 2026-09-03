#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_angebote.py — eine ehrliche Angebots-/Preisübersicht (Conversion).

Erzeugt angebote.html: alle Gratis- und Bezahl-Angebote auf einen Blick, gruppiert,
mit Preis, „für wen" und Link. Damit Besucher schnell das Richtige finden.
Preise nur aus den echten Produktseiten — keine erfundenen Zahlen.

Run:  python3 generate_angebote.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

SITE = "https://abannews.com"

GROUPS = [
    ("Kostenlos starten", [
        ("Newsletter", "gratis", "Mo–Fr, 5 Min KI auf Deutsch — ehrlich, ohne Hype.", "https://abannews.beehiiv.com/subscribe"),
        ("KI-Reels", "gratis", "Kurze, ehrliche Tool-Checks als Video — täglich neu.", "/reels"),
        ("KI-Tool-Datenbank", "gratis", "140+ Tools, bewertet, filterbar — ohne Login.", "/tools.html"),
        ("KI-Werkzeug", "gratis", "Texte & KI-Fahrplan in Minuten — ohne Login.", "/ki-werkzeug.html"),
        ("Online-Tools", "gratis", "Rechner, Generatoren & Helfer — ohne Login.", "/online-tools.html"),
        ("Hype-Watch", "gratis", "KI-Behauptungen mit Quellen gegengeprüft.", "/hype-watch"),
        ("KI-Sichtbarkeits-Check", "gratis", "Nennt dich ChatGPT & Co.? Sofort prüfen.", "/ki-erwaehnungs-check.html"),
    ]),
    ("Von KI gefunden werden", [
        ("KI-Sichtbarkeits-Audit (selbst)", "29 €", "Workbook + 90-Tage-Plan: prüf selbst, ob KI dich nennt. Einmalig, kein Abo.", "/ki-sichtbarkeit-audit.html"),
        ("KI-Sichtbarkeits-Monitor", "9 €/Monat", "Monatlicher Report, ob KI dich nennt + Maßnahmen.", "/ki-sichtbarkeit-monitor.html"),
        ("KI-Sichtbarkeit Komplett-Paket", "29 €", "Buch + 3 Monate Monitor + Maßnahmen-Vorlage.", "/ki-sichtbarkeit-paket.html"),
        ("Buch „Von KI gefunden werden“", "9,99 €", "14 Kapitel: wie lokale Anbieter in KI-Antworten auftauchen.", "/ki-sichtbarkeit-buch.html"),
        ("Für deine Branche", "ab gratis", "Handwerk, Praxen, Kanzleien, Steuer, Gastro & mehr.", "/ki-sichtbarkeit.html"),
    ]),
    ("Wissen & Umsetzung", [
        ("Texte-Service (Done-for-you)", "ab 39 €", "Wir schreiben deine Texte fertig — abgestimmt auf deinen Betrieb.", "/texte-service.html"),
        ("KI-Schnellstart (30-Tage-Plan)", "29 €", "KI im Betrieb einführen — ohne Chaos.", "/ki-schnellstart.html"),
        ("Der Notfall-Ordner", "19 €", "Vorsorge-Dossier zum Ausfüllen — für jeden Haushalt.", "/notfall-ordner.html"),
        ("KI-Compliance-Pakete", "39 €", "Richtlinie + Checkliste + sichere Prompts (regulierte Berufe).", "/ki-compliance.html"),
        ("Klartext-Vorlagen-Set", "19 €", "Fertige Textbausteine für den Alltag.", "/vorlagen-set.html"),
        ("Branchen-Starter-Kits", "ab 12 €", "Spickzettel + Prompts + Datenschutz-Checkliste je Branche.", "/shop.html"),
    ]),
    ("Daten & Premium", [
        ("KI-Tools-Datensatz (DACH)", "19 € · Abo mögl.", "326 Tools als CSV + JSON, für Agenturen & Entwickler.", "/ki-tools-datensatz.html"),
        ("Premium-Briefing", "19 €/Monat", "Tiefere Analysen für Profis.", "/premium-briefing.html"),
        ("Anti-Hype-Buch", "zahl, was du willst", "KI ohne Bullshit einsetzen — das Original.", "/buch.html"),
        ("Für Verbände (White-Label)", "Anfrage", "Das KI-Werkzeug gebrandet für Ihre Mitglieder.", "/fuer-verbaende.html"),
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
h2.eyebrow{font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--amber-dk);margin:26px 0 6px;display:flex;align-items:center;gap:8px}
.eyebrow::before{content:"";width:18px;height:3px;background:var(--amber);border-radius:3px}
.grid{display:grid;grid-template-columns:1fr;gap:12px;list-style:none;padding:0;margin:0}
@media(min-width:620px){.grid{grid-template-columns:1fr 1fr}}
.item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px}
.item:hover{border-color:var(--amber)}
.item .t{display:block;font-weight:700;font-size:1rem}.item .d{display:block;color:var(--muted);font-size:.86rem;margin-top:2px}
.item .r{flex:none;text-align:right}
.item .p{font-weight:800;color:var(--amber-dk);font-size:.92rem;white-space:nowrap}
.item .go{font-size:.8rem;font-weight:700}
.note{font-size:.85rem;color:var(--muted);margin:20px 0}
.preise{width:100%;border-collapse:collapse;margin:10px 0 4px;font-size:.92rem}
.preise caption{text-align:left;color:var(--muted);font-size:.82rem;padding-bottom:6px}
.preise th,.preise td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.preise th{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.preise td.p{font-weight:800;color:var(--amber-dk);white-space:nowrap}
.tabwrap{overflow-x:auto}
.faq h2{font-size:1.05rem;margin:18px 0 4px}
.faq p{color:var(--ink2);margin-bottom:6px}
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
            cards += (f'<li><a class="item" href="{url}"{tgt}><span><span class="t">{e(name)}</span>'
                      f'<span class="d">{e(desc)}</span></span>'
                      f'<span class="r"><span class="p">{e(price)}</span><br><span class="go">Ansehen →</span></span></a></li>')
        sections += f'<h2 class="eyebrow">{e(title)}</h2><ul class="grid">{cards}</ul>'

    # ── Preistabelle: nur die BEZAHL-Produkte, aus derselben GROUPS-Quelle ──────────
    #    Eine „Preise"-Seite ohne Preistabelle ist eine Linkliste. Die Tabelle ist für
    #    Leser die schnellste Antwort auf „was kostet was" — und für Antwort-Maschinen
    #    die am besten verwertbare Form (gemessen: Kategorie „listen" 0/10 ohne sie).
    zeilen = ""
    bezahlt = [(t, n, pr, d, u) for t, items in GROUPS for (n, pr, d, u) in items
               if pr not in ("gratis", "ab gratis")]
    for gruppe, name, preis, desc, url in bezahlt:
        zeilen += (f'<tr><td><a href="{url}">{e(name)}</a><br><span class="d" style="color:var(--muted);font-size:.84rem">{e(desc)}</span></td>'
                   f'<td>{e(gruppe)}</td><td class="p">{e(preis)}</td></tr>')

    # ── FAQ: echte Kaufhürden, jede Antwort aus AGB oder GROUPS belegt ─────────────
    abos = [n for _, items in GROUPS for (n, pr, _, _) in items if "/Monat" in pr]
    FAQ = [
        ("Was kostet der Einstieg?",
         "Nichts. Newsletter, KI-Tool-Datenbank, die Online-Tools und der KI-Sichtbarkeits-Check "
         "sind kostenlos und brauchen kein Konto. Bezahlt wird nur, wer mehr will."),
        ("Brauche ich ein Abo?",
         "Nein. Bis auf " + " und ".join(abos) + " ist alles ein einmaliger Kauf. "
         "Ein einmaliger Kauf bleibt dir, ein Abo kannst du jederzeit beenden."),
        ("Wie bezahle ich?",
         "Über Stripe mit Karte, dazu die weiteren im Checkout angebotenen Zahlarten. "
         "Vollständige Zahlungsdaten werden bei aban news nicht gespeichert."),
        ("Wie bekomme ich das Produkt?",
         "Rein digital: nach der Zahlung wird der Download über eine persönliche Bestätigungsseite "
         "freigeschaltet. Versandkosten fallen keine an. Klemmt etwas, hilft eine Mail an hallo@abannews.com."),
        ("Kann ich zurücktreten?",
         "Bei digitalen Inhalten besteht grundsätzlich ein Widerrufsrecht. Es erlischt, sobald der "
         "Download mit deiner ausdrücklichen Zustimmung begonnen hat. Die Einzelheiten stehen in den AGB."),
        ("Was ist der Unterschied zwischen Audit, Monitor und Komplett-Paket?",
         "Das Audit ist eine einmalige Bestandsaufnahme mit 90-Tage-Plan zum Selbermachen. Der Monitor "
         "schickt dir monatlich einen Report samt Massnahmen. Das Komplett-Paket bündelt Buch, drei "
         "Monate Monitor und die Massnahmen-Vorlage."),
        ("Für wen ist das gemacht?",
         "Für Selbstständige und kleine Betriebe im deutschsprachigen Raum, die KI im Alltag nutzen "
         "wollen — ohne Hype und ohne Vorwissen."),
    ]
    faq_html = "".join(f"<h2>{e(q)}</h2><p>{e(a)}</p>" for q, a in FAQ)

    # ── JSON-LD: FAQ + Angebotsliste + Brotkrume ──────────────────────────────────
    def ld(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    faq_ld = ld({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]})
    liste_ld = ld({"@context": "https://schema.org", "@type": "ItemList",
                   "name": "Angebote und Preise von aban news",
                   "itemListElement": [
                       {"@type": "ListItem", "position": i + 1, "name": n,
                        "url": (u if u.startswith("http") else SITE + u), "description": d}
                       for i, (_, n, _, d, u) in enumerate(bezahlt)]})
    brot_ld = ld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Start", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Angebote & Preise", "item": SITE + "/angebote.html"}]})

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
<script type="application/ld+json">{faq_ld}</script>
<script type="application/ld+json">{liste_ld}</script>
<script type="application/ld+json">{brot_ld}</script>
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
  </section>
  <section>
    <h2 class="eyebrow">Preise auf einen Blick</h2>
    <div class="tabwrap"><table class="preise">
      <caption>Alle Bezahl-Produkte mit Preis. Preise inkl. zutreffender MwSt.</caption>
      <thead><tr><th scope="col">Produkt</th><th scope="col">Bereich</th><th scope="col">Preis</th></tr></thead>
      <tbody>{zeilen}</tbody>
    </table></div>
  </section>
  <section class="faq">
    <h2 class="eyebrow">Häufige Fragen</h2>
    {faq_html}
  </section>
  <section>
    <p class="note">Preise inkl. zutreffender MwSt. Digitale Produkte: sofort als Download. Fragen? <a href="mailto:hallo@abannews.com">hallo@abannews.com</a> — oder frag den Assistenten unten rechts.</p>
    <p style="text-align:center;margin:8px 0 0"><a class="btn" href="/start">Link-in-Bio-Übersicht →</a></p>
  </section>
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/start">Alles auf einen Blick</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
</body>
</html>
"""
    # ⚠️ ZWEI QUELLEN DER WAHRHEIT — teuer gelernt am 2026-09-03. Die veroeffentlichte
    #    angebote.html enthielt VIER Angebote, die in GROUPS fehlten (KI-Werkzeug,
    #    Texte-Service ab 39 EUR, Notfall-Ordner 19 EUR, Verbaende-White-Label). Wer den
    #    Generator laufen liess, loeschte sie stillschweigend von der Seite, die verkauft.
    #    Darum vor dem Schreiben vergleichen und laut werden, statt Umsatz zu entsorgen.
    ziel = os.path.join(ROOT, "angebote.html")
    if os.path.exists(ziel):
        alt = re.findall(r'class="t">(.*?)</span>', open(ziel, encoding="utf-8").read())
        neu = [n for _, items in GROUPS for (n, _, _, _) in items]
        fehlt = [html.unescape(x) for x in alt if html.unescape(x) not in neu]
        if fehlt:
            print("⚠️  ABBRUCH: diese Angebote stehen auf der Seite, aber nicht in GROUPS:")
            for f in fehlt:
                print("   ·", f)
            print("   → erst in GROUPS ergaenzen, sonst verschwinden sie von der Verkaufsseite.")
            raise SystemExit(1)
    open(ziel, "w", encoding="utf-8").write(page)
    n = sum(len(i) for _, i in GROUPS)
    print(f"✓ angebote.html erzeugt ({n} Angebote in {len(GROUPS)} Gruppen)")


if __name__ == "__main__":
    main()
