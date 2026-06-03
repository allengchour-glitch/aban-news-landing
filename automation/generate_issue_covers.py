#!/usr/bin/env python3
"""Generiert markenkonforme SVG-Titelbilder pro Newsletter-Ausgabe.

Warum SVG: selbst erzeugt = 100 % eigene Rechte (keine Stock-/Lizenzkosten, kein
Bildrechte-Risiko), vektorbasiert (gestochen scharf auf jedem Display), winzige
Dateigröße. Pro Ausgabe ein 1200x630-Titelbild im warmen aban-Coffee-Stil:
Kategorie-Farbverlauf + großes Icon + Ausgabennummer + Schlagzeile.

    python3 automation/generate_issue_covers.py            # schreibt img/issues/NNN.svg
    python3 automation/generate_issue_covers.py --check     # CI: Exit 1 bei fehlenden

Quelle: archive/NNN-YYYY-MM-DD-slug.html (Nummer, Datum, Titel).
Lizenz der erzeugten Bilder: Eigenproduktion von aban news, frei nutzbar.
"""
import argparse
import glob
import html
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "archive"
OUT_DIR = ROOT / "img" / "issues"

# Kategorie -> (Label, Farbe dunkel, Farbe hell, Emoji)
CATS = [
    (r"werkzeugkasten|tool|getestet|test",       ("Tool-Test",       "#0f766e", "#14b8a6", "🧰")),
    (r"dsgvo|eu ai|ai act|absetz|steuer|recht|schweiz|selbstst", ("Praxis", "#b45309", "#f59e0b", "⚖️")),
    (r"mistral|openai|claude|gpt|gemini|sonnet|opus|aleph|modell|drift", ("Modelle", "#1e40af", "#3b82f6", "🤖")),
    (r"mail|stack|automat|workflow|no-code|agent",("Workflow",        "#6d28d9", "#8b5cf6", "⚙️")),
    (r"ersetzt|numbers|bilanz|markt|preis|china", ("Analyse",         "#be123c", "#f43f5e", "📊")),
]
DEFAULT = ("KI-News", "#374151", "#6b7280", "📰")


def esc(s):
    return html.escape(str(s or ""), quote=True)


def category(text):
    t = text.lower()
    for pat, meta in CATS:
        if re.search(pat, t):
            return meta
    return DEFAULT


def headline(title):
    return re.sub(r"^Ausgabe\s+\d+\s*[—–-]\s*", "", title).strip()


def wrap(text, max_chars=26, max_lines=3):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len((cur + " " + w).strip()) <= max_chars:
            cur = (cur + " " + w).strip()
        else:
            lines.append(cur)
            cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and cur:
        lines[-1] = lines[-1].rstrip(".,;: ") + " …"
    return lines[:max_lines]


def svg(num, date, title):
    label, c_dk, c_lt, emoji = category(title)
    lines = wrap(headline(title))
    tspans = "".join(
        f'<tspan x="80" dy="{0 if i == 0 else 64}">{esc(ln)}</tspan>'
        for i, ln in enumerate(lines)
    )
    y_start = 300 - (len(lines) - 1) * 32
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="aban news Ausgabe {num}: {esc(headline(title))}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{c_dk}"/>
      <stop offset="1" stop-color="{c_lt}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.08">
    <circle cx="1040" cy="120" r="6"/><circle cx="1090" cy="170" r="6"/><circle cx="1140" cy="120" r="6"/>
    <circle cx="1090" cy="70" r="6"/><circle cx="1040" cy="220" r="6"/><circle cx="1140" cy="220" r="6"/>
  </g>
  <text x="80" y="92" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="30" font-weight="800" fill="#ffffff" opacity="0.95">☕ aban news</text>
  <rect x="80" y="120" width="{40 + len(label)*15}" height="40" rx="20" fill="#ffffff" opacity="0.18"/>
  <text x="100" y="147" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="22" font-weight="700" fill="#ffffff">{esc(label)}</text>
  <text x="980" y="150" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="120" opacity="0.9">{emoji}</text>
  <text x="80" y="{y_start}" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="58" font-weight="800" fill="#ffffff" letter-spacing="-1">{tspans}</text>
  <text x="80" y="560" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="26" font-weight="600" fill="#ffffff" opacity="0.9">Ausgabe {num} · {esc(date)}</text>
</svg>
'''


def collect():
    out = []
    for f in sorted(glob.glob(str(ARCHIVE / "[0-9]*.html"))):
        base = os.path.basename(f)
        m = re.match(r"(\d+)-(\d{4}-\d{2}-\d{2})-", base)
        if not m:
            continue
        num, date = m.groups()
        s = open(f, encoding="utf-8").read()
        tm = re.search(r"<title>(.*?)</title>", s, re.S)
        title = html.unescape(tm.group(1).split("|")[0]).strip() if tm else f"Ausgabe {num}"
        out.append((num, date, title))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    issues = collect()
    missing, written = [], 0
    for num, date, title in issues:
        p = OUT_DIR / f"{num}.svg"
        content = svg(num, date, title)
        if args.check:
            if not p.exists() or p.read_text(encoding="utf-8") != content:
                missing.append(p.name)
            continue
        if not p.exists() or p.read_text(encoding="utf-8") != content:
            p.write_text(content, encoding="utf-8")
            written += 1
    if args.check:
        if missing:
            print(f"::error::{len(missing)} Ausgaben-Cover fehlen/veraltet: {missing[:5]}")
            return 1
        print(f"Alle {len(issues)} Ausgaben-Cover aktuell.")
        return 0
    print(f"{len(issues)} Ausgaben geprüft, {written} SVG-Cover neu/aktualisiert in img/issues/.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
