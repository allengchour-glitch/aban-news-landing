"""mediakit/tts.py — ElevenLabs-Vertonung mit Wort-Timings (optional).

Portiert aus aban-files. Ohne API-Key (`XI`) gibt es sauber None zurück — kein
Netz, kein Crash. Liefert (words, total) mit words = [(wort, start, end), …],
die reel.py für Karaoke-Untertitel + audiosynchrone Slide-Dauern nutzt.
"""
import base64
import json
import os
import urllib.request

# Akzeptiere XI (aban-files) ODER ELEVENLABS_API_KEY (generate_clips) als Key.
_KEY = os.environ.get("XI") or os.environ.get("ELEVENLABS_API_KEY")
_VOICE = os.environ.get("VOICE") or os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")


def have_key():
    return bool(_KEY)


def synth_with_timestamps(text, out_mp3):
    """Text → MP3 (nach out_mp3) + Wort-Timings. None, wenn kein Key gesetzt."""
    if not _KEY:
        return None
    body = json.dumps({
        "text": text, "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8,
                           "style": 0.45, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{_VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=body, method="POST",
        headers={"xi-api-key": _KEY, "Content-Type": "application/json"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=120))
    except Exception as e:
        print(f"  TTS übersprungen ({e})")
        return None
    open(out_mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]
    ch, st, en = (al["characters"],
                  al["character_start_times_seconds"],
                  al["character_end_times_seconds"])
    words, cur, ws, we = [], "", None, None
    for c, s, e in zip(ch, st, en):
        if c.strip() == "":
            if cur:
                words.append((cur, ws, we)); cur, ws, we = "", None, None
            continue
        if ws is None:
            ws = s
        cur += c
        we = e
    if cur:
        words.append((cur, ws, we))
    return words, (en[-1] if en else 0.0)
