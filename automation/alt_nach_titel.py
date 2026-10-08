#!/usr/bin/env python3
"""alt_nach_titel.py — Bild-Alt-Texte nachziehen, wenn der Produkttitel korrigiert wurde (05.10.2026, Nachbesserung «titel-neuimport»).

ANLASS: Die Titel-Korrekturen (Ledger dropship/_titel_kauderwelsch.tsv, 147 Zeilen «→ neu») und die Nachbesserung
(_titel_nachbesserung_2026-10-05.json) liessen die Alt-Texte stehen — gemessen 07:1x auf luxestyle.ch/products/leinwand-
gestelltes-leder-sessel-…: alle 12 Bilder trugen noch «Leinwand-gestelltes Leder-Sessel mit Stauraum – Bild N | LuxeStyle».
alt_texte_nachziehen.py füllt NUR leere Alts (bewusst), also braucht es diesen Lauf.

REGEL: nur Alts, die mit dem ALTEN Titel beginnen (Schema «<Titel> | LuxeStyle» / «<Titel> – Bild N | LuxeStyle»), werden
auf den NEUEN Titel umgeschrieben; fremde oder handgeschriebene Alts bleiben. Liest LIVE (Titel muss = neuer Titel sein,
sonst übersprungen). Ledger dropship/_alt_nach_titel.tsv (zeit, produkt, media, alt, neu, status) → umkehrbar.
  python3 automation/alt_nach_titel.py            # trocken
  SCHARF=1 python3 automation/alt_nach_titel.py   # schreiben + zurücklesen (Gleichheit)
"""
import json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship/_alt_nach_titel.tsv")
Q = 'query($id:ID!){product(id:$id){id title status media(first:50){nodes{id alt}}}}'
M = 'mutation($id:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$id,media:$m){media{id alt} mediaUserErrors{message}}}'


def nz(s):
    return (s or "").replace("‑", "-").replace(" ", " ").replace("\xa0", " ").strip()


def paare():
    """{produkt-gid: (alt_titel, neu_titel)} — letzte Zeile je Produkt gewinnt (Nachbesserung nach Erstkorrektur)."""
    out = {}
    f = os.path.join(REPO, "dropship/_titel_kauderwelsch.tsv")
    for l in open(f, encoding="utf-8"):
        t = l.rstrip("\n").split("\t")
        if len(t) >= 4 and t[3].startswith("→ "):
            out[t[0]] = (nz(t[2]), nz(t[3][2:]))
    # 08.10.: material_widerspruch.py (Leder → Kunstleder, Wolle → Acryl …) korrigiert Titel — Ledger id, alt, neu, datum
    m = os.path.join(REPO, "dropship/_material_widerspruch.tsv")
    if os.path.exists(m):
        for l in open(m, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 3 and t[0].startswith("gid://") and t[1] != t[2]:
                out[t[0]] = (nz(t[1]), nz(t[2]))
    j = os.path.join(REPO, "dropship/_titel_nachbesserung_2026-10-05.json")
    if os.path.exists(j):
        for e in json.load(open(j, encoding="utf-8")):
            out[e["id"]] = (nz(e["alt"]["title"]), nz(e["neu"]["title"]))
    return out


def main():
    P = paare()
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(P)} Produkte mit korrigiertem Titel · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    getan = fehler = uebersprungen = 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for pid, (alt_t, neu_t) in P.items():
        p = gql(Q, {"id": pid})["product"]
        if not p or nz(p["title"]) != neu_t:
            uebersprungen += 1; continue
        aend = []
        for m in p["media"]["nodes"]:
            a = nz(m["alt"])
            if a.startswith(alt_t) and alt_t != neu_t:
                aend.append((m["id"], m["alt"], neu_t + a[len(alt_t):]))
        if not aend:
            continue
        if not SCHARF:
            print(f"  {neu_t[:50]}: {len(aend)} Alts, z. B. {aend[0][1]!r} → {aend[0][2]!r}"); getan += len(aend); continue
        r = gql(M, {"id": pid, "m": [{"id": i, "alt": n} for i, _, n in aend]})["productUpdateMedia"]
        live = {x["id"]: x["alt"] for x in (r.get("media") or [])}
        for i, a, n in aend:
            ok = not r.get("mediaUserErrors") and live.get(i) == n
            getan += ok; fehler += not ok
            led.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), pid, i, (a or "").replace("\t", " "), n, "ok" if ok else f"FEHLER {str(r.get('mediaUserErrors'))[:60]}"]) + "\n")
        time.sleep(0.3)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {getan} Alt-Texte {'gesetzt (gleich zurückgelesen)' if SCHARF else 'würden gesetzt'}, {fehler} Fehler, {uebersprungen} Produkte übersprungen (Titel ≠ Ledger)")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
