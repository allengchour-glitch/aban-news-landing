#!/usr/bin/env python3
"""preis_verlustschutz.py — hebt jeden Preis so weit, dass KEIN Verkauf Geld kostet (24.09.2026).

AUFTRAG (Betreiber 24.09.2026): «ändere preise so das ich nie verlust mache» — und auf die Rückfrage, ob Rabattcodes
bleiben: «Codes bleiben, Preise decken 25 %».

DER SCHLIMMSTE FALL, gemessen (80 aktive Rabatte):
  * höchster Code 25 % (INFLUENCER25, WEDDING25), ohne Mindestbestellwert bis 20 %;
  * alle Codes und Automatik-Rabatte sind Klasse ORDER und lassen KEINE zweite Order-Ermässigung zu
    (combinesWith.orderDiscounts = false überall) → mehr als 25 % kommen nicht zusammen;
  * Gratisversand ab CHF 45 (und Code SHIP50) → kein Versanderlös.
  Mindestpreis = marge_wahrheit.mindestpreis(EK, versand=0) / (1 − RABATT), aufgerundet auf .90.
  EK (unitCost) ENTHÄLT die Fracht schon (cj_kosten_backfill: Ware + volle Fracht) — nicht doppelt abziehen.

REGELN
  * Nur HEBEN, nie senken. Nur Varianten mit bekanntem EK (fehlender EK = unbekannt, nie 0 — Bericht zählt sie).
  * Faktor > MAX_FAKTOR (2.0): kein absurder Preis, sondern die Variante wird nicht kaufbar (DENY + tracked → 0 Bestand).
    Sind ALLE Varianten eines Produkts so, wird das Produkt DRAFT (Tags verlust-auto-draft, marge-verlust-draft,
    verlust-rabatt25 — die Rückholer kennen marge-verlust-draft).
  * Streichpreis ≤ neuer Preis → entfernt (ein Streichpreis unter dem Verkaufspreis wäre eine Falschangabe, PBV).
  * Vor jeder Mutation LIVE lesen (Status, Preise, EK), danach die Antwort der Mutation als Rücklesen prüfen.
  * Ledger dropship/_preis_verlustschutz.txt (variante, alt, neu, ek, datum); Idempotenz über den Live-Vergleich.
  * Eingabe: Voll-Export /tmp/kost28.jsonl (Kosten-Kette des Aufsehers, ≤ 3 Tage) nur zur KANDIDATEN-Auswahl.

  python3 automation/preis_verlustschutz.py            Trockenlauf (Standard) → dropship/PREIS-VERLUSTSCHUTZ.md
  SCHARF=1 CAP=20 python3 automation/preis_verlustschutz.py
Log-Konvention Aufseher: «FERTIG …» nur, wenn alle Kandidaten abgearbeitet sind; sonst Schluss ohne FERTIG.
"""
import collections, fcntl, json, math, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, "tools"))
os.chdir(REPO)
from marge_wahrheit import mindestpreis, netto        # noqa: E402
from kollektionstexte_nachbessern import gql          # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
RABATT = float(os.environ.get("RABATT", "0.25"))
MAX_FAKTOR = float(os.environ.get("MAX_FAKTOR", "2.0"))
CAP = int(os.environ.get("CAP", "100000"))
# 3 Arbeiter wie kategorie_wache (24.09.: einer schaffte ~15 Produkte/min → 22'609 Produkte = 25 h, länger als
# jeder Container lebt). Shopify führt Mutationen eines Aufrufers seriell aus; parallel zählt der Eimer, nicht die Zeit.
WORKER = int(os.environ.get("WORKER", "3"))
SCHLOSS = threading.Lock()
EXPORT = os.environ.get("EXPORT", "/tmp/kost28.jsonl")
MAXALTER = 3 * 86400
LEDGER = "dropship/_preis_verlustschutz.txt"
BERICHT = "dropship/PREIS-VERLUSTSCHUTZ.md"
HEUTE = time.strftime("%Y-%m-%d")


def boden(ek):
    """Kleinster Preis mit ≥ 0 Gewinn bei RABATT und Gratisversand, auf .90 aufgerundet."""
    roh = mindestpreis(ek, 0.0) / (1 - RABATT)
    b = math.floor(roh) + 0.90
    return round(b if b >= roh - 1e-9 else b + 1.0, 2)


def netto_schlimmst(preis, ek):
    return netto(preis * (1 - RABATT), ek, 0.0)


