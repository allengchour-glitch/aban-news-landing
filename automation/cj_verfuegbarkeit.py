"""Findet aktive CJ-Produkte, die es bei CJ nicht mehr gibt.

WARUM: Ein eingestelltes CJ-Produkt bleibt im Shop kaufbar. Der Kunde bezahlt, und erst beim
Bestellen faellt auf, dass CJ es nicht mehr fuehrt (`variantSku … nicht gefunden`). Das ist
derselbe Ghost-Sale wie bei BigBuy — nur faellt es hier spaeter auf, weil kein Bestand gefuehrt
wird. Besser vorher finden.

⚠️ WICHTIGSTE REGEL: Ein API-Aussetzer darf NIEMALS ein gutes Produkt draften.
Darum wird nur gedraftet, wenn CJ mehrfach und eindeutig 'nicht gefunden' antwortet — jede
andere Antwort (Drossel, Timeout, Fehlercode) gilt als 'unklar' und laesst das Produkt in Ruhe.

Punkte-sparsam: CJ deckelt die Abfragen taeglich (`pointsInfo.remaining`), und der Import-Grind
braucht sie auch. Der Audit stoppt selbst, wenn das Restbudget unter PUNKTE_RESERVE faellt.

Resumable ueber /tmp/cj_verf_cursor.txt, Ergebnisse in dropship/_cj_verfuegbarkeit.txt.
DRY=1 meldet nur.
"""
import json, subprocess, time, os, re

def _cj_token():
    """Crash-frei an den CJ-Token kommen (01.09.): /tmp/_cjtok schreibt der Fulfill-Runner —
    fehlt die Datei (frischer /tmp-Wipe, Runner noch nicht gelaufen), holen wir selbst einen
    (CJ limitiert getAccessToken auf 1x/300s; ein Fehlschlag ist dann ein sauberes No-op,
    kein Traceback — ein Crash-Log sieht fuer den Aufseher wie ein erledigter Lauf aus)."""
    try:
        t = open("/tmp/_cjtok").read().strip()
        if t:
            return t
    except FileNotFoundError:
        pass
    try:
        body = json.dumps({"email": open("/tmp/cj_email").read().strip(),
                           "password": open("/tmp/cj_apikey").read().strip()})
        r = subprocess.run(["curl", "-s", "--max-time", "30", "-X", "POST",
                            "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
                            "-H", "Content-Type: application/json", "-d", body],
                           capture_output=True, text=True)
        t = ((json.loads(r.stdout).get("data") or {}).get("accessToken") or "").strip()
        if t:
            open("/tmp/_cjtok", "w").write(t)
            return t
    except Exception:
        pass
    print("Kein CJ-Token erreichbar (/tmp/_cjtok fehlt, Eigenbezug scheiterte) — No-op.")
    raise SystemExit(0)


CJTOK = _cj_token()
STOK = open("/tmp/cj_shop_token.txt").read().strip()
SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_cj_verfuegbarkeit.txt"
PUNKTE_RESERVE = int(os.environ.get("PUNKTE_RESERVE", "400"))
PAUSE = float(os.environ.get("PAUSE", "1.2"))

_punkte = {"rest": None}


def cj(path, body=None):
    a = ["curl", "-s", "--max-time", "40", "-H", "CJ-Access-Token: " + CJTOK]
    if body is not None:
        a += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(body)]
    a.append("https://developers.cjdropshipping.com" + path)
    for att in range(3):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception:
            time.sleep(4); continue
        pi = d.get("pointsInfo") or {}
        if pi.get("remaining") is not None:
            _punkte["rest"] = pi["remaining"]
        if str(d.get("code")) in ("1600200", "1600201"):   # Drossel
            time.sleep(8 * (att + 1)); continue
        return d
    return None


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + STOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


UUID = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$', re.I)


