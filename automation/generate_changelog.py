#!/usr/bin/env python3
"""Erzeugt CHANGELOG.md aus der Git-History (Conventional-Commit-Stil).

Gruppiert Commits nach Typ-Präfix (feat/fix/content/...) und schreibt eine
les­bare CHANGELOG.md, neueste zuerst. Rein lesend auf Git, schreibt nur die
eine Datei.

    python3 automation/generate_changelog.py
"""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "CHANGELOG.md"

SECTIONS = [
    ("feat", "🚀 Features"),
    ("content", "📝 Inhalte"),
    ("fix", "🐛 Fixes"),
    ("improve", "✨ Verbesserungen"),
    ("polish", "✨ Verbesserungen"),
    ("perf", "⚡ Performance"),
    ("design", "🎨 Design"),
    ("ci", "⚙️ CI / Build"),
    ("docs", "📚 Doku"),
    ("chore", "🧹 Sonstiges"),
]
LABELS = {}
for key, lbl in SECTIONS:
    LABELS[key] = lbl
ORDER = []
for _, lbl in SECTIONS:
    if lbl not in ORDER:
        ORDER.append(lbl)
ORDER.append("Weiteres")

PREFIX = re.compile(r'^(\w+)(?:\([^)]*\))?\+?(?:\([^)]*\))?:\s*(.+)$')


def git_log():
    out = subprocess.run(
        ["git", "log", "--no-merges", "--pretty=format:%h\x1f%ad\x1f%s", "--date=short"],
        capture_output=True, text=True, cwd=ROOT).stdout
    rows = []
    for line in out.splitlines():
        parts = line.split("\x1f")
        if len(parts) == 3:
            rows.append(tuple(parts))
    return rows


def main():
    rows = git_log()
    buckets = {lbl: [] for lbl in ORDER}
    for sha, date, subj in rows:
        m = PREFIX.match(subj)
        if m:
            typ = m.group(1).lower()
            label = LABELS.get(typ, "Weiteres")
            text = m.group(2)
        else:
            label, text = "Weiteres", subj
        # einzeilige Kurzfassung (erste Zeile reicht; Body ignoriert)
        buckets[label].append(f"- {text} (`{sha}`, {date})")

    lines = ["# Changelog", "",
             "_Automatisch erzeugt aus der Git-History "
             "(`python3 automation/generate_changelog.py`)._", ""]
    total = 0
    for label in ORDER:
        items = buckets[label]
        if not items:
            continue
        total += len(items)
        lines.append(f"## {label}")
        lines.append("")
        lines.extend(items)
        lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"CHANGELOG.md: {total} Commits in {sum(1 for l in ORDER if buckets[l])} Kategorien")


if __name__ == "__main__":
    main()
