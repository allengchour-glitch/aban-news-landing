#!/usr/bin/env python3
"""
video-pipeline/generate_clips.py — Faceless-Kurzvideo-Pakete aus bestehendem Content.

Macht aus den ehrlichen Hype-Watch-Faktenchecks (data/hype-watch.json) fertige
Vertikal-Clip-Pakete (9:16, für Shorts/Reels/TikTok):
  - skript.txt       — Voiceover-Skript (Aban-Voice: Hook → Punkt → CTA, ~30–45 s)
  - untertitel.srt   — getimte Untertitel (aus dem Skript geschätzt)
  - slide_NN.png      — markengetreue Slide-Frames (Pillow)
  - post.txt         — Social-Caption mit Link (für social/post.py)

Geld kommt INDIREKT über den Funnel (Newsletter/Radars/Shop) — kein Direkt-Werbe-
Versprechen. Reines Python-stdlib + Pillow (schon Projekt-Abhängigkeit, siehe
generate_*_og.py). Optionale Vertonung via ELEVENLABS_API_KEY (sonst sauber übersprungen).

Aufruf:
    python3 generate_clips.py                 # alle Hype-Watch-Fälle -> ausgabe/
    python3 generate_clips.py <fall-id>       # nur einen Fall
    python3 generate_clips.py --voice         # zusätzlich TTS (braucht Key)
Output (ausgabe/) ist git-ignored.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(REPO))  # damit `mediakit` (Repo-Root) importierbar ist
OUT = ROOT / "ausgabe"
SITE = "abannews.com"

# Markenkit (Farben, Fonts, Slide-Baustein) liegt jetzt zentral in mediakit/brand.py
from mediakit.brand import (  # noqa: E402
    AMBER, AMBER_DK, CREAM, INK, MUTED, BG, STRIKE, WHITE, W, H,
    font, wrap, draw_block, slide, _ts,
)


def clip_script(fall):
    """Aban-Voice Voiceover-Skript: kurz, ehrlich, mit CTA."""
    verdikt = fall.get("verdikt", "")
    return [
        f"Hype-Check: {fall['claim']}",
        f"Der Hype sagt: {_short(fall.get('der_hype',''), 180)}",
        f"Die Realität: {_short(fall.get('die_realitaet',''), 220)}",
        f"Unser Verdikt: {verdikt}.",
        f"Mehr ehrliche Faktenchecks findest du auf {SITE} — such nach Hype-Watch.",
    ]


def _short(text, n):
    text = " ".join(str(text).split())
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0]
    return cut + " …"


def srt(lines):
    """Sehr einfache Timing-Schätzung: ~2.6 Wörter/Sekunde, min 2 s pro Zeile."""
    out, t = [], 0.0
    for i, line in enumerate(lines, 1):
        dur = max(2.0, len(line.split()) / 2.6)
        a, b = _ts(t), _ts(t + dur)
        out.append(f"{i}\n{a} --> {b}\n{line}\n")
        t += dur
    return "\n".join(out)


def social_caption(fall):
    return (
        f"Hype-Check: {fall['claim']}\n\n"
        f"Verdikt: {fall.get('verdikt','')}. Warum, mit Quellen:\n"
        f"https://{SITE}/hype-watch/{fall['id']}.html\n\n"
        f"#KI #Faktencheck #aban"
    )


def maybe_tts(text, out_path):
    """Optionale Vertonung via ElevenLabs. Ohne Key sauber übersprungen."""
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        return False
    import urllib.request
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            out_path.write_bytes(r.read())
        return True
    except Exception as e:
        print(f"  TTS übersprungen ({e})")
        return False


def build_one(fall, do_voice):
    d = OUT / fall["id"]
    d.mkdir(parents=True, exist_ok=True)
    lines = clip_script(fall)

    # Slides
    accent = STRIKE if fall.get("verdikt", "").lower() in ("falsch", "irreführend") else AMBER_DK
    slide(d / "slide_01.png", kicker="HYPE-CHECK", headline=fall["claim"], body="")
    slide(d / "slide_02.png", kicker="DER HYPE", headline="Was behauptet wird",
          body=_short(fall.get("der_hype", ""), 240))
    slide(d / "slide_03.png", kicker="DIE REALITÄT", headline=fall.get("verdikt", "Geprüft"),
          body=_short(fall.get("die_realitaet", ""), 260), accent=accent)
    slide(d / "slide_04.png", kicker="MEHR DAVON", headline="Ehrliche KI-Faktenchecks",
          body="Täglich 5 Minuten, kein Hype — Newsletter auf abannews.com.")

    (d / "skript.txt").write_text("\n\n".join(lines), encoding="utf-8")
    (d / "untertitel.srt").write_text(srt(lines), encoding="utf-8")
    (d / "post.txt").write_text(social_caption(fall), encoding="utf-8")
    if do_voice:
        maybe_tts(" ".join(lines), d / "voiceover.mp3")
    print(f"  ✓ {fall['id']} → 4 Slides + Skript + SRT + Caption")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    do_voice = "--voice" in sys.argv
    data = json.loads((REPO / "data" / "hype-watch.json").read_text(encoding="utf-8"))
    faelle = data["faelle"]
    if args:
        faelle = [f for f in faelle if f["id"] == args[0]]
        if not faelle:
            print(f"Fall '{args[0]}' nicht gefunden.")
            sys.exit(1)
    OUT.mkdir(exist_ok=True)
    print(f"Baue {len(faelle)} Clip-Paket(e) → {OUT}")
    for f in faelle:
        build_one(f, do_voice)
    print("\nFertig. Slides + Untertitel in CapCut/Resolve ziehen, oder mit --voice vertonen.")
    print("Social-Caption posten:  python3 ../social/post.py --add \"$(cat ausgabe/<id>/post.txt)\"")


if __name__ == "__main__":
    main()
