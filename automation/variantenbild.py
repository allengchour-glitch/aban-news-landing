"""Gibt jeder Farbvariante ihr eigenes Bild — aber nur dort, wo die Zuordnung BEWEISBAR ist.

DER BEFUND (Betreiber, 14.08.2026, am «Midikleid mit Zopfmuster und Blumenprint»): Die Kundin
wählt «Aprikose» und sieht weiterhin dasselbe Bild. 8 Farben, 8 Bilder, 40 Varianten — und
KEINE einzige Variante trägt ein Bild. Beim Umschalten passiert nichts. Katalogweit haben
11'138 aktive Produkte mehrere Farben.

⚠️ DIE NAHELIEGENDE LÖSUNG IST FALSCH. «Bild 1 zur Farbe 1, Bild 2 zur Farbe 2» wäre in einer
Zeile geschrieben — und beschriftet fast alles falsch. Der Kontaktbogen dieses Kleides zeigt es:
unter den acht Bildern ist WEDER ein schwarzes NOCH ein aprikosefarbenes Kleid, obwohl beide
Farben zur Auswahl stehen, und mehrere Bilder zeigen dasselbe Kleid am Model. Die Bilder folgen
der Farbliste nicht. Wer hier stur durchzählt, sagt der Kundin, ein blaues Kleid sei apricot.

DESHALB WIRD DIE FARBE GEMESSEN, NICHT GEZÄHLT. Aus jedem Bild wird der vorherrschende Farbton
bestimmt und mit dem Farbnamen der Option verglichen. Zugewiesen wird nur bei einem eindeutigen
Treffer.

⚠️ UND AUCH DIE MESSUNG HAT EINE GRENZE, die im Probelauf sichtbar wurde: Bei freigestellten
Produktfotos trifft sie (grünes Kleid → 95°, blau-weisses → 216°). Bei Fotos AM MODEL misst sie
Hautton und Wiese statt Stoff — fünf Model-Bilder desselben Kleides kamen alle als «Orange»
zurück. Model-Fotos werden deshalb übersprungen: erkennbar am hohen Anteil hautfarbener Pixel.

⚠️ MEHRDEUTIGKEIT IST KEIN TREFFER. Stehen «Blau» UND «Himmelblau» zur Auswahl und das Bild
misst blau, ist nicht entscheidbar, welche der beiden gemeint ist. Solche Fälle bleiben ohne
Bild — ein falsch zugeordnetes Bild ist schlimmer als gar keines, weil die Kundin dann bewusst
etwas anderes bestellt, als sie sieht.

Was dieser Lauf NICHT kann und auch nicht vorgibt zu können: aus «Pink 1» einen sprechenden
Namen machen. Welches der beiden Pinks gemeint ist, weiss nur der Lieferant.

DRY=1 meldet nur.
"""
import colorsys, io, json, os, subprocess, sys, time, warnings

from PIL import Image

warnings.filterwarnings("ignore", category=DeprecationWarning)

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_variantenbild.txt"
CAP = int(os.environ.get("CAP", "100000"))

# Farbname → Farbtonbereich in Grad. Nur Töne, die sich im Bild messen lassen; Weiss, Schwarz,
# Grau, Beige und Gold sind bewusst NICHT dabei — sie haben keinen Farbton, den man von einem
# hellen Hintergrund unterscheiden könnte.
TON = {
    "rot": (345, 12), "dunkelrot": (345, 10), "bordeaux": (340, 8), "weinrot": (340, 10),
    "orange": (18, 42), "gelb": (45, 68),
    "grün": (75, 160), "gruen": (75, 160), "dunkelgrün": (85, 160), "hellgrün": (70, 150),
    "oliv": (60, 90), "mintgrün": (140, 170),
    "türkis": (165, 195), "tuerkis": (165, 195),
    "blau": (200, 250), "dunkelblau": (210, 250), "hellblau": (185, 225),
    "himmelblau": (185, 225), "marineblau": (215, 250),
    "lila": (265, 295), "violett": (265, 300), "lavendel": (255, 285),
    "pink": (300, 340), "rosa": (300, 345), "magenta": (295, 325),
}
# Ein Bild gilt als Model-Foto, wenn viele Pixel im Hautton liegen. Dann misst die Analyse den
# Menschen, nicht das Kleidungsstück.
HAUT = (12, 42)


