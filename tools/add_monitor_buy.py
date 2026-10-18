#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/add_monitor_buy.py — Kauf-Knopf für den KI-Sichtbarkeits-Monitor.

Auf 21 Branchen-Seiten (ki-sichtbarkeit-<branche>.html) steht ein Kauf-Kasten
mit Preis ("9 € / Monat · KI-Sichtbarkeits-Monitor"), Beschreibung und
"jederzeit kündbar" — der Knopf darin führte aber nicht zur Zahlung, sondern
auf eine weitere Seite. Dort steht dasselbe nochmal, und erst dort ist der
Kauf-Knopf. Dieselbe Umleitung auf ki-erwaehnungs-check.html und
ki-sichtbarkeit-report.html.

Der Zahlungs-Link EXISTIERT bereits (js/checkout-config.js, MONITOR_ABO_URL).
Dieses Skript hängt ihn an den Knopf, der ohnehin schon da steht.

Kein neuer Preis wird behauptet: das Skript ändert nur Ziel und Beschriftung
des Knopfes. Ist kein Link eingetragen, bleibt alles wie heute — der Knopf
führt auf die Monitor-Seite.

Idempotent über das Merkmal data-aban-monitor.

Aufruf:  python3 tools/add_monitor_buy.py [--dry]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARK = "data-aban-monitor"
ZIEL = "/ki-sichtbarkeit-monitor.html"
LABEL = "Monitor abonnieren →"
CFG = '<script src="/js/checkout-config.js"></script>'

# Setzt den Zahlungs-Link auf jeden markierten Knopf. Fehlt der Link, bleibt
# das href aus dem HTML stehen (die Monitor-Seite) — nie ein toter Knopf.
SKRIPT = (
    '<script data-aban-monitor-js>'
    '(function(){var u=(window.ABAN_CHECKOUT&&window.ABAN_CHECKOUT.MONITOR_ABO_URL)||"";'
    'if(!u)return;var a=document.querySelectorAll("a[data-aban-monitor]");'
    'for(var i=0;i<a.length;i++){a[i].href=u;a[i].target="_blank";a[i].rel="noopener";}})();'
    '</script>'
)

# Nur der HAUPT-Knopf (class="btn", nicht "btn ghost"), der auf die
# Monitor-Seite zeigt. Nebenlinks, Fussnoten und Verzeichnis-Einträge
# ("Ansehen →" in angebote.html) bleiben, was sie sind.
KNOPF = re.compile(
    r'<a class="btn" href="' + re.escape(ZIEL) + r'">([^<]*)</a>'
)
# Schon umgebaut? Dann erkennt dieses Muster den Knopf wieder, damit ein
# zweiter Lauf die Beschriftung auffrischt statt zu verdoppeln.
KNOPF_NEU = re.compile(
    r'<a class="btn" ' + MARK + r' href="' + re.escape(ZIEL) + r'">([^<]*)</a>'
)

# Trug die alte Beschriftung den Preis, trägt ihn auch die neue. Auf
# ki-erwaehnungs-check.html steht der Preis NUR im Knopf — ihn dort zu
# streichen hiesse, den Preis vor dem Klick zu verstecken.
PREIS = re.compile(r'\d{1,3}\s?(?:€|EUR|CHF)\s?/\s?Monat')


def beschriftung(alt: str) -> str:
    p = PREIS.search(alt)
    return f"Monitor abonnieren — {p.group(0)} →" if p else LABEL


def ersetzen(m: re.Match) -> str:
    return f'<a class="btn" {MARK} href="{ZIEL}">{beschriftung(m.group(1))}</a>'


def seiten() -> list[Path]:
    """Alle Seiten mit einem Monitor-Hauptknopf, ausser der Monitor-Seite selbst."""
    raus = {"ki-sichtbarkeit-monitor.html"}
    gefunden = []
    for p in sorted(ROOT.glob("*.html")):
        if p.name in raus:
            continue
        h = p.read_text(encoding="utf-8", errors="ignore")
        if KNOPF.search(h) or KNOPF_NEU.search(h):
            gefunden.append(p)
    return gefunden


def umbauen(h: str) -> str:
    h = KNOPF_NEU.sub(ersetzen, h)
    h = KNOPF.sub(ersetzen, h)
    if CFG not in h:
        h = h.replace("</body>", f"{CFG}\n</body>", 1)
    if MARK + "-js" not in h:
        h = h.replace("</body>", f"{SKRIPT}\n</body>", 1)
    return h


def main() -> int:
    dry = "--dry" in sys.argv
    geaendert = 0
    for p in seiten():
        alt = p.read_text(encoding="utf-8", errors="ignore")
        neu = umbauen(alt)
        if neu == alt:
            continue
        geaendert += 1
        if not dry:
            p.write_text(neu, encoding="utf-8")
    art = "geprüft" if dry else "geändert"
    print(f"  Monitor-Kaufknopf: {geaendert} Seiten {art}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
