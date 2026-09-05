"""Findet aktive Produkte, die im Onlineshop NICHT publiziert sind — sie liefern HTTP 404.

ANLASS (Merchant-Audit 2026-08-09): 63 Produkte stehen auf ACTIVE, fehlen aber in der
Online-Store-Publikation. Für Kunden und Google sind sie «Seite nicht verfügbar». Ursache:
Der Importer legt das Produkt an und vergisst gelegentlich `publishablePublish` — genau die
Falle, die im Projekt-Memory schon für Kollektionen dokumentiert ist («Publish-Falle»).

Heute keine Merchant-Ablehnung, weil sie zufällig nicht im Google-Kanal liegen. Sobald der
Kanal wächst, kippt das — «Product page unavailable» ist ein harter Ablehnungsgrund.

Der Fix ist einfach: nachpublizieren. Vorher wird jedoch **live geprüft**, ob die Seite
wirklich 404 liefert — der Admin allein ist keine verlässliche Quelle (siehe Kollektions-Check:
`productsCount` zählt Entwürfe mit und hinkt hinterher).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
PX = os.environ.get("HTTPS_PROXY", "")
DRY = os.environ.get("DRY") == "1"
ONLINE_STORE = "301970915713"
WEITERE = ["301971014017", "302032716161", "302566834561", "302994456961"]
LEDGER = "dropship/_nachpubliziert.txt"


def gql(q, v=None):
    with open("/tmp/_np.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_np.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def live_status(handle):
    r = subprocess.run(["curl", "-sL", "-o", "/dev/null", "-w", "%{http_code}",
                        "--max-time", "25", "-x", PX,
                        f"https://luxestyle.ch/products/{handle}"],
                       capture_output=True, text=True)
    return (r.stdout or "").strip()


def main():
    cur, kandidaten = None, []
    while True:
        d = gql('''query($c:String){products(first:200,after:$c,
                query:"status:ACTIVE AND -publication_ids:301970915713"){
                pageInfo{hasNextPage endCursor} nodes{id handle title createdAt}}}''', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            break
        kandidaten += [(p["id"], p["handle"], p["title"], p["createdAt"]) for p in pg["nodes"]]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"aktiv, aber nicht im Onlineshop publiziert: {len(kandidaten)}", flush=True)
    if not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    bestaetigt = falsch_alarm = 0
    for gid, handle, titel, erstellt in kandidaten:
        if gid in done:
            continue
        code = live_status(handle)
        time.sleep(1.5)
        if code == "200":
            # Der Admin behauptet unpubliziert, die Seite lebt aber -> nicht anfassen.
            falsch_alarm += 1
            print(f"  ✅ lebt trotzdem ({code}): {titel[:46]}", flush=True)
            continue
        bestaetigt += 1
        print(f"  ⛔ {code}: {titel[:46]}  (angelegt {erstellt[:10]})", flush=True)
        if DRY:
            continue
        for pub in [ONLINE_STORE] + WEITERE:
            gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p)'
                '{userErrors{message}}}',
                {"id": gid, "p": [{"publicationId": "gid://shopify/Publication/" + pub}]})
            time.sleep(0.1)
        f.write(f"{gid}\t{handle}\t{titel}\n"); f.flush()
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {bestaetigt} nachpubliziert, "
          f"{falsch_alarm} lebten schon (Admin-Angabe war überholt)")


if __name__ == "__main__":
    main()
