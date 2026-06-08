"""OG-Bild für die KI-Compliance-Pakete (1200×630). Run: python3 generate_compliance_og.py"""
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
AMBER, AMBER_DK, CREAM, INK, MUTED, BG = (217,119,6),(180,83,9),(254,243,199),(31,41,55),(107,114,128),(255,251,245)


def font(size, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def build():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.ellipse([W-520,-260,W+260,360], fill=CREAM); d.rectangle([0,0,16,H], fill=AMBER)
    d.text((70,70), "☕  aban news", font=font(34), fill=AMBER_DK)
    bf = font(24); badge = "EU AI ACT · DSGVO · BERUFSRECHT"
    bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=CREAM)
    d.text((92,152), badge, font=bf, fill=AMBER_DK)
    d.text((70,208), "KI rechtssicher", font=font(80), fill=INK)
    d.text((70,208+88), "einsetzen", font=font(80), fill=INK)
    d.text((70,208+88+96), "Richtlinie + Checkliste + sichere Prompts", font=font(38), fill=AMBER_DK)
    d.text((70,H-78), "Ärzt:innen · Anwält:innen · Steuerberater:innen  ·  abannews.com", font=font(26, bold=False), fill=MUTED)
    img.save(os.path.join(ROOT, "og-compliance.png"), "PNG"); print("✓ og-compliance.png")


if __name__ == "__main__":
    build()
