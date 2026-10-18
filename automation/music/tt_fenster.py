#!/usr/bin/env python3
"""tt_fenster.py — Fenster/Lautheit eines TikTok-Trendtitels (18.10.2026).

Misst fuer EINEN TikTok-Trendtitel (Commercial Music Library, previewUrl = der volle Titel, GEMESSEN: audio/mp4,
Dauer = API-duration ±1 s) das Fenster fuer ein REEL-Sekunden-Video:
  · Einstieg = energiereichstes REEL-Fenster in den ersten 90 s (gleiche Methode wie automation/music/einstiege.py:
    RMS in 0,25-s-Schritten, erste 1,5 s zaehlen doppelt)
  · Lautheit (LUFS, ebur128) genau dieses Fensters
  · optional (--gesang, nur mit GEMINI_API_KEY): ein 12-s-Ausschnitt an gemini-2.5-flash → «stoerend_als_hintergrund»

Lizenz-Hygiene (TikTok CML-Nutzungsbedingungen: «not permitted to make available, distribute, or perform the Commercial
Sounds separately»): die Datei lebt NUR in einem Wegwerf-Ordner unter /tmp und wird in jedem Fall geloescht; nichts davon
wird in ein Video gemischt, ins Repo oder auf ein anderes Netz gelegt.

  python3 tt_fenster.py <previewUrl> <reel_sekunden> [--gesang]
Ausgabe: eine JSON-Zeile {"ok":true,"start":57.25,"lufs":-11.3,"dauer":181.4,"gesang":{...}|null} · Exit 0
         bei Fehler {"ok":false,"grund":"…"} · Exit 2
"""
import base64, json, os, re, shutil, subprocess, sys, tempfile, urllib.request, urllib.error

SR = 22050


def lade(url, ziel):
    r = subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "--fail", "-o", ziel, url], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.getsize(ziel):
        raise RuntimeError("Download: " + (r.stderr or "leer").strip()[:120])


def lufs_von(pfad, start, laenge):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(start), "-t", str(laenge), "-i", pfad,
                        "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    for z in e.splitlines()[::-1]:
        if z.strip().startswith("I:"):
            return float(z.split()[1])
    return None


def gesang_pruefen(ex_mp3):
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return None
    prompt = ('Hintergrundmusik fuer ein 10-15-s-Produktvideo eines Schweizer Online-Shops. Beurteile den Ausschnitt streng nach Gehoer, '
              'antworte NUR als JSON-Objekt: {"gesang":"keiner|Vokal-Chops/Summen|Gesang mit Text|Rap|Sprache","sprache":"…oder leer",'
              '"stoerend_als_hintergrund":true|false}. stoerend = verstaendlicher Text, Rap, Sprache oder aufdringlicher Gesang.')
    body = {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": "audio/mp3",
            "data": base64.b64encode(open(ex_mp3, "rb").read()).decode()}}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key, "User-Agent": "luxe-tt-fenster"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=90))
        txt = r["candidates"][0]["content"]["parts"][0]["text"]
        try:
            return json.loads(txt)
        except ValueError:
            return json.loads(re.search(r"\{.*\}", txt, re.S).group(0))
    except Exception as e:  # kein Urteil = None (der Aufrufer entscheidet), nie «ok» raten
        return {"fehler": type(e).__name__}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "grund": "Aufruf: tt_fenster.py <previewUrl> <reel_sekunden> [--gesang]"}))
        return 2
    url, reel = sys.argv[1], float(sys.argv[2])
    arbeit = tempfile.mkdtemp(prefix="_tt_wk_", dir="/tmp")
    try:
        import numpy as np
        f = os.path.join(arbeit, "t.m4a")
        lade(url, f)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
        a = np.frombuffer(raw, dtype=np.float32)
        dauer = len(a) / SR
        if dauer < reel + 2:
            raise RuntimeError(f"Titel zu kurz ({dauer:.1f} s) fuer {reel:.1f} s Video")
        hop = int(SR * 0.25)
        rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2) + 1e-12) for i in range(0, len(a) - hop, hop)])
        fw = int(round(reel / 0.25))
        lim = min(len(rms), int(90 / 0.25), len(rms) - 1)
        kum = np.convolve(rms[:lim], np.ones(fw), "valid")
        if not len(kum):
            start = 0.0
        else:
            kopf = np.convolve(rms[:lim], np.ones(6), "valid")[:len(kum)]
            start = float(np.argmax(kum / fw + kopf / 6)) * 0.25
        start = max(0.0, min(start, dauer - reel - 1))
        out = {"ok": True, "start": round(start, 2), "lufs": lufs_von(f, start, reel), "dauer": round(dauer, 1), "gesang": None}
        if "--gesang" in sys.argv:
            ex = os.path.join(arbeit, "ex.mp3")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(min(reel, 12)), "-i", f, "-ac", "1", "-ar", "24000", "-b:a", "48k", ex])
            out["gesang"] = gesang_pruefen(ex)
        print(json.dumps(out, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"ok": False, "grund": f"{type(e).__name__}: {e}"[:200]}, ensure_ascii=False))
        return 2
    finally:
        shutil.rmtree(arbeit, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
