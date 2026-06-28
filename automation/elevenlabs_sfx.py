#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban Spielentwickler — Sound-Effekte per ElevenLabs (Text→SFX) generieren.

UPGRADE „Sound": erzeugt Game-SFX (.mp3) aus Text-Prompts — ohne Audio-Software.
Nutzt die ElevenLabs Sound-Effects-API. Läuft, wo der ElevenLabs-Key gesetzt ist
(andere Session / CI / lokal). Die .mp3 laufen in Godot (AudioStreamPlayer) und in
den Web-Spielen (HTMLAudio / WebAudio).

Key-Env (eine davon): XI, ELEVENLABS_API_KEY, ELEVEN_API_KEY  — NIE im Code/Chat!
Reine Stdlib.

    export XI=...                      # bzw. ELEVENLABS_API_KEY
    python3 automation/elevenlabs_sfx.py                  # Standard-SFX-Set
    python3 automation/elevenlabs_sfx.py "retro laser shot" laser 1.0

Ausgabe: game/assets/sfx/<name>.mp3
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "game" / "assets" / "sfx"
URL = "https://api.elevenlabs.io/v1/sound-generation"

# (name, prompt, dauer_sek) — Standard-SFX für Neon Drift / Neon Survivor.
SFX = [
    ("shoot", "short punchy retro sci-fi laser shot, arcade game", 0.6),
    ("hit", "short metallic enemy hit impact, arcade", 0.5),
    ("explode", "short retro explosion pop, arcade enemy destroyed", 0.8),
    ("pickup", "bright pleasant coin pickup chime, arcade", 0.5),
    ("levelup", "uplifting power-up level-up jingle, arcade", 1.2),
    ("hurt", "short low damage hit, player hurt, arcade", 0.5),
    ("gameover", "short descending game over tone, arcade", 1.4),
]


def key():
    for k in ("XI", "ELEVENLABS_API_KEY", "ELEVEN_API_KEY", "ELEVENLABS_KEY"):
        v = (os.environ.get(k) or "").strip()
        if v:
            return v
    return ""


def gen(name, prompt, dur):
    body = json.dumps({"text": prompt, "duration_seconds": dur, "prompt_influence": 0.35}).encode()
    req = urllib.request.Request(URL, data=body, method="POST", headers={
        "xi-api-key": key(), "Content-Type": "application/json", "Accept": "audio/mpeg",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        audio = r.read()
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{name}.mp3"
    with open(dst, "wb") as f:
        f.write(audio)
    print(f"  ✓ game/assets/sfx/{name}.mp3 ({len(audio)} bytes)")


def main() -> int:
    if not key():
        print("Kein ElevenLabs-Key (XI / ELEVENLABS_API_KEY …) gesetzt → no-op.")
        return 0
    args = sys.argv[1:]
    if len(args) >= 2:
        jobs = [(args[1], args[0], float(args[2]) if len(args) > 2 else 1.0)]
    else:
        jobs = SFX
    for name, prompt, dur in jobs:
        try:
            gen(name, prompt, dur)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {name}: {type(e).__name__}: {str(e)[:120]}")
    print("Fertig. SFX in game/assets/sfx/ → Godot (AudioStreamPlayer) / Web (Audio).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
