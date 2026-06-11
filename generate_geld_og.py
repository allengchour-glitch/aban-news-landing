#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — OG-Vorschaubilder (1200x630) fuer das Geld-&-KI-Cluster + Meta-Injektion.

Nutzt make() aus generate_og_images.py (flacher Marken-Stil ohne Keys). Erzeugt je
Seite img/og/<slug>.png (DE) und img/og/<slug>-en.png (EN) und fuegt og:image/twitter:image
nach der og:url-Zeile ein (idempotent: nur wenn noch kein og:image vorhanden).

  python3 generate_geld_og.py
"""
import os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
from generate_og_images import make  # noqa: E402

# slug, badge, title, sub1, sub2 (DE) | EN-Pendant
PAGES = [
 ("geld-und-ki", "GELD & KI", "Ohne Hype", "Märkte, ETF, Krypto, Steuer, Vorsorge", "Rechner & Checks - keine Anlageberatung",
                 "MONEY & AI", "No hype", "Markets, ETFs, crypto, tax, pensions", "Calculators & checks - not advice"),
 ("trading-tipps", "TRADING-TIPPS", "Ehrlich", "10 Regeln gegen teure Fehler", "Anti-Hype - keine Anlageberatung",
                 "TRADING TIPS", "Honest", "10 rules against costly mistakes", "Anti-hype - not investment advice"),
 ("krypto-fuer-einsteiger", "KRYPTO", "Für Einsteiger", "Bitcoin & Co.: Kauf, Risiken, Schutz", "Einfach erklärt - keine Anlageberatung",
                 "CRYPTO", "For beginners", "Bitcoin & co.: buying, risks, safety", "Plain language - not advice"),
 ("etf-fuer-einsteiger", "ETF", "Für Einsteiger", "Der ruhige Weg + Kostenrechner", "Anti-Hype - keine Anlageberatung",
                 "ETFs", "For beginners", "The calm way + cost calculator", "Anti-hype - not advice"),
 ("sparplan-statt-trading", "SPARPLAN", "Statt Trading", "Zinseszins-Rechner inklusive", "Warum langweilig gewinnt",
                 "SAVINGS PLAN", "vs trading", "Compound calculator included", "Why boring wins"),
 ("steuer-basics-selbststaendige", "STEUER-BASICS", "Selbstständige", "Steuern, Rücklage, Belege, Fristen", "Einfach erklärt - keine Steuerberatung",
                 "TAX BASICS", "Self-employed", "Taxes, reserves, receipts, deadlines", "Plain - not tax advice"),
 ("ki-aktien-hype-check", "KI-AKTIEN", "Hype-Check", "Echte KI vom Aufkleber trennen", "7 Fragen - keine Anlageberatung",
                 "AI STOCKS", "Hype check", "Real AI vs the 'AI' sticker", "7 questions - not advice"),
 ("ki-betrug-scam-check", "KI-BETRUG", "Scams erkennen", "Deepfakes, Fake-Bots, Anlage-Betrug", "Schutzregeln + Schnell-Check",
                 "AI FRAUD", "Spot scams", "Deepfakes, fake bots, fraud", "Safety rules + quick check"),
 ("passives-einkommen-ki", "PASSIVES EINKOMMEN", "Reality-Check", "Was wirklich geht, was Abzocke ist", "Ehrlich - keine Einkommensgarantie",
                 "PASSIVE INCOME", "Reality check", "What works, what's a scam", "Honest - no income guarantee"),
 ("altersvorsorge-selbststaendige", "ALTERSVORSORGE", "Selbstständige", "Ehrlich vorsorgen + Rechner", "Keine Anlageberatung",
                 "RETIREMENT", "Self-employed", "Plan honestly + calculator", "Not investment advice"),
 ("scheinselbststaendigkeit-vermeiden", "SCHEINSELBSTSTÄNDIG", "Vermeiden", "Merkmale, Folgen, Schnellcheck", "Keine Rechtsberatung",
                 "BOGUS SELF-EMPLOYMENT", "Avoid it", "Signs, consequences, quick check", "Not legal advice"),
 ("ki-abo-lohnt-sich", "KI-ABO", "Lohnt sich?", "ChatGPT Plus & Co. ehrlich", "Kosten-Nutzen + Lohnt-sich-Check",
                 "AI PLAN", "Worth it?", "ChatGPT Plus & co. honestly", "Cost-benefit + worth-it check"),
 ("notgroschen-aufbauen", "NOTGROSCHEN", "Aufbauen", "Wie viel Puffer, wie schnell", "Mit Rechner - keine Beratung",
                 "EMERGENCY FUND", "Build it", "How much buffer, how fast", "With calculator - not advice"),
 ("inflation-einfach-erklaert", "INFLATION", "Einfach erklärt", "Was sie fürs Geld bedeutet", "Kaufkraft-Rechner inklusive",
                 "INFLATION", "Explained", "What it means for your money", "Purchasing-power calculator"),
 ("kleinunternehmerregelung-einfach-erklaert", "KLEINUNTERNEHMER", "Einfach erklärt", "Grenzen DE/AT/CH + Schnell-Check", "Keine Steuerberatung",
                 "SMALL BUSINESS", "VAT exemption", "Limits DE/AT/CH + quick check", "Not tax advice"),
 ("mahnung-schreiben", "MAHNUNG", "Schreiben", "3 Stufen + Text-Generator zum Kopieren", "Keine Rechtsberatung",
                 "PAYMENT REMINDER", "Write it", "3 stages + copy-ready text generator", "Not legal advice"),
]

FOOT_DE = "abannews.com  ·  ehrlich, anti-hype, keine Beratung"
FOOT_EN = "abannews.com  ·  honest, anti-hype, not advice"


def inject(path, img_url):
    if not os.path.isfile(path):
        return False
    s = open(path, encoding="utf-8").read()
    if "og:image" in s:
        return False
    m = re.search(r'(<meta property="og:url"[^>]*>)', s)
    if not m:
        return False
    block = (f'\n<meta property="og:image" content="{img_url}">'
             f'\n<meta property="og:image:width" content="1200">'
             f'\n<meta property="og:image:height" content="630">'
             f'\n<meta name="twitter:image" content="{img_url}">')
    s = s[:m.end()] + block + s[m.end():]
    open(path, "w", encoding="utf-8").write(s)
    return True


def main():
    made = inj = 0
    for (slug, b, t, s1, s2, eb, et, es1, es2) in PAGES:
        make(f"img/og/{slug}.png", b, t, [s1, s2], FOOT_DE, title_size=88)
        make(f"img/og/{slug}-en.png", eb, et, [es1, es2], FOOT_EN, title_size=88)
        made += 2
        if inject(f"{slug}.html", f"https://abannews.com/img/og/{slug}.png"):
            inj += 1
        if inject(f"en/{slug}.html", f"https://abannews.com/img/og/{slug}-en.png"):
            inj += 1
    print(f"{made} Bilder erzeugt, {inj} Seiten mit og:image versehen.")


if __name__ == "__main__":
    main()
