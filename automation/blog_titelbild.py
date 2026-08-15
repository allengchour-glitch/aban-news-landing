"""Gibt Ratgeber-Artikeln ein Titelbild — 244 von 312 haben keines.

DER BEFUND: Von 312 veröffentlichten Artikeln tragen nur 68 ein Bild. Überall dort, wo das
Theme Artikelkarten zeigt (Blog-Übersicht, «Das könnte dich interessieren»), bleibt ein
leeres graues Feld stehen. Der Blog ist der einzige Kanal, der ohne Werbebudget Besucher
bringt — und er sieht unfertig aus.

WOHER DAS BILD KOMMT: aus dem Artikel selbst. Jeder Ratgeber verlinkt Produkte und
Kollektionen des Shops; das erste verlinkte Produkt mit brauchbarem Bild liefert das
Titelbild. Damit passt das Bild garantiert zum Thema, und es entsteht kein neuer
Bildbestand, der gepflegt werden müsste.

⚠️ NUR BILDER, DIE GOOGLE UND DAS THEME AKZEPTIEREN: mindestens 500×500 (dieselbe Schwelle
wie im Merchant-Feed) und Status READY. Ein FAILED-Medium als Titelbild wäre ein grauer
Kasten mit Ladefehler statt eines leeren Kastens — schlimmer als vorher.

⚠️ KEIN BILD MIT WERBETEXT. Die Lieferantenbilder tragen oft englische Plakattexte; als
grossflächiges Titelbild fällt das doppelt auf. Geprüft wird mit derselben Texterkennung wie
bei den Produktbildern, Grenze 10 Wörter.

⚠️ DER ALT-TEXT IST PFLICHT, nicht Kür: Ohne ihn ist die Karte für Screenreader stumm, und
Google bewertet das Bild nicht. Er wird aus dem Artikeltitel gebildet.

DRY=1 meldet nur.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_blog_titelbild.txt"
CAP = int(os.environ.get("CAP", "400"))


def gql(q, v=None):
    with open("/tmp/_bt.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_bt.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(4)
    return {}


def woerter(url):
    try:
        r = subprocess.run(["python3", "automation/bildtext_pruefen.py", "--url", url],
                           capture_output=True, text=True, timeout=180)
        return int((r.stdout or "").strip().split("\n")[-1])
    except Exception:
        return -1


def bild_von_kollektion(handle):
    """Bestes Produktbild aus einer verlinkten Kollektion.

    ⚠️ NÖTIG GEWORDEN durch die eigene Blog-Reparatur vom 14.08.: sie ersetzte 88 tote
    Produktlinks durch Kollektions-Links. Der erste Lauf dieses Skripts suchte nur nach
    /products/-Links und meldete deshalb bei 231 von 244 Artikeln «kein passendes Bild» —
    nicht weil es keines gäbe, sondern weil die Artikel seit der Reparatur Kategorien
    verlinken. Die Kollektion ist als Quelle genauso thementreu: sie ist das, was der
    Artikel jetzt empfiehlt.
    """
    d = gql('query($h:String!){collectionByHandle(handle:$h){products(first:8,sortKey:BEST_SELLING)'
            '{nodes{status media(first:5){nodes{mediaContentType ... on MediaImage{status '
            'image{url width height}}}}}}}}', {"h": handle})
    c = (d.get("data") or {}).get("collectionByHandle")
    for p in ((c or {}).get("products") or {}).get("nodes", []):
        if p.get("status") != "ACTIVE":
            continue
        for m in p["media"]["nodes"]:
            if (m.get("mediaContentType") == "IMAGE" and m.get("status") == "READY"
                    and (m.get("image") or {}).get("width", 0) >= 500
                    and (m.get("image") or {}).get("height", 0) >= 500):
                n = woerter(m["image"]["url"])
                if 0 <= n < 10:
                    return m["image"]["url"]
                break                      # je Produkt nur das erste grosse Bild prüfen
    return None


def bild_von_produkt(handle):
    d = gql('query($h:String!){productByHandle(handle:$h){status media(first:10){nodes{'
            'mediaContentType ... on MediaImage{status image{url width height}}}}}}', {"h": handle})
    p = (d.get("data") or {}).get("productByHandle")
    if not p or p.get("status") != "ACTIVE":
        return None
    kandidaten = [m["image"] for m in p["media"]["nodes"]
                  if m.get("mediaContentType") == "IMAGE" and m.get("status") == "READY"
                  and (m.get("image") or {}).get("width", 0) >= 500
                  and (m.get("image") or {}).get("height", 0) >= 500]
    for im in kandidaten[:3]:
        n = woerter(im["url"])
        if 0 <= n < 10:
            return im["url"]
    return None


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    cur, ohne = None, []
    while True:
        d = gql('query($c:String){articles(first:100,after:$c){pageInfo{hasNextPage endCursor}'
                'nodes{id handle title body image{url} isPublished}}}', {"c": cur})
        a = (d.get("data") or {}).get("articles")
        if not a:
            break
        for n in a["nodes"]:
            if n.get("isPublished") and not n.get("image") and n["id"] not in erledigt:
                ohne.append(n)
        if not a["pageInfo"]["hasNextPage"]:
            break
        cur = a["pageInfo"]["endCursor"]
    print(f"Veröffentlichte Artikel ohne Titelbild: {len(ohne)}", flush=True)

    f = None if DRY else open(LEDGER, "a")
    getan = leer = 0
    for art in ohne[:CAP]:
        # ⚠️ Reihenfolge im Text = Reihenfolge der Wichtigkeit. Das erste verlinkte Produkt
        # ist das, um das es im Artikel geht; spätere sind Randempfehlungen.
        body = art.get("body") or ""
        handles = re.findall(r'/products/([a-z0-9\-]+)', body)
        url = None
        for h in list(dict.fromkeys(handles))[:6]:
            url = bild_von_produkt(h)
            if url:
                break
        if not url:
            for h in list(dict.fromkeys(re.findall(r'/collections/([a-z0-9\-]+)', body)))[:4]:
                url = bild_von_kollektion(h)
                if url:
                    break
        if not url:
            leer += 1
            if f:
                f.write(f"{art['id']}\tkein-passendes-bild\t{art['handle'][:50]}\n")
                f.flush()
            continue
        getan += 1
        if DRY:
            print(f"   {art['title'][:50]:<52} ← {url.split('/')[-1][:40]}")
            continue
        r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){'
                'userErrors{message}}}',
                {"id": art["id"], "a": {"image": {"url": url, "altText": art["title"][:120]}}})
        fehler = ((r.get("data") or {}).get("articleUpdate") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {art['handle'][:40]}: {fehler[0]['message'][:60]}", flush=True)
            getan -= 1
            continue
        f.write(f"{art['id']}\ttitelbild\t{art['handle'][:50]}\n")
        f.flush()
        if getan % 20 == 0:
            print(f"   {getan} Artikel bebildert", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {getan} Artikel haben jetzt ein Titelbild, {leer} ohne brauchbare Quelle.")


if __name__ == "__main__":
    main()
