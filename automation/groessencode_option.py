"""Die Option «Farbe» heisst bei 26 Produkten in Wahrheit «Grösse» – und zeigt Lieferantencodes.

DER BEFUND (2026-08-20): Bei den CJ-Jeansjacken steht in der einzigen Auswahlliste
«Y109S · Y109M · Y109L · Y109XL · Y109XXL · Y109XXXL», überschrieben mit «Farbe».
Die Kundin sucht ihre Grösse in einer Farbliste und liest dabei den Artikelcode des
Lieferanten. Der Beschreibungstext desselben Produkts nennt korrekt «Grösse: XS, S, M, L, XL».

Der Eingriff ist belegbar, nicht geraten: Alle Werte tragen DENSELBEN Präfix (die Modellnummer,
die auch in der SKU steckt) und je EIN unterschiedliches Grössenkürzel; je Grösse gibt es genau
eine Variante zum selben Preis. Also: Option → «Grösse», Werte → «S», «M», «L», …

⚠️ NICHT angefasst wird, wenn
 • das Produkt schon eine Option «Grösse» hat (sonst zwei gleichnamige Optionen),
 • die Präfixe verschieden sind («Y039S» neben «Y040M» – dann steckt dort auch das Modell,
   und die Auswahl wäre nach dem Kürzen mehrdeutig),
 • ein Grössenkürzel doppelt vorkäme.
Die Modellnummer bleibt in SKU und Titel erhalten – bei sieben sonst gleichnamigen Jeansjacken
ist sie das einzige Unterscheidungsmerkmal (Lehre vom 11.08.2026).

DRY=1 meldet nur.
"""
import json, os, re, time, urllib.request

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/optvals_raw.jsonl")
LEDGER = "dropship/_groessencode_option.txt"

SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL", "6XL"]


def zerlege(wert):
    """«Y109XXL» → («Y109», «XXL»). None, wenn der Wert nicht so gebaut ist."""
    for s in sorted(SIZES, key=len, reverse=True):
        if wert.upper().endswith(s):
            praefix = wert[:len(wert) - len(s)]
            if len(re.findall(r"\d", praefix)) >= 2 and re.match(r"^[A-Za-z][A-Za-z0-9]*$", praefix):
                return praefix, s
    return None


def pruefe(optionen):
    """Gibt {alterWert: Grösse} zurück – oder None, wenn die Option nicht eindeutig ist."""
    namen = [(o.get("name") or "").strip().lower() for o in optionen]
    if any(n in ("grösse", "groesse", "größe", "size") for n in namen):
        return None, None
    opt = next((o for o in optionen
                if (o.get("name") or "").strip().lower() in ("farbe", "color", "colour")), None)
    if not opt:
        return None, None
    werte = [v["name"] for v in opt["optionValues"]]
    teile = [zerlege(w) for w in werte]
    if len(werte) < 2 or not all(teile):
        return None, None
    if len({t[0] for t in teile}) != 1 or len({t[1] for t in teile}) != len(werte):
        return None, None
    return opt, {w: t[1] for w, t in zip(werte, teile)}


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
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        opt, _ = pruefe(p.get("options") or [])
        if opt:
            kandidaten.append(p["id"])
    print(f"Kandidaten: {len(kandidaten)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = None if DRY else open(LEDGER, "a")
    n = fehler = 0
    for gid in kandidaten:
        if gid in done:
            continue
        d = gql("query($id:ID!){node(id:$id){... on Product{id title status "
                "options{id name optionValues{id name}}}}}", {"id": gid})
        p = d.get("node") or {}
        if p.get("status") != "ACTIVE":
            continue
        opt, karte = pruefe(p.get("options") or [])   # gegen den LIVE-Stand neu prüfen
        if not opt:
            continue
        upd = [{"id": v["id"], "name": karte[v["name"]]} for v in opt["optionValues"]]
        vorher = " · ".join(v["name"] for v in opt["optionValues"])
        nachher = " · ".join(u["name"] for u in upd)
        print(f"  {p['title'][:44]} | Farbe[{vorher}] → Grösse[{nachher}]", flush=True)
        if DRY:
            continue
        r = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){"
                "productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u)"
                "{userErrors{message}}}",
                {"p": gid, "o": {"id": opt["id"], "name": "Grösse"}, "u": upd})
        e = ((r.get("productOptionUpdate") or {}).get("userErrors")) or []
        if e:
            fehler += 1
            print(f"  ⚠️  {e[0]['message'][:90]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tFarbe[{vorher}] → Grösse[{nachher}]\t{p['title']}\n")
        f.flush()
        time.sleep(0.5)
    if f:
        f.close()
    print(f"FERTIG: {n} Produkte umgestellt, {fehler} Fehler")


if __name__ == "__main__":
    main()
