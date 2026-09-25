#!/usr/bin/env python3
"""social_saison_vorrang.py — Saison-Ware (Herbst) zuerst in alle Social-Queues (25.09.2026, Betreiber «herbstsachen auf sozial pushen»).

GEMESSEN vorher: 0 von 107 wartenden Reel-/Bild-Posts waren Herbstartikel. Karussell, Pinterest und TikTok-Sets hatten schon
Herbst-Vorrang; Reels (IG/FB), Bild-Posts und TikTok/Shorts über Metricool nicht — der Bild-Nachschub nahm nur die neuesten
CJ-Produkte, der Reel-Motor ordnet nach hype/neu.

Schreibt (idempotent, täglich im Aufseher):
  dropship/_social_vorrang.txt  «handle<TAB>bis»  → Bild-, Reel- und Metricool-Poster ziehen diese Zeilen vor (post_guard.nachVorrang)
  dropship/_reel_vorrang.txt    «cj-pid<TAB>bis»  → der Reel-Motor baut Reels dieser Produkte zuerst (nur wenn CJ ein Video hat)
Fremde Zeilen in _reel_vorrang.txt (z. B. Halloween) bleiben stehen. Kadenz und alle Sperren bleiben unverändert.
ENV: TAG (Std. herbst-2026), BIS (Std. 2026-11-30)
"""
import os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = os.environ.get("TAG", "herbst-2026")
BIS = os.environ.get("BIS", "2026-11-30")
HANDLES = os.path.join(REPO, "dropship/_social_vorrang.txt")
REEL = os.path.join(REPO, "dropship/_reel_vorrang.txt")


def main():
    if time.strftime("%Y-%m-%d") > BIS:
        open(HANDLES, "w").close()
        print(f"FERTIG: Saison vorbei ({BIS}) — Vorrangliste geleert")
        return
    hs, pids, c = [], [], None
    while True:
        r = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{handle variants(first:1){nodes{sku}}}}}', {"q": f"tag:{TAG} status:active", "c": c})["products"]
        for n in r["nodes"]:
            hs.append(n["handle"])
            m = re.match(r"CJ-([0-9A-Za-z-]{10,})", (n["variants"]["nodes"] or [{}])[0].get("sku") or "")
            if m:
                pids.append(m.group(1))
        if not r["pageInfo"]["hasNextPage"]:
            break
        c = r["pageInfo"]["endCursor"]
    if not hs:
        print("⚠️ 0 Produkte mit Tag — Vorrangliste NICHT überschrieben (Messfehler ≠ leere Saison)")
        return
    with open(HANDLES + ".tmp", "w") as fh:
        fh.writelines(f"{h}\t{BIS}\n" for h in hs)
    os.replace(HANDLES + ".tmp", HANDLES)
    alt = [z.rstrip("\n") for z in open(REEL)] if os.path.exists(REEL) else []
    fremd = [z for z in alt if z and z.split("\t")[0] not in set(pids)]
    with open(REEL + ".tmp", "w") as fh:
        fh.writelines(z + "\n" for z in fremd)          # Halloween & Co. zuerst — sie laufen früher ab
        fh.writelines(f"{p}\t{BIS}\n" for p in pids)
    os.replace(REEL + ".tmp", REEL)
    print(f"FERTIG: {len(hs)} Handles Vorrang (Bild/Reel/Metricool), {len(pids)} CJ-pids Reel-Vorrang, {len(fremd)} fremde Reel-Zeilen behalten")


if __name__ == "__main__":
    main()
