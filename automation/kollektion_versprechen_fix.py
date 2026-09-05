"""Bringt Kollektionstitel und Kollektionsinhalt wieder zur Deckung.

GEFUNDEN (2026-08-10): Die Kollektion **«Geschenke unter CHF 30»** enthielt einen E-Roller
für **CHF 791.90**. Ursache ist eine Regel-Verknüpfung, die man leicht übersieht: Shopify
kennt `appliedDisjunctively` (ODER) und konjunktiv (UND). Hier standen die Regeln
`tag = geschenk` **ODER** `tag = unter-30` — und weil kein einziges Produkt den Tag `unter-30`
trägt, blieb faktisch nur «alles mit Tag geschenk», ganz ohne Preisgrenze.

Das ist kein Schönheitsfehler: Der Kollektionstitel ist ein Versprechen. Wer «unter CHF 30»
anklickt und CHF 792 sieht, verliert das Vertrauen in jede weitere Preisangabe im Shop — und
Google wertet die Diskrepanz zwischen Landingpage-Titel und Inhalt ebenfalls ab.

Die Reparatur ersetzt die Regel durch die konjunktive Fassung `tag = geschenk` **UND**
`Preis < 30`. Die Vergleichskollektionen («Geschenke bis CHF 30», «Unter CHF 25»,
«Geschenke unter CHF 100») sind bereits so gebaut und wurden stichprobenartig geprüft —
dort stimmt der teuerste Artikel jeweils exakt mit der Obergrenze überein.

DRY=1 zeigt nur die geplante Änderung.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"

# handle -> (konjunktive Regeln, erwartete Preisobergrenze zur Nachkontrolle)
ZIEL = {
    "geschenke-unter-30": ([{"column": "TAG", "relation": "EQUALS", "condition": "geschenk"},
                            {"column": "VARIANT_PRICE", "relation": "LESS_THAN",
                             "condition": "30"}], 30.0),
}


def gql(q, v=None):
    with open("/tmp/_kv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kv.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def teuerstes(handle):
    d = gql('query($h:String!){collectionByHandle(handle:$h){productsCount{count} '
            'products(first:1,sortKey:PRICE,reverse:true){nodes{title '
            'priceRangeV2{maxVariantPrice{amount}}}}}}', {"h": handle})
    c = (d.get("data") or {}).get("collectionByHandle") or {}
    ns = ((c.get("products") or {}).get("nodes")) or []
    if not ns:
        return c.get("productsCount", {}).get("count", 0), None, None
    return (c["productsCount"]["count"],
            float(ns[0]["priceRangeV2"]["maxVariantPrice"]["amount"]), ns[0]["title"])


def main():
    for handle, (regeln, grenze) in ZIEL.items():
        anz, preis, titel = teuerstes(handle)
        print(f"vorher: {handle} — {anz} Produkte, teuerstes CHF {preis} ({str(titel)[:40]})",
              flush=True)
        if preis is not None and preis < grenze:
            print("  ✅ hält das Versprechen schon — nichts zu tun", flush=True)
            continue
        d = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": handle})
        gid = ((d.get("data") or {}).get("collectionByHandle") or {}).get("id")
        if not gid:
            print("  ⚠️ Kollektion nicht gefunden", flush=True)
            continue
        if DRY:
            print(f"  (DRY) würde setzen: UND-verknüpft {regeln}", flush=True)
            continue
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i)'
                '{collection{id}userErrors{message field}}}',
                {"i": {"id": gid, "ruleSet": {"appliedDisjunctively": False,
                                              "rules": regeln}}})
        errs = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        if errs:
            print(f"  ⚠️ {errs}", flush=True)
            continue
        # Smart Collections werden asynchron neu befüllt -> kurz warten und nachprüfen.
        time.sleep(20)
        anz2, preis2, titel2 = teuerstes(handle)
        print(f"nachher: {anz2} Produkte, teuerstes CHF {preis2} ({str(titel2)[:40]})",
              flush=True)
        if preis2 is not None and preis2 >= grenze:
            print("  ⚠️ Obergrenze noch nicht eingehalten — Shopify füllt evtl. noch nach; "
                  "später erneut prüfen", flush=True)


if __name__ == "__main__":
    main()
