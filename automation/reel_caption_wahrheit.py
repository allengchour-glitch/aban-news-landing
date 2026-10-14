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
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from queue_csv import lesen, schnappschuss, schreiben  # noqa: E402  gemeinsame Queue-Sperre (14.10.2026)

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
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
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
    # ⚠️ 17.09.2026: Hier stand `return {}`. Gemessen an zwei Aufrufern in dieser
    # Klasse, was das anrichtet: `kollektion_leer.py` macht
    # `gql(...).get("collections")` → None → `if not d: break`, und
    # `tote_rabattcodes.py` bricht bei `hasNextPage` ab. Beide melden dann ein
    # ordentliches Ergebnis über NULL Datensätze, obwohl Shopify nur gedrosselt hat.
    # Eine Null, die wie eine Messung aussieht, ist der teuerste Befund dieses
    # Projekts (95 Klingen blieben im Verkauf, weil ein Wächter «0» meldete).
    # Darum: laut scheitern. Ein Traceback im Log ist ein Befund, eine falsche Null nicht.
    raise RuntimeError(
        "Shopify hat auf keinen Versuch mit Daten geantwortet. FRÜHER gab diese"
        " Funktion hier ein leeres Ergebnis zurück und der Aufrufer meldete «0» —"
        " das ist keine Messung, sondern ein Ausfall.")


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
    # 14.10.2026: Zwischen Lesen und Schreiben liegen Minuten (eine Shopify-Abfrage je Caption). Früher schrieb diese
    # Funktion danach die GANZE Datei aus der alten Kopie zurück — Reels, die der Motor derweil angehängt, und Status, die
    # Poster derweil gesetzt hatten, waren weg (Lost Update, 8 Reels verloren). Jetzt: Basis merken, am Ende nur die
    # eigenen Caption-Änderungen über queue_csv.schreiben() in den FRISCHEN Stand setzen (gemeinsame Sperre, atomar).
    zeilen = lesen(CSV)
    basis = schnappschuss(zeilen)
    feld = zeilen[0]
    ci = feld.index("caption")
    geaendert = behalten = 0
    for z in zeilen[1:]:
        r = dict(zip(feld, z))
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
            z[ci] = neu
    if not DRY and geaendert:
        schreiben(CSV, basis, zeilen)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {geaendert} Captions berichtigt, "
          f"{behalten} behalten (Schweizer Lager belegt)")


if __name__ == "__main__":
    main()
