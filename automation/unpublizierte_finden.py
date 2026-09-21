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
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_np.json"], capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


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
