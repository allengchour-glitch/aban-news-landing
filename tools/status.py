#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Ein-Blick-Statusbericht (stdlib, kein Netz, keine Keys nötig).

Zeigt den ganzen Stand auf einmal: Post-Queues, Bild-/CTA-/Funnel-Abdeckung,
letzte Audit-/Konsistenz-Befunde, Lead-Magnete. Macht „wo stehen wir?" zu einem Befehl.

    python3 tools/status.py
"""
from __future__ import annotations

import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def q(name):
    p = ROOT / "social" / f"{name}_queue.json"
    try:
        items = json.loads(p.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return (0, 0)
    ready = sum(1 for i in items if i.get("status") not in ("posted", "skipped"))
    posted = sum(1 for i in items if i.get("status") == "posted")
    return (ready, posted)


def count(pattern, needle):
    n = hit = 0
    for f in glob.glob(str(ROOT / pattern)):
        n += 1
        if needle in Path(f).read_text(encoding="utf-8", errors="ignore"):
            hit += 1
    return hit, n


def report_line(fname, label):
    p = ROOT / "reports" / fname
    if not p.exists():
        return f"{label}: (kein Report)"
    m = re.search(r"\*\*Befunde:\*\*\s*(.+)", p.read_text(encoding="utf-8"))
    if m:
        return f"{label}: {m.group(1).strip()}"
    txt = p.read_text(encoding="utf-8")
    return f"{label}: " + ("✅ ok" if "keine Abweichung" in txt.lower() else "siehe Report")


def main() -> int:
    tg_r, tg_p = q("telegram")
    li_r, li_p = q("linkedin")
    hub_hero, hubs = count("ki-fuer-*.html", "data-aban-hero")
    hub_cta, _ = count("ki-fuer-*.html", "data-aban-tools-cta")
    hub_lm, _ = count("ki-fuer-*.html", "data-aban-leadmagnet")
    th_hero, themen = count("themen/*.html", "data-aban-hero")
    th_cta, _ = count("themen/*.html", "data-aban-newsletter-cta")
    th_rel, _ = count("themen/*.html", "data-aban-related-themen")
    site_imgs = len(glob.glob(str(ROOT / "img" / "site" / "*")))
    pdfs = len(glob.glob(str(ROOT / "downloads" / "branchen" / "*.pdf")))

    L = []
    L.append("📊 aban news — Status")
    L.append("─" * 40)
    L.append(f"📮 Telegram-Queue : {tg_r} ready · {tg_p} gepostet")
    L.append(f"📮 LinkedIn-Queue : {li_r} ready · {li_p} gepostet")
    L.append("")
    L.append(f"🏭 Branchen-Hubs  : {hubs}")
    L.append(f"   ├ Funnel-Block : {hub_cta}/{hubs}")
    L.append(f"   ├ Lead-Magnet  : {hub_lm}/{hubs}")
    L.append(f"   └ Header-Bild  : {hub_hero}/{hubs}")
    L.append(f"📚 themen-Artikel : {themen}")
    L.append(f"   ├ Newsletter-CTA: {th_cta}/{themen}")
    L.append(f"   ├ Verwandte    : {th_rel}/{themen}")
    L.append(f"   └ Header-Bild  : {th_hero}/{themen}")
    L.append(f"🖼️  Bilder gehostet: {site_imgs}   📄 Lead-PDFs: {pdfs}")
    L.append("")
    L.append(report_line("GROWTH-AUDIT.md", "📈 Wachstum"))
    L.append(report_line("CONSISTENCY.md", "💶 Konsistenz"))
    print("\n".join(L))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
