#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — setzt auf jede Geld-Cluster-Seite einen dezenten Link zum zentralen
Hub /geld-und-ki.html ("zusaetzliche Info-Links ueberall"). Idempotent ueber Marker
data-aban-hublink, sprachbewusst (en/ -> EN-Hub). Fuegt direkt nach dem ersten <main...>
ein. Aendert sonst nichts.

  python3 tools/add_geld_hub_link.py [--dry]
"""
from __future__ import annotations
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-hublink"

# Geld-Cluster-Seiten (ohne den Hub selbst). EN-Pfade werden automatisch mitgenommen, falls vorhanden.
DE = [
    "maerkte.html", "trading-tipps.html", "krypto-fuer-einsteiger.html",
    "etf-fuer-einsteiger.html", "sparplan-statt-trading.html",
    "steuer-basics-selbststaendige.html", "ki-aktien-hype-check.html",
    "ki-betrug-scam-check.html", "passives-einkommen-ki.html",
    "altersvorsorge-selbststaendige.html", "scheinselbststaendigkeit-vermeiden.html",
    "finanz-skills-fuer-selbststaendige.html", "geld-verdienen-mit-ki.html",
    "ki-abo-lohnt-sich.html", "notgroschen-aufbauen.html", "inflation-einfach-erklaert.html",
    "kleinunternehmerregelung-einfach-erklaert.html", "rechnung-generator.html",
    "mahnung-schreiben.html", "auftragsbestaetigung-schreiben.html", "angebot-schreiben.html",
]
PAGES = DE + [os.path.join("en", f) for f in DE]

STYLE = ("display:block;max-width:760px;margin:10px auto 0;padding:0 20px;"
         "font-size:.9rem")


def link_html(en: bool) -> str:
    if en:
        href, label = "/en/geld-und-ki.html", "Money &amp; AI: all topics, calculators &amp; checks"
    else:
        href, label = "/geld-und-ki.html", "Geld &amp; KI: alle Themen, Rechner &amp; Checks"
    return (f'\n<p {MARKER} style="{STYLE}">&#8592; <a href="{href}" '
            f'style="color:#b45309;font-weight:600;text-decoration:none">{label}</a></p>\n')


PAT = re.compile(r'\n?<p ' + re.escape(MARKER) + r'\b.*?</p>\n?', re.S)
MAIN = re.compile(r'(<main\b[^>]*>)', re.I)


def main() -> int:
    dry = "--dry" in sys.argv
    changed = missing = 0
    for rel in PAGES:
        f = os.path.join(ROOT, rel)
        if not os.path.isfile(f):
            missing += 1
            continue
        src = open(f, encoding="utf-8").read()
        en = rel.startswith("en" + os.sep) or rel.startswith("en/")
        blk = link_html(en)
        cur = PAT.sub("", src)                  # vorhandenen Marker entfernen (idempotent)
        m = MAIN.search(cur)
        if not m:
            print("  kein <main>:", rel); continue
        new = cur[:m.end()] + blk + cur[m.end():]
        if new != src:
            if not dry:
                open(f, "w", encoding="utf-8").write(new)
            changed += 1
            print(("[dry] " if dry else "") + "✓ " + rel)
    print(f"{changed} gesetzt, {missing} fehlen, {len(PAGES)} geprueft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