def kandidaten():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > MAXALTER:
        print(f"PAUSE: Export {EXPORT} fehlt oder älter als 3 Tage — nichts wird erfunden"); sys.exit(2)
    prod, unbekannt = collections.defaultdict(list), 0
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "/ProductVariant/" not in o["id"]:
            continue
        uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        if uc is None:
            unbekannt += 1; continue
        try:
            p, ek = float(o.get("price") or 0), float(uc)
        except ValueError:
            continue
        if ek > 0 and p < mindestpreis(ek, 0.0) / (1 - RABATT) - 1e-9:
            prod[o["__parentId"]].append(o["id"])
    return prod, unbekannt


Q = '''query($id:ID!){product(id:$id){id title status handle tags variants(first:100){nodes{id title price compareAtPrice
 inventoryPolicy inventoryItem{id tracked unitCost{amount}}}}}}'''
M = '''mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){
 productVariants{id price compareAtPrice inventoryPolicy inventoryItem{tracked}} userErrors{field message}}}'''


def plane(pid):
    p = gql(Q, {"id": pid})["product"]
    if not p or p["status"] != "ACTIVE":
        return p, [], [], "nicht aktiv"
    heben, sperren = [], []
    for v in p["variants"]["nodes"]:
        uc = ((v["inventoryItem"] or {}).get("unitCost") or {}).get("amount")
        if uc is None:
            continue
        ek, preis = float(uc), float(v["price"])
        if ek <= 0 or netto_schlimmst(preis, ek) >= 0:
            continue
        neu = boden(ek)
        if preis > 0 and neu / preis > MAX_FAKTOR:
            if v["inventoryPolicy"] != "DENY" or not v["inventoryItem"]["tracked"]:
                sperren.append((v, preis, ek, neu))
            continue
        streich = v.get("compareAtPrice")
        heben.append((v, preis, ek, neu, None if (streich and float(streich) <= neu) else streich))
    return p, heben, sperren, None


def schreibe(p, heben, sperren):
    upd = []
    for v, preis, ek, neu, streich in heben:
        u = {"id": v["id"], "price": f"{neu:.2f}"}
        if v.get("compareAtPrice") and streich is None:
            u["compareAtPrice"] = None
        upd.append(u)
    for v, preis, ek, neu in sperren:
        upd.append({"id": v["id"], "inventoryPolicy": "DENY", "inventoryItem": {"tracked": True}})
    r = gql(M, {"p": p["id"], "v": upd})["productVariantsBulkUpdate"]
    if r["userErrors"]:
        return f"userErrors {r['userErrors'][:2]}"
    ist = {x["id"]: x for x in r["productVariants"] or []}
    for v, preis, ek, neu, streich in heben:
        x = ist.get(v["id"]) or {}
        if f"{float(x.get('price') or 0):.2f}" != f"{neu:.2f}":
            return f"Rücklesen: {v['id']} soll {neu:.2f}, ist {x.get('price')}"
        if x.get("compareAtPrice") and float(x["compareAtPrice"]) <= neu:
            return f"Rücklesen: Streichpreis {x['compareAtPrice']} ≤ neuer Preis {neu:.2f}"
    for v, *_ in sperren:
        x = ist.get(v["id"]) or {}
        if x.get("inventoryPolicy") != "DENY" or not (x.get("inventoryItem") or {}).get("tracked"):
            return f"Rücklesen: {v['id']} nicht gesperrt"
    alle = p["variants"]["nodes"]
    gesperrt = {v["id"] for v, *_ in sperren} | {v["id"] for v in alle if v["inventoryPolicy"] == "DENY" and v["inventoryItem"]["tracked"]}
    draft = bool(sperren) and len(gesperrt) == len(alle)
    if draft:
        e = gql('mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){product{status} userErrors{message}}}', {"id": p["id"]})["productUpdate"]
        if e["userErrors"] or e["product"]["status"] != "DRAFT":
            return f"Draft nicht bestätigt: {e['userErrors']}"
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": ["verlust-auto-draft", "marge-verlust-draft", "verlust-rabatt25"]})
    with SCHLOSS, open(LEDGER, "a") as fh:
        for v, preis, ek, neu, streich in heben:
            fh.write(f"{v['id'].split('/')[-1]}\theben\t{preis:.2f}\t{neu:.2f}\t{ek:.2f}\t{HEUTE}\t{p['handle']}\n")
        for v, preis, ek, neu in sperren:
            fh.write(f"{v['id'].split('/')[-1]}\tsperren\t{preis:.2f}\t{neu:.2f}\t{ek:.2f}\t{HEUTE}\t{p['handle']}\n")
        if draft:
            fh.write(f"{p['id'].split('/')[-1]}\tdraft\t\t\t\t{HEUTE}\t{p['handle']}\n")
    return None


