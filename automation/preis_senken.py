#!/usr/bin/env python3
"""preis_senken.py — senkt Preise vom alten 25-%-Boden auf den neuen 15-%-Boden (02.10.2026).

AUFTRAG (Betreiber 02.10.2026): «verbessere alles in shop auch preise entscheide selber» → auf die Rückfrage
«15 % Reserve (Empfohlen)». GEMESSEN vorher: 86 % aller Varianten mit EK standen GENAU auf dem Boden von
preis_verlustschutz (Preis deckt EK inkl. Fracht + Gebühren auch bei 25 % Rabatt und Gratisversand). Benutzt wurden in
der ganzen Shop-Geschichte nur WELCOME10 (3×) und der 10-%-Bündelrabatt (1×); alle 24 Codes über 15 % (0× benutzt)
sind deaktiviert (dropship/_rabatte_deaktiviert_2026-10-02.tsv). Order-Rabatte kombinieren nicht → grösster Rabatt 15 %.

REGEL je Variante (aktive Produkte, EK bekannt):
  b15 = Boden bei 15 % Rabatt, b25 = Boden bei 25 % (beide preis_verlustschutz.boden-Formel, auf .90 aufgerundet)
  nur wenn b15 < Preis ≤ b25 + 0.01 (Preis steht auf dem alten mechanischen Boden) → neuer Preis = max(b15, 14.90)
  Preise ÜBER dem alten Boden (bewusst gesetzt, Haustier-38-%-Regel, Handpreise) bleiben unberührt.
  Streichpreise: nicht neu gesetzt (ein Streichpreis braucht einen tatsächlich verlangten Vorpreis, PBV);
  ein bestehender Streichpreis ≤ neuer Preis würde entfernt.
Kein Verkauf kann Verlust machen: der neue Preis deckt EK + Fracht + Gebühren bei 15 % Rabatt und Gratisversand.

  python3 automation/preis_senken.py            Trockenlauf (Standard): Export + Plan + Bericht
  SCHARF=1 python3 automation/preis_senken.py   Bulk-Mutation (productVariantsBulkUpdate), Ergebnis geprüft
Bericht dropship/PREIS-SENKEN-2026-10-02.md · Ledger dropship/_preis_senken_2026-10-02.tsv.gz (variante, produkt, alt, neu, ek)
"""
import gzip, json, os, subprocess, sys, time, collections, statistics

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(REPO, "tools"))
from marge_wahrheit import mindestpreis  # noqa: E402
from seo_autopilot import gql             # noqa: E402
import math

SCHARF = os.environ.get("SCHARF") == "1"
NEU_RABATT, ALT_RABATT, ABSOLUT = 0.15, 0.25, 14.90
EXPORT = "/tmp/preis_senken_export.jsonl"
PLAN = "/tmp/preis_senken_plan.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_preis_senken_2026-10-02.tsv.gz")
BERICHT = os.path.join(REPO, "dropship", "PREIS-SENKEN-2026-10-02.md")

BULK = ('{ products(query:"status:active") { edges { node { id title handle '
        'variants { edges { node { id price compareAtPrice inventoryItem { unitCost { amount } } } } } } } } }')


def boden(ek, rabatt):
    roh = mindestpreis(ek, 0.0) / (1 - rabatt)
    b = math.floor(roh) + 0.90
    return round(b if b >= roh - 1e-9 else b + 1.0, 2)


def warte_bulk(art="QUERY"):
    for _ in range(int(os.environ.get("WARTE_MIN", "180")) * 4):
        c = gql('query($t:BulkOperationType!){currentBulkOperation(type:$t){id status objectCount url errorCode}}',
                {"t": art})["currentBulkOperation"]
        if not c or c["status"] not in ("CREATED", "RUNNING", "CANCELING"):
            return c
        time.sleep(15)
    raise RuntimeError(f"Bulk-{art} läuft seit 1 h — nicht fertig")


def export():
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 3 * 3600:
        print(f"  Export {EXPORT} ist jung — wiederverwendet", flush=True)
        return
    warte_bulk("QUERY")          # nicht abbrechen: andere Wächter brauchen ihre Exporte (kosten_export_bauen)
    r = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}', {"q": BULK})
    if r["bulkOperationRunQuery"]["userErrors"]:
        raise RuntimeError(f"Export nicht gestartet: {r['bulkOperationRunQuery']['userErrors']}")
    time.sleep(10)
    c = warte_bulk("QUERY")
    if c["status"] != "COMPLETED" or not c.get("url"):
        raise RuntimeError(f"Export {c['status']} {c.get('errorCode')}")
    subprocess.run(["curl", "-sL", "--max-time", "600", "-o", EXPORT, c["url"]], check=True)
    n = sum(1 for _ in open(EXPORT))
    if c.get("objectCount") and int(c["objectCount"]) != n:
        os.replace(EXPORT, EXPORT + ".kaputt")
        raise RuntimeError(f"Export unvollständig: {n} Zeilen gegen objectCount {c['objectCount']}")
    print(f"  Export: {n} Zeilen", flush=True)


