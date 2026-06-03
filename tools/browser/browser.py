#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
browser.py - kleines Browser-Toolkit auf Playwright-Basis.

Steuert einen echten Browser (Chromium) von der Kommandozeile. Drei Befehle:

  shot     Screenshot einer Seite speichern (ganze Seite oder Viewport)
  check    Eine Seite + alle internen Links durchklicken und Status pruefen
  grab     Text/Links/Ueberschriften einer Seite als JSON oder Text holen

Laeuft auf DEINEM Rechner (dieses Skript bedient keinen Browser in der Cloud).

Installation (einmalig):
  pip install playwright
  python3 -m playwright install chromium

Beispiele:
  python3 browser.py shot https://abannews.com/glut --out glut.png
  python3 browser.py shot https://abannews.com/glut --voll        # ganze Seite
  python3 browser.py check https://abannews.com                   # Linkcheck
  python3 browser.py grab https://example.com --was links         # alle Links
  python3 browser.py grab https://example.com --was text > seite.txt

Ehrliche Grenzen:
  - Logins / Captchas / kostenpflichtige Plattformen (KDP, Tolino, Lemon Squeezy)
    NICHT automatisieren - das verstoesst oft gegen deren AGB und scheitert an
    Anmeldung/Bot-Schutz. Nutze das hier fuer EIGENE Seiten und oeffentliche
    Recherche.
  - Respektiere robots.txt und das Tempo der fremden Seite (kein Hammern).
"""
import argparse
import json
import sys
import urllib.parse


def _playwright():
    """Laedt Playwright erst bei Bedarf - so funktioniert --help auch ohne Install."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("! Playwright fehlt. Installiere:\n"
                 "    pip install playwright\n"
                 "    python3 -m playwright install chromium")
    return sync_playwright


def _browser(p, headless=True):
    return p.chromium.launch(headless=headless)


# ------------------------------------------------------------------
def cmd_shot(args):
    """Screenshot einer Seite."""
    with _playwright()() as p:
        b = _browser(p)
        page = b.new_page(viewport={"width": args.breite, "height": args.hoehe})
        page.goto(args.url, wait_until="networkidle", timeout=args.timeout * 1000)
        page.screenshot(path=args.out, full_page=args.voll)
        b.close()
    print("Screenshot gespeichert: %s (%s)" % (args.out, "ganze Seite" if args.voll else "Viewport"))


# ------------------------------------------------------------------
def cmd_check(args):
    """Eine Seite laden, alle internen Links sammeln und ihren Status pruefen."""
    basis = urllib.parse.urlparse(args.url)
    gesehen, ergebnisse = set(), []
    with _playwright()() as p:
        b = _browser(p)
        page = b.new_page()
        r = page.goto(args.url, wait_until="domcontentloaded", timeout=args.timeout * 1000)
        start_status = r.status if r else 0
        print("Start: %s -> %s" % (args.url, start_status))
        # interne Links einsammeln
        hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
        b_close_page = page
        intern = []
        for h in hrefs:
            u = urllib.parse.urlparse(h)
            if u.scheme in ("http", "https") and u.netloc == basis.netloc and h not in gesehen:
                gesehen.add(h)
                intern.append(h)
        print("Interne Links gefunden: %d (pruefe bis %d)" % (len(intern), args.max))
        for h in intern[:args.max]:
            try:
                rr = page.goto(h, wait_until="domcontentloaded", timeout=args.timeout * 1000)
                st = rr.status if rr else 0
            except Exception as e:
                st = "FEHLER: %s" % str(e)[:60]
            ergebnisse.append((st, h))
            marke = "ok " if st == 200 else "!! "
            print("  %s%s  %s" % (marke, st, h))
        b.close()
    schlecht = [e for e in ergebnisse if e[0] != 200]
    print("\nGeprueft: %d | Probleme: %d" % (len(ergebnisse), len(schlecht)))
    sys.exit(1 if (schlecht or start_status != 200) else 0)


# ------------------------------------------------------------------
def cmd_grab(args):
    """Inhalte einer Seite holen: text | links | headings (als Text/JSON)."""
    with _playwright()() as p:
        b = _browser(p)
        page = b.new_page()
        page.goto(args.url, wait_until="networkidle", timeout=args.timeout * 1000)
        if args.was == "links":
            daten = page.eval_on_selector_all(
                "a[href]", "els => els.map(e => ({text: e.innerText.trim(), href: e.href}))")
        elif args.was == "headings":
            daten = page.eval_on_selector_all(
                "h1,h2,h3", "els => els.map(e => ({tag: e.tagName, text: e.innerText.trim()}))")
        else:  # text
            daten = page.inner_text("body")
        b.close()
    if args.json and args.was != "text":
        print(json.dumps(daten, ensure_ascii=False, indent=2))
    elif args.was == "text":
        print(daten)
    else:
        for d in daten:
            print("- " + " | ".join(str(v) for v in d.values()))


# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="Browser-Toolkit (Playwright).")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("shot", help="Screenshot einer Seite")
    s.add_argument("url")
    s.add_argument("--out", default="screenshot.png")
    s.add_argument("--voll", action="store_true", help="ganze Seite statt Viewport")
    s.add_argument("--breite", type=int, default=1280)
    s.add_argument("--hoehe", type=int, default=900)
    s.add_argument("--timeout", type=int, default=30)
    s.set_defaults(func=cmd_shot)

    c = sub.add_parser("check", help="Seite + interne Links pruefen")
    c.add_argument("url")
    c.add_argument("--max", type=int, default=40, help="max. Links pruefen")
    c.add_argument("--timeout", type=int, default=30)
    c.set_defaults(func=cmd_check)

    g = sub.add_parser("grab", help="Inhalte holen (text/links/headings)")
    g.add_argument("url")
    g.add_argument("--was", choices=["text", "links", "headings"], default="text")
    g.add_argument("--json", action="store_true", help="als JSON ausgeben")
    g.add_argument("--timeout", type=int, default=30)
    g.set_defaults(func=cmd_grab)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
