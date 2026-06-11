#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — fuegt ein dezentes Inline-Newsletter-Formular (beehiiv) in die
Geld-Cluster-Seiten ein, direkt vor dem FAQ-Block. Inline-Form konvertiert besser
als ein blosser Link. Idempotent (Marker data-aban-signup), sprachbewusst.

  python3 tools/add_geld_signup.py [--dry]
"""
from __future__ import annotations
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-signup"

DE = [
    "geld-und-ki.html", "trading-tipps.html", "krypto-fuer-einsteiger.html",
    "etf-fuer-einsteiger.html", "sparplan-statt-trading.html",
    "steuer-basics-selbststaendige.html", "ki-aktien-hype-check.html",
    "ki-betrug-scam-check.html", "passives-einkommen-ki.html",
    "altersvorsorge-selbststaendige.html", "scheinselbststaendigkeit-vermeiden.html",
    "ki-abo-lohnt-sich.html", "notgroschen-aufbauen.html", "inflation-einfach-erklaert.html",
]
PAGES = DE + [os.path.join("en", f) for f in DE]

PAT = re.compile(r'\n?<section ' + re.escape(MARKER) + r'\b.*?</section>\n?', re.S)


def form(en: bool) -> str:
    if en:
        h, p, ph, btn = ("One AI tip a day, in 5 minutes",
                         "Honest, anti-hype, free. Mon&ndash;Fri, unsubscribe anytime.",
                         "you@email.com", "Subscribe free")
    else:
        h, p, ph, btn = ("Ein KI-Tipp pro Tag, in 5 Minuten",
                         "Ehrlich, anti-hype, gratis. Mo&ndash;Fr, jederzeit abbestellbar.",
                         "deine@mail.de", "Gratis abonnieren")
    return (f'\n<section {MARKER} style="max-width:760px;margin:30px auto;padding:20px;'
            f'border:1px solid #ece3d4;border-radius:14px;background:#fff;text-align:center">'
            f'<h2 style="margin:0 0 6px;font-size:1.25rem">{h}</h2>'
            f'<p style="margin:0 0 12px;color:#374151">{p}</p>'
            f'<form action="https://abannews.beehiiv.com/subscribe" method="get" '
            f'style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:460px;margin:0 auto">'
            f'<input type="email" name="email" required placeholder="{ph}" autocomplete="email" '
            f'inputmode="email" aria-label="E-Mail-Adresse" style="flex:1;min-width:200px;padding:11px 14px;'
            f'border:1px solid #ece3d4;border-radius:10px;font-size:1rem">'
            f'<button type="submit" style="background:#b45309;color:#fff;border:0;border-radius:10px;'
            f'padding:11px 20px;font-weight:700;font-size:1rem;cursor:pointer">{btn}</button>'
            f'</form></section>\n')


def main() -> int:
    dry = "--dry" in sys.argv
    changed = missing = 0
    for rel in PAGES:
        f = os.path.join(ROOT, rel)
        if not os.path.isfile(f):
            missing += 1; continue
        src = open(f, encoding="utf-8").read()
        en = rel.startswith("en/") or rel.startswith("en" + os.sep)
        blk = form(en)
        cur = PAT.sub("", src)                         # idempotent
        anchor = "<h2>Common questions</h2>" if en else "<h2>Häufige Fragen</h2>"
        if anchor in cur:
            new = cur.replace(anchor, blk + anchor, 1)
        else:
            idx = cur.rfind("</main>")
            if idx == -1:
                print("  kein Anker:", rel); continue
            new = cur[:idx] + blk + cur[idx:]
        if new != src:
            if not dry:
                open(f, "w", encoding="utf-8").write(new)
            changed += 1
            print(("[dry] " if dry else "") + "✓ " + rel)
    print(f"{changed} gesetzt, {missing} fehlen, {len(PAGES)} geprueft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
