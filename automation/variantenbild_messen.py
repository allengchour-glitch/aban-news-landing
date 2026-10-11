#!/usr/bin/env python3
"""variantenbild_messen.py — Messgeraet fuer die Google-Klasse «Image too small» (Bild zu klein), LIVE aus Shopify.

WARUM ES DAS GIBT (11.10.2026): google_variantenbild_gross.py zaehlt im Trockenlauf nur Medien, die NOCH NICHT im
Ledger als «ok» stehen. Sein Trockenlauf meldet darum «0», auch wenn ein Bild inzwischen wieder klein ist. Dieses Geraet
zaehlt OHNE diesen Ausschluss und liest jede «ok»-Zeile des Ledgers live zurueck (Rueckleseprobe).

MISST je Produkt: Varianten mit eigenem Bild (erstes Medium) und die Hauptbilder. Grenze MIN = 250 px auf der KUERZEREN
Seite, dieselbe Grenze wie google_variantenbild_gross.py (Bekleidung).

GEGENPROBE (--selbsttest, laeuft vor jeder Messung): (a) synthetische Bilder, echt als PNG erzeugt und wieder gelesen:
64x64, 249x741, 120x120 muessen KLEIN sein, 250x250 und 600x600 GROSS (Grenzfaelle 249/250). (b) Koeder aus dem echten
Fall: die alten Groessen aus dem Ledger (64x64, 120x120, 249x741, 188x245) muessen KLEIN zaehlen. Ein Fehlschlag = keine Messung.

AUFRUF
  python3 automation/variantenbild_messen.py --selbsttest
  python3 automation/variantenbild_messen.py                  (Handles aus dem Google-Stand, Klasse «Image too small»)
  python3 automation/variantenbild_messen.py --handles a,b    (bestimmte Produkte)
Schreibt NICHTS. Exit 0 = gemessen, 1 = Gegenprobe gefallen.
"""
import argparse, datetime as dt, io, json, os, sys
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
MIN = 250
KLASSE = "Image too small"
STAND = os.path.join(REPO, "dropship", "_google_feedback_stand.json")
LEDGER = os.path.join(REPO, "dropship", "_google_variantenbild_gross.tsv")
KOEDER = [(64, 64), (120, 120), (249, 741), (188, 245)]      # alte Groessen aus dem Ledger / Befund 03.10. (echte Faelle)
SYNTH_KLEIN = [(64, 64), (249, 741), (120, 120)]
SYNTH_GROSS = [(250, 250), (600, 600)]

Q = ('query($h:String!){p:productByIdentifier(identifier:{handle:$h}){id handle status tags '
     'media(first:10){nodes{id ... on MediaImage{image{width height}}}} '
     'variants(first:100){nodes{id title media(first:1){nodes{id ... on MediaImage{image{url width height}}}}}}}}')
RB = 'query($i:ID!){node(id:$i){... on MediaImage{id image{width height}}}}'
ANSTUPS = "gfeed-anstupsen-"


def klein(w, h):
    """True, wenn die KUERZERE Seite unter MIN liegt. Ein fehlendes Mass zaehlt als klein (lieber melden als schoenrechnen)."""
    return min(int(w or 0), int(h or 0)) < MIN


def selbsttest():
    fehler = []
    for w, h in SYNTH_KLEIN + SYNTH_GROSS:
        b = io.BytesIO()
        Image.new("RGB", (w, h), (200, 200, 200)).save(b, "PNG")
        W, H = Image.open(io.BytesIO(b.getvalue())).size          # echt erzeugt, wieder gelesen
        soll = (w, h) in SYNTH_KLEIN
        if klein(W, H) != soll:
            fehler.append(f"synthetisch {W}x{H}: {'klein' if klein(W, H) else 'gross'}, Soll {'klein' if soll else 'gross'}")
    for w, h in KOEDER:
        if not klein(w, h):
            fehler.append(f"Koeder {w}x{h} zaehlt NICHT als klein")
    if fehler:
        print("SELBSTTEST FEHLER: " + " | ".join(fehler))
        return False
    print(f"SELBSTTEST ok: {len(SYNTH_KLEIN) + len(SYNTH_GROSS)} synthetische Bilder, {len(KOEDER)} Koeder aus dem echten Fall")
    return True


