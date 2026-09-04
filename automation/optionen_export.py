#!/usr/bin/env python3
"""Options-Export bauen: /tmp/opts_frisch.jsonl

WARUM ES DAS GIBT (04.09.2026): Drei Waechter fuer kundensichtbare Variantenwerte —
`farbwert_dubletten` («Blau» neben «Blue»), `mass_im_farbwert` («Silver-64GB») und
`groesse_im_farbwert` — lesen einen Options-Export, den bis heute NIEMAND gebaut hat.
Er entstand am 23.08. von Hand; der /tmp-Wipe vom 30.08. hat ihn geloescht, und seither
melden alle drei brav «PAUSE (Quelle fehlt)» — fuenf Tage ausser Dienst, ohne dass es
auffiel. **Ein Werkzeug, dessen Eingabe niemand herstellt, ist ein Einmal-Lauf, kein
Waechter.**

Der Export ist FORTSETZBAR: ein Vollscan ueber 52'000 Produkte dauert laenger als ein
Container-Leben (Neustart etwa stuendlich, Lehre 03.09.). Cursor in /tmp, Zeilen werden
seitenweise angehaengt; erst wenn die letzte Seite gelesen ist, wird die fertige Datei
an ihren Platz gelegt — ein halber Export waere schlimmer als keiner, weil die Waechter
ihn fuer den ganzen Katalog hielten und «0 Befunde» meldeten.

ENV: ZIEL=<pfad> (Default /tmp/opts_frisch.jsonl) · NEU=1 (von vorn) · CAP=<seiten>
"""
import json, os, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
ZIEL = os.environ.get("ZIEL", "/tmp/opts_frisch.jsonl")
ROH = ZIEL + ".teil"
STAND = ZIEL + ".stand"
NEU = os.environ.get("NEU") == "1"
CAP = int(os.environ.get("CAP") or 0)

Q = """query($c:String){ products(first:100, after:$c, query:"status:active"){
        pageInfo{ hasNextPage endCursor }
        nodes{ id options{ name optionValues{ name } } } } }"""


def gql(q, v):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    for i in range(8):
        r = subprocess.run(
            ["curl", "-sS", "-X", "POST",
             f"https://{SHOP}/admin/api/2024-10/graphql.json",
             "-H", f"X-Shopify-Access-Token: {tok}",
             "-H", "Content-Type: application/json",
             "-d", json.dumps({"query": q, "variables": v})],
            capture_output=True, text=True, timeout=120)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(3 + i * 2); continue
        if d.get("data"):
            return d["data"]
        # Eine Drosselung ist eine Warteanweisung, kein Abbruchgrund (Lehre 21.08.).
        if "THROTTL" in json.dumps(d.get("errors") or "").upper():
            time.sleep(5 + i * 3); continue
        sys.stderr.write("GraphQL: " + json.dumps(d.get("errors"))[:200] + "\n")
        time.sleep(3 + i * 2)
    return None


def main():
    cursor, n = None, 0
    if not NEU and os.path.exists(STAND):
        try:
            st = json.load(open(STAND))
            cursor, n = st.get("cursor"), int(st.get("n", 0))
            print(f"FORTSETZUNG bei Produkt {n}", flush=True)
        except Exception:
            cursor, n = None, 0
    if cursor is None and os.path.exists(ROH):
        os.remove(ROH)
    seiten = 0
    while True:
        d = gql(Q, {"c": cursor})
        if d is None:
            print("PAUSE (Shopify blieb stumm) — Teilstand gesichert, naechster Lauf setzt fort")
            return 1
        pg = d["products"]
        with open(ROH, "a", encoding="utf-8") as f:
            for p in pg["nodes"]:
                n += 1
                f.write(json.dumps({"id": p["id"], "status": "ACTIVE",
                                    "options": p["options"]}, ensure_ascii=False) + "\n")
        seiten += 1
        cursor = pg["pageInfo"]["endCursor"]
        json.dump({"cursor": cursor, "n": n}, open(STAND, "w"))
        if seiten % 25 == 0:
            print(f"  … {n} Produkte", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        if CAP and seiten >= CAP:
            print(f"PAUSE (CAP {CAP} Seiten) — naechster Lauf setzt fort")
            return 1
        time.sleep(0.4)
    os.replace(ROH, ZIEL)
    if os.path.exists(STAND):
        os.remove(STAND)
    print(f"FERTIG: {n} aktive Produkte → {ZIEL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
