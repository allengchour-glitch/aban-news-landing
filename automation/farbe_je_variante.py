# -*- coding: utf-8 -*-
"""Google-Farbe je Variante — statt EINER falschen Farbe für das ganze Produkt.

DER BEFUND (Fehlersuche 14.08.2026, live nachgeprüft am selben Tag)
--------------------------------------------------------------------
`mm-google-shopping.color` liegt auf PRODUKTEBENE. Der CJ-Importer schreibt dort
wörtlich den ERSTEN Wert der Options-Liste «Farbe» (cj_category_fill.mjs, Zeile 471:
`const ersteFarbe=farbOpt?.values?.[0]?.name`). Weil im Google-Feed jede Variante ein
eigenes Angebot ist, erbt jede von ihnen diesen einen Wert.

Live geprüft (Admin-GraphQL, 14.08.): «Loose-Fit Hoodie · Herren» (15478315090305) hat
16 wählbare Farben von Schwarz bis Gelb — `color` = «Schwarz», und alle Varianten haben
`metafields: []`. Der rote Hoodie meldet Google also «Schwarz». Wer im Shopping-
Farbfilter «Rot» wählt, sieht ihn nie, und Googles Variantengruppierung
(item_group_id + color), die genau alle Farben eines Artikels zeigen soll, läuft leer.

ZAHLEN aus dem frischen Voll-Export vom 14.08. (Bulk, 341'604 Objekte, 34'654 aktive
Produkte — der 12.08.-Schnappschuss war bereits um 3'256 Produkte veraltet):
    11'798 Produkte haben mehr als eine Farbe unter den Varianten
     9'866 davon tragen zusätzlich das Produkt-Metafeld `color`  ← der Schaden
   220'526 Varianten hängen daran, davon melden 210'660 die falsche Farbe

DIE ENTSCHEIDUNG
----------------
Beides, in dieser Reihenfolge — und zwar so, dass in KEINEM Fall eine falsche Farbe
übrig bleibt:

 1. Je Variante die RICHTIGE Farbe als Varianten-Metafeld `mm-google-shopping.color`.
    Feed-Verarbeiter lesen die Variantenebene mit Vorrang vor der Produktebene; die
    Farbe steht damit dort, wo im Feed auch das Angebot steht.
 2. Das Produkt-Metafeld `color` wird bei mehrfarbigen Produkten GELÖSCHT.
    Begründung: es kann bei mehreren Farben gar nicht richtig sein, und es würde die
    Varianten, deren Optionswert keine lesbare Farbe ist (Lieferantencodes wie «JM721»,
    Sammelwerte wie «S-Color»), weiterhin mit einer erfundenen Farbe versorgen.
    Ein leeres Feld kostet den Shop nichts: Google verlangt `color` bei Bekleidung
    verbindlich nur für Brasilien, Frankreich, Deutschland, Japan, UK und die USA
    (support.google.com/merchants/answer/6324487) — der Feed dieses Shops zielt auf die
    Schweiz. Eine falsche Farbe dagegen kostet die Auffindbarkeit im Farbfilter.
    Deshalb wird zuerst gesetzt und erst danach gelöscht: es gibt keinen Moment, in dem
    ein auflösbares Produkt ohne Farbangabe dasteht.

 3. Einfarbige Produkte (120) und mehrfarbige OHNE Metafeld (1'932) bleiben unangetastet.
    Bei den ersten ist der Wert richtig, bei den zweiten steht keine falsche Aussage da —
    sie zu füllen wäre eine andere Aufgabe als diese Reparatur.

WELCHE FARBE GESETZT WIRD, UND WANN KEINE
-----------------------------------------
`farblexikon.farbe_von()` (gemeinsames Modul, dort steht die Fehltreffer-Liste des
Probelaufs). Aufgelöst werden 172'900 der 220'526 Varianten (78 %). Die restlichen 22 %
bekommen bewusst KEIN Metafeld — ihr Optionswert ist keine Farbe, sondern eine
Lieferanten-Artikelnummer, ein Sammelwert («Picture Color», «Primary Color») oder ein
Stilname («Warm Sand Camel», «Grey C Thin»). Sie stehen nach diesem Lauf ohne
Farbangabe da statt mit einer falschen — genau so ist es gewollt. Die Wurzel dieser
Werte ist ein anderer Befund derselben Fehlersuche ([variantenwerte]).

DIE QUELLE IST MITREPARIERT (Hausregel «zu jedem Nachfüllen gehört die Quelle»):
`cj_category_fill.mjs` schreibt das Produkt-Metafeld `color` jetzt nur noch, wenn es
GENAU EINE Farbe gibt, und legt bei mehreren Farben stattdessen die Varianten-Metafelder
an. Ohne das hätte der tägliche CJ-Grind den Fehler binnen Tagen neu aufgebaut — derselbe
Fehler, den `condition` und `google_product_category` schon zweimal vorgemacht haben.

FEHLTREFFER, die der Probelauf zeigte und die abgestellt wurden:
  «PCpink» → Endung «pink», Vorsatz ein Lieferantenkürzel → jetzt abgewiesen
  «Wine Red-0XL» → wurde zu «Weinrot/Rot» zerlegt → mehrteilige Wendungen zuerst
  «Blaublau» → doppelt übersetzter Altwert → zu «Blau» zusammengezogen
  «Gold-3Birthstone-Size 5», «Pink-45 Male», «Blue-29 yards» → bleiben ohne Farbe
Nicht angefasst: «Handschuh», «Lichterkette», «Straps» — sie sind keine Farbwerte und
fallen durch das Lexikon, wie es die Hausregel zu deutschen Zusammensetzungen verlangt.

BEDIENUNG
---------
    DRY=1 python3 automation/farbe_je_variante.py      # nur zählen und zeigen
    python3 automation/farbe_je_variante.py            # schreiben
    BULK=/pfad/export.jsonl ...                        # vorhandenen Bulk-Export nutzen
Das Ledger `dropship/_farbe_je_variante.txt` wird nach JEDER Zeile geleert (fsync); der
Prozess darf jederzeit sterben, der nächste Lauf macht an derselben Stelle weiter. Ein
Produkt kommt erst ins Ledger, wenn Shopify das Setzen UND das Löschen bestätigt hat —
eine fehlgeschlagene Anfrage gilt als offen, nicht als erledigt.
"""
import json
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from farblexikon import farbe_von                                    # noqa: E402

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "dropship", "_farbe_je_variante.txt")
NS, KEY = "mm-google-shopping", "color"
CHUNK = 25                        # metafieldsSet nimmt höchstens 25 Metafelder je Aufruf


