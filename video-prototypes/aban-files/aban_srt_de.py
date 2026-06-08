#!/usr/bin/env python3
"""ABAN Files — deutsche Untertitel-Spur (.srt) erzeugen.

Erzeugt pro Folge eine deutsche CC-Datei `srt/<ep>.de.srt`, getimt auf die
englische Narration (Satz-Ebene). Uebersetzung via Gemini-API (GEMINI_KEY).
Timing: Satzdauer proportional zur Zeichenlaenge x Clip-Dauer (clips/<ep>.mp4),
sonst Schaetzung ~14 Zeichen/s. Reine stdlib + ffmpeg(probe) + Gemini-REST.

Aufruf:  GEMINI_KEY=... python3 aban_srt_de.py ep15 ep16 ...   (ohne Args = alle mit Clip)

⚠️ Nur fuer Folgen erzeugen, deren Clip zum AKTUELLEN Skript passt (sonst Ton≠Text):
   sicher = ep1-ep18, ep20 (+ kuenftige Re-Renders). ep19/21-36 erst nach Re-Render.
"""
import os, sys, re, json, subprocess, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "aban_scripts.json")
OUTDIR = os.path.join(HERE, "srt")
GEMINI_KEY = os.environ.get("GEMINI_KEY") or os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = "ffmpeg"


def split_sentences(text):
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if p.strip()]


def clip_duration(ep):
    p = os.path.join(HERE, "clips", f"{ep}.mp4")
    if not os.path.exists(p):
        return None
    try:
        out = subprocess.run([FF, "-hide_banner", "-i", p], capture_output=True, text=True).stderr
        m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out)
        if m:
            h, mi, s = m.groups()
            return int(h) * 3600 + int(mi) * 60 + float(s)
    except Exception:
        pass
    return None


def translate_de(sentences):
    """Gemini: englische Saetze -> natuerliche deutsche Untertitel (gleiche Anzahl, nummeriert)."""
    if not GEMINI_KEY:
        sys.exit("FEHLT: GEMINI_KEY (Gemini-API-Key) fuer die Uebersetzung.")
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))
    prompt = ("Uebersetze diese englischen Untertitel-Saetze einer mysterioesen Sci-Fi-Erzaehlung "
              "(Sprecher 'ABAN') ins natuerliche, packende Deutsch. Behalte 'ABAN' bei; 'fleshling' -> "
              "'Sterblicher'. Gib GENAU gleich viele Zeilen zurueck, nummeriert (1., 2., ...), nur die "
              "Uebersetzungen, keine Erklaerungen.\n\n" + numbered)
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_KEY}"
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    txt = d["candidates"][0]["content"]["parts"][0]["text"]
    lines = []
    for ln in txt.splitlines():
        m = re.match(r"\s*\d+[.)]\s*(.+)", ln)
        if m:
            lines.append(m.group(1).strip())
    if len(lines) != len(sentences):
        # Fallback: nicht-leere Zeilen
        alt = [l.strip() for l in txt.splitlines() if l.strip()]
        if len(alt) == len(sentences):
            lines = alt
    return lines


def ts(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


def build_srt(ep):
    sc = json.load(open(SCRIPTS))[ep]
    sents = split_sentences(sc["text"])
    dur = clip_duration(ep) or (len(sc["text"]) / 14.0 + 0.6)
    de = translate_de(sents)
    if len(de) != len(sents):
        print(f"  ⚠️ {ep}: Uebersetzung {len(de)} != Saetze {len(sents)} — uebersprungen")
        return False
    total_chars = sum(len(s) for s in sents) or 1
    os.makedirs(OUTDIR, exist_ok=True)
    out = os.path.join(OUTDIR, f"{ep}.de.srt")
    t = 0.0
    with open(out, "w", encoding="utf-8") as fo:
        for i, (en, g) in enumerate(zip(sents, de), 1):
            span = dur * (len(en) / total_chars)
            start, end = t, min(dur, t + span)
            fo.write(f"{i}\n{ts(start)} --> {ts(end)}\n{g}\n\n")
            t = end
    print(f"  ✅ {ep}: {len(de)} Cues -> srt/{ep}.de.srt ({dur:.1f}s)")
    return True


def main():
    eps = sys.argv[1:]
    if not eps:
        scripts = json.load(open(SCRIPTS))
        eps = [e for e in scripts if os.path.exists(os.path.join(HERE, "clips", f"{e}.mp4"))]
    for ep in eps:
        try:
            build_srt(ep)
        except Exception as e:
            print(f"  ❌ {ep}: {e}")


if __name__ == "__main__":
    main()