def main():
    lk = open("/tmp/lock_preis_verlustschutz_intern.lock", "w")  # eigene Datei: der Aufseher hält lock_preis_verlustschutz.lock (fd 9)
    try:
        fcntl.flock(lk, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("PAUSE: läuft schon"); sys.exit(2)
    prod, unbekannt = kandidaten()
    print(f"Kandidaten: {len(prod)} Produkte / {sum(len(v) for v in prod.values())} Varianten unter dem Boden "
          f"(Rabatt {RABATT:.0%}, Gratisversand) · Varianten ohne EK (unbekannt, nicht angefasst): {unbekannt}"
          + ("" if SCHARF else " [DRY]"), flush=True)
    st = collections.Counter(); faktoren = []; beispiele = []; fehler = []
    # Fortsetzen nach Container-Neustart: Der Export ist bis zu 3 Tage alt und kennt die gehobenen Preise nicht.
    # Varianten mit Ledger-Quittung überspringen, statt jedes Produkt erneut live zu lesen.
    quittiert = set()
    if os.path.exists(LEDGER):
        quittiert = {z.split("\t", 1)[0] for z in open(LEDGER, encoding="utf-8") if z.strip()}
    stopp = threading.Event()

    def bearbeite(i, pid):
        with SCHLOSS:
            if stopp.is_set() or st["produkte"] >= CAP:
                return
            if quittiert and all(v.rsplit("/", 1)[-1] in quittiert for v in prod[pid]):
                st["quittiert"] += 1; return
        try:
            p, heben, sperren, grund = plane(pid)
        except Exception as e:
            with SCHLOSS:
                st["lesefehler"] += 1; fehler.append((pid, f"lesen: {str(e)[:100]}"))
            return
        if grund or not (heben or sperren):
            with SCHLOSS:
                st["schon_ok_oder_inaktiv"] += 1
            return
        with SCHLOSS:
            st["produkte"] += 1; st["heben"] += len(heben); st["sperren"] += len(sperren)
            faktoren.extend(neu / preis for _, preis, _, neu, _ in heben if preis > 0)
            if len(beispiele) < 25 and heben:
                v, preis, ek, neu, _ = heben[0]
                beispiele.append(f"| {p['title'][:48]} | {preis:.2f} | {ek:.2f} | **{neu:.2f}** | {neu / preis:.2f}× |")
        if SCHARF:
            try:
                f = schreibe(p, heben, sperren)
            except Exception as e:
                f = f"Ausnahme: {str(e)[:120]}"
            with SCHLOSS:
                if f:
                    st["fehler"] += 1; fehler.append((pid, f)); print(f"  ⛔ {p['title'][:50]} — {f}", flush=True)
                    if st["fehler"] >= 3 and not stopp.is_set():
                        stopp.set(); print("Abbruch nach 3 Schreibfehlern", flush=True)
                else:
                    st["geschrieben"] += 1
        if (i + 1) % 250 == 0:
            print(f"  {i + 1}/{len(prod)} · {dict(st)}", flush=True)

    with ThreadPoolExecutor(max_workers=WORKER) as pool:
        list(pool.map(lambda a: bearbeite(*a), enumerate(prod)))
    fk = sorted(faktoren)
    med = fk[len(fk) // 2] if fk else 0
    L = [f"# Preis-Verlustschutz — {'scharf' if SCHARF else 'Trockenlauf'} {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC", "",
         f"Regel: Preis ≥ Mindestpreis bei **{RABATT:.0%} Rabatt + Gratisversand** (EK inkl. Fracht, 2.9 % + 0.30 Gebühr, 1.5 % Währung), "
         f"aufgerundet auf .90. Nur heben. Faktor > {MAX_FAKTOR} → Variante nicht kaufbar statt absurder Preis.", "",
         f"- Produkte mit Anpassung: **{st['produkte']}** · Varianten gehoben: **{st['heben']}** · gesperrt (Faktor > {MAX_FAKTOR}): {st['sperren']}",
         f"- Median-Faktor der Hebungen: {med:.2f}× · Varianten ohne EK (nicht geprüft): {unbekannt}",
         f"- geschrieben: {st['geschrieben']} · Fehler: {st['fehler']} · Lesefehler: {st['lesefehler']}", "",
         "| Produkt (erste Variante) | Preis alt | EK | Preis neu | Faktor |", "|---|---|---|---|---|"] + beispiele
    if fehler:
        L += ["", "## Fehler", ""] + [f"- {pid}: {g}" for pid, g in fehler[:50]]
    open(BERICHT, "w").write("\n".join(L) + "\n")
    fertig = st["produkte"] < CAP and st["fehler"] < 3
    print(("FERTIG " if fertig else "Stand ") + f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {dict(st)} → {BERICHT}")


if __name__ == "__main__":
    main()
