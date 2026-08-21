"""Übersetzt englische Farbwerte in der Varianten-Auswahl ins Deutsche.

DER BEFUND: In der Farbauswahl auf der Produktseite stehen bei einem Teil des Sortiments
englische Werte — «Dark Gray», «Sapphire Blue», «Coffee». Der Importer hat für genau das eine
Übersetzungstabelle (`DECOLOR` in cj_category_fill.mjs), aber ein Teil der Ware kam über andere
Wege herein und blieb unübersetzt. Beim Testprodukt «Baseball-Cap Washed» war die komplette
Farbliste englisch.

Der Auswahlknopf ist das Letzte, was jemand vor dem Kauf anklickt. Dort Englisch zu lesen,
wirkt in einem Schweizer Shop wie ein halb fertiger Import — und genau das ist es auch.

⚠️ WAS NICHT ANGEFASST WIRD:
 • Grösse-Farbe-Kombinationen («L-Black», «Black-1XL», «M-White»). Dort ist nicht die Sprache
   das Problem, sondern die Struktur: Grösse und Farbe stecken in EINEM Feld. Das gehört
   aufgetrennt, nicht übersetzt — ein anderer, grösserer Eingriff.
 • Werte, die schon deutsch sind.
 • Alles, was nicht eindeutig in der Tabelle steht. Von 27'827 verschiedenen Werten sind die
   allermeisten Einzelfälle wie «Lotus Root Color» — dort zu raten, brächte Unsinn ins Regal.

DRY=1 meldet nur.
"""
import json, os, subprocess, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_farbwerte_de.txt"

# ⚠️ Diese Tabelle lag bis 21.08.2026 VIERMAL im Repo (hier 78 Eintraege, in
# cj_variant_backfill.mjs nur 27 — der kannte «dark gray» nicht und haengte «Dark Gray»
# in den Farbwaehler von 51 Produkten, die der Importer sauber deutsch angelegt hatte).
# Node UND Python lesen jetzt dieselbe Datei. Neue Farben NUR in farben_de.json.
FARBE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "farben_de.json"), encoding="utf-8"))


def gql(q, v=None):
    with open("/tmp/_fw.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_fw.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def main():
    kandidaten, statistik = [], Counter()
    for zeile in open(EXPORT, encoding="utf-8"):
        try:
            p = json.loads(zeile)
        except Exception:
            continue
        if not str(p.get("id", "")).startswith("gid://shopify/Product/"):
            continue
        # ⚠️ Fehlt `status`, wird NICHT gefiltert. Neuere Exporte fuehren das Feld nicht mehr
        # mit; ein `p["status"]` warf dort einen KeyError und der Lauf brach in Zeile 1 ab.
        # Ein DRAFT mitzuuebersetzen schadet nichts — ein Abbruch schon.
        if p.get("status") not in (None, "ACTIVE"):
            continue
        for o in (p.get("options") or []):
            if (o.get("name") or "").strip().lower() not in ("farbe", "color", "colour"):
                continue
            # Beide Export-Formen: alte Liste aus Zeichenketten ODER neue aus {name:…}.
            werte = [(v.get("name") if isinstance(v, dict) else v) or ""
                     for v in (o.get("optionValues") or o.get("values") or [])]
            treffer = [v for v in werte
                       if v.strip().lower() in FARBE and FARBE[v.strip().lower()] != v.strip()]
            if treffer:
                kandidaten.append((p["id"], p["title"]))
                for v in treffer:
                    statistik[v.strip()] += 1
            break

    print(f"Produkte mit englischen Farbwerten: {len(kandidaten)} | "
          f"zu übersetzende Werte: {sum(statistik.values())}", flush=True)
    for k, v in statistik.most_common(12):
        print(f"   {v:>4}  {k} → {FARBE[k.lower()]}", flush=True)
    if DRY or not kandidaten:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = fehler = 0
    for gid, titel in kandidaten:
        if gid in done:
            continue
        d = gql('query($id:ID!){node(id:$id){... on Product{options{id name '
                'optionValues{id name}}}}}', {"id": gid})
        opts = ((d.get("data") or {}).get("node") or {}).get("options") or []
        opt = next((o for o in opts
                    if (o.get("name") or "").strip().lower() in ("farbe", "color", "colour")), None)
        if not opt:
            continue
        upd = [{"id": v["id"], "name": FARBE[v["name"].strip().lower()]}
               for v in opt["optionValues"]
               if v["name"].strip().lower() in FARBE
               and FARBE[v["name"].strip().lower()] != v["name"].strip()]
        if not upd:
            f.write(f"{gid}\tnichts-zu-tun\n")
            continue
        r = gql('mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){'
                'productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u)'
                '{userErrors{message}}}', {"p": gid, "o": {"id": opt["id"]}, "u": upd})
        e = ((r.get("data") or {}).get("productOptionUpdate") or {}).get("userErrors")
        if e:
            fehler += 1
            print(f"  ⚠️ {titel[:36]}: {e[0]['message'][:70]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{len(upd)}\t{titel}\n")
        if n % 100 == 0:
            f.flush()
            print(f"  … {n}/{len(kandidaten)}", flush=True)
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte übersetzt, {fehler} Fehler")


if __name__ == "__main__":
    main()
