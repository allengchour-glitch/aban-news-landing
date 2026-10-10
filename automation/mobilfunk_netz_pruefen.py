#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mobilfunk_netz_pruefen.py — Geräte mit SIM-Karte, die nur 2G/3G können, aus dem Verkauf nehmen (10.10.2026).

ANLASS: Beim Bau der Kollektion «GPS-Tracker» (OpenSEO, «gps tracker» 3'600 Suchen/Mt) nannten 5 Tracker im eigenen Text nur
GSM/GPRS. In der Schweiz sind alle 2G-Netze seit Januar 2023 abgeschaltet (Swisscom 2022, Salt Anfang 2022, Sunrise
03.01.2023), 3G folgt 2025/2026. Ein 2G-Tracker ortet hier nichts, eine 2G-Kinderuhr setzt keinen Notruf ab.

WAS ES TUT (Regeln: automation/data/mobilfunk_netz_regel.json):
  Kandidaten = aktive Produkte, deren TITEL ein SIM-fähiges Gerät nennt (Tracker, Kinder-/Senioren-Uhr, GSM-Alarm …).
  Belege = eigener Text + CJ (product/query: Name, Beschreibung, Varianten), EINE CJ-Anfrage je Produkt.
  Urteil:  4g            → in Ordnung (auch «GSM/WCDMA/LTE» = abwärtskompatibel)
           nur-2g-3g     → DRAFT + Tag `mobilfunk-nur-2g-3g` (Kernfunktion in CH tot)
           teilweise-2g  → melden: Gerät funktioniert über WLAN/Bluetooth, die SIM-Funktion nicht (Alarm, Erwachsenen-Uhr)
           varianten     → CJ hat 2G- UND 4G-Versionen: melden, welche wir verkaufen, ist ohne Varianten-SKU nicht belegt
           unklar-sim    → SIM, aber kein Netz genannt: melden (nicht auf Verdacht draften)
           bluetooth     → kein Mobilfunk (Find-My-Tags, Anti-Verlust-Anhänger) — in Ordnung
           unklar        → weder SIM noch Netz genannt: melden
  Ohne CJ-Antwort kein Urteil «in Ordnung» (nicht erreicht ≠ geprüft).

    python3 automation/mobilfunk_netz_pruefen.py --kanarien
    python3 automation/mobilfunk_netz_pruefen.py --export DATEI.jsonl            # Trockenlauf über einen Voll-Export
    python3 automation/mobilfunk_netz_pruefen.py --export DATEI.jsonl --scharf   # nur-2g-3g → Entwurf
    TAGE=3 python3 automation/mobilfunk_netz_pruefen.py --scharf                # Wächter: Neuimporte (Aufseher, täglich)
Ledger: dropship/_mobilfunk_netz.tsv (Zeit, Produkt-ID, Urteil, Beleg, Titel). Bericht: dropship/MOBILFUNK-NETZ-STAND.md.
"""
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "mobilfunk_netz_regel.json"), encoding="utf-8"))
KAND, NICHT = re.compile(R["kandidat_titel"], re.I), re.compile(R["nicht_titel"], re.I)
NEU, ALT, SIM = re.compile(R["neu"], re.I), re.compile(R["alt"], re.I), re.compile(R["sim"], re.I)
BT, WLAN = re.compile(R["bluetooth"], re.I), re.compile(R["wlan"], re.I)
PERSON = re.compile(r"kinder|kids?\b|child|senior|elderly|baby", re.I)
LEDGER = os.path.join(REPO, "dropship", "_mobilfunk_netz.tsv")
BERICHT = os.path.join(REPO, "dropship", "MOBILFUNK-NETZ-STAND.md")


def urteil(titel, text):
    """→ (Urteil, Beleg)."""
    n, a = NEU.search(text), ALT.search(text)
    if n:
        return "4g", n.group(0)
    if a:
        # Ein Erwachsenen-Smartwatch mit Bluetooth-Telefonie oder eine WLAN-Alarmanlage funktioniert ohne SIM weiter;
        # Kinder-/Senioren-Uhren und Tracker leben von der SIM (WLAN dort meist nur zur Ortung).
        if re.search(r"alarm", titel, re.I) and WLAN.search(text):
            return "teilweise-2g", a.group(0) + "+WLAN"
        if re.search(r"smartwatch|smart watch", titel, re.I) and not PERSON.search(titel + " " + text[:300]) and BT.search(text):
            return "teilweise-2g", a.group(0) + "+Bluetooth"
        return "nur-2g-3g", a.group(0)
    if SIM.search(text):
        return "unklar-sim", "SIM ohne Netz"
    if BT.search(text):
        return "bluetooth", BT.search(text).group(0)
    return "unklar", ""


def kanarien():
    f = 0
    for k in R["kanarien"]:
        u, _ = urteil(k["text"], k["text"])
        if u != k["soll"]:
            f += 1
            print(f"  ✗ {k['text'][:60]} → {u} (soll {k['soll']})")
    print(f"MOBILFUNK-KANARIEN {len(R['kanarien']) - f}/{len(R['kanarien'])}")
    return f == 0


def ist_kandidat(titel):
    return bool(KAND.search(titel or "")) and not NICHT.search(titel or "")


def cj_belege(S, skus):
    """→ (Text, Varianten-Liste) oder (None, None) wenn CJ nicht erreichbar/kein CJ-Produkt."""
    url = next((S.cj_url(s) for s in skus if S.cj_url(s)), None)
    if not url:
        return None, None
    d = S.cj(url)
    data = (d or {}).get("data") or {}
    if not data:
        return None, None
    var = [{"sku": v.get("variantSku"), "name": f"{v.get('variantNameEn') or ''} {v.get('variantKey') or ''}"}
           for v in (data.get("variants") or [])]
    text = " ".join([str(data.get("productNameEn") or ""), re.sub(r"<[^>]+>", " ", str(data.get("description") or ""))]
                    + [v["name"] for v in var])
    return text, var


def varianten_urteil(var, skus):
    """CJ führt 2G- und 4G-Versionen nebeneinander → welche verkaufen wir?"""
    neu = [v for v in var if NEU.search(v["name"])]
    alt = [v for v in var if ALT.search(v["name"]) and not NEU.search(v["name"])]
    if not (neu and alt):
        return None
    unsere = [v for v in var if v["sku"] in set(skus)]
    if unsere and all(NEU.search(v["name"]) for v in unsere):
        return "4g", "Variante " + ",".join(v["sku"] for v in unsere)
    if unsere and any(v in alt for v in unsere):
        return "nur-2g-3g", "2G-Variante " + ",".join(v["sku"] for v in unsere if v in alt)
    return "varianten", f"CJ {len(neu)}×4G/{len(alt)}×2G, unsere SKU produktweit"


def main():
    if not kanarien():
        print("⚠️ MOBILFUNK-NETZ: Kanarien rot — nichts geschrieben")
        return 1
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    import cj_stecker_pruefen as S
    scharf = "--scharf" in sys.argv
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[1] for z in open(LEDGER, encoding="utf-8") if "\t" in z}
    if "--export" in sys.argv:
        pfad = sys.argv[sys.argv.index("--export") + 1]
        ids = [json.loads(z)["id"] for z in open(pfad, encoding="utf-8") if ist_kandidat(json.loads(z).get("title"))]
    else:
        seit = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - float(os.environ.get("TAGE", "3")) * 86400))
        ids, after = [], None
        while True:
            d = gql('query($q:String!,$a:String){products(first:250,after:$a,query:$q){pageInfo{hasNextPage endCursor} nodes{id title}}}',
                    {"q": f"status:active AND created_at:>{seit}", "a": after})["products"]
            ids += [n["id"] for n in d["nodes"] if ist_kandidat(n["title"])]
            if not d["pageInfo"]["hasNextPage"]:
                break
            after = d["pageInfo"]["endCursor"]
    if "--alle" not in sys.argv:
        ids = [i for i in ids if i.rsplit("/", 1)[-1] not in erledigt]
    zaehl, zeilen = {}, []
    for pid in ids:
        p = gql('query($id:ID!){product(id:$id){title handle status descriptionHtml variants(first:30){nodes{sku}}}}', {"id": pid})["product"]
        if not p or p["status"] != "ACTIVE":
            continue
        skus = [v["sku"] for v in p["variants"]["nodes"] if v["sku"]]
        eigen = p["title"] + " " + re.sub(r"<[^>]+>", " ", p["descriptionHtml"] or "")
        cjtext, var = cj_belege(S, skus)
        u = (varianten_urteil(var, skus) if var else None) or urteil(p["title"], eigen + " " + (cjtext or ""))
        u, beleg = u
        if cjtext is None and u in ("4g", "bluetooth", "unklar"):
            u, beleg = "unklar", "CJ nicht erreicht"
        zaehl[u] = zaehl.get(u, 0) + 1
        zeilen.append((u, beleg, p["title"], p["handle"]))
        tat = ""
        if u == "nur-2g-3g" and scharf:
            r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{status} userErrors{message}}}',
                    {"p": {"id": pid, "status": "DRAFT"}})["productUpdate"]
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [R["draft_tag"]]})
            tat = "DRAFT" if not r["userErrors"] and (r["product"] or {}).get("status") == "DRAFT" else f"FEHLER {r['userErrors']}"
        if scharf and not (cjtext is None and u == "unklar"):
            with open(LEDGER, "a", encoding="utf-8") as fh:
                fh.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{pid.rsplit('/', 1)[-1]}\t{u}\t{beleg}\t{p['title']}\t{tat}\n")
        print(f"  {u:13s} {beleg[:28]:28s} {p['title'][:70]} {tat}")
    if scharf and zeilen:
        with open(BERICHT, "a", encoding="utf-8") as fh:
            fh.write(f"\n## Lauf {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\n\n| Urteil | Beleg | Produkt |\n|---|---|---|\n")
            for u, beleg, t, h in sorted(zeilen):
                fh.write(f"| {u} | {beleg} | [{t}](https://luxestyle.ch/products/{h}) |\n")
    teil = " · ".join(f"{k} {v}" for k, v in sorted(zaehl.items()))
    warn = zaehl.get("nur-2g-3g", 0) or zaehl.get("varianten", 0) or zaehl.get("unklar-sim", 0)
    print(("⚠️ " if warn and not scharf else "") + f"MOBILFUNK-NETZ: {len(zeilen)} Geräte geprüft · {teil or 'keine neuen'}"
          + ("" if scharf else " (trocken)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
