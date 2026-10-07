#!/usr/bin/env python3
"""werkzeug_korb_shop.py — Shop-Seite des Werkzeug-Sammelkorbs nachziehen (07.10.2026).

ANLASS (Verbesserungsrunde 12:25 + Betreiber 14:50 «mache verbesserung»): Die CJ-Gruppe «Werkzeug» stempelt alles als
«Werkzeug & Heimwerken». `google_kategorie_umzug.py` zieht seit heute Kalimba, Regenschirm, Kerzenhalter, Auto-Pflege usw.
bei GOOGLE in den richtigen Zweig (Ledger dropship/_google_kategorie_umzug.tsv). Im SHOP blieben dieselben Produkte
Typ «Werkzeug & Heimwerken», Tags `werkzeug`/`heimwerken` (= Kollektion Werkzeug) und Shopify-Kategorie «Tools» —
eine Kalimba im Werkzeug-Regal, Filter «Kategorie» falsch, Shop-Kanal falsch.

REGEL (ein Signal, schon geprüft): Quelle ist NUR das Umzugs-Ledger (alt = Hardware > Tools, neu ausserhalb Hardware) —
dort hat ein eindeutiges Warenwort ohne Werkzeugwort entschieden (Kanarien 65/65 in google_kategorie_umzug.py).
  * Shopify-Kategorie = Shopifys offizielle Zuordnung des neuen Google-Pfads (automation/data/google_zu_shopify_kategorie.json),
    vor dem Schreiben per nodes(ids:) gegen die Taxonomie des Shops geprüft.
  * Produkttyp = produkttyp_vereinheitlichen.aus_kategorie(neue Kategorie, Titel) (+ ERGAENZUNG für Zweige ohne Tabellenwert);
    kein Typ → Produkt wird NICHT angefasst (nie raten).
  * Tags `werkzeug`, `heimwerken` weg.
  * Angefasst wird nur, wer HEUTE noch Typ «Werkzeug & Heimwerken»/«Werkzeug» trägt (idempotent, überschreibt keine spätere Hand).
DRY (Standard) zeigt den Plan; SCHARF=1 schreibt (productUpdate + tagsRemove, Rücklesen aus der Antwort).
Ledger dropship/_werkzeug_korb_shop.tsv (handle, alt_typ, alt_kat, neu_typ, neu_kat) — Rückweg: Spalten 2/3 zurückschreiben,
Tags `werkzeug,heimwerken` wieder anhängen. Täglich im Aufseher direkt nach dem Google-Umzug.

  python3 automation/werkzeug_korb_shop.py              # Trockenlauf
  SCHARF=1 python3 automation/werkzeug_korb_shop.py
  python3 automation/werkzeug_korb_shop.py --selbsttest
"""
import json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette eingebaut)
import produkttyp_vereinheitlichen as ptv  # noqa: E402

UMZUG = os.path.join(REPO, "dropship", "_google_kategorie_umzug.tsv")
LEDGER = os.path.join(REPO, "dropship", "_werkzeug_korb_shop.tsv")
KARTE = os.path.join(HIER, "data", "google_zu_shopify_kategorie.json")
SCHARF = os.environ.get("SCHARF") == "1"
TC = "gid://shopify/TaxonomyCategory/"
WZ_TYPEN = {"Werkzeug & Heimwerken", "Werkzeug"}
WZ_TAGS = ["werkzeug", "heimwerken"]
# Zweige, für die produkttyp_vereinheitlichen.TAX keinen Wert hat (gemessen an den Umzugszielen 07.10.)
ERGAENZUNG = {"ae-2-7": "Musikinstrumente", "hg-8": "Haushalt & Wohnen"}


def typ_fuer(kat, titel):
    t = ptv.aus_kategorie(kat, titel)
    if t:
        return t
    for pre in sorted(ERGAENZUNG, key=len, reverse=True):
        if kat == pre or kat.startswith(pre + "-"):
            return ERGAENZUNG[pre]
    return None