def gql(q, v=None):
    with open("/tmp/_vb.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vb.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(5)
    return {}


def bildton(url):
    """Vorherrschender Farbton in Grad, oder None wenn nicht auswertbar."""
    raw = subprocess.run(["curl", "-sL", "--max-time", "25", url], capture_output=True).stdout
    if not raw:
        return None
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return None
    im.thumbnail((160, 160))
    w, h = im.size
    im = im.crop((int(w * .25), int(h * .2), int(w * .75), int(h * .85)))
    bunt, haut, gesamt = [], 0, 0
    for r, g, b in im.getdata():
        gesamt += 1
        hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        grad = hh * 360
        if ss > .12 and .25 < vv < .95 and HAUT[0] <= grad <= HAUT[1]:
            haut += 1
        if ss > .25 and .15 < vv < .95:
            bunt.append(grad)
    if not gesamt or len(bunt) / gesamt < .06:
        return None                      # zu wenig Farbe, meist ein weisses Produkt
    if haut / gesamt > .18:
        return None                      # Model-Foto: gemessen würde die Haut
    bunt.sort()
    return bunt[len(bunt) // 2]


def passt(name, grad):
    b = TON.get(name.strip().lower())
    if not b or grad is None:
        return False
    lo, hi = b
    return (lo <= grad <= hi) if lo < hi else (grad >= lo or grad <= hi)


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or p["id"] in erledigt:
            continue
        fo = [o for o in (p.get("options") or [])
              if o["name"].lower() in ("farbe", "color", "couleur")]
        if not fo or len(fo[0].get("values") or []) < 2:
            continue
        mc = p.get("mediaCount")
        mc = mc.get("count", 0) if isinstance(mc, dict) else (mc or 0)
        if mc < 2:
            continue
        # ⚠️ VORFILTER, OHNE DEN DER LAUF 73 STUNDEN BRAUCHT. Ein Produkt, dessen Farbnamen
        # allesamt keinen messbaren Farbton haben («Schwarz, Weiss, Grau, Beige, Gold», und
        # erst recht «Color» oder «Pink 1»), kann diese Methode nie zuordnen — für das
        # Wissen müssen aber sonst erst zwölf Bilder heruntergeladen werden. Von 11'027
        # Kandidaten fallen so 6'380 weg, bevor eine einzige Anfrage rausgeht.
        if not any(TON.get(w.strip().lower()) for w in (fo[0].get("values") or [])):
            continue
        kandidaten.append(p["id"])
    schritt = int(os.environ.get("SCHRITTE", "1"))
    versatz = int(os.environ.get("VERSATZ", "0"))
    if schritt > 1:
        kandidaten = kandidaten[versatz::schritt]
    print(f"Produkte mit messbarem Farbnamen und mehreren Bildern: {len(kandidaten)}", flush=True)
    if DRY and not os.environ.get("PROBE"):
        return

    f = None if DRY else open(LEDGER, "a")
    zugeordnet = uneindeutig = kein_treffer = produkte = 0
    for gid in kandidaten[:CAP]:
        d = gql('query($id:ID!){product(id:$id){title options{name values} '
                'media(first:20){nodes{id ... on MediaImage{status image{url}}}} '
                'variants(first:100){nodes{id image{url} selectedOptions{name value}}}}}',
                {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        if any(v.get("image") for v in p["variants"]["nodes"]):
            if f:
                f.write(f"{gid}\thatte-schon-bilder\t0\n"); f.flush()
            continue
        medien = [m for m in p["media"]["nodes"]
                  if m.get("image") and m.get("status") == "READY"]
        farben = [o for o in p["options"] if o["name"].lower() in ("farbe", "color", "couleur")]
        if not farben or len(medien) < 2:
            continue
        werte = farben[0]["values"]
        # Zweiter Halt, jetzt gegen die LIVE-Farbliste: der Export ist vom 12.08., die Optionen
        # können sich seither geändert haben.
        if not any(TON.get(w.strip().lower()) for w in werte):
            if f:
                f.write(f"{gid}\tkein-messbarer-farbname\t0\n"); f.flush()
            continue

        # Farbton je Bild EINMAL messen.
        toene = [(m, bildton(m["image"]["url"])) for m in medien[:12]]
        zuordnung = {}
        for wert in werte:
            treffer = [m for m, t in toene if passt(wert, t)]
            if len(treffer) == 1:
                # ⚠️ Und die Gegenprobe: passt dieses Bild auch zu einer ANDEREN Farbe der
                # Auswahl, ist nicht entscheidbar, welche gemeint ist. Dann lieber nichts.
                andere = [w for w in werte if w != wert
                          and passt(w, dict((id(m), t) for m, t in toene)[id(treffer[0])])]
                if andere:
                    uneindeutig += 1
                    continue
                zuordnung[wert] = treffer[0]["id"]
            elif len(treffer) > 1:
                uneindeutig += 1
            else:
                kein_treffer += 1
        if not zuordnung:
            if f:
                f.write(f"{gid}\tkeine-eindeutige-farbe\t0\n"); f.flush()
            continue

        eingaben = []
        for v in p["variants"]["nodes"]:
            farbe = next((o["value"] for o in v["selectedOptions"]
                          if o["name"].lower() in ("farbe", "color", "couleur")), None)
            if farbe in zuordnung:
                eingaben.append({"id": v["id"], "mediaId": zuordnung[farbe]})
        if not eingaben:
            continue
        produkte += 1
        zugeordnet += len(eingaben)
        if DRY:
            print(f"   {p['title'][:44]:<46} {len(zuordnung)} Farben → {len(eingaben)} Varianten",
                  flush=True)
            continue
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate('
                'productId:$p,variants:$v){userErrors{message}}}', {"p": gid, "v": eingaben})
        fehler = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {p['title'][:30]}: {fehler[0]['message'][:60]}", flush=True)
            continue
        f.write(f"{gid}\tzugeordnet\t{len(eingaben)}\n")
        f.flush()
        if produkte % 25 == 0:
            print(f"   {produkte} Produkte · {zugeordnet} Varianten mit eigenem Bild", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {produkte} Produkte, {zugeordnet} Varianten haben jetzt ihr eigenes Bild. "
          f"{uneindeutig} Farben blieben mehrdeutig, {kein_treffer} ohne messbaren Treffer — "
          f"beide bewusst ohne Zuordnung.")


if __name__ == "__main__":
    main()
