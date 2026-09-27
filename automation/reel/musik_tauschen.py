#!/usr/bin/env python3
"""musik_tauschen.py — Tonspur eines fertigen Reels durch ein eigenes Stück ersetzen, Bild unverändert (28.09.2026).

Anlass: Betreiber «musik jetzt nur epischer guter sound instrumental orchester» — 7 wartende Reels trugen House/DnB
(erkannt mit music/produce/musik_erkennen.py). Neu bauen hiesse CJ-Punkte + Quellvideos; die Reels aus make_reel.sh
schneiden ohnehin nicht auf den Beat, also verliert der Tausch nichts.

Ton: Einstieg aus automation/music/_einstiege.json (erster, bei dem das Stück bis zum Reel-Ende reicht, sonst 0),
Ein-/Ausblenden, loudnorm zweistufig −14 LUFS / −1.5 dBTP, 48 kHz Stereo, AAC 160k; Video per -c:v copy.

  python3 musik_tauschen.py <in.mp4> <stück.wav> <out.mp4>
"""
import json, os, subprocess, sys
import av

MUSIK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "music")


def dauer(p):
    with av.open(p) as c:
        return float(c.duration / 1_000_000)


def main(src, stueck, out):
    d = dauer(src)
    pfad = os.path.join(MUSIK, stueck)
    lang = dauer(pfad)
    try:
        ein = json.load(open(os.path.join(MUSIK, "_einstiege.json"))).get(stueck, {}).get("einstiege", [0])
    except Exception:
        ein = [0]
    start = next((e for e in ein if e + d <= lang - 0.5), 0.0)
    if start + d > lang:
        sys.exit(f"⛔ {stueck} ({lang:.1f} s) zu kurz für {d:.1f} s Reel")
    af = f"aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.04,afade=t=out:st={max(0, d - 1.2):.2f}:d=1.2"
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{start}", "-t", f"{d}", "-i", pfad, "-af",
                        af + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(e[e.rindex("{"): e.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-ss", f"{start}", "-t", f"{d}", "-i", pfad,
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", af + "," + ln + ",aresample=48000",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-t", f"{d}", "-movflags", "+faststart", out], check=True)
    print(f"✅ {os.path.basename(out)}: {stueck} ab {start:.2f} s, {d:.1f} s")


if __name__ == "__main__":
    main(*sys.argv[1:4])
