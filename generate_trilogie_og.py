"""
aban news — OG-Image-Generator für die Trilogie-Seite (1200×630, Pillow).

Erzeugt das Open-Graph-Bild für trilogie.html → og-trilogie.png.
Nutzt denselben Look wie og-buch.png: das Layout aus generate_buch_og.make()
wird wiederverwendet (eine Quelle der Wahrheit für Brand-Farben/Fonts).

Run:  python3 generate_trilogie_og.py
Dep:  pip install pillow
"""
from generate_buch_og import make


def build():
    make(
        "og-trilogie.png",
        "DRAMA · TRILOGIE",
        "Das Tal",
        ["Ein Generationendrama", "in drei Bänden"],
        "Kapitel für Kapitel mit Claude Opus  ·  abannews.com",
        title_size=128,
    )


if __name__ == "__main__":
    build()
