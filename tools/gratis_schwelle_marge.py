#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gratis_schwelle_marge.py — Margenprüfung vor/nach einer Senkung der Gratis-Schwelle CH (13.10.2026, Entscheid D).

FRAGE: Wenn der Tarif «Kostenloser Versand» in der Schweiz statt ab 45 schon ab SCHWELLE (40.50) greift, zahlt ein
Einzelkorb mit Preis 40.50–44.99 keine CHF 7 Versand mehr. Bleibt dann noch etwas übrig?
  ohne Code:   Preis P in [SCHWELLE, 45)          nachher = P − EK − 3 % · P            (vorher + 7.00)
  WELCOME10:   Preis P mit 0,9·P in [SCHWELLE, 45) nachher = 0,9·P − EK − 3 % · 0,9·P (vorher + 7.00)
EK = unitCost der Variante. ⚠️ unitCost ENTHÄLT die Lieferanten-Fracht schon (CJ: cj_kosten_backfill «Ware + VOLLE
Fracht», Fortura: «+ DPD 9.50») — nicht zweimal abziehen (Fehler 15.09.). Fehlender unitCost = UNBEKANNT (eigene Spalte).
Nicht betroffen: Produkte, deren reiner Korb schon heute 0.00 kostet (Tag profil-ch-lager, Mitglieder «Druck auf
Bestellung» laut Shop-Metafeld luxe.druck_profil_ids).

Eingaben: EXPORT_KOSTEN (Standard /tmp/kost28.jsonl, Bulk mit price + unitCost, Kosten-Kette des Aufsehers) und
EXPORT_TAGS (Standard /tmp/anlass_social_export.jsonl oder ein anderer Export mit status + tags). Beide sind
Momentaufnahmen → Preis/EK = Stand des Exports (Alter wird ausgegeben).

  python3 tools/gratis_schwelle_marge.py                 # Zusammenfassung + dropship/_gratis_schwelle_marge.tsv
  SCHWELLE=40.5 GEBUEHR=0.03 python3 tools/gratis_schwelle_marge.py
