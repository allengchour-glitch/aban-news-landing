#!/usr/bin/env python3
# =============================================================================
#  freegen_caption — fertige Social-Caption + Hashtags zu einem Thema
# -----------------------------------------------------------------------------
#  Macht den Content-Vorrat sofort postbar: liefert pro Thema eine kurze,
#  anti-hype Caption (Hook → Nutzen → CTA zu abannews.com) plus passende Hashtags.
#  Erfindet keine Fakten. Gratis-KI (Groq bevorzugt), Key nur aus env.
#
#  Aufruf:
#    GROQ_API_KEY=… python3 automation/freegen_caption.py "KI für Selbstständige"
#    … python3 automation/freegen_caption.py "Thema" --out freegen/captions.md
# =============================================================================

import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import freegen_ai

LINK = "abannews.com"


def caption(topic, link=LINK):
    sysmsg = ("Du bist nüchterner deutscher Social-Media-Redakteur (anti-hype, kein Clickbait). "
              "Natürliches Deutsch, keine erfundenen Fakten/Zahlen, keine Emojis-Flut (max 2).")
    prompt = (
        f'Schreibe eine Social-Media-Caption (Instagram/LinkedIn) für einen Post zum Thema "{topic}".\n'
        f'2-3 kurze Sätze: neugieriger Hook, konkreter Nutzen, klare Handlungsaufforderung zu {link}.\n'
        "Danach eine Leerzeile und 6-8 passende Hashtags (DE/EN gemischt, klein, ohne Sonderzeichen).\n"
        "Anti-hype, ehrlich, sofort verwendbar."
    )
    return freegen_ai.chat(prompt, sysmsg, max_tokens=300)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("topic")
    ap.add_argument("--link", default=LINK)
    ap.add_argument("--out")
    a = ap.parse_args()
    if not freegen_ai.available():
        sys.exit("❌ Kein LLM-Key (z. B. GROQ_API_KEY) in der Umgebung.")
    text = caption(a.topic, a.link)
    if not text:
        sys.exit("❌ KI nicht erreichbar.")
    block = f"## {a.topic}\n\n{text.strip()}\n"
    print("\n" + block)
    if a.out:
        with open(a.out, "a", encoding="utf-8") as f:
            f.write(block + "\n---\n\n")
        print(f"✅ angehängt an {a.out}")


if __name__ == "__main__":
    main()
