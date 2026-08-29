#!/usr/bin/env python3
"""Google-Attribut `size` aus der Grössen-Option nachtragen.

Warum: Google verlangt für Bekleidung und Schuhe das Attribut `size`; fehlt es, wird das
Angebot in Shopping-Ergebnissen beschnitten. Der Google-Kanal ist der einzige mit belegten
Verkäufen. Ein Audit vom 14.08.2026 hatte die Lücke benannt, repariert wurde damals aber nur
die Optionsstruktur (Grösse steckte im Farbwert) — das Attribut selbst hat nie jemand
geschrieben. Am 28.08.2026 trug KEIN einziges geprüftes Kleid ein `size`, obwohl alle eine
saubere `Grösse`-Option mit S/M/L/XL haben.

Warum an der VARIANTE: dieselbe Begründung wie bei `color` (Lehre 14.08.). Im Google-Feed ist
jede Variante ein eigenes Angebot; ein Produkt-Metafeld würde allen Varianten dieselbe Grösse
geben. `cj_category_fill.mjs` schreibt `color` genau deshalb je Variante — dass es `size` nicht
tat, war die Lücke.

Bewusst NICHT gesetzt: `size_system` und `size_type`. Die Ware ist asiatisch konfektioniert
(die Produktseite sagt das seit 23.08. offen); ein «EU» zu behaupten wäre eine Falschangabe,
und eine falsche Angabe ist schlechter als keine.

Bewusst NUR Bekleidung/Schuhe: nur dort verlangt Google das Attribut. Eine Lampe mit einer
«Grösse»-Option (30 cm / 40 cm) bekommt keines — dort ist es keine Konfektionsgrösse.

  DRY=1  nur zählen und zeigen (Standard)
  FIX=1  schreiben
  CAP=n  höchstens n Produkte je Lauf (Standard 300)
"""
import json, os, re, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_google_size.txt")
CURSOR = os.path.join(REPO, "dropship", "_google_size_cursor.txt")
FIX = os.environ.get("FIX") == "1"
CAP = int(os.environ.get("CAP", "300"))

GROESSEN_OPT = re.compile(r"^(gr[öo]sse|gr[öo]ße|size|schuhgr[öo]sse|konfektionsgr)", re.I)
# Was als Konfektionsgrösse durchgeht. Bewusst eng: «Default Title», Farbnamen, Massangaben
# und Modellnummern dürfen NICHT als Grösse in den Feed (dieselbe Vorsicht wie bei farbeSauber).
GROESSE_OK = re.compile(
    r"^(?:"
    r"[0-9]?X{0,5}(?:S|M|L)"          # S, M, L, XL, XXL, 2XL, 0XL …
    r"|XXS|XS"
    r"|[0-9]{1,3}(?:[.,][05])?"        # 36, 38, 42.5 (Schuh-/Konfektionsgrössen)
    r"|[0-9]{2,3}\s?cm"                # 110 cm (Kindergrössen)
    r"|[0-9]{1,2}\s?(?:Y|J(?:ahre)?|M(?:onate)?)"  # 2Y, 6M
    r"|EU\s?[0-9]{2}|US\s?[0-9]{1,2}|UK\s?[0-9]{1,2}"
    r"|One\s?Size|Einheitsgr[öo]sse|Freie\s?Gr[öo]sse"
    r")$", re.I)


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


TOK = token()


def gql(q, v=None):
    body = {"query": q}
    if v:
        body["variables"] = v
    for _ in range(10):
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
        # Eine Drosselung ist kein Abbruchgrund — sie sagt nur, wie lange zu warten ist.
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            kosten = (d.get("extensions") or {}).get("cost") or {}
            ts = kosten.get("throttleStatus") or {}
            fehlt = kosten.get("requestedQueryCost", 100) - ts.get("currentlyAvailable", 0)
            time.sleep(min(20, max(2, fehlt / (ts.get("restoreRate") or 100) + 1))); continue
        if errs:
            return d
        return d
    return {"errors": [{"message": "aufgegeben"}]}


