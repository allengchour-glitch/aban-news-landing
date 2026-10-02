#!/usr/bin/env python3
"""produkttyp_vereinheitlichen.py — entdoppelt den Produkttyp, damit die Filter-Facette «Produkttyp» lesbar wird.

GEMESSEN 02.10.2026 (Betreiber «feinkategorie filter verbessern?»): 151 verschiedene Produkttypen bei 49'928 aktiven
Produkten. Die Facette auf /collections/gadgets zeigte 23 Werte, darunter «Gadget» UND «Gadgets», «Küche» UND «Küche &
Haushalt», «Gaming» UND «Gaming-Zubehör»; auf /collections/beauty-pflege «Beauty Tools», «Beauty-Tool», «Beauty-Tools»
und «Nageldesign» neben «Nägel & Maniküre». Eine Kundin sieht drei Häkchen für dieselbe Sache.

REGEL
  - Nur eindeutige Dubletten und Einzelstücke werden auf einen bestehenden Haupttyp gelegt (Tabelle KARTE).
  - Gemischte Sammeltypen («Haushalt & Wohnen», «Trend-Produkt», «Kinder») bleiben — ein geratener Typ ist schlimmer.
  - SPERRE Kollektionsregeln: 17 Smart-Kollektionen hängen an TYPE-Bedingungen (live gelesen). Eine Abbildung alt→neu
    wird verweigert, wenn ein Produkt dadurch aus einer Kollektion fiele (ODER-Liste kennt alt, aber nicht neu;
    UND-Anker = alt; NOT_EQUALS = neu). Hinzukommen ist erlaubt.
  - Editor/POD ist heilig: Produkte mit Tag pod/printful/selbst-gestalten/editor werden nie angefasst.
  - Täglich im Aufseher (Importer erzeugen die Dubletten neu). DRY (Standard) zählt; SCHARF=1 schreibt + liest zurück.
  Ledger dropship/_produkttyp_ledger.tsv (datum, id, alt, neu) — Rückweg: --zurueck (SCHARF=1).
"""
import datetime as dt, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from seo_autopilot import gql

REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_produkttyp_ledger.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
POD = re.compile(r"\bpod\b|printful|selbst-gestalten|editor", re.I)

KARTE = {
    "Gadgets": "Gadget",
    "Beauty Tools": "Beauty-Tools", "Beauty-Tool": "Beauty-Tools",
    "Nägel & Maniküre": "Nageldesign",
    "Gaming": "Gaming-Zubehör",
    "Küche": "Küche & Bar", "Küche & Haushalt": "Küche & Bar", "Küchenhelfer": "Küche & Bar", "Grill-Zubehör": "Küche & Bar",
    "Wohnen": "Wohnen & Deko", "Wohnen & Dekoration": "Wohnen & Deko", "Deko": "Wohnen & Deko",
    "Home & Living": "Wohnen & Deko", "Schlafen & Wohnen": "Wohnen & Deko",
    "Aufbewahrung & Ordnung": "Aufbewahrung & Organizer",
    "Damen-Mode": "Damenmode", "Kleid": "Damenmode", "Damen-Kleid": "Damenmode", "Tops & Blusen": "Damenmode",
    "Damen-Set": "Damenmode", "Damen-Bluse": "Damenmode", "Damen-Hose": "Damenmode", "Damen-Blazer": "Damenmode",
    "Damen-Jumpsuit": "Damenmode", "Damen-Top": "Damenmode", "Bluse": "Damenmode", "Rock": "Damenmode",
    "Herren-Mode": "Herrenmode", "Herren-Set": "Herrenmode", "Hemd": "Herrenmode", "Polo": "Herrenmode",
    "Pumps": "Damenschuhe", "Ballerina": "Damenschuhe", "Sandalette": "Damenschuhe",
    "Tasche": "Taschen", "Taschen & Reise": "Taschen", "Taschen & Accessoires": "Taschen",
    "Sonnenbrille": "Sonnenbrillen",
    "Hut": "Hüte & Caps", "Mütze": "Hüte & Caps",
    "Haustier": "Haustierbedarf", "Haustier & Sommer": "Haustierbedarf",
    "Wellness": "Wellness & Spa", "Bad & Wellness": "Wellness & Spa",
    "Garten & Beleuchtung": "Garten & Pflanzen", "Gartenwerkzeug": "Garten & Pflanzen",
    "Trinkflasche": "Trinkflaschen",
    "Geschenkbundle": "Geschenkset",
    "Audio": "Elektronik",
}

