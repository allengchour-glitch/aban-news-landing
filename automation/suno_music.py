#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban Spielentwickler — Game-Musik per Suno (Text→Musik) generieren.

UPGRADE „Soundtrack (Suno)": erzeugt Tracks (.mp3) aus Text-Prompts über einen
Suno-API-Anbieter. WICHTIG: Suno hat KEINE offizielle öffentliche API → man nutzt
einen Drittanbieter (Standard hier: sunoapi.org-Muster) oder self-hosted.

Env (NIE im Code/Chat):
  SUNO_API_KEY   (Pflicht, Bearer-Token vom Anbieter)
  SUNO_BASE_URL  (optional, Standard https://api.sunoapi.org)

    export SUNO_API_KEY=...
    python3 automation/suno_music.py                          # Standard-Tracks
    python3 automation/suno_music.py "epic boss synthwave" boss

Ausgabe: game/assets/music/<name>.mp3
Reine Stdlib. Polling bis ~5 Min. ElevenLabs-Musik bleibt die Alternative.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "game" / "assets" / "music"
BASE = (os.environ.get("SUNO_BASE_URL") or "https://api.sunoapi.org").rstrip("/")

TRACKS = [
    ("menu", "calm hopeful ambient synthwave, gentle arpeggio, looping menu, instrumental"),
    ("gameplay", "driving energetic retro synthwave, steady beat, neon arcade, instrumental"),
    ("boss", "intense dark synthwave, fast pulsing bass, tension, boss battle, instrumental"),
]


def key():
    return (os.environ.get("SUNO_API_KEY") or os.environ.get("SUNO_KEY") or "").strip()


def _req(path, data=None):
    url = path if path.startswith("http") else BASE + path
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=("POST" if data is not None else "GET"),
                                 headers={"Authorization": "Bearer " + key(),
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def _audio_url(rec):
    """Robust: sucht in der (anbieterabhängigen) Antwort die erste Audio-URL."""
    found = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, str) and v.startswith("http") and (".mp3" in v or "audio" in k.lower() or k.lower() in ("audio_url", "audiourl", "stream_audio_url")):
                    found.append(v)
                else:
                    walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(rec)
    return found[0] if found else None


def gen(name, prompt):
    r = _req("/api/v1/generate", {"prompt": prompt, "customMode": False,
                                  "instrumental": True, "model": "V4",
                                  "callBackUrl": ""})
    task = (r.get("data") or {}).get("taskId") or r.get("taskId") or r.get("id")
    if not task:
        raise RuntimeError(f"keine taskId in Antwort: {str(r)[:120]}")
    for _ in range(60):  # ~5 Min
        rec = _req(f"/api/v1/generate/record-info?taskId={task}")
        url = _audio_url(rec)
        if url:
            OUT.mkdir(parents=True, exist_ok=True)
            dst = OUT / f"{name}.mp3"
            with urllib.request.urlopen(url, timeout=120) as a, open(dst, "wb") as f:
                f.write(a.read())
            print(f"  ✓ game/assets/music/{name}.mp3")
            return
        print(f"  … {name}: läuft…", flush=True)
        time.sleep(5)
    raise RuntimeError(f"{name}: Timeout (keine Audio-URL)")


def main() -> int:
    if not key():
        print("Kein SUNO_API_KEY gesetzt → no-op. (Suno braucht einen Drittanbieter-Key; "
              "Alternative: automation/elevenlabs_music.py mit XI-Key.)")
        return 0
    args = sys.argv[1:]
    jobs = [(args[1], args[0])] if len(args) >= 2 else TRACKS
    for name, prompt in jobs:
        try:
            gen(name, prompt)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {name}: {type(e).__name__}: {str(e)[:140]}")
    print("Fertig. Tracks in game/assets/music/. (Endpoint anbieterabhängig — bei Fehler SUNO_BASE_URL prüfen.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