def planen():
    prod, plan, st = {}, collections.defaultdict(list), collections.Counter()
    faktoren = []
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "/Product/" in o["id"] and "__parentId" not in o:
            prod[o["id"]] = o["handle"]
            continue
        uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        st["varianten"] += 1
        if uc is None or float(uc) <= 0:
            st["ohne_ek"] += 1
            continue
        ek, preis = float(uc), float(o["price"] or 0)
        b15, b25 = boden(ek, NEU_RABATT), boden(ek, ALT_RABATT)
        if not (b15 + 0.001 < preis <= b25 + 0.011):
            st["ueber_altem_boden" if preis > b25 + 0.011 else "schon_tief"] += 1
            continue
        neu = max(b15, ABSOLUT)
        if neu >= preis - 0.001:
            st["absolut_boden"] += 1
            continue
        streich = o.get("compareAtPrice")
        v = {"id": o["id"], "price": f"{neu:.2f}"}
        if streich and float(streich) <= neu:
            v["compareAtPrice"] = None
        if streich:
            st["mit_streichpreis"] += 1
        plan[o["__parentId"]].append((v, preis, neu, ek))
        faktoren.append(neu / preis)
        st["senken"] += 1
    return prod, plan, st, faktoren


def bulk_schreiben(plan):
    with open(PLAN, "w", encoding="utf-8") as fh:
        for pid, vs in plan.items():
            for i in range(0, len(vs), 100):
                fh.write(json.dumps({"productId": pid, "variants": [v for v, *_ in vs[i:i + 100]]}) + "\n")
    s = gql('''mutation{stagedUploadsCreate(input:[{resource:BULK_MUTATION_VARIABLES,filename:"preis_senken.jsonl",
      mimeType:"text/jsonl",httpMethod:POST}]){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}''')
    t = s["stagedUploadsCreate"]["stagedTargets"][0]
    form = []
    for p in t["parameters"]:
        form += ["-F", f"{p['name']}={p['value']}"]
    key = next(p["value"] for p in t["parameters"] if p["name"] == "key")
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "600", "-X", "POST", t["url"]]
                       + form + ["-F", f"file=@{PLAN}"], capture_output=True, text=True)
    if r.stdout.strip() not in ("200", "201", "204"):
        raise RuntimeError(f"Upload HTTP {r.stdout}")
    warte_bulk("MUTATION")
    m = gql('''mutation($p:String!){bulkOperationRunMutation(mutation:"mutation call($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id price } userErrors { field message } } }",
      stagedUploadPath:$p){bulkOperation{id status} userErrors{message}}}''', {"p": key})
    if m["bulkOperationRunMutation"]["userErrors"]:
        raise RuntimeError(f"Bulk-Mutation nicht gestartet: {m['bulkOperationRunMutation']['userErrors']}")
    time.sleep(15)
    c = warte_bulk("MUTATION")
    print(f"  Bulk-Mutation {c['status']} · {c.get('objectCount')} Objekte", flush=True)
    fehler, ok = collections.Counter(), 0
    if c.get("url"):
        out = subprocess.run(["curl", "-sL", "--max-time", "600", c["url"]], capture_output=True, text=True).stdout
        for z in out.splitlines():
            d = json.loads(z)
            ue = (((d.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")) or d.get("errors")
            if ue:
                fehler[str(ue)[:120]] += 1
            else:
                ok += 1
    return c["status"], ok, fehler


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    export()
    prod, plan, st, f = planen()
    print(f"  {dict(st)} · {len(plan)} Produkte", flush=True)
    status, ok, fehler = "TROCKEN", 0, {}
    if SCHARF and plan:
        status, ok, fehler = bulk_schreiben(plan)
        with gzip.open(LEDGER, "wt", encoding="utf-8") as fh:   # Plan = Ledger (aus dem Vorher-Export, idempotent)
            for pid, vs in plan.items():
                for v, alt, neu, ek in vs:
                    fh.write(f"{v['id'].split('/')[-1]}\t{prod.get(pid, pid)}\t{alt:.2f}\t{neu:.2f}\t{ek:.2f}\n")
    beispiele = []
    for pid, vs in list(plan.items())[:12]:
        v, alt, neu, ek = vs[0]
        beispiele.append(f"| {prod.get(pid, pid)[:50]} | {alt:.2f} | {neu:.2f} | {ek:.2f} |")
    with open(BERICHT, "w", encoding="utf-8") as fh:
        fh.write(f"# Preise auf 15-%-Reserve gesenkt — {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC ({status})\n\n"
                 "Betreiber 02.10.: «verbessere alles … auch preise entscheide selber» → «15 % Reserve». 24 Codes > 15 % "
                 "deaktiviert (0× benutzt). Regel: Preis auf altem 25-%-Boden → neuer 15-%-Boden, mindestens CHF 14.90; "
                 "höhere Preise unberührt; keine neuen Streichpreise.\n\n"
                 f"- Varianten im Export: {st['varianten']} · ohne EK: {st['ohne_ek']} · über altem Boden (unberührt): "
                 f"{st['ueber_altem_boden']} · schon tief: {st['schon_tief']} · am CHF-14.90-Boden: {st['absolut_boden']}\n"
                 f"- **gesenkt: {st['senken']} Varianten in {len(plan)} Produkten**, Median neu/alt "
                 f"{statistics.median(f) if f else 0:.3f} (≈ {100 - 100 * (statistics.median(f) if f else 1):.0f} % günstiger); "
                 f"davon mit bestehendem Streichpreis: {st['mit_streichpreis']}\n"
                 f"- Bulk-Mutation: {status} · ok {ok} · Fehler {sum(fehler.values()) if fehler else 0} {dict(list(fehler.items())[:3]) if fehler else ''}\n\n"
                 "| Produkt | alt | neu | EK |\n|---|---|---|---|\n" + "\n".join(beispiele) + "\n")
    print(f"FERTIG: {st['senken']} Varianten in {len(plan)} Produkten {'gesenkt' if SCHARF else 'würden gesenkt'} · "
          f"Median {statistics.median(f) if f else 0:.3f} · {status} ok {ok} Fehler {sum(fehler.values()) if fehler else 0}")


if __name__ == "__main__":
    main()
