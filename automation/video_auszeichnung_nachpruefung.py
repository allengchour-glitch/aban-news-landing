#!/usr/bin/env python3
"""video_auszeichnung_nachpruefung.py — Besucher-Probe nach dem Einbau des VideoObject-Blocks (22.10.2026).

Lädt 1–2 Video-Produktseiten und 2 Kontrollseiten (je N Abrufe, 7 s Abstand) und wertet NUR Antworten mit `render;dur` im Server-Timing-Header
(sonst ist es eine Cache-Kopie und sagt nichts über das neue Theme — 2 von 6 Abrufen kamen am 22.10. ohne). Prüft je Antwort:
kein «Liquid error/syntax error», alle ld+json parsen, Kaufknopf-Marker + ProductGroup/Product vorhanden, Zahl der VideoObject (Video-Seite 1, Kontrolle 0).
Exit 0 = alles in Ordnung, 1 = Fehler → SOFORT `video_auszeichnung_einbauen.py --zurueck`, 3 = keine auswertbare Antwort (Cache) — KEIN Rückrollgrund.
  python3 automation/video_auszeichnung_nachpruefung.py [N=3]
"""
import json, re, subprocess, sys, time

VIDEO = ["kerzenlicht-aromadiffuser-412288", "kreative-nachrichtentafel-953728"]
KONTROLLE = ["haarklammern-623200", "schultertasche-600600"]
BASIS = "https://luxestyle.ch/products/"


def hole(handle):
    """Header und Body getrennt in Dateien (`-D -` vermischt beide; mit Proxy steht zusätzlich die CONNECT-Antwort davor — 22.10. Fehlalarm bei 12/12)."""
    import os, tempfile
    d = tempfile.mkdtemp()
    kopf_f, body_f = os.path.join(d, "h"), os.path.join(d, "b")
    subprocess.run(["curl", "-s", "-m", "40", "-D", kopf_f, "-o", body_f, "-A", "Mozilla/5.0 (compatible; luxe-nachpruefung)",
                    BASIS + handle + f"?np={int(time.time())}"], capture_output=True)
    kopf = open(kopf_f, encoding="utf-8", errors="replace").read() if os.path.exists(kopf_f) else ""
    body = open(body_f, encoding="utf-8", errors="replace").read() if os.path.exists(body_f) else ""
    return kopf, body


def werte(handle, soll_video):
    kopf, k = hole(handle)
    if not re.search(r"render;dur", kopf, re.I):
        return "cache", handle, []
    f = []
    if re.search(r"Liquid (syntax )?error", k):
        f.append("«Liquid error» im HTML")
    bloecke = re.findall(r'<script type="application/ld\+json">(.*?)</script>', k, re.S)
    typen = []
    for b in bloecke:
        try:
            j = json.loads(b)
        except Exception as e:
            f.append(f"ld+json nicht parsebar ({str(e)[:40]})")
            continue
        typen += [x.get("@type") for x in (j if isinstance(j, list) else j.get("@graph", [j])) if isinstance(x, dict)]
    if not any(t in ("ProductGroup", "Product") for t in typen):
        f.append("kein Product/ProductGroup-JSON-LD")
    if not re.search(r'name="add"|product-form|add-to-cart', k):
        f.append("Kaufknopf-Marker fehlt")
    n = typen.count("VideoObject")
    if n != (1 if soll_video else 0):
        f.append(f"{n}× VideoObject (soll {1 if soll_video else 0})")
    return ("fehler" if f else "ok"), handle, f


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3
    zaehl = {"ok": 0, "fehler": 0, "cache": 0}
    fehler = []
    for i in range(n):
        for h, v in [(x, True) for x in VIDEO] + [(x, False) for x in KONTROLLE]:
            st, hh, f = werte(h, v)
            zaehl[st] += 1
            if f:
                fehler.append(f"{hh}: {'; '.join(f)}")
            print(f"  {'✅' if st == 'ok' else ('⏭️ Cache' if st == 'cache' else '❌')} {hh}" + (f" — {'; '.join(f)}" if f else ""), flush=True)
        if i < n - 1:
            time.sleep(7)
    print(f"NACHPRÜFUNG: {zaehl['ok']} ok · {zaehl['fehler']} Fehler · {zaehl['cache']} Cache-Antworten (nicht gewertet)")
    if fehler:
        print("→ SOFORT ZURÜCK: python3 automation/video_auszeichnung_einbauen.py --zurueck")
        return 1
    return 0 if zaehl["ok"] else 3


if __name__ == "__main__":
    sys.exit(main())
