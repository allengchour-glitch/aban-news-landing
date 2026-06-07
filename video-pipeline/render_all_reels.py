#!/usr/bin/env python3
"""video-pipeline/render_all_reels.py — alle Hype-Watch-Reels fertig rendern.

Baut für jeden Fall in data/hype-watch.json die Slides (via generate_clips) und
rendert daraus direkt das fertige 9:16-mp4 (mediakit.reel) — Slides + Untertitel
+ Ambient-Ton in einem Schritt. Für den CI-Workflow gedacht, läuft aber auch lokal.

    python3 render_all_reels.py            # alle Fälle (Stufe B/C, ohne Key)
    python3 render_all_reels.py --voice    # mit ElevenLabs-Stimme + Karaoke (Key XI/ELEVENLABS_API_KEY)
    python3 render_all_reels.py <fall-id>  # nur einen Fall

Output (video-pipeline/ausgabe/<id>/reel.mp4) ist git-ignored.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(REPO))   # mediakit (Repo-Root) importierbar machen

import generate_clips as gc      # gleiche Verzeichnis-Ebene
from mediakit import reel


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    voice = "--voice" in sys.argv
    data = json.loads((REPO / "data" / "hype-watch.json").read_text(encoding="utf-8"))
    faelle = data["faelle"]
    if args:
        faelle = [f for f in faelle if f["id"] == args[0]]
        if not faelle:
            print(f"Fall '{args[0]}' nicht gefunden.")
            sys.exit(1)

    print(f"Rendere {len(faelle)} Reel(s) — Stufe { 'A (Voice/Karaoke)' if voice else 'B/C' }")
    fertig = 0
    for f in faelle:
        gc.build_one(f, voice)          # Slides + Overlays + Skript + SRT + Queries (+ optional Voiceover)
        try:
            reel.render(f["id"], voice=voice, broll=True)
            fertig += 1
        except Exception as e:           # ein kaputter Fall darf den Lauf nicht stoppen
            print(f"  ✗ {f['id']}: {e}")
    print(f"\nFertig: {fertig}/{len(faelle)} Reels → ausgabe/<id>/reel.mp4")


if __name__ == "__main__":
    main()
