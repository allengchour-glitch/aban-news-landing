#!/usr/bin/env python3
"""
doctor.py — Preflight-Check für den Video-Stack. Sagt dir in 2 Sekunden,
was bereit ist und was fehlt — damit du nicht im Trial-and-Error landest.

Prüft (gruppiert nach den zwei Säulen aus docs/VIDEO-STACK.md):
  • Werkzeuge: Python-Version, ffmpeg (System oder gebündelt)
  • Python-Pakete: Pillow/numpy/imageio (Kern), whisper/TTS (Lip-Sync/XTTS),
    google-api-* (YouTube-Upload)
  • Keys/Secrets aus der Umgebung: ELEVENLABS/XI, PEXELS, YT_*
  • Dateien: aban_scripts.json, shrink.py

Reine stdlib, ändert nichts, verrät keine Key-Werte (nur „gesetzt: ja/nein").
Aufruf:  python3 doctor.py        (oder:  make doctor)
"""
from __future__ import annotations

import importlib.util
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OK, WARN, BAD = "\033[32m✓\033[0m", "\033[33m●\033[0m", "\033[31m✗\033[0m"


def has_mod(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def ffmpeg_path() -> str | None:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def env_set(*names: str) -> bool:
    return any(os.environ.get(n) for n in names)


def line(state: str, label: str, hint: str = "") -> None:
    tail = f"  → {hint}" if hint and state != OK else ""
    print(f"  {state} {label}{tail}")


def section(title: str) -> None:
    print(f"\n\033[1m{title}\033[0m")


def main() -> int:
    print("\033[1m🩺 Video-Stack Doctor\033[0m  (ändert nichts, zeigt nur den Stand)")
    core_ok = True

    section("Werkzeuge")
    pyok = sys.version_info >= (3, 9)
    line(OK if pyok else BAD, f"Python {sys.version_info.major}.{sys.version_info.minor}",
         "Python ≥ 3.9 empfohlen")
    ff = ffmpeg_path()
    line(OK if ff else BAD, "ffmpeg" + (f" ({'System' if shutil.which('ffmpeg') else 'gebündelt'})" if ff else ""),
         "pip install imageio-ffmpeg  (oder apt install ffmpeg)")
    core_ok &= bool(ff)

    section("Kern (beide Säulen)")
    for mod, pip in [("PIL", "Pillow"), ("numpy", "numpy"), ("imageio", "imageio"),
                     ("imageio_ffmpeg", "imageio-ffmpeg")]:
        ok = has_mod(mod)
        core_ok &= ok
        line(OK if ok else BAD, pip, f"pip install {pip}")
    line(OK if (HERE / "shrink.py").exists() else BAD, "shrink.py (Clips klein rendern)")

    section("Säule 2 — ABAN Files / YouTube (optional)")
    aban = HERE.parent / "aban-files"
    line(OK if (aban / "aban_scripts.json").exists() else WARN,
         "aban_scripts.json (Folgen-Skripte)", "fehlt — nur nötig für den eigenen Kanal")
    for mod, pip in [("googleapiclient", "google-api-python-client"),
                     ("google_auth_oauthlib", "google-auth-oauthlib")]:
        ok = has_mod(mod)
        line(OK if ok else WARN, pip, f"pip install {pip}  (nur für YouTube-Upload)")

    section("Lip-Sync / XTTS (optional, fortgeschritten)")
    line(OK if has_mod("whisper") else WARN, "openai-whisper (Untertitel)",
         "pip install openai-whisper")
    line(OK if has_mod("TTS") else WARN, "TTS / XTTS (lokale Stimme)", "pip install TTS")

    section("Keys / Secrets (Umgebung — Werte werden nicht angezeigt)")
    checks = [
        (env_set("ELEVENLABS_API_KEY", "XI"), "ElevenLabs-Stimme (ELEVENLABS_API_KEY oder XI)",
         "export ELEVENLABS_API_KEY=…  (ohne: Vertonung wird übersprungen)"),
        (env_set("PEXELS"), "Pexels-Footage (PEXELS)", "export PEXELS=…  (gratis Key)"),
        (env_set("YT_CLIENT_ID") and env_set("YT_CLIENT_SECRET"),
         "YouTube-OAuth (YT_CLIENT_ID + YT_CLIENT_SECRET)", "nur für Auto-Upload nötig"),
        (env_set("ABAN_YT_REFRESH_TOKEN", "YT_REFRESH_TOKEN"),
         "YouTube-Refresh-Token", "mit setup_youtube.sh / yt_get_refresh_token.py erzeugen"),
    ]
    for ok, label, hint in checks:
        line(OK if ok else WARN, label, hint)

    section("Urteil")
    if core_ok:
        print(f"  {OK} Kern steht — du kannst Clips bauen und mit shrink.py klein rendern.")
        print("     Schnellstart:  cd video-prototypes && make help")
    else:
        print(f"  {BAD} Kern unvollständig — oben die roten Punkte (✗) zuerst beheben.")
    print("     Säule-2-/Key-Punkte (●) sind optional, je nachdem wie weit du gehst.")
    print("     Details: docs/VIDEO-STACK.md")
    return 0 if core_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
