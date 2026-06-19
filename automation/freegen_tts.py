#!/usr/bin/env python3
# =============================================================================
#  freegen_tts — gratis Voiceover (piper-TTS, ElevenLabs-Ersatz)
# -----------------------------------------------------------------------------
#  Wandelt deutschen Text in eine WAV-Sprachausgabe — lokal, kostenlos, offline.
#  Nutzt piper-tts + ein Stimmmodell (Standard: de_DE-thorsten-medium).
#
#  Aufruf:
#    python3 automation/freegen_tts.py "Dein Text" --out freegen/out/voice.wav
#    echo "Langer Text" | python3 automation/freegen_tts.py - --out v.wav
#
#  Modell-Suche: --model, sonst $PIPER_MODEL, sonst ~/.local/share/piper-voices/
#  Neues Modell laden: python3 -m piper.download_voices de_DE-thorsten-medium
# =============================================================================

import argparse, glob, os, subprocess, sys, shutil

DEFAULT_DIR = os.path.expanduser("~/.local/share/piper-voices")


def find_model(explicit=None):
    if explicit and os.path.exists(explicit):
        return explicit
    env = os.environ.get("PIPER_MODEL")
    if env and os.path.exists(env):
        return env
    hits = sorted(glob.glob(os.path.join(DEFAULT_DIR, "*.onnx")))
    de = [h for h in hits if "de_DE" in os.path.basename(h)]
    if de:
        return de[0]
    if hits:
        return hits[0]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("text", help="Text oder '-' für stdin")
    ap.add_argument("--out", default="freegen/out/voice.wav")
    ap.add_argument("--model")
    a = ap.parse_args()

    text = sys.stdin.read() if a.text == "-" else a.text
    text = text.strip()
    if not text:
        sys.exit("❌ Kein Text.")

    model = find_model(a.model)
    if not model:
        sys.exit("❌ Kein piper-Stimmmodell gefunden. Laden mit:\n"
                 "   python3 -m piper.download_voices de_DE-thorsten-medium")
    piper = shutil.which("piper")
    if not piper:
        sys.exit("❌ piper nicht installiert. → pip install piper-tts")

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    p = subprocess.run([piper, "-m", model, "-f", a.out],
                       input=text.encode("utf-8"),
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if p.returncode != 0:
        sys.stderr.write(p.stderr.decode("utf-8", "ignore")[-1000:])
        sys.exit(f"\n❌ piper-Fehler ({p.returncode})")
    sz = os.path.getsize(a.out) / 1e3
    print(f"✅ {a.out} ({sz:.0f} KB) · Stimme: {os.path.basename(model)}")


if __name__ == "__main__":
    main()
