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
import glob
import html
import os

from PIL import Image, ImageDraw, ImageFont

_AMBER, _AMBER_DK, _CREAM, _INK, _MUTED, _BG = (217,119,6),(180,83,9),(254,243,199),(31,41,55),(107,114,128),(255,251,245)


def _font(size, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def og(b):
    """Per-Branche OG-Bild (1200×630) — schöner Teilen-Look."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), _BG); d = ImageDraw.Draw(img)
    d.ellipse([W-520,-260,W+260,360], fill=_CREAM); d.rectangle([0,0,16,H], fill=_AMBER)
    d.text((70,70), "☕  aban news", font=_font(34), fill=_AMBER_DK)
    bf = _font(24); badge = "WIRST DU VON KI EMPFOHLEN?"
    bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=_CREAM)
    d.text((92,152), badge, font=bf, fill=_AMBER_DK)
    d.text((70,212), "Empfiehlt ChatGPT", font=_font(60), fill=_INK)
    d.text((70,212+72), e_plain(b["wer"]) + "?", font=_font(60), fill=_AMBER)
    d.text((70,212+72+96), "1,2 % · 45 % · 96 % — die Lücke ist real.", font=_font(36), fill=_AMBER_DK)
    d.text((70,H-78), "Gratis prüfen + dranbleiben  ·  abannews.com/ki-sichtbarkeit", font=_font(26, bold=False), fill=_MUTED)
    img.save(os.path.join(ROOT, f"og-ki-sichtbar-{b['slug']}.png"), "PNG")


def e_plain(s):
    return str(s)

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
    {
        "slug": "coaches", "kurz": "Coaches", "betrieb": "dein Coaching-Angebot",
        "wer": "Coaches & Berater:innen", "stadt": "Business-Coach",
        "fragen": ["Guter Business-Coach in meiner Nähe?",
                   "Wer hilft bei beruflicher Neuorientierung?",
                   "Coach für Führungskräfte in [Stadt]?"],
        "pain": "Klient:innen lassen sich Coaches von KI empfehlen — wer fehlt, wird seltener gebucht.",
    },
    {
        "slug": "immobilienmakler", "kurz": "Immobilienmakler", "betrieb": "dein Maklerbüro",
        "wer": "Immobilienmakler:innen", "stadt": "Immobilienmakler",
        "fragen": ["Guter Immobilienmakler in [Stadt]?",
                   "Wer verkauft Wohnungen in meiner Region?",
                   "Makler mit Erfahrung bei Erbimmobilien?"],
        "pain": "Verkäufer:innen fragen KI nach Maklern — Sichtbarkeit dort bringt Mandate.",
    },
    {
        "slug": "friseure", "kurz": "Friseure & Salons", "betrieb": "deinen Salon",
        "wer": "Friseur:innen & Salons", "stadt": "Friseur",
        "fragen": ["Guter Friseur in meiner Nähe?",
                   "Wo gibt es Balayage in [Stadt]?",
                   "Salon mit kurzfristigem Termin?"],
        "pain": "Kund:innen lassen sich Salons von KI empfehlen — wer fehlt, verliert Termine.",
    },
    {
        "slug": "fotografen", "kurz": "Fotograf:innen", "betrieb": "dein Fotostudio",
        "wer": "Fotograf:innen", "stadt": "Hochzeitsfotograf",
        "fragen": ["Guter Hochzeitsfotograf in [Stadt]?",
                   "Wer macht Business-Porträts in meiner Nähe?",
                   "Fotograf für Immobilienfotos in der Region?"],
        "pain": "Aufträge gehen an die Namen, die die KI nennt.",
    },
    {
        "slug": "architekten", "kurz": "Architekturbüros", "betrieb": "dein Büro",
        "wer": "Architekturbüros", "stadt": "Architekt für Einfamilienhaus",
        "fragen": ["Architekt für ein Einfamilienhaus in [Region]?",
                   "Wer plant nachhaltige Sanierungen?",
                   "Architekturbüro mit Erfahrung bei Umbauten?"],
        "pain": "Bauherr:innen recherchieren per KI — dort genannt zu werden bringt Anfragen.",
    },
    {
        "slug": "fitnessstudios", "kurz": "Fitnessstudios", "betrieb": "dein Studio",
        "wer": "Fitnessstudios", "stadt": "Fitnessstudio mit Kursen",
        "fragen": ["Gutes Fitnessstudio in meiner Nähe?",
                   "Wo gibt es Personal Training in [Stadt]?",
                   "Studio mit Kursen am Abend?"],
        "pain": "Mitglieder suchen Studios per KI-Empfehlung — wer fehlt, verliert Anmeldungen.",
    },
    {
        "slug": "zahnaerzte", "kurz": "Zahnarztpraxen", "betrieb": "deine Zahnarztpraxis",
        "wer": "Zahnärzt:innen", "stadt": "Zahnarzt mit kurzfristigem Termin",
        "fragen": ["Guter Zahnarzt in meiner Nähe?",
                   "Wo gibt es Angstpatienten-Behandlung in [Stadt]?",
                   "Zahnarzt mit kurzfristigem Termin?"],
        "pain": "Neupatient:innen suchen Praxen per KI — wer fehlt, verliert Termine.",
    },
    {
        "slug": "physiotherapie", "kurz": "Physiotherapie", "betrieb": "deine Praxis",
        "wer": "Physiotherapeut:innen", "stadt": "Physiotherapie mit Termin",
        "fragen": ["Gute Physiotherapie in meiner Nähe?",
                   "Wo gibt es manuelle Therapie in [Stadt]?",
                   "Physio mit kurzfristigem Termin?"],
        "pain": "Patient:innen lassen sich Praxen von KI empfehlen — wer fehlt, verliert Anfragen.",
    },
    {
        "slug": "kfz-werkstaetten", "kurz": "KFZ-Werkstätten", "betrieb": "deine Werkstatt",
        "wer": "Autowerkstätten", "stadt": "Werkstatt in [Stadt]",
        "fragen": ["Gute Autowerkstatt in meiner Nähe?",
                   "Wo kann ich günstig reparieren lassen in [Stadt]?",
                   "Werkstatt mit schnellem Termin?"],
        "pain": "Autofahrer:innen fragen KI nach Werkstätten — wer fehlt, verliert Aufträge.",
    },
    {
        "slug": "elektriker", "kurz": "Elektriker", "betrieb": "deinen Betrieb",
        "wer": "Elektroinstallateur:innen", "stadt": "Elektriker in [Stadt]",
        "fragen": ["Elektriker in meiner Nähe?",
                   "Wer macht Elektro-Notdienst in [Stadt]?",
                   "Elektriker mit kurzfristigem Termin?"],
        "pain": "Kund:innen suchen Handwerker per KI — wer fehlt, verliert Aufträge.",
    },
    {
        "slug": "maler", "kurz": "Maler & Lackierer", "betrieb": "deinen Betrieb",
        "wer": "Maler:innen", "stadt": "Maler in [Stadt]",
        "fragen": ["Guter Maler in meiner Nähe?",
                   "Wer streicht meine Wohnung in [Stadt]?",
                   "Maler mit kurzfristigem Termin?"],
        "pain": "Auftraggeber:innen fragen KI nach Malern — wer fehlt, verliert Aufträge.",
    },
    {
        "slug": "kosmetikstudios", "kurz": "Kosmetik & Nagelstudios", "betrieb": "dein Studio",
        "wer": "Kosmetik- & Nagelstudios", "stadt": "Kosmetikstudio in [Stadt]",
        "fragen": ["Gutes Kosmetikstudio in meiner Nähe?",
                   "Wo gibt es Maniküre in [Stadt]?",
                   "Studio mit Termin am Wochenende?"],
        "pain": "Kund:innen lassen sich Studios von KI empfehlen — wer fehlt, verliert Termine.",
    },
    {
        "slug": "hotels", "kurz": "Hotels & Pensionen", "betrieb": "dein Haus",
        "wer": "Hotels & Pensionen", "stadt": "Hotel in [Stadt]",
        "fragen": ["Gutes Hotel in [Stadt]?",
                   "Wo übernachten mit Hund in [Ort]?",
                   "Hotel mit Parkplatz zentral?"],
        "pain": "Reisende lassen sich Unterkünfte von KI empfehlen — wer fehlt, verliert Buchungen.",
    },
    {
        "slug": "baeckereien", "kurz": "Bäckereien & Konditoreien", "betrieb": "deine Bäckerei",
        "wer": "Bäckereien & Konditoreien", "stadt": "Bäckerei in [Stadt]",
        "fragen": ["Gute Bäckerei in meiner Nähe?",
                   "Wo gibt es glutenfreies Brot in [Stadt]?",
                   "Konditorei für Torten auf Bestellung?"],
        "pain": "Kund:innen fragen KI nach Bäckereien — wer fehlt, verliert Laufkundschaft.",
    },
    {
        "slug": "tierarztpraxen", "kurz": "Tierarztpraxen", "betrieb": "deine Tierarztpraxis",
        "wer": "Tierärzt:innen", "stadt": "Tierarzt mit Notdienst",
        "fragen": ["Guter Tierarzt in meiner Nähe?",
                   "Wo gibt es Tierarzt-Notdienst in [Stadt]?",
                   "Tierarzt mit kurzfristigem Termin?"],
        "pain": "Tierhalter:innen suchen Praxen per KI — wer fehlt, verliert Patient:innen.",
    },
    {
        "slug": "optiker", "kurz": "Optiker", "betrieb": "dein Geschäft",
        "wer": "Optiker:innen", "stadt": "Optiker in [Stadt]",
        "fragen": ["Guter Optiker in meiner Nähe?",
                   "Wo gibt es einen Sehtest in [Stadt]?",
                   "Optiker mit schneller Brille?"],
        "pain": "Kund:innen fragen KI nach Optikern — wer fehlt, verliert Verkäufe.",
    },
]

# Sichtbarkeits-Slug -> Shop-Kit-Slug (Starter-Kit-Cross-Link) und Compliance-Slug
KIT = {"handwerk": "handwerker", "praxen": "aerzte", "steuerberatung": "steuerberater",
       "kanzleien": "anwaelte", "gastronomie": "gastronomie", "coaches": "coaches",
       "immobilienmakler": "immobilienmakler", "friseure": "friseure", "fotografen": "fotografen",
       "architekten": "architekten", "fitnessstudios": "fitnessstudios"}
COMPLIANCE = {"praxen": "aerzte", "kanzleien": "anwaelte", "steuerberatung": "steuerberater"}

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
            f"Gratis prüfen und mit dem Monitor dranbleiben.")
    kit = KIT.get(slug)
    comp = COMPLIANCE.get(slug)
    cross = ""
    if kit or comp:
        links = ""
        if kit:
            links += f'<a class="btn ghost" href="/shop.html#kit-{kit}">Starter-Kit für {e(b["kurz"])} →</a> '
        if comp:
            links += f'<a class="btn ghost" href="/ki-compliance-{comp}.html">KI rechtssicher nutzen →</a>'
        cross = f'  <section><h2>Mehr für {e(b["kurz"])}</h2><p>{links}</p></section>\n'
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
<meta property="og:image" content="https://abannews.com/og-ki-sichtbar-{slug}.png">
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
    <p class="note">Den Maßnahmen-Report kann dir die KI <strong>sofort automatisch erstellen</strong> — <a href="/ki-audit.html">KI-Sichtbarkeits-Audit (aban Pro)</a>. Lieber einmal selbst durchziehen? Das <a href="/ki-sichtbarkeit-audit.html">KI-Sichtbarkeits-Audit</a> (29 € einmalig) führt dich Schritt für Schritt + 90-Tage-Plan. Oder das <a href="/ki-sichtbarkeit-buch.html">Buch „Von KI gefunden werden“</a> für den ganzen Hintergrund.</p>
  </section>

{cross}
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


def hub():
    cards = "".join(
        f'<div class="card"><h3><a href="/ki-sichtbarkeit-{b["slug"]}.html">{e(b["wer"])}</a></h3>'
        f'<p>Wirst du als {e(b["kurz"])} von ChatGPT &amp; Co. empfohlen? Gratis prüfen + dranbleiben.</p></div>'
        for b in BRANCHEN)
    body = f"""  <section class="hero">
    <h1>Wirst du von <span class="a">KI empfohlen</span>?</h1>
    <p class="lead">ChatGPT empfiehlt nur ~1,2 % der lokalen Betriebe — aber ~45 % der Menschen fragen KI nach Anbietern. Prüf gratis, ob dich die KI kennt, und bleib dran. Wähl deine Branche:</p>
    <p><a class="btn" href="/ki-erwaehnungs-check.html">Jetzt gratis prüfen →</a></p>
  </section>
  <section>{cards}</section>
  <section><p class="note">Mehr: <a href="/ki-sichtbarkeit-audit.html">Audit (29 € einmalig)</a> · <a href="/ki-sichtbarkeit-monitor.html">Monitor (9 €/M)</a> · <a href="/ki-sichtbarkeit-paket.html">Komplett-Paket (29 €)</a> · <a href="/ki-sichtbarkeit-buch.html">Buch</a></p></section>"""
    title = "Wirst du von KI empfohlen? — KI-Sichtbarkeit für lokale Betriebe · aban news"
    desc = "Prüf gratis, ob ChatGPT, Perplexity & Google AI deinen Betrieb empfehlen — und bleib mit dem Monitor dran. Für Handwerk, Praxen, Kanzleien, Steuer & Gastronomie."
    # gleiche Shell wie page(): minimaler Wrapper
    return f"""<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title><meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow"><link rel="canonical" href="https://abannews.com/ki-sichtbarkeit.html">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="https://abannews.com/ki-sichtbarkeit.html">
<meta property="og:image" content="https://abannews.com/og-ki-sichtbar-handwerk.png">
<meta property="og:site_name" content="aban news"><meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>{CSS}</style></head>
<body><a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap"><a href="/" class="brand">aban news</a>
<a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a></div></header>
<main id="main"><div class="wrap">
{body}
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/start">Alles auf einen Blick</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
</body></html>
"""


def main():
    written = []
    for b in BRANCHEN:
        open(os.path.join(ROOT, f"ki-sichtbarkeit-{b['slug']}.html"), "w", encoding="utf-8").write(page(b))
        og(b)
        written.append(b["slug"])
    open(os.path.join(ROOT, "ki-sichtbarkeit.html"), "w", encoding="utf-8").write(hub())
    print("✓ Branchen-Seiten + OG-Bilder + Hub erzeugt:", ", ".join(written))


if __name__ == "__main__":
    main()