def messe(handles):
    from seo_autopilot import gql                                  # eine Quelle fuer Token und Drosselung
    zeilen = []
    for h in handles:
        p = (gql(Q, {"h": h}) or {}).get("p")
        if not p:
            zeilen.append({"handle": h, "status": "fehlt", "varianten": 0, "tags": [], "klein_var": [], "klein_haupt": []})
            continue
        klein_var = []
        for v in p["variants"]["nodes"]:
            for m in v["media"]["nodes"]:
                im = m.get("image") or {}
                if im and klein(im.get("width"), im.get("height")):
                    klein_var.append({"variante": v["title"], "media": m["id"], "w": im.get("width"), "h": im.get("height")})
        klein_haupt = []
        for pos, m in enumerate(p["media"]["nodes"]):
            im = m.get("image") or {}
            if im and klein(im.get("width"), im.get("height")):
                klein_haupt.append({"pos": pos, "media": m["id"], "w": im.get("width"), "h": im.get("height")})
        zeilen.append({"handle": h, "status": p["status"], "varianten": len(p["variants"]["nodes"]),
                       "tags": [t for t in p["tags"] if t.startswith("gfeed-")], "klein_var": klein_var, "klein_haupt": klein_haupt})
    return zeilen


def rueckgelesen(handles):
    """Jede «ok»-Zeile des Ledgers live zuruecklesen: steht das Medium heute noch bei MIN oder darueber?"""
    from seo_autopilot import gql
    out = []
    if not os.path.exists(LEDGER):
        return out
    for z in open(LEDGER, encoding="utf-8"):
        f = z.rstrip("\n").split("\t")
        if len(f) >= 6 and f[1] in handles and f[5] == "ok":
            im = ((gql(RB, {"i": f[2]}) or {}).get("node") or {}).get("image") or {}
            out.append({"handle": f[1], "media": f[2], "alt": f[3], "live": f"{im.get('width')}x{im.get('height')}",
                        "gross": bool(im) and not klein(im.get("width"), im.get("height"))})
    return out


def main():
    ap = argparse.ArgumentParser(description="Live-Messung der Klasse «Image too small» (Varianten- und Hauptbilder).")
    ap.add_argument("--selbsttest", action="store_true")
    ap.add_argument("--handles", default="")
    a = ap.parse_args()
    if a.selbsttest:
        sys.exit(0 if selbsttest() else 1)
    if not selbsttest():
        print("Gegenprobe gefallen — keine Messung.")
        sys.exit(1)
    handles = [h for h in a.handles.split(",") if h] or json.load(open(STAND, encoding="utf-8"))["handles"].get(KLASSE, [])
    zeilen = messe(handles)
    rb = rueckgelesen(set(handles))
    heute = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    n_var = sum(len(z["klein_var"]) for z in zeilen)
    n_haupt = sum(1 for z in zeilen for c in z["klein_haupt"] if c["pos"] == 0)        # Hauptbild = Position 0 (image_link)
    n_galerie = sum(1 for z in zeilen for c in z["klein_haupt"] if c["pos"] > 0)       # nur Info, kein Befund der Klasse
    n_anst = sum(1 for z in zeilen if any(t.startswith(ANSTUPS) for t in z["tags"]))
    fremd = [(z["handle"][:40], t) for z in zeilen for t in z["tags"] if not t.startswith(ANSTUPS)]
    n_gross = sum(1 for r in rb if r["gross"])
    print(f"LIVE {heute}: {len(zeilen)} Produkte «{KLASSE}» · Varianten-Bilder < {MIN} px: {n_var} · "
          f"Hauptbild (Pos 0) < {MIN} px: {n_haupt} · Galerie < {MIN} px (Info): {n_galerie} · Ledger-Rueckleseprobe ≥ {MIN} px: {n_gross}/{len(rb)} · "
          f"mit Anstupser-Tag: {n_anst}/{len(zeilen)}")
    for z in zeilen:
        if z["klein_var"] or z["klein_haupt"] or z["status"] != "ACTIVE":
            print(f"  {z['handle'][:52]} [{z['status']}] Varianten {z['varianten']}: "
                  f"klein-Var {[(c['variante'], c['w'], c['h']) for c in z['klein_var']]} klein-Haupt {[(c['pos'], c['w'], c['h']) for c in z['klein_haupt']]}")
    if fremd:
        print(f"  Fremde gfeed-Tags (der Nachstuppser entfernt sie beim Schreiben): {fremd}")
    for r in rb:
        if r["gross"] is False:
            print(f"  Rueckleseprobe KLEIN: {r['handle'][:52]} Medium {r['media'][-12:]} live {r['live']}")


if __name__ == "__main__":
    main()
