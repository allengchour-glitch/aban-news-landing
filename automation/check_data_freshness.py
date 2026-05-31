#!/usr/bin/env python3
"""Prüft das 'stand'-Datum kuratierter Datendateien und meldet, was veraltet ist.

Hintergrund: Förder-, Kurs- und ähnliche Daten veralten (Programme laufen aus,
Preise/Fristen ändern sich). Dieser Job läuft planmäßig (GitHub Action) und
erinnert per Issue, wenn eine Datei älter als die Schwelle ist — damit niemand
vergisst, sie zu aktualisieren. Er ändert nichts automatisch (keine Fake-Autonomie).

    python3 automation/check_data_freshness.py            # Report nach stdout + .freshness-report.md
    python3 automation/check_data_freshness.py --months 3 # Schwelle setzen (Default 3)

Exit 0 = alles frisch · Exit 0 + Report = etwas veraltet (Workflow eröffnet Issue).
"""
import argparse
import datetime as dt
import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def parse_stand(s):
    """Akzeptiert 'YYYY-MM' oder 'YYYY-MM-DD'."""
    m = re.match(r"(\d{4})-(\d{2})(?:-(\d{2}))?", str(s))
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3) or 1)
    return dt.date(y, mo, d)


def months_between(a, b):
    return (b.year - a.year) * 12 + (b.month - a.month)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--months", type=int, default=3, help="Schwelle in Monaten (Default 3)")
    args = ap.parse_args()
    today = dt.date.today()

    rows = []
    for fp in sorted(glob.glob(str(DATA / "*.json"))):
        try:
            data = json.loads(Path(fp).read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict) or "stand" not in data:
            continue
        stand = parse_stand(data["stand"])
        if not stand:
            continue
        age = months_between(stand, today)
        rows.append((Path(fp).name, data["stand"], age, age >= args.months))

    stale = [r for r in rows if r[3]]
    lines = ["# Daten-Frische-Report", "", f"Stand der Prüfung: {today.isoformat()} · Schwelle: {args.months} Monate", ""]
    if not rows:
        lines.append("_Keine Datendateien mit 'stand'-Feld gefunden._")
    else:
        lines.append("| Datei | Stand | Alter (Monate) | Status |")
        lines.append("|---|---|---:|---|")
        for name, stand, age, is_stale in rows:
            lines.append(f"| `{name}` | {stand} | {age} | {'⚠️ veraltet' if is_stale else '✅ aktuell'} |")
    if stale:
        lines += ["", "## Bitte aktualisieren", ""]
        for name, stand, age, _ in stale:
            lines.append(f"- **{name}** (Stand {stand}, {age} Monate alt) — Programme/Preise prüfen, `stand` hochsetzen.")

    report = "\n".join(lines) + "\n"
    (ROOT / ".freshness-report.md").write_text(report, encoding="utf-8")
    print(report)
    print(f"::notice::{len(stale)} von {len(rows)} Datendateien veraltet (>= {args.months} Monate).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
