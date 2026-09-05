"""Schneidet Lieferanten-Collagen auf den Produktteil zu und macht daraus das Hauptbild.

DAS PROBLEM (gemessen 2026-08-10): In der Uhren-Kategorie haben **440 von 638 Produkten (69 %)**
eine Werbe-Collage des Lieferanten als Hauptbild — links die Verpackung auf Weiss, rechts das
Produkt, dazu englischer Text («Simple fashion& creative») und eine FREMDE Marke («TOMI») gross
auf dem Zifferblatt. `textbild_fix.py` konnte nur 7 davon retten, denn Umsortieren hilft nicht:
**alle** Bilder dieser Produkte sind Collagen. Der Lieferant liefert schlicht nichts anderes.

DIE LÖSUNG: Die rechte Hälfte allein IST ein sauberes Produktfoto. Also zuschneiden statt
umsortieren.

⚠️ WARUM DAS VORSICHTIG GEMACHT WERDEN MUSS: Ein blinder 50-%-Schnitt würde bei abweichenden
Layouts das Produkt zerschneiden. Deshalb wird die Trennkante GEMESSEN, nicht angenommen:
 1. je Spalte Helligkeit und Streuung bestimmen,
 2. die Kante dort suchen, wo eine helle, kontrastarme Zone (Verpackung auf Weiss) in eine
    kontrastreiche übergeht — nur im mittleren Drittel, sonst ist es keine Halbierung,
 3. der Zuschnitt wird verworfen, wenn er danach immer noch Textmuster zeigt oder wenn der
    Produktteil zu schmal wird.
Das Original bleibt IMMER erhalten — der Zuschnitt wird zusätzlich angelegt und nach vorn
gestellt. Nichts wird gelöscht.

DRY=1 legt die Zuschnitte nur unter /tmp/collage_proben ab, damit man sie ansehen kann.
"""
import io, json, os, re, subprocess, sys, time
from PIL import Image

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUERY = os.environ.get("QUERY", "status:ACTIVE AND tag:kategorie-uhr")
LIMIT = int(os.environ.get("LIMIT", "40"))
LEDGER = "dropship/_collage_zuschnitt.txt"
PROBEN = "/tmp/collage_proben"


def gql(q, v=None):
    with open("/tmp/_cz.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_cz.json"], capture_output=True, text=True)
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


def hole(url):
    r = subprocess.run(["curl", "-sL", "--max-time", "30", url.split("?")[0]],
                       capture_output=True)
    if len(r.stdout) < 3000:
        return None
    try:
        return Image.open(io.BytesIO(r.stdout)).convert("RGB")
    except Exception:
        return None


def textmass(im):
    """Grob: Anzahl Zeilen mit vielen Hell-Dunkel-Wechseln. Übernommen aus textbild_fix,
    damit beide Werkzeuge dasselbe Kriterium verwenden."""
    g = im.convert("L").resize((400, 400))
    px = g.load()
    zeilen = 0
    for y in range(0, 400, 2):
        wechsel = dunkel = 0
        vorher = False
        for x in range(0, 400, 2):
            dd = px[x, y] < 110
            dunkel += dd
            if dd and not vorher:
                wechsel += 1
            vorher = dd
        if wechsel >= 8 and dunkel < 140:
            zeilen += 1
    return zeilen


def kante_finden(im):
    """Liefert die x-Position der Trennkante oder None. Gesucht wird der grösste Sprung der
    Spalten-Streuung im mittleren Drittel — links flau (Verpackung auf Weiss), rechts bewegt."""
    g = im.convert("L").resize((240, 240))
    px = g.load()
    streuung = []
    for x in range(240):
        werte = [px[x, y] for y in range(0, 240, 3)]
        m = sum(werte) / len(werte)
        streuung.append(sum((w - m) ** 2 for w in werte) / len(werte))
    besten_x, bester_sprung = None, 0
    for x in range(80, 161):
        links = sum(streuung[max(0, x - 40):x]) / 40
        rechts = sum(streuung[x:x + 40]) / 40
        sprung = rechts - links
        if sprung > bester_sprung:
            bester_sprung, besten_x = sprung, x
    # Ein echter Collagen-Schnitt zeigt einen deutlichen Sprung; sonst ist es ein normales Foto.
    if besten_x is None or bester_sprung < 350:
        return None
    return int(besten_x / 240 * im.width)


