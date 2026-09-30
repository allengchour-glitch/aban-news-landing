#!/usr/bin/env python3
"""anzeige_bauen.py — TikTok-Anzeigenvideo (1080×1920, 30 fps) aus einem Produktclip + Produktfotos (01.10.2026).

Anlass: Betreiber 01.10. «mach du bis kein geld drauf ist für lernen» + «ein meisterwerk mit checken» — Lernkampagne
mit dem vorhandenen TikTok-Guthaben (dropship/TIKTOK-LERN-KAMPAGNE.md). Die Produktclips sind 5 s kurz (Veo/CJ),
schnitt.py verlangt ≥ 8 s sauberes Material (Exit 3) — deshalb eigener Aufbau:

  0,0–1,0 s  drei harte Schnitte auf Produktfotos (Farben/Ansichten) mit leichtem Zoom → Bewegung in Sekunde 1
             (Meisterwerk-Tor HOOK ≥ 3,0; der Veo-Clip allein ist fast ein Standbild)
  1,0–~6 s   Produktclip (9:16 = Vollbild oben verankert, sonst auf unscharfem Grund)
  danach     1–3 weitere Fotos (Ken Burns 1,000 → 1,045)
  Schluss    2,5 s Karte: Produktfoto, Name, LIVE-Preis, «TWINT · Rechnung (Klarna) · Karte», luxestyle.ch

Text nur per PIL (ffmpeg hier ohne drawtext), Hook ≤ 24 Zeichen in der Zone y 300–420, Produktband y 1250–1420
(über der TikTok-Anzeigenleiste), keine Stimme, Musik aus automation/music/ (episch/Orchester, _gesperrt.txt beachtet),
−14 LUFS. Der Preis kommt aus dem Plan und MUSS vorher live aus Shopify gelesen sein (Aufrufer).

  python3 automation/reel/anzeige_bauen.py --plan plan.json --out /tmp/x.mp4
  plan: {"hook","name","preis","zeile2","musik","clip","clip_start":0,"intro":[3 Bilder],"nach":[Bilder],"schluss_bild"}
"""
import argparse, json, os, subprocess, sys, tempfile
import av
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD, WEISS, DUNKEL = (212, 175, 55), (255, 255, 255), (16, 16, 16)
ZONE_OBEN, ZONE_UNTEN = 420, 1250          # Medienfeld, wenn das Bild breiter als 3:4 ist (01.10.: 440–1240 liess Quadrate klein)


def grund(img):
    s = max(W / img.width, H / img.height)
    bg = img.resize((int(img.width * s) + 1, int(img.height * s) + 1)).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(40))
    return Image.blend(bg, Image.new("RGB", (W, H), DUNKEL), 0.45)


