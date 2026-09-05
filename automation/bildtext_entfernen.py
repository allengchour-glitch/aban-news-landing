"""Nimmt die Bilder mit eingebranntem Werbetext wieder weg, die der Backfill heute angehängt hat.

Der erste Lauf von `cj_bild_backfill.mjs` hatte keine Textprüfung. Ein Kontaktbogen über 24
seiner Ergänzungen zeigte bei NEUN englischen Werbetext im Bild — «Deepened pot body design ·
Saves oil and prevents splashing», «Dog Grinding Teeth», «Shock-absorbing knee pads for safe
running», «PURSUE THE SPIRIT OF FREEDOM». Rund ein Drittel also. Google verbietet Werbetext im
Produktbild; und englischer Marketingtext in einem Schweizer Shop sagt der Kundin, wo die Ware
herkommt.

⚠️ ENTFERNT WIRD NUR, WAS DIESER LAUF SELBST ANGELEGT HAT. Das Ledger nennt je Produkt, wie
viele Bilder hinzugekommen sind; angefasst werden ausschliesslich die LETZTEN N Medien. Das
ursprüngliche Hauptbild bleibt unter allen Umständen stehen — auch dann, wenn es selbst Text
trägt. Es ist das einzige Bild, das dieses Produkt je hatte, und ein Produkt ohne Bild ist im
Shop wertlos; das gehört in einen eigenen Lauf mit eigener Ersatzquelle, nicht hierhin.

⚠️ Und es wird NUR entfernt, was die Prüfung wirklich GELESEN hat. Ein Bild, das nicht geladen
werden konnte, bleibt — «keine Antwort» ist nicht «hat Text». Diese Verwechslung hat den
Backfill heute schon einmal 548 Produkte fälschlich abhaken lassen.

DRY=1 meldet nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bildtext_pruefen import von_url, WORTGRENZE

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUELLE = "dropship/_cj_bild_backfill.txt"
LEDGER = "dropship/_bildtext_entfernt.txt"


def gql(q, v=None):
    with open("/tmp/_be.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_be.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(5)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    aufgaben = []
    for zeile in open(QUELLE):
        teile = zeile.rstrip("\n").split("\t")
        if len(teile) < 2 or not teile[1].startswith("+"):
            continue
        if teile[0] in erledigt:
            continue
        aufgaben.append((teile[0], int(teile[1][1:])))
    print(f"Produkte mit ergänzten Bildern: {len(aufgaben)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    entfernt = geprueft = unlesbar = 0
    for gid, anzahl in aufgaben:
        d = gql('query($id:ID!){product(id:$id){title media(first:20){nodes{id '
                '... on MediaImage{image{url}}}}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        medien = [m for m in p["media"]["nodes"] if m.get("image")]
        # Die zuletzt angelegten stehen hinten. Nur die eigenen Ergänzungen betrachten.
        eigene = medien[-anzahl:] if anzahl < len(medien) else medien[1:]
        raus = []
        for m in eigene:
            w = von_url(m["image"]["url"])
            geprueft += 1
            if w == -1:
                unlesbar += 1
                continue
            if w >= WORTGRENZE:
                raus.append(m["id"])
        if not raus:
            if f:
                f.write(f"{gid}\tsauber\t0\n")
                f.flush()
            continue
        print(f"   {p['title'][:44]:<46} {len(raus)} von {len(eigene)} mit Werbetext",
              flush=True)
        if DRY:
            entfernt += len(raus)
            continue
        r = gql('mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id,mediaIds:$m)'
                '{mediaUserErrors{message}}}', {"id": gid, "m": raus})
        fehler = ((r.get("data") or {}).get("productDeleteMedia") or {}).get("mediaUserErrors")
        if fehler:
            print(f"  ⚠️ {fehler[0]['message'][:60]}", flush=True)
            continue
        entfernt += len(raus)
        f.write(f"{gid}\tentfernt\t{len(raus)}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {entfernt} Bilder mit Werbetext entfernt "
          f"({geprueft} geprüft, {unlesbar} nicht lesbar und deshalb belassen)")


if __name__ == "__main__":
    main()
