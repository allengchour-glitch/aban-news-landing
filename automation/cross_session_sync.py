#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Cross-Session-Sync (automatisch, deterministisch).

Sammelt den aktuellen Stand ALLER parallel arbeitenden Sessions an einer Stelle und
schreibt ihn nach `automation/CROSS-SESSION-STATUS.md`. Gedacht für den Money/SEO-
Guard-Bot (läuft bei jedem Lauf) → so ist der Stand „immer gespeichert" (User-Auftrag),
ohne dass jemand manuell zusammenträgt.

Quellen (alle best-effort, brechen nie ab):
- `git log` auf main → was zuletzt gemerged wurde (welche Session was lieferte).
- Branch-Alter der Bot-Branches (brain/auto, brain/intel, brain/youtube, brain/money-seo).
- Top-Hooks/Hashtags aus `automation/SECOND-BRAIN.md` (Branch brain/youtube), falls erreichbar.

Reine Stdlib. Ändert nur die Status-Datei.

    python3 automation/cross_session_sync.py
"""
from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "automation" / "CROSS-SESSION-STATUS.md"
BRAIN_BRANCHES = ["brain/auto", "brain/intel", "brain/youtube", "brain/money-seo"]


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True,
                              text=True, timeout=30).stdout.strip()
    except Exception:  # noqa: BLE001
        return ""


def recent_commits(n: int = 25) -> list[str]:
    out = git("log", f"-{n}", "--pretty=%s")
    return [l for l in out.splitlines() if l.strip()]


def branch_age(ref: str) -> str:
    # erst lokal, dann origin/<ref> versuchen
    for r in (ref, f"origin/{ref}"):
        d = git("log", "-1", "--format=%cr", r)
        if d:
            return d
    return "—"


def second_brain_excerpt() -> list[str]:
    """Top-Hooks/Hashtags aus SECOND-BRAIN.md (lokal oder origin/brain/youtube)."""
    text = ""
    p = ROOT / "automation" / "SECOND-BRAIN.md"
    if p.is_file():
        text = p.read_text(encoding="utf-8", errors="ignore")
    else:
        text = git("show", "origin/brain/youtube:automation/SECOND-BRAIN.md")
    if not text:
        return []
    lines, keep = [], False
    for ln in text.splitlines():
        if ln.startswith("## "):
            keep = any(k in ln.lower() for k in ("hashtag", "hook"))
        if keep and ln.strip():
            lines.append(ln)
        if len(lines) >= 24:
            break
    return lines


def main() -> int:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out = [
        "# 🔄 Cross-Session-Status (auto-generiert)",
        "",
        f"> Automatisch vom Money/SEO-Guard erzeugt · Stand: {stamp}.",
        "> Quelle der Wahrheit für destilliertes Bot-Wissen: `automation/SECOND-BRAIN.md` (Branch `brain/youtube`).",
        "",
        "## 🧠 Bot-Branches (Alter des letzten Laufs)",
    ]
    for b in BRAIN_BRANCHES:
        out.append(f"- `{b}` — {branch_age(b)}")

    out += ["", "## 🚢 Zuletzt gemerged (alle Sessions)"]
    for s in recent_commits(25):
        out.append(f"- {s}")

    sb = second_brain_excerpt()
    if sb:
        out += ["", "## 📈 SECOND-BRAIN — Top-Hooks & Hashtags (destilliert)"]
        out += sb

    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"✓ Cross-Session-Status geschrieben → automation/CROSS-SESSION-STATUS.md "
          f"({len(recent_commits(25))} Commits, {len(sb)} SECOND-BRAIN-Zeilen)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
