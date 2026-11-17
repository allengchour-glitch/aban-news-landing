#!/usr/bin/env python3
"""Wertet scan_nachher.jsonl (nach dem Fix) gegen scan.jsonl (Codex-Stand vorher) und quelle.json (Orakel aus dem Admin-Menü) aus."""
import json, re, collections
vor = {json.loads(l)["h"]: json.loads(l) for l in open("../scan.jsonl")}
nach = [json.loads(l) for l in open("scan_nachher.jsonl")]
q = {e["h"]: e for e in json.load(open("quelle.json"))}
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[^\w& ]", " ", (s or "").lower())).strip()
z = collections.Counter(); auff = collections.defaultdict(list)
for r in nach:
    h = r["h"]; v = vor.get(h, {}); o = q.get(h, {})
    z["seiten"] += 1
    if r["status"] != 200: auff["status"].append((h, r["status"]))
    if r["liquid"]: auff["liquid"].append((h, r["liquid"]))
    if r["noindex"]: auff["noindex"].append(h)
    if r["h1n"] != 1: auff["h1"].append((h, r["h1n"]))
    if r["karten"] == 0: auff["keine_produkte"].append(h)
    if r["bytes"] > 2097152: auff["ueber_2MiB"].append((h, r["bytes"]))
    elif r["bytes"] > 1950000: auff["nahe_2MiB"].append((h, r["bytes"]))
    k = r["kacheln"]; n = len(k); vn = v.get("kacheln", 0)
    z["mit_kacheln"] += n > 0; z["neu_kacheln"] += (n > 0 and vn == 0); z["weniger_kacheln"] += n < vn
    if n < vn: auff["weniger_kacheln_als_vorher"].append((h, vn, n))
    titel = [norm(t) for _, t, _ in k]; bilder = [b for _, _, b in k if b]
    dt = sorted({t for t in titel if titel.count(t) > 1})
    if dt: auff["doppelte_kacheltitel"].append((h, dt))
    db = sorted({b for b in bilder if bilder.count(b) > 1})
    if db: auff["doppelte_kachelbilder"].append((h, len(db), [(x[0], x[1]) for x in k if x[2] in db]))
    sicht = k[:4]
    dts = [t for t in [norm(t) for _, t, _ in sicht] if [norm(t) for _, t, _ in sicht].count(t) > 1]
    if dts: auff["doppelt_in_ersten_4"].append((h, dts))
    if any(x[0] == "smoke-zubehoer" for x in k) or any(x[0] == "smoke-zubehoer" for x in r["geschw"]): auff["smoke"].append(h)
    if any(x[0] == h for x in k) or any(x[0] == h for x in r["geschw"]): auff["selbstlink"].append(h)
    # Knopf
    soll_knopf = n > 4
    if soll_knopf != bool(r["knopf"]): auff["knopf_falsch"].append((h, n, r["knopf"]))
    if r["knopf"] and str(n) not in r["knopf"]: auff["knopf_zahl"].append((h, n, r["knopf"]))
    if n > 4 and "lx-welten__grid--kurz" not in (r["grid"] or ""): auff["kurz_fehlt"].append(h)
    # Orakel: alle Menü-Kinder (ohne Metafeld-Vorrang) als Kachel?
    if o and not o.get("unterfilter"):
        okh = list(dict.fromkeys(x[0] for x in o["kinder"]))
        kh = [x[0] for x in k]
        fehlt = [x for x in okh if x not in kh]
        if fehlt: auff["orakel_fehlt"].append((h, fehlt))
        extra = [x for x in kh if x not in okh]
        if extra and okh: auff["orakel_extra"].append((h, extra))
    # Pfad: Selbstverweis im Brotkrumen
    if r["ld"].count(f"/collections/{h}\"") > 1: auff["ld_selbst_doppelt"].append(h)
    if r["geschw"] and any(x[0] == (o.get("eltern") or "") for x in r["geschw"]): auff["eltern_in_nachbarn"].append(h)
print(dict(z))
for key, val in auff.items():
    print(f"\n## {key}: {len(val)}")
    for x in val[:40]: print("  ", x)
json.dump(auff, open("auswertung.json", "w"), ensure_ascii=False, indent=1)
