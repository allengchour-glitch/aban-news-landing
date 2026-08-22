#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sticker_groessenvorschau.py — zweites Produktbild: wie gross der Sticker WIRKLICH ist.

BETREIBER-AUFTRAG 22.08.2026: «vorschau mit genaue grösse».

DAS PROBLEM: Die Varianten heissen «7,6 × 7,6 cm», «10 × 10 cm», «14 × 14 cm» — das ist
Printfuls DRUCKFELD, nicht der Sticker. Der Kiss-Cut folgt der Kontur, und fast kein Motiv
ist quadratisch: das Matterhorn-Motiv ergibt in der Variante «14 × 14 cm» einen Sticker von
**14,0 × 7,0 cm**. Wer 14 × 14 liest und 14 × 7 bekommt, fühlt sich getäuscht — und das bei
einem Artikel, dessen Preis ohnehin erklärungsbedürftig ist.

⚠️ DER ZUSCHNITT AUF DIE MOTIVKANTE IST DER GANZE PUNKT. Der erste Entwurf skalierte das
PNG (1024×1024) auf 14 cm und zeigte damit eine Grösse, die es nicht gibt — das Motiv füllt
die Datei nicht aus. Erst `Image.getbbox()` liefert die echte Kante; die NENNGRÖSSE ist die
längste Seite davon, die kurze ergibt sich aus dem Seitenverhältnis.

WAS DAS BILD ZEIGT:
  · das Motiv in der grössten Variante, dazu die zwei kleineren als gestrichelte Umrisse
    (gleiche Mitte, gleicher Massstab — der Grössenunterschied ist damit sofort sichtbar)
  · eine Tabelle «Variante → echte Grösse» in cm, auf eine Nachkommastelle
  · eine Kreditkarte (8,56 × 5,4 cm) im GLEICHEN Massstab als Alltagsvergleich
  · einen 5-cm-Massstab
Alles im selben Massstab gezeichnet; nachgemessen an der Matterhorn-Vorschau:
617 px Sticker zu 374 px Karte = 1,65 gegen erwartete 14/8,56 = 1,64.

