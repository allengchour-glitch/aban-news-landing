#!/usr/bin/env python3
"""kinder_google_pfad.py — Kinderkleidung bei Google auf den richtigen Zweig + Altersgruppe (02.10.2026, Verbesserungsrunde).

GEMESSEN 02.10.: Der wieder eingeschaltete Grind legte in 20 h 96 aktive «Baby & Kinder» an (Strampler, Sets, Badeanzüge).
Google-Kategorie: 92× nur «Baby & Toddler» (Oberzweig für Kinderwagen, Windeln …, über das Tag `kinder` in
google_kategorie.py), 4× Erwachsenen-Pfade («Outfit Sets», «Swimwear») mit age_group «adult». Googles Taxonomie hat für
Babykleidung einen eigenen Zweig «Apparel & Accessories > Clothing > Baby & Toddler Clothing > …» (gemessen in
taxonomy-with-ids.en-US.txt).

Quelle der Wahrheit ist die SHOPIFY-Kategorie, die automation/kategorie_wache.py aus dem Titel setzt (KINDERREGELN, Kinderzweig
aa-1-25 der Shopify-Taxonomie). Diese Tabelle übersetzt sie 1:1:
  * Titel mit Baby-Wort (Baby, Neugeborene, Kleinkind, Strampler, Romper, Body, Onesie, «Monate») → Googles Babyzweig
  * sonst (Kinder/Jungen/Mädchen) → derselbe Pfad wie Erwachsenenkleidung (Google: Alter regelt age_group), aus
    google_kategorie_fein.ziel(titel, kinder=True); kein Pfad → nichts geraten
  * age_group: «neugeboren» → newborn, Baby-Wort → infant, sonst kids (Googles Werte)
Überschrieben wird NUR ein grober oder erwachsener Wert (leer, «Baby & Toddler», «Apparel & Accessories > Clothing», jeder Pfad
ausserhalb des Babyzweigs bei Baby-Titeln) — ein schon feiner Babypfad bleibt. Kostüme bleiben draussen (google_kanal_luecke).
Rücklesen aus der metafieldsSet-Antwort; Ledger dropship/_kinder_google_pfad.tsv.

  python3 automation/kinder_google_pfad.py               # Trockenlauf (Standard)
  SCHARF=1 python3 automation/kinder_google_pfad.py
  python3 automation/kinder_google_pfad.py --kanarienvogel
"""
import json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf

URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
SCHARF = os.environ.get("SCHARF") == "1"
NS = "mm-google-shopping"
LEDGER = os.path.join(os.path.dirname(HIER), "dropship", "_kinder_google_pfad.tsv")
TC = "gid://shopify/TaxonomyCategory/"

