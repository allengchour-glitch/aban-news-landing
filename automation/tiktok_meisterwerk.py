#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_meisterwerk — setzt die besten fertigen Beitraege zu EINEM Kompilations-Reel zusammen.

WARUM SO: Jeder Hook-Slide (01.jpg) ist bereits gebrandet, faktengeprueft (Titel+Preis gegen
den Shop) und auf 1080x1920 gerendert. Die Kompilation erfindet also NICHTS neu — sie reiht
gepruefte Slides und laesst den bewaehrten Renderer (tiktok_video.py) schneiden. Kein zweiter
Faktencheck noetig, keine neue Fehlerquelle.

AUFBAU: Intro-Karte (Markenstil) → je Produkt der Hook-Slide mit grossem Preis → CTA-Abschluss.
Nur Beitraege aus dropship/tiktok_queue.json mit "frei": true (Preis+ACTIVE heute geprueft).

ENV: MAXP (max. Produkte, 6) · SEK (an tiktok_video.py durchgereicht, 2.2)
"""
import json, os, re, shutil, subprocess, sys, datetime

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
sys.path.insert(0, HIER)
os.chdir(ROOT)

import tiktok_karussell as K  # Slide-Bausteine + Markenkonstanten wiederverwenden
from PIL import Image, ImageDraw
from tiktok_biolink import cta_zeile

MAXP = int(os.environ.get("MAXP", "6"))
TAG = datetime.date.today().strftime("%m%d")
SLUG = f"meisterwerk-{TAG}"
BASIS = os.path.join(ROOT, "social", "tiktok")
ZIEL = os.path.join(BASIS, SLUG)


def intro_karte(anzahl):
    img = Image.new("RGB", (K.B, K.H), K.INK)
    d = ImageDraw.Draw(img)
    for i in range(3):
        d.rectangle([54 + i, 54 + i, K.B - 54 - i, K.H - 54 - i], outline=K.GOLD)
    d.text((K.B / 2, 560), "L U X E S T Y L E", font=K.f(K.SANSB, 46), fill=K.WEISS, anchor="mm")
    d.line([(K.B / 2 - 150, 630), (K.B / 2 + 150, 630)], fill=K.GOLD, width=3)
    d.text((K.B / 2, 730), "GERADE IM TREND", font=K.f(K.SANSB, 40), fill=K.GOLD, anchor="mm")
    schrift = K.f(K.SERIF, 92)
    d.text((K.B / 2, 860), "Highlights", font=schrift, fill=K.CREME, anchor="mm")
    d.text((K.B / 2, 972), "der Woche", font=schrift, fill=K.CREME, anchor="mm")
    d.text((K.B / 2, 1120), f"{anzahl} Produkte · Schweizer Shop",  # kein Flaggen-Emoji: PIL rendert Kaestchen
           font=K.f(K.SANS, 42), fill=K.WEISS, anchor="mm")
    d.text((K.B / 2, 1260), "→ dranbleiben", font=K.f(K.SANSB, 38), fill=K.GOLD, anchor="mm")
    return img


def produkt_slide(slug, tmpnr):
    """Frischer Hook-Slide OHNE Karussell-Artefakte (kein Zaehler, kein «weiterwischen»).

    Live vom Shop geholt statt vom alten Slide kopiert — damit sind Titel und Preis zum
    Zeitpunkt des Meisterwerks erneut belegt, nicht nur zum Zeitpunkt des Karussells.
    """
    d = K.gql("""query($q:String!){products(first:1,query:$q){nodes{
        title status priceRangeV2{minVariantPrice{amount}}
        media(first:8){nodes{... on MediaImage{image{url width height}}}}}}}""",
        {"q": f"handle:{slug}"})
    n = ((((d or {}).get("data") or {}).get("products") or {}).get("nodes") or [])
    if not n:
        # abgeschnittener Alt-Slug: genau EIN Prefix-Treffer ist eindeutig
        d = K.gql("""query($q:String!){products(first:3,query:$q){nodes{
            title status priceRangeV2{minVariantPrice{amount}}
            media(first:8){nodes{... on MediaImage{image{url width height}}}}}}}""",
            {"q": f"handle:{slug}*"})
        n = ((((d or {}).get("data") or {}).get("products") or {}).get("nodes") or [])
        if len(n) != 1:
            return None
    if n[0]["status"] != "ACTIVE":
        return None
    p = n[0]
    urls = K.bilder(p)
    if not urls:
        return None
    tmp = f"/tmp/_mw_{tmpnr}.img"
    if not K.lade(urls[0], tmp):
        return None
    preis = K.chf(p["priceRangeV2"]["minVariantPrice"]["amount"])
    return K.slide_hook(tmp, "Neu im Shop", preis, p["title"], None, None, wisch=False)


def main():
    q = json.load(open(os.path.join(ROOT, "dropship", "tiktok_queue.json")))
    slides = []
    for b in q.get("beitraege", []):
        s = b.get("slug", "")
        if not b.get("frei") or s.startswith(("top-", "meisterwerk")):
            continue
        img = produkt_slide(s, len(slides))
        if img is not None:
            slides.append(img)
        if len(slides) >= MAXP:
            break
    if len(slides) < 3:
        print(f"Nur {len(slides)} freie Produkt-Slides — kein Meisterwerk. Ende.")
        return
    os.makedirs(ZIEL, exist_ok=True)
    n = 1
    intro_karte(len(slides)).save(os.path.join(ZIEL, f"{n:02d}.jpg"), "JPEG", quality=92); n += 1
    for img in slides:
        img.save(os.path.join(ZIEL, f"{n:02d}.jpg"), "JPEG", quality=92); n += 1
    K.slide_cta("Alle Highlights im Shop").save(os.path.join(ZIEL, f"{n:02d}.jpg"), "JPEG", quality=92)
    cap = (f"Die Highlights der Woche 🇨🇭\n{cta_zeile()}\n"
           f"Code WELCOME10 für −10%\n\n#fyp #schweiz #luxestyle #haul #musthaves")
    with open(os.path.join(ZIEL, "caption.txt"), "w") as fh:
        fh.write(cap + "\n")
    print(f"{n} Slides → {ZIEL}")
    env = dict(os.environ, SLUG=SLUG, SEK=os.environ.get("SEK", "2.2"))
    r = subprocess.run(["python3", os.path.join(HIER, "tiktok_video.py")], env=env)
    if r.returncode != 0:
        print("Renderer scheiterte — Slides liegen trotzdem bereit.")
    print("FERTIG:", SLUG)


if __name__ == "__main__":
    main()
