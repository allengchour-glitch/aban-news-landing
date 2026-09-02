#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_ki_audit.py — Produkt „KI-Sichtbarkeits-Audit" (einmalig, DIY).

Die Einmal-Alternative zum 9 €/Monat-Monitor-Abo: ein anpassbares Workbook,
mit dem du in ~2 Stunden selbst prüfst, ob KI (ChatGPT, Perplexity, Google AI)
deine Firma nennt — plus 90-Tage-Maßnahmenplan. Anti-hype, ohne erfundene Zahlen,
ohne Garantien (KI-Antworten schwanken).

Erzeugt:  ki-sichtbarkeit-audit.html  +  audit/ki-sichtbarkeit-audit.md  +  og-audit.png

Run:  python3 generate_ki_audit.py
"""
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
PREIS = "29 €"
A, AD, CR, INK, MU, BG = (217,119,6),(180,83,9),(254,243,199),(31,41,55),(107,114,128),(255,251,245)

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff}
@media(prefers-color-scheme:dark){:root{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
a{color:var(--amber-dk)}
:focus-visible{outline:3px solid var(--amber-dk);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--amber-dk);color:#fff;padding:10px;border-radius:8px}
header.site{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber);text-decoration:none}
.btn{display:inline-block;background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:9px;border:0;cursor:pointer;font-size:1rem}
.btn:hover{filter:brightness(1.05)}.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.hero{padding:46px 0 18px;text-align:center}
.hero h1{font-size:clamp(25px,4.4vw,36px);font-weight:800;letter-spacing:-.02em;line-height:1.13;margin-bottom:12px}
.hero h1 .a{color:var(--amber)}
.hero p.lead{font-size:clamp(16px,2.2vw,18px);color:var(--ink2);max-width:620px;margin:0 auto}
section{padding:14px 0}h2{font-size:1.3rem;margin:18px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:14px 0}
.card h3{font-size:1.05rem;margin-bottom:4px}
ul{margin:8px 0 8px 20px}li{margin:5px 0}
.steps{counter-reset:s;list-style:none;margin:8px 0}
.steps li{position:relative;padding:10px 0 10px 44px;border-bottom:1px solid var(--line)}
.steps li:last-child{border-bottom:0}
.steps li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:9px;width:30px;height:30px;border-radius:50%;background:var(--cream);color:var(--amber-dk);font-weight:800;display:flex;align-items:center;justify-content:center;border:1px solid var(--amber-lt)}
.buybox{background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:24px;text-align:center;margin:22px 0}
.price{font-size:1.9rem;font-weight:800}.price small{font-size:.85rem;color:var(--muted);font-weight:600}
.warn{background:color-mix(in srgb,var(--amber-lt) 50%,var(--card));border:1px solid var(--amber-lt);border-radius:12px;padding:12px 16px;font-size:.9rem}
.note{font-size:.85rem;color:var(--muted);margin-top:10px}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
@media(max-width:560px){.cmp{grid-template-columns:1fr}}
.cmp .card{margin:0}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}"""

PAGE = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KI-Sichtbarkeits-Audit — selbst prüfen, ob ChatGPT &amp; Co. dich nennen · aban news</title>
<meta name="description" content="Das KI-Sichtbarkeits-Audit: ein anpassbares Workbook, mit dem du in ~2 Stunden selbst prüfst, ob ChatGPT, Perplexity &amp; Google AI deine Firma nennen — plus 90-Tage-Maßnahmenplan. Einmalig, kein Abo.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/ki-sichtbarkeit-audit.html">
<meta property="og:title" content="KI-Sichtbarkeits-Audit — selbst prüfen, ob KI dich nennt">
<meta property="og:description" content="Workbook + 90-Tage-Plan: prüf in ~2 Stunden selbst, ob ChatGPT, Perplexity &amp; Google AI deine Firma nennen. Einmalig, kein Abo.">
<meta property="og:type" content="product">
<meta property="og:url" content="https://abannews.com/ki-sichtbarkeit-audit.html">
<meta property="og:image" content="https://abannews.com/og-audit.png">
<meta property="og:locale" content="de_DE"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"KI-Sichtbarkeits-Audit — selbst prüfen, ob KI dich nennt",
"description":"Anpassbares Workbook + 90-Tage-Maßnahmenplan, um selbst zu prüfen, ob ChatGPT, Perplexity und Google AI die eigene Firma nennen. Einmaliger Kauf, kein Abo.",
"brand":{"@type":"Organization","name":"aban news"},
"offers":{"@type":"Offer","price":"29","priceCurrency":"EUR","availability":"https://schema.org/InStock","url":"https://abannews.com/ki-sichtbarkeit-audit.html"}}
</script>
<style>__CSS__</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap">
  <a href="/" class="brand">aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a>