"""
import json
import os
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))

SCHWELLE = float(os.environ.get("SCHWELLE", "40.5"))
ALT = 45.0
GEBUEHR = float(os.environ.get("GEBUEHR", "0.03"))
STRENG = (0.029, 0.30, 0.015)     # tools/marge_wahrheit.py: 2.9 % + 0.30 + 1.5 % Währung
EXPORT_KOSTEN = os.environ.get("EXPORT_KOSTEN", "/tmp/kost28.jsonl")
EXPORT_TAGS = os.environ.get("EXPORT_TAGS", "/tmp/anlass_social_export.jsonl")
AUS = os.path.join(REPO, "dropship", "_gratis_schwelle_marge.tsv")


def druck_ids():
    try:
        from kaufwille_zeile import gql
        v = gql('{shop{metafield(namespace:"luxe",key:"druck_profil_ids"){value}}}')["shop"]["metafield"]
        return {x.strip() for x in ((v or {}).get("value") or "").split(",") if x.strip()}
    except Exception as e:  # pragma: no cover
        print("⚠️ Druck-Metafeld nicht lesbar:", str(e)[:120])
        return set()


def lade_tags(pfad):
    prod = {}
    for z in open(pfad, encoding="utf-8"):
        try:
            o = json.loads(z)
        except ValueError:
            continue
        i = o.get("id") or ""
        if "/Product/" in i and "status" in o:
            prod[i] = (o.get("status"), set(o.get("tags") or []), o.get("title", ""), o.get("handle", ""))
    return prod


LIVE_Q = ("status:active price:>=40.5 price:<50 (tag:ch-lager OR tag:fortura OR tag:printful_personalized_product "
          "OR tag:prodigi_personalized_product OR tag:selbst-gestalten)")


def live_varianten():
    """Ware, die im Tag-Export fehlt (Fortura/Druck), LIVE: {variant_gid: (zeile_wie_export, produkt_tuple)}."""
    from kaufwille_zeile import gql
    q = ("query($q:String!,$n:String){products(first:30,after:$n,query:$q){pageInfo{hasNextPage endCursor} nodes{id handle "
         "title status tags variants(first:30){nodes{id sku price inventoryItem{unitCost{amount}}}}}}}")
    aus, nach = {}, None
    while True:
        d = gql(q, {"q": LIVE_Q, "n": nach})["products"]
        for p in d["nodes"]:
            pt = (p["status"], set(p["tags"]), p["title"], p["handle"])
            for v in p["variants"]["nodes"]:
                aus[v["id"]] = ({"id": v["id"], "sku": v["sku"], "price": v["price"], "inventoryItem": v["inventoryItem"],
                                 "__parentId": p["id"]}, pt)
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def netto(p, ek, streng=False):
    if streng:
        g, f, fx = STRENG
        return p - ek - (p * g + f) - p * fx
    return p - ek - GEBUEHR * p


def main():
    alt_k = (time.time() - os.path.getmtime(EXPORT_KOSTEN)) / 3600
    alt_t = (time.time() - os.path.getmtime(EXPORT_TAGS)) / 3600
    prod = lade_tags(EXPORT_TAGS)
    dids = druck_ids()
    zeilen, unbekannt, ausgenommen = [], {"ohne": 0, "welcome": 0}, 0
    gesehen = set()
    lv = live_varianten()
    print(f"  live ergänzt: {len(lv)} Varianten ({LIVE_Q})")

    def quelle():
        for z in open(EXPORT_KOSTEN, encoding="utf-8"):
            try:
                o = json.loads(z)
            except ValueError:
                continue
            if "/ProductVariant/" in (o.get("id") or "") and o["id"].replace("\\/", "/") not in lv:
                yield o, prod.get(o.get("__parentId"))
        for o, pt in lv.values():
            yield o, pt

    ohne_tag = set()
    for o, st in quelle():
        pid = o.get("__parentId")
        if not st or st[0] != "ACTIVE":
            continue
        try:
            p = float(o.get("price") or 0)
        except ValueError:
            continue
        fall = "ohne" if SCHWELLE <= p < ALT else ("welcome" if SCHWELLE <= round(p * 0.9, 2) < ALT else None)
        if not fall:
            continue
        nid = pid.rsplit("/", 1)[-1]
        if "profil-ch-lager" in st[1] or nid in dids:
            ausgenommen += 1
            continue
        uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        if uc is None:
            unbekannt[fall] += 1
            continue
        ek = float(uc)
        basis = p if fall == "ohne" else round(p * 0.9, 2)
        n, ns = netto(basis, ek), netto(basis, ek, True)
        zeilen.append((fall, round(n, 2), round(ns, 2), round(n + 7, 2), p, ek, nid, st[3], st[2], o.get("sku") or "",
                       "ch-lager" in st[1] or "fortura" in st[1]))
        gesehen.add((fall, pid))
    # Export-Stand ≠ live (Preise werden gehoben, 13.10. gemessen: 3 «Verlust»-Varianten waren live längst teurer):
    # jede Variante mit netto < 3 (auch streng) LIVE neu lesen und neu einordnen.
    verdacht = sorted({r[6] for r in zeilen if r[2] < 3 or r[1] < 3})
    if verdacht:
        from kaufwille_zeile import gql
        neu = [r for r in zeilen if r[6] not in verdacht]
        for nid in verdacht:
            d = gql('query($id:ID!){product(id:$id){status handle title tags variants(first:100){nodes{sku price '
                    'inventoryItem{unitCost{amount}}}}}}', {"id": f"gid://shopify/Product/{nid}"})["product"]
            if not d or d["status"] != "ACTIVE":
                continue
            for v in d["variants"]["nodes"]:
                p = float(v["price"])
                fall = "ohne" if SCHWELLE <= p < ALT else ("welcome" if SCHWELLE <= round(p * 0.9, 2) < ALT else None)
                uc = ((v.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
                if not fall or uc is None:
                    continue
                basis = p if fall == "ohne" else round(p * 0.9, 2)
                ek = float(uc)
                neu.append((fall, round(netto(basis, ek), 2), round(netto(basis, ek, True), 2), round(netto(basis, ek) + 7, 2),
                            p, ek, nid, d["handle"], d["title"], v.get("sku") or "", "ch-lager" in d["tags"]))
        print(f"  live nachgeprüft (netto < 3 im Export): {len(verdacht)} Produkte")
        zeilen = neu
    zeilen.sort(key=lambda r: r[1])
    with open(AUS, "w", encoding="utf-8") as f:
        f.write("fall\tnachher_netto_3pz\tnachher_netto_streng\tvorher_netto_3pz\tpreis\tek_unitcost\tprodukt\thandle\ttitel\tsku\tch_lager\n")
        for r in zeilen:
            f.write("\t".join(str(x) for x in r) + "\n")
    print(f"GRATIS-SCHWELLE {ALT:.2f} → {SCHWELLE:.2f} · Exporte: Kosten {alt_k:.1f} h, Tags {alt_t:.1f} h alt")
    for fall, txt in (("ohne", f"ohne Code, Preis {SCHWELLE:.2f}–{ALT - 0.01:.2f}"),
                      ("welcome", "WELCOME10, 0,9·Preis im selben Band (Preis 45.00–49.99)")):
        zz = [r for r in zeilen if r[0] == fall]
        prods = {r[6] for r in zz}
        verl = [r for r in zz if r[1] < 0]
        verl_s = [r for r in zz if r[2] < 0]
        duenn = [r for r in zz if 0 <= r[1] < 3]
        med = sorted(r[1] for r in zz)[len(zz) // 2] if zz else None
        print(f"  {txt}: {len(zz)} Varianten / {len(prods)} Produkte mit EK · ohne EK {unbekannt[fall]} · "
              f"Median nachher {med} · VERLUST (3 %) {len(verl)} Var./{len({r[6] for r in verl})} Prod. · "
              f"VERLUST streng {len(verl_s)} · dünn 0–3 {len(duenn)}")
    print(f"  ausgenommen (reiner Korb schon heute 0.00: profil-ch-lager / Druck-Profil): {ausgenommen} Varianten")
    print(f"  nicht beurteilt (Produkt weder im Tag-Export noch live ergänzt, Status unbekannt): {len(ohne_tag)} Produkte")
    print(f"  Liste: {os.path.relpath(AUS, REPO)}")
    for r in [r for r in zeilen if r[1] < 0][:25]:
        print(f"   {r[0]:7} netto {r[1]:7.2f} (streng {r[2]:7.2f}, vorher mit 7.00: {r[3]:6.2f}) P {r[4]:6.2f} EK {r[5]:6.2f} "
              f"{r[6]} {r[8][:60]}")


if __name__ == "__main__":
    main()
