"""Stellt qualifizierte Produkte im Google-Kanal wieder her.

WAS SCHIEFLIEF (ehrlich, 2026-08-09/10): `gfeed_apply.py` hat den Google-Kanal auf die
besten 5'000 Produkte zusammengestrichen. Der Gedanke war richtig — schwache Artikel raus,
damit Merchant den Feed nicht als Ganzes ablehnt. Die Umsetzung war es nicht: die Grenze
KEEP=5000 war willkürlich. Von den rund 18'200 Produkten, die alle Qualitätshürden bestanden
hatten, flogen ~13'200 allein deshalb raus, weil sie auf Rang 5'001+ standen.

Bei bezahlten Anzeigen wäre eine enge Auswahl vertretbar. Der Google-Kanal speist aber auch
die **kostenlosen Einträge** — dort kostet ein zusätzliches Produkt nichts und bringt nur
Reichweite. Genau diese Reichweite ist laut Projekt-Memory der wichtigste Gratis-Hebel. Der
Einbruch von 152'820 auf 72'956 Merchant-Artikeln ist die Folge.

WAS DIESES SKRIPT TUT: es publiziert ausschliesslich die Produkte zurück, die im Scoring
eine positive Bewertung hatten (`score > 0`) — also 3+ Bilder, Preis >= 15, saubere Titel,
Lieferanten-SKU, kein Kostüm-/Erotik-/Refurb-Sortiment. Die 8'410 Artikel mit harter
Disqualifikation (`score == -1`) bleiben draussen; sie würden von Google ohnehin abgelehnt
und ziehen im Zweifel das ganze Konto mit.

Vor dem Publizieren wird der aktuelle Status geprüft: Produkte, die inzwischen DRAFT sind
(Duplikate, ausverkauft, Richtlinienverstoss), werden übersprungen — sonst holt dieses
Skript genau die Ware zurück, die andere Reiniger bewusst entfernt haben.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
GOOG = "gid://shopify/Publication/302872297857"
SCORES = os.environ.get("SCORES", "/tmp/gfeed_scores.json")
LEDGER = "dropship/_gfeed_restore.txt"


def gql(q, v=None):
    with open("/tmp/_gr.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gr.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def main():
    rows = json.load(open(SCORES))
    qualifiziert = [r[0] for r in rows if r[1] > 0]
    print(f"bewertet {len(rows)} | qualifiziert {len(qualifiziert)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [g for g in qualifiziert if g not in done]
    print(f"noch zu prüfen: {len(offen)}", flush=True)

    f = open(LEDGER, "a")
    zurueck = schon_drin = uebersprungen = 0
    for i in range(0, len(offen), 100):
        teil = offen[i:i + 100]
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status '
                'g:publishedOnPublication(publicationId:"%s")}}}' % GOOG, {"ids": teil})
        for n in (d.get("data") or {}).get("nodes") or []:
            if not n:
                continue
            if n["status"] != "ACTIVE":
                # Ein anderer Reiniger hat das Produkt bewusst aus dem Verkauf genommen.
                uebersprungen += 1
                f.write(f"{n['id']}\tuebersprungen-{n['status'].lower()}\n")
                continue
            if n["g"]:
                schon_drin += 1
                f.write(f"{n['id']}\tschon-im-kanal\n")
                continue
            if DRY:
                zurueck += 1
                continue
            r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,'
                    'input:$p){userErrors{message}}}',
                    {"id": n["id"], "p": [{"publicationId": GOOG}]})
            errs = ((r.get("data") or {}).get("publishablePublish") or {}).get("userErrors")
            if errs:
                print(f"  ⚠️ {n['id']}: {errs[0].get('message')}", flush=True)
                continue
            zurueck += 1
            f.write(f"{n['id']}\tzurueck-im-google-kanal\n")
            time.sleep(0.12)
        f.flush()
        print(f"  … {i + len(teil)}/{len(offen)} | zurück {zurueck} | "
              f"schon drin {schon_drin} | übersprungen {uebersprungen}", flush=True)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {zurueck} zurück im Google-Kanal, "
          f"{schon_drin} waren schon drin, {uebersprungen} bewusst draussen gelassen")


if __name__ == "__main__":
    main()