BK = "Apparel & Accessories > Clothing > Baby & Toddler Clothing"
# Shopify-Kategorie → Google-Babypfad (beide Taxonomien am 02.10. gemessen)
BABY = {
    "aa-1-25-1": BK + " > Baby & Toddler Bottoms",
    "aa-1-25-2": BK + " > Baby & Toddler Diaper Covers",
    "aa-1-25-3": BK + " > Baby & Toddler Dresses",
    "aa-1-25-4": BK + " > Baby & Toddler Outerwear",
    "aa-1-25-5": BK + " > Baby & Toddler Outfits",
    "aa-1-25-6": BK + " > Baby & Toddler Sleepwear",
    "aa-1-25-7": BK + " > Baby & Toddler Socks & Tights",
    "aa-1-25-8": BK + " > Baby & Toddler Swimwear",
    "aa-1-25-9": BK + " > Baby & Toddler Tops",
    "aa-1-25-10": BK + " > Baby One-Pieces",
    "aa-1-25-11": BK + " > Toddler Underwear",
    "aa-1-25": BK,
    "aa-2-33-3": "Apparel & Accessories > Clothing Accessories > Baby & Toddler Clothing Accessories > Baby & Toddler Hats",
    "bt-12": "Baby & Toddler > Swaddling & Receiving Blankets",
    "bt-12-2": "Baby & Toddler > Swaddling & Receiving Blankets > Swaddling Blankets",
}
AC = "Apparel & Accessories > Clothing"
# Kinder ohne Baby-Wort: Erwachsenen-Oberzweig derselben Ware (Google: das Alter steht in age_group). Hosen/Röcke/Shorts
# (aa-1-25-1) und Weste/Jacke (aa-1-25-4) entscheidet der Titel über google_kategorie_fein.ziel() — feinere Zweige.
KIND = {
    "aa-1-25-3": AC + " > Dresses", "aa-1-25-5": AC + " > Outfit Sets", "aa-1-25-6": AC + " > Sleepwear & Loungewear",
    "aa-1-25-7": AC + " > Underwear & Socks", "aa-1-25-8": AC + " > Swimwear", "aa-1-25-9": AC + " > Shirts & Tops",
    "aa-1-25-10": AC + " > One-Pieces", "aa-1-25-11": AC + " > Underwear & Socks",
    "aa-2-33-3": "Apparel & Accessories > Clothing Accessories > Hats",
}
BABYWORT = re.compile(r"baby\w*|neugeboren\w*|kleinkind\w*|strampler|strampel\w*|romper|\w*body\b|onesie|\bmonate\b|swaddle|pucktuch", re.I)
NEUGEBOREN = re.compile(r"neugeboren\w*|newborn", re.I)
GROB = {"", "Baby & Toddler", "Apparel & Accessories > Clothing", "Apparel & Accessories"}


def plan_fuer(titel, kat, gk, ag):
    """(neuer_pfad|None, neue_altersgruppe|None) — None heisst: nicht anfassen."""
    if kat not in BABY:
        return None, None
    import google_kategorie_fein as gkf
    baby = bool(BABYWORT.search(titel or "")) or kat.startswith("bt-12")
    gk = gk or ""
    if baby:
        soll = BABY[kat]
        pfad = soll if (gk in GROB or gk == BK or not gk.startswith(BK) and not gk.startswith("Apparel & Accessories > Clothing Accessories > Baby")
                        and not gk.startswith("Baby & Toddler > Swaddling")) else None
        alter = "newborn" if NEUGEBOREN.search(titel or "") else "infant"
    else:
        pfad = None
        if gk in GROB:
            z = KIND.get(kat) or gkf.ziel(titel, kinder=True) or (AC + " > Outerwear" if kat == "aa-1-25-4" else None)
            pfad = z if z and z != gk else None
        alter = "kids"
    if kat.startswith("bt-12"):
        alter = None                       # Decke ist keine Kleidung — kein age_group nötig
    return pfad, (alter if alter and alter != (ag or "") else None)


