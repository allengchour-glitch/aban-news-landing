"""Kürzt Keyword-Monster in Produkt-URLs — mit Weiterleitung, damit kein Link bricht.

DER BEFUND: 17 aktive Produkte tragen eine URL von 80 bis 150 Zeichen, weil beim Import der
komplette Suchbegriff des Lieferanten zum Handle wurde:

    /products/herrenhose-herrenhose-hose-fur-herren-fruhling-herbst-sommerhose-
              herrenbekleidung-business-herrenanzuge-herrenhose-schneiderei

«herrenhose» steht dreimal darin. Das ist Keyword-Stuffing, wie Suchmaschinen es ausdrücklich
abwerten, und wer so einen Link teilt, sieht nicht nach einem geführten Shop aus.

⚠️ EINE URL ZU ÄNDERN HEISST, EINEN LINK ZU BRECHEN. Wer die alte Adresse gespeichert oder
geteilt hat, landet danach auf einer 404-Seite — und Google auch, bis es neu indexiert. Deshalb
wird zu JEDEM geänderten Handle eine 301-Weiterleitung angelegt, bevor gemeldet wird, es sei
erledigt. (Shopify legt bei Handle-Änderungen oft selbst eine an; darauf verlässt sich dieses
Skript nicht — es prüft nach und legt sie sonst selbst an.)

Der neue Handle entsteht aus dem Titel, nicht aus dem alten Handle: der Titel ist der Text, den
auch die Kundschaft liest.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
MAXLAENGE = int(os.environ.get("MAXLAENGE", "80"))
LEDGER = "dropship/_handle_kuerzen.txt"

UMLAUT = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue"}


def slug(titel, grenze=60):
    s = titel.lower()
    for a, b in UMLAUT.items():
        s = s.replace(a.lower(), b)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    if len(s) <= grenze:
        return s
    # Am letzten vollständigen Wort abschneiden — ein halbes Wort in der URL sieht nach
    # einem Fehler aus, nicht nach einer Kürzung.
    schnitt = s[:grenze]
    if '-' in schnitt:
        schnitt = schnitt[:schnitt.rfind('-')]
    return schnitt.strip('-')


def gql(q, v=None):
    with open("/tmp/_hk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hk.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or len(p["handle"]) <= MAXLAENGE:
            continue
        neu = slug(p["title"])
        if neu and neu != p["handle"]:
            kandidaten.append((p["id"], p["handle"], neu, p["title"]))

    print(f"URLs über {MAXLAENGE} Zeichen: {len(kandidaten)}", flush=True)
    for _, alt, neu, t in kandidaten:
        print(f"   {len(alt):>3} → {len(neu):>2}   {alt[:58]}\n            → {neu}", flush=True)
    if DRY or not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, alt, neu, titel in kandidaten:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{handle} '
                'userErrors{message}}}', {"i": {"id": gid, "handle": neu}})
        u = (r.get("data") or {}).get("productUpdate") or {}
        if u.get("userErrors"):
            print(f"  ⚠️ {titel[:36]}: {u['userErrors'][0]['message']}", flush=True)
            continue
        gesetzt = (u.get("product") or {}).get("handle") or neu
        # Weiterleitung: erst prüfen, ob Shopify schon eine angelegt hat.
        d = gql('query($q:String!){urlRedirects(first:1,query:$q){nodes{id path target}}}',
                {"q": f'path:/products/{alt}'})
        vorhanden = ((d.get("data") or {}).get("urlRedirects") or {}).get("nodes") or []
        if not vorhanden:
            rr = gql('mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r)'
                     '{urlRedirect{id} userErrors{message}}}',
                     {"r": {"path": f"/products/{alt}", "target": f"/products/{gesetzt}"}})
            e = ((rr.get("data") or {}).get("urlRedirectCreate") or {}).get("userErrors")
            if e:
                print(f"  ⚠️ Weiterleitung fehlt für {alt[:40]}: {e[0]['message']}", flush=True)
        n += 1
        f.write(f"{gid}\t{alt}\t{gesetzt}\n")
        f.flush()
        print(f"  ✅ {gesetzt}", flush=True)
        time.sleep(0.4)
    print(f"FERTIG: {n} URLs gekürzt (je mit 301-Weiterleitung)")


if __name__ == "__main__":
    main()
