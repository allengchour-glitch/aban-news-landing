#!/usr/bin/env python3
# =============================================================================
#  freegen_hubreels — Auto-Reel pro abannews-Hub
# -----------------------------------------------------------------------------
#  Liest Titel + Meta-Description der ki-*.html-Hubseiten und baut je ein
#  freegen-Video-Skript (Intro + Headline + Teaser + CTA, optional Voiceover).
#  Schreibt die Skripte nach freegen/hubs/<slug>.json. Mit --render werden sie
#  direkt zu MP4 gerendert (via automation/freegen_video.py).
#
#  Aufruf:
#    python3 automation/freegen_hubreels.py [--glob "ki-*.html"] [--limit 10]
#                                           [--render] [--voiceover]
# =============================================================================

import argparse, glob, html as _html, json, os, re, subprocess, sys

MUSIC = "automation/music/luxe-premium.wav"
BRAND = "ABANNEWS.COM"
OUT_SCRIPTS = "freegen/hubs"


def meta(html, name):
    m = re.search(rf'<meta[^>]+name=["\']{name}["\'][^>]+content=["\'](.*?)["\']', html, re.I | re.S)
    if not m:
        m = re.search(rf'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']{name}["\']', html, re.I | re.S)
    return (m.group(1).strip() if m else "")


def clean(s):
    s = _html.unescape(s or "")
    s = re.sub(r"\s+", " ", s).strip()
    # Site-Suffixe abschneiden
    for sep in [" | ", " – ", " — ", " - "]:
        if sep in s and s.lower().rsplit(sep.strip().lower(), 1)[-1].strip().startswith("aban"):
            s = s.split(sep)[0].strip()
    return s


def build_script(title, desc, slug, voiceover):
    spec = {
        "output": f"freegen/out/hub-{slug}.mp4",
        "w": 1080, "h": 1920, "fps": 30, "music": MUSIC, "brand": BRAND,
        "intro": "aban news",
        "outro": "Mehr auf abannews.com",
        "scenes": [
            {"text": title, "seconds": 3.2, "bg": "#0b0b0c"},
            {"text": desc[:120] if desc else "Ehrlich erklärt — ohne Hype.", "seconds": 3.5, "bg": "#101018"},
        ],
    }
    if voiceover:
        spec["voiceover"] = f"{title}. {desc}".strip()
    return spec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--glob", default="ki-*.html")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--voiceover", action="store_true")
    a = ap.parse_args()

    files = sorted(glob.glob(a.glob))[: a.limit]
    if not files:
        sys.exit(f"❌ Keine Dateien für {a.glob}")
    os.makedirs(OUT_SCRIPTS, exist_ok=True)
    made, rendered = [], 0

    for f in files:
        slug = os.path.splitext(os.path.basename(f))[0]
        html = open(f, encoding="utf-8", errors="ignore").read()
        tm = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
        title = clean(tm.group(1)) if tm else slug
        desc = clean(meta(html, "description"))
        spec = build_script(title, desc, slug, a.voiceover)
        sp = os.path.join(OUT_SCRIPTS, f"{slug}.json")
        json.dump(spec, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        made.append(sp)
        print(f"📝 {sp}  ←  {title[:50]}")
        if a.render:
            r = subprocess.run([sys.executable, "automation/freegen_video.py", sp])
            if r.returncode == 0:
                rendered += 1

    print(f"\n✔ {len(made)} Skript(e) erzeugt"
          + (f", {rendered} gerendert" if a.render else " (ohne --render nur Skripte)"))


if __name__ == "__main__":
    main()
