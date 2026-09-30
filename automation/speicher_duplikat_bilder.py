#!/usr/bin/env python3
"""speicher_duplikat_bilder.py — Bilder der Duplikat-Entwürfe löschen, um den Shopify-Dateispeicher unter das Limit zu bringen
(30.09.2026, Betreiber-Entscheid «Ja, Duplikat-Bilder löschen»).

GEMESSEN 30.09.: Dateispeicher ~105 von 100 GB (FILE_STORAGE_LIMIT_EXCEEDED bei jedem Upload — Tatis Model-Fotos, Handy-Set).
Bulk-Export aller Entwürfe: 29'956 Produkte, 94'182 Bilder, 22,31 GB; davon Tag `duplikat-auto-draft` 4'913 Produkte /
25'863 Bilder / 6,83 GB. Ein Duplikat-Entwurf ist nach Regel 2 ein Doppel eines aktiven Produkts (dup_title_fix /
dedup_by_image) — er wird nie wieder aktiv. Die ENTWÜRFE BLEIBEN (Regel 2: nie löschen), nur ihre Bilder gehen.

Wachen:
  1. nur Produkte mit Tag `duplikat-auto-draft` UND Status DRAFT — beides unmittelbar vor dem Löschen live nachgefragt;
  2. kein Bild, dessen Media-ID auch an einem aktiven/archivierten Produkt hängt (Export EXPORT_AKTIV);
  3. Etappen (N Produkte je Lauf), Nachweis-Liste dropship/_speicher_geloescht.tsv (Produkt, Anzahl, Bytes, Datum) —
     schon bearbeitete Produkte werden übersprungen;
  4. Rücklesen: nach dem Löschen hat das Produkt 0 Medien.
Trockenlauf (Standard) zählt nur.

  EXPORT_DRAFT=/tmp/claude-0/drafts_media.jsonl EXPORT_AKTIV=/tmp/claude-0/aktiv_media.jsonl python3 automation/speicher_duplikat_bilder.py
  … SCHARF=1 N=200 python3 automation/speicher_duplikat_bilder.py
"""
import json, os, sys, time
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_speicher_geloescht.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
N = int(os.environ.get("N", "200"))
TAG = "duplikat-auto-draft"


def lade():
    prod, med = {}, defaultdict(list)
    for l in open(os.environ["EXPORT_DRAFT"]):
        o = json.loads(l)
        if "__parentId" in o:
            if o.get("id"):
                med[o["__parentId"]].append((o["id"], (o.get("originalSource") or {}).get("fileSize") or 0))
        elif str(o.get("id", "")).startswith("gid://shopify/Product/"):
            prod[o["id"]] = o
    aktiv = set()
    for l in open(os.environ["EXPORT_AKTIV"]):
        o = json.loads(l)
        if "__parentId" in o and o.get("id"):
            aktiv.add(o["id"])
    return prod, med, aktiv


def main():
    prod, med, aktiv = lade()
    fertig = {l.split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    # Editor/POD (Regel 4 «heilig»): auch als Duplikat nicht anfassen — der erste Probelauf traf pod-sticker-tattoo-snake
    # (Original pod-sticker-snake-cute blieb intakt, 2 Bilder), der Ausschluss ist Vorsicht, kein Befund.
    kand = [p for p in prod.values() if TAG in p["tags"] and med.get(p["id"]) and p["id"] not in fertig
            and not p["handle"].startswith("pod-")]
    geteilt = sum(1 for p in kand for m, _ in med[p["id"]] if m in aktiv)
    ges = sum(s for p in kand for _, s in med[p["id"]])
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(kand)} Duplikat-Entwürfe mit Bildern · "
          f"{sum(len(med[p['id']]) for p in kand)} Bilder · {ges / 1e9:.2f} GB · mit aktivem Produkt geteilt: {geteilt} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'} N={N}", flush=True)
    if not SCHARF:
        return 0
    led = open(LEDGER, "a", encoding="utf-8")
    frei = geloescht = uebersprungen = fehler = 0
    for i in range(0, min(N, len(kand)), 50):
        teil = kand[i:min(i + 50, N)]
        live = hw.gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status tags}}}', {"ids": [p["id"] for p in teil]})
        zust = {n["id"]: n for n in ((live.get("data") or {}).get("nodes") or []) if n}
        for p in teil:
            z = zust.get(p["id"])
            if not z or z["status"] != "DRAFT" or TAG not in z["tags"]:
                uebersprungen += 1; continue
            ids = [m for m, _ in med[p["id"]] if m not in aktiv]
            if not ids:
                uebersprungen += 1; continue
            r = hw.gql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}',
                       {"p": p["id"], "m": ids})
            d = ((r.get("data") or {}).get("productDeleteMedia") or {})
            if d.get("mediaUserErrors") or not d.get("deletedMediaIds"):
                fehler += 1; print(f"  ⚠️ {p['handle']}: {d.get('mediaUserErrors') or r.get('errors')}", file=sys.stderr, flush=True); continue
            b = sum(s for m, s in med[p["id"]] if m in set(d["deletedMediaIds"]))
            frei += b; geloescht += len(d["deletedMediaIds"])
            led.write(f"{p['id']}\t{p['handle']}\t{len(d['deletedMediaIds'])}\t{b}\t{time.strftime('%Y-%m-%d')}\n"); led.flush()
        # Rücklesen je Etappe
        rb = hw.gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id mediaCount{count}}}}', {"ids": [p["id"] for p in teil]})
        rest = [n for n in ((rb.get("data") or {}).get("nodes") or []) if n and n["mediaCount"]["count"] > 0]
        print(f"  Etappe {i // 50 + 1}: bisher {geloescht} Bilder, {frei / 1e9:.2f} GB · mit Restmedien nach Rücklesen: {len(rest)}", flush=True)
        time.sleep(1)
    print(f"FERTIG: {geloescht} Bilder gelöscht, {frei / 1e9:.2f} GB · übersprungen {uebersprungen} · Fehler {fehler}", flush=True)
    return 0 if not fehler else 3


if __name__ == "__main__":
    sys.exit(main())
