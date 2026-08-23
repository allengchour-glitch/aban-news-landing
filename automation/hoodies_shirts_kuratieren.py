#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""hoodies_shirts_kuratieren.py — zwei kuratierte Kleider-Reihen für die Webseite.

BETREIBER-AUFTRAG (23.08.2026): «mach coole hoodies auf webseite und tshirt.»

AUSGANGSLAGE: Der Katalog hat 842 aktive Hoodies/Sweatshirts und 415 Shirts — aber KEINE
eigene Kollektion dafür. Sie lagen verstreut in «Herren-Jacken & Hoodies» (124) und
«Herren-Shirts & Tops» (661), zwischen Jacken und Tops. Wer einen Hoodie sucht, findet
ihn nur über die Suche.

⚠️ WARUM ÜBER EINEN TAG UND NICHT ÜBER EINE TITEL-REGEL: Shopifys Smart-Collection-Regel
kennt KEINE Wortgrenzen und ignoriert Bindestriche (dokumentiert am 21.08. an «IPL», das
in «L-IPL-iner» steckt). «Shirt» würde «Sweatshirt», «Shirtkleid» und «T-Shirt-Kleid»
mitnehmen. Python kennt `\\b` — die Auswahl passiert deshalb HIER, die Kollektion hängt nur
noch an einem Tag.

QUALITÄTSSCHWELLE, damit die Reihe nicht wie ein Ramschtisch aussieht:
mindestens 4 Bilder (die Karte lebt vom Karussell), Preisband je Warengruppe, im
Google-Kanal, kein Kostüm/Baby/Haustier/Nachtwäsche.

⚠️ EIN BILDCHECK BLEIBT PFLICHT, bevor etwas auf die STARTSEITE kommt. Beim Probelauf trugen
3 von 36 Hauptbildern montierten Text: «F10# Fleece-lined distressed snowflake print hoodie
370G», ein Lieferantencode «2-772», ein blaues Werbeband quer über einem Hemd. Für die
Kollektion ist das verschmerzbar, für die Startseite nicht (Lehre 15.08.).

DRY=1 meldet nur. IDS_RAUS=… schliesst einzelne Produkte aus.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/hype_export.jsonl")
LEDGER = "dropship/_hoodies_shirts.txt"

HOODIE = re.compile(r'\bHoodies?\b|\bKapuzen(?:pullover|jacke|shirt|sweater)\w*|'
                    r'\bSweatshirts?\b|\bSweatjacke\w*', re.I)
SHIRT = re.compile(r'\bT-?Shirts?\b|\bPoloshirts?\b|\bKurzarmshirts?\b|'
                   r'\bLangarmshirts?\b|\bHenley\b', re.I)
# ⚠️ «Shirtkleid» UND «T-Shirt-Kleid» sind Kleider — der Probelauf fing nur die
# zusammengeschriebene Form und liess «T-Shirt-Kleid «Casa»» durch. Bindestriche
# und Leerzeichen gehoeren ins Muster. «Hundepullover» ist für den Hund,
# «Schlafanzug» ist Nachtwäsche. Alle drei matchen sonst sauber auf die Muster oben.
RAUS = re.compile(r'Kost[üu]m|Verkleid|Fasnacht|Karneval|Baby|Kleinkind|Hundepullover|'
                  r'Katzen|Puppen|Damenkleid|Nachthemd|Schlafanzug|Pyjama|Shirt[- ]?Kleid|Kleid\b', re.I)
RAUS_TYP = {"Spielzeug & Spiele", "Kostüme & Verkleidung", "Partydeko & Ballone",
            "Haustierbedarf"}
TAG_H, TAG_S = "koll-hoodies", "koll-shirts"


def gql(q, v=None):
    with open("/tmp/_hs.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for i in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hs.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper():
                time.sleep(4 + i * 3); continue
            print("  GraphQL:", json.dumps(d.get("errors"))[:150]); return None
        except Exception:
            pass
        time.sleep(3)
    return None


def main():
    raus_ids = {i.strip() for i in (os.environ.get("IDS_RAUS") or "").split(",") if i.strip()}
    h, s = [], []
    for zeile in open(EXPORT, encoding="utf-8"):
        d = json.loads(zeile)
        if d.get("status") != "ACTIVE" or not d.get("g"):
            continue
        ti = d["title"]
        if RAUS.search(ti) or (d.get("productType") or "") in RAUS_TYP:
            continue
        if d["id"].split("/")[-1] in raus_ids:
            continue
        tags = {x.lower() for x in (d.get("tags") or [])}
        if "hype-bild-schwach" in tags:
            continue
        if (d.get("mediaCount") or {}).get("count", 0) < 4:
            continue
        preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
        if HOODIE.search(ti) and 24 <= preis <= 90 and TAG_H not in tags:
            h.append((d["id"], ti))
        elif SHIRT.search(ti) and 18 <= preis <= 70 and TAG_S not in tags:
            s.append((d["id"], ti))

    print(f"Hoodies: {len(h)} · Shirts: {len(s)}" + (" · DRY" if DRY else ""), flush=True)
    for _, t in h[:4]:
        print("   H", t[:60])
    for _, t in s[:4]:
        print("   T", t[:60])
    if DRY:
        print("FERTIG")
        return

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    n = 0
    for tag, liste in ((TAG_H, h), (TAG_S, s)):
        for pid, ti in liste:
            if pid in erledigt:
                continue
            # ⚠️ tagsAdd, NIE productUpdate(tags:) — das ersetzt die ganze Liste (GEHIRN-Regel 2).
            d = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t)'
                    '{userErrors{message}}}', {"id": pid, "t": [tag]})
            fe = (((d or {}).get("data") or {}).get("tagsAdd") or {}).get("userErrors")
            if d is None or fe is None or fe:
                print(f"   ⚠️ {ti[:44]}: {json.dumps(fe)[:70] if fe else 'keine Antwort'}")
                time.sleep(2); continue
            n += 1
            with open(LEDGER, "a") as f:
                f.write(f"{pid}\t{tag}\t{ti[:60]}\n")
            time.sleep(0.35)
    print(f"\nFERTIG: {n} Produkte getaggt")


if __name__ == "__main__":
    main()
