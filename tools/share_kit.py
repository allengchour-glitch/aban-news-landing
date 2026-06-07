#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Share-Kit: fertige Copy-Paste-Posts zum organischen Teilen.

Erzeugt aus echten Branchen-Hubs ehrliche, anti-hype Teilen-Texte (LinkedIn,
WhatsApp, Reddit) → `docs/SHARE-KIT.md`. Damit ist der einzige nicht-autonome
Wachstumshebel („selbst teilen") nur noch ein Klick: Block kopieren, posten.

Deterministisch (kein API-Key, keine Kosten). Texte aus <h1>/<title> der Hubs —
KEINE erfundenen Zahlen, du-Form, kein Buzzword-Sprech.

    python3 tools/share_kit.py [--n 8] [--slugs aerzte,anwaelte,...]
"""
from __future__ import annotations

import argparse
import datetime as dt
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "SHARE-KIT.md"
BASE = "https://abannews.com"
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
TAG_RE = re.compile(r"<[^>]+>")

# Bevorzugte, kauf-/entscheidungsnahe Branchen (nur wenn vorhanden).
PREFERRED = ["aerzte", "anwaelte", "steuerberater", "handwerker", "gastronomie",
             "immobilienmakler", "zahnaerzte", "physiotherapie", "architekten",
             "coaches", "onlineshops", "friseure"]


def _text(s: str) -> str:
    return TAG_RE.sub("", s).replace("&amp;", "&").strip()


def hook_of(path: Path) -> str:
    s = path.read_text(encoding="utf-8", errors="ignore")
    m = H1_RE.search(s)
    return _text(m.group(1)) if m else ""


def branche_of(path: Path, slug: str) -> str:
    s = path.read_text(encoding="utf-8", errors="ignore")
    m = TITLE_RE.search(s)
    if m:
        t = _text(m.group(1)).split("|")[0]
        t = re.split(r"\s[—–-]\s", t, 1)[0]
        t = re.sub(r"\(20\d\d\)", "", t).replace("KI für", "").replace("KI fürs", "")
        t = t.replace("KI im", "").replace("KI in der", "").replace("KI in", "").strip()
        if t:
            return t
    return slug.replace("-", " ").title()


def pick(n: int, slugs: list[str] | None) -> list[str]:
    have = {Path(f).name[len("ki-fuer-"):-len(".html")]
            for f in glob.glob(str(ROOT / "ki-fuer-*.html"))}
    if slugs:
        return [s for s in slugs if s in have]
    chosen = [s for s in PREFERRED if s in have]
    if len(chosen) < n:  # mit alphabetischem Rest auffüllen
        chosen += [s for s in sorted(have) if s not in chosen]
    return chosen[:n]


def block(slug: str) -> str:
    p = ROOT / f"ki-fuer-{slug}.html"
    hook = hook_of(p)
    br = branche_of(p, slug)
    url = f"{BASE}/ki-fuer-{slug}.html"
    li = (f"{hook}\n\n"
          f"Genau darum geht es im neuen Guide von aban news: konkrete KI-Anwendungen "
          f"für {br} — ehrlich, mit klaren Grenzen, ohne Hype.\n\n"
          f"→ {url}\n\n"
          f"aban news ist ein werktäglicher KI-Newsletter (3–5 Min, kein Hype): abannews.com")
    wa = f"Falls dich KI für {br} interessiert — ehrlicher Überblick ohne Hype, mit klaren Grenzen: {url}"
    rd_t = f"KI für {br}: was wirklich Zeit spart (und was nicht)"
    rd_b = (f"{hook}\n\n"
            f"Ich habe einen ehrlichen Überblick zusammengetragen — konkrete Anwendungen "
            f"und klare Grenzen, kein Tool-Verkauf: {url}\n\nFeedback willkommen.")
    return (f"## {br}\n\n"
            f"**LinkedIn / Threads**\n```\n{li}\n```\n\n"
            f"**WhatsApp / Signal**\n```\n{wa}\n```\n\n"
            f"**Reddit** — Titel: `{rd_t}`\n```\n{rd_b}\n```\n")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--n", type=int, default=8)
    ap.add_argument("--slugs", default="", help="Komma-Liste statt Auto-Auswahl")
    args = ap.parse_args()
    slugs = [s.strip() for s in args.slugs.split(",") if s.strip()] or None
    chosen = pick(args.n, slugs)

    today = dt.date.today().isoformat()
    L = [f"# Share-Kit — fertige Teilen-Posts ({today})", "",
         "Kopier einen Block, poste ihn auf der jeweiligen Plattform. Alles ehrlich, du-Form,",
         "ohne erfundene Zahlen. Wechsel die Branchen durch, damit es nicht eintönig wirkt.",
         "Tipp: 1 Post/Tag reicht — Stetigkeit schlägt Masse.", "",
         "> ⚠️ Nicht automatisierbar: das Posten selbst (Plattform-Regeln). Dieses Kit macht",
         "> nur die Schreibarbeit weg — der Klick bleibt bei dir.", ""]
    for s in chosen:
        L.append(block(s))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"✓ Share-Kit geschrieben: {OUT.relative_to(ROOT)} ({len(chosen)} Branchen)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
