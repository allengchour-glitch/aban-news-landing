#!/usr/bin/env python3
"""google_id_zu_name.py — Google-Kategorie als nackte Nummer («567», «1») in den richtigen Pfad übersetzen (07.10.2026).

ANLASS (Betreiber «alles andere auch»). GEMESSEN 07.10. (Bulk-Export 51'5xx aktive): 37 Produkte tragen in
`mm-google-shopping.google_product_category` eine Taxonomie-NUMMER statt eines Pfads — Altlast früherer Importer (die
Fortura-Ableitung `gpc()` schrieb Nummern; heute ungenutzt). Google versteht Nummern, aber die Nummern waren oft falsch:
«1» (= Animals & Pet Supplies) für eine UV-Gesichtsmaske, «567» (Skin Care) für Wind-/Motorradmasken, «469» für eine
Schlafmaske. Unsere Werkzeuge (kategorie_fein, Umzug, Wachen) lesen nur Pfade und übersehen die Nummern.

REGEL: Titelwort zuerst (Gesichtsschutz → Balaclavas, Schlafmaske → Sleeping Aids > Eye Masks, Sonnenbrille, Knopfzelle,
Tauchmaske, Kostümzubehör); sonst die Nummer wörtlich in ihren Pfad übersetzen. Shopify-Kategorie aus Shopifys Zuordnung
(kosmetik_fein.lauf-Logik). Täglich im Aufseher — fängt jede neue Nummer.

  python3 automation/google_id_zu_name.py      # Trockenlauf  ·  SCHARF=1 … schreibt
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_google_id_zu_name.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
R = lambda s: re.compile(s, re.I)
REGELN = [
    (R(r"schlafmaske|augenmaske|augenpflege-?schlaf"), "Health & Beauty > Personal Care > Sleeping Aids > Eye Masks"),
    (R(r"tauchmaske|schnorchel"), "Sporting Goods > Outdoor Recreation > Boating & Water Sports > Diving & Snorkeling > Diving & Snorkeling Masks"),
    (R(r"sonnenbrille"), "Apparel & Accessories > Clothing Accessories > Sunglasses"),
    (R(r"knopfzelle|batterie|cr2032|lr\d{3,4}"), "Electronics > Electronics Accessories > Power > Batteries > General Purpose Batteries"),
    (R(r"halloween|kostüm|punk|lolita|hexenhut|totenkopf"), "Apparel & Accessories > Costumes & Accessories > Costume Accessories"),
    (R(r"trainingsmaske"), "Sporting Goods > Exercise & Fitness"),
    (R(r"maske|halsbedeckung|halswärmer"), "Apparel & Accessories > Clothing Accessories > Balaclavas"),
]


def taxonomie_ids():
    kos.google_taxonomie()
    return {m.group(1): m.group(2) for l in open(os.environ.get("TAXO", "/tmp/gtaxo.txt"), encoding="utf-8")
            if (m := re.match(r"(\d+) - (.+)", l.strip()))}


def ziel(titel, nummer, ids):
    if re.search(r"ersatzmaske", titel or "", re.I):     # vage («All-in-one Ersatzmaske») → Nummer wörtlich
        return ids.get(nummer)
    for rx, z in REGELN:
        if rx.search(titel or ""):
            return z
    return ids.get(nummer)


def main():
    import kategorie_fein as kf
    ids = taxonomie_ids(); pfade = set(ids.values())
    for _, z in REGELN:
        if z and z not in pfade:
            raise SystemExit(f"Google-Pfad unbekannt: {z}")
    karte = json.load(open(kf.KARTE, encoding="utf-8"))["karte"]
    kf.export_holen()
    plan = []
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        g = ((p.get("metafield") or {}).get("value") or "").strip()
        if not g.isdigit():
            continue
        z = ziel(p["title"], g, ids)
        if not z:
            print(f"  ? {g} {p['title'][:60]}"); continue
        sid = kos.shopify_ziel(z, karte)
        plan.append((p["id"], z, sid)); print(f"  {g:>5} → {z[-55:]:55} | {p['title'][:50]}")
    plan = [x for x in plan if x[2]]
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                for pid, st, g, sid, fehler in kos.schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{st}\t{g}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{fehler}\n")
                    ok += st == "gesetzt"; fe += st == "fehler"
    print(f"GOOGLE-ID-ZU-NAME: {len(plan)} Nummern{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}")


if __name__ == "__main__":
    main()
