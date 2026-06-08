#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_compliance_pakete.py — KI-Compliance-Pakete für regulierte Berufe.

Erzeugt Verkaufsseiten + Hub + die eigentlichen Deliverables (Markdown-Vorlagen):
KI-Nutzungsrichtlinie, DSGVO/EU-AI-Act/Berufsrecht-Checkliste, sichere Prompts.
Zielgruppe: Ärzt:innen/Praxen, Anwält:innen/Kanzleien, Steuerberater:innen — die
KI rechtssicher einsetzen müssen (EU AI Act seit 2025 + DSGVO + Berufsgeheimnis).

WICHTIG / EHRLICH: Vorlagen zum Anpassen — **keine Rechtsberatung**. Überall klar
gekennzeichnet. Kein erfundenes Wissen; allgemeingültige, sorgfältige Bausteine.

Run:  python3 generate_compliance_pakete.py
"""
import html
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
COMP = os.path.join(ROOT, "compliance")
PREIS = "39 €"

BERUFE = [
    {
        "slug": "aerzte", "wer": "Ärzt:innen & Praxen", "kurz": "Arztpraxen",
        "daten": "Gesundheits-/Patientendaten (Art. 9 DSGVO besonders geschützt)",
        "recht": "ärztliche Schweigepflicht (§ 203 StGB), Berufsordnung der Ärztekammern",
        "prompts": [
            "Formuliere einen allgemein verständlichen Aushang zur Terminabsage-Regel (ohne Patientenbezug).",
            "Erstelle eine Checkliste für ein DSGVO-konformes Onboarding neuer Mitarbeitender.",
            "Fasse die wichtigsten Punkte einer öffentlichen Leitlinie in 5 Bulletpoints zusammen.",
            "Schreibe eine freundliche, neutrale Antwortvorlage für Anfragen zur Erreichbarkeit.",
            "Entwirf eine Struktur für eine interne Fortbildung zum Thema Datenschutz.",
        ],
    },
    {
        "slug": "anwaelte", "wer": "Anwält:innen & Kanzleien", "kurz": "Anwaltskanzleien",
        "daten": "mandatsbezogene Daten (anwaltliche Verschwiegenheit)",
        "recht": "BRAO/Verschwiegenheitspflicht (§ 43a BRAO, § 203 StGB)",
        "prompts": [
            "Formuliere einen allgemeinen Mandanten-Info-Text zum Ablauf einer Erstberatung (ohne Falldaten).",
            "Erstelle eine Gliederung für einen öffentlichen Blogbeitrag zu einem Rechtsgebiet.",
            "Fasse eine öffentlich zugängliche Gesetzesnorm laienverständlich zusammen.",
            "Entwirf eine neutrale E-Mail-Vorlage für Terminbestätigungen.",
            "Erstelle eine Checkliste für die DSGVO-konforme Akten-Digitalisierung.",
        ],
    },
    {
        "slug": "steuerberater", "wer": "Steuerberater:innen", "kurz": "Steuerkanzleien",
        "daten": "Mandantendaten (steuerliches Berufsgeheimnis)",
        "recht": "Verschwiegenheitspflicht (§ 57 StBerG, § 203 StGB)",
        "prompts": [
            "Formuliere einen allgemeinen Mandanten-Newsletter-Abschnitt zu Fristen (ohne Mandantenbezug).",
            "Erstelle eine Struktur für ein internes Merkblatt zur sicheren Tool-Nutzung.",
            "Fasse eine öffentliche BMF-/Verbandsmitteilung in klare Bulletpoints.",
            "Entwirf eine neutrale Vorlage für die Anforderung fehlender Unterlagen.",
            "Erstelle eine DSGVO-Checkliste für den digitalen Belegaustausch.",
        ],
    },
]

DISCLAIMER = ("Diese Vorlagen sind ein anpassbarer Startpunkt und **keine Rechts-, Steuer- oder "
              "Datenschutzberatung**. Vor dem Einsatz fachkundig bzw. juristisch prüfen und an die "
              "eigene Kanzlei/Praxis anpassen. Stand der Regelwerke laufend selbst verifizieren.")

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


def e(s):
    return html.escape(str(s))


def shell(title, desc, url, body):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="product">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://abannews.com/og-compliance.png">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap">
  <a href="/" class="brand">aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a>
</div></header>
<main id="main"><div class="wrap">
{body}
</div></main>
<footer><div class="wrap">
  © 2026 aban news · Allen Chour · Belp (CH) ·
  <a href="/ki-compliance.html">Alle Compliance-Pakete</a> ·
  <a href="/start">Alles auf einen Blick</a> ·
  <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a>
</div></footer>
<script defer src="/js/assistant.js"></script>
</body>
</html>
"""


