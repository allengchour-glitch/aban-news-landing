#!/usr/bin/env python3
# =============================================================================
#  freegen_promo — rendert die Marktplatz-Promo-Reels aus freegen/promo/*.json
# -----------------------------------------------------------------------------
#  Wiederverwendbare Promo-Clips für die echten abannews-Bereiche (Inserate, Jobs,
#  Auto, Immobilien, Marktplatz, Newsletter). Texte sind handgepflegt & akkurat
#  (kein KI-Halluzinationsrisiko). Gratis, lokal.
#
#  Aufruf:  python3 automation/freegen_promo.py
#  Outputs liegen in freegen/promo/*.mp4 (per .gitignore aus dem Repo).
# =============================================================================

import glob, os, subprocess, sys

DIR = "freegen/promo"


def main():
    specs = sorted(glob.glob(os.path.join(DIR, "*.json")))
    if not specs:
        sys.exit(f"❌ Keine Promo-Skripte in {DIR}/")
    ok = 0
    for sp in specs:
        r = subprocess.run([sys.executable, "automation/freegen_video.py", sp])
        if r.returncode == 0:
            ok += 1
    print(f"✔ {ok}/{len(specs)} Promo-Reels gerendert → {DIR}/")


if __name__ == "__main__":
    main()