</div></header>
<main id="main"><div class="wrap">
  <section class="hero">
    <h1>Prüf <span class="a">selbst</span>, ob ChatGPT &amp; Co. dich nennen.</h1>
    <p class="lead">Immer mehr Kund:innen fragen KI nach Anbietern statt zu googeln. Das <strong>KI-Sichtbarkeits-Audit</strong> ist ein anpassbares Workbook: In rund zwei Stunden prüfst du selbst, ob ChatGPT, Perplexity &amp; Google AI dich nennen — und bekommst einen <strong>90-Tage-Maßnahmenplan</strong>. Einmal kaufen, kein Abo.</p>
    <p><a class="btn" href="#kaufen">Workbook holen (__PREIS__)</a>
       <a class="btn ghost" href="/ki-erwaehnungs-check.html">Erst gratis antesten →</a></p>
  </section>
  <section>
    <h2>So läuft das Audit</h2>
    <ol class="steps">
      <li><strong>Fragen sammeln.</strong> 10–15 echte Fragen, mit denen Kund:innen nach deinem Angebot suchen — Vorlagen je Branche dabei.</li>
      <li><strong>KI befragen.</strong> Dieselben Fragen in ChatGPT, Perplexity &amp; Google AI stellen, Antworten ins Protokoll eintragen.</li>
      <li><strong>Auswerten.</strong> Pro Frage festhalten: genannt / nicht genannt / Mitbewerber genannt — ergibt deinen Sichtbarkeits-Stand.</li>
      <li><strong>Ursachen finden.</strong> Checkliste: konsistente Daten, Schema-Markup, Verzeichnisse, Bewertungen, Inhalte.</li>
      <li><strong>90-Tage-Plan.</strong> Priorisierte Maßnahmen für Monat 1–3, mit dem Wichtigsten zuerst.</li>
      <li><strong>Nachmessen.</strong> Gleiches Protokoll nach 90 Tagen — siehst du schwarz auf weiß, was sich bewegt hat.</li>
    </ol>
  </section>
  <section>
    <h2>Audit oder Monitor — was passt?</h2>
    <div class="cmp">
      <div class="card"><h3>🔍 Audit (dieses Produkt)</h3><p><strong>__PREIS__ einmalig.</strong> Du machst es selbst, wann du willst. Volle Kontrolle, kein Abo. Ideal, wenn du es einmal gründlich wissen und selbst umsetzen willst.</p></div>
      <div class="card"><h3>📈 <a href="/ki-sichtbarkeit-monitor.html">Monitor</a></h3><p><strong>9 €/Monat.</strong> Wir prüfen monatlich für dich und schicken den Report. Ideal, wenn du dranbleiben willst, ohne selbst nachzumessen.</p></div>
    </div>
    <p class="note">Tipp: Mit dem Audit starten, danach optional auf den Monitor wechseln, um die Veränderung zu verfolgen.</p>
  </section>
  <section id="kaufen">
    <div class="buybox">
      <div class="price">__PREIS__<small> · einmalig · sofort als Download</small></div>
      <p>Workbook + Protokoll-Vorlage + 90-Tage-Plan als bearbeitbare Dateien. Für Selbstständige &amp; kleine Betriebe.</p>
      <p id="buywrap"><a class="btn" id="buybtn" href="#">Workbook holen</a></p>
      <p class="note">Abwicklung über Lemon Squeezy/Stripe (Rechnung inklusive).</p>
    </div>
    <div class="warn">⚠️ <strong>Ehrlich:</strong> KI-Antworten schwanken — niemand kann garantieren, dass du genannt wirst. Das Audit zeigt dir den Ist-Stand und die wirksamsten Hebel; gehen musst du sie selbst. Keine SEO-Wunder, keine erfundenen Zahlen.</div>
  </section>
  <section>
    <p>Schon weiter? <a href="/ki-sichtbarkeit.html">KI-Sichtbarkeit für deine Branche</a> · <a href="/ki-sichtbarkeit-buch.html">Das Buch dazu</a> · <a href="/start">Alles auf einen Blick</a></p>
  </section>