def kandidaten():
    karte = json.load(open(KARTE))["karte"]
    erledigt = {l.split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    out = {}
    for l in open(UMZUG, encoding="utf-8"):
        f = l.rstrip("\n").split("\t")
        if len(f) < 3 or f[1] != "Hardware > Tools" or f[2].startswith("Hardware") or f[0] in erledigt:
            continue
        kat = karte.get(f[2])
        if kat:
            out[f[0]] = (f[2], kat)           # letzter Umzug gewinnt
    return out


def main():
    plan = kandidaten()
    ids = sorted({k for _, k in plan.values()})
    gueltig = set()
    for i in range(0, len(ids), 50):
        r = gql("query($i:[ID!]!){nodes(ids:$i){... on TaxonomyCategory{id}}}", {"i": [TC + x for x in ids[i:i + 50]]})
        gueltig |= {n["id"].replace(TC, "") for n in (r.get("nodes") or []) if n}
    tun, ohne_typ, schon = [], [], 0
    for h, (gpfad, kat) in plan.items():
        if kat not in gueltig:
            continue
        p = gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id title productType tags category{id}}}',
                {"h": h}).get("productByIdentifier")
        if not p or p["productType"] not in WZ_TYPEN:
            schon += 1
            continue
        typ = typ_fuer(kat, p["title"])
        if not typ:
            ohne_typ.append(p["title"])
            continue
        tun.append((h, p, typ, kat))
    print(f"PLAN: {len(tun)} Produkte · {schon} schon anders typisiert · {len(ohne_typ)} ohne Typ (bleiben) · "
          f"{len(plan) - len(tun) - schon - len(ohne_typ)} Kategorie-ID ungültig · {'SCHARF' if SCHARF else 'TROCKEN'}")
    for h, p, typ, kat in tun[:int(os.environ.get("ZEIGEN", "80"))]:
        print(f"   {p['title'][:52]:52s} → {typ:22s} {kat}")
    for t in ohne_typ[:10]:
        print(f"   ohne Typ: {t[:60]}")
    if not SCHARF:
        print("FERTIG (trocken)"); return 0
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for h, p, typ, kat in tun:
            r = gql('mutation($p:ProductUpdateInput!,$id:ID!,$t:[String!]!){'
                    'u:productUpdate(product:$p){product{productType category{id}} userErrors{message}} '
                    'r:tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                    {"p": {"id": p["id"], "productType": typ, "category": TC + kat}, "id": p["id"], "t": WZ_TAGS})
            u = (r.get("u") or {}); pr = u.get("product") or {}
            fehler = (u.get("userErrors") or []) + ((r.get("r") or {}).get("userErrors") or [])
            if not fehler and pr.get("productType") == typ and ((pr.get("category") or {}).get("id") or "") == TC + kat:
                ok += 1
                f.write(f"{h}\t{p['productType']}\t{((p.get('category') or {}).get('id') or '').replace(TC, '')}\t{typ}\t{kat}\n")
                f.flush()
            else:
                fehl += 1
                print(f"   ⚠️ {h}: {fehler or pr}")
    print(f"FERTIG: {ok} nachgezogen, {fehl} Fehler")
    return 0


def selbsttest():
    t = [
        (typ_fuer("ae-2-8", "Kalimba Daumenklavier 17-Töne") == "Musikinstrumente", "Kalimba → Musikinstrumente"),
        (typ_fuer("ae-2-7-13", "Kapodaster für Gitarren") == "Musikinstrumente", "Gitarrenzubehör → Musikinstrumente (Ergänzung)"),
        (typ_fuer("hg-16", "Faltbarer Regenschirm") == "Accessoires", "Regenschirm → Accessoires"),
        (typ_fuer("hg-3-39-2", "Kerzenhalter aus Eisen") == "Wohnen & Deko", "Kerzenhalter → Wohnen & Deko"),
        (typ_fuer("vp-1-5-2", "Reifen Glanz-Fluid") == "Auto-Zubehör", "Reifenpflege → Auto-Zubehör"),
        (typ_fuer("hg-11-8", "Eierschneider aus Edelstahl") == "Küche & Bar", "Eierschneider → Küche & Bar"),
        (typ_fuer("hg-8-11", "Staubsauger-Adapter") == "Haushalt & Wohnen", "Staubsauger-Zubehör → Haushalt (Ergänzung)"),
        (typ_fuer("zz-9", "Unbekannt") is None, "unbekannter Zweig → kein Typ (nicht anfassen)"),
    ]
    for ok, n in t:
        print(("✓ " if ok else "✗ ") + n)
    print(f"{sum(o for o, _ in t)}/{len(t)}")
    return 0 if all(o for o, _ in t) else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
