"""Meldet Produkte, deren Farb-Auswahl NUR aus Lieferantencodes besteht – und markiert sie.

Anders als «A039 Black» (Code + Farbe, maschinell heilbar durch farbcode_optionswerte.py)
steht hier NIRGENDS, welche Farbe gemeint ist: «HQ24798», «XXL276 XL7500», «LIANMAO66-XXS».
Die Kundin muss im Dropdown einen fremden Code anklicken und weiss nicht, was sie bestellt.

⚠️ Diese Fälle werden BEWUSST NICHT automatisch umbenannt. Die Farbe liesse sich nur aus dem
Variantenbild raten – und geraten wurde hier schon einmal falsch: im Probelauf von
`variantenbild.py` waren 2 von 2 Zuordnungen daneben (schwarzes Portemonnaie als «Dunkelblau»,
weil der Hintergrund blau war). Eine falsche Farbzusage ist teurer als ein unverständlicher Code:
sie führt zur Retoure, der Code nur zur Rückfrage.

Das Skript setzt deshalb NUR den Tag `farbcode-optionswert-pruefen` (per tagsAdd, nie tags:) —
damit die Fälle im Admin filterbar sind. Wer sie auflöst, sieht das Variantenbild und benennt.
Der Nachschub ist am Importer gestoppt (cj_category_fill.mjs: solche Optionen heissen jetzt
«Ausführung» mit «Modell N» statt «Farbe» mit fremdem Code).

DRY=1 meldet nur.
"""
import json, os, re, time, urllib.request

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
QUELLE = os.environ.get("QUELLE", "export")
EXPORT = os.environ.get("EXPORT", "/tmp/optvals_raw.jsonl")
LEDGER = "dropship/_farbcode_rein.txt"
TAG = "farbcode-optionswert-pruefen"

CODE = re.compile(r"^[A-Za-z][A-Za-z0-9]{2,17}(?:-(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL))?$", re.I)
GROESSE = re.compile(r"^(xx?s|[sml]|xx?x?l|[2-6]xl)$", re.I)
FARBWORT = re.compile(r"(black|white|red|blue|green|yellow|grey|gray|pink|purple|brown|beige|"
                      r"gold|silver|orange|navy|khaki|schwarz|weiss|blau|grün|rot)", re.I)
SACHWORT = re.compile(r"(gb|tb|mb|mah|mm|cm|ml|kg|pcs|pack|inch|yards?|style|model|color|size|no)", re.I)


def _token(t):
    if GROESSE.match(t):
        return "groesse"
    if not CODE.match(t) or len(re.findall(r"\d", t)) < 2:
        return None
    if FARBWORT.search(t) or SACHWORT.search(t):
        return None
    return "code"


def art(wert):
    """Auch mehrteilige Werte zählen als Code, wenn JEDES Wort ein Code ist:
    «XXL276 XL7500» (Damenbluse) enthält kein einziges Farbwort."""
    teile = wert.strip().split()
    arten = [_token(t) for t in teile]
    if not teile or not all(arten):
        return None
    return "code" if "code" in arten else "groesse"


def nur_codes(optionen):
    opt = next((o for o in optionen
                if (o.get("name") or "").strip().lower() in ("farbe", "color", "colour")), None)
    if not opt:
        return None
    werte = [v["name"] for v in opt["optionValues"]]
    arten = [art(w) for w in werte]
    if len(werte) >= 2 and arten.count("code") >= 2 and all(a for a in arten):
        return werte
    return None


def gql(q, v=None):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for versuch in range(5):
        try:
            r = urllib.request.Request(URL, data=body, headers={
                "X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=60).read())
            if d.get("data") is not None:
                return d["data"]
        except Exception:
            pass
        time.sleep(3 + versuch * 3)
    return {}



def live_produkte(seit):
    """Frisch aus dem Shop statt aus dem Schnappschuss – der CJ-Grind legt täglich nach,
    ein Export von gestern kennt genau die neuen Produkte nicht (Lehre vom 14.08.2026)."""
    q = ("query($c:String,$q:String!){products(first:100,after:$c,query:$q){"
         "pageInfo{hasNextPage endCursor} nodes{id title status "
         "options{id name optionValues{id name}}}}}")
    cursor = None
    while True:
        d = (gql(q, {"c": cursor, "q": f"status:active created_at:>{seit}"}) or {}).get("products")
        if not d:
            return
        for n in d["nodes"]:
            yield n
        if not d["pageInfo"]["hasNextPage"]:
            return
        cursor = d["pageInfo"]["endCursor"]
        time.sleep(0.5)


def quelle():
    """Liefert Produkt-Dicts (id/title/options) – aus dem Export oder live."""
    if QUELLE == "live":
        seit = os.environ.get("SEIT") or (
            __import__("datetime").date.today() - __import__("datetime").timedelta(days=3)).isoformat()
        print(f"Quelle: LIVE, angelegt nach {seit}", flush=True)
        yield from live_produkte(seit)
    else:
        for zeile in open(EXPORT):
            yield json.loads(zeile)

def main():
    kandidaten = []
    for p in quelle():
        if nur_codes(p.get("options") or []):
            kandidaten.append(p["id"])
    print(f"Farb-Optionen, die nur aus Lieferantencodes bestehen: {len(kandidaten)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = None if DRY else open(LEDGER, "a")
    n = 0
    for gid in kandidaten:
        if gid in done:
            continue
        d = gql("query($id:ID!){node(id:$id){... on Product{id title status tags "
                "options{id name optionValues{id name}}}}}", {"id": gid})
        p = d.get("node") or {}
        if p.get("status") != "ACTIVE":
            continue
        werte = nur_codes(p.get("options") or [])      # gegen den LIVE-Stand neu prüfen
        if not werte:
            continue
        print(f"  {p['title'][:46]} | Farbe = {werte[:6]}", flush=True)
        if DRY or TAG in (p.get("tags") or []):
            continue
        gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
            {"id": gid, "t": [TAG]})
        n += 1
        f.write(f"{gid}\t{' · '.join(werte)}\t{p['title']}\n")
        f.flush()
        time.sleep(0.5)
    if f:
        f.close()
    print(f"FERTIG: {n} Produkte mit «{TAG}» markiert")


if __name__ == "__main__":
    main()
