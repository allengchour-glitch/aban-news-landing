#!/usr/bin/env python3
"""aroma_kategorie.py — Diffuser/Luftbefeuchter/Duftöl in die richtige Shopify- UND Google-Kategorie (07.10.2026).

GEMESSEN (Verbesserungsrunde 16:25, Ampel «unbekannte Typen 1 (Wellness & Aromatherapie)»): 154 aktive Produkte vom Typ
«Wellness & Aromatherapie». Am 05.10. hatte produkttyp_vereinheitlichen den TYP korrigiert (152 Diffuser standen als
«Beauty-Tools»), die Geschwisterfelder blieben: Shopify-Kategorie 150× «Cosmetic Tools» (hb-3-2-5), Google 152× «Health &
Beauty > Personal Care > Hair Care» — Luftbefeuchter als Haarpflege im Google-Feed. kategorie_wache kannte den Typ nicht
(neue Ware dieses Typs bekam gar keine Kategorie).

REGEL (Titel am ersten « für » teilen; das Kopfstück bestimmt die Ware):
  * Gerätewort im Kopf (befeuchter/vernebler/humidif) → Luftbefeuchter   (Shopify hg-9-1-9 · Google … > Humidifiers)
  * sonst Öl im Kopf (Öl/Öle/Aromaöl…)                → Duftöl            (hg-3-40-3 · Google … > Home Fragrances > Fragrance Oil)
  * sonst diffus/aroma/duft im Titel                   → Duft-Diffuser     (hg-3-39-5 · Google … > Home Fragrance Accessories)
  * sonst: nicht anfassen.
Geschrieben wird nur, was abweicht; Shopify-IDs per nodes(ids:), Google-Pfade gegen die Google-Taxonomie geprüft.
DRY (Standard) zeigt den Plan; SCHARF=1 schreibt (productUpdate + metafieldsSet je Produkt, Rücklesen aus der Antwort).
Ledger dropship/_aroma_kategorie.tsv (handle, alt_kat, neu_kat, alt_google, neu_google). Täglich im Aufseher (neue Ware).

  python3 automation/aroma_kategorie.py --selbsttest
  python3 automation/aroma_kategorie.py              # Trockenlauf
  SCHARF=1 python3 automation/aroma_kategorie.py
"""
import os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_aroma_kategorie.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
TYP = "Wellness & Aromatherapie"
TC = "gid://shopify/TaxonomyCategory/"
ZIELE = {
    "befeuchter": ("hg-9-1-9", "Home & Garden > Household Appliances > Climate Control Appliances > Humidifiers"),
    "oel": ("hg-3-40-3", "Home & Garden > Decor > Home Fragrances > Fragrance Oil"),
    "diffuser": ("hg-3-39-5", "Home & Garden > Decor > Home Fragrance Accessories"),
}
GERAET = re.compile(r"befeuchter|vernebler|humidif", re.I)
OEL = re.compile(r"(?<![a-zäöü])(?:aroma-?)?öle?\b|aroma-?öl\w*|duftöl\w*|\boils?\b", re.I)
DUFT = re.compile(r"diffus|aroma|duft", re.I)


def art(titel):
    t = titel or ""
    kopf = re.split(r"\s+f[üu]r\s+", t, maxsplit=1)[0]
    if GERAET.search(kopf):
        return "befeuchter"
    if re.search(r"diffus", kopf, re.I):          # «Pinguin-Aromadiffusor mit Duftölen» = Gerät, nicht Öl (Trockenlauf 07.10.)
        return "diffuser"
    if OEL.search(kopf):
        return "oel"
    if GERAET.search(t) and not DUFT.search(kopf):
        return "befeuchter"
    if DUFT.search(t):
        return "diffuser"
    return None


