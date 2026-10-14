#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""startseite_gewicht.py — Messgerät «Gewicht der Startseite» (Stufe A, Schritt A0, 14.10.2026)

ANLASS: dropship/STARTSEITE-UMBAU-PLAN-2026-10-13.md. Die Startseite wiegt 2'907'136 B HTML (gemessen 14.10. 09:31, iPhone-
Kennung, frisch gerendert: server-timing processing 1'031 ms). Sie hat 832 Links, 151 Überschriften und eine einzige H1 «LuxeStyle»,
die versteckt ist. Dazu kommen 360× «?variant=», 124 Produktkarten, 405 <img>, 120× das Häkchen-SVG «checkmark-burst» und
120× «zoom-out--details». Ohne Messgerät lässt sich weder ein Gewinn der Verschlankung belegen noch eine neue Aufblähung
(neue Reihe, App, Theme-Update) bemerken. Die vorhandene Bildlast-Wache (startseite_bildlast.mjs) zählt nur Bilder beim Öffnen.

MESSUNG: curl mit iPhone-Kennung über den Proxy. ⚠️ Unsere IP bekommt manchmal eine alte Bot-Cache-Kopie (CLAUDE.md 19.08.):
Wenn der Server-Timing-Kopf fehlt oder processing < 100 ms, gilt das als Cache-Treffer. Die Zeile wird dann als «Cache» markiert
und zählt nicht für Grenzen.
  python3 automation/startseite_gewicht.py              misst https://luxestyle.ch/ → Zeile + Ledger dropship/_startseite_gewicht.tsv
  python3 automation/startseite_gewicht.py --datei X     misst eine gespeicherte HTML-Datei (kein Ledger)
  python3 automation/startseite_gewicht.py --selbsttest
GRENZEN (14.10. gesetzt, nach 7 Tagen mit Stufe-A-Werten nachziehen): Bytes 3'200'000 · Links 900 · Überschriften 170 ·
sichtbare H1 = 1 erst nach Stufe A5 (bis dahin nur zählen).
"""
import datetime as dt
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_startseite_gewicht.tsv")
URL = "https://luxestyle.ch/"
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) "
      "Version/17.0 Mobile/15E148 Safari/604.1")
GRENZE = {"bytes": 3_200_000, "links": 900, "ueberschriften": 170}
H1_SICHTBAR_PFLICHT = False          # nach A5 (sichtbare H1 im Hero) auf True


def zaehlen(html):
    h1 = re.findall(r"<h1\b([^>]*)>(.*?)</h1>", html, re.S | re.I)
    return {
        "bytes": len(html.encode("utf-8")),
        "links": len(re.findall(r"<a\s[^>]*href=", html, re.I)),
        "ueberschriften": len(re.findall(r"<h[1-6]\b", html, re.I)),
        "h1": len(h1),
        "h1_versteckt": sum(1 for attr, _ in h1 if "visually-hidden" in attr),
        "h1_text": re.sub(r"<[^>]+>|\s+", " ", h1[0][1]).strip()[:60] if h1 else "",
        "variant_links": len(re.findall(r"\?variant=\d", html)),
        "karten": len(re.findall(r"<product-card\b", html)),
        "img": len(re.findall(r"<img\b", html, re.I)),
        "burst": html.count("checkmark-burst"),
        "zoom_out": html.count("zoom-out--details"),
    }


def befunde(z, cache):
    if cache:
        return []
    b = [f"{k} {z[k]} > {g}" for k, g in GRENZE.items() if z[k] > g]
    if z["h1"] != 1:
        b.append(f"H1 {z['h1']}× (Soll 1)")
    if H1_SICHTBAR_PFLICHT and z["h1_versteckt"]:
        b.append("H1 versteckt")
    return b


def holen():
    r = subprocess.run(["curl", "-s", "-A", UA, "-D", "-", "--max-time", "90", URL], capture_output=True)
    roh = r.stdout.decode("utf-8", "replace")
    kopf, _, html = roh.partition("\r\n\r\n")
    while kopf.startswith("HTTP/") and html.startswith("HTTP/"):      # Weiterleitungen/100-continue
        kopf, _, html = html.partition("\r\n\r\n")
    m = re.search(r"processing;dur=([\d.]+)", kopf)
    proc = float(m.group(1)) if m else None
    return html, proc


def zeile(z, proc, cache, b):
    return (f"STARTSEITE-GEWICHT: {'⚠️ ' if b else ''}{z['bytes'] / 1e6:.2f} MB · {z['links']} Links · {z['ueberschriften']} Ü · "
            f"H1 {z['h1']}× ({'versteckt' if z['h1_versteckt'] else 'sichtbar'} «{z['h1_text']}») · {z['variant_links']}× ?variant= · "
            f"{z['karten']} Karten · {z['img']} img · {z['burst']}× Häkchen-SVG"
            f"{' · Cache-Kopie (zählt nicht)' if cache else f' · proc {proc:.0f} ms' if proc else ''}"
            + (" · " + "; ".join(b) if b else ""))


def selbsttest():
    karte = '<product-card><a href="/products/x?variant=1">x</a><h3>T</h3><img src=a.jpg>checkmark-burst zoom-out--details</product-card>'
    basis = '<html><h1 class="visually-hidden">LuxeStyle</h1><h2>Hero</h2>' + karte * 3 + '</html>'
    z = zaehlen(basis)
    faelle = [
        ("Grundzählung", (z["karten"], z["links"], z["ueberschriften"], z["h1"], z["h1_versteckt"], z["variant_links"]), (3, 3, 5, 1, 1, 3)),
        ("doppelte Reihe zählt", zaehlen(basis.replace(karte * 3, karte * 6))["karten"], 6),
        ("zweite H1 → Befund", bool(befunde(zaehlen(basis + '<h1>Neu</h1>'), False)), True),
        ("Cache-Kopie → keine Befunde", befunde(zaehlen(basis + '<h1>x</h1>'), True), []),
        ("Grenze Links", any("links" in x for x in befunde(dict(z, links=901), False)), True),
        ("H1-Text", z["h1_text"], "LuxeStyle"),
        ("?variant= nur mit Ziffer", zaehlen('<a href="/p?variant=">x</a>')["variant_links"], 0),
    ]
    ok = 0
    for name, ist, soll in faelle:
        print(f"  {'OK  ' if ist == soll else 'FEHL'} {name} → {ist}")
        ok += ist == soll
    print("SELBSTTEST", "OK" if ok == len(faelle) else f"FEHLER ({len(faelle) - ok})")
    return 0 if ok == len(faelle) else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--datei" in a:
        z = zaehlen(open(a[a.index("--datei") + 1], encoding="utf-8", errors="replace").read())
        print(zeile(z, None, False, befunde(z, False)))
        sys.exit(0)
    html, proc = holen()
    if len(html) < 100_000:
        print(f"STARTSEITE-GEWICHT: unklar (nur {len(html)} B geladen)")
        sys.exit(1)
    cache = proc is None or proc < 100
    z = zaehlen(html)
    b = befunde(z, cache)
    print(zeile(z, proc, cache, b))
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        if neu:
            f.write("zeit\tbytes\tlinks\tueberschriften\th1\th1_versteckt\tvariant\tkarten\timg\tburst\tzoom_out\tproc_ms\tcache\n")
        f.write("\t".join(map(str, [dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), z["bytes"], z["links"],
                                    z["ueberschriften"], z["h1"], z["h1_versteckt"], z["variant_links"], z["karten"], z["img"],
                                    z["burst"], z["zoom_out"], f"{proc:.0f}" if proc else "", int(cache)])) + "\n")
    sys.exit(0)        # Befund steht in der Zeile; Exit 1 nur bei «unklar» (sonst misst der Aufseher stündlich neu)