DRY=1 baut die Bilder nach /tmp/sticker_vorschau, lädt aber nichts hoch.
"""
import json, os, re, subprocess, time
from PIL import Image, ImageDraw, ImageFont

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
NODE = "/opt/node22/bin/node"
DESIGNS = "social/designs"
AUSGABE = "/tmp/sticker_vorschau"
LEDGER = "dropship/_sticker_vorschau.txt"
DRY = os.environ.get("DRY") == "1"
GRENZE = int(os.environ.get("LIMIT", "400"))

PPCM = 44
STUFEN = [(14.0, "14 × 14 cm"), (10.0, "10 × 10 cm"), (7.6, "7,6 × 7,6 cm")]
BG, LINIE, MUTED, WEISS = (247, 245, 241), (32, 32, 34), (128, 126, 122), (255, 255, 255)
KB, KH = 8.56, 5.4


def font(sz, b=False):
    p = ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if b
         else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()


def gestrichelt(d, box, farbe, br=2, st=13, lu=8, halo=None):
    x0, y0, x1, y1 = box; s = st + lu
    for f, w in (((halo, br + 3), (farbe, br)) if halo else ((farbe, br),)):
        for x in range(x0, x1, s):
            d.line([x, y0, min(x + st, x1), y0], fill=f, width=w)
            d.line([x, y1, min(x + st, x1), y1], fill=f, width=w)
        for y in range(y0, y1, s):
            d.line([x0, y, x0, min(y + st, y1)], fill=f, width=w)
            d.line([x1, y, x1, min(y + st, y1)], fill=f, width=w)


def zahl(x):
    return f"{x:.1f}".replace(".", ",")


def bauen(pfad, out):
    art = Image.open(pfad).convert("RGBA")
    bb = art.getbbox()
    if bb:
        art = art.crop(bb)
    aw, ah = art.size
    if aw < 20 or ah < 20:
        return None
    masse = [(cm if aw >= ah else cm * aw / ah,
              cm if ah >= aw else cm * ah / aw, nm) for cm, nm in STUFEN]
    b_cm, h_cm, _ = masse[0]
    quadratisch = abs(aw - ah) / max(aw, ah) < 0.03
    zeilen = len(masse)
    inhalt_h = 1.1 + h_cm + 0.9 + (0.72 + zeilen * 0.78) + 0.5 + KH + 0.85 + 1.2
    seite = max(max(b_cm, KB, 13.0) + 3.0, inhalt_h)
    S = int(seite * PPCM)
    im = Image.new("RGB", (S, S), BG); d = ImageDraw.Draw(im)
    mx = S // 2; y = int(1.1 * PPCM)
    gw, gh = int(b_cm * PPCM), int(h_cm * PPCM)
    skaliert = art.resize((gw, gh), Image.LANCZOS)
    im.paste(skaliert, (mx - gw // 2, y), skaliert)
    cy = y + gh // 2
    for bw, bh, _ in masse[1:]:
        w2, h2 = int(bw * PPCM), int(bh * PPCM)
        gestrichelt(d, [mx - w2 // 2, cy - h2 // 2, mx + w2 // 2, cy + h2 // 2],
                    LINIE, halo=WEISS)

    lx = mx - int(6.0 * PPCM); ly = y + gh + int(0.9 * PPCM)
    d.text((lx, ly), "Echte Stickergrösse" if quadratisch else "Variante → echte Grösse",
           font=font(21, True), fill=LINIE)
    ly += int(0.72 * PPCM)
    for bw, bh, nm in masse:
        if quadratisch:
            d.text((lx, ly), f"{zahl(bw)} × {zahl(bh)} cm", font=font(20), fill=LINIE)
        else:
            d.text((lx, ly), nm, font=font(20), fill=MUTED)
            d.text((lx + int(3.2 * PPCM), ly), "→", font=font(20), fill=MUTED)
            d.text((lx + int(3.9 * PPCM), ly), f"{zahl(bw)} × {zahl(bh)} cm",
                   font=font(20, True), fill=LINIE)
        ly += int(0.78 * PPCM)

    ky = ly + int(0.5 * PPCM); kw, kh = int(KB * PPCM), int(KH * PPCM); kx = mx - kw // 2
    d.rounded_rectangle([kx, ky, kx + kw, ky + kh], radius=12, outline=MUTED, width=3)
    d.text((kx + int(0.4 * PPCM), ky + kh // 2 - 13), "Kreditkarte  8,6 × 5,4 cm",
           font=font(20), fill=MUTED)
    sy = ky + kh + int(0.85 * PPCM); sb = int(5 * PPCM); sx = mx - sb // 2 - int(1.0 * PPCM)
    d.line([sx, sy, sx + sb, sy], fill=LINIE, width=3)
    for i in range(6):
        x = sx + int(i * PPCM); d.line([x, sy - 9, x, sy + 9], fill=LINIE, width=3)
    d.text((sx + sb + 12, sy - 14), "5 cm", font=font(20, True), fill=LINIE)
    im.save(out, quality=92)
    return f"{zahl(b_cm)} × {zahl(h_cm)} cm"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper():
                time.sleep(4 + i * 3); continue
            if d.get("errors"):
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:180]); return None
        except Exception:
            pass
        time.sleep(3 + i * 2)
    return None


def hochladen(datei, alt):
    r = subprocess.run([NODE, "automation/upload_to_shopify_cdn.mjs", datei, alt],
                       capture_output=True, text=True,
                       env={**os.environ, "SHOPIFY_ADMIN_TOKEN": TOK, "SHOPIFY_SHOP": SHOP})
    url = (r.stdout or "").strip().splitlines()[-1] if r.stdout.strip() else ""
    return url if url.startswith("https://cdn.shopify.com/") else None


def main():
    os.makedirs(AUSGABE, exist_ok=True)
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    cur, offen, ohne = None, [], []
    while True:
        d = gql('query($c:String){products(first:60,after:$c,query:"status:active '
                'product_type:Sticker"){pageInfo{hasNextPage endCursor} nodes{id title '
                'metafield(namespace:"custom",key:"print_file"){value}}}}', {"c": cur})
        if d is None:
            print("PAUSE (Shopify antwortet nicht) — nichts hochgeladen")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            if p["id"] in erledigt:
                continue
            v = ((p.get("metafield") or {}).get("value") or "").strip()
            if not v:
                continue                       # Editor-Produkt: kein festes Motiv
            # ⚠️ Shopify-CDN-URLs tragen ein `?v=…` am Ende — `basename()` nimmt es mit
            # und der Dateiname stimmt dann nie («matterhorn.png?v=178…»). Erst die
            # Abfrage abschneiden, dann den Namen nehmen.
            # ⚠️ Shopify haengt bei Namenskollision eine UUID an («matterhorn_bfdfd891-…png»).
            # Das passiert, sobald dieselbe Datei zweimal hochgeladen wird — hier durch
            # meinen eigenen Probelauf. Die CDN-Datei ist in Ordnung, nur der LOKALE Name
            # stimmt dann nicht mehr; das Suffix wird deshalb abgeschnitten.
            name = os.path.basename(v.split("?")[0])
            name = re.sub(r"_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.)",
                          "", name)
            datei = os.path.join(DESIGNS, name)
            if not os.path.exists(datei):
                ohne.append(p["title"]); continue
            offen.append((p["id"], p["title"], datei))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]; time.sleep(0.5)

    print(f"{len(offen)} Sticker ohne Grössen-Vorschau · {len(ohne)} ohne Motivdatei")
    offen = offen[:GRENZE]
    n = 0
    for pid, titel, datei in offen:
        name = os.path.splitext(os.path.basename(datei))[0]
        out = os.path.join(AUSGABE, f"groesse-{name}.jpg")
        mass = bauen(datei, out)
        if not mass:
            print(f"   ⚠️ Motiv unbrauchbar: {titel[:44]}"); continue
        if DRY:
            print(f"   {titel[:50]:50} {mass}")
            n += 1; continue
        url = hochladen(out, f"Grössenvergleich – {titel[:60]}")
        if not url:
            print(f"   ⚠️ Upload fehlgeschlagen: {titel[:44]}"); time.sleep(1); continue
        r = gql('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,'
                'media:$m){mediaUserErrors{message}}}',
                {"id": pid, "m": [{"originalSource": url, "mediaContentType": "IMAGE",
                                   "alt": f"Grössenvergleich – {titel[:60]}"}]})
        f = (((r or {}).get("data") or {}).get("productCreateMedia") or {}).get("mediaUserErrors")
        if r is None or f is None or f:
            print(f"   ⚠️ {titel[:44]} — {json.dumps(f)[:70] if f else 'keine Antwort'}")
            time.sleep(1); continue
        with open(LEDGER, "a") as fh:
            fh.write(f"{pid}\t{mass}\t{titel[:60]}\n")
        n += 1
        time.sleep(0.4)
    print(f"\n{n} Grössen-Vorschauen {'gebaut (DRY)' if DRY else 'hinzugefügt'}")
    print("FERTIG")


if __name__ == "__main__":
    main()