KANARIEN = [
    ("Pilz Luftbefeuchter mit Umgebungslicht", "befeuchter"),
    ("Luftbefeuchter fürs Auto mit Aromatherapie", "befeuchter"),
    ("Luftbefeuchter mit Holzmaserung für ätherische Öle", "befeuchter"),
    ("Aromatherapie-Öl-Vernebler", "befeuchter"),
    ("Öle für Duftdiffuser", "oel"),
    ("Aromatherapie-Öl für Luftbefeuchter, 5 ml", "oel"),
    ("12er Set wasserlösliche Aromaöle für Diffusor", "oel"),
    ("Premium Bambus Aroma Diffuser 300ml", "diffuser"),
    ("Aroma Diffuser mit farbigem Flammen-Effekt", "diffuser"),
    ("Aromatherapie-Gerät mit Kunststoff-Bambus-Weberei", "diffuser"),
    ("Pinguin-Aromadiffusor mit Duftölen", "diffuser"),
    ("Wellness-Tablett Bambus · Handgefertigt", None),
]


def selbsttest():
    ok = 0
    for t, soll in KANARIEN:
        ist = art(t)
        ok += ist == soll
        print(("✓ " if ist == soll else "✗ ") + f"{t!r} → {ist} (soll {soll})")
    print(f"{ok}/{len(KANARIEN)}")
    return 0 if ok == len(KANARIEN) else 1


def main():
    if selbsttest():
        print("ABBRUCH: Kanarien"); return 1
    from kaufwille_zeile import gql
    import google_kategorie_fein as gkf
    gueltig_g = gkf.taxonomie()
    ids = [TC + z[0] for z in ZIELE.values()]
    r = gql("query($i:[ID!]!){nodes(ids:$i){... on TaxonomyCategory{id}}}", {"i": ids})
    gueltig_s = {n["id"] for n in (r.get("nodes") or []) if n}
    for k, (s, g) in ZIELE.items():
        if TC + s not in gueltig_s or g not in gueltig_g:
            print(f"ABBRUCH: Ziel {k} ungültig ({s} / {g})"); return 1
    prod, cur = [], None
    while True:
        r = gql('query($c:String,$q:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title category{id} metafield(namespace:"mm-google-shopping",key:"google_product_category"){value}}}}',
                {"c": cur, "q": f"product_type:'{TYP}' AND status:active"})
        p = r["products"]; prod += p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            break
        cur = p["pageInfo"]["endCursor"]
    plan = []
    for p in prod:
        a = art(p["title"])
        if not a:
            continue
        s, g = ZIELE[a]
        ks = ((p.get("category") or {}).get("id") or "").replace(TC, "")
        kg = (p.get("metafield") or {}).get("value") or ""
        if ks != s or kg != g:
            plan.append((p, a, ks, kg, s, g))
    import collections
    print(f"PLAN: {len(plan)} von {len(prod)} · " + " · ".join(f"{k} {v}" for k, v in collections.Counter(x[1] for x in plan).items())
          + f" · {'SCHARF' if SCHARF else 'TROCKEN'}")
    for p, a, ks, kg, s, g in plan[:int(os.environ.get("ZEIGEN", "12"))]:
        print(f"   {p['title'][:50]:50s} {a:10s} {ks or '-':>9s}→{s:10s} | {kg.split(' > ')[-1] or '-'} → {g.split(' > ')[-1]}")
    if not SCHARF:
        print("FERTIG (trocken)"); return 0
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as f:
        for p, a, ks, kg, s, g in plan:
            r = gql('mutation($p:ProductUpdateInput!,$m:[MetafieldsSetInput!]!){'
                    'u:productUpdate(product:$p){product{category{id}} userErrors{message}} '
                    'm:metafieldsSet(metafields:$m){metafields{value} userErrors{message}}}',
                    {"p": {"id": p["id"], "category": TC + s},
                     "m": [{"ownerId": p["id"], "namespace": "mm-google-shopping", "key": "google_product_category",
                            "type": "single_line_text_field", "value": g}]})
            u = r.get("u") or {}; m = r.get("m") or {}
            fehler = (u.get("userErrors") or []) + (m.get("userErrors") or [])
            ist_s = ((u.get("product") or {}).get("category") or {}).get("id")
            ist_g = ((m.get("metafields") or [{}])[0] or {}).get("value")
            if not fehler and ist_s == TC + s and ist_g == g:
                ok += 1
                f.write(f"{p['handle']}\t{ks}\t{s}\t{kg}\t{g}\n"); f.flush()
            else:
                fehl += 1; print(f"   ⚠️ {p['handle']}: {fehler or (ist_s, ist_g)}")
    print(f"FERTIG: {ok} umgezogen, {fehl} Fehler")
    return 0


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
