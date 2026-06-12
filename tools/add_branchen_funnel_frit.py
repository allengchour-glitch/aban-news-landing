#!/usr/bin/env python3
"""Ergänzt in den FR-/IT-Branchen-Hubs den Link zum sprachrichtigen KI-Werkzeug.

Die FR/IT-Hubs haben bereits einen Tool-CTA (data-aban-tools-cta), aber er
verlinkte das KI-Werkzeug nicht (das es früher nur DE/EN gab). Dieses Skript
fügt — NICHT-destruktiv — zwei Buttons an den ANFANG der bestehenden Button-
Reihe ein: das FR/IT-Werkzeug und die FR/IT-Anleitung. Bestehende Links
bleiben unangetastet.

Idempotent: Ist der Werkzeug-Link schon da, wird die Datei übersprungen.
Aufruf:  python3 tools/add_branchen_funnel_frit.py [--dry] [fr|it|both]
"""
import glob, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROW = '<p style="margin:0;display:flex;flex-wrap:wrap;gap:.55rem">'
BTN = ('<a href="{href}" style="display:inline-block;background:#b45309;color:#fff;'
       'text-decoration:none;font-weight:600;padding:9px 16px;border-radius:8px;'
       'font-size:.92rem">{label}</a>')

CFG = {
    "fr": {
        "tool": "/fr/ki-werkzeug.html", "tool_label": "Outil IA : des textes en minutes →",
        "guide": "/fr/hilfe-ki-werkzeug.html", "guide_label": "Guide pas à pas →",
    },
    "it": {
        "tool": "/it/ki-werkzeug.html", "tool_label": "Strumento IA: testi in minuti →",
        "guide": "/it/hilfe-ki-werkzeug.html", "guide_label": "Guida passo dopo passo →",
    },
}


def run(lang: str, dry: bool):
    c = CFG[lang]
    inject = ("\n    " + BTN.format(href=c["tool"], label=c["tool_label"])
              + "\n    " + BTN.format(href=c["guide"], label=c["guide_label"]))
    files = sorted(glob.glob(str(ROOT / lang / "ki-fuer-*.html")))
    done = already = skip = 0
    for f in files:
        p = Path(f)
        s = p.read_text(encoding="utf-8")
        if f'href="{c["tool"]}"' in s:
            already += 1
            continue
        i = s.find(ROW)
        if i == -1:
            skip += 1
            continue
        pos = i + len(ROW)
        new = s[:pos] + inject + s[pos:]
        if not dry:
            p.write_text(new, encoding="utf-8")
        done += 1
    print(f"[{lang}] {'[dry] ' if dry else ''}{done} ergänzt, {already} schon vorhanden, "
          f"{skip} ohne CTA-Reihe übersprungen, {len(files)} gesamt.")


def main():
    dry = "--dry" in sys.argv
    langs = [x for x in ("fr", "it") if x in sys.argv] or ["fr", "it"]
    for lang in langs:
        run(lang, dry)


if __name__ == "__main__":
    main()