def bild(img, zoom=1.0):
    """Hochformat bis 3:4 (Seitenverhältnis ≤ 0,80) steht gross UNTER der Textzone (y 430–1730), Breite folgt der
    Höhe, höchstens 1080 (3:4 seitlich beschnitten); breitere Bilder liegen ganz sichtbar im Medienfeld.
    01.10.: mit Grenze 0,70 lag das 3:4-Leinen-Set klein in der Mitte (Tor: STILL 55 %); danach legte das Vollbild
    (oben verankert) Schriftzug + Hook über das Gesicht des Models (Kontaktbogen) — Gesichter bleiben frei, der Saum
    endet über der TikTok-Leiste."""
    r = img.width / img.height
    if r <= 0.80:
        bg = grund(img)
        fh = 1300; fw = int(img.width * fh / img.height)
        g = img.resize((int(fw * zoom), int(fh * zoom)))
        x0, y0 = (g.width - fw) // 2, (g.height - fh) // 2
        g = g.crop((x0, y0, x0 + fw, y0 + fh))          # Zoom um die Mitte, Rahmen bleibt fest
        if fw > W:
            x = (fw - W) // 2; g = g.crop((x, 0, x + W, fh)); fw = W
        bg.paste(g, ((W - fw) // 2, 430))
        return bg
    bg = grund(img)
    fh = ZONE_UNTEN - ZONE_OBEN; fw = int(img.width * fh / img.height)
    if fw > W:
        fw = W; fh = int(img.height * W / img.width)
    fg = img.resize((int(fw * zoom), int(fh * zoom)))
    x0 = (fg.width - fw) // 2
    fg = fg.crop((x0, 0, x0 + fw, fh))
    bg.paste(fg, ((W - fw) // 2, ZONE_OBEN + (ZONE_UNTEN - ZONE_OBEN - fh) // 2))
    return bg


def text_zentriert(d, y, t, font, fill, box=None, pad=22):
    if box:
        w = d.textlength(t, font=font)
        d.rounded_rectangle((W / 2 - w / 2 - pad, y - font.size * 0.75, W / 2 + w / 2 + pad, y + font.size * 0.75), 22, fill=box)
    d.text((W / 2, y), t, font=font, fill=fill, anchor="mm")


def ebene(plan, hook, band):
    e = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(e)
    text_zentriert(d, 250, "L U X E S T Y L E", ImageFont.truetype(F_SERIF, 46), GOLD, box=(0, 0, 0, 110), pad=18)
    if hook:
        text_zentriert(d, 360, plan["hook"], ImageFont.truetype(F_BOLD, 64), WEISS, box=(0, 0, 0, 165))
    if band:
        d.rounded_rectangle((110, 1255, W - 110, 1415), 26, fill=(0, 0, 0, 165))
        d.text((W / 2, 1300), plan["name"], font=ImageFont.truetype(F_BOLD, 46), fill=WEISS, anchor="mm")
        d.text((W / 2, 1368), f"CHF {plan['preis']}", font=ImageFont.truetype(F_BOLD, 62), fill=GOLD, anchor="mm")
    return e


def schlusskarte(plan, img, zoom=1.0):
    """zoom: das Produktbild in der Karte fährt langsam heran — eine stehende Karte (2,5 s) allein trug ~25 % STILL."""
    bg = grund(img); d = ImageDraw.Draw(bg)
    t = img.copy(); t.thumbnail((720, 820))
    tw, th = t.width, t.height
    z = t.resize((int(tw * zoom), int(th * zoom))); x0, y0 = (z.width - tw) // 2, (z.height - th) // 2
    t = z.crop((x0, y0, x0 + tw, y0 + th))
    bg.paste(t, ((W - t.width) // 2, 330))
    y = 330 + t.height + 70
    d.text((W / 2, 250), "L U X E S T Y L E", font=ImageFont.truetype(F_SERIF, 50), fill=GOLD, anchor="mm")
    d.text((W / 2, y), plan["name"], font=ImageFont.truetype(F_BOLD, 50), fill=WEISS, anchor="mm")
    d.text((W / 2, y + 85), f"CHF {plan['preis']}", font=ImageFont.truetype(F_BOLD, 84), fill=GOLD, anchor="mm")
    if plan.get("zeile2"):
        d.text((W / 2, y + 165), plan["zeile2"], font=ImageFont.truetype(F_REG, 38), fill=WEISS, anchor="mm")
    # 01.10. Kritik (ChatGPT/Kimi): «Kauf auf Rechnung · Klarna · TWINT» liest sich, als sei TWINT Rechnungskauf
    d.text((W / 2, y + 225), "TWINT · Rechnung (Klarna) · Karte", font=ImageFont.truetype(F_REG, 38), fill=WEISS, anchor="mm")
    d.text((W / 2, y + 300), "luxestyle.ch", font=ImageFont.truetype(F_BOLD, 52), fill=WEISS, anchor="mm")
    return bg


def clip_bilder(pfad, start, dauer):
    c = av.open(pfad); s = c.streams.video[0]
    fr = [f.to_image().convert("RGB") for f in c.decode(s)]
    quelle_fps = float(s.average_rate); c.close()
    n = int(dauer * FPS)
    return [fr[min(len(fr) - 1, int((start + k / FPS) * quelle_fps))] for k in range(n)], len(fr) / quelle_fps


def main():
    a = argparse.ArgumentParser(); a.add_argument("--plan", required=True); a.add_argument("--out", required=True)
    args = a.parse_args()
    plan = json.load(open(args.plan))
    if len(plan["hook"]) > 24:
        sys.exit(f"Hook > 24 Zeichen: {plan['hook']!r}")
    gesperrt = open(os.path.join(REPO, "automation/music/_gesperrt.txt")).read()
    if plan["musik"] in gesperrt:
        sys.exit(f"Musik gesperrt: {plan['musik']}")
    tmp = tempfile.mkdtemp(prefix="anzeige_"); n = 0

    def schreibe(img):
        nonlocal n
        img.convert("RGB").save(f"{tmp}/f{n:05d}.jpg", quality=92); n += 1

    lade = lambda p: Image.open(p).convert("RGB")
    t = 0.0
    lay_hook, lay_band = ebene(plan, True, False), ebene(plan, False, True)

    def lage():
        # 01.10. Jury: Hook und Preisband gleichzeitig (1,0–2,6 s) = «redundant, unübersichtlich» → nacheinander
        return lay_hook if t < 2.6 else lay_band

    # 1) Intro: drei harte Schnitte à 1/3 s mit Zoom-Punch 1,06 → 1,00
    for p in plan["intro"]:
        img = lade(p)
        for k in range(10):
            f = bild(img, 1.06 - 0.06 * k / 10); l = lage(); f.paste(l, (0, 0), l); schreibe(f); t += 1 / FPS
    # 2) Produktclip
    bilder, echt = clip_bilder(plan["clip"], plan.get("clip_start", 0), plan.get("clip_dauer", 5.0))
    cz = plan.get("clip_zoom", 0.0)        # 01.10.: Veo-Clip Sirène im 1300-px-Rahmen = STILL 64 % → langsame Fahrt
    for k, fr in enumerate(bilder):
        f = bild(fr, 1.0 + cz * k / max(1, len(bilder))); l = lage(); f.paste(l, (0, 0), l); schreibe(f); t += 1 / FPS
    # 3) weitere Fotos
    for p in plan.get("nach", []):
        img = lade(p); dauer = plan.get("nach_dauer", 1.2)
        for k in range(int(dauer * FPS)):
            f = bild(img, 1.0 + 0.045 * k / (dauer * FPS)); l = lage(); f.paste(l, (0, 0), l); schreibe(f); t += 1 / FPS
    # 4) Schlusskarte
    kbild = lade(plan["schluss_bild"])
    for k in range(int(2.5 * FPS)):
        schreibe(schlusskarte(plan, kbild, 1.0 + 0.08 * k / (2.5 * FPS)))
    dauer = n / FPS
    musik = os.path.join(REPO, "automation/music", plan["musik"])
    ein = json.load(open(os.path.join(REPO, "automation/music/_einstiege.json"))).get(plan["musik"], {}).get("einstiege", [0])[0]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/f%05d.jpg", "-ss", str(ein), "-i", musik,
                    "-t", f"{dauer:.2f}", "-filter_complex",
                    f"[1:a]aresample=48000,afade=t=in:d=0.2,afade=t=out:st={dauer - 1:.2f}:d=1,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", args.out], check=True)
    subprocess.run(["rm", "-rf", tmp])
    print(json.dumps({"out": args.out, "dauer": round(dauer, 2), "bilder": n, "clip_echt_s": round(echt, 2)}))


if __name__ == "__main__":
    sys.exit(main())