def gql(query, variables=None, versuche=6):
    """Eine gescheiterte Anfrage ist kein Ergebnis: hier wird geworfen, nicht geraten."""
    body = json.dumps({"query": query, "variables": variables or {}})
    letzter = ""
    for i in range(versuche):
        p = subprocess.run(
            ["curl", "-sS", "--max-time", "120", "-X", "POST", URL,
             "-H", "Content-Type: application/json",
             "-H", "X-Shopify-Access-Token: " + TOK, "-d", "@-"],
            input=body, capture_output=True, text=True)
        if p.returncode != 0:
            letzter = p.stderr[:200]
            time.sleep(2 + 3 * i)
            continue
        try:
            d = json.loads(p.stdout)
        except ValueError:
            letzter = p.stdout[:200]
            time.sleep(2 + 3 * i)
            continue
        fehler = d.get("errors") or []
        if fehler and any("Throttled" in str(e.get("message", "")) for e in fehler):
            time.sleep(4 + 4 * i)
            letzter = "throttled"
            continue
        if fehler:
            raise RuntimeError(json.dumps(fehler, ensure_ascii=False)[:400])
        return d
    raise RuntimeError("Shopify antwortete nicht: " + letzter)


# ─────────────────────────── Bestand holen ───────────────────────────
BULK_QUERY = """
{ products(query:"status:active") { edges { node {
  id title
  options { name values }
  metafield(namespace:"%s", key:"%s") { id value }
  variants { edges { node { id selectedOptions { name value } } } }
} } } }
""" % (NS, KEY)


def bulk_export():
    """Frischer Voll-Export. Ein Schnappschuss von vorgestern ist keine Wahrheit."""
    vorhanden = os.environ.get("BULK")
    if vorhanden and os.path.exists(vorhanden):
        return vorhanden
    gql("""mutation($q:String!){bulkOperationRunQuery(query:$q){
             bulkOperation{id} userErrors{message}}}""", {"q": BULK_QUERY})
    while True:
        time.sleep(15)
        op = gql("{ currentBulkOperation { status url errorCode objectCount } }")
        op = op["data"]["currentBulkOperation"]
        if op["status"] == "COMPLETED":
            break
        if op["status"] in ("FAILED", "CANCELED"):
            raise RuntimeError("Bulk-Export gescheitert: " + str(op.get("errorCode")))
        print("   … Bulk läuft, %s Objekte" % op["objectCount"])
    ziel = "/tmp/farbe_bulk.jsonl"
    subprocess.run(["curl", "-sS", "-o", ziel, op["url"]], check=True)
    return ziel


def lade(pfad):
    prods = {}
    with open(pfad) as f:
        for zeile in f:
            d = json.loads(zeile)
            eltern = d.get("__parentId")
            if eltern:
                prods.setdefault(eltern, {}).setdefault("v", []).append(d)
            else:
                prods.setdefault(d["id"], {})["p"] = d
    return prods


def farbwert(variante):
    for s in variante.get("selectedOptions", []):
        if s["name"].strip().lower() == "farbe":
            return s["value"]
    return None


