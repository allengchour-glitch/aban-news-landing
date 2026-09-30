#!/usr/bin/env python3
"""fotos_reel.py — Hochformat-Reel (1080×1920) aus eigenen Fotos, z. B. Kundinnen-/Modelfotos (30.09.2026).

Anlass: Betreiber 30.09. «hast du noch fotos von tati? … shop … und app» — Tatis Fotos (Einwilligung 04.09.: Shop + Social,
Markierung @tatjanalarsinamoira Pflicht, siehe dropship/KUNDIN-MODEL.md) sollen als «bestes Bildervideo» auf Social.
Die Fotos liegen NIE im Repo (erkennbare Person, öffentliches Repo, Widerrufsrecht) — dieses Skript bekommt Pfade.

Aufbau (gemessene Regeln aus dem Videoschnitt-Skill): Einstieg ≠ Standbild — die erste Sekunde sind drei harte Schnitte
à 0,4 s (das Meisterwerk-Tor misst Bewegung in Sekunde 1, eine Ken-Burns-Fahrt allein bleibt unter 3,0); danach Dias à 2,0 s
mit Ken Burns 1,000 → 1,045 (stärker schneidet Köpfe an, Lehre 04.09.), ganzes Foto sichtbar (Breite 1080, unscharfer Grund
oben/unten statt Beschnitt — Mode braucht die ganze Figur); Marke oben, Hook in den ersten 3 s, unten Produktname + LIVE-Preis;
Schlusskarte mit allen Produkten + «luxestyle.ch · Link in Bio». Text nur per PIL (ffmpeg hier ohne drawtext). Musik aus
automation/music/ (Einstieg aus _einstiege.json), Ton -14 LUFS.

  python3 automation/reel/fotos_reel.py --plan plan.json --out /tmp/x.mp4
  plan.json: {"hook": "...", "musik": "luxe-orchestra.wav", "intro": ["a.jpg","b.jpg","c.jpg"],
              "dias": [{"bild": "a.jpg", "produkt": 0}, ...], "produkte": [{"name": "...", "preis": "24.90", "bild": "a.jpg"}]}
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD, WEISS, DUNKEL = (212, 175, 55), (255, 255, 255), (18, 18, 18)


def grund(img):
    s = max(W / img.width, H / img.height)
    bg = img.resize((int(img.width * s) + 1, int(img.height * s) + 1)).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(45))
    return Image.blend(bg, Image.new("RGB", (W, H), DUNKEL), 0.5)


FOTO_OBEN, FOTO_UNTEN = 360, 1535          # 30.09.: Foto zwischen Hook-Zone (bis 330) und Produktband (ab 1560) — der Hook
                                            # lag im ersten Render über dem Kopf (Kontaktbogen)


def bild_frame(img, bg, zoom):
    """ganzes Foto im Feld 360–1535 (höchstens volle Breite), mittig; zoom ≥ 1 vergrössert mit OBEN verankertem Rand —
    ein Zoom um die Mitte schnitt im ersten Render die Haare an (Köpfe stehen oben im Bild, Lehre 04.09.)."""
    fh = FOTO_UNTEN - FOTO_OBEN; fw = int(img.width * fh / img.height)
    if fw > W:
        fw = W; fh = int(img.height * W / img.width)
    fg = img.resize((int(fw * zoom), int(fh * zoom)))
    x0 = (fg.width - fw) // 2
    fg = fg.crop((x0, 0, x0 + fw, fh))
    out = bg.copy(); out.paste(fg, ((W - fw) // 2, FOTO_OBEN + (FOTO_UNTEN - FOTO_OBEN - fh) // 2))
    return out


def ebene(hook, produkt, schluss=False):
    """transparente Textebene (RGBA)."""
    e = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(e)
    fm, fh, fp, fn = (ImageFont.truetype(F_SERIF, 58), ImageFont.truetype(F_BOLD, 60),
                      ImageFont.truetype(F_BOLD, 74), ImageFont.truetype(F_BOLD, 50))
    d.text((W / 2, 150), "L U X E S T Y L E", font=fm, fill=GOLD, anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
    if hook:
        d.rounded_rectangle((70, 215, W - 70, 330), 24, fill=(0, 0, 0, 150))
        d.text((W / 2, 272), hook, font=fh, fill=WEISS, anchor="mm")
    if produkt:
        d.rounded_rectangle((90, 1560, W - 90, 1760), 26, fill=(0, 0, 0, 160))
        d.text((W / 2, 1615), produkt["name"], font=fn, fill=WEISS, anchor="mm")
        d.text((W / 2, 1700), f"CHF {produkt['preis']}", font=fp, fill=GOLD, anchor="mm")
    return e


def schlusskarte(produkte, bilder):
    bg = grund(bilder[0]); d = ImageDraw.Draw(bg)
    n = len(produkte); bw = (W - 60 * (n + 1)) // n
    for i, (p, im) in enumerate(zip(produkte, bilder)):
        t = im.copy(); t.thumbnail((bw, 880))
        x = 60 + i * (bw + 60) + (bw - t.width) // 2
        bg.paste(t, (x, 420))
        fn = ImageFont.truetype(F_BOLD, 38); mx = 60 + i * (bw + 60) + bw / 2
        zeilen, z = [], ""                  # 30.09.: Namen umbrechen — nebeneinander überlappten sie (Kontaktbogen)
        for w in p["name"].split():
            if d.textlength((z + " " + w).strip(), font=fn) <= bw: z = (z + " " + w).strip()
            else: zeilen.append(z); z = w
        zeilen.append(z)
        y0 = 420 + t.height + 60             # 30.09.: direkt unter dem Bild (feste 1350 liessen eine Lücke von ~330 px)
        for j, zl in enumerate(zeilen[:2]):
            d.text((mx, y0 + j * 46), zl, font=fn, fill=WEISS, anchor="mm")
        d.text((mx, y0 + 46 * min(2, len(zeilen)) + 50), f"CHF {p['preis']}", font=ImageFont.truetype(F_BOLD, 62), fill=GOLD, anchor="mm")
    d.text((W / 2, 150), "L U X E S T Y L E", font=ImageFont.truetype(F_SERIF, 58), fill=GOLD, anchor="mm")
    d.text((W / 2, 1600), "luxestyle.ch  ·  Link in Bio", font=ImageFont.truetype(F_BOLD, 52), fill=WEISS, anchor="mm")
    # 30.09.: NICHT «Versand aus der Schweiz» — CJ-Ware kommt aus China (2–4 Wochen); die Regel steht in jeder Caption
    d.text((W / 2, 1680), "Klarna  ·  TWINT  ·  Gratis Versand ab CHF 50", font=ImageFont.truetype(F_REG, 38), fill=WEISS, anchor="mm")
    return bg


def main():
    a = argparse.ArgumentParser(); a.add_argument("--plan", required=True); a.add_argument("--out", required=True)
    args = a.parse_args()
    plan = json.load(open(args.plan))
    prods = plan["produkte"]
    tmp = tempfile.mkdtemp(prefix="fotosreel_")
    n = 0

    def schreibe(img):
        nonlocal n
        img.convert("RGB").save(f"{tmp}/f{n:05d}.jpg", quality=90); n += 1

    lade = lambda p: Image.open(p).convert("RGB")
    # 1) Intro: drei harte Schnitte à 0,4 s (Bewegung in Sekunde 1), Hook sichtbar
    for pfad in plan["intro"]:
        img = lade(pfad); bg = grund(img); lay = ebene(plan["hook"], None)
        for k in range(int(0.4 * FPS)):
            f = bild_frame(img, bg, 1.0 + 0.03 * k / (0.4 * FPS)); f.paste(lay, (0, 0), lay); schreibe(f)
    # 2) Dias à 2,0 s, Ken Burns 1,000 → 1,045; Hook bis Sekunde 3
    t = 1.2
    for dia in plan["dias"]:
        img = lade(dia["bild"]); bg = grund(img); p = prods[dia["produkt"]]
        for k in range(int(2.0 * FPS)):
            lay = ebene(plan["hook"] if t < 3.0 else None, p)
            f = bild_frame(img, bg, 1.0 + 0.045 * k / (2.0 * FPS)); f.paste(lay, (0, 0), lay); schreibe(f); t += 1 / FPS
    # 3) Schlusskarte 2,4 s
    karte = schlusskarte(prods, [lade(p["bild"]) for p in prods])
    for k in range(int(2.4 * FPS)):
        schreibe(karte)
    dauer = n / FPS
    musik = os.path.join(REPO, "automation/music", plan["musik"])
    ein = json.load(open(os.path.join(REPO, "automation/music/_einstiege.json"))).get(plan["musik"], {}).get("einstiege", [0])[0]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/f%05d.jpg", "-ss", str(ein), "-i", musik,
                    "-t", f"{dauer:.2f}", "-filter_complex",
                    f"[1:a]aresample=48000,afade=t=in:d=0.3,afade=t=out:st={dauer - 1:.2f}:d=1,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", args.out], check=True)
    subprocess.run(["rm", "-rf", tmp])
    print(json.dumps({"out": args.out, "dauer": round(dauer, 2), "bilder": n}))


if __name__ == "__main__":
    sys.exit(main())
