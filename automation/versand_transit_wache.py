#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Versand-Lieferzeit-Wache — jeder aktive Versandtarif trägt eine ehrliche Transitzeit (10.10.2026).

Anlass (dropship/VERSAND-LIEFERZEIT-2026-10-10.md): Google zeigte 2–6 Tage Lieferzeit, die Kasse beim Standard-Tarif
«3–5 Werktage», die Versandrichtlinie sagt «10–20 Werktage» (Direktversand, grösster Teil des Sortiments). Google und
Kasse lesen die Transitzeit des Shopify-Tarifs; schreibbar ist sie nur in der API-Version «unstable»
(DeliveryRateDefinition.minTransitTime/maxTransitTime, Sekunden).

Prüft gegen automation/data/versand_transit_regel.json:
  * jeder aktive Tarif (alle Profile) hat min/max Transitzeit,
  * sie entspricht der Zone (CH 10–20, LI 15–45, Rest 10–20 Tage),
  * die Versandrichtlinie enthält die Sätze, aus denen die Zahlen stammen (sonst ist die Regel veraltet).
Neue Tarife/Zonen ohne Transitzeit fallen damit am nächsten Tag auf.

    python3 automation/versand_transit_wache.py           # Ampel-Zeile, schreibt nichts
    python3 automation/versand_transit_wache.py --scharf  # fehlende/abweichende Transitzeit setzen (Preis unverändert)
"""
import json
import os
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGEL = json.load(open(os.path.join(REPO, "automation", "data", "versand_transit_regel.json"), encoding="utf-8"))
SHOP = "au3j0y-hq.myshopify.com"
TAG = 86400
SCHARF = "--scharf" in sys.argv

Q_LISTE = "{deliveryProfiles(first:50){nodes{id name}}}"
Q = """query($id:ID!){node(id:$id){... on DeliveryProfile{id name profileLocationGroups{locationGroup{id}
 locationGroupZones(first:10){nodes{zone{id name countries{code{countryCode restOfWorld}}}
  methodDefinitions(first:8){nodes{id name active
   rateGroups(first:2){nodes{id rateProviders(first:3){nodes{__typename ... on DeliveryRateDefinition{id price{amount currencyCode}
    minTransitTime maxTransitTime}}}}}}}}}}}}}"""
M = "mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id, profile:$p){profile{id} userErrors{field message}}}"


def gql(q, v=None, ver=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    r = urllib.request.Request(f"https://{SHOP}/admin/api/{ver or REGEL['api_version']}/graphql.json",
                               data=json.dumps({"query": q, "variables": v or {}}).encode(),
                               headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(r, timeout=60))
    if d.get("errors"):
        raise RuntimeError(str(d["errors"])[:160])
    return d["data"]


def zonen_schluessel(zone):
    codes = {c["code"]["countryCode"] or ("REST" if c["code"]["restOfWorld"] else "?") for c in zone["countries"]}
    for k in ("LI", "CH"):
        if k in codes:
            return k
    return "REST"


def main():
    try:
        liste = gql(Q_LISTE)["deliveryProfiles"]["nodes"]
        aus = tuple(REGEL.get("ausnahme_profile_praefix") or ())
        profile = [gql(Q, {"id": x["id"]})["node"] for x in liste if not x["name"].startswith(aus)]
        pol = gql("{shop{shopPolicies{type body}}}", ver="2026-01")["shop"]["shopPolicies"]
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ VERSAND-LIEFERZEIT: unklar ({type(e).__name__}: {str(e)[:100]})")
        return 1
    versand = next((p["body"] for p in pol if p["type"] == "SHIPPING_POLICY"), "")
    befunde, ok, gesetzt = [], 0, 0
    for k, z in REGEL["zonen"].items():
        if z.get("richtlinie_satz") and z["richtlinie_satz"] not in versand:
            befunde.append(f"Versandrichtlinie ohne «{z['richtlinie_satz']}» ({k}) — Regel prüfen")
    for p in profile:
        lgs = []
        for g in p["profileLocationGroups"]:
            zs = []
            for zn in g["locationGroupZones"]["nodes"]:
                soll = REGEL["zonen"][zonen_schluessel(zn["zone"])]
                mds = []
                for m in zn["methodDefinitions"]["nodes"]:
                    if not m["active"]:
                        continue
                    rgs = []
                    for rg in m["rateGroups"]["nodes"]:
                        rds = []
                        for r in rg["rateProviders"]["nodes"]:
                            if r.get("__typename") != "DeliveryRateDefinition":
                                continue
                            mn, mx = r.get("minTransitTime"), r.get("maxTransitTime")
                            if mn == soll["min_tage"] * TAG and mx == soll["max_tage"] * TAG:
                                ok += 1
                                continue
                            ist = f"{mn // TAG if mn else '–'}–{mx // TAG if mx else '–'} T"
                            befunde.append(f"{p['name']}/{zn['zone']['name']}/{m['name']}: {ist} statt "
                                           f"{soll['min_tage']}–{soll['max_tage']} T")
                            rds.append({"id": r["id"], "price": {"amount": r["price"]["amount"],
                                                                 "currencyCode": r["price"]["currencyCode"]},
                                        "minTransitTime": soll["min_tage"] * TAG, "maxTransitTime": soll["max_tage"] * TAG})
                        if rds:
                            rgs.append({"id": rg["id"], "rateDefinitionsToUpdate": rds})
                    if rgs:
                        mds.append({"id": m["id"], "rateGroupsToUpdate": rgs})
                if mds:
                    zs.append({"id": zn["zone"]["id"], "methodDefinitionsToUpdate": mds})
            if zs:
                lgs.append({"id": g["locationGroup"]["id"], "zonesToUpdate": zs})
        if lgs and SCHARF:
            r = gql(M, {"id": p["id"], "p": {"locationGroupsToUpdate": lgs}})["deliveryProfileUpdate"]
            if r["userErrors"]:
                befunde.append(f"{p['name']}: Schreiben abgelehnt {r['userErrors']}")
            else:
                gesetzt += sum(len(rd["rateDefinitionsToUpdate"]) for lg in lgs for z in lg["zonesToUpdate"]
                               for md in z["methodDefinitionsToUpdate"] for rd in md["rateGroupsToUpdate"])
    if befunde and not (SCHARF and gesetzt and all("statt" in b for b in befunde)):
        print(f"⚠️ VERSAND-LIEFERZEIT: {ok} Tarife ok · {len(befunde)} Befunde: " + " | ".join(befunde[:5])
              + (f" · gesetzt {gesetzt}" if gesetzt else ""))
        return 1
    print(f"VERSAND-LIEFERZEIT: {ok} Tarife mit ehrlicher Lieferzeit" + (f" · gesetzt {gesetzt}" if gesetzt else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
