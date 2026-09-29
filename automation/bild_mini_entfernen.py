#!/usr/bin/env python3
"""bild_mini_entfernen.py — winzige ZUSATZbilder entfernen, die Google «Image too small» melden lässt (29.09.2026).

GEMESSEN 29.09. (Betreiber «google merchant sachen»): 23 Produkte mit der Google-Meldung «Image too small» — bei ALLEN war
das Hauptbild gross genug (500–1920 px); klein waren Zusatzbilder (40×40, 150×52, 197×256 …). `bild_klein_fix.py` prüft nur
das Hauptbild und konnte die Klasse darum nie heilen. Google verlangt für jedes additional_image_link eine Mindestgrösse
(Bekleidung 250×250 — QUELLE: Google-Merchant-Hilfe «Image link»), und für Kundinnen sind 40-px-Vorschaubilder wertlos.

Regel: Medien mit kürzester Seite < MIN (250) werden entfernt — NUR wenn das Produkt danach noch ≥ 1 Bild mit ≥ 500 px
behält, nie das Hauptbild (Position 1) und NIE ein Bild, das an einer Variante hängt (Varianten-Vorschau bliebe leer). Jede entfernte Bild-URL steht in dropship/_bild_mini_entfernt.tsv (Handle, URL,
Grösse) → wiederherstellbar per productCreateMedia.

  DRY=1 python3 automation/bild_mini_entfernen.py               → Trockenlauf über die Google-Liste
  python3 automation/bild_mini_entfernen.py                     → entfernen (Eimer-Etikette); täglich im Aufseher
  QUELLE=alle …                                                 → alle aktiven Produkte statt nur der Google-Liste (später)
"""
import json, os, sys, time, urllib.request, datetime as dt

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
LOG = os.path.join(REPO, "dropship/_bild_mini_entfernt.tsv")
MIN = int(os.environ.get("MIN", "250"))
SCHARF = os.environ.get("DRY") != "1"   # Hauskonvention: DRY=1 zeigt nur (Aufseher ruft ohne Variablen)


def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    grund = ""
    for a in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=60))
            if d.get("data") is not None and not d.get("errors"):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                if ts and ts.get("currentlyAvailable", 1000) < 400:
                    time.sleep(3)
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:120]
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:120]
        time.sleep(3 + 3 * a)
    print(f"gql: letzter Grund: {grund}", file=sys.stderr)
    raise RuntimeError(f"Shopify antwortet nicht — Lauf abgebrochen, nichts quittiert ({grund})")


def main():
    handles = json.load(open(STAND))["handles"].get("Image too small", [])
    print(f"Google «Image too small»: {len(handles)} Produkte · Schwelle {MIN} px · {'SCHARF' if SCHARF else 'TROCKEN'}")
    weg_ges = prod = 0
    for h in handles:
        d = gql('query($h:String!){p: productByHandle(handle:$h){id handle status media(first:30){nodes{id mediaContentType '
                '... on MediaImage{image{url width height}}}} variants(first:100){nodes{media(first:1){nodes{id}}}}}}', {"h": h})
        p = d.get("p")
        if not p or p["status"] != "ACTIVE":
            continue
        bilder = [(i, m) for i, m in enumerate(p["media"]["nodes"]) if m["mediaContentType"] == "IMAGE" and m.get("image")]
        gross = [m for _, m in bilder if min(m["image"]["width"] or 0, m["image"]["height"] or 0) >= 500]
        # Variantenbilder bleiben IMMER (Kundin wählt «Löwe» → sieht sonst kein Bild), auch wenn klein.
        an_variante = {vm["id"] for v in p["variants"]["nodes"] for vm in v["media"]["nodes"]}
        klein = [m for i, m in bilder if i > 0 and m["id"] not in an_variante
                 and min(m["image"]["width"] or 0, m["image"]["height"] or 0) < MIN]
        if not klein or not gross:
            continue
        prod += 1
        print(f"  {h[:50]:50s} entfernen {len(klein)}: " + ", ".join(f"{m['image']['width']}×{m['image']['height']}" for m in klein))
        if not SCHARF:
            weg_ges += len(klein); continue
        r = gql("mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}",
                {"p": p["id"], "m": [m["id"] for m in klein]})["productDeleteMedia"]
        if r["mediaUserErrors"]:
            print("    Fehler:", r["mediaUserErrors"][0]["message"]); continue
        weg = set(r["deletedMediaIds"] or [])
        with open(LOG, "a", encoding="utf-8") as f:
            for m in klein:
                if m["id"] in weg:
                    f.write(f"{dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%MZ}\t{h}\t{m['image']['url']}\t{m['image']['width']}x{m['image']['height']}\n")
        weg_ges += len(weg)
    print(f"FERTIG: {prod} Produkte, {weg_ges} Zusatzbilder {'entfernt' if SCHARF else 'würden entfernt'}")


if __name__ == "__main__":
    main()
