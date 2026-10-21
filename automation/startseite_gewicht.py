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
GRENZEN (14.10. nach Stufe A2–A5 nachgezogen, Messwert + ~10 %): Bytes 2'700'000 · Links 920 · Überschriften 35 ·
?variant= 10 · genau 1 H1, sichtbar.

GOOGLEBOT-2-MiB (21.10.2026, Spähtrupp wf_32ed9d12 L2, QUELLE developers.google.com/search/docs/crawling-indexing/googlebot: «crawls the
first 2MB of a supported file type», Grenze gilt für die UNKOMPRIMIERTEN Daten, danach bricht der Abruf ab): Die Startseite wiegt 2.48 MB, die
Fussleiste beginnt bei Byte ~2'407'000 — hinter dem Schnitt liegen die CREATED_DESC-Reihen sport-outdoor/make-up (Neuware-Links), die
Vertrauens-Kacheln und alle Rechtstexte-Links des Fusses. Die Grenze 2'700'000 oben schlägt am 2-MiB-Limit nie an. Darum zeigt die Zeile jetzt
«Fussleiste bei Byte N (Googlebot 2 MiB: +M KB zu viel)» als Hinweis; GRENZE['fuss'] hält die Fussleiste mindestens dort, wo sie heute steht
(Wachstum = ⚠️), ZIEL_FUSS ist das Ziel des Umbaus (Plan dropship/STARTSEITE-UMBAU-PLAN-2026-10-13.md, offene Punkte A6–A9: 2-MiB-Ziel ≤ 1.95 MB).
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
# 14.10. 10:30 nach A2–A5 nachgezogen (gemessen 2.46 MB · 833 Links · 30 Ü · 0× ?variant=) — Messwert + ~10 %:
GRENZE = {"bytes": 2_700_000, "links": 920, "ueberschriften": 35, "variant_links": 10, "fuss": 2_550_000}
GOOGLEBOT_LIMIT = 2_097_152          # 2 MiB unkomprimiert (Google-Doku, 21.10.2026)
ZIEL_FUSS = 1_950_000                # Umbauziel: Fussleiste VOR dem Googlebot-Schnitt, mit Luft
H1_SICHTBAR_PFLICHT = True           # seit A5 steht die H1 sichtbar im Hero


def zaehlen(html):
    h1 = re.findall(r"<h1\b([^>]*)>(.*?)</h1>", html, re.S | re.I)
    roh = html.encode("utf-8")
    fuss = roh.find(b"<footer")
    return {
        "bytes": len(roh),
        "fuss": fuss if fuss >= 0 else len(roh),
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
    b = [f"{k} {z[k]} > {g}" for k, g in GRENZE.items() if k in z and z[k] > g and k != "fuss"]
    if z.get("fuss", 0) > GRENZE["fuss"]:
        b.append(f"Fussleiste bei Byte {z['fuss']} (Wachstum über {GRENZE['fuss']})")
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
            f" · Fussleiste bei Byte {z['fuss']}"
            f"{' (Googlebot liest 2 MiB: ' + format((z['fuss'] - GOOGLEBOT_LIMIT) // 1000, ',').replace(',', chr(39)) + ' KB davor zu viel, Ziel ≤ ' + format(ZIEL_FUSS // 1000, ',').replace(',', chr(39)) + ' KB)' if z['fuss'] > GOOGLEBOT_LIMIT else ' (vor dem Googlebot-Schnitt)'}"
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
        ("Grenze Links", any("links" in x for x in befunde(dict(z, links=921), False)), True),
        ("120× ?variant= → Befund", any("variant" in x for x in befunde(dict(z, variant_links=120, h1_versteckt=0), False)), True),
        ("versteckte H1 → Befund", "H1 versteckt" in befunde(z, False), True),
        ("H1-Text", z["h1_text"], "LuxeStyle"),
        ("?variant= nur mit Ziffer", zaehlen('<a href="/p?variant=">x</a>')["variant_links"], 0),
        ("Fussleiste-Offset", zaehlen('<html>' + 'x' * 1000 + '<footer>f</footer></html>')["fuss"], 6 + 1000),
        ("ohne Fussleiste: Länge", zaehlen('<html>abc</html>')["fuss"], len('<html>abc</html>')),
        ("Fussleiste wächst → Befund", any("Fussleiste" in x for x in befunde(dict(z, fuss=GRENZE["fuss"] + 1), False)), True),
        ("Fussleiste auf Stand → kein Befund", any("Fussleiste" in x for x in befunde(dict(z, fuss=2_407_353), False)), False),
        ("Ledger-Zeile ohne fuss rechnet weiter", befunde({"bytes": 1, "links": 1, "ueberschriften": 1, "h1": 1, "h1_versteckt": 0, "variant_links": 0}, False), []),
        ("Zeile nennt Googlebot-Schnitt", "Googlebot liest 2 MiB" in zeile(dict(z, fuss=2_407_353, karten=1, img=1, burst=1), 500, False, []), True),
        ("Zeile: vor dem Schnitt", "vor dem Googlebot-Schnitt" in zeile(dict(z, fuss=1_900_000, karten=1, img=1, burst=1), 500, False, []), True),
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
            f.write("zeit\tbytes\tlinks\tueberschriften\th1\th1_versteckt\tvariant\tkarten\timg\tburst\tzoom_out\tproc_ms\tcache\tfuss\n")
        f.write("\t".join(map(str, [dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), z["bytes"], z["links"],
                                    z["ueberschriften"], z["h1"], z["h1_versteckt"], z["variant_links"], z["karten"], z["img"],
                                    z["burst"], z["zoom_out"], f"{proc:.0f}" if proc else "", int(cache), z["fuss"]])) + "\n")
    sys.exit(0)        # Befund steht in der Zeile; Exit 1 nur bei «unklar» (sonst misst der Aufseher stündlich neu)
