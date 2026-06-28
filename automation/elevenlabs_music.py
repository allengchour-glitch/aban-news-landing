#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban Spielentwickler — Game-Musik per ElevenLabs (Text→Musik) generieren.

UPGRADE „Soundtrack": erzeugt instrumentale Game-Tracks (.mp3) aus Text-Prompts
via ElevenLabs Music-API (POST /v1/music, model_v2). Das macht ein Spiel „AAA-ig".
Läuft, wo der ElevenLabs-Key gesetzt ist (XI / ELEVENLABS_API_KEY). Reine Stdlib.
.mp3 → Godot (AudioStreamPlayer, loop) / Web (Audio loop). Key NIE im Code/Chat.

    export XI=...
    python3 automation/elevenlabs_music.py                       # Standard-Tracks
    python3 automation/elevenlabs_music.py "tense boss battle synthwave" boss 80

Ausgabe: game/assets/music/<name>.mp3
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "game" / "assets" / "music"
URL = "https://api.elevenlabs.io/v1/music"

# (name, prompt, sekunden) — Standard-Soundtrack für Neon Drift / Neon Survivor.
TRACKS = [
    ("menu", "calm hopeful ambient synthwave, gentle arpeggio, looping menu music, instrumental", 70),
    ("gameplay", "driving energetic retro synthwave, steady beat, neon arcade, looping, instrumental", 90),
    ("boss", "intense dark synthwave, fast pulsing bass, tension, boss battle, instrumental", 80),
]


def key():
    for k in ("XI", "ELEVENLABS_API_KEY", "ELEVEN_API_KEY", "ELEVENLABS_KEY"):
        v = (os.environ.get(k) or "").strip()
        if v:
            return v
    return ""


def gen(name, prompt, secs):
    ms = max(3000, min(600000, int(secs * 1000)))
    body = json.dumps({"prompt": prompt, "music_length_ms": ms,
                       "force_instrumental": True, "model_id": "music_v2"}).encode()
    req = urllib.request.Request(URL, data=body, method="POST", headers={
        "xi-api-key": key(), "Content-Type": "application/json", "Accept": "audio/mpeg",
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        audio = r.read()
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{name}.mp3"
    with open(dst, "wb") as f:
        f.write(audio)
    print(f"  ✓ game/assets/music/{name}.mp3 ({len(audio)} bytes)")


def main() -> int:
    if not key():
        print("Kein ElevenLabs-Key (XI / ELEVENLABS_API_KEY …) → no-op.")
        return 0
    args = sys.argv[1:]
    if len(args) >= 2:
        jobs = [(args[1], args[0], float(args[2]) if len(args) > 2 else 75)]
    else:
        jobs = TRACKS
    for name, prompt, secs in jobs:
        try:
            gen(name, prompt, secs)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {name}: {type(e).__name__}: {str(e)[:140]}")
    print("Fertig. Tracks in game/assets/music/ → in Godot/Web als Loop einbinden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
