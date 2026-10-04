#!/usr/bin/env python3
"""produkttyp_vereinheitlichen.py — entdoppelt den Produkttyp, damit die Filter-Facette «Produkttyp» lesbar wird.

GEMESSEN 02.10.2026 (Betreiber «feinkategorie filter verbessern?»): 151 verschiedene Produkttypen bei 49'928 aktiven
Produkten. Die Facette auf /collections/gadgets zeigte 23 Werte, darunter «Gadget» UND «Gadgets», «Küche» UND «Küche &
Haushalt», «Gaming» UND «Gaming-Zubehör»; auf /collections/beauty-pflege «Beauty Tools», «Beauty-Tool», «Beauty-Tools»
und «Nageldesign» neben «Nägel & Maniküre». Eine Kundin sieht drei Häkchen für dieselbe Sache.

REGEL
  - Nur eindeutige Dubletten und Einzelstücke werden auf einen bestehenden Haupttyp gelegt (Tabelle KARTE).
  - Gemischte Sammeltypen («Haushalt & Wohnen», «Kinder») bleiben — ein geratener Typ ist schlimmer.
  - 04.10.2026 (Betreiber «kategorien und fein filter verbessern»): «Trend-Gadget» (808) und «Trend-Produkt» (291) sagen
    im Filter nichts. Sie werden NICHT geraten, sondern aus der Shopify-Produktkategorie abgeleitet (Taxonomie, für den
    Google-Kanal von zwei Modellen übereinstimmend gesetzt) — Tabelle TAX, längstes Präfix gewinnt; Kleidung/Schuhe nur mit
    Geschlechtswort im Titel, sonst bleibt der Typ. Gleiche Sperre wie oben.
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

SAMMEL = ("Trend-Gadget", "Trend-Produkt")


def _kleid(t):
    if re.search(r"\b(baby|kinder|kids|mädchen|jungen|kleinkind)", t, re.I): return "Baby & Kinder"
    if re.search(r"\b(damen|frauen|women)", t, re.I): return "Damenmode"
    if re.search(r"\b(herren|männer|men)\b", t, re.I): return "Herrenmode"
    return None


def _schuh(t):
    if re.search(r"\b(kinder|kids|baby|mädchen|jungen)", t, re.I): return "Kinderschuhe"
    if re.search(r"\b(damen|frauen|women)", t, re.I): return "Damenschuhe"
    if re.search(r"\b(herren|männer|men)\b", t, re.I): return "Herrenschuhe"
    return None


TAX = {
    "aa-1": _kleid, "aa-2": "Accessoires", "aa-8": _schuh,
    "aa-6": lambda t: "Uhren" if re.search(r"uhr\b|uhren|watch", t, re.I) else "Schmuck",
    "ap-2": "Haustierbedarf", "bt": "Baby & Kinder",
    "el-4": "Handy-Zubehör", "el-18": lambda t: "Gaming-Zubehör" if re.search(r"gaming", t, re.I) else "Elektronik",
    "el": "Elektronik", "hb-3": "Beauty & Pflege",
    "hg-1": "Haushalt & Wohnen", "hg-3": "Wohnen & Deko", "hg-9": "Haushalt & Wohnen", "hg-10": "Haushalt & Wohnen",
    "hg-11": "Küche & Bar", "hg-12": "Garten & Pflanzen", "hg-13": "Beleuchtung", "hg-15": "Heimtextilien",
    "lb": "Taschen", "sg": "Sport & Outdoor", "tg": "Spielzeug & Spiele", "vp": "Auto-Zubehör",
    "os": "Büro & Home Office", "ha": "Werkzeug & Heimwerken",
}


VORRANG = [(re.compile(r"headset|kopfhörer|ohrhörer|earbuds|lautsprecher", re.I), "Elektronik"),
           (re.compile(r"handyhülle|handy-hülle|hülle für (iphone|samsung)|phone case", re.I), "Handy-Zubehör")]


def aus_kategorie(kat, titel):
    for rx, z in VORRANG:                       # eindeutiges Titelwort schlägt eine falsche Kategorie
        if rx.search(titel):
            return z
    k = (kat or "").split("/")[-1]
    for pre in sorted(TAX, key=len, reverse=True):
        if k == pre or k.startswith(pre + "-"):
            z = TAX[pre]
            return z(titel) if callable(z) else z
    return None


QR = ("query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor} "
      "nodes{handle ruleSet{appliedDisjunctively rules{column relation condition}}}}}")
QP = ("query($q:String,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} "
      "nodes{id title productType tags category{id}}}}")


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
    # Sammeltypen über die Produktkategorie
    zahl = {}
    for alt in SAMMEL:
        for p in produkte(alt):
            if POD.search(" ".join(p["tags"])):
                continue
            neu = aus_kategorie((p.get("category") or {}).get("id"), p["title"])
            if not neu or neu == alt or sperrgrund(alt, neu, regeln):
                zahl["bleibt"] = zahl.get("bleibt", 0) + 1
                continue
            zahl[neu] = zahl.get(neu, 0) + 1
            paare.append((p["id"], neu))
            if led:
                led.write(f"{dt.date.today()}\t{p['id']}\t{alt}\t{neu}\n")
    print("  Sammeltypen →", dict(sorted(zahl.items(), key=lambda x: -x[1])))
    if led:
        led.flush()
    ok = schreiben(paare) if SCHARF else 0
    print(f"FERTIG: {len(paare)} umzulegen · {ok} geschrieben+zurückgelesen · {gesperrt} gesperrt · {pod} Editor/POD unberührt")


if __name__ == "__main__":
    main()
