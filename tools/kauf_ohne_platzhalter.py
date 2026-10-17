#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/kauf_ohne_platzhalter.py — tote Kauf-Knöpfe durch den Mail-Weg ersetzen.

Auf zwölf Verkaufsseiten zeigte der Knopf „Jetzt kaufen" auf eine
Gumroad-Adresse, die wörtlich PLATZHALTER heisst, zum Beispiel

    gumroad.com/l/PLATZHALTER-MIETVERTRAG   (Mietvertrag-Vorlage, CHF 39)

Alle am 17.10.2026 geprüft: HTTP 404. Wer kaufen wollte, landete auf einer
Fehlerseite. Dieselbe Adresse stand teils auch im JSON-LD unter offers.url,
also in dem, was Google als Kauf-Adresse des Produkts liest.

Es ist kein Tippfehler im Shop-Namen: der echte Gumroad-Laden ist
chourallen.gumroad.com (geprüft, HTTP 200). Die Platzhalter-Adressen zeigen
auf gumroad.com ohne Laden und auf Produkte, die es nicht gibt.

Der Umbau folgt dem Muster, das andere Seiten schon nutzen
(ki-schnellstart.html): Standard ist der Mail-Weg, und sobald in
js/checkout-config.js ein echter Zahlungs-Link steht, macht das Skript daraus
wieder den Kauf-Knopf — samt der ursprünglichen Beschriftung mit Preis.

Kein Preis wird geändert und keiner erfunden.

Idempotent über das Merkmal data-aban-buy.