def main():
    os.makedirs(PROBEN, exist_ok=True)
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    d = gql('query($q:String!){products(first:%d,query:$q){nodes{id title '
            'featuredMedia{id ... on MediaImage{image{url}}}}}}' % LIMIT, {"q": QUERY})
    ns = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    print(f"Kandidaten: {len(ns)}", flush=True)
    f = open(LEDGER, "a")
    geschnitten = kein_schnitt = zu_textig = 0
    for p in ns:
        if p["id"] in done:
            continue
        fm = p.get("featuredMedia") or {}
        url = ((fm.get("image")) or {}).get("url")
        if not url:
            continue
        im = hole(url)
        if im is None:
            continue
        if textmass(im) < 8:
            kein_schnitt += 1            # Hauptbild ist bereits sauber
            continue
        x = kante_finden(im)
        if not x or im.width - x < im.width * 0.35:
            kein_schnitt += 1
            print(f"  – keine klare Kante: {p['title'][:46]}", flush=True)
            continue
        zuschnitt = im.crop((x, 0, im.width, im.height))
        if textmass(zuschnitt) >= 6:
            zu_textig += 1
            print(f"  ⏭️ Zuschnitt weiterhin textlastig: {p['title'][:44]}", flush=True)
            continue
        name = re.sub(r'[^a-z0-9]+', '-', p["title"].lower())[:40].strip('-') + "-produkt.jpg"
        pfad = os.path.join(PROBEN, name)
        zuschnitt.save(pfad, quality=92)
        geschnitten += 1
        print(f"  ✂️ {p['title'][:44]:<44} Kante bei {100*x//im.width}%  → {name}", flush=True)
        if DRY:
            continue
        # Hochladen und als Hauptbild voranstellen — das Original bleibt in der Galerie.
        r = subprocess.run(["/opt/node22/bin/node", "automation/upload_to_shopify_cdn.mjs",
                            pfad, p["title"][:60]],
                           capture_output=True, text=True,
                           env={**os.environ, "SHOPIFY_SHOP": "au3j0y-hq.myshopify.com",
                                "SHOPIFY_ADMIN_TOKEN": TOK})
        neu = (r.stdout or "").strip().split("\n")[-1].strip()
        if not neu.startswith("https"):
            print(f"     ⚠️ Upload fehlgeschlagen: {(r.stderr or '')[:90]}", flush=True)
            continue
        a = gql('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,'
                'media:$m){media{id} mediaUserErrors{message}}}',
                {"id": p["id"], "m": [{"originalSource": neu, "mediaContentType": "IMAGE",
                                       "alt": p["title"][:120]}]})
        mid = (((a.get("data") or {}).get("productCreateMedia") or {}).get("media") or [{}])[0].get("id")
        if not mid:
            print("     ⚠️ Media-Anlage fehlgeschlagen", flush=True)
            continue
        time.sleep(3)
        gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m)'
            '{userErrors{message}}}', {"id": p["id"], "m": [{"id": mid, "newPosition": "0"}]})
        f.write(f"{p['id']}\tzugeschnitten\t{p['title']}\n"); f.flush()
        time.sleep(1)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {geschnitten} zugeschnitten, "
          f"{kein_schnitt} ohne klare Kante/schon sauber, {zu_textig} verworfen (immer noch Text)")
    print(f"Proben liegen in {PROBEN}")


if __name__ == "__main__":
    main()
