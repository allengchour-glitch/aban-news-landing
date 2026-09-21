"""BigBuy-Abschied: draftet alle aktiven BigBuy-Produkte, wenn das Paket ausläuft.

Der Betreiber hat das BigBuy-Abo «Pack Ecommerce» am 16.08.2026 gekündigt; es bleibt bis
15.09.2026 aktiv. OHNE Paket gibt es keinen API-Zugang mehr — und ohne Bestandsprüfung sind
BigBuy-Produkte tickende Geisterverkäufe (Juli-Lehre: 78 % «aktive» Ware war ausverkauft,
Order #1006/#1008/#1009 endeten als Rückerstattung).

Der Aufseher startet dieses Skript täglich; VOR dem Stichtag beendet es sich sofort ohne
FERTIG (damit es am Stichtag noch einmal läuft). AB dem 15.09. draftet es alle aktiven
Produkte mit BigBuy-SKU (bb-*/BB-*) oder Tag bigbuy — mit Tag, nie löschen.

DRY=1 zeigt nur. Ledger: dropship/_bigbuy_abschied.txt
"""
import json, os, time, urllib.request

STICHTAG = "2026-09-15"

# ⚠️ 15.09.2026, am Stichtag selbst gemessen: Hier stand `query:"status:active tag:bigbuy"` —
# obwohl der Kopf dieser Datei seit dem 16.08. verspricht, «alle aktiven Produkte mit BigBuy-SKU
# (bb-*/BB-*) ODER Tag bigbuy» zu draften. Der Tag `bigbuy` deckt aber nur einen Teil des Bestands:
# gemessen waren 138 Produkte so getaggt, **136 weitere trugen `bb-real` und/oder eine `bb-…`-SKU
# ohne diesen Tag** (110 davon ganz ohne BigBuy-Tag). Die wären nach dem Abschied ACTIVE geblieben —
# also bestellbar, ohne dass es noch einen Lieferanten-Zugang gibt: genau die Geisterverkaufs-Klasse
# der Bestellungen #1006/#1008/#1009. Gegenprobe gegen Fehlalarme: `tag:bb-real AND -sku:bb-*` = 0,
# der Tag und die SKU meinen dieselbe Ware. **Lehre: Ein Kopfkommentar ist kein Filter.** Was die
# Datei verspricht, gehört in die Abfrage — sonst arbeitet ein Wächter jahrelang an einem Ausschnitt
# und meldet «FERTIG» für den ganzen Bestand.
AUSWAHL = "status:active AND (tag:bigbuy OR tag:bb-real OR sku:bb-*)"
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_bigbuy_abschied.txt"
TOK = open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None):
    for i in range(6):
        try:
            r = urllib.request.Request(
                "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                data=json.dumps({"query": q, "variables": v or {}}).encode(),
                headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=45).read())
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(3 * (i + 1))
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    if time.strftime("%Y-%m-%d") < STICHTAG and not DRY:
        print(f"PAUSE (BigBuy-Paket läuft noch bis {STICHTAG} — heute nichts zu tun)")
        return
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    cur, n, gesehen = None, 0, 0
    while True:
        d = gql('query($c:String,$q:String){products(first:100,after:$c,query:$q){'
                'pageInfo{hasNextPage endCursor} nodes{id title}}}', {"c": cur, "q": AUSWAHL})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("PAUSE (Shopify antwortet nicht — nächster Lauf macht weiter)")
            return
        for p in pg["nodes"]:
            gesehen += 1
            if p["id"] in fertig:
                continue
            if DRY:
                print("[DRY] würde draften:", p["title"][:50])
                continue
            r = gql('mutation($p:ProductInput!){productUpdate(input:$p){userErrors{message}}}',
                    {"p": {"id": p["id"], "status": "DRAFT"}})
            if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
                continue
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": p["id"], "t": ["bigbuy-paket-ausgelaufen"]})
            f.write(p["id"] + "\t" + p["title"][:60] + "\n")
            f.flush()
            n += 1
            time.sleep(0.4)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    print(f"FERTIG: {gesehen} BigBuy-Produkte geprüft, {n} gedraftet (Paket ausgelaufen).")


if __name__ == "__main__":
    main()
