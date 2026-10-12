#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bild_text_weg.py — eingeblendeten Werbetext aus einem Produktbild entfernen, aber NUR auf gleichmässigem Grund (12.10.2026).

ANLASS: Google sperrt Gratis-Einträge mit «Promotional overlay on image» (31 Produkte, gemessen 12.10.). Beim Bildtausch fand
sich für die Hälfte kein sauberes Ersatzbild. Viele Hauptbilder tragen nur ein Etikett auf hellem Grund («RED», «12pcs/set»,
«2 in 1», «02#») — das lässt sich entfernen, ohne den Artikel anzufassen.

REGEL (mit Absicht streng):
  1. Text finden (Tesseract, Englisch, Wörter mit Konfidenz ≥ 55 und ≥ 2 Buchstaben/Ziffern).
  2. Jede Textgruppe wird nur gefüllt, wenn ihr RAND gleichmässig ist (Streuung ≤ 14 je Farbkanal) und sie ≤ 15 % des Bildes
     belegt. Ist EINE Gruppe unsicher (Text auf dem Artikel, auf Foto, auf Verlauf), bleibt das GANZE Bild unverändert.
  3. Gefüllt wird mit der Randfarbe (Median). Danach erneut lesen: Erfolg nur bei 0 Wörtern.
  4. Die Füllfarbe muss zum NÄCHSTEN Bildrand auf gleicher Höhe/Breite passen (Abstand ≤ 12): Text auf einem farbigen Werbebalken bleibt unangetastet,
     sonst stünde danach ein leerer Balken im Bild.

  python3 tools/bild_text_weg.py --selbsttest
  python3 tools/bild_text_weg.py bild.jpg [ausgabe.png]      # Ergebnis als JSON, schreibt nur bei Status «bereinigt»
"""
import json, os, re, statistics, sys, tempfile

import pytesseract
from PIL import Image, ImageDraw, ImageFont

KONF = 55
STREUUNG = 14
MAX_ANTEIL = 0.15
RAND_ABSTAND = 12


def _naechster_rand(img, box, breite=4):
    """Median-Farbe des Bildrands, der der Box am nächsten liegt — auf ihrer Höhe/Breite. Ein Verlauf im Hintergrund
    (oben grau, unten weiss) ist dort gleich wie neben dem Text; ein abgesetzter Werbebalken nicht."""
    px = img.load()
    w, h = img.size
    x0, y0, x1, y1 = box
    abst = {"oben": y0, "unten": h - y1, "links": x0, "rechts": w - x1}
    seite = min(abst, key=abst.get)
    if seite in ("oben", "unten"):
        ys = range(breite) if seite == "oben" else range(h - breite, h)
        werte = [px[x, y] for x in range(x0, max(x0 + 1, x1)) for y in ys]
    else:
        xs = range(breite) if seite == "links" else range(w - breite, w)
        werte = [px[x, y] for y in range(y0, max(y0 + 1, y1)) for x in xs]
    return tuple(int(statistics.median([p[c] for p in werte])) for c in range(3))


def _woerter(img):
    """Wortkästen in Bildkoordinaten. Kleine Bilder werden fürs Lesen verdoppelt."""
    f = 2 if img.width < 1000 else 1
    lese = img.convert("L").resize((img.width * f, img.height * f)) if f > 1 else img.convert("L")
    d = pytesseract.image_to_data(lese, lang="eng", config="--psm 11", output_type=pytesseract.Output.DICT)
    out = []
    for i, t in enumerate(d["text"]):
        try:
            k = float(d["conf"][i])
        except ValueError:
            continue
        if k < KONF or len(re.sub(r"[^A-Za-z0-9]", "", t or "")) < 2:
            continue
        x, y, w, h = (d[k2][i] // f for k2 in ("left", "top", "width", "height"))
        out.append([x, y, x + w, y + h, t])
    return out


def _gruppen(woerter, w, h):
    """Nahe Wörter zu Gruppen zusammenfassen (Rand je nach Schrifthöhe)."""
    boxen = []
    for x0, y0, x1, y1, _ in woerter:
        p = max(4, int((y1 - y0) * 0.35))
        boxen.append([max(0, x0 - p), max(0, y0 - p), min(w, x1 + p), min(h, y1 + p)])
    geaendert = True
    while geaendert:
        geaendert = False
        for i in range(len(boxen)):
            for j in range(i + 1, len(boxen)):
                a, b = boxen[i], boxen[j]
                if a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]:
                    boxen[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    boxen.pop(j)
                    geaendert = True
                    break
            if geaendert:
                break
    return boxen


def _rand(img, box, breite=6):
    """Pixel des Rings um die Box (innerhalb des Bildes)."""
    x0, y0, x1, y1 = box
    px = img.load()
    werte = []
    for x in range(max(0, x0 - breite), min(img.width, x1 + breite)):
        for y in list(range(max(0, y0 - breite), y0)) + list(range(y1, min(img.height, y1 + breite))):
            werte.append(px[x, y])
    for y in range(y0, y1):
        for x in list(range(max(0, x0 - breite), x0)) + list(range(x1, min(img.width, x1 + breite))):
            werte.append(px[x, y])
    return werte


def bearbeite(img):
    """→ (status, info, neues_bild|None). status: sauber | bereinigt | unsicher | rest_text."""
    img = img.convert("RGB")
    w, h = img.size
    woerter = _woerter(img)
    if not woerter:
        return "sauber", {"woerter_vorher": 0}, None
    boxen = _gruppen(woerter, w, h)
    fuellung = []
    for b in boxen:
        anteil = (b[2] - b[0]) * (b[3] - b[1]) / float(w * h)
        ring = _rand(img, b)
        if anteil > MAX_ANTEIL or len(ring) < 20:
            return "unsicher", {"woerter_vorher": len(woerter), "grund": f"Box {anteil:.0%} des Bildes"}, None
        streu = max(statistics.pstdev([p[c] for p in ring]) for c in range(3))
        if streu > STREUUNG:
            return "unsicher", {"woerter_vorher": len(woerter), "grund": f"Rand unruhig (Streuung {streu:.0f})",
                                "text": " ".join(t for *_, t in woerter)[:80]}, None
        farbe = tuple(int(statistics.median([p[c] for p in ring])) for c in range(3))
        # 12.10.: Liegt der Text auf einem Balken, der sich vom Bildrand abhebt, bliebe nach dem Füllen ein LEERER
        # Werbebalken stehen (gemessen an einer Drohne: grauer Balken + Symbol). Dann lieber nichts ändern.
        rand_bild = _naechster_rand(img, b)
        abstand = max(abs(farbe[c] - rand_bild[c]) for c in range(3))
        if abstand > RAND_ABSTAND:
            return "unsicher", {"woerter_vorher": len(woerter), "grund": f"Text auf Balken (Abstand zur Randfarbe {abstand})",
                                "text": " ".join(t for *_, t in woerter)[:80]}, None
        fuellung.append((b, farbe))
    neu = img.copy()
    d = ImageDraw.Draw(neu)
    for b, farbe in fuellung:
        d.rectangle(b, fill=farbe)
    rest = _woerter(neu)
    info = {"woerter_vorher": len(woerter), "woerter_nachher": len(rest), "gruppen": len(boxen),
            "text": " ".join(t for *_, t in woerter)[:80]}
    if rest:
        return "rest_text", info, None
    return "bereinigt", info, neu


def _schrift(px):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, px)
    return ImageFont.load_default()


def selbsttest():
    """Drei Fälle an Kopien in einem Temp-Ordner. Gegenprobe: Fall 1 MUSS Text finden, Fall 2 MUSS ablehnen."""
    import random
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        # 1. heller Grund + Artikel (Kreis) + Etikett «SALE 50%» oben rechts → bereinigt, Artikel unverändert
        a = Image.new("RGB", (800, 800), (246, 246, 246))
        dr = ImageDraw.Draw(a)
        dr.ellipse((250, 250, 550, 550), fill=(40, 70, 120))
        dr.text((560, 40), "SALE 50%", fill=(10, 10, 10), font=_schrift(54))
        p1 = os.path.join(tmp, "fall1.png"); a.save(p1)
        st, info, neu = bearbeite(Image.open(p1))
        artikel_gleich = neu is not None and neu.crop((250, 250, 550, 550)).tobytes() == a.crop((250, 250, 550, 550)).tobytes()
        f1 = st == "bereinigt" and info["woerter_vorher"] >= 1 and info["woerter_nachher"] == 0 and artikel_gleich
        print(f"{'OK  ' if f1 else 'FEHL'} Fall 1 Etikett auf hellem Grund → {st} {info} · Artikel unverändert: {artikel_gleich}")
        ok &= f1
        # 2. gleicher Text auf Rauschen (Foto-Ersatz) → unsicher, nichts ändern
        random.seed(7)
        b = Image.new("RGB", (800, 800))
        b.putdata([(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)) for _ in range(800 * 800)])
        ImageDraw.Draw(b).rectangle((540, 30, 790, 110), fill=(255, 255, 255))
        ImageDraw.Draw(b).text((560, 40), "SALE 50%", fill=(10, 10, 10), font=_schrift(54))
        st2, info2, neu2 = bearbeite(b)
        f2 = st2 in ("unsicher", "sauber") and neu2 is None
        print(f"{'OK  ' if f2 else 'FEHL'} Fall 2 Text auf unruhigem Grund → {st2} {info2}")
        ok &= f2
        # 3. ohne Text → sauber
        c = Image.new("RGB", (800, 800), (250, 250, 250))
        ImageDraw.Draw(c).ellipse((250, 250, 550, 550), fill=(180, 30, 30))
        st3, info3, _ = bearbeite(c)
        f3 = st3 == "sauber"
        print(f"{'OK  ' if f3 else 'FEHL'} Fall 3 ohne Text → {st3}")
        ok &= f3
        # 4. weisses Bild, grauer Werbebalken mit Text oben → unsicher (sonst bliebe ein leerer Balken)
        e = Image.new("RGB", (800, 800), (255, 255, 255))
        de = ImageDraw.Draw(e)
        de.rectangle((40, 40, 620, 130), fill=(222, 222, 222))
        de.text((70, 55), "HD 4K DUAL", fill=(30, 30, 30), font=_schrift(54))
        de.ellipse((250, 300, 550, 600), fill=(30, 30, 30))
        st4, info4, neu4 = bearbeite(e)
        f4 = st4 == "unsicher" and neu4 is None and "Balken" in info4.get("grund", "")
        print(f"{'OK  ' if f4 else 'FEHL'} Fall 4 Text auf grauem Balken → {st4} {info4.get('grund', '')}")
        ok &= f4
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    st, info, neu = bearbeite(Image.open(sys.argv[1]))
    if neu is not None and len(sys.argv) > 2:
        neu.save(sys.argv[2])
    print(json.dumps({"status": st, **info}, ensure_ascii=False))