def varianten(pid):
    aus, cur = [], None
    while True:
        d = gql("""query($id:ID!,$c:String){product(id:$id){variants(first:100,after:$c){
                   pageInfo{hasNextPage endCursor}
                   nodes{id selectedOptions{name value}
                         mf:metafields(first:5,namespace:"mm-google-shopping"){nodes{key}}}}}}""",
                {"id": pid, "c": cur})
        v = ((d.get("data") or {}).get("product") or {}).get("variants")
        if not v:
            return aus
        aus += v["nodes"]
        if not v["pageInfo"]["hasNextPage"]:
            return aus
        cur = v["pageInfo"]["endCursor"]


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}
    cur = None
    if os.path.exists(CURSOR):
        cur = (open(CURSOR).read().strip() or None)

    geprueft = behandelt = gesetzt = 0
    verworfen = {}
    while behandelt < CAP:
        d = gql("""query($c:String){products(first:25,after:$c,query:"status:active"){
                   pageInfo{hasNextPage endCursor}
                   nodes{id title options{name}
                         gk:metafield(namespace:"mm-google-shopping",key:"google_product_category"){value}}}}""",
                {"c": cur})
        if "errors" in d:
            print("Abfrage fehlgeschlagen:", str(d["errors"])[:160]); print("PAUSE"); return 1
        seite = d["data"]["products"]
        for p in seite["nodes"]:
            geprueft += 1
            if p["id"] in erledigt:
                continue
            kat = (p.get("gk") or {}).get("value") or ""
            # Nur dort, wo Google das Attribut verlangt.
            if not (kat.startswith("Apparel & Accessories > Clothing")
                    or kat.startswith("Apparel & Accessories > Shoes")):
                continue
            if not any(GROESSEN_OPT.match(o["name"] or "") for o in p["options"]):
                continue
            if behandelt >= CAP:
                break
            vs = varianten(p["id"])
            offen = []
            for v in vs:
                if any(m["key"] == "size" for m in v["mf"]["nodes"]):
                    continue
                wert = next((o["value"] for o in v["selectedOptions"]
                             if GROESSEN_OPT.match(o["name"] or "")), None)
                if not wert:
                    continue
                if not GROESSE_OK.match(wert.strip()):
                    verworfen[wert.strip()] = verworfen.get(wert.strip(), 0) + 1
                    continue
                offen.append((v["id"], wert.strip()))
            if not offen:
                continue
            behandelt += 1
            if FIX:
                # In Blöcken zu 25 — metafieldsSet nimmt höchstens 25 je Aufruf.
                fehler = False
                for i in range(0, len(offen), 25):
                    teil = [{"ownerId": vid, "namespace": "mm-google-shopping", "key": "size",
                             "type": "single_line_text_field", "value": w} for vid, w in offen[i:i + 25]]
                    r = gql("""mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){
                               userErrors{field message}}}""", {"m": teil})
                    ue = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors") or []
                    if ue or "errors" in r:
                        print("  FEHLER", p["title"][:40], str(ue or r["errors"])[:120])
                        fehler = True; break
                if not fehler:
                    gesetzt += len(offen)
                    with open(LEDGER, "a") as f:
                        f.write(p["id"] + "\n")
            else:
                gesetzt += len(offen)
                if behandelt <= 12:
                    print(f"  {p['title'][:46]:48s} {len(offen):3d} Varianten "
                          f"({', '.join(w for _, w in offen[:5])}…)")
        cur = seite["pageInfo"]["endCursor"]
        # ⚠️ Den Zeiger NUR im Schreibmodus merken. Der Probelauf trägt nichts ins Ledger ein;
        # ein weitergeschriebener Zeiger würde die eben gefundenen Lücken beim nächsten
        # Schreiblauf überspringen — die Anzeige hätte die Reparatur verhindert.
        if FIX:
            with open(CURSOR, "w") as f:
                f.write(cur or "")
        if not seite["pageInfo"]["hasNextPage"]:
            if FIX and os.path.exists(CURSOR):
                os.remove(CURSOR)
            print(f"Katalog einmal durch. {geprueft} geprüft.")
            break

    print(f"geprüft {geprueft} | Produkte mit Lücke {behandelt} | "
          f"{'gesetzt' if FIX else 'zu setzen'} {gesetzt} Varianten-Grössen")
    if verworfen:
        print("  verworfene Werte (keine Konfektionsgrösse):",
              dict(sorted(verworfen.items(), key=lambda x: -x[1])[:10]))
    if not FIX and gesetzt:
        print("  (nur Anzeige — mit FIX=1 schreiben)")
    # FERTIG hängt an der Zahl der ÄNDERUNGEN, nicht an Meldungen (Lehre 21.08.).
    if behandelt == 0:
        print("FERTIG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
