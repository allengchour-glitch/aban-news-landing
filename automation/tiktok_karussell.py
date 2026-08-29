#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_karussell — baut mehrseitige TikTok-Foto-Posts (Karussell) aus echter Shop-Ware.

WARUM DIESES WERKZEUG:
TikToks Content-Posting-API steht fuer diesen Shop weiter in Review (`unauthorized_client`),
die Ads-API kann keine Beitraege veroeffentlichen. Der einzige Weg, der HEUTE funktioniert, ist
tiktok.com/tiktokstudio/upload von Hand. Dieses Werkzeug baut deshalb das FERTIGE Material:
nummerierte Slides plus eine Caption, die nur noch hochgeladen werden muss.

ZWEI MODI (der Betreiber wollte «karussell oder mehrere miteinander»):
  MODUS=produkt  Ein Produkt, mehrere Slides aus SEINEN EIGENEN Bildern (CJ liefert 4-8).
  MODUS=top      Mehrere Produkte in EINEM Karussell, eines je Slide (Top-Liste).

⚠️ WAS HIER BEWUSST NICHT PASSIERT — jede dieser Regeln ist im Projekt teuer bezahlt worden:
 1. KEINE erfundenen Aussagen. Auf den Slides steht ausschliesslich, was im Shop steht:
    Produkttitel und Preis. Kein Nutzenversprechen, das nicht belegt ist.
 2. KEINE Lieferzeit in der Caption. Es gab in diesem Shop sieben widerspruechliche Angaben;
    eine achte in einem Social-Post waere die naechste. Die Lieferzeit steht auf der Produktseite.
 3. KEIN Streichpreis, kein «statt CHF …». Die konstruierten Vergleichspreise wurden am
    24.08. entfernt (PBV Art. 16) — sie duerfen hier nicht durch die Hintertuer zurueck.
 4. KEIN Rabattcode ausser WELCOME10. Der ist bis Ende 2027 gueltig und live geprueft;
    fuenf Seiten bewarben monatelang den abgelaufenen PAPA25.
 5. KEIN Produkt mit Wirk-/Heilversprechen im Titel (Wachstum, gegen Pigmentflecken, Anti-Falten).
    Auf einer Produktseite ist das reguliert, in einem Social-Post ist es Werbung damit.
 6. KEIN Produkt zweimal — auch nicht plattformuebergreifend. Geprueft wird gegen das eigene
    Ledger UND gegen automation/reels_seed.csv (Doppelpost-Verbot des Betreibers).

⚠️ Dieses Werkzeug POSTET NICHTS. Es schreibt Dateien. Der Stopp-Riegel dropship/_SOCIAL_STOPP
   betrifft die Poster, nicht die Produktion — aber solange er liegt, wird auch nichts gepostet.

ENV: MODUS (produkt|top, Default produkt) · QUELLE (Kollektions-Handle, Default hype-jetzt)
     ANZAHL (Karussells je Lauf, Default 1) · SLIDES (Default 6) · DRY=1 (nur melden)
