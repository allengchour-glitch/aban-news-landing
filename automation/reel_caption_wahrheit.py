"""Entfernt falsche Lieferversprechen aus den Social-Media-Captions.

GEFUNDEN (2026-08-10): Von 30 fertigen Reels in `automation/reels_seed.csv` versprachen 21
«Blitzversand aus der Schweiz». Für **13 davon liess sich nachweisen**, dass das beworbene
Produkt eine CJ-Nummer trägt und weder den Tag `ch-lager` noch eine Fortura-SKU hat — die Ware
kommt also aus China und ist 8–16 Tage unterwegs. Diese Reels standen auf `ready`; sie wären
beim nächsten Post-Lauf genau so veröffentlicht worden.

Ein falsches Lieferversprechen in der Werbung ist teurer als ein schwächeres Argument: Es zieht
Käufe an, die dann in Enttäuschung und Rückerstattung enden — dieselbe Mechanik, die den
Auszahlungssaldo ins Minus gedrückt hat.

Ersetzt wird nur bei Produkten OHNE nachgewiesenes Schweizer Lager, und zwar durch eine Aussage,
die stimmt: der Shop ist schweizerisch, liefert in die ganze Schweiz und bietet Rechnungskauf.
Fortura-Ware (`ch-lager`) behält ihr Versprechen — dort ist es berechtigt.

DRY=1 meldet nur.
"""
import csv, json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
CSV = os.environ.get("REELS", "automation/reels_seed.csv")
FALSCH = re.compile(r'Blitzversand aus der Schweiz|Blitzversand in die ganze Schweiz|'
                    r'Schnell aus der Schweiz|Blitzversand', re.I)
ERSATZ = "Schweizer Online-Shop · Kauf auf Rechnung mit Klarna & TWINT"


def gql(q, v=None):
    with open("/tmp/_rw.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(3):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_rw.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(2)
    return {}


def aus_schweizer_lager(titel):
    """True nur bei BELEG. Ohne Beleg gilt das Versprechen als nicht haltbar — bei einer
    öffentlichen Werbeaussage ist Beweislast beim Versprechen, nicht beim Zweifel."""
    d = gql('query($q:String!){products(first:1,query:$q){nodes{title tags '
            'variants(first:1){nodes{sku}}}}}', {"q": 'title:"%s"' % titel.replace('"', '')})
    ns = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    if not ns:
        return False
    p = ns[0]
    sku = ((p["variants"]["nodes"][0]["sku"] if p["variants"]["nodes"] else "") or "").lower()
    return ("ch-lager" in p["tags"]) or sku.startswith("fortura-")


def main():
    rows = list(csv.DictReader(open(CSV)))
    feld = list(rows[0].keys())
    geaendert = behalten = 0
    for r in rows:
        if r.get("status") != "ready":
            continue
        cap = r.get("caption") or ""
        if not FALSCH.search(cap):
            continue
        m = re.search(r'«([^»]{4,70})»', cap)
        if m and aus_schweizer_lager(m.group(1)):
            behalten += 1
            print(f"  ✅ belegt, bleibt: «{m.group(1)[:44]}»", flush=True)
            continue
        neu = FALSCH.sub(ERSATZ, cap)
        neu = re.sub(r'(?:\s*·\s*){2,}', ' · ', neu).strip()
        if neu == cap:
            continue
        geaendert += 1
        print(f"  ✏️  {cap[:70]}\n      → {neu[:70]}", flush=True)
        if not DRY:
            r["caption"] = neu
    if not DRY and geaendert:
        with open(CSV, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=feld)
            w.writeheader()
            w.writerows(rows)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {geaendert} Captions berichtigt, "
          f"{behalten} behalten (Schweizer Lager belegt)")


if __name__ == "__main__":
    main()
