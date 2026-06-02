#!/usr/bin/env python3
"""
video-pipeline/generate_promo.py — produktionsfertiges Paket für den aban-news-Werbespot.

Setzt das Skript aus docs/WERBEVIDEO-SKRIPT.md + den Regie/Psychologie-Schnitt
(docs/WERBEVIDEO-REGIE-PSYCHOLOGIE.md) in fertige Bausteine um:
  - storyboard_NN.png  — markengetreue 9:16-Frames je Szene (On-Screen-Text + VO-Notiz)
  - voiceover.txt       — reiner VO-Text (zum Einfügen bei ElevenLabs)
  - untertitel.srt      — getimte Untertitel (aus den Szenen-Zeiten)
  - regie.txt           — Szene/Zeit/Bildanweisung (für HeyGen-Aufbau)

Zwei Varianten: A (40 s Haupt-Spot), B (15 s Kurz-Cut). Reines stdlib + Pillow.
Optionale Vertonung via ELEVENLABS_API_KEY (--voice). Output (ausgabe/) git-ignored.

Aufruf:
    python3 generate_promo.py            # baut Variante A + B
    python3 generate_promo.py --voice    # zusätzlich ElevenLabs-VO
"""
import sys
from pathlib import Path

# Brand-Helfer aus der Clip-Pipeline wiederverwenden (gleiche Schrift/Farben).
from generate_clips import (font, wrap, draw_block, _ts, maybe_tts,
                            W, H, AMBER, AMBER_DK, CREAM, INK, MUTED, BG, WHITE)
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "ausgabe" / "werbespot"

# Szenen: (start_s, end_s, voiceover, on_screen_text)
VARIANTE_A = [
    (0, 4,  "Jeden Tag fünf neue KI-Tools, die dein Leben angeblich verändern.", "Noch ein KI-Hype?"),
    (4, 10, "Die meisten brauchst du nie wieder. Und niemand sagt dir ehrlich, welche.", "Ehrlich gesagt: nervig."),
    (10, 20, "aban news ist der tägliche KI-Newsletter auf Deutsch. Fünf Minuten, das Wichtige, ohne Buzzword-Bingo.", "aban news · Mo–Fr · 5 Min"),
    (20, 30, "Was funktioniert, was Geld spart, was du ignorieren kannst — ehrlich eingeordnet, mit Quelle.", "Kein Hype. Nur Signal."),
    (30, 36, "Kostenlos. Kein Spam. Abmelden mit einem Klick.", "Gratis · DSGVO · jederzeit kündbar"),
    (36, 40, "Hol's dir auf abannews punkt com.", "abannews.com — jetzt gratis abonnieren"),
]
VARIANTE_B = [
    (0, 3,  "KI-Hype nervt? Geht mir auch so.", "KI-Hype nervt?"),
    (3, 9,  "aban news: täglich fünf Minuten, das Wichtige zu KI — ehrlich, ohne Buzzwords.", "5 Min · ehrlich · kein Hype"),
    (9, 15, "Kostenlos auf abannews punkt com.", "abannews.com — gratis abonnieren"),
]


def frame(path, *, on_screen, vo, scene_no, total, is_cta=False):
    img = Image.new("RGB", (W, H), INK if is_cta else BG)
    d = ImageDraw.Draw(img)
    fg = WHITE if is_cta else INK
    if is_cta:
        d.ellipse([W - 640, H - 520, W + 360, H + 360], fill=AMBER_DK)
    else:
        d.rectangle([0, 0, 20, H], fill=AMBER)
        d.ellipse([W - 620, -360, W + 320, 420], fill=CREAM)
    # Marke oben
    d.text((70, 90), "☕  aban news", font=font(40), fill=(WHITE if is_cta else AMBER_DK))
    # Szenen-Badge
    badge = f"SZENE {scene_no}/{total}"
    bf = font(30)
    bb = d.textbbox((0, 0), badge, font=bf)
    d.rounded_rectangle([70, 175, 70 + (bb[2]-bb[0]) + 48, 175 + (bb[3]-bb[1]) + 28],
                        radius=18, fill=AMBER if not is_cta else WHITE)
    d.text((94, 189), badge, font=bf, fill=(INK if is_cta else WHITE))
    # On-Screen-Text — groß, mittig
    big = font(88)
    lines = wrap(d, on_screen, big, W - 160)
    block_h = sum(d.textbbox((0, 0), l, font=big)[3] for l in lines) + (len(lines)-1)*18
    y = (H - block_h) // 2 - 80
    for l in lines:
        lw = d.textlength(l, font=big)
        d.text(((W - lw) // 2, y), l, font=big, fill=(AMBER if is_cta else INK))
        y += d.textbbox((0, 0), l, font=big)[3] + 18
    # VO-Notiz unten (für die Produktion, nicht Teil des Bildes im Export)
    vo_f = font(34, bold=False)
    draw_block(d, 70, H - 360, "VO: " + vo, vo_f, (CREAM if is_cta else MUTED), W - 140, line_gap=10)
    d.text((70, H - 110), "abannews.com", font=font(38), fill=(WHITE if is_cta else MUTED))
    img.save(path)


def srt(scenes):
    out = []
    for i, (a, b, vo, _osd) in enumerate(scenes, 1):
        out.append(f"{i}\n{_ts(a)} --> {_ts(b)}\n{vo}\n")
    return "\n".join(out)


def build_variant(name, scenes, do_voice):
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    total = len(scenes)
    regie = [f"# aban-news-Werbespot — Variante {name} ({scenes[-1][1]} s)", ""]
    for i, (a, b, vo, osd) in enumerate(scenes, 1):
        is_cta = (i == total)
        frame(d / f"storyboard_{i:02d}.png", on_screen=osd, vo=vo,
              scene_no=i, total=total, is_cta=is_cta)
        regie.append(f"Szene {i} | {a}-{b} s | On-Screen: " + repr(osd))
        regie.append(f"   Bild: {'CTA-Vollbild (dunkel, Amber)' if is_cta else 'Avatar/Text, ruhig'}")
        regie.append(f"   VO:   {vo}")
        regie.append("")
    (d / "voiceover.txt").write_text(" ".join(s[2] for s in scenes), encoding="utf-8")
    (d / "untertitel.srt").write_text(srt(scenes), encoding="utf-8")
    (d / "regie.txt").write_text("\n".join(regie), encoding="utf-8")
    if do_voice:
        maybe_tts(" ".join(s[2] for s in scenes), d / "voiceover.mp3")
    print(f"  ✓ Variante {name}: {total} Storyboard-Frames + VO + SRT + Regie")


def main():
    do_voice = "--voice" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Baue Werbespot-Paket → {OUT}")
    build_variant("A-40s", VARIANTE_A, do_voice)
    build_variant("B-15s", VARIANTE_B, do_voice)
    print("\nFertig. Storyboard-Frames als Vorlage, voiceover.txt → ElevenLabs,")
    print("untertitel.srt + Audio → HeyGen (Avatar + Lippensync), 9:16 exportieren.")
    print("Detail-Setup: docs/WERBEVIDEO-SKRIPT.md & docs/WERBEVIDEO-REGIE-PSYCHOLOGIE.md")


if __name__ == "__main__":
    main()
