"""Entfernt den Baustein «Styling & Bemerkung» mit Saison- und Knappheitsfloskel.

Befund 23.09.2026 (Audit): 114 aktive Mode-/Schmuckprodukte trugen
  «… ist ein vielseitiger Premium-Liebling für deinen Sommer 2026 – mühelos kombinierbar …»
  «Bemerkung: Beliebte Modelle & Farben sind oft schnell vergriffen – sichere dir deinen Look rechtzeitig.»
Quelle: das Einmal-Werkzeug desc_block.mjs (Juli). Ende September für einen Wollpullover mit
«deinem Sommer» zu werben wirkt nach Textmaschine, und «oft schnell vergriffen» ist eine
unbelegte Knappheitsbehauptung bei Ware ohne Bestandsführung (UWG; Kundenfeedback «Scam», Task #40).

Der Wächter holt die Kandidaten LIVE (Phrasensuche, Kanarienvogel), entfernt Überschrift und
die beiden Floskel-Absätze, lässt den Kollektionslink «👉 Mehr … entdecken →» stehen, liest
zurück und quittiert. Text-Sperre /tmp/lock_produkttext.lock je Produkt (nie für den ganzen Lauf).
DRY=1 zeigt nur.
"""
import fcntl, json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_styling_floskel_entfernt.txt"
PHRASEN = ['"schnell vergriffen"', '"Premium-Liebling für deinen Sommer"']
BLOCK = re.compile(
    r'<h4>\s*✨\s*Styling (?:&amp;|&) Bemerkung\s*</h4>\s*'
    r'(?:<p>[^<]*Premium-Liebling für deinen Sommer[^<]*</p>\s*)?'
    r'(?:<p>\s*<strong>Bemerkung:</strong>[^<]*vergriffen[^<]*</p>\s*)?')
# Reste in anderer Anordnung (nur einer der Sätze, ohne Überschrift)
EINZELN = [re.compile(r'<p>[^<]*Premium-Liebling für deinen Sommer[^<]*</p>\s*'),
           re.compile(r'<p>\s*<strong>Bemerkung:</strong>[^<]*schnell vergriffen[^<]*</p>\s*')]


def gql(q, v=None):
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10)
            continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


def kandidaten():
    kan = gql("query($q:String){productsCount(query:$q,limit:null){count}}",
              {"q": 'status:active AND "zzz kanarienvogel floskel xyz"'})
    if kan["data"]["productsCount"]["count"] != 0:
        raise SystemExit("ABBRUCH: Phrasensuche wird ignoriert (Kanarienvogel > 0)")
    ids = {}
    for ph in PHRASEN:
        nach = None
        while True:
            d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
              pageInfo{hasNextPage endCursor} nodes{id handle}}}""", {"q": f"status:active AND {ph}", "n": nach})
            p = d["data"]["products"]
            for n in p["nodes"]:
                ids[n["id"]] = n["handle"]
            if not p["pageInfo"]["hasNextPage"]:
                break
            nach = p["pageInfo"]["endCursor"]
    return ids


def reinigen(html):
    neu = BLOCK.sub("", html)
    for rx in EINZELN:
        neu = rx.sub("", neu)
    return neu


def main():
    ks = kandidaten()
    print(f"{len(ks)} aktive Produkte mit Styling-Floskel · {'DRY' if DRY else 'SCHREIBEN'}")
    ok = fehl = gleich = 0
    with open("/tmp/lock_produkttext.lock", "w") as lk:
        for pid, h in ks.items():
            fcntl.flock(lk, fcntl.LOCK_EX)
            try:
                p = gql("query($id:ID!){product(id:$id){descriptionHtml}}", {"id": pid})["data"]["product"]
                alt = p["descriptionHtml"] or ""
                neu = reinigen(alt)
                if neu == alt:
                    gleich += 1
                    print(f"  ? kein Muster: {h}")
                    continue
                if "vergriffen" in neu or "deinen Sommer 2026" in neu:
                    fehl += 1
                    print(f"  ⚠️ Rest bleibt: {h}")
                    continue
                if DRY:
                    ok += 1
                    continue
                r = gql("""mutation($p:ProductUpdateInput!){productUpdate(product:$p){
                          product{descriptionHtml} userErrors{message}}}""",
                        {"p": {"id": pid, "descriptionHtml": neu}})
                pu = (r.get("data") or {}).get("productUpdate") or {}
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    fehl += 1
                    print(f"  FEHLER {h}: {pu.get('userErrors')}")
                    continue
                ok += 1
                with open(LEDGER, "a") as f:
                    f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{pid}\t{h}\n")
            finally:
                fcntl.flock(lk, fcntl.LOCK_UN)
            time.sleep(0.25)
    print(f"FERTIG: {ok} bereinigt, {gleich} ohne Muster, {fehl} Fehler{' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