def kanarienvogel():
    faelle = [  # (titel, shopify-kat, google jetzt, age jetzt) → (pfad-endung oder None, alter)
        ("Baby-Strampler aus 100 % Baumwolle", "aa-1-25-10", "Baby & Toddler", "kids", ("Baby One-Pieces", "infant")),
        ("Lotusblätter-Kragen-Romper für Neugeborene", "aa-1-25-10", "Baby & Toddler", "kids", ("Baby One-Pieces", "newborn")),
        ("Kurzarm-Polo mit Shorts Set für Babys", "aa-1-25-5", "Apparel & Accessories > Clothing > Outfit Sets", "adult", ("Baby & Toddler Outfits", "infant")),
        ("Kinder-Top mit Spitzenschliff und Rock", "aa-1-25-5", "Baby & Toddler", "kids", ("Outfit Sets", None)),
        ("Kirsch-Badeanzug für Kinder", "aa-1-25-8", "Apparel & Accessories > Clothing > Swimwear", "adult", (None, "kids")),
        ("Baby Swaddle-Tuch mit Hasenohr-Stirnband", "bt-12", "Baby & Toddler", "", ("Swaddling & Receiving Blankets", None)),
        ("Baby Strampler Langarm", "aa-1-25-10", BABY["aa-1-25-10"], "infant", (None, None)),        # schon richtig
        ("Damen Sommerkleid", "aa-1-4", "Apparel & Accessories > Clothing > Dresses", "adult", (None, None)),  # kein Kinderartikel
    ]
    ok = 0
    for t, k, g, a, (endung, alter) in faelle:
        p, al = plan_fuer(t, k, g, a)
        treffer = (p is None if endung is None else bool(p) and p.endswith(endung)) and al == alter
        ok += treffer
        print(f"{'✓' if treffer else '✗'} {t} → {p} · {al} (soll …{endung} · {alter})")
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    letzter = ""
    for a in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            nachlauf(j)
            if j.get("data") is not None and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * a)
    print("Shopify-Fehler: " + letzter, file=sys.stderr)
    raise RuntimeError(letzter)


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    import google_kategorie_fein as gkf
    from google_kanal_luecke import grund as google_risiko
    tax = gkf.taxonomie()
    fehlt = sorted(p for p in list(BABY.values()) + list(KIND.values()) if p not in tax)
    if fehlt:
        raise RuntimeError(f"Google-Pfad nicht in der Taxonomie: {fehlt} — nichts geschrieben")
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    prod, gesehen = [], set()
    for kat in BABY:
        c = None
        while True:
            d = gql('query($c:String,$q:String!){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title tags category{id} gk:metafield(namespace:"%s",key:"google_product_category"){value} '
                    'ag:metafield(namespace:"%s",key:"age_group"){value}}}}' % (NS, NS),
                    {"c": c, "q": f"status:active AND category_id:{kat}"})["products"]
            for n in d["nodes"]:
                if n["id"] not in gesehen and (n["category"] or {}).get("id") == TC + kat:
                    gesehen.add(n["id"]); prod.append((kat, n))
            if not d["pageInfo"]["hasNextPage"]:
                break
            c = d["pageInfo"]["endCursor"]
    mf, zeilen = [], []
    for kat, n in prod:
        if google_risiko(n["title"], n["tags"]):
            continue
        pfad, alter = plan_fuer(n["title"], kat, (n["gk"] or {}).get("value"), (n["ag"] or {}).get("value"))
        if pfad and pfad not in tax:
            pfad = None
        if pfad:
            mf.append({"ownerId": n["id"], "namespace": NS, "key": "google_product_category", "type": "single_line_text_field", "value": pfad})
        if alter:
            mf.append({"ownerId": n["id"], "namespace": NS, "key": "age_group", "type": "single_line_text_field", "value": alter})
        if pfad or alter:
            zeilen.append(f"  {n['title'][:48]:48} {(n['gk'] or {}).get('value','-')[-28:]:28} → {(pfad or '=')[-34:]} · {alter or '='}")
    print(f"{len(prod)} aktive im Kinderzweig · {len(zeilen)} zu ändern · {len(mf)} Metafelder", flush=True)
    for z in zeilen[:200]:
        print(z)
    if not SCHARF:
        return 0
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as led:
        for i in range(0, len(mf), 25):
            teil = mf[i:i + 25]
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} key value} userErrors{message}}}',
                    {"m": teil})["metafieldsSet"]
            gesetzt = {((x["owner"] or {}).get("id"), x["key"]): x["value"] for x in r["metafields"] or []}
            for m in teil:
                if gesetzt.get((m["ownerId"], m["key"])) == m["value"]:
                    ok += 1
                    led.write(f"{m['ownerId']}\t{m['key']}\t{m['value']}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
                else:
                    fehl += 1
            if r["userErrors"]:
                print("  userErrors:", r["userErrors"][:3], file=sys.stderr)
    print(f"FERTIG: {ok} gesetzt · {fehl} Fehler", flush=True)
    return 1 if fehl else 0


if __name__ == "__main__":
    sys.exit(main())
