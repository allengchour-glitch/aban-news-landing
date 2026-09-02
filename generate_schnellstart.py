#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_schnellstart.py — Produkt „KI-Schnellstart" (KMU-Enablement, Lücke 3).

Erzeugt die Verkaufsseite ki-schnellstart.html, das Deliverable
schnellstart/ki-einfuehrung-30-tage.md (echter 30-Tage-Plan) und og-schnellstart.png.
Zielgruppe: Selbstständige/kleine Teams, die KI strukturiert einführen wollen
(„Wille da, Umsetzung fehlt") — anti-hype, ohne erfundene Zahlen.

Run:  python3 generate_schnellstart.py
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
.buybox{background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:24px;text-align:center;margin:22px 0}
.price{font-size:1.9rem;font-weight:800}.price small{font-size:.85rem;color:var(--muted);font-weight:600}
.warn{background:color-mix(in srgb,var(--amber-lt) 50%,var(--card));border:1px solid var(--amber-lt);border-radius:12px;padding:12px 16px;font-size:.9rem}
.note{font-size:.85rem;color:var(--muted);margin-top:10px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}"""

PAGE = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KI im Betrieb einführen — in 30 Tagen, ohne Chaos · aban news</title>
<meta name="description" content="Der KI-Schnellstart: ein ehrlicher 30-Tage-Plan, um KI im kleinen Team einzuführen — Datenschutz-Leitplanken, Tool-Auswahl, Team-Onboarding. Vorlagen zum Anpassen.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/ki-schnellstart.html">
<meta property="og:title" content="KI im Betrieb einführen — in 30 Tagen, ohne Chaos">
<meta property="og:description" content="Ehrlicher 30-Tage-Plan + Datenschutz-Leitplanken + Tool-Auswahl + Team-Onboarding. Für Selbstständige & kleine Teams.">
<meta property="og:type" content="product">
<meta property="og:url" content="https://abannews.com/ki-schnellstart.html">
<meta property="og:image" content="https://abannews.com/og-schnellstart.png">
<meta property="og:locale" content="de_DE"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"KI-Schnellstart — KI im Betrieb in 30 Tagen",
"description":"Ehrlicher 30-Tage-Einführungsplan für KI in Selbstständigkeit/kleinen Teams: Datenschutz-Leitplanken, Tool-Auswahl, Team-Onboarding.",
"brand":{"@type":"Organization","name":"aban news"},
"offers":{"@type":"Offer","price":"29","priceCurrency":"EUR","availability":"https://schema.org/InStock","url":"https://abannews.com/ki-schnellstart.html"}}
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
    <h1>KI im Betrieb einführen — <span class="a">in 30 Tagen</span>, ohne Chaos.</h1>
    <p class="lead">Viele wollen KI nutzen, aber es fehlt die Zeit und ein klarer Plan — und der Datenschutz schreckt ab. Der KI-Schnellstart gibt dir einen <strong>ehrlichen 30-Tage-Fahrplan</strong> mit Leitplanken, Tool-Auswahl und Team-Onboarding. Zum Anpassen, ohne Hype.</p>
    <p><a class="btn" href="#kaufen">Workbook holen (__PREIS__)</a>
       <a class="btn ghost" href="https://foerder.abannews.com">Gibt's Fördergeld? →</a></p>
  </section>
  <section>
    <h2>Was drin ist</h2>
    <div class="card"><h3>1 · 30-Tage-Plan (4 Wochen)</h3><p>Orientierung &amp; Datenschutz → erste Use-Cases → Tools &amp; Richtlinie → verankern &amp; messen. Konkrete Schritte, nicht nur Theorie.</p></div>
    <div class="card"><h3>2 · Datenschutz-Leitplanken</h3><p>Was nie in KI-Tools gehört, AVV/EU-AI-Act-Hinweise, sichere Standard-Abläufe — als Checkliste.</p></div>
    <div class="card"><h3>3 · Tool-Auswahl-Hilfe</h3><p>Wie du aus 100+ Tools die 2–3 richtigen wählst (verlinkt auf den ehrlichen <a href="https://radar.abannews.com/">KI-Tool-Radar</a>).</p></div>
    <div class="card"><h3>4 · Team-Onboarding</h3><p>Kurze Richtlinie + erste Prompts, damit alle mitziehen — ohne Schulungs-Marathon.</p></div>
  </section>
  <section id="kaufen">
    <div class="buybox">
      <div class="price">__PREIS__<small> · einmalig · sofort als Download</small></div>
      <p>Workbook + Checklisten als bearbeitbare Dateien. Für Selbstständige &amp; kleine Teams.</p>
      <p id="buywrap"><a class="btn" id="buybtn" href="#">Workbook holen</a></p>
      <p class="note">Abwicklung über Lemon Squeezy/Stripe (Rechnung inklusive).</p>
    </div>
    <div class="warn">⚠️ <strong>Ehrlich:</strong> Ein Plan ersetzt nicht das Tun. KI bringt erst Nutzen, wenn ihr 1–2 echte Abläufe damit verbessert — der Schnellstart macht genau das machbar, verspricht aber kein Wunder.</div>
  </section>
  <section>
    <p>Schon weiter? <a href="/ki-sichtbarkeit.html">Wirst du von KI gefunden?</a> · <a href="/shop.html">Branchen-Starter-Kits</a> · <a href="/start">Alles auf einen Blick</a></p>
  </section>
<script src="/js/checkout-config.js"></script>
<script>
var URL_=(window.ABAN_CHECKOUT&&window.ABAN_CHECKOUT.SCHNELLSTART_BUY_URL)||"";
(function(){var b=document.getElementById("buybtn");
if(URL_){b.href=URL_;b.target="_blank";b.rel="noopener";}else{b.href="mailto:hallo@abannews.com?subject=KI-Schnellstart%20Workbook&body=Hallo%20Aban%2C%20ich%20m%C3%B6chte%20das%20KI-Schnellstart-Workbook.";b.textContent="Per Mail bestellen";}})();
</script>
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/start">Alles auf einen Blick</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
</body>
</html>
"""

WORKBOOK = """# KI-Schnellstart — KI im Betrieb in 30 Tagen

> Anpassbarer Fahrplan für Selbstständige & kleine Teams. **Keine Rechts-/Datenschutzberatung** —
> Datenschutz-Punkte vor dem Einsatz fachkundig prüfen. Erfinde keine Use-Cases, die du nicht brauchst.

## Grundregel
KI bringt erst Nutzen, wenn ihr **1–2 echte Abläufe** damit messbar verbessert. Lieber zwei Dinge richtig
als zehn halb. Mensch entscheidet, KI entwirft.

## Woche 1 — Orientierung & Leitplanken
- Tag 1–2: Sammelt 5 nervige, wiederkehrende Aufgaben (Texte, Recherche, Antworten). Wählt 2 aus.
- Tag 3: Datenschutz-Leitplanke festlegen — **was nie in KI-Tools gehört** (Namen, Kund:innen-/Patientendaten,
  Verträge, Beträge). Schreibt es in einen Satz an die Wand.
- Tag 4: Ein freigegebenes Tool wählen (Start: ein gutes Chat-Tool). Konto anlegen, niemand nutzt Privat-Accounts.
- Tag 5: 3 sichere Prompts für die 2 Aufgaben schreiben (ohne sensible Daten). Testen.

## Woche 2 — Erste echte Use-Cases
- Setzt die 2 Aufgaben diese Woche **nur** mit KI-Entwurf + menschlicher Endkontrolle um.
- Notiert: Was spart Zeit? Wo musstet ihr nacharbeiten? (Ehrlich — nicht schönreden.)
- Entscheidung: behalten, anpassen oder verwerfen. Mind. 1 Ablauf sollte bleiben.

## Woche 3 — Tools & Richtlinie
- Prüft, ob ein 2. Tool wirklich nötig ist (KI-Tool-Radar nutzen: radar.abannews.com). Max. 2–3 Tools.
- Schreibt eine **1-seitige KI-Richtlinie**: erlaubte Tools, verbotene Daten, Freigabe, EU-AI-Act-Hinweis.
- AVV/Datenverarbeitung der genutzten Tools prüfen (Hosting-Standort, Drittland).

## Woche 4 — Verankern & messen
- Onboarding: 30 Minuten mit dem Team — Richtlinie + die bewährten Prompts zeigen.
- Legt **eine Kennzahl** fest (z. B. „Stunden/Woche gespart" oder „Antwortzeit"). Erste Messung notieren.
- Reviewtermin in 4 Wochen setzen: behalten, ausweiten, korrigieren.

## Förderung (DACH)
KI-Einführung wird in vielen Programmen bezuschusst. Überblick: foerder.abannews.com. **Vor** dem Kauf prüfen,
ob ein Programm passt — oft ist Beratung/Weiterbildung förderfähig.

## Checkliste (zum Abhaken)
- [ ] 2 konkrete Abläufe ausgewählt
- [ ] Datenschutz-Leitplanke in einem Satz
- [ ] 1 freigegebenes Tool, keine Privat-Accounts
- [ ] 3 sichere Prompts getestet
- [ ] 1-seitige KI-Richtlinie geschrieben
- [ ] AVV/Hosting der Tools geprüft
- [ ] Team-Onboarding (30 Min) gemacht
- [ ] 1 Kennzahl + Reviewtermin gesetzt
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
    bf = font(24); badge = "30-TAGE-PLAN · KMU"
    bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=CR)
    d.text((92,152), badge, font=bf, fill=AD)
    d.text((70,210), "KI im Betrieb", font=font(82), fill=INK)
    d.text((70,210+90), "einführen", font=font(82), fill=INK)
    d.text((70,210+90+98), "Ehrlicher Fahrplan · Datenschutz · Tools · Team", font=font(34), fill=AD)
    d.text((70,H-78), "Für Selbstständige & kleine Teams  ·  abannews.com/ki-schnellstart", font=font(26, bold=False), fill=MU)
    img.save(os.path.join(ROOT, "og-schnellstart.png"), "PNG")


def main():
    open(os.path.join(ROOT, "ki-schnellstart.html"), "w", encoding="utf-8").write(
        PAGE.replace("__CSS__", CSS).replace("__PREIS__", PREIS))
    os.makedirs(os.path.join(ROOT, "schnellstart"), exist_ok=True)
    open(os.path.join(ROOT, "schnellstart", "ki-einfuehrung-30-tage.md"), "w", encoding="utf-8").write(WORKBOOK)
    og()
    print("✓ KI-Schnellstart: Seite + Workbook + OG erzeugt")


if __name__ == "__main__":
    main()
