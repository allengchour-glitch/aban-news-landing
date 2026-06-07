#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — bild-reiche, ausführliche Newsletter-Ausgabe aus dem Gemini-Entwurf bauen.

Liest den neuesten `entwurf-gemini-*.md` (strukturiertes Format aus draft_with_gemini.py),
erzeugt pro Update ein Bild (abwechselnd echtes Pexels-Foto + Imagen-Illustration), optional
einen echten-Daten-Chart (nur wenn `automation/issue-data-<DATUM>.json` existiert — nie Zahlen
erfinden), und rendert eine fertige HTML-Ausgabe nach `data/issue-<DATUM>-draft.html`
(beehiiv-Copy-Paste + Vorschau, NOINDEX). Bilder selbst gehostet unter `img/issues/<DATUM>/`.

No-op-sicher: ohne Bild-Keys → Marken-Karte als Fallback (nie kaputtes <img>). Versand bleibt Mensch.

    python3 automation/build_issue.py
"""
from __future__ import annotations

import argparse
import datetime as dt
import glob
import html
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))
import pexels_image          # noqa: E402
import gen_image_gemini      # noqa: E402
import gen_card              # noqa: E402
try:
    import gen_chart         # noqa: E402
except Exception:            # noqa: BLE001
    gen_chart = None

SITE = os.environ.get("ABAN_SITE_URL", "https://abannews.com").rstrip("/")
LABELS = ("INTRO", "UPDATE", "WAS", "QUELLE", "BILD", "TIEFER", "TOOL", "PROMPT", "OUTRO")
LABEL_RE = re.compile(r"^\s*[#*>\s]*(" + "|".join(LABELS) + r")\s*:\s*(.*)$", re.I)


def latest_entwurf() -> Path | None:
    files = sorted(glob.glob(str(ROOT / "entwurf-gemini-*.md")))
    return Path(files[-1]) if files else None


def issue_date(p: Path) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})", p.name)
    return m.group(1) if m else dt.date.today().isoformat()


def parse(md: str) -> dict:
    intro, tiefer, tool, prompt, outro = [], [], [], [], []
    updates: list[dict] = []
    state = None
    buf = {"intro": intro, "tiefer": tiefer, "tool": tool, "prompt": prompt, "outro": outro}
    for ln in md.splitlines():
        m = LABEL_RE.match(ln)
        if m:
            lab, val = m.group(1).upper(), m.group(2).strip()
            if lab == "INTRO":
                state = "intro"
            elif lab == "UPDATE":
                updates.append({"headline": val, "body": [], "was": [], "quelle": "", "bild": ""})
                state = "ubody"
                continue
            elif lab == "WAS":
                state = "was"
            elif lab == "QUELLE":
                if updates:
                    updates[-1]["quelle"] = val
                state = None
                continue
            elif lab == "BILD":
                if updates:
                    updates[-1]["bild"] = val
                state = None
                continue
            elif lab == "TIEFER":
                state = "tiefer"
            elif lab == "TOOL":
                state = "tool"
            elif lab == "PROMPT":
                state = "prompt"
            elif lab == "OUTRO":
                state = "outro"
            if val:
                _add(state, val, buf, updates)
            continue
        if ln.strip() and state:
            _add(state, ln.strip(), buf, updates)
    return {"intro": " ".join(intro).strip(), "updates": updates,
            "tiefer": "\n".join(tiefer).strip(), "tool": " ".join(tool).strip(),
            "prompt": "\n".join(prompt).strip(), "outro": " ".join(outro).strip()}


def _add(state, val, buf, updates):
    if state == "ubody" and updates:
        updates[-1]["body"].append(val)
    elif state == "was" and updates:
        updates[-1]["was"].append(val)
    elif state in buf:
        buf[state].append(val)


def make_visual(hook: str, base: str, imgdir: Path, prefer: str):
    """Bild erzeugen: bevorzugte Quelle → andere → Marken-Karte. Gibt Pfad oder None."""
    jpg, png, card = imgdir / f"{base}.jpg", imgdir / f"{base}.png", imgdir / f"{base}-card.jpg"
    for p in (jpg, png, card):
        if p.exists() and p.stat().st_size > 1000:
            return p
    tries = [("pexels", jpg), ("ai", png)] if prefer == "pexels" else [("ai", png), ("pexels", jpg)]
    for src, p in tries:
        try:
            if src == "pexels":
                r = pexels_image.fetch_image(hook, str(p), orientation="landscape")
            else:
                gen_image_gemini.set_aspect("16:9")
                r = gen_image_gemini.make_image(hook, str(p))
            if r:
                return Path(r)
        except Exception as e:  # noqa: BLE001
            print(f"::warning::Bild ({src}) fehlgeschlagen für {base}: {e}")
    try:
        return Path(gen_card.make_card(hook, str(card)))
    except Exception:  # noqa: BLE001
        return None


def optimize(p: Path | None) -> Path | None:
    """Große KI-PNGs (~1 MB) → schlanke JPGs (max 1280px) für E-Mail/Web. JPG bleibt JPG."""
    if not p or p.suffix.lower() != ".png":
        return p
    try:
        from PIL import Image
        img = Image.open(p).convert("RGB")
        if img.width > 1280:
            img = img.resize((1280, round(img.height * 1280 / img.width)))
        jpg = p.with_suffix(".jpg")
        img.save(jpg, "JPEG", quality=82, optimize=True)
        if jpg != p:
            p.unlink(missing_ok=True)
        return jpg
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Bild-Optimierung übersprungen ({p.name}): {e}")
        return p


def rel_url(p: Path | None, date: str) -> str:
    return f"{SITE}/img/issues/{date}/{p.name}" if p else ""


def img_tag(url: str, alt: str, maxh: int = 360) -> str:
    if not url:
        return ""
    return (f'<img src="{url}" alt="{html.escape(alt)}" loading="lazy" decoding="async" '
            f'style="width:100%;max-height:{maxh}px;object-fit:cover;border-radius:14px;'
            f'margin:.8rem 0;display:block">')


def paras(text: str) -> str:
    return "".join(f"<p>{html.escape(b.strip())}</p>" for b in text.split("\n") if b.strip())


def build_chart(date: str, imgdir: Path):
    f = ROOT / f"issue-data-{date}.json"
    if not (f.exists() and gen_chart):
        return None, ""
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
        data = [(str(l), float(v)) for l, v in d["data"]]
        out = imgdir / "chart.png"
        gen_chart.make_chart(d["title"], data, d["source"], str(out), unit=d.get("unit", ""))
        return out, d.get("source", "")
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Chart übersprungen: {e}")
        return None, ""


def plaintext(s: dict) -> str:
    parts = [s["intro"]]
    for u in s["updates"]:
        parts += [u["headline"], " ".join(u["body"]), " ".join(u["was"])]
    parts += [s["tiefer"], s["tool"], s["prompt"], s["outro"]]
    return "\n\n".join(p for p in parts if p)


def voice_gate(text: str):
    linter = REPO / "tools" / "brand-voice-linter.py"
    if not linter.exists():
        return
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(text)
        tmp = f.name
    try:
        r = subprocess.run([sys.executable, str(linter), tmp, "--strict"],
                           capture_output=True, text=True)
        print("Brand-Voice:", "✓ bestanden" if r.returncode == 0
              else "⚠️ " + (r.stdout or r.stderr).strip().splitlines()[-1:][0] if (r.stdout or r.stderr) else "⚠️")
    finally:
        os.unlink(tmp)


def render(s: dict, date: str, imgdir: Path) -> str:
    A = "#b45309"
    css = ("body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
           "color:#1f2937;background:#fffbf5;line-height:1.7;max-width:680px;margin:0 auto;padding:24px;font-size:17px}"
           "h1{font-size:1.7rem;line-height:1.2}h2{font-size:1.25rem;margin:1.8rem 0 .4rem}"
           f"a{{color:{A}}}.card{{background:#fff;border:1px solid #ece3d4;border-radius:14px;padding:1.1rem 1.2rem;margin:1.2rem 0}}"
           f".was{{background:#fffaf0;border-left:3px solid {A};border-radius:8px;padding:.7rem .9rem;margin:.6rem 0;font-size:.97rem}}"
           ".src{font-size:.85rem;color:#6b7280}"
           f".prompt{{background:#1c2530;color:#f3f4f6;border-radius:12px;padding:1rem 1.2rem}}.prompt pre{{white-space:pre-wrap;margin:0;font-size:.92rem}}"
           f".cta{{text-align:center;margin:2rem 0}}.cta a{{display:inline-block;background:{A};color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:10px}}"
           ".cap{font-size:.82rem;color:#6b7280;text-align:center;margin:.2rem 0 0}")
    cover = optimize(make_visual(s["updates"][0]["bild"] if s["updates"] else "warm editorial ai workspace",
                                 "cover", imgdir, prefer="ai"))
    H = [f"<!doctype html><html lang=de><head><meta charset=utf-8>",
         '<meta name="viewport" content="width=device-width,initial-scale=1">',
         '<meta name="robots" content="noindex,nofollow">',
         f"<title>aban news — Ausgabe {date} (Entwurf)</title><style>{css}</style></head><body>",
         "<!-- ENTWURF — vor Versand prüfen. Für beehiiv: diesen Body kopieren. -->",
         f"<p style='font-size:.8rem;color:#9a3412'>☕ aban news · Ausgabe {date}</p>"]
    if cover:
        H.append(img_tag(rel_url(cover, date), "aban news", 420))
    if s["intro"]:
        H.append(f"<h1>{html.escape(s['intro'][:90])}</h1>" if len(s["intro"]) < 90
                 else f"<p style='font-size:1.1rem'>{html.escape(s['intro'])}</p>")
    H.append("<h2>📰 Was heute zählt</h2>")
    for i, u in enumerate(s["updates"]):
        img = optimize(make_visual(u["bild"] or u["headline"], f"update-{i+1}", imgdir,
                                   prefer="pexels" if i % 2 == 0 else "ai"))
        H.append("<div class=card>")
        H.append(f"<h2 style='margin-top:0'>{html.escape(u['headline'])}</h2>")
        H.append(img_tag(rel_url(img, date), u["headline"]))
        H.append(paras(" ".join(u["body"])))
        if u["was"]:
            H.append(f"<div class=was><b>Was das für dich heißt:</b> {html.escape(' '.join(u['was']))}</div>")
        if u["quelle"]:
            q = u["quelle"].strip()
            H.append(f"<p class=src>Quelle: <a href='{html.escape(q)}'>{html.escape(q)}</a></p>")
        H.append("</div>")
    chart, csrc = build_chart(date, imgdir)
    if chart:
        H.append("<h2>📊 In Zahlen</h2>")
        H.append(img_tag(rel_url(chart, date), "Diagramm", 520))
        if csrc:
            H.append(f"<p class=cap>{html.escape(csrc)}</p>")
    if s["tiefer"]:
        H.append("<h2>🔍 Tiefer geschaut</h2>" + paras(s["tiefer"]))
    if s["tool"]:
        H.append("<div class=card><h2 style='margin-top:0'>🛠 Tool</h2>" + paras(s["tool"]) + "</div>")
    if s["prompt"]:
        H.append("<h2>💡 Prompt zum Kopieren</h2><div class=prompt><pre>"
                 + html.escape(s["prompt"]) + "</pre></div>")
    if s["outro"]:
        H.append(paras(s["outro"]) + "<p>— Aban</p>")
    H.append('<div class=cta><a href="https://abannews.beehiiv.com/subscribe">Gratis abonnieren →</a></div>')
    H.append("</body></html>")
    return "\n".join(H)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--entwurf", help="Pfad zum Entwurf (sonst neuester)")
    args = ap.parse_args()

    ent = Path(args.entwurf) if args.entwurf else latest_entwurf()
    if not ent or not ent.exists():
        print("Kein Entwurf gefunden (automation/entwurf-gemini-*.md) — erst draft_with_gemini.py laufen lassen.")
        return 0
    date = issue_date(ent)
    imgdir = REPO / "img" / "issues" / date
    imgdir.mkdir(parents=True, exist_ok=True)

    s = parse(ent.read_text(encoding="utf-8"))
    if not s["updates"] and not s["intro"]:
        print("::warning::Entwurf nicht im strukturierten Format — nichts gebaut.")
        return 0
    print(f"Ausgabe {date}: {len(s['updates'])} Updates, Bilder → img/issues/{date}/")

    out = REPO / "data" / f"issue-{date}-draft.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(s, date, imgdir), encoding="utf-8")
    voice_gate(plaintext(s))
    words = len(plaintext(s).split())
    print(f"✓ Ausgabe gebaut: {out.relative_to(REPO)} (~{words} Wörter)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
