#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Autopilot: ein täglicher Lauf, der die Maschine selbst füttert.

Bündelt die vorhandenen Bausteine (erfindet nichts neu) zu EINEM no-op-sicheren Lauf:

  1. KI-News-Roh­material auffrischen           (news_aggregator.py, best effort)
  2. Post-Queues auffüllen, NUR wenn knapp       (gemini_generate_posts.py)
  3. Newsletter-Entwurf schreiben (nur Entwurf)  (draft_with_gemini.py)
  4. Wachstums-Audit schreiben                   (tools/growth_audit.py)
  5. Funnel-Block aktuell halten (idempotent)    (tools/add_branchen_funnel.py)

Der Autopilot POSTET NICHT selbst und VERSENDET KEINEN Newsletter — Posten bleibt bei den
eigenen Cron-Workflows (telegram-autopost / linkedin-autopost), Versand beim Menschen.
Die EINE Tages-Zusammenfassung schickt der Verbesserungs-Scan (daily-improvement.yml,
liest jetzt auch das Wachstums-Audit + Queue-Stände).

Jeder Schritt scheitert leise (kein Abbruch). Exit immer 0 (Report-Tool, kein CI-Gate).

    python3 automation/autopilot.py            # echter Lauf
    python3 automation/autopilot.py --dry-run   # nichts erzeugen, nur zeigen
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent          # automation/
REPO = ROOT.parent
QUEUE_MIN = int(os.environ.get("ABAN_QUEUE_MIN", "5"))
GEN_N = int(os.environ.get("ABAN_GEN_N", "3"))
QUEUES = {"Telegram": REPO / "social" / "telegram_queue.json",
          "LinkedIn": REPO / "social" / "linkedin_queue.json"}


def run(cmd: list[str], label: str) -> None:
    print(f"\n— {label}: {' '.join(cmd)}")
    try:
        r = subprocess.run(cmd, cwd=str(REPO), capture_output=True, text=True, timeout=300)
        out = (r.stdout or "").strip()
        if out:
            print("  " + out.replace("\n", "\n  "))
        if r.returncode != 0 and (r.stderr or "").strip():
            print(f"  ::warning::{label} stderr: {r.stderr.strip()[:300]}")
    except Exception as e:  # noqa: BLE001
        print(f"  ::warning::{label} übersprungen: {e}")


def ready_count(path: Path) -> int:
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return 0
    return sum(1 for it in items if it.get("status") not in ("posted", "skipped"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="nichts erzeugen, nur Stand zeigen")
    ap.add_argument("--skip-gen", action="store_true", help="kein Queue-Auffüllen/Entwurf")
    ap.add_argument("--skip-scan", action="store_true", help="kein Wachstums-Audit/Funnel")
    args = ap.parse_args()

    py = sys.executable
    print("🛫 aban news Autopilot")
    depths = {n: ready_count(p) for n, p in QUEUES.items()}
    print("Queue-Stände (ready): " + " · ".join(f"{n} {c}" for n, c in depths.items()))
    low = min(depths.values()) if depths else 0

    # 1+2+3: Content-Nachschub (kostet Gemini-Calls → nur bei Bedarf, nie im --dry-run)
    if not args.skip_gen and not args.dry_run:
        run([py, "automation/news_aggregator.py", "--max", "6",
             "--out", "automation/news-roh-aktuell.md"], "News-Roh­material")
        if low < QUEUE_MIN:
            print(f"  Queue niedrig ({low} < {QUEUE_MIN}) → fülle auf.")
            run([py, "automation/gemini_generate_posts.py", "--n", str(GEN_N)], "Queue-Top-up")
        else:
            print(f"  Queues ausreichend ({low} ≥ {QUEUE_MIN}) → kein Top-up.")
        run([py, "automation/draft_with_gemini.py"], "Newsletter-Entwurf")
    elif args.dry_run and low < QUEUE_MIN:
        print(f"  [dry-run] würde auffüllen (Queue {low} < {QUEUE_MIN}).")

    # 4+5: Audits/Funnel (gratis, deterministisch)
    if not args.skip_scan:
        run([py, "tools/growth_audit.py"], "Wachstums-Audit")
        funnel = [py, "tools/add_branchen_funnel.py"] + (["--dry"] if args.dry_run else [])
        run(funnel, "Funnel-Block aktualisieren")

    print("\n✅ Autopilot fertig. (Posten erledigen die Autopost-Workflows; "
          "Tages-Digest schickt daily-improvement.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
