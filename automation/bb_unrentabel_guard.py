#!/usr/bin/env python3
"""Setzt aktive BigBuy-Artikel mit Tag `bb-versand-unrentabel` zurück auf DRAFT.

WARUM DIESER WÄCHTER EXISTIERT (20.08.2026)
BigBuy liefert in die Schweiz nur über SEUR ab rund EUR 27.94 Fracht (CLAUDE.md, Order
#1004 war deshalb ein Verlust). Ein Artikel für CHF 12.90 kostet den Shop bei jedem
Verkauf also etwa CHF 20 MEHR Fracht, als er überhaupt einbringt. Der Bereinigungslauf
vom 10.07. hat darum rund 2'100 solcher Artikel gedraftet.

Zwei davon standen am 20.08. wieder ACTIVE im Shop und im Google-Kanal:
  15433456648577  Fitnessreifen O-Waist InnovaGoods   CHF 12.90  (81 Stück lagernd)
  15431539655041  Bombata Laptoptasche 13-15"         CHF 18.90
Beide waren im Ledger `dropship/_bb_cleanup_done.txt` als ERLEDIGT vermerkt (Zeilen 4867
und 4955) — und wurden danach von spaeteren Kanal-Laeufen wieder hochgezogen
(`_google_kanal_nachziehen.txt:570`, `_gfeed_restore.txt:18548`).

**Das ist die Lehre, die in diesem Repo schon dreimal Geld gekostet hat: ein Einmal-Lauf
gegen einen Export plus Erledigt-Ledger ist KEIN Schutz.** Wer nach dem Lauf publiziert,
weiss von der Entscheidung nichts, und das Ledger sagt bis in alle Ewigkeit «erledigt».
Der Schutz muss gegen den LIVE-Stand laufen und darf sich auf kein Ledger stuetzen.

Dieser Waechter fragt deshalb bei jedem Lauf den Shop selbst: Gibt es JETZT ein aktives
Produkt mit diesem Tag? Wenn ja, wird es gedraftet — egal wie oft es schon gedraftet war.

NICHT LOESCHEN: Ab einem Verkaufspreis von rund CHF 45 traegt sich die SEUR-Fracht wieder.
Die Ware bleibt als Entwurf erhalten und ist jederzeit wieder freischaltbar.
"""
import json, os, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
GOOGLE = "gid://shopify/Publication/302872297857"
TMP = "/tmp/_bbug.json"


def gql(q, v=None):
    with open(TMP, "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@" + TMP], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
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


Q = """query($c:String){ products(first:100,after:$c,query:"status:active tag:bb-versand-unrentabel"){
  pageInfo{hasNextPage endCursor}
  nodes{ id title variants(first:1){nodes{price}} } } }"""
UNPUB = ("mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,input:$i)"
         "{userErrors{field message}}}")
DRAFT = ("mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT})"
         "{product{id status}userErrors{field message}}}")


def main():
    treffer, cursor = [], None
    while True:
        d = gql(Q, {"c": cursor})
        p = d.get("data", {}).get("products")
        if not p:
            print("PAUSE Shopify antwortet nicht — nichts geaendert.")
            return 0
        treffer += p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            break
        cursor = p["pageInfo"]["endCursor"]
        time.sleep(0.5)

    if not treffer:
        print("FERTIG: 0 aktive bb-versand-unrentabel-Artikel — Schutz haelt.")
        return 0

    for n in treffer:
        preis = (n["variants"]["nodes"] or [{}])[0].get("price", "?")
        # Erst aus dem Google-Kanal nehmen, dann draften. DRAFT allein entfernt das Produkt
        # zwar aus allen Kanaelen, aber der Kanal-Eintrag bliebe bestehen und ein spaeterer
        # Publizierer koennte darauf aufbauen.
        gql(UNPUB, {"id": n["id"], "i": [{"publicationId": GOOGLE}]})
        time.sleep(0.6)
        r = gql(DRAFT, {"id": n["id"]})
        time.sleep(0.6)
        err = r.get("data", {}).get("productUpdate", {}).get("userErrors") or []
        status = "FEHLER " + json.dumps(err) if err else "→ DRAFT"
        print(f"  {n['id']} CHF {preis}  {n['title'][:60]}  {status}")
    print(f"FERTIG: {len(treffer)} Artikel gedraftet (BigBuy-CH-Fracht ~EUR 27.94).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
