#!/usr/bin/env python3
"""fortura_ek_nachtragen.py — trägt den Einkaufspreis (unitCost) für Fortura-Varianten aus dem Lieferanten-Feed nach (24.09.2026).

ANLASS: Betreiber «ändere preise so das ich nie verlust mache». `preis_verlustschutz.py` kann nur Varianten mit
bekanntem EK schützen — alle 4'040 Fortura-Varianten hatten KEINEN (die Importer schrieben nie `cost`). Gemessen am
Feed vom 24.09.: 3'551 davon lägen unter dem 25-%-Boden, und Bündelartikel verkaufen weit unter Einkauf
(«Chupa Chups» VE 100 × 0.25 = 25.00 für CHF 15.90; «Rosen rot 60 cm» VE 72 × 0.95 = 68.40 für CHF 16.90).

KOSTEN je Variante (konservativ, Einzelbestellung mit Gratisversand):
  VP1 (Netto-EK je Stück, exkl. MWST — Semantik in fortura_import.mjs belegt) × max(1, Internet_VE)
  + DPD 9.50 je Paket (Vertrag Ziffer 8, exkl. MWST)
  alles × 1.081 — der Shop ist NICHT mehrwertsteuerpflichtig (gemessen: 0.00 Steuer auf #1013–#1018), die Vorsteuer ist
  also Kosten.
  Internet_VE > 1 = der Shop verkauft das Bündel («Verkauf in praktischen Bündeln zu VE Stück», fortura_import.mjs) —
  und Fortura liefert nur ganze VE. Darum zählt die ganze VE.

REGELN: nur SKU `fortura-<ArtNr>` mit EXAKTEM Treffer im Feed (kein Abschneiden von Suffixen — «93624-2» ist eine
eigene ArtNr); nur Varianten OHNE unitCost (vorhandene EK werden nie überschrieben); VP1 ≤ 0 → unbekannt lassen.
Rücklesen aus der Mutationsantwort. Ledger dropship/_fortura_ek.txt (variante, ek, vp1, ve, datum).
  python3 automation/fortura_ek_nachtragen.py          Trockenlauf
  SCHARF=1 python3 automation/fortura_ek_nachtragen.py
Log-Konvention Aufseher: FERTIG nur, wenn alle offenen Varianten geschrieben sind.
"""
import collections, csv, io, json, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.chdir(REPO)
from kollektionstexte_nachbessern import gql          # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
FEED = os.environ.get("FEED", "/tmp/fortura_feed_neu.csv")
EXPORT = os.environ.get("EXPORT", "/tmp/kost28.jsonl")
MWST = 1.081
DPD = 9.50
LEDGER = "dropship/_fortura_ek.txt"
HEUTE = time.strftime("%Y-%m-%d")
SCHLOSS = threading.Lock()


def num(s):
    try:
        return float((s or "").replace("'", "").replace(",", ".").strip())
    except ValueError:
        return None


def feed():
    if not os.path.exists(FEED) or time.time() - os.path.getmtime(FEED) > 14 * 86400:
        print(f"PAUSE: Feed {FEED} fehlt oder älter als 14 Tage"); sys.exit(2)
    raw = open(FEED, "rb").read().decode("cp1252")
    return {x["ArtNr"].strip(): x for x in csv.DictReader(io.StringIO(raw), delimiter="|") if x.get("ArtNr")}


def kosten(x):
    vp1 = num(x.get("VP1"))
    if not vp1 or vp1 <= 0:
        return None, vp1, None
    ve = max(1, round(num(x.get("Internet_VE")) or 1))
    return round((vp1 * ve + DPD) * MWST, 2), vp1, ve


M = '''mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){
 productVariants{id inventoryItem{unitCost{amount}}} userErrors{field message}}}'''


def main():
    f = feed()
    if not os.path.exists(EXPORT):
        print(f"PAUSE: Export {EXPORT} fehlt"); sys.exit(2)
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t", 1)[0] for z in open(LEDGER) if z.strip()}
    prod = collections.defaultdict(list); st = collections.Counter()
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        s = o.get("sku") or ""
        if "/ProductVariant/" not in o["id"] or not s.startswith("fortura-"):
            continue
        st["fortura_varianten"] += 1
        if ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") is not None:
            st["hat_ek"] += 1; continue
        if o["id"].rsplit("/", 1)[-1] in erledigt:
            st["quittiert"] += 1; continue
        x = f.get(s[len("fortura-"):])
        if not x:
            st["nicht_im_feed"] += 1; continue
        ek, vp1, ve = kosten(x)
        if ek is None:
            st["vp1_fehlt"] += 1; continue
        prod[o["__parentId"]].append((o["id"], ek, vp1, ve, float(o.get("price") or 0)))
    offen = sum(len(v) for v in prod.values())
    print(f"{dict(st)} · offen {offen} Varianten in {len(prod)} Produkten" + ("" if SCHARF else " [DRY]"), flush=True)
    bsp = sorted((v for vs in prod.values() for v in vs), key=lambda v: v[4] - v[1])[:12]
    for vid, ek, vp1, ve, p in bsp:
        print(f"  {vid.rsplit('/', 1)[-1]}: VP1 {vp1} × VE {ve} → EK {ek:.2f} · Preis {p:.2f}")
    if not SCHARF:
        return
    fehler = []

    def schreibe(pid):
        vs = prod[pid]
        try:
            r = gql(M, {"p": pid, "v": [{"id": v[0], "inventoryItem": {"cost": f"{v[1]:.2f}"}} for v in vs]})["productVariantsBulkUpdate"]
            if r["userErrors"]:
                raise RuntimeError(str(r["userErrors"])[:150])
            ist = {x["id"]: ((x["inventoryItem"] or {}).get("unitCost") or {}).get("amount") for x in r["productVariants"] or []}
            falsch = [v[0] for v in vs if ist.get(v[0]) is None or abs(float(ist[v[0]]) - v[1]) > 0.005]
            if falsch:
                raise RuntimeError(f"Rücklesen: {len(falsch)} Varianten ohne erwarteten EK")
        except Exception as e:
            with SCHLOSS:
                fehler.append((pid, str(e)[:150])); print(f"  ⛔ {pid}: {str(e)[:150]}", flush=True)
            return
        with SCHLOSS, open(LEDGER, "a") as fh:
            for vid, ek, vp1, ve, _ in vs:
                fh.write(f"{vid.rsplit('/', 1)[-1]}\t{ek:.2f}\t{vp1}\t{ve}\t{HEUTE}\n")
            st["geschrieben"] += len(vs)

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(schreibe, list(prod)))
    zeit = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if fehler:
        print(f"Stand {zeit}: {st['geschrieben']} geschrieben, {len(fehler)} Produkte mit Fehler")
    else:
        print(f"FERTIG {zeit}: {st['geschrieben']} Varianten mit EK")


if __name__ == "__main__":
    main()
