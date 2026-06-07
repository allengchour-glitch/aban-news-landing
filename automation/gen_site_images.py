#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Header-Bilder für die Webseite generieren + einbinden (idempotent).

Quelle gemischt & budgetbewusst:
  • Branchen-Hubs (ki-fuer-*.html)  → Pexels (echte Fotos, gratis)
  • themen/*.html + index + founding → KI/Imagen (markentypisch, ~0,04 $/Bild)

Bilder werden SELBST GEHOSTET unter img/site/ (kein Hotlinking). Pro Seite wird ein
responsives Header-Bild nach dem ersten </h1> eingefügt (Marker data-aban-hero,
loading=lazy, feste Höhe via object-fit → wenig Layout-Shift). Nur eingebunden, wenn
das Bild wirklich existiert (kein kaputtes <img>). Alles idempotent.

Läuft in CI (Secrets vorhanden). Batch-fähig gegen Timeouts/Kosten.

    python3 automation/gen_site_images.py --kind hub --batch 20 --offset 0
    python3 automation/gen_site_images.py --kind themen|pages|all
"""
from __future__ import annotations

import argparse
import glob
import html as _html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMGDIR = ROOT / "img" / "site"
sys.path.insert(0, str(ROOT / "automation"))
try:
    from pexels_image import fetch_image
except Exception:  # noqa: BLE001
    fetch_image = None
try:
    from gen_image_gemini import make_image, set_aspect
except Exception:  # noqa: BLE001
    make_image = None
    set_aspect = None

MARKER = "data-aban-hero"
H1_RE = re.compile(r"(<h1\b[^>]*>.*?</h1>)", re.S | re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
TAGS = re.compile(r"<[^>]+>")
EXISTING = re.compile(r'\s*<img ' + re.escape(MARKER) + r'[^>]*>', re.I)


def _title(p: Path) -> str:
    m = TITLE_RE.search(p.read_text(encoding="utf-8", errors="ignore"))
    if m:
        t = TAGS.sub("", m.group(1)).split("|")[0].replace("&amp;", "&").strip()
        t = re.split(r"\s[—–-]\s", t, 1)[0]
        return t or "aban news"
    return "aban news"


def _hook(p: Path) -> str:
    s = p.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"<h1\b[^>]*>(.*?)</h1>", s, re.S | re.I)
    return TAGS.sub("", m.group(1)).strip() if m else _title(p)


def targets(kind: str):
    out = []
    if kind in ("hub", "all"):
        for f in sorted(glob.glob(str(ROOT / "ki-fuer-*.html"))):
            slug = Path(f).name[len("ki-fuer-"):-len(".html")]
            out.append((Path(f), f"hub-{slug}", "pexels"))
    if kind in ("themen", "all"):
        for f in sorted(glob.glob(str(ROOT / "themen" / "*.html"))):
            out.append((Path(f), f"themen-{Path(f).stem}", "ai"))
    if kind in ("pages", "all"):
        for n in ("index.html", "founding.html"):
            if (ROOT / n).exists():
                out.append((ROOT / n, Path(n).stem, "ai"))
    return out


def make_one(page: Path, name: str, source: str):
    """Bild erzeugen (falls fehlt). Gibt (relpath, abspath) oder None."""
    IMGDIR.mkdir(parents=True, exist_ok=True)
    ext = "jpg" if source == "pexels" else "png"
    out = IMGDIR / f"{name}.{ext}"
    rel = f"/img/site/{out.name}"
    if out.exists() and out.stat().st_size > 1000:
        return rel, out  # idempotent: schon da
    hook = _hook(page)
    res = None
    if source == "pexels" and fetch_image:
        res = fetch_image(hook, str(out), orientation="landscape")
    elif source == "ai" and make_image:
        if set_aspect:
            set_aspect("16:9")
        res = make_image(hook, str(out))
    return (rel, out) if res else None


def inject(page: Path, rel: str, alt: str) -> str:
    s = page.read_text(encoding="utf-8")
    img = (f'<img {MARKER} src="{rel}" alt="{_html.escape(alt)}" loading="lazy" decoding="async" '
           f'style="width:100%;max-height:300px;object-fit:cover;border-radius:14px;margin:1.2rem 0">')
    if MARKER in s:
        new = EXISTING.sub("\n" + img, s, count=1)
        action = "unchanged" if new == s else "updated"
    else:
        m = H1_RE.search(s)
        if not m:
            return "skipped"
        new = s[:m.end()] + "\n" + img + s[m.end():]
        action = "inserted"
    if action != "unchanged":
        page.write_text(new, encoding="utf-8")
    return action


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--kind", choices=["hub", "themen", "pages", "all"], default="hub")
    ap.add_argument("--batch", type=int, default=0, help="max. Seiten pro Lauf (0 = alle)")
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--source", choices=["pexels", "ai"], help="Quelle erzwingen")
    args = ap.parse_args()

    items = targets(args.kind)[args.offset:]
    if args.batch:
        items = items[:args.batch]
    made = injected = failed = 0
    for page, name, source in items:
        src = args.source or source
        r = make_one(page, name, src)
        if not r:
            failed += 1
            print(f"  ✗ kein Bild ({src}): {page.name}")
            continue
        made += 1
        alt = f"Illustration: {_title(page)}" if src == "ai" else f"Foto zu {_title(page)}"
        act = inject(page, r[0], alt)
        if act in ("inserted", "updated"):
            injected += 1
    print(f"✓ {made} Bilder, {injected} Seiten eingebunden, {failed} ohne Bild "
          f"({len(items)} bearbeitet, kind={args.kind}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