def plane(prods):
    """Liefert die Arbeitsliste plus die Zählung für den Probelauf."""
    aufgaben, zahl = [], {}

    def z(k, n=1):
        zahl[k] = zahl.get(k, 0) + n

    for pid, eintrag in prods.items():
        p = eintrag.get("p")
        if not p:
            continue
        farboption = [o for o in (p.get("options") or [])
                      if o["name"].strip().lower() == "farbe"]
        if not farboption:
            z("ohne Farb-Option")
            continue
        roh = [(v["id"], farbwert(v)) for v in eintrag.get("v") or []]
        verschieden = {w for _, w in roh if w}
        if len(verschieden) < 2:
            z("einfarbig – unangetastet")
            continue
        z("mehrfarbig")
        mf = p.get("metafield") or {}
        if not mf.get("value"):
            z("mehrfarbig ohne color-Metafeld – unangetastet")
            continue
        setzen = [(vid, farbe_von(w)) for vid, w in roh if w]
        setzen = [(vid, f) for vid, f in setzen if f]
        z("ZU REPARIEREN")
        z("Varianten gesamt", len(roh))
        z("Varianten mit auflösbarer Farbe", len(setzen))
        if not setzen:
            z("nur Löschung (kein Wert auflösbar)")
        aufgaben.append({"pid": pid, "titel": p.get("title", ""), "alt": mf["value"],
                         "mfid": mf["id"], "setzen": setzen, "varianten": len(roh)})
    return aufgaben, zahl


def schreibe(aufgabe):
    """Erst die richtigen Variantenwerte, DANN den falschen Produktwert weg.

    Alles in EINEM Dokument: GraphQL führt Mutationen eines Dokuments der Reihe nach
    aus, die Löschung kann also nie vor dem Setzen greifen. Das spart bei 9'866
    Produkten rund die Hälfte der Anfragen — und damit die Hälfte der Gelegenheiten,
    in einem halb fertigen Zustand abzubrechen.
    """
    teile = [aufgabe["setzen"][i:i + CHUNK]
             for i in range(0, len(aufgabe["setzen"]), CHUNK)]
    kopf = ["$d:[MetafieldIdentifierInput!]!"]
    leib = []
    var = {"d": [{"ownerId": aufgabe["pid"], "namespace": NS, "key": KEY}]}
    for n, teil in enumerate(teile):
        kopf.append("$m%d:[MetafieldsSetInput!]!" % n)
        leib.append("s%d: metafieldsSet(metafields:$m%d){ userErrors{field message} }"
                    % (n, n))
        var["m%d" % n] = [{"ownerId": vid, "namespace": NS, "key": KEY,
                           "type": "single_line_text_field", "value": f}
                          for vid, f in teil]
    leib.append("d: metafieldsDelete(metafields:$d){ userErrors{field message} }")
    r = gql("mutation(%s){ %s }" % (",".join(kopf), " ".join(leib)), var)
    for name, block in (r.get("data") or {}).items():
        fehler = (block or {}).get("userErrors") or []
        if fehler:
            raise RuntimeError(name + ": " + json.dumps(fehler, ensure_ascii=False)[:300])


def main():
    pfad = bulk_export()
    prods = lade(pfad)
    aufgaben, zahl = plane(prods)
    for k in sorted(zahl, key=lambda x: -zahl[x]):
        print("%-42s %8d" % (k, zahl[k]))
    if DRY:
        print("\n== 15 Stichproben ==")
        for a in aufgaben[:15]:
            print(a["pid"].split("/")[-1], a["titel"][:40], "| alt:", a["alt"],
                  "| Varianten", a["varianten"], "| gesetzt", len(a["setzen"]),
                  "|", [f for _, f in a["setzen"]][:5])
        return

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}
    offen = [a for a in aufgaben if a["pid"] not in erledigt]
    print("\noffen: %d von %d" % (len(offen), len(aufgaben)))

    led = open(LEDGER, "a")
    sperre = threading.Lock()
    stand = {"ok": 0, "fehl": 0, "n": 0}

    def arbeite(a):
        try:
            schreibe(a)
        except Exception as e:                                     # noqa: BLE001
            with sperre:
                stand["fehl"] += 1
                stand["n"] += 1
                print("  ✗", a["pid"].split("/")[-1], str(e)[:150])
            return
        with sperre:
            # Ledger erst nach der Bestätigung – und sofort auf die Platte.
            led.write(a["pid"] + "\n")
            led.flush()
            os.fsync(led.fileno())
            stand["ok"] += 1
            stand["n"] += 1
            if stand["n"] % 250 == 0:
                print("   %d/%d  ok=%d  fehlgeschlagen=%d"
                      % (stand["n"], len(offen), stand["ok"], stand["fehl"]))

    with ThreadPoolExecutor(max_workers=int(os.environ.get("PARALLEL", "5"))) as pool:
        list(pool.map(arbeite, offen))
    led.close()
    print("fertig: %d repariert, %d offen geblieben" % (stand["ok"], stand["fehl"]))


if __name__ == "__main__":
    main()