"""

import csv
import json
import os
import re
import subprocess
import time

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()

MODUS = os.environ.get("MODUS", "produkt")
QUELLE = os.environ.get("QUELLE", "hype-jetzt")
ANZAHL = int(os.environ.get("ANZAHL", "1"))
SLIDES = int(os.environ.get("SLIDES", "6"))
DRY = os.environ.get("DRY") == "1"

AUS = os.path.join(ROOT, "social", "tiktok")
QUEUE = os.path.join(ROOT, "social", "tiktok_karussell.csv")
LEDGER = os.path.join(ROOT, "dropship", "_tiktok_karussell.txt")
REELS = os.path.join(HIER, "reels_seed.csv")

B, H = 1080, 1920                      # TikTok-Fotos werden 9:16 vollflaechig gezeigt
INK = (24, 24, 26)
GOLD = (193, 154, 91)
WEISS = (255, 255, 255)
CREME = (246, 242, 235)

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# --- Ausschluesse -----------------------------------------------------------
# Wirk- und Heilversprechen im TITEL. Auf der Produktseite reguliert, im Social-Post beworben.
CLAIM = re.compile(
    r"wachstum|gegen\s+pigment|pigmentflecken|anti[- ]?falten|faltenreduz|straff|"
    r"blutzucker|blutdruck|\bekg\b|abnehm|schlankheit|heil|therapie|schmerz",
    re.I)
# Tags, die ein Produkt aus jeder Werbung heraushalten.
SPERR_TAGS = {"bild-zu-klein", "medizinprodukt-pruefen", "18plus", "raucher",
              "waffengesetz-verboten", "nicht-bewerben", "nicht-live-moebel-sperrig",
              "niedrig-bewertet-nicht-bewerben", "nur-onlineshop", "duplikat-auto-draft"}
MIN_KANTE = 700        # unter 700 px sieht ein 1080er Slide ausgefranst aus
MIN_PREIS = 15.0


def gql(q, v=None):
    p = "/tmp/_ttk.json"
    with open(p, "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@" + p], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5); continue
        # Eine Drosselung ist kein Abbruchgrund — sie sagt nur, wie lange zu warten ist.
        fehler = json.dumps(d.get("errors") or "")
        if "Throttled" in fehler or "THROTTLED" in fehler:
            time.sleep(6); continue
        if d.get("data") is not None:
            return d
        time.sleep(5)
    return {}


def hole(handle):
    q = """query($h:String!,$c:String){
      collectionByHandle(handle:$h){
        products(first:60, after:$c){
          pageInfo{hasNextPage endCursor}
          nodes{ id title handle status tags
            priceRangeV2{minVariantPrice{amount}}
            media(first:8){nodes{... on MediaImage{image{url width height}}}}
          }}}}"""
    aus, cur = [], None
    while True:
        d = gql(q, {"h": handle, "c": cur})
        c = (((d.get("data") or {}).get("collectionByHandle") or {}).get("products") or {})
        if not c:
            break
        aus += c.get("nodes") or []
        if not (c.get("pageInfo") or {}).get("hasNextPage"):
            break
        cur = c["pageInfo"]["endCursor"]
    return aus


def bilder(p):
    """Taugliche Slide-Bilder, BESTE ZUERST.

    ⚠️ Die Reihenfolge des Lieferanten ist keine Qualitaetsreihenfolge. Der erste Probelauf
    machte aus einer CJ-Infografik (Pfeile, Comic-Wolken, 899x685 PNG) den Haupt-Slide eines
    Karussells — genau die Klasse «montierter Fremdtext im Bild» vom 21.08.
    Gemessen an drei Beispielen unterscheidet das Format die beiden Sorten zuverlaessig:
      · JPG, nahezu quadratisch (800x800 / 1500x1500 / 1920x1920) → Studiofoto
      · PNG oder schiefes Format (899x685, 470x485, 745x806)      → Grafik oder Collage
    Das ist eine HEURISTIK, kein Beweis — sie sortiert nur um und verwirft nichts ausser
    zu kleinen Bildern. Wo nichts Besseres da ist, wird das Vorhandene genommen.
    """
    bewertet = []
    for i, m in enumerate((p.get("media") or {}).get("nodes") or []):
        im = (m or {}).get("image") or {}
        u, w, h = im.get("url"), im.get("width") or 0, im.get("height") or 0
        if not u or min(w, h) < MIN_KANTE:
            continue
        ist_jpg = ".png" not in u.split("?")[0].lower()
        quadrat = 0.95 <= (w / h) <= 1.05
        rang = (2 if ist_jpg and quadrat else 1 if ist_jpg else 0)
        bewertet.append((-rang, i, u))
    bewertet.sort()
    return [u for _, _, u in bewertet]


def geeignet(p, mindest_bilder):
    if p.get("status") != "ACTIVE":
        return False
    if SPERR_TAGS & set(t.lower() for t in (p.get("tags") or [])):
        return False
    if CLAIM.search(p.get("title") or ""):
        return False
    try:
        if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) < MIN_PREIS:
            return False
    except Exception:
        return False
    return len(bilder(p)) >= mindest_bilder


def schon_verwendet():
    """Handles, die bereits beworben wurden — eigenes Ledger UND die Reel-Queue."""
    benutzt = set()
    if os.path.exists(LEDGER):
        for z in open(LEDGER):
            t = z.split("\t")
            if t:
                benutzt.add(t[0].strip())
    if os.path.exists(REELS):
        try:
            for r in csv.DictReader(open(REELS)):
                for feld in ("handle", "product_handle", "slug", "name"):
                    if r.get(feld):
                        benutzt.add(r[feld].strip())
        except Exception:
            pass
    return benutzt


def lade(url, ziel):
    r = subprocess.run(["curl", "-sL", "--max-time", "60", "-o", ziel, url],
                       capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(ziel) and os.path.getsize(ziel) > 4000


def f(pfad, groesse):
    return ImageFont.truetype(pfad, groesse)


def umbrechen(d, text, schrift, breite):
    worte, zeilen, zeile = text.split(), [], ""
    for w in worte:
        probe = (zeile + " " + w).strip()
        if d.textlength(probe, font=schrift) <= breite:
            zeile = probe
        else:
            if zeile:
                zeilen.append(zeile)
            zeile = w
    if zeile:
        zeilen.append(zeile)
    return zeilen


def grund(bildpfad, oben=0.20, hoehe=0.60):
    """Unscharfer, formatfuellender Hintergrund + scharfes Produktbild darueber.

    Ein quadratisches Produktfoto auf 9:16 zu beschneiden schneidet die Ware an; der
    unscharfe Fuellgrund ist der Standardweg und laesst das Bild vollstaendig.
    """
    q = Image.open(bildpfad).convert("RGB")
    v = max(B / q.width, H / q.height)
    hg = q.resize((int(q.width * v) + 2, int(q.height * v) + 2), Image.LANCZOS)
    hg = hg.crop(((hg.width - B) // 2, (hg.height - H) // 2,
                  (hg.width - B) // 2 + B, (hg.height - H) // 2 + H))
    hg = hg.filter(ImageFilter.GaussianBlur(38))
    hg = ImageEnhance.Brightness(hg).enhance(0.62)

    v2 = min((B - 120) / q.width, (H * hoehe) / q.height)
    vg = q.resize((int(q.width * v2), int(q.height * v2)), Image.LANCZOS)
    vg = ImageEnhance.Color(ImageEnhance.Contrast(vg).enhance(1.06)).enhance(1.05)
    hg.paste(vg, ((B - vg.width) // 2, int(H * oben)))
    return hg


def scrim(img, oben=True, unten=True):
    """Sanfte Verlaeufe, damit Text auf jedem Foto lesbar bleibt."""
    lage = Image.new("RGBA", (B, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lage)
    if oben:
        for y in range(0, 360):
            d.line([(0, y), (B, y)], fill=(0, 0, 0, int(150 * (1 - y / 360))))
    if unten:
        for y in range(H - 620, H):
            a = (y - (H - 620)) / 620
            d.line([(0, y), (B, y)], fill=(0, 0, 0, int(215 * a)))
    return Image.alpha_composite(img.convert("RGBA"), lage).convert("RGB")


def marke(d, nummer=None, gesamt=None):
    d.text((60, 74), "L U X E S T Y L E", font=f(SANSB, 30), fill=WEISS)
    d.line([(60, 122), (322, 122)], fill=GOLD, width=3)
    if nummer:
        t = f"{nummer}/{gesamt}"
        d.text((B - 60 - d.textlength(t, font=f(SANSB, 30)), 74), t,
               font=f(SANSB, 30), fill=GOLD)


def preis_pille(d, x, y, text):
    br = d.textlength(text, font=f(SANSB, 44)) + 64
    d.rounded_rectangle([x, y, x + br, y + 88], radius=44, fill=GOLD)
    d.text((x + 32, y + 20), text, font=f(SANSB, 44), fill=(30, 24, 12))


def slide_hook(bildpfad, kicker, gross, titel, nummer, gesamt):
    """Erster Slide. Der PREIS ist der Anker, nicht der Titel.

    Grund steht in der eigenen Auswertung: eine Caption mit Preis-Anker schlug die generische
    Fassung um das Zwanzigfache. Der Titel darunter erklaert, was es ist.
    """
    img = scrim(grund(bildpfad, oben=0.125, hoehe=0.46))
    d = ImageDraw.Draw(img)
    marke(d, nummer, gesamt)

    schrift_t = f(SANS, 40)
    zeilen = umbrechen(d, titel, schrift_t, B - 130)[:2]
    unterkante = H - 250
    y = unterkante - len(zeilen) * 52
    for z in zeilen:
        d.text((66, y + 3), z, font=schrift_t, fill=(0, 0, 0))
        d.text((64, y), z, font=schrift_t, fill=CREME)
        y += 52

    schrift_g = f(SERIF, 122)
    while d.textlength(gross, font=schrift_g) > B - 130 and schrift_g.size > 60:
        schrift_g = f(SERIF, schrift_g.size - 6)
    yg = unterkante - len(zeilen) * 52 - schrift_g.size - 34
    d.text((68, yg + 5), gross, font=schrift_g, fill=(0, 0, 0))
    d.text((64, yg), gross, font=schrift_g, fill=WEISS)

    d.text((64, yg - 62), kicker.upper(), font=f(SANSB, 34), fill=GOLD)
    d.line([(64, unterkante + 34), (254, unterkante + 34)], fill=GOLD, width=6)
    d.text((64, unterkante + 62), "→ weiterwischen", font=f(SANSB, 36), fill=CREME)
    return img


def slide_produkt(bildpfad, titel, preis, nummer, gesamt, zeile=None):
    img = scrim(grund(bildpfad))
    d = ImageDraw.Draw(img)
    marke(d, nummer, gesamt)
    schrift = f(SERIF, 60)
    zeilen = umbrechen(d, titel, schrift, B - 130)[:3]
    y = H - 400 - len(zeilen) * 74
    for z in zeilen:
        d.text((66, y + 3), z, font=schrift, fill=(0, 0, 0))
        d.text((64, y), z, font=schrift, fill=WEISS)
        y += 74
    if zeile:
        d.text((64, y + 8), zeile, font=f(SANS, 38), fill=CREME)
        y += 58
    preis_pille(d, 64, y + 24, preis)
    return img


def slide_cta(titelzeile):
    img = Image.new("RGB", (B, H), INK)
    d = ImageDraw.Draw(img)
    for i in range(3):
        d.rectangle([54 + i, 54 + i, B - 54 - i, H - 54 - i], outline=GOLD)
    d.text((B / 2, 470), "L U X E S T Y L E", font=f(SANSB, 46), fill=WEISS, anchor="mm")
    d.line([(B / 2 - 150, 540), (B / 2 + 150, 540)], fill=GOLD, width=3)
    schrift = f(SERIF, 74)
    zeilen = umbrechen(d, titelzeile, schrift, B - 220)
    y = 760
    for z in zeilen:
        d.text((B / 2, y), z, font=schrift, fill=CREME, anchor="mm")
        y += 92
    d.text((B / 2, y + 90), "luxestyle.ch", font=f(SANSB, 62), fill=GOLD, anchor="mm")
    d.text((B / 2, y + 176), "Link in Bio", font=f(SANS, 40), fill=WEISS, anchor="mm")
    d.rounded_rectangle([190, y + 250, B - 190, y + 366], radius=58, outline=GOLD, width=3)
    d.text((B / 2, y + 308), "Code  WELCOME10  ·  −10%",
           font=f(SANSB, 40), fill=WEISS, anchor="mm")
    return img


def chf(p):
    return "CHF " + f"{float(p):.2f}".replace(".00", ".–")


def hashtags(tags):
    fest = ["#fyp", "#schweiz", "#luxestyle"]
    karte = {"beauty": "#beauty", "skincare": "#skincare", "pflege": "#selfcare",
             "haustier": "#petsoftiktok", "katze": "#katze", "hund": "#hund",
             "mode": "#outfit", "damen": "#fashion", "kueche": "#kitchenhacks",
             "gadget": "#gadgets", "tech": "#tech", "wohnen": "#interior",
             "aufbewahrung": "#ordnung", "organizer": "#ordnung"}
    extra = []
    for t in tags:
        h = karte.get(t.lower())
        if h and h not in extra:
            extra.append(h)
    return " ".join(fest + extra[:4])


def schreibe(slug, bilder_liste, caption, produkte):
    ordner = os.path.join(AUS, slug)
    os.makedirs(ordner, exist_ok=True)
    pfade = []
    for i, im in enumerate(bilder_liste, 1):
        p = os.path.join(ordner, f"{i:02d}.jpg")
        im.save(p, "JPEG", quality=92, optimize=True)
        pfade.append(os.path.relpath(p, ROOT))
    with open(os.path.join(ordner, "caption.txt"), "w") as fh:
        fh.write(caption + "\n")
    neu = not os.path.exists(QUEUE)
    with open(QUEUE, "a", newline="") as fh:
        w = csv.writer(fh)
        if neu:
            w.writerow(["slug", "modus", "slides", "ordner", "produkte", "caption", "status"])
        w.writerow([slug, MODUS, len(pfade), os.path.relpath(ordner, ROOT),
                    " ".join(produkte), caption.replace("\n", " ⏎ "), "ready"])
    with open(LEDGER, "a") as fh:
        for h in produkte:
            fh.write(f"{h}\t{slug}\t{MODUS}\n")
    return ordner, pfade


def bau_produkt(p, benutzt):
    urls = bilder(p)[:SLIDES - 1]
    tmp = []
    for i, u in enumerate(urls):
        z = f"/tmp/_ttk_{i}.img"
        if lade(u, z):
            tmp.append(z)
    if len(tmp) < 3:
        return None
    preis = chf(p["priceRangeV2"]["minVariantPrice"]["amount"])
    titel = p["title"]
    gesamt = len(tmp) + 1
    slides = [slide_hook(tmp[0], "Neu im Shop", preis, titel, 1, gesamt)]
    for i, z in enumerate(tmp[1:], 2):
        slides.append(slide_produkt(z, titel, preis, i, gesamt))
    slides.append(slide_cta(titel))
    slug = re.sub(r"[^a-z0-9]+", "-", p["handle"].lower())[:46].strip("-")
    cap = (f"{titel} · {preis}\n"
           f"Jetzt im Shop 🇨🇭 luxestyle.ch — Link in Bio\n"
           f"Code WELCOME10 für −10%\n\n{hashtags(p.get('tags') or [])}")
    return slug, slides, cap, [p["handle"]]


def bau_top(kandidaten):
    wahl = kandidaten[:SLIDES - 2]
    if len(wahl) < 3:
        return None
    tmp = []
    for i, p in enumerate(wahl):
        z = f"/tmp/_ttk_top_{i}.img"
        if lade(bilder(p)[0], z):
            tmp.append((p, z))
    if len(tmp) < 3:
        return None
    hoechst = max(float(p["priceRangeV2"]["minVariantPrice"]["amount"]) for p, _ in tmp)
    grenze = int((int(hoechst) // 10 + 1) * 10)   # naechste Zehnerstufe, bleibt wahr
    gesamt = len(tmp) + 2
    hook = f"{len(tmp)} Trend-Teile unter CHF {grenze}"
    slides = [slide_hook(tmp[0][1], "Gerade im Trend", str(len(tmp)),
                         f"Trend-Teile unter CHF {grenze}", 1, gesamt)]
    for i, (p, z) in enumerate(tmp, 2):
        slides.append(slide_produkt(
            z, p["title"], chf(p["priceRangeV2"]["minVariantPrice"]["amount"]),
            i, gesamt, zeile=f"Nr. {i - 1}"))
    slides.append(slide_cta(hook))
    tage = os.environ.get("SLUGZEIT", "")
    slug = re.sub(r"[^a-z0-9]+", "-", f"top-{len(tmp)}-unter-{grenze}-{tage}").strip("-")
    liste = "\n".join(f"{i}. {p['title']} · {chf(p['priceRangeV2']['minVariantPrice']['amount'])}"
                      for i, (p, _) in enumerate(tmp, 1))
    alle_tags = [t for p, _ in tmp for t in (p.get("tags") or [])]
    cap = (f"{hook} 🇨🇭\n\n{liste}\n\n"
           f"Alles auf luxestyle.ch — Link in Bio\nCode WELCOME10 für −10%\n\n"
           f"{hashtags(alle_tags)}")
    return slug, slides, cap, [p["handle"] for p, _ in tmp]


def main():
    prod = hole(QUELLE)
    if not prod:
        print("PAUSE: keine Produkte aus der Kollektion geholt (Shopify?)")
        return
    benutzt = schon_verwendet()
    mind = 3 if MODUS == "produkt" else 1
    frei = [p for p in prod if geeignet(p, mind) and p["handle"] not in benutzt]
    print(f"{len(prod)} in «{QUELLE}» | geeignet und noch nie beworben: {len(frei)}")
    if not frei:
        print("FERTIG: 0 Karussells gebaut (nichts Neues verfügbar)")
        return
    if DRY:
        for p in frei[:12]:
            print("   +", p["title"], chf(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                  f"({len(bilder(p))} taugliche Bilder)")
        print(f"FERTIG (DRY): {len(frei)} Kandidaten, nichts geschrieben")
        return

    gebaut = 0
    for _ in range(ANZAHL):
        if MODUS == "top":
            r = bau_top(frei)
            if not r:
                break
            frei = [p for p in frei if p["handle"] not in r[3]]
        else:
            if not frei:
                break
            r = bau_produkt(frei.pop(0), benutzt)
            if not r:
                continue
        slug, slides, cap, handles = r
        ordner, pfade = schreibe(slug, slides, cap, handles)
        gebaut += 1
        print(f"   ✔ {slug}: {len(pfade)} Slides → {os.path.relpath(ordner, ROOT)}")
    print(f"FERTIG: {gebaut} Karussells gebaut, Queue {os.path.relpath(QUEUE, ROOT)}")


if __name__ == "__main__":
    main()
