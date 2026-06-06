#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Balkendiagramm aus ECHTEN Zahlen (Pillow, keine Erfindung).

Rendert ein markenkonformes Diagramm aus DATEN, die DU lieferst — mit
PFLICHT-Quellenangabe direkt im Bild. KI „malt" hier nichts; die Zahlen kommen
aus deiner Eingabe (JSON/CSV). So bleibt es ehrlich und verifizierbar.

Eingabe (JSON):
  {"title":"...","source":"Quelle: ...","unit":"%","data":[["Label",12.3],["Label2",45]]}

CLI:
  python3 automation/gen_chart.py daten.json out.png
API:
  from gen_chart import make_chart
  make_chart("Titel", [("A",12),("B",34)], "Quelle: X (2026)", "out.png", unit="%")
"""
from __future__ import annotations

import json
import sys
from PIL import Image, ImageDraw, ImageFont

BG = (255, 250, 242)
INK = (31, 41, 55)
AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
MUTED = (107, 114, 128)
GRID = (236, 230, 219)

SANS_BOLD = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
SANS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]


def _font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fmt(v, unit):
    s = (f"{v:.0f}" if float(v).is_integer() else f"{v:.1f}").replace(".", ",")
    return s + unit


def make_chart(title, data, source, out_path, unit="", size=(1080, 1080)):
    if not data:
        raise ValueError("Keine Daten.")
    if not source or not str(source).strip():
        raise ValueError("Quellenangabe ist Pflicht (Ehrlichkeit) — bitte 'source' setzen.")
    W, H = size
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    M = 80
    d.rectangle([0, 0, W, 14], fill=AMBER)

    # Wortmarke
    wm = _font(SANS_BOLD, 34)
    d.ellipse([M, M, M + 20, M + 20], fill=AMBER)
    d.text((M + 32, M - 6), "aban news", font=wm, fill=INK)

    # Titel (auto-schrumpfend, damit lange Titel nicht überlaufen)
    ts = 52
    title_f = _font(SANS_BOLD, ts)
    while title and d.textlength(title, font=title_f) > (W - 2 * M) and ts > 30:
        ts -= 2
        title_f = _font(SANS_BOLD, ts)
    d.text((M, M + 50), title, font=title_f, fill=INK)

    # Plot-Bereich
    top = M + 170
    bottom = H - 170
    left = M
    right = W - M
    vmax = max(float(v) for _, v in data) or 1.0
    n = len(data)
    gap = 26
    bw = (right - left - gap * (n - 1)) / n
    lab_f = _font(SANS_BOLD, 30)
    val_f = _font(SANS_BOLD, 34)

    for i, (label, val) in enumerate(data):
        x0 = left + i * (bw + gap)
        x1 = x0 + bw
        h = (float(val) / vmax) * (bottom - top - 60)
        y0 = bottom - h
        d.rectangle([x0, y0, x1, bottom], fill=AMBER)
        # Wert über dem Balken
        vt = _fmt(val, unit)
        d.text((x0 + bw / 2 - d.textlength(vt, font=val_f) / 2, y0 - 46), vt, font=val_f, fill=AMBER_DK)
        # Label unter dem Balken
        lt = str(label)
        d.text((x0 + bw / 2 - d.textlength(lt, font=lab_f) / 2, bottom + 14), lt, font=lab_f, fill=INK)

    # Grundlinie
    d.line([left, bottom, right, bottom], fill=GRID, width=3)

    # Quelle (Pflicht) + Footer
    src_f = _font(SANS, 26)
    d.text((M, H - 96), str(source), font=src_f, fill=MUTED)
    d.text((M, H - 58), "abannews.com · ehrlich, ohne Hype", font=_font(SANS_BOLD, 28), fill=AMBER_DK)

    img.save(out_path, "JPEG" if out_path.lower().endswith((".jpg", ".jpeg")) else "PNG", quality=90)
    return out_path


def _from_json(path):
    spec = json.loads(open(path, encoding="utf-8").read())
    data = [(d[0], float(d[1])) for d in spec["data"]]
    return make_chart(spec.get("title", ""), data, spec.get("source", ""),
                      sys.argv[2] if len(sys.argv) > 2 else "chart.png",
                      unit=spec.get("unit", ""))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].endswith(".json"):
        print("Diagramm:", _from_json(sys.argv[1]))
    else:
        # Demo mit klar gekennzeichneten BEISPIEL-Daten
        print("Diagramm:", make_chart(
            "BEISPIEL — echte Zahlen einsetzen",
            [("2024", 19), ("2025", 28), ("2026", 35)],
            "Quelle: [hier echte Quelle eintragen]",
            sys.argv[1] if len(sys.argv) > 1 else "chart.png", unit="%"))
