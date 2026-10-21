#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""suchbegriff_kollektionen.py — Kollektionen für grosse Suchbegriffe anlegen und füllen (10.10.2026).

ANLASS (OpenSEO, dropship/OPENSEO-START-2026-10-10.md): 97 der 100 Google-Treffer waren Produktseiten auf Position 41–100.
Für Begriffe wie «handstaubsauger» (5'400 Suchen/Mt) zeigte Google ein einzelnes Produkt auf Seite 8, weil es keine
Kollektion zum Begriff gab. Regeln in automation/data/suchbegriff_kollektionen.json: je Kollektion ein Tag `such-…`,
ein Ja- und ein Nein-Muster auf den TITEL (Nein schlägt Ja), SEO-Titel/-Text und Seitentext.

    python3 automation/suchbegriff_kollektionen.py --kanarien
    python3 automation/suchbegriff_kollektionen.py --export DATEI.jsonl [--scharf]   # Tags über den ganzen Bestand
    python3 automation/suchbegriff_kollektionen.py --kollektionen [--scharf]        # Kollektionen anlegen/angleichen + publizieren
    TAGE=2 python3 automation/suchbegriff_kollektionen.py --scharf                  # Wächter: Neuimporte der letzten Tage
Ledger: dropship/_suchbegriff_kollektionen.tsv (Zeit, Aktion, Tag, Produkt-ID, Titel).
"""
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "suchbegriff_kollektionen.json"), encoding="utf-8"))
KOLL = REGEL["kollektionen"]
for k in KOLL:
    k["_ja"] = re.compile(k["ja"], re.I)
    k["_nein"] = re.compile(k["nein"], re.I)
    # 20.10.2026 (Spähtrupp/Prüfer): optionale Felder — nein_tags (Regex auf einzelne Produkt-Tags, z. B. Herren-Cardigans aus «Strickjacken
    # für Damen») und nein_typ (Regex auf productType, z. B. Beauty-Tools/Haustierbedarf/Auto-Zubehör), weil der Titel allein Fremdware durchlässt.
    k["_nein_tags"] = re.compile(k["nein_tags"], re.I) if k.get("nein_tags") else None
    k["_nein_typ"] = re.compile(k["nein_typ"], re.I) if k.get("nein_typ") else None
# Produkte mit einem dieser Tags kommen in KEINE Suchseite (Hausregeln: Kostüm, 18+, Rauch, Google-/Werbe-Sperre, Waffe, Heilversprechen,
# Medizinprodukt, Messer). Ohne diese Sperre trafen die neuen Titel-Muster 11 Kostüm-/Policy-Produkte (Prüfer 20.10.).
RISIKO_TAGS = re.compile(r"kostuem|18plus|raucher|google-policy|nicht-google|nicht-bewerben|adult|waffe|heilversprechen|medizinprodukt|messer", re.I)
try:  # Werbetest-Sperre (13 Produkte bis 24.10.): keine Tag-Schreibung an diesen IDs
    from werbetest_sperre import gesperrt as _werbetest_gesperrt
except Exception:  # pragma: no cover
    def _werbetest_gesperrt(_pid):
        return False
LEDGER = os.path.join(REPO, "dropship", "_suchbegriff_kollektionen.tsv")
# dieselben Kanäle wie «hype-jetzt» (Online Store, Shop, TikTok, Facebook & Instagram, Google & YouTube, Pinterest, Headless ×2)
KANAELE = ["gid://shopify/Publication/301970915713", "gid://shopify/Publication/301971014017",
           "gid://shopify/Publication/302032716161", "gid://shopify/Publication/302566834561",
           "gid://shopify/Publication/302872297857", "gid://shopify/Publication/302994456961",
           "gid://shopify/Publication/391625933191", "gid://shopify/Publication/391626359175"]


def soll_tags(titel, tags=(), typ=""):
    tags = [str(t) for t in (tags or [])]
    if any(RISIKO_TAGS.search(t) for t in tags):
        return set()
    return {k["tag"] for k in KOLL
            if k["_ja"].search(titel or "") and not k["_nein"].search(titel or "")
            and not (k["_nein_tags"] and any(k["_nein_tags"].search(t) for t in tags))
            and not (k["_nein_typ"] and k["_nein_typ"].search(typ or ""))}


def kanarien():
    f = n = 0
    for k in KOLL:
        for t in k["kanarien"]["ja"]:
            n += 1
            if k["tag"] not in soll_tags(t):
                f += 1; print(f"  ✗ {k['tag']} sollte treffen: {t}")
        for t in k["kanarien"]["nein"]:
            n += 1
            if k["tag"] in soll_tags(t):
                f += 1; print(f"  ✗ {k['tag']} sollte NICHT treffen: {t}")
        for feld, grenze in (("seo_title", 60), ("seo_desc", 160)):
            n += 1
            if len(k[feld]) > grenze or "ß" in k[feld] + k["html"]:
                f += 1; print(f"  ✗ {k['handle']} {feld} {len(k[feld])} Zeichen (max {grenze}) oder ß")
        # 21.10.2026 (Runde 20:25): «gratis ab CHF 50» ohne Land in der Nähe ist Regel R6 des Kollektions-Wächters (Liechtenstein
        # zahlt immer CHF 14.90). futterautomaten trug die Zusage ohne Land; S3 konnte das Land nicht ergänzen (mit Land 157 > 155
        # Zeichen) → «offen» in der Ampel (KOLL-VERSPRECHEN), bis von Hand gekürzt. Die Quelle muss R6 selbst bestehen.
        n += 1
        try:
            from versprechen_wache import ab50_ohne_land
            r6 = ab50_ohne_land(k["seo_desc"]) + ab50_ohne_land(re.sub(r"<[^>]+>", " ", k["html"]))
        except Exception as e:  # ein stummer Ausfall der Prüfung wäre wieder «sauber»
            r6 = [f"R6-Prüfung nicht verfügbar: {e}"]
        if r6:
            f += 1; print(f"  ✗ {k['handle']} R6 «gratis ab CHF 50» ohne Land: {r6[0][:90]}")
    # 20.10.2026: Kanarien für die drei neuen Sperren (Risiko-Tag, nein_tags, nein_typ) — in BEIDE Richtungen
    k0 = KOLL[0]
    for was, ergebnis, soll in (
        ("Risiko-Tag sperrt alles", soll_tags(k0["kanarien"]["ja"][0], ["kostuem-ch-front"]), set()),
        ("ohne Risiko-Tag trifft wie bisher", soll_tags(k0["kanarien"]["ja"][0], ["hund"]) & {k0["tag"]}, {k0["tag"]}),
    ):
        n += 1
        if ergebnis != soll:
            f += 1; print(f"  ✗ {was}: {ergebnis} statt {soll}")
    for k in KOLL:
        if k["_nein_tags"] or k["_nein_typ"]:
            ja0 = k["kanarien"]["ja"][0]
            if k["_nein_tags"]:
                tg = next((t for t in ("herren", "kinder", "baby", "haustier", "hund") if k["_nein_tags"].search(t)), None)
                if tg:
                    n += 2
                    if k["tag"] in soll_tags(ja0, [tg]): f += 1; print(f"  ✗ {k['tag']} nein_tags greift nicht ({tg})")
                    if k["tag"] not in soll_tags(ja0, ["damen"]): f += 1; print(f"  ✗ {k['tag']} nein_tags sperrt zu viel")
            if k["_nein_typ"]:
                ty = next((t for t in ("Beauty-Tools", "Haustierbedarf", "Auto-Zubehör", "Haustier", "Beauty") if k["_nein_typ"].search(t)), None)
                if ty:
                    n += 2
                    if k["tag"] in soll_tags(ja0, [], ty): f += 1; print(f"  ✗ {k['tag']} nein_typ greift nicht ({ty})")
                    if k["tag"] not in soll_tags(ja0, [], "Wohnen"): f += 1; print(f"  ✗ {k['tag']} nein_typ sperrt zu viel")
    print(f"SUCHBEGRIFF-KANARIEN {n - f}/{n}")
    return f == 0


def log(aktion, tag, pid, titel):
    with open(LEDGER, "a", encoding="utf-8") as fh:
        fh.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{aktion}\t{tag}\t{pid.rsplit('/', 1)[-1]}\t{titel}\n")


def tags_angleichen(gql, produkte, scharf):
    """produkte: Liste {id, title, tags}. Setzt fehlende such-Tags, nimmt falsche weg."""
    alle_such = {k["tag"] for k in KOLL}
    plus = minus = 0
    for p in produkte:
        if _werbetest_gesperrt(p["id"]):
            continue
        ist = {t for t in p.get("tags") or [] if t in alle_such}
        soll = soll_tags(p["title"], p.get("tags"), p.get("productType"))
        add, weg = sorted(soll - ist), sorted(ist - soll)
        if os.environ.get("NUR_PLUS") == "1":   # 20.10.2026: nur Tags ergänzen, nichts entfernen (Altbestand mit abweichendem Regelstand bleibt)
            weg = []
        if not add and not weg:
            continue
        plus += len(add); minus += len(weg)
        if not scharf:
            print(("  + " + ",".join(add) if add else "") + ("  − " + ",".join(weg) if weg else ""), "|", p["title"][:80])
            continue
        if add:
            r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": add})
            if not r["tagsAdd"]["userErrors"]:
                for t in add:
                    log("+", t, p["id"], p["title"])
        if weg:
            r = gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": weg})
            if not r["tagsRemove"]["userErrors"]:
                for t in weg:
                    log("-", t, p["id"], p["title"])
    return plus, minus


def kollektionen(gql, scharf):
    for k in KOLL:
        c = gql('query($h:String!){collectionByHandle(handle:$h){id title seo{title description} descriptionHtml '
                'ruleSet{rules{column relation condition}} resourcePublications(first:20){nodes{publication{id}}}}}',
                {"h": k["handle"]})["collectionByHandle"]
        regel = [{"column": "TAG", "relation": "EQUALS", "condition": k["tag"]}]
        if k.get("zusatz_tag"):   # UND-Verknüpfung: z. B. GPS-Tracker nur mit netz-geprueft (mobilfunk_netz_pruefen.py, 2G-Prüfung)
            regel.append({"column": "TAG", "relation": "EQUALS", "condition": k["zusatz_tag"]})
        felder = {"title": k["titel"], "descriptionHtml": k["html"], "sortOrder": "BEST_SELLING",
                  "seo": {"title": k["seo_title"], "description": k["seo_desc"]}}
        if not c:
            print(f"  NEU {k['handle']} «{k['titel']}» (Regel Tag = {k['tag']})")
            if not scharf:
                continue
            r = gql('mutation($c:CollectionInput!){collectionCreate(input:$c){collection{id handle} userErrors{field message}}}',
                    {"c": {**felder, "handle": k["handle"], "ruleSet": {"appliedDisjunctively": False, "rules": regel}}})["collectionCreate"]
            if r["userErrors"]:
                print("   ⚠️", r["userErrors"]); continue
            cid = r["collection"]["id"]
            if r["collection"]["handle"] != k["handle"]:
                print(f"   ⚠️ Handle vergeben: {r['collection']['handle']} statt {k['handle']}")
            pubs = set()
        else:
            cid = c["id"]
            pubs = {n["publication"]["id"] for n in c["resourcePublications"]["nodes"]}
            # Shopify setzt Zeilenumbrüche zwischen <ul>/<li> — verglichen wird ohne Leerraum, sonst gleicht jeder Lauf neu an
            abweichend = (c["title"] != k["titel"] or (c["seo"] or {}).get("title") != k["seo_title"]
                          or (c["seo"] or {}).get("description") != k["seo_desc"] or re.sub(r"\s+", "", c["descriptionHtml"] or "") != re.sub(r"\s+", "", k["html"])
                          or (c["ruleSet"] or {}).get("rules") != regel)
            if abweichend:
                print(f"  ANGLEICHEN {k['handle']}")
                if scharf:
                    r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){userErrors{field message}}}',
                            {"c": {**felder, "id": cid, "ruleSet": {"appliedDisjunctively": False, "rules": regel}}})["collectionUpdate"]
                    if r["userErrors"]:
                        print("   ⚠️", r["userErrors"])
        fehlt = [p for p in KANAELE if p not in pubs]
        # Leere Kollektion nicht veröffentlichen (dünne Seite für Google): GPS-Tracker füllt sich erst nach der CJ-Netzprüfung
        aktiv = sum(1 for n in gql('query($id:ID!){collection(id:$id){products(first:50){nodes{status}}}}', {"id": cid})
                    ["collection"]["products"]["nodes"] if n["status"] == "ACTIVE") if scharf or c else 0
        if fehlt and aktiv == 0:
            print(f"   wartet auf Ware (0 aktive Produkte) — noch nicht publiziert")
            continue
        if aktiv == 0 and pubs and scharf:
            # 10.10.: GPS-Tracker ging mit EINEM Fehlgriff (Leitungssucher) online; nach dessen Korrektur wäre die Seite leer
            r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,input:$i){userErrors{message}}}',
                    {"id": cid, "i": [{"publicationId": p} for p in pubs]})["publishableUnpublish"]
            print(f"   leer → aus {len(pubs)} Kanälen genommen", r["userErrors"] or "")
            continue
        if fehlt and scharf:
            r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{message}}}',
                    {"id": cid, "i": [{"publicationId": p} for p in fehlt]})["publishablePublish"]
            print(f"   publiziert in {len(fehlt)} Kanälen", r["userErrors"] or "")
        elif fehlt:
            print(f"   würde in {len(fehlt)} Kanälen publizieren")


def main():
    if not kanarien():
        print("⚠️ SUCHBEGRIFF-KOLLEKTIONEN: Kanarien rot — nichts geschrieben")
        return 1
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    scharf = "--scharf" in sys.argv
    if "--kollektionen" in sys.argv:
        kollektionen(gql, scharf)
        return 0
    if "--export" in sys.argv:
        pfad = sys.argv[sys.argv.index("--export") + 1]
        produkte = [json.loads(z) for z in open(pfad, encoding="utf-8")]
        produkte = [p for p in produkte if "title" in p]
    else:
        seit = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - float(os.environ.get("TAGE", "2")) * 86400))
        produkte, after = [], None
        while True:
            d = gql('query($q:String!,$a:String){products(first:250,after:$a,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title tags productType}}}', {"q": f"status:active AND created_at:>{seit}", "a": after})["products"]
            produkte += d["nodes"]
            if not d["pageInfo"]["hasNextPage"]:
                break
            after = d["pageInfo"]["endCursor"]
    plus, minus = tags_angleichen(gql, produkte, scharf)
    print(f"SUCHBEGRIFF-KOLLEKTIONEN: {len(produkte)} Produkte geprüft · +{plus} Tags · −{minus} Tags"
          + ("" if scharf else " (trocken)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