def sales_page(b):
    slug = b["slug"]
    url = f"https://abannews.com/ki-compliance-{slug}.html"
    subj = f"KI-Compliance-Paket {b['kurz']}"
    mail = (f"mailto:hallo@abannews.com?subject={subj.replace(' ', '%20')}"
            f"&body=Hallo%20Aban%2C%20ich%20m%C3%B6chte%20das%20KI-Compliance-Paket%20f%C3%BCr%20{b['kurz']}.")
    prompts = "".join(f"<li>{e(p)}</li>" for p in b["prompts"][:3])
    title = f"KI rechtssicher in {b['kurz']} — Compliance-Paket · aban news"
    desc = (f"KI-Nutzungsrichtlinie + DSGVO/EU-AI-Act-Checkliste + sichere Prompts für {b['wer']}. "
            f"Vorlagen zum Anpassen — anti-hype, sofort startklar. Keine Rechtsberatung.")
    body = f"""  <section class="hero">
    <h1>KI nutzen in <span class="a">{e(b['kurz'])}</span> — ohne {e(b['recht'].split('(')[0].strip())} zu verletzen.</h1>
    <p class="lead">Seit 2025 gelten <strong>EU AI Act + DSGVO</strong> parallel. {e(b['wer'])} dürfen Standard-KI nicht ungeprüft mit {e(b['daten'])} füttern. Dieses Paket gibt dir die <strong>Vorlagen</strong>, um KI sauber einzuführen — zum Anpassen, sofort startklar.</p>
    <p><a class="btn" href="#kaufen">Paket holen ({PREIS})</a></p>
  </section>

  <section>
    <h2>Was drin ist</h2>
    <div class="card"><h3>1 · KI-Nutzungsrichtlinie (Vorlage)</h3><p>Interne Richtlinie zum Anpassen: erlaubte/verbotene Tools, welche Daten nie eingegeben werden, Freigabe- &amp; Prüfprozess, EU-AI-Act-Hinweise, Verantwortlichkeiten, Unterschriftsfeld.</p></div>
    <div class="card"><h3>2 · Compliance-Checkliste (DSGVO + EU AI Act + Berufsrecht)</h3><p>Selbstprüfung Punkt für Punkt — inkl. {e(b['recht'])}, AVV, Hosting-Standort, Drittlandtransfer.</p></div>
    <div class="card"><h3>3 · Sichere Prompts für {e(b['kurz'])}</h3><p>Erprobte Prompts, die <strong>ohne sensible Daten</strong> auskommen. Beispiele:</p><ul>{prompts}</ul></div>
  </section>

  <section id="kaufen">
    <div class="buybox">
      <div class="price">{PREIS}<small> · einmalig · sofort als Download</small></div>
      <p>Alle drei Vorlagen (Richtlinie, Checkliste, Prompts) als bearbeitbare Dateien. Jährliches Update, wenn sich die Regeln ändern.</p>
      <p id="buywrap"><a class="btn" id="buybtn" href="#">Paket holen</a></p>
      <p class="note">Abwicklung über Lemon Squeezy/Stripe (Rechnung inklusive).</p>
    </div>
    <div class="warn">⚠️ <strong>Ehrlich:</strong> {DISCLAIMER}</div>
  </section>

  <section>
    <p><a href="/ki-compliance.html">← Alle Berufs-Pakete</a> · Schon sichtbar? <a href="/ki-sichtbarkeit-{('praxen' if slug=='aerzte' else 'kanzleien' if slug=='anwaelte' else 'steuerberatung')}.html">Wirst du von KI empfohlen? →</a></p>
  </section>

<script src="/js/checkout-config.js"></script>
<script>
var URL_=(window.ABAN_CHECKOUT&&window.ABAN_CHECKOUT.COMPLIANCE_BUY_URL)||"";
(function(){{var b=document.getElementById("buybtn");
if(URL_){{b.href=URL_;b.target="_blank";b.rel="noopener";}}else{{b.href="{mail}";b.textContent="Per Mail bestellen";}}}})();
</script>"""
    return shell(title, desc, url, body)


