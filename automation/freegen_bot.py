#!/usr/bin/env python3
# =============================================================================
#  freegen_bot — selbstlaufender Content-Bot (Python)
# -----------------------------------------------------------------------------
#  Erzeugt vollautomatisch abannews-Reels + passende Social-Images aus den
#  ki-*.html-Hubs. Merkt sich Erledigtes (Ledger), läuft einmalig oder als Loop.
#  Kostenlos, lokal, ohne Credits. Plattformübergreifend (Win/Mac/Linux).
#
#  Aufruf:
#    python3 automation/freegen_bot.py                 # 1 Lauf, 2 Hubs
#    python3 automation/freegen_bot.py --count 3       # 3 Hubs pro Lauf
#    python3 automation/freegen_bot.py --loop 3600     # alle 60 Min weiter
#    python3 automation/freegen_bot.py --no-voiceover  # ohne TTS (schneller)
#    python3 automation/freegen_bot.py --reset         # Ledger leeren
# =============================================================================

import argparse, glob, json, os, re, subprocess, sys, time
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)
os.chdir(ROOT)

import freegen_hubreels as hub  # meta(), clean(), build_script()

LEDGER = "freegen/.bot-done.txt"
LOG = "freegen/out/bot.log"
PY = sys.executable


def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def done_set():
    if not os.path.exists(LEDGER):
        return set()
    return set(l.strip() for l in open(LEDGER, encoding="utf-8") if l.strip())


def mark_done(slug):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(slug + "\n")


def next_hubs(count, pattern="ki-*.html"):
    done = done_set()
    out = []
    for f in sorted(glob.glob(pattern)):
        slug = os.path.splitext(os.path.basename(f))[0]
        if slug in done:
            continue
        out.append((slug, f))
        if len(out) >= count:
            break
    return out


def make_image(slug, title, desc):
    out = f"freegen/img/hub-{slug}.png"
    r = subprocess.run([PY, "automation/freegen_image.py",
                        "--headline", title[:60], "--subline", (desc or "")[:90],
                        "--kicker", "aban news", "--brand", "ABANNEWS.COM",
                        "--size", "post", "--out", out])
    return out if r.returncode == 0 else None


def run_once(count, voiceover):
    hubs = next_hubs(count)
    if not hubs:
        log("Nichts mehr zu tun — alle Hubs verarbeitet.")
        return 0
    n = 0
    for slug, path in hubs:
        html = open(path, encoding="utf-8", errors="ignore").read()
        tm = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
        title = hub.clean(tm.group(1)) if tm else slug
        desc = hub.clean(hub.meta(html, "description"))
        spec = hub.build_script(title, desc, slug, voiceover)
        sp = f"freegen/hubs/{slug}.json"
        os.makedirs("freegen/hubs", exist_ok=True)
        json.dump(spec, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        rv = subprocess.run([PY, "automation/freegen_video.py", sp])
        img = make_image(slug, title, desc)
        if rv.returncode == 0:
            mark_done(slug)
            n += 1
            log(f"✅ {slug} → Reel {spec['output']}" + (f" + Bild {img}" if img else ""))
        else:
            log(f"❌ {slug}: Render fehlgeschlagen")
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=2)
    ap.add_argument("--loop", type=int, default=0, help="Intervall in Sekunden (0 = einmalig)")
    ap.add_argument("--no-voiceover", action="store_true")
    ap.add_argument("--reset", action="store_true")
    a = ap.parse_args()

    if a.reset and os.path.exists(LEDGER):
        os.remove(LEDGER)
        log("Ledger geleert.")

    voiceover = not a.no_voiceover
    if a.loop > 0:
        log(f"🤖 Bot startet im Loop (alle {a.loop}s, {a.count} Hubs/Lauf). Stop mit Strg+C.")
        try:
            while True:
                made = run_once(a.count, voiceover)
                if made == 0:
                    log("Alles erledigt — Bot beendet sich.")
                    break
                time.sleep(a.loop)
        except KeyboardInterrupt:
            log("Bot gestoppt (Strg+C).")
    else:
        run_once(a.count, voiceover)


if __name__ == "__main__":
    main()
