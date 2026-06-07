#!/usr/bin/env python3
"""generate_sichtbarkeit_branchen.py — branchen-spitze KI-Sichtbarkeits-Funnel-Seiten.

Erzeugt pro Branche eine Landingpage `ki-sichtbarkeit-<slug>.html`, die in den
bestehenden Funnel mündet: Gratis-Check (ki-erwaehnungs-check) → Monitor (9 €/M) →
Komplett-Paket (29 €). Markentreu (gleiche Inline-Shell wie ki-sichtbarkeit-paket.html).

Hintergrund (Studien 2026): ChatGPT empfiehlt nur ~1,2 % der lokalen Betriebe aktiv,
~45 % der Konsument:innen nutzen KI für lokale Empfehlungen, im DACH-Mittelstand
„erfindet" ChatGPT bis zu 96 % der Geschäftsführer. Ehrlich, ohne Garantie-Versprechen.

Run:  python3 generate_sichtbarkeit_branchen.py
"""
import html
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

BRANCHEN = [
    {
        "slug": "handwerk", "kurz": "Handwerk", "betrieb": "deinen Handwerksbetrieb",
        "wer": "Handwerksbetriebe", "stadt": "Elektriker in Bern",
        "fragen": ["Welcher Elektriker in meiner Nähe ist zuverlässig?",
                   "Guter Sanitär-Notdienst in [Stadt]?",
                   "Wer baut mir eine Pergola in der Region?"],
        "pain": "Aufträge gehen an den Betrieb, den die KI zuerst nennt — nicht unbedingt an den besten.",
    },
    {
        "slug": "praxen", "kurz": "Arztpraxen", "betrieb": "deine Praxis",
        "wer": "Arzt- & Therapie-Praxen", "stadt": "Hausarzt in Belp",
        "fragen": ["Welcher Hausarzt in [Ort] nimmt neue Patient:innen?",
                   "Gute Physiotherapie in meiner Nähe?",
                   "Zahnarzt mit kurzfristigem Termin in [Stadt]?"],
        "pain": "Patient:innen suchen zunehmend per KI — wer dort fehlt, wird seltener gefunden.",
    },
    {
        "slug": "steuerberatung", "kurz": "Steuerberatung", "betrieb": "deine Kanzlei",
        "wer": "Steuerkanzleien", "stadt": "Steuerberater für Selbstständige",
        "fragen": ["Steuerberater für Selbstständige in [Stadt]?",
                   "Wer kennt sich mit E-Commerce-Buchhaltung aus?",
                   "Steuerkanzlei mit digitaler Zusammenarbeit?"],
        "pain": "Mandant:innen-Recherche beginnt oft bei ChatGPT — Sichtbarkeit dort entscheidet mit.",
    },
    {
        "slug": "kanzleien", "kurz": "Anwaltskanzleien", "betrieb": "deine Kanzlei",
        "wer": "Anwaltskanzleien", "stadt": "Anwalt für Arbeitsrecht",
        "fragen": ["Anwalt für Arbeitsrecht in [Stadt]?",
                   "Wer hilft bei einem Mietstreit in der Region?",
                   "Kanzlei für Vertragsrecht für kleine Firmen?"],
        "pain": "Wer Rat sucht, fragt heute oft erst die KI — taucht deine Kanzlei dort auf?",
    },
    {
        "slug": "gastronomie", "kurz": "Gastronomie", "betrieb": "dein Lokal",
        "wer": "Restaurants & Cafés", "stadt": "Restaurant mit Terrasse",
        "fragen": ["Gutes Restaurant mit Terrasse in [Stadt]?",
                   "Wo gibt es vegane Küche in meiner Nähe?",
                   "Café zum Arbeiten mit WLAN in [Ort]?"],
        "pain": "Gäste lassen sich von KI Empfehlungen geben — wer fehlt, verliert Tische.",
    },
]

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff;--ok:#059669}
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
.btn:hover{filter:brightness(1.05)}
.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.hero{padding:46px 0 18px;text-align:center}
.hero h1{font-size:clamp(26px,4.6vw,38px);font-weight:800;letter-spacing:-.02em;line-height:1.12;margin-bottom:12px}
.hero h1 .a{color:var(--amber)}
.hero p.lead{font-size:clamp(16px,2.2vw,18px);color:var(--ink2);max-width:620px;margin:0 auto}
section{padding:14px 0}h2{font-size:1.3rem;margin:18px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:14px 0}
ul{margin:8px 0 8px 20px}li{margin:5px 0}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center}
.stat b{display:block;font-size:1.7rem;font-weight:800;color:var(--amber-dk);line-height:1.1}
.stat span{font-size:.8rem;color:var(--muted)}
.buybox{background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:24px;text-align:center;margin:22px 0}
.price{font-size:1.6rem;font-weight:800}.price small{font-size:.85rem;color:var(--muted);font-weight:600}
.note{font-size:.85rem;color:var(--muted);margin-top:10px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}"""


def e(s):
    return html.escape(str(s))


def page(b):
    slug = b["slug"]
    url = f"https://abannews.com/ki-sichtbarkeit-{slug}.html"
    fragen = "".join(f"<li>„{e(q)}“</li>" for q in b["fragen"])
    title = f"Empfiehlt ChatGPT {b['kurz']}? — KI-Sichtbarkeit für {b['wer']} · aban news"
    desc = (f"Wird {b['kurz']} von ChatGPT, Perplexity & Google AI empfohlen? "
            f"Gratis prüfen und mit dem Monitor dranbleiben — ehrlich, ohne Hype.")
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:title" content="Empfiehlt ChatGPT {e(b['wer'])}? Die meisten findet die KI nicht.">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://abannews.com/og-sichtbarkeit-paket.png">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"Service","name":"KI-Sichtbarkeit für {e(b['wer'])}","description":"{e(desc)}","provider":{{"@type":"Organization","name":"aban news","url":"https://abannews.com"}},"areaServed":"DACH"}}
</script>
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap">
  <a href="/" class="brand">aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a>
</div></header>

<main id="main"><div class="wrap">
  <section class="hero">
    <h1>Empfiehlt ChatGPT <span class="a">{e(b['wer'])}</span>?</h1>
    <p class="lead">Immer mehr Menschen fragen ChatGPT, Perplexity &amp; Google AI nach Anbietern statt zu googeln. {e(b['pain'])} Prüf in 1 Minute, ob die KI {e(b['betrieb'])} kennt — und bleib dran.</p>
    <p>
      <a class="btn" href="/ki-erwaehnungs-check.html">Jetzt gratis prüfen →</a>
      <a class="btn ghost" href="#dranbleiben">So wirst du gefunden</a>
    </p>
  </section>

  <section>
    <div class="stats">
      <div class="stat"><b>~1,2 %</b><span>der lokalen Betriebe empfiehlt ChatGPT aktiv</span></div>
      <div class="stat"><b>~45 %</b><span>nutzen KI für lokale Empfehlungen</span></div>
      <div class="stat"><b>bis 96 %</b><span>der DACH-Geschäftsführer „erfindet“ ChatGPT</span></div>
    </div>
    <p class="note">Quellen: Branchen-/KI-Sichtbarkeitsstudien 2026. Zahlen variieren je Studie — die Richtung ist eindeutig: Wer in KI-Antworten fehlt oder falsch dargestellt ist, verliert Anfragen.</p>
  </section>

  <section>
    <h2>Das fragen Kund:innen die KI heute</h2>
    <div class="card"><ul>{fragen}</ul></div>
    <p>Bei solchen Fragen nennt die KI ein paar Namen — und entscheidet so mit, wer angefragt wird. Steht {e(b['betrieb'])} dort? <a href="/ki-erwaehnungs-check.html">Gratis prüfen →</a></p>
  </section>

  <section id="dranbleiben">
    <h2>So wirst du gefunden — und bleibst dran</h2>
    <div class="buybox">
      <div class="price">9 €<small> / Monat · KI-Sichtbarkeits-Monitor</small></div>
      <p>Monatlicher Report, ob KI {e(b['betrieb'])} nennt — mit Veränderung zum Vormonat und konkreten Maßnahmen (Schema, Verzeichnisse, Bewertungen, NAP-Konsistenz). Jederzeit kündbar, kein Login.</p>
      <p><a class="btn" href="/ki-sichtbarkeit-monitor.html">Monitor ansehen →</a>
         <a class="btn ghost" href="/ki-sichtbarkeit-paket.html">Komplett-Paket (29 €) →</a></p>
    </div>
    <p class="note">Lieber selbst lesen? Das <a href="/ki-sichtbarkeit-buch.html">Buch „Von KI gefunden werden“</a> erklärt den ganzen Weg.</p>
  </section>

  <section>
    <h2>Ehrlich, was es ist — und was nicht</h2>
    <div class="card"><ul>
      <li><strong>Keine Garantie</strong> auf Nennung — KI-Sichtbarkeit ist beeinflussbar, nicht kaufbar.</li>
      <li>Der Check/Monitor ist ein <strong>Stellvertreter-Check + Maßnahmenplan</strong>, kein Live-Abgriff von ChatGPT.</li>
      <li>Keine Rechts-/SEO-Garantie — gesunder Menschenverstand und Dranbleiben zählen mehr als jeder Trick.</li>
    </ul></div>
  </section>
</div></main>

<footer><div class="wrap">
  © 2026 aban news · Allen Chour · Belp (CH) ·
  <a href="/ki-erwaehnungs-check.html">Gratis-Check</a> ·
  <a href="/ki-sichtbarkeit-monitor.html">Monitor</a> ·
  <a href="/start">Alles auf einen Blick</a> ·
  <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a>
</div></footer>
</body>
</html>
"""


def main():
    written = []
    for b in BRANCHEN:
        path = os.path.join(ROOT, f"ki-sichtbarkeit-{b['slug']}.html")
        open(path, "w", encoding="utf-8").write(page(b))
        written.append(os.path.basename(path))
    print("✓ Branchen-Seiten erzeugt:", ", ".join(written))


if __name__ == "__main__":
    main()
