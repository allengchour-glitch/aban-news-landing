# -*- coding: utf-8 -*-
"""CH-Versendbarkeit der SICHTBAREN CJ-Ware (Klasse Bestellung #1016, 03.09.2026).

Bestellung #1016 (Damast-Taschenmesser, bezahlt) war bei CJ nicht in die Schweiz versendbar; der bestehende
`cj_versand_ch_guard.py` prüft nur Ware ab CHF 100 (MINPREIS). Dieser Lauf prüft nach PRIORITÄT statt nach Preis:
  1. alle aktiven Klingen/Schärfer/Schleifsteine (7 von 8 in der Stichprobe ohne CH-Option)
  2. Such-Landeseiten (dropship/_cj_specs_prio.txt), Hype-Reihe, Bestseller
  3. weitere Handles aus PRIO_DATEI (eine je Zeile), wenn gesetzt
Urteil wie im Guard: `freightCalculate` CN→CH, leere Liste bei code 200 = «nicht versendbar» → DRAFT + Tag
cj-nicht-versendbar-ch (FIX=1); bei code 16900500 (Budget) ABBRUCH ohne Quittung; bei fast leerem Eimer
(remaining < 40) wird gewartet, denn eine leere Liste bei leerem Eimer ist kein Befund (Lehre 03.09.).
Ledger dropship/_cj_versand_ch_pruef.txt: handle · vid · Optionen · billigste USD · Urteil. Idempotent.
"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klingenregel import ist_klinge
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CJT = open("/tmp/cj_token_shared.txt").read().strip()
FIX = os.environ.get("FIX") == "1"
LIMIT = int(os.environ.get("LIMIT", "2000"))
LEDGER = "dropship/_cj_versand_ch_pruef.txt"
TAG = "cj-nicht-versendbar-ch"
PRIO_DATEI = os.environ.get("PRIO_DATEI")

def gql(q, v=None):
    open("/tmp/_cvs.json", "w").write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json", "--data-binary", "@/tmp/_cvs.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d and d["data"] is not None: return d
        except Exception: pass
        time.sleep(3)
    return {}

def cj(pfad, body=None):
    cmd = ["curl", "-s", "--max-time", "45", "https://developers.cjdropshipping.com/api2.0/v1" + pfad, "-H", "CJ-Access-Token: " + CJT]
    if body is not None:
        open("/tmp/_cvsb.json", "w").write(json.dumps(body)); cmd += ["-X", "POST", "-H", "Content-Type: application/json", "--data-binary", "@/tmp/_cvsb.json"]
    for _ in range(8):
        try:
            d = json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout or "{}")
        except Exception:
            time.sleep(3); continue
        code = int(d.get("code") or 0)
        if code == 1600200: time.sleep(3); continue
        return code, d.get("data"), d.get("message") or "", (d.get("pointsInfo") or {}).get("remaining")
    return 0, None, "keine Antwort", None

def warte_auf_punkte(mind=40):
    """Eimer-Sonde über den GRATIS-Endpunkt productComments (Lehre 28.08.: kostet 0 Punkte) — eine 10-Punkte-Sonde
    alle 20 s hätte den Eimer selbst leer gehalten. 16900500 kommt auch bei leerem Eimer (remaining > 0 oder
    Meldung ohne «Remaining: 0»); nur remaining == 0 / «Remaining: 0» über 5 Zyklen gilt als Tagesende."""
    leer = 0
    while True:
        code, _, msg, rest = cj("/product/productComments?pid=2064920992690323457&pageNum=1&pageSize=1")
        if code == 16900500 and (rest == 0 or "Remaining: 0" in msg):
            leer += 1
            if leer >= 5: return False
            time.sleep(60); continue
        if rest is None or rest >= mind: return True
        time.sleep(15)


def vid_fuer(sku, var_sku):
    """SKU-Formen (Lehre 22./25./28.08.): CJ-<pid 15+ Ziffern> · CJ-CJxx… (Varianten-SKU mit 2 Ziffern+2 Buchstaben) · CJxx… Stamm."""
    sku = (sku or "").strip(); s = sku[3:] if sku.startswith("CJ-") else sku
    if re.fullmatch(r"\d{15,}", s):
        code, d, msg, _ = cj(f"/product/query?pid={s}")
        vs = (d or {}).get("variants") or []
        if not vs: return None, f"pid {code} {msg[:30]}"
        return (next((v for v in vs if v.get("variantSku") == var_sku), vs[0]))["vid"], None
    m = re.match(r"(CJ[A-Z]{2}\d{7})", s)
    if not m: return None, "keine CJ-SKU"
    code, d, msg, _ = cj(f"/product/variant/query?productSku={m.group(1)}")
    vs = d or []
    if not vs: return None, f"sku {code} {msg[:30]}"
    return (next((v for v in vs if v.get("variantSku") == s), vs[0]))["vid"], None

def kandidaten():
    seen, out = set(), []
    def add(nodes, grund):
        for p in nodes:
            if p["id"] in seen or "cj-real" not in p["tags"]: continue
            seen.add(p["id"]); out.append((p, grund))
    # 1) Klingen + Schärfer
    cur = None
    while True:
        d = gql('query($c:String){products(first:100,after:$c,query:"status:active AND tag:cj-real AND (messer OR klinge OR dolch OR axt OR machete OR katana OR schärfer OR schleifstein OR wetzstein OR beil)"){pageInfo{hasNextPage endCursor}nodes{id title handle tags variants(first:1){nodes{sku}}}}}', {"c": cur})
        pr = d.get("data", {}).get("products", {}); ns = pr.get("nodes", [])
        add([p for p in ns if ist_klinge(p["title"]) or re.search(r"sch[äa]rf|schleifstein|wetzstein", p["title"], re.I)], "klinge")
        if not pr.get("pageInfo", {}).get("hasNextPage"): break
        cur = pr["pageInfo"]["endCursor"]
    # 2) Landeseiten, Hype, Bestseller
    hs = [l.split("\t")[0].strip() for l in open("dropship/_cj_specs_prio.txt", encoding="utf-8") if l.strip()] if os.path.exists("dropship/_cj_specs_prio.txt") else []
    if PRIO_DATEI and os.path.exists(PRIO_DATEI): hs += [l.strip() for l in open(PRIO_DATEI) if l.strip()]
    for i in range(0, len(hs), 20):
        q = " OR ".join(f"handle:{h}" for h in hs[i:i+20])
        add(gql('query($q:String!){products(first:20,query:$q){nodes{id title handle tags variants(first:1){nodes{sku}}}}}', {"q": "status:active AND (" + q + ")"}).get("data", {}).get("products", {}).get("nodes", []), "landeseite")
    for t in ["hype-jetzt"]:
        add(gql('query($q:String!){products(first:100,query:$q){nodes{id title handle tags variants(first:1){nodes{sku}}}}}', {"q": f"status:active AND tag:{t}"}).get("data", {}).get("products", {}).get("nodes", []), t)
    for h in ["bestseller"]:
        c = gql('query($q:String!){collections(first:1,query:$q){nodes{id}}}', {"q": f"handle:{h}"}).get("data", {}).get("collections", {}).get("nodes", [])
        if c:
            cid = c[0]["id"].split("/")[-1]
            add(gql('query($q:String!){products(first:100,query:$q){nodes{id title handle tags variants(first:1){nodes{sku}}}}}', {"q": f"status:active AND collection_id:{cid}"}).get("data", {}).get("products", {}).get("nodes", []), h)
    return out

def main():
    # «unklar» ist keine Quittung — beim nächsten Lauf erneut prüfen (leerer Eimer, transienter Fehler).
    done = set(l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if "\tunklar" not in l) if os.path.exists(LEDGER) else set()
    kand = [(p, g) for p, g in kandidaten() if p["handle"] not in done]
    print(f"Kandidaten {len(kand)} (schon geprüft {len(done)}) FIX={FIX}", flush=True)
    L = open(LEDGER, "a", encoding="utf-8"); n = ok = zu = unklar = 0
    for p, grund in kand[:LIMIT]:
        if not warte_auf_punkte(): print("⛔ CJ-Tagesbudget erschöpft — Abbruch ohne Quittung", flush=True); break
        vid, err = vid_fuer(p["variants"]["nodes"][0]["sku"], (p["variants"]["nodes"][0]["sku"] or "")[3:])
        if not vid:
            unklar += 1; L.write(f"{p['handle']}\t-\t-\t-\tunklar {err}\t{grund}\n"); L.flush(); continue
        time.sleep(1.2)
        code, opts, msg, rest = cj("/logistic/freightCalculate", {"startCountryCode": "CN", "endCountryCode": "CH", "products": [{"quantity": 1, "vid": vid}]})
        if code == 16900500:
            time.sleep(30)
            if not warte_auf_punkte(): print("⛔ CJ-Tagesbudget erschöpft — Abbruch ohne Quittung", flush=True); break
            code, opts, msg, rest = cj("/logistic/freightCalculate", {"startCountryCode": "CN", "endCountryCode": "CH", "products": [{"quantity": 1, "vid": vid}]})
        if code != 200 or (rest is not None and rest < 60 and not opts):
            unklar += 1; L.write(f"{p['handle']}\t{vid}\t-\t-\tunklar {code} {msg[:30]} rest={rest}\t{grund}\n"); L.flush(); time.sleep(10); continue
        opts = [o for o in (opts or []) if o.get("logisticPrice") is not None]
        if opts:
            ok += 1; L.write(f"{p['handle']}\t{vid}\t{len(opts)}\t{min(float(o['logisticPrice']) for o in opts):.2f}\tok\t{grund}\n")
        else:
            zu += 1; urteil = "KEINE CH-Option"
            if FIX:
                r = gql('mutation($i:ProductInput!,$id:ID!,$t:[String!]!){productUpdate(input:$i){product{status} userErrors{message}} tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"i": {"id": p["id"], "status": "DRAFT"}, "id": p["id"], "t": [TAG]})
                st = (r.get("data", {}).get("productUpdate", {}).get("product") or {}).get("status")
                urteil += " → DRAFT" if st == "DRAFT" else f" → ⛔ nicht gedraftet {r.get('data')}"
            print(f"  ✗ {p['title'][:55]} — {urteil} ({grund})", flush=True)
            L.write(f"{p['handle']}\t{vid}\t0\t-\t{urteil}\t{grund}\n")
        L.flush(); n += 1; time.sleep(1.2)
    print(f"FERTIG: geprüft {n} · ok {ok} · nicht versendbar {zu} · unklar {unklar}", flush=True)

if __name__ == "__main__":
    main()
