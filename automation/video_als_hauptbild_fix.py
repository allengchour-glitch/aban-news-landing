"""Setzt bei Produkten, deren Hauptmedium ein VIDEO ist, wieder ein Bild an die erste Stelle.

GEFUNDEN IM KATALOG-AUDIT (2026-08-10): 22 aktive Produkte hatten `featuredMedia` = Video.
Sie sahen im Export aus wie «ohne Bild», hatten in Wahrheit aber 6–21 Bilder. Der CJ-Importer
hängt nach den Bildern das CJ-Produktvideo an; landet dieses auf Position 1, hat das drei
sichtbare Folgen:

 - Kollektions- und Suchkacheln zeigen kein Produktbild,
 - Google Merchant bekommt kein `image_link` und lehnt das Angebot ab,
 - das Karten-Karussell startet mit einem Video statt mit dem Produkt.

Das Video bleibt erhalten — es wandert nur hinter die Bilder. Für die Produktseite ist das
ohnehin die bessere Reihenfolge: erst sehen, was man kauft, dann das Video.

Repariert wird ausschliesslich, wenn mindestens ein Bild den Status READY hat. Ein Bild in
Bearbeitung nach vorne zu ziehen würde die Lücke nur verschieben.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_video_hauptbild_fix.txt"


def gql(q, v=None):
    with open("/tmp/_vh.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vh.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    cur, betroffen, geprueft = None, [], 0
    while True:
        d = gql('''query($c:String){products(first:100,after:$c,query:"status:ACTIVE"){
          pageInfo{hasNextPage endCursor}
          nodes{id title featuredMedia{id mediaContentType}
                media(first:25){nodes{id mediaContentType
                  ... on MediaImage{status}}}}}}''', {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            break
        for p in pg["nodes"]:
            geprueft += 1
            fm = p.get("featuredMedia") or {}
            if fm.get("mediaContentType") == "IMAGE":
                continue
            bilder = [m for m in p["media"]["nodes"]
                      if m["mediaContentType"] == "IMAGE" and m.get("status") == "READY"]
            if not bilder:
                continue
            betroffen.append((p["id"], p["title"], bilder[0]["id"], fm.get("mediaContentType")))
        if geprueft % 5000 < 100:
            print(f"  … {geprueft} geprüft | betroffen {len(betroffen)}", flush=True)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    print(f"{geprueft} aktive Produkte geprüft | Hauptmedium kein Bild: {len(betroffen)}",
          flush=True)
    f = open(LEDGER, "a")
    ok = 0
    for gid, titel, bild_id, typ in betroffen:
        print(f"  🖼️ {typ} → Bild nach vorn: {titel[:56]}", flush=True)
        if DRY:
            continue
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m)'
                '{userErrors{message}}}',
                {"id": gid, "m": [{"id": bild_id, "newPosition": "0"}]})
        errs = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
        if errs:
            print(f"     ⚠️ {errs[0].get('message')}", flush=True)
            continue
        ok += 1
        f.write(f"{gid}\tbild-nach-vorn\t{titel}\n"); f.flush()
        time.sleep(0.3)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {ok} Produkte haben wieder ein Hauptbild")


if __name__ == "__main__":
    main()
