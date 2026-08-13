"""Schreibt die Stückzahl in den Titel, wo ein Bündel wie ein Einzelstück aussieht.

DIE HAUSREGEL (Betreiber, 26.07.2026): «Multipack-/Set-Produkte MÜSSEN die Stückzahl im Titel
tragen — sonst fragen Leute, warum ein Ballon so teuer ist.» Damals wurde sie für 15
Luftballon-Produkte umgesetzt. Die Nachkontrolle der Startseiten-Reihe zeigt, dass sie
weiterhin gebrochen wird:

    «Seife Schraubenschlüssel»          CHF 19.90 — «Verkauf in Bündeln zu 4 Stück»
    «Umhängetasche transparent rosa»    CHF 22.00 — «Verkauf in Bündeln zu 4 Stück»
    «Windlicht aus Glas»                CHF 22.50 — «Lieferumfang: 3 Stück»
    «Badeset in Werkzeugtasche»         CHF 31.90 — «Verkauf in Bündeln zu 2 Stück»

Auf einer Produktkarte steht nur Titel und Preis. Wer «Seife Schraubenschlüssel · CHF 19.90»
liest, rechnet mit EINER Seife und findet den Preis unverschämt — dabei sind es vier, und
das Angebot ist gut. Die Zahl im Titel dreht denselben Preis von abschreckend auf attraktiv.

⚠️ «Lieferumfang: 1 Stück» ist die häufigste Angabe im Katalog und bedeutet das Gegenteil —
ein Einzelstück. Nur Mengen ab 2 zählen. Und der Titel darf die Zahl nicht schon tragen:
«Luftballons · 100 Stück» ist fertig, «3er-Set Handtücher» ebenfalls.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_multipack_titel.txt"

# ⚠️ NUR «Stück», NICHT «Nx». Der Probelauf fand «Superhelle Laser-Taschenlampe —
# Lieferumfang: 2x 26650» und hätte daraus «Taschenlampe · 2 Stück» gemacht. Die 2x sind
# die beigelegten AKKUS. Bei «Nx» folgt fast immer das Zubehör, bei «N Stück» das Produkt;
# der Unterschied kostet hier eine falsche Mengenangabe im Titel, und eine falsche Menge ist
# schlimmer als gar keine.
MENGE = re.compile(r'(?:Verkauf\s+in\s+B[üu]ndeln\s+zu|Lieferumfang\s*:?|Beutel\s+à|Set\s+à|'
                   r'Packung\s+(?:mit|à)|Inhalt\s*:?)\s*(\d{1,4})\s*(?:St[üu]ck|Stk)\b', re.I)
# Trägt der Titel die Menge schon, ist nichts zu tun.
SCHON_DA = re.compile(r'·\s*\d+\s*St|\d+\s*St[üu]ck|\d+[- ]?teilig|\d+er[- ]?(?:Set|Pack|Packung)|'
                      r'\bSet\s+à\s*\d+|\(\s*\d+\s*(?:St|x)\b', re.I)
# ⚠️ «Ballonhose», «Ballonärmel» und «Weinglas» sind Fashion- und Glaswörter, keine Mengen —
# an genau dieser Verwechslung hing der Lauf vom 26.07. Hier wird ohnehin nur der
# Beschreibungstext ausgewertet, aber die Zahl muss plausibel sein.
def plausibel(n):
    return 2 <= n <= 500


def gql(q, v=None):
    with open("/tmp/_mp2.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mp2.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        t = p["title"]
        if SCHON_DA.search(t):
            continue
        html = re.sub(r'<[^>]+>', ' ', p.get("descriptionHtml") or "")
        m = MENGE.search(html)
        if not m:
            continue
        n = int(m.group(1))
        if not plausibel(n):
            continue
        neu = f"{t} · {n} Stück"
        if len(neu) > 255:
            continue
        aufgaben.append((p["id"], t, neu, n,
                         float(p["priceRangeV2"]["minVariantPrice"]["amount"])))

    print(f"Bündel ohne Stückzahl im Titel: {len(aufgaben)}", flush=True)
    for _, t, neu, n, preis in sorted(aufgaben, key=lambda x: -x[3])[:16 if DRY else 6]:
        print(f"   CHF {preis:>6.2f}  {t[:44]:<46} → «… · {n} Stück»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    z = 0
    for gid, t, neu, n, _ in aufgaben:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "title": neu}})
        if ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
            continue
        z += 1
        f.write(f"{gid}\t{n}\t{neu}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {z} Titel mit Stückzahl versehen")


if __name__ == "__main__":
    main()
