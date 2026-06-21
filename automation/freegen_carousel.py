#!/usr/bin/env python3
# =============================================================================
#  freegen_carousel — KI-Karussell (mehrseitiger Social-Post) für IG/LinkedIn
# -----------------------------------------------------------------------------
#  Erzeugt aus einem Thema ein 5-Slide-Karussell (Hook → 3 Tipps → CTA) als
#  gebrandete quadratische Bilder. KI-Texte über die Gratis-KI (Groq bevorzugt),
#  Rendering über automation/freegen_image.py. Kostenlos, lokal.
#
#  🔐 API-Key nur aus env (z. B. GROQ_API_KEY). Ohne Key → Fallback-Texte.
#
#  Aufruf:
#    GROQ_API_KEY=… python3 automation/freegen_carousel.py "KI für Selbstständige"
#    python3 automation/freegen_carousel.py "Thema" --desc "Kontext" --slug mein-post
# =============================================================================

import argparse, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import freegen_ai

OUT = "freegen/img"
BRAND = "ABANNEWS.COM"


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "karussell"


def render_slide(text, kicker, out, accent):
    r = subprocess.run([sys.executable, "automation/freegen_image.py",
                        "--headline", text[:70], "--kicker", kicker[:24],
                        "--brand", BRAND, "--size", "square", "--accent", accent, "--out", out])
    return r.returncode == 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("topic")
    ap.add_argument("--desc", default="")
    ap.add_argument("--slug")
    a = ap.parse_args()

    slug = a.slug or slugify(a.topic)
    slides = freegen_ai.carousel_copy(a.topic, a.desc) if freegen_ai.available() else None
    if not slides:
        slides = [a.topic, "Tipp 1: klein anfangen", "Tipp 2: Ergebnisse prüfen",
                  "Tipp 3: dranbleiben", "Mehr auf abannews.com"]
        print("ℹ️  Kein KI-Key → Fallback-Texte.")

    kickers = ["aban news"] + [f"{i}/{len(slides) - 2}" for i in range(1, len(slides) - 1)] + ["abannews.com"]
    accents = ["#e8b04b", "#5ad19b", "#6ab7ff", "#e8b04b", "#5ad19b"]
    os.makedirs(OUT, exist_ok=True)
    made = []
    for i, text in enumerate(slides):
        out = os.path.join(OUT, f"carousel-{slug}-{i + 1}.png")
        if render_slide(text, kickers[i] if i < len(kickers) else "aban news", out, accents[i % len(accents)]):
            made.append(out)
            print(f"  ✅ Slide {i + 1}: {text}")
    print(f"\n✔ {len(made)} Slides → {OUT}/carousel-{slug}-*.png")


if __name__ == "__main__":
    main()
