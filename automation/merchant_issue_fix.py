"""Arbeitet die Google-Merchant-Problemliste ab (Export aus dem Merchant Center).

WARUM DAS ZUERST KOMMT: Richtlinienverstösse (Drogen, Erwachseneninhalte, personalisierte
Werbung zu persönlichen Notlagen) gefährden das GANZE Merchant-Konto, nicht nur den einzelnen
Artikel. Sie sind wenige und schnell behoben — anders als die 6'012 «Over capacity»-Meldungen,
die ein Kontingentproblem sind und nicht am Produkt liegen.

Betroffene Produkte werden aus dem Google-&-YouTube-Kanal genommen (publishableUnpublish) und
getaggt — NICHT gelöscht und NICHT aus dem Onlineshop entfernt. Im eigenen Shop dürfen ein
CBD-Gesichtspflegeset, ein Umstandskleid und eine Yoga-Shorts selbstverständlich verkauft werden;
sie dürfen nur nicht über Google beworben werden.

⚠️ «Over capacity» wird hier bewusst NICHT behandelt: Das ist kein Produktfehler, sondern das
CSS-Kontingent des Kontos. Dagegen hilft nur eine Feed-Regel im Merchant Center oder weniger
Artikel im Anzeigenziel — beides Sache des Kontoinhabers.

DRY=1 meldet nur.
"""
import csv, json, os, re, subprocess, sys, time, collections

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
GOOGLE_PUB = "302872297857"
LEDGER = "dropship/_merchant_issue_done.txt"

# Verstoss -> Tag. Nur diese Kategorien werden aus dem Google-Kanal genommen.
RICHTLINIE = {
    "Illegal drugs": "google-gesperrt-cbd",
    "Restricted adult content": "google-gesperrt-adult",
    "Personalized advertising: Sexual interests": "google-gesperrt-adult",
    "Personalized advertising: personal hardships": "google-gesperrt-notlage",
}


def gql(q, v=None):
    payload = json.dumps({"query": q, "variables": v or {}})
    with open("/tmp/_mi.json", "w") as f:
        f.write(payload)
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mi.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def lade(pfad):
    """Merchant-Exporte haben teils Vorspann-Zeilen vor der Kopfzeile."""
    lines = open(pfad, encoding="utf-8-sig").readlines()
    start = 0
    for i, l in enumerate(lines[:10]):
        if l.startswith("Item ID,") or l.startswith("Product,"):
            start = i
            break
    return list(csv.DictReader(lines[start:]))


def main(pfad):
    rows = lade(pfad)
    treffer = collections.defaultdict(set)   # tag -> {produkt-id}
    titel = {}
    for x in rows:
        tag = RICHTLINIE.get(x.get("Issue title"))
        if not tag:
            continue
        m = re.match(r'shopify_\w+_(\d+)_', x.get("Item ID") or "")
        if not m:
            continue
        treffer[tag].add(m.group(1))
        titel[m.group(1)] = (x.get("Title") or "")[:60]

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    gesamt = sum(len(v) for v in treffer.values())
    print(f"Richtlinien-Verstösse: {gesamt} Produkte | schon erledigt {len(done)} | DRY={DRY}", flush=True)

    for tag, pids in treffer.items():
        for pid in sorted(pids):
            if pid in done:
                continue
            gid = f"gid://shopify/Product/{pid}"
            print(f"  [{tag}] {titel.get(pid, pid)[:52]}", flush=True)
            if DRY:
                continue
            r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p)'
                    '{userErrors{message}}}',
                    {"id": gid, "p": [{"publicationId": "gid://shopify/Publication/" + GOOGLE_PUB}]})
            e = ((r.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors") or []
            if e:
                print(f"     ⚠️ {e[:1]}", flush=True)
                continue
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [tag]})
            f.write(f"{pid}\t{tag}\t{titel.get(pid,'')}\n"); f.flush()
            time.sleep(0.3)

    # Übrige Meldungen nur berichten — sie brauchen andere Werkzeuge
    rest = collections.Counter(x.get("Issue title") for x in rows
                               if x.get("Issue title") not in RICHTLINIE)
    print("\nNicht hier behandelt (anderes Werkzeug bzw. Kontingent):", flush=True)
    for k, v in rest.most_common():
        print(f"  {v:>6}  {k}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
