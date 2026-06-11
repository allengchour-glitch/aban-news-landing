#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — dezenter Premium/Founding-Nudge auf Tool-/Rechner-Seiten.

Tool-Seiten funneln in den Gratis-Newsletter, aber bisher nicht zu Premium.
Dieser Injektor fuegt einen markentreuen, dezenten Founding-Nudge vor </main>
ein (Marker data-aban-premium, idempotent). Lang-aware (DE/EN). Keine erfundenen
Zahlen, keine Anlageberatung.

  python3 tools/add_tool_premium_nudge.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-premium"

# Tool-/Rechner-Seiten ohne Premium-Nudge (relativ zum Repo-Root)
PAGES = [
    "mwst-rechner.html",
    "stundensatz-rechner.html",
    "finanz-rechner.html",
    "ki-spar-rechner.html",
    "ki-und-krypto-daten.html",
    "prozent-rechner.html",
    "automatisierung-rechner.html",
    "diff-tool.html",
    "ki-dsgvo-check.html",
    "ki-erwaehnungs-check.html",
    "ki-kosten-rechner.html",
    "ki-readiness-check.html",
    "ki-tool-vergleich.html",
    "ki-tools-datensatz.html",
    "ki-tools-fuer-selbststaendige.html",
]

NUDGE_DE = (
    '<aside data-aban-premium style="max-width:760px;margin:24px auto 4px;padding:16px 18px;'
    'border:1px solid #fde9c8;border-radius:14px;background:linear-gradient(135deg,#fef3c7,#fffdf9);text-align:center">'
    '<strong style="color:#1f2937">Mehr Tiefe, kein Hype.</strong>'
    '<span style="color:#374151"> aban news Premium: werbefrei, volles Archiv, täglicher KI-Kompass fürs Business.</span>'
    '<span style="display:block;margin-top:10px">'
    '<a href="/founding.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;'
    'font-weight:700;padding:9px 16px;border-radius:9px;font-size:.92rem">Founding-Mitglied — €69 lifetime →</a>'
    '&nbsp;<a href="https://abannews.beehiiv.com/subscribe" target="_blank" rel="noopener" '
    'style="color:#b45309;font-weight:600;text-decoration:none;font-size:.92rem">Erst gratis testen →</a>'
    '</span></aside>\n'
)

NUDGE_EN = (
    '<aside data-aban-premium style="max-width:760px;margin:24px auto 4px;padding:16px 18px;'
    'border:1px solid #fde9c8;border-radius:14px;background:linear-gradient(135deg,#fef3c7,#fffdf9);text-align:center">'
    '<strong style="color:#1f2937">More depth, no hype.</strong>'
    '<span style="color:#374151"> aban news Premium: ad-free, full archive, a daily AI compass for your business.</span>'
    '<span style="display:block;margin-top:10px">'
    '<a href="/en/founding.html" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;'
    'font-weight:700;padding:9px 16px;border-radius:9px;font-size:.92rem">Founding member — €69 lifetime →</a>'
    '&nbsp;<a href="https://abannews.beehiiv.com/subscribe" target="_blank" rel="noopener" '
    'style="color:#b45309;font-weight:600;text-decoration:none;font-size:.92rem">Try it free first →</a>'
    '</span></aside>\n'
)


def process(path):
    if not os.path.isfile(path):
        return "missing"
    s = open(path, encoding="utf-8").read()
    if MARKER in s:
        return "skip"
    nudge = NUDGE_EN if 'lang="en"' in s[:200] else NUDGE_DE
    # vor dem letzten </main> einfuegen; Fallback: vor dem ersten <footer
    if "</main>" in s:
        idx = s.rfind("</main>")
    elif "<footer" in s:
        idx = s.find("<footer")
    else:
        return "no-anchor"
    s = s[:idx] + nudge + s[idx:]
    open(path, "w", encoding="utf-8").write(s)
    return "ok"


def main():
    targets = sys.argv[1:] or PAGES
    n = {"ok": 0, "skip": 0, "missing": 0, "no-main": 0}
    for p in targets:
        r = process(os.path.join(ROOT, p))
        n[r] += 1
        print(f"  {r:8} {p}")
    print(f"{n['ok']} gesetzt, {n['skip']} schon da, {n['missing']} fehlen, {n['no-main']} ohne main.")


if __name__ == "__main__":
    main()