def cj_kennt(sku):
    """-> True (vorhanden) / False (sicher weg) / None (unklar, nicht anfassen)

    ⚠️ TEUER GELERNT (2026-08-09): Es gibt DREI SKU-Formen, nicht zwei.
      a) CJ-<Ziffern>   numerische pid
      b) <variantSku>   z.B. CJLY291603001AZ
      c) CJ-<UUID>      z.B. CJ-5AF5A72D-0897-4AF6-AFF5-D6A33F2D3A01  ← aeltere CJ-Produkte
    Form (c) landete zuerst im variantSku-Zweig, bekam dort korrekt «nicht gefunden» — und wurde
    faelschlich als «bei CJ verschwunden» gewertet. Zwei kerngesunde Produkte wurden dadurch
    gedraftet. Ein «nicht gefunden» beweist nur, dass DIESE eine Abfrage nichts fand, nicht dass
    das Produkt weg ist. Darum wird jede Form ueber ihren eigenen Endpunkt geprueft, und bei
    Unsicherheit gilt weiterhin: nicht anfassen."""
    s = (sku or "").strip()
    kern = re.sub(r'^CJ-', '', s, flags=re.I)
    if re.fullmatch(r'[0-9]{10,}', kern) or UUID.fullmatch(kern):
        d = cj(f"/api2.0/v1/product/variant/query?pid={kern}")
    else:
        if not re.fullmatch(r'[A-Za-z0-9._-]{6,40}', kern):
            return None
        d = cj(f"/api2.0/v1/product/query?variantSku={kern}")
    if d is None:
        return None                      # Netz/Drossel -> unklar
    code = str(d.get("code"))
    if code == "200":
        data = d.get("data")
        if isinstance(data, dict):
            return bool(data.get("variants") or data.get("pid"))
        if isinstance(data, list):
            return bool(data)
        return None
    # CJ meldet Nichtgefunden mit eigenem Code; alles andere ist ein Fehler, kein Beweis
    txt = (d.get("message") or "").lower()
    if "not exist" in txt or "not found" in txt or "no data" in txt:
        return False
    return None


def main():
    st = "/tmp/cj_verf_cursor.txt"
    cur = open(st).read().strip() or None if os.path.exists(st) else None
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = weg = unklar = ok = 0
    print(f"Start | schon geprüft {len(done)} | DRY={DRY}", flush=True)

    while True:
        d = gql('''query($c:String){ products(first:60,after:$c,
                 query:"status:ACTIVE AND tag:cj-real", sortKey:CREATED_AT, reverse:true){
                 pageInfo{hasNextPage endCursor}
                 nodes{ id title variants(first:1){nodes{sku}} }}}''', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("keine Shopify-Daten", flush=True); break
        for p in pg["nodes"]:
            if p["id"] in done:
                continue
            if _punkte["rest"] is not None and _punkte["rest"] < PUNKTE_RESERVE:
                print(f"⏸️ Punkte-Restbudget {_punkte['rest']} < {PUNKTE_RESERVE} — "
                      f"Audit pausiert, damit der Import weiterläuft.", flush=True)
                print(f"Zwischenstand: {n} geprüft, {ok} ok, {weg} weg, {unklar} unklar")
                return
            v = p["variants"]["nodes"]
            sku = v[0]["sku"] if v else ""
            n += 1
            res = cj_kennt(sku)
            time.sleep(PAUSE)
            if res is None:
                unklar += 1
                continue                 # bewusst NICHT ins Ledger: nächster Lauf prüft erneut
            if res:
                ok += 1
                f.write(f"{p['id']}\tok\n")
            else:
                weg += 1
                f.write(f"{p['id']}\tbei-cj-weg\t{sku}\n")
                print(f"  ⛔ nicht mehr bei CJ: {p['title'][:55]} [{sku}]", flush=True)
                if not DRY:
                    gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                        {"i": {"id": p["id"], "status": "DRAFT"}})
                    gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                        {"id": p["id"], "t": ["cj-nicht-mehr-verfuegbar"]})
            f.flush()
        if n and n % 300 < 60:
            print(f"  {n} geprüft | ok {ok} | weg {weg} | unklar {unklar} | Punkte {_punkte['rest']}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]; open(st, "w").write(cur)
    print(f"FERTIG: {n} geprüft, {ok} ok, {weg} nicht mehr verfügbar, {unklar} unklar")


if __name__ == "__main__":
    main()
