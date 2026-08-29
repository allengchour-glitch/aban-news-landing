#!/usr/bin/env python3
"""Ratgeber-Rueckverweis: verlinkt Produkte zurueck auf den Ratgeber, der sie empfiehlt.

Warum: Die veroeffentlichten Ratgeber holen Google-Besucher und verlinken von dort auf
Produkte. Der Weg zurueck fehlte bei 67 von 67 Produkten (Messung 28.08.2026). Wer ueber
Google direkt auf der PRODUKTSEITE landet - beim Rizinusoel-Set 43 Sitzungen in 30 Tagen,
die zweitgroesste Landeseite des Shops - findet dort keine Antwort auf "wie wende ich das
an", obwohl der Shop genau diesen Text besitzt. Zwei Wirkungen: die Besucherin bleibt, und
Google sieht eine gegenseitige interne Verlinkung statt einer Sackgasse.

Grundsaetze:
  - NUR ANHAENGEN. Der Bestandstext wird nie ersetzt, nie umgeschrieben.
  - Beschreibung IMMER live unmittelbar vor dem Schreiben lesen (parallele Textlaeufe,
    Lehre 15.08.) - der Block wird an den frisch gelesenen Text gehaengt.
  - Idempotent: steht schon ein Link auf diesen Artikel drin, passiert nichts.
  - Nur ACTIVE Produkte, nur veroeffentlichte Artikel.
  - Nur MELDEN ohne FIX=1.

  DRY=1   nur zeigen (Standard)
  FIX=1   schreiben
"""
import json, os, re, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_ratgeber_rueckverweis.txt")
FIX = os.environ.get("FIX") == "1"
CAP = int(os.environ.get("CAP", "200"))

def token():
    p = "/tmp/cj_shop_token.txt"
    if os.path.exists(p):
        t = open(p).read().strip()
        if t:
            return t
    subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                   capture_output=True)
    return open(p).read().strip()

TOK = token()

def gql(q, v=None):
    body = {"query": q}
    if v:
        body["variables"] = v
    for versuch in range(10):
        r = subprocess.run(["curl", "-s", "--max-time", "45",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps(body)], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(3); continue
        errs = d.get("errors") or []
        # Eine Drosselung ist kein Abbruchgrund - sie sagt nur, wie lange zu warten ist.
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            kosten = (d.get("extensions") or {}).get("cost") or {}
            ts = kosten.get("throttleStatus") or {}
            fehlt = kosten.get("requestedQueryCost", 100) - ts.get("currentlyAvailable", 0)
            rate = ts.get("restoreRate") or 100
            time.sleep(min(20, max(2, fehlt / rate + 1))); continue
        return d
    return {"errors": [{"message": "aufgegeben"}]}

def alle_artikel():
    aus, cur = [], None
    while True:
        d = gql("""query($c:String){articles(first:25,after:$c){pageInfo{hasNextPage endCursor}
                   nodes{title handle isPublished blog{handle} body}}}""", {"c": cur})
        if "errors" in d:
            print("Artikel-Abruf fehlgeschlagen:", str(d["errors"])[:200]); return None
        a = d["data"]["articles"]
        aus += a["nodes"]
        if not a["pageInfo"]["hasNextPage"]:
            return aus
        cur = a["pageInfo"]["endCursor"]

def block(pfad, titel):
    return ('\n<div style="border-left:3px solid #d9e7d9;padding:8px 0 8px 12px;'
            'margin:14px 0;font-size:14px;line-height:1.5;">\n'
            f'📖 <strong>Passend dazu im Ratgeber:</strong> <a href="{pfad}">{titel}</a>\n'
            '</div>')

def einfuegen(html, neu):
    """Vor den Trust-Baustein setzen, sonst ans Ende. Nie etwas ersetzen."""
    marke = html.find("🛡️ Sorglos shoppen")
    if marke > 0:
        start = html.rfind("<div", 0, marke)
        if start > 0:
            return html[:start] + neu + "\n" + html[start:]
    return html + neu

def main():
    arts = alle_artikel()
    if arts is None:
        print("PAUSE"); return 1
    ziele = {}
    for a in arts:
        if not a["isPublished"]:
            continue
        pfad_basis = "/blogs/" + a["blog"]["handle"] + "/"
        for h in set(re.findall(r"/products/([a-z0-9\-]+)", a["body"] or "")):
            ziele.setdefault(h, []).append((pfad_basis + a["handle"], a["title"], a["handle"]))

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}

    gesetzt = uebersprungen = fehlend = 0
    zeilen = []
    for h in sorted(ziele):
        if len(ziele[h]) and h + "|" + ziele[h][0][2] in erledigt:
            continue
        if gesetzt >= CAP:
            break
        d = gql("""query($q:String!){products(first:1,query:$q){nodes{id title status
                   descriptionHtml}}}""", {"q": "handle:" + h})
        n = (d.get("data", {}).get("products") or {}).get("nodes") or []
        if not n or n[0]["status"] != "ACTIVE":
            fehlend += 1
            continue
        p = n[0]
        html = p["descriptionHtml"] or ""
        vorhanden = set(re.findall(r"/blogs/[a-z0-9\-]+/([a-z0-9\-]+)", html))
        offen = [z for z in ziele[h] if z[2] not in vorhanden][:2]
        if not offen:
            uebersprungen += 1
            continue
        neu = html
        for pfad, titel, ahandle in offen:
            neu = einfuegen(neu, block(pfad, titel))
        zeilen.append(f"  {p['title'][:50]:52s} -> {offen[0][0]}")
        if FIX:
            r = gql("""mutation($in:ProductInput!){productUpdate(input:$in){
                       userErrors{field message}}}""",
                    {"in": {"id": p["id"], "descriptionHtml": neu}})
            ue = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors") or []
            if ue or "errors" in r:
                print("  FEHLER", p["title"][:40], str(ue or r["errors"])[:120]); continue
            with open(LEDGER, "a") as f:
                for _, _, ah in offen:
                    f.write(h + "|" + ah + "\n")
        gesetzt += 1

    print(f"verlinkte Produkte gesamt: {len(ziele)}")
    print(f"  {'gesetzt' if FIX else 'zu setzen'}: {gesetzt} | schon verlinkt: {uebersprungen} | nicht aktiv: {fehlend}")
    for z in zeilen[:40]:
        print(z)
    if not FIX and gesetzt:
        print("  (nur Anzeige - mit FIX=1 schreiben)")
    # FERTIG haengt an der Zahl der AENDERUNGEN, nicht an Meldungen (Lehre 21.08.).
    if gesetzt == 0:
        print("FERTIG")
    return 0

if __name__ == "__main__":
    sys.exit(main())