<script src="/js/checkout-config.js"></script>
<script>
var URL_=(window.ABAN_CHECKOUT&&window.ABAN_CHECKOUT.AUDIT_BUY_URL)||"";
(function(){var b=document.getElementById("buybtn");
if(URL_){b.href=URL_;b.target="_blank";b.rel="noopener";}else{b.href="mailto:hallo@abannews.com?subject=KI-Sichtbarkeits-Audit&body=Hallo%20Aban%2C%20ich%20m%C3%B6chte%20das%20KI-Sichtbarkeits-Audit-Workbook.";b.textContent="Per Mail bestellen";}})();
</script>
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/start">Alles auf einen Blick</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
</body>
</html>
"""

WORKBOOK = """# KI-Sichtbarkeits-Audit — prüf selbst, ob KI dich nennt

> Anpassbares Workbook für Selbstständige & kleine Betriebe. **Keine Garantie auf Nennung** —
> KI-Antworten schwanken von Tag zu Tag und je nach Formulierung. Dieses Audit zeigt dir den
> Ist-Stand und die wirksamsten Hebel. Keine erfundenen Zahlen, keine SEO-Wunder.

## Warum das zählt
Immer mehr Menschen fragen ChatGPT, Perplexity oder Google AI nach Anbietern, statt zu googeln.
Wirst du dort nicht genannt, existierst du für diese Kund:innen nicht. Das Audit macht deinen
Stand sichtbar — und gibt dir einen Plan, ihn zu verbessern.

## Schritt 1 — Deine 10–15 Such-Fragen
Schreib die Fragen auf, mit denen echte Kund:innen nach deinem Angebot suchen würden. Mischung aus:
- **Lokal:** „Bester/e [Beruf] in [Ort]?", „[Leistung] in [Region] empfehlen?"
- **Problem:** „Wer hilft mir bei [Problem, das du löst]?"
- **Vergleich:** „[Leistung] Anbieter Vergleich [Region]"
- **Direkt:** „Was haltet ihr von [dein Firmenname]?"

Branchen-Startfragen findest du auch auf abannews.com/ki-sichtbarkeit (deine Branche wählen).

## Schritt 2 — KI befragen (Protokoll)
Stell **jede** Frage in mindestens drei Tools: ChatGPT, Perplexity, Google AI (Übersicht/Gemini).
Tipp: in einem frischen Chat ohne Vorgeschichte, damit dich das Tool nicht aus dem Verlauf „kennt".

| # | Frage | ChatGPT | Perplexity | Google AI |
|---|-------|---------|------------|-----------|
| 1 |       | ☐ genannt ☐ nein ☐ Mitbewerb | ☐ ☐ ☐ | ☐ ☐ ☐ |
| 2 |       | ☐ ☐ ☐ | ☐ ☐ ☐ | ☐ ☐ ☐ |
| … |       |        |            |           |

Notiere bei „Mitbewerb": **wer** genannt wird — das sind deine Sichtbarkeits-Vorbilder.

## Schritt 3 — Auswerten (dein Ist-Stand)
- Genannt in **___ von ___** Antworten → grobe Sichtbarkeits-Quote.
- In welchen Fragen wirst du **nie** genannt? (Das sind deine Lücken.)
- Welche Mitbewerber tauchen immer wieder auf? (Von denen lernen.)
- Stimmen die genannten Infos über dich (Ort, Leistung, Kontakt)? Falschangaben notieren.

