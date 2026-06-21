#!/usr/bin/env python3
# =============================================================================
#  freegen_postqueue — baut eine Post-Warteschlange aus den freegen-Assets
# -----------------------------------------------------------------------------
#  Paart jedes fertige Asset (Karussell/Reel) mit einer KI-Caption, Plattformen
#  und einem Tagesvorschlag → CSV, die du / PC-Claude einfach abarbeitest.
#  Genau die Brücke vom Content-Vorrat zur Reichweite (= Umsatz).
#
#  🔐 KI-Key nur aus env (GROQ_API_KEY). Ohne Key: Caption-Spalte bleibt leer.
#
#  Aufruf:  GROQ_API_KEY=… python3 automation/freegen_postqueue.py
#           [--reels N]   (zusätzlich die N neuesten Hub-Reels aufnehmen)
#           [--out freegen/post-queue.csv]
# =============================================================================

import argparse, csv, datetime, glob, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import freegen_ai
try:
    import freegen_caption
except Exception:
    freegen_caption = None

PLATFORMS = "Instagram; LinkedIn; TikTok"


def deslug(s):
    return re.sub(r"^(carousel|hub)-", "", s).replace("-", " ").strip().capitalize()


def cap_for(topic):
    if freegen_caption and freegen_ai.available():
        try:
            return (freegen_caption.caption(topic) or "").replace("\n", " ").strip()
        except Exception:
            return ""
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reels", type=int, default=0)
    ap.add_argument("--out", default="freegen/post-queue.csv")
    a = ap.parse_args()

    items = []
    for first in sorted(glob.glob("freegen/img/carousel-*-1.png")):
        base = os.path.basename(first)[:-6]              # carousel-<slug>
        slug = base[len("carousel-"):]
        files = sorted(glob.glob(f"freegen/img/{base}-*.png"))
        items.append(("Karussell", deslug(slug), "; ".join(os.path.basename(f) for f in files)))
    if a.reels > 0:
        reels = sorted(glob.glob("freegen/out/hub-*.mp4"), key=os.path.getmtime, reverse=True)[: a.reels]
        for r in reels:
            slug = os.path.basename(r)[len("hub-"):-4]
            items.append(("Reel", deslug(slug), os.path.basename(r)))

    if not items:
        sys.exit("❌ Keine Assets in freegen/img bzw. freegen/out gefunden.")

    start = datetime.date.today() + datetime.timedelta(days=1)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Nr", "Datum", "Typ", "Thema", "Dateien", "Plattformen", "Caption", "Status"])
        for i, (typ, topic, files) in enumerate(items, 1):
            datum = (start + datetime.timedelta(days=i - 1)).isoformat()
            w.writerow([i, datum, typ, topic, files, PLATFORMS, cap_for(topic), "offen"])
    print(f"✔ {len(items)} Einträge → {a.out}  (1 Post/Tag ab {start.isoformat()})")


if __name__ == "__main__":
    main()
