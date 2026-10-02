#!/usr/bin/env python3
"""video_prio_index.py — Vorrangliste für den Lieferantenvideo-Nachtrag: nur Produkte, die bei CJ WIRKLICH ein Video haben.

ANLASS (02.10.2026, Betreiber «grow videos push»): `cj_video_backfill.mjs` arbeitete `dropship/_video_prio.txt` (sichtbare Ware)
ab — Ledger: 403 geprüft, **375 «kein-video-beim-lieferanten»** (93 % der knappen CJ-Aufrufe ins Leere). Gleichzeitig kennt
`dropship/_cj_video_index.json` (`shop_video`, aus `product/list` mit isVideo) 1'068 CJ-pids aus unserem Sortiment MIT Video —
keines davon war je im Nachtrag. Seit Grow (01.10.) gilt der Deckel 1'000 statt 250 Videos.

Baut `dropship/_video_prio_index.txt` (Produkt-GIDs, ACTIVE, CJ-pid in shop_video, noch nicht im Nachtrags-Ledger):
zuerst die sichtbaren (_video_prio.txt), dann der Rest. Zuordnung pid → Produkt über die Varianten-SKU `CJ-<pid>` im
Kosten-Export /tmp/kost28.jsonl (Status aus /tmp/export.jsonl) — KEIN CJ-Aufruf. Schreibt nur die Liste, nie den Shop.
"""
import json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(REPO, "dropship", *p)
PID = re.compile(r"^CJ-([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}|\d{15,})")


def main():
    for f in ("/tmp/kost28.jsonl", "/tmp/export.jsonl"):
        if not os.path.exists(f):
            print(f"VIDEO-PRIO: {f} fehlt — Liste bleibt unverändert"); return 1
    pids = {p.upper() for p in (json.load(open(D("_cj_video_index.json"))).get("shop_video") or {})}
    status = {}
    for l in open("/tmp/export.jsonl"):
        o = json.loads(l); status[o["id"]] = o.get("status")
    treffer = {}
    for l in open("/tmp/kost28.jsonl"):
        o = json.loads(l)
        if "__parentId" in o and o.get("sku"):
            m = PID.match(o["sku"].upper())
            if m and m.group(1) in pids:
                treffer.setdefault(o["__parentId"], m.group(1))
    aktiv = {g for g in treffer if status.get(g) == "ACTIVE"}
    led = {l.split("\t")[0] for l in open(D("_cj_video_backfill.txt")) if "\t" in l} if os.path.exists(D("_cj_video_backfill.txt")) else set()
    sichtbar = [x.strip() for x in open(D("_video_prio.txt")) if x.strip()] if os.path.exists(D("_video_prio.txt")) else []
    reihe = [g for g in sichtbar if g in aktiv] + sorted(aktiv - set(sichtbar))
    reihe = [g for g in dict.fromkeys(reihe) if g not in led]
    tmp = D("_video_prio_index.txt.tmp")
    open(tmp, "w").write("\n".join(reihe) + "\n"); os.replace(tmp, D("_video_prio_index.txt"))
    # Zweite Liste: rohe CJ-Videos, die SCHON LOKAL liegen (Server-Downloads für den Reel-Motor) → video_lokal_anhaengen.mjs
    # hängt sie ohne CJ-Aufruf an (02.10.: 107 Dateien, alle zu aktiven Produkten ohne Video).
    import glob
    dateien = {}
    for f in glob.glob(os.path.join(REPO, "auftraege", "ergebnis", "*-rq-*.mp4")) + glob.glob("/tmp/reelbuild/src_*.mp4"):
        m = re.search(r"(?:rq-|src_)([0-9A-Za-z-]+)\.mp4$", f)
        if m and (m.group(1).upper() not in dateien or os.path.getsize(f) > os.path.getsize(dateien[m.group(1).upper()])):
            dateien[m.group(1).upper()] = f
    zu = {}
    for l in open("/tmp/kost28.jsonl"):
        o = json.loads(l)
        if "__parentId" in o and o.get("sku"):
            m = PID.match(o["sku"].upper())
            if m and m.group(1) in dateien:
                zu.setdefault(o["__parentId"], m.group(1))
    paare = [[g, p, dateien[p]] for g, p in zu.items() if status.get(g) == "ACTIVE" and g not in led]
    tmp = D("_video_lokal_paare.json.tmp")
    json.dump(paare, open(tmp, "w")); os.replace(tmp, D("_video_lokal_paare.json"))
    print(f"VIDEO-LOKAL: {len(dateien)} lokale CJ-Videos · {len(paare)} offen → dropship/_video_lokal_paare.json")
    print(f"VIDEO-PRIO: Index {len(pids)} CJ-pids mit Video · {len(aktiv)} aktive Shop-Produkte · "
          f"{sum(1 for g in sichtbar if g in aktiv)} sichtbar · {len(reihe)} offen → dropship/_video_prio_index.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