## Schritt 4 — Ursachen-Checkliste
Hak ab, was bereits sauber ist — der Rest sind deine Baustellen:
- [ ] **Konsistente Basis-Daten** (Name, Adresse, Leistung) auf Website, Google-Unternehmensprofil, Branchenverzeichnissen — überall identisch
- [ ] **Strukturierte Daten** (Schema.org: LocalBusiness / Organization / Service) auf der Website
- [ ] **Einträge in relevanten Verzeichnissen** deiner Branche/Region
- [ ] **Bewertungen** (Google, branchenüblich) — aktuell und in ausreichender Zahl
- [ ] **Inhalte, die echte Fragen beantworten** (FAQ, Leistungsseiten in Klartext)
- [ ] **Eindeutige Leistungs-/Ortsangaben** im Seitentext (nicht nur im Logo/Bild)
- [ ] **Erwähnungen auf Dritt-Seiten** (Presse, Partner, Verbände)

## Schritt 5 — 90-Tage-Maßnahmenplan
Das Wichtigste zuerst. Pro Monat 2–3 Maßnahmen, nicht mehr.

**Monat 1 — Fundament**
- Basis-Daten überall vereinheitlichen (häufigster Grund für Nicht-Nennung).
- Google-Unternehmensprofil vervollständigen/korrigieren.
- Schema-Markup auf Startseite + wichtigste Leistungsseite.

**Monat 2 — Substanz**
- 3–5 echte Kund:innen-Fragen als Klartext-Seiten/FAQ beantworten.
- In 2–3 relevante Branchen-/Regionalverzeichnisse eintragen.
- Aktiv um Bewertungen bitten (ehrlich, kein Kauf).

**Monat 3 — Reichweite & Beleg**
- 1–2 Erwähnungen auf Dritt-Seiten anstoßen (Partner, lokale Presse, Verband).
- Lücken-Fragen aus Schritt 3 gezielt mit Inhalten bedienen.
- Alte/falsche Einträge im Netz korrigieren oder löschen lassen.

## Schritt 6 — Nachmessen (Tag 90)
Wiederhol Schritt 2 mit **demselben** Protokoll und denselben Fragen.
- Neue Quote: genannt in **___ von ___** (vorher: ___ / ___).
- Wo hat sich etwas bewegt? Was hängt noch?
- Nächste Runde planen — oder den Monitor (9 €/Monat) übernehmen lassen, der monatlich misst.

## Ehrlicher Schluss
Sichtbarkeit in KI ist kein Schalter, sondern Pflege: saubere Daten, echte Inhalte, echte Bewertungen.
Wer das konsequent macht, wird mit der Zeit häufiger genannt — versprechen kann das niemand seriös.
Dieses Audit sorgt dafür, dass du an den **richtigen** Stellen arbeitest und deinen Fortschritt siehst.
"""


def font(size, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.ellipse([W-520,-260,W+260,360], fill=CR); d.rectangle([0,0,16,H], fill=A)
    d.text((70,70), "☕  aban news", font=font(34), fill=AD)
    bf = font(24); badge = "SELBST-AUDIT · EINMALIG"
    bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=CR)
    d.text((92,152), badge, font=bf, fill=AD)
    d.text((70,210), "Nennt KI", font=font(82), fill=INK)
    d.text((70,210+90), "deine Firma?", font=font(82), fill=INK)
    d.text((70,210+90+98), "Selbst prüfen · 90-Tage-Plan · kein Abo", font=font(34), fill=AD)
    d.text((70,H-78), "Für Selbstständige & kleine Betriebe  ·  abannews.com/ki-audit", font=font(26, bold=False), fill=MU)
    img.save(os.path.join(ROOT, "og-audit.png"), "PNG")


def main():
    open(os.path.join(ROOT, "ki-sichtbarkeit-audit.html"), "w", encoding="utf-8").write(
        PAGE.replace("__CSS__", CSS).replace("__PREIS__", PREIS))
    os.makedirs(os.path.join(ROOT, "audit"), exist_ok=True)
    open(os.path.join(ROOT, "audit", "ki-sichtbarkeit-audit.md"), "w", encoding="utf-8").write(WORKBOOK)
    og()
    print("✓ KI-Sichtbarkeits-Audit: Seite + Workbook + OG erzeugt")


if __name__ == "__main__":
    main()
