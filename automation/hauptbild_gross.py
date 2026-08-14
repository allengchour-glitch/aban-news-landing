"""Holt ein grosses Bild nach vorn, wo das Hauptbild unter Googles Mindestmass liegt.

DER BEFUND (Merchant-Diagnose des Betreibers, 14.08.2026): «Image too small — update your
image to be at least 500x500 pixels», 487 Produkte. Über einen Bulk-Export aller aktiven
Produkte nachgezählt sind es sogar 887, deren HAUPTBILD kleiner als 500×500 ist. 411 davon
haben in derselben Galerie ein grosses Bild liegen — dort genügt Umsortieren, es muss nichts
beschafft werden. Bei 476 ist jedes Bild zu klein; die tragen künftig den Tag
`bild-zu-klein` und sind damit die Arbeitsliste für den Lieferanten-Nachlauf.

Das ist dieselbe Ursache wie bei den Miniatur-Hauptbildern vom 14.08.: CJs `productImageSet`
kommt in der Reihenfolge des Lieferanten, und deren erster Eintrag ist manchmal ein
Vorschaubild. `cj_category_fill.mjs` sortiert seit dem 14.08. beim Anlegen um — dieser Lauf
räumt den Altbestand nach.

⚠️ KNAPP DANEBEN IST AUCH ZU KLEIN. «513×498» sieht aus wie ein Rundungsfehler, fällt aber
durch dieselbe Prüfung wie 209×666. Beide Kanten müssen ≥ 500 sein.

⚠️ NUR MEDIEN IM STATUS READY. Ein FAILED-Medium nach vorn zu sortieren tauscht ein kleines
Bild gegen gar keines.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUELLE = os.environ.get("QUELLE", "/tmp/imgs.jsonl")
LEDGER = "dropship/_hauptbild_gross.txt"


def gql(q, v=None):
    with open("/tmp/_hg.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hg.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
    return {}


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    prod, med = {}, {}
    for l in open(QUELLE):
        d = json.loads(l)
        if "__parentId" in d:
            med.setdefault(d["__parentId"], []).append(d)
        else:
            prod[d["id"]] = d

    tausch, ohne = [], []
    for pid, p in prod.items():
        if pid in erledigt:
            continue
        fm = p.get("featuredMedia") or {}
        im = (fm.get("image") or {}) if fm else {}
        w, h = im.get("width") or 0, im.get("height") or 0
        if not (w or h) or (w >= 500 and h >= 500):
            continue
        gross = [m for m in med.get(pid, [])
                 if m.get("mediaContentType") == "IMAGE" and m.get("status") == "READY"
                 and (m.get("image") or {}).get("width", 0) >= 500
                 and (m.get("image") or {}).get("height", 0) >= 500]
        if gross:
            # Das grösste nehmen, nicht das erstbeste — bei Google zählt die Bildqualität.
            gross.sort(key=lambda m: m["image"]["width"] * m["image"]["height"], reverse=True)
            tausch.append((pid, p.get("title", "")[:44], gross[0]["id"],
                           f'{w}x{h} → {gross[0]["image"]["width"]}x{gross[0]["image"]["height"]}'))
        else:
            ohne.append((pid, p.get("title", "")[:44]))
    print(f"Hauptbild unter 500×500: {len(tausch)+len(ohne)} — {len(tausch)} durch Umsortieren "
          f"heilbar, {len(ohne)} ohne grosses Bild", flush=True)
    if DRY:
        for pid, t, _, masse in tausch[:8]:
            print(f"   {t:<46} {masse}")
        return

    f = open(LEDGER, "a")
    getan = 0
    for pid, t, mid, masse in tausch:
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){'
                'userErrors{message}}}', {"id": pid, "m": [{"id": mid, "newPosition": "0"}]})
        fehler = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {t}: {fehler[0]['message'][:60]}", flush=True)
            continue
        getan += 1
        f.write(f"{pid}\tumsortiert\t{masse}\t{t}\n")
        f.flush()
        if getan % 50 == 0:
            print(f"   {getan}/{len(tausch)}", flush=True)
        time.sleep(0.25)
    # Die ohne grosses Bild bekommen den Tag, damit der Lieferanten-Nachlauf sie findet.
    markiert = 0
    for i in range(0, len(ohne), 1):
        pid, t = ohne[i]
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": pid, "t": ["bild-zu-klein"]})
        if not ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            markiert += 1
            f.write(f"{pid}\tkein-grosses-bild\t-\t{t}\n")
        if markiert % 100 == 0 and markiert:
            print(f"   markiert {markiert}/{len(ohne)}", flush=True)
        time.sleep(0.2)
    f.flush()
    print(f"FERTIG: {getan} Hauptbilder getauscht, {markiert} als «bild-zu-klein» markiert.")


if __name__ == "__main__":
    main()