def hub_page():
    url = "https://abannews.com/ki-compliance.html"
    cards = "".join(
        f'<div class="card"><h3><a href="/ki-compliance-{b["slug"]}.html">KI-Compliance für {e(b["kurz"])}</a></h3>'
        f'<p>Richtlinie + Checkliste + sichere Prompts für {e(b["wer"])}. {PREIS}.</p></div>'
        for b in BERUFE)
    body = f"""  <section class="hero">
    <h1>KI <span class="a">rechtssicher</span> einsetzen — Compliance-Pakete</h1>
    <p class="lead">EU AI Act + DSGVO + Berufsgeheimnis: regulierte Berufe brauchen klare Regeln, bevor sie KI nutzen. Fertige Vorlagen zum Anpassen — pro Beruf.</p>
  </section>
  <section>{cards}</section>
  <section><div class="warn">⚠️ {DISCLAIMER}</div></section>"""
    return shell("KI-Compliance-Pakete für regulierte Berufe · aban news",
                 "KI-Nutzungsrichtlinie, DSGVO/EU-AI-Act-Checkliste & sichere Prompts für Ärzt:innen, Anwält:innen und Steuerberater:innen — Vorlagen zum Anpassen.",
                 url, body)


def deliverables(b):
    slug = b["slug"]
    rl = f"""# KI-Nutzungsrichtlinie — Vorlage für {b['wer']}

> {DISCLAIMER}

## 1. Zweck
Diese Richtlinie regelt den Einsatz von KI-Tools in unserer {b['kurz'][:-1] if b['kurz'].endswith('n') else b['kurz']}.

## 2. Erlaubte Tools
- Nur freigegebene Tools (Liste pflegen). Standard-Consumer-Chatbots ohne Auftragsverarbeitungsvertrag (AVV) sind **nicht** freigegeben.

## 3. Niemals eingeben
- {b['daten']}
- Namen, Aktenzeichen, Diagnosen, Beträge oder sonstige identifizierende Angaben.

## 4. Freigabe & Prüfung
- Neue Tools nur nach Freigabe (verantwortliche Person eintragen) und Prüfung von AVV, Hosting-Standort, Drittlandtransfer.
- KI-Ausgaben werden vor Verwendung fachlich geprüft (Mensch entscheidet).

## 5. EU AI Act
- Einsatzzwecke einordnen (Transparenzpflichten beachten). Hochrisiko-Anwendungen vermeiden bzw. gesondert prüfen.

## 6. Berufsrecht
- {b['recht']} hat Vorrang. Im Zweifel: kein KI-Einsatz mit Mandanten-/Patientenbezug.

## 7. Verantwortlichkeiten / Stand
- Verantwortlich: __________   ·   Stand: __________   ·   Unterschrift: __________
"""
    ck = f"""# Compliance-Checkliste — {b['wer']}

> {DISCLAIMER}  Hake ehrlich ab; jedes „nein" ist eine Aufgabe.

- [ ] Liste freigegebener KI-Tools existiert und ist aktuell
- [ ] Für jedes Tool liegt ein AVV (Art. 28 DSGVO) vor
- [ ] Hosting-/Datenverarbeitungs-Standort je Tool bekannt (EU?)
- [ ] Drittlandtransfer geprüft (z. B. Standardvertragsklauseln)
- [ ] {b['daten']} werden NIE in KI-Tools eingegeben
- [ ] {b['recht']} dokumentiert berücksichtigt
- [ ] KI-Ausgaben werden vor Verwendung menschlich geprüft
- [ ] Mitarbeitende sind geschult (Richtlinie unterschrieben)
- [ ] EU-AI-Act-Einordnung der Einsatzzwecke vorgenommen
- [ ] Verantwortliche Person + Review-Termin festgelegt
"""
    pr = "# Sichere Prompts — " + b["wer"] + "\n\n> " + DISCLAIMER + " Diese Prompts kommen ohne sensible Daten aus.\n\n"
    pr += "\n".join(f"{i}. {p}" for i, p in enumerate(b["prompts"], 1)) + "\n"
    for name, txt in [("ki-richtlinie", rl), ("checkliste", ck), ("prompts", pr)]:
        open(os.path.join(COMP, f"{slug}-{name}.md"), "w", encoding="utf-8").write(txt)


def main():
    os.makedirs(COMP, exist_ok=True)
    for b in BERUFE:
        open(os.path.join(ROOT, f"ki-compliance-{b['slug']}.html"), "w", encoding="utf-8").write(sales_page(b))
        deliverables(b)
    open(os.path.join(ROOT, "ki-compliance.html"), "w", encoding="utf-8").write(hub_page())
    print("✓ Compliance: 3 Verkaufsseiten + Hub + 9 Vorlagen-Dateien (compliance/) erzeugt")


if __name__ == "__main__":
    main()