Aufruf:  python3 tools/kauf_ohne_platzhalter.py [--dry]
"""
from __future__ import annotations

import html as html_mod
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARK = "data-aban-buy"
PLATZHALTER = re.compile(r'https://gumroad\.com/l/(PLATZHALTER[A-Z-]*)')
CFG = '<script src="/js/checkout-config.js"></script>'
SKRIPT = (
    '<script ' + MARK + '-js>'
    '(function(){var k=window.ABAN_CHECKOUT||{};'
    'var a=document.querySelectorAll("a[' + MARK + ']");'
    'for(var i=0;i<a.length;i++){var u=k[a[i].getAttribute("' + MARK + '")]||"";'
    'if(!u)continue;a[i].href=u;a[i].target="_blank";a[i].rel="noopener";'
    'var t=a[i].getAttribute("' + MARK + '-label");if(t)a[i].textContent=t;'
    'var n=a[i].nextElementSibling;'
    'if(n&&n.hasAttribute("' + MARK + '-hinweis"))n.parentNode.removeChild(n);}})();'
    '</script>'
)
MAIL_LABEL = "Per Mail bestellen"

# Direkt unter dem ersten Knopf: was jetzt wirklich passiert. Das Skript
# entfernt den Hinweis wieder, sobald ein Zahlungs-Link eingetragen ist.
HINWEIS = ('<p ' + MARK + '-hinweis style="font-size:.82rem;color:#6b7280;'
           'margin:.5rem 0 0">Bestellung per E-Mail: du bekommst eine Antwort '
           'mit Zahlungsweg und danach den Download-Link. Kein Sofort-Download.</p>')

# Sätze, die einen Zahlungsanbieter versprechen, den es für dieses Produkt
# nicht gibt (der Gumroad-Eintrag ist 404). Sie werden durch das ersetzt,
# was stimmt — ohne einen anderen Anbieter zu behaupten.
PROSA = {
    "Abwicklung über Gumroad · Kreditkarte, PayPal, Apple/Google Pay · "
    "sofortiger Download-Link per E-Mail":
        "Bestellung per E-Mail · den Download-Link bekommst du nach der Zahlung",
    "Sichere Zahlung via Gumroad · Kreditkarte / PayPal / SEPA":
        "Bestellung per E-Mail · den Download-Link bekommst du nach der Zahlung",
    "Sofortiger Download nach Zahlung · Sichere Zahlung via Gumroad "
    "(Kreditkarte, PayPal)":
        "Bestellung per E-Mail · den Download-Link bekommst du nach der Zahlung",
    "über ihre Gumroad-Bestellbestätigung": "über ihre Bestellbestätigung",
}


def schluessel(seitenname: str) -> str:
    """Der Schlüssel kommt aus dem SEITEN-Namen, nicht aus dem Platzhalter.

    Der Platzhalter-Text wäre naheliegender, führt aber zu Kollisionen:
    PLATZHALTER-VORLAGEN ergäbe VORLAGEN_BUY_URL, und den Schlüssel gibt es
    schon — für ein anderes Produkt zu einem anderen Preis. Dann zeigten zwei
    verschiedene Produkte auf dieselbe Kasse.
    """
    stamm = seitenname.rsplit(".", 1)[0]
    return re.sub(r"[^A-Z0-9]+", "_", stamm.upper()).strip("_") + "_BUY_URL"


def betreff(h: str) -> str:
    """Mail-Betreff aus dem Seitentitel, damit die Anfrage zuordenbar ist."""
    t = re.search(r"<title>(.*?)</title>", h, re.S)
    roh = html_mod.unescape(t.group(1)).strip() if t else "Bestellung"
    return roh.split("|")[0].split("—")[0].strip()[:60] or "Bestellung"


def mailto(thema: str) -> str:
    frage = urllib.parse.quote(thema)
    text = urllib.parse.quote(f"Hallo Aban, ich möchte bestellen: {thema}.")
    return f"mailto:hallo@abannews.com?subject={frage}&amp;body={text}"


def umbauen(h: str, seitenname: str = "") -> str:
    funde = set(PLATZHALTER.findall(h))
    if not funde:
        return h
    thema = betreff(h)
    for ph in funde:
        adresse = f"https://gumroad.com/l/{ph}"
        k = schluessel(seitenname)
        knopf = re.compile(
            r'<a ([^>]*?)href="' + re.escape(adresse) + r'"([^>]*)>([^<]*)</a>'
        )

        def ersetzen(m: re.Match) -> str:
            # class bleibt erhalten, damit der Knopf aussieht wie vorher.
            attrs = (m.group(1) + " " + m.group(2))
            klasse = re.search(r'class="([^"]*)"', attrs)
            kl = f' class="{klasse.group(1)}"' if klasse else ""
            label = m.group(3).strip()
            return (f'<a href="{mailto(thema)}"{kl} {MARK}="{k}" '
                    f'{MARK}-label="{label}">{MAIL_LABEL}</a>')

        h = knopf.sub(ersetzen, h)
        # offers.url im JSON-LD: die Produktseite ist die richtige Adresse,
        # solange es keinen Zahlungs-Link gibt.
        if seitenname:
            h = h.replace(f'"url": "{adresse}"',
                          f'"url": "https://abannews.com/{seitenname}"')
        h = h.replace(adresse, f"/{seitenname}" if seitenname else "#")
    for falsch, richtig in PROSA.items():
        h = h.replace(falsch, richtig)
    knopf_fertig = re.compile(r'(<a [^>]*' + MARK + r'="[^"]*"[^>]*>[^<]*</a>)'
                              r'(?!\s*<p ' + MARK + r'-hinweis)')
    h = knopf_fertig.sub(lambda m: m.group(1) + HINWEIS, h)
    if CFG not in h:
        h = h.replace("</body>", f"{CFG}\n</body>", 1)
    if MARK + "-js" not in h:
        h = h.replace("</body>", f"{SKRIPT}\n</body>", 1)
    return h


def seiten() -> list[Path]:
    return [p for p in sorted(ROOT.glob("*.html"))
            if PLATZHALTER.search(p.read_text(encoding="utf-8", errors="ignore"))]


def schluessel_aller_seiten() -> list[str]:
    gefunden = []
    for p in seiten():
        k = schluessel(p.name)
        if k not in gefunden:
            gefunden.append(k)
    return gefunden


def main() -> int:
    dry = "--dry" in sys.argv
    geaendert = 0
    for p in seiten():
        alt = p.read_text(encoding="utf-8")
        neu = umbauen(alt, p.name)
        if neu == alt:
            continue
        geaendert += 1
        if not dry:
            p.write_text(neu, encoding="utf-8")
    art = "geprüft" if dry else "geändert"
    print(f"  Platzhalter-Kaufknöpfe: {geaendert} Seiten {art}")
    if dry:
        print("  Schlüssel für js/checkout-config.js: "
              + ", ".join(schluessel_aller_seiten()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
