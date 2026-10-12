#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pod_editor_umstellen.py — stellt Selbst-gestalten-Produkte auf eine andere Editor-Datei um (12.10.2026).

Ersetzt in der Produktbeschreibung NUR die Script-Adresse des Editors (ALT → NEU), liest jedes Produkt
zurück und protokolliert je Produkt. Der Rückweg ist derselbe Aufruf mit vertauschtem ALT und NEU.

  python3 automation/pod_editor_umstellen.py --alt URL --neu URL [--handle h ...]           # Trockenlauf
  SCHARF=1 python3 automation/pod_editor_umstellen.py --alt URL --neu URL [--handle h ...]  # schreibt

Ohne --handle: alle Handles aus dropship/_lspod_v3_switch.tsv (Spalte 2) — die Liste der letzten Umstellung,
nichts geraten. Ein Produkt, dessen Beschreibung ALT nicht genau einmal enthält, wird übersprungen.
Protokoll: dropship/_lspod_v3_switch.tsv (Zeit, Handle, «v4->v5» aus den Dateinamen).
"""
import argparse, os, re, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from seo_autopilot import gql  # noqa: E402

LOG = os.path.join(REPO, "dropship", "_lspod_v3_switch.tsv")
SCHARF = os.environ.get("SCHARF") == "1"


def version(url):
    m = re.search(r"lspod-designer-(v\d+)\.js", url)
    return m.group(1) if m else "?"


def handles_aus_log():
    seen, out = set(), []
    for zeile in open(LOG, encoding="utf-8"):
        teile = zeile.rstrip("\n").split("\t")
        if len(teile) >= 2 and teile[1] and teile[1] not in seen:
            seen.add(teile[1])
            out.append(teile[1])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--alt", required=True)
    ap.add_argument("--neu", required=True)
    ap.add_argument("--handle", action="append", default=[])
    a = ap.parse_args()
    if a.alt == a.neu or "lspod-designer-" not in a.alt or "lspod-designer-" not in a.neu:
        sys.exit("ALT und NEU müssen verschiedene lspod-designer-Adressen sein.")
    schritt = f"{version(a.alt)}->{version(a.neu)}"
    handles = a.handle or handles_aus_log()
    print(f"{len(handles)} Handles · {schritt} · {'SCHARF' if SCHARF else 'Trockenlauf'}")
    q = "query($h:String!){ productByHandle(handle:$h){ id handle status descriptionHtml } }"
    m = ("mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id descriptionHtml } "
         "userErrors{ field message } } }")
    zahl = {"umgestellt": 0, "schon": 0, "übersprungen": 0, "fehler": 0, "wäre": 0}
    for h in handles:
        p = gql(q, {"h": h}).get("productByHandle")
        if not p:
            print(f"  ✗ {h}: nicht gefunden"); zahl["übersprungen"] += 1; continue
        html = p["descriptionHtml"] or ""
        n_alt, n_neu = html.count(a.alt), html.count(a.neu)
        if n_alt == 0 and n_neu == 1:
            print(f"  = {h}: schon {version(a.neu)}"); zahl["schon"] += 1; continue
        if n_alt != 1:
            print(f"  ✗ {h}: ALT {n_alt}× in der Beschreibung — übersprungen ({p['status']})"); zahl["übersprungen"] += 1; continue
        neu = html.replace(a.alt, a.neu)
        if not SCHARF:
            print(f"  → {h} ({p['status']})"); zahl["wäre"] += 1; continue
        d = gql(m, {"i": {"id": p["id"], "descriptionHtml": neu}})["productUpdate"]
        zurueck = (d.get("product") or {}).get("descriptionHtml") or ""
        if d["userErrors"] or a.neu not in zurueck or a.alt in zurueck:
            print(f"  ✗ {h}: Schreiben/Rücklesen fehlgeschlagen {d['userErrors']}"); zahl["fehler"] += 1; continue
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{h}\t{schritt}\n")
        print(f"  ✓ {h} ({p['status']}) zurückgelesen"); zahl["umgestellt"] += 1
    print("Ergebnis:", " · ".join(f"{k} {v}" for k, v in zahl.items() if v))
    return 0 if zahl["fehler"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