QR = ("query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor} "
      "nodes{handle ruleSet{appliedDisjunctively rules{column relation condition}}}}}")
QP = ("query($q:String,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} "
      "nodes{id productType tags}}}")


def typ_regeln():
    out, cur = [], None
    while True:
        r = gql(QR, {"c": cur})["collections"]
        for n in r["nodes"]:
            rs = n["ruleSet"]
            if rs and any(x["column"] == "TYPE" for x in rs["rules"]):
                out.append((n["handle"], rs["appliedDisjunctively"], [x for x in rs["rules"] if x["column"] == "TYPE"]))
        if not r["pageInfo"]["hasNextPage"]:
            return out
        cur = r["pageInfo"]["endCursor"]


def sperrgrund(alt, neu, regeln):
    a, n = alt.lower(), neu.lower()
    for h, oder, rs in regeln:
        gleich = {x["condition"].lower() for x in rs if x["relation"] == "EQUALS"}
        nicht = {x["condition"].lower() for x in rs if x["relation"] == "NOT_EQUALS"}
        if oder and a in gleich and n not in gleich:
            return f"{h}: ODER-Liste kennt «{alt}», nicht «{neu}»"
        if not oder and a in gleich:
            return f"{h}: UND-Anker «{alt}»"
        if n in nicht and a not in nicht:
            return f"{h}: schliesst «{neu}» aus"
    return None


def produkte(typ):
    cur, out = None, []
    while True:
        r = gql(QP, {"q": f"product_type:'{typ}'", "c": cur})["products"]
        out += [p for p in r["nodes"] if p["productType"] == typ]   # Suche ist unscharf → exakt nachfiltern
        if not r["pageInfo"]["hasNextPage"]:
            return out
        cur = r["pageInfo"]["endCursor"]


def schreiben(paare):
    """paare: [(id, neu)] — 10 je Anfrage (aliasiert); gibt Zahl der zurückgelesenen Treffer zurück."""
    ok = 0
    for i in range(0, len(paare), 10):
        teil = paare[i:i + 10]
        m = "mutation{" + " ".join(
            f'u{k}:productUpdate(product:{{id:"{pid}",productType:{neu!r}}}){{product{{productType}} userErrors{{message}}}}'
            .replace("'", '"') for k, (pid, neu) in enumerate(teil)) + "}"
        d = gql(m)
        for k, (pid, neu) in enumerate(teil):
            r = d[f"u{k}"]
            if not r["userErrors"] and (r["product"] or {}).get("productType") == neu:
                ok += 1
            else:
                print(f"  FEHLER {pid}: {r['userErrors']}")
    return ok


def zurueck():
    zeilen = [z.rstrip("\n").split("\t") for z in open(LEDGER, encoding="utf-8")] if os.path.exists(LEDGER) else []
    paare = [(f[1], f[2]) for f in zeilen if len(f) >= 4]
    print(f"Rückweg: {len(paare)} Produkte" + ("" if SCHARF else " (trocken)"))
    if SCHARF:
        print(f"  zurückgeschrieben {schreiben(paare)}")


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    regeln = typ_regeln()
    print(f"  {len(regeln)} Kollektionen mit TYPE-Regel")
    paare, gesperrt, pod = [], 0, 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for alt, neu in KARTE.items():
        g = sperrgrund(alt, neu, regeln)
        ps = produkte(alt)
        if not ps:
            continue
        if g:
            gesperrt += len(ps)
            print(f"  ✗ {alt} → {neu}: {len(ps)} GESPERRT ({g})")
            continue
        frei = [p for p in ps if not POD.search(" ".join(p["tags"]))]
        pod += len(ps) - len(frei)
        print(f"  ✓ {alt} → {neu}: {len(frei)}" + (f" (+{len(ps) - len(frei)} Editor/POD bleiben)" if len(frei) < len(ps) else ""))
        for p in frei:
            paare.append((p["id"], neu))
            if led:
                led.write(f"{dt.date.today()}\t{p['id']}\t{alt}\t{neu}\n")
    if led:
        led.flush()
    ok = schreiben(paare) if SCHARF else 0
    print(f"FERTIG: {len(paare)} umzulegen · {ok} geschrieben+zurückgelesen · {gesperrt} gesperrt · {pod} Editor/POD unberührt")


if __name__ == "__main__":
    main()
