"""Holt ein sauberes Bild nach vorn, wenn das Hauptbild Werbetext trägt.

DER BEFUND: Eine Stichprobe über 200 Hauptbilder im Google-Kanal — das ist genau das Bild, das
Google in den Einträgen zeigt — ergab bei ZWANZIG eingebrannten Werbetext, also 10 %.
Hochgerechnet rund 2'900 Produkte: «Universal Lenkradbezug» (13 Wörter im Bild), «4-Achsen
Drohne» (13), «Tiger Power FPV Racing Drohne» (15), «Ochsenhorn-Kauholz für Hunde» (6). Damit
ist der Befund von 3'125 auffälligen Bildern aus dem früheren Fan-out bestätigt; er war nie
überprüft worden, und er stimmt.

DER SANFTE WEG. Ein Bild zu löschen wäre hier falsch: Bei vielen Produkten ist es das einzige,
und ein Produkt ohne Bild ist im Shop wertlos. Stattdessen wird die REIHENFOLGE geändert — hat
dasselbe Produkt ein textfreies Bild weiter hinten, rückt es an die erste Stelle. Nichts geht
verloren, das Textbild bleibt als Zusatzansicht erhalten (dort ist es sogar nützlich, weil es
Masse und Funktionen zeigt), und nach aussen zeigt der Shop ein sauberes Produktfoto.

⚠️ WO NICHTS SAUBERES DA IST, WIRD NICHTS GETAN. Ein Produkt, dessen sämtliche Bilder Text
tragen, bleibt unverändert und wird im Ledger vermerkt. Es umzustellen brächte nichts, es zu
draften nähme dem Shop Ware weg, für die es keinen Ersatz gibt. Das ist eine Aufgabe für eine
neue Bildquelle, nicht für diesen Lauf.

⚠️ «NICHT LESBAR» IST NICHT «SAUBER». Ein Bild, das sich nicht laden liess, wird nie nach vorn
geholt — sonst stünde am Ende womöglich ein totes Bild an erster Stelle. Dieselbe Verwechslung
hat den Bild-Backfill heute schon 548 Produkte fälschlich abhaken lassen.

Der Lauf ist lang (ein OCR je Bild) und jederzeit fortsetzbar; der Supervisor hält ihn am Leben.
DRY=1 meldet nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bildtext_pruefen import von_url, WORTGRENZE

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_hauptbild_ohne_text.txt"
CAP = int(os.environ.get("CAP", "100000"))
# Wie viele Bilder je Produkt höchstens angesehen werden. Wer nach fünf Ansichten kein
# textfreies Bild gefunden hat, findet meist auch im zehnten keines — und jedes OCR kostet
# Zeit, die anderen Produkten fehlt.
MAXPRUEF = 5


def gql(q, v=None):
    with open("/tmp/_ht.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ht.json"], capture_output=True, text=True)
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

    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or not p.get("g"):
            continue
        mc = p.get("mediaCount")
        mc = mc.get("count", 0) if isinstance(mc, dict) else (mc or 0)
        if mc < 2:            # ohne Alternative gibt es nichts umzustellen
            continue
        if p["id"] in erledigt:
            continue
        kandidaten.append(p["id"])
    print(f"Produkte mit mehreren Bildern, noch ungeprüft: {len(kandidaten)}", flush=True)
    if DRY:
        return

    f = open(LEDGER, "a")
    umgestellt = schon_sauber = ohne_alternative = 0
    for gid in kandidaten[:CAP]:
        d = gql('query($id:ID!){product(id:$id){title media(first:10){nodes{id '
                '... on MediaImage{status image{url}}}}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        medien = [m for m in p["media"]["nodes"]
                  if m.get("image") and m.get("status") == "READY"]
        if len(medien) < 2:
            continue

        erste = von_url(medien[0]["image"]["url"])
        if erste == -1:
            continue                      # unklar → beim nächsten Lauf erneut
        if erste < WORTGRENZE:
            schon_sauber += 1
            f.write(f"{gid}\tschon-sauber\t{erste}\n")
            f.flush()
            continue

        # Das erste sauber gelesene Bild weiter hinten rückt nach vorn.
        neu = None
        for m in medien[1:MAXPRUEF]:
            w = von_url(m["image"]["url"])
            if w == -1:
                continue
            if w < WORTGRENZE:
                neu = m
                break
        if not neu:
            ohne_alternative += 1
            f.write(f"{gid}\talle-mit-text\t-\n")
            f.flush()
            continue

        r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m)'
                '{userErrors{message}}}',
                {"id": gid, "m": [{"id": neu["id"], "newPosition": "0"}]})
        fehler = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {p['title'][:30]}: {fehler[0]['message'][:60]}", flush=True)
            continue
        umgestellt += 1
        f.write(f"{gid}\tumgestellt\t{erste}\n")
        f.flush()
        if umgestellt % 25 == 0:
            print(f"   {umgestellt} umgestellt · {schon_sauber} waren schon sauber · "
                  f"{ohne_alternative} ohne textfreie Alternative", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {umgestellt} Hauptbilder ersetzt, {schon_sauber} waren sauber, "
          f"{ohne_alternative} haben nur Bilder mit Text")


if __name__ == "__main__":
    main()
