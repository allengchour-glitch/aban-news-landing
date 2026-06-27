#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban Money/SEO-Guard — autonomer Wartungs-Bot (läuft via GitLab-CI, umgeht die
GitHub-Actions-Sperre).

Hält die Geld- und SEO-Hebel der Website automatisch in Schuss — ohne dass ein
Mensch/Claude pro Mal eingreifen muss. Führt nur die bereits erprobten, sicheren,
IDEMPOTENTEN Tools aus:

  1. add_ebay_customid.py        — neue /go/ebay-Links bekommen customid (EPN-Attribution)
  2. route_ebay_direct_links.py  — neue direkte ebay.*-Links auf den getrackten Redirect
  3. add_compare_crosslinks.py   — Querverweise im Vergleichs-Cluster (SEO/Funnel)
  4. add_tool_premium_nudge.py   — Founding-Geld-Pfad auf den gelisteten Tool-Seiten
  4b. autofix_money_gap.py       — schliesst NEUE Money-Gaps dynamisch (selbstheilend)
  5. money_gap_audit.py          — Report: Kaufabsicht-Seiten ohne Geld-Pfad
  6. growth_audit.py             — Report: OG/Newsletter/Funnel/Orphans
  7. check_internal_links.py     — Verifikation: keine kaputten internen Links

Sicher: ändert NUR, was die idempotenten Tools ohnehin ändern (kein neuer Content,
keine neuen Seiten). Schreibt nichts nach main — der CI-Job pusht die Änderungen auf
einen eigenen Branch (brain/money-seo) zur Prüfung. Reine Stdlib + Pillow (für OG,
falls growth_audit es nutzt — optional).

    python3 automation/money_seo_guard.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (Label, Kommando, ist_reiner_Report)
STEPS = [
    ("eBay customid (Attribution)", ["python3", "tools/add_ebay_customid.py"], False),
    ("eBay-Direktlinks → /go/ebay", ["python3", "tools/route_ebay_direct_links.py"], False),
    ("Vergleichs-Querverweise", ["python3", "tools/add_compare_crosslinks.py"], False),
    ("Founding-Nudge (Tool-Seiten)", ["python3", "tools/add_tool_premium_nudge.py"], False),
    ("Money-Gaps dynamisch schliessen", ["python3", "tools/autofix_money_gap.py"], False),
    ("money_gap_audit (Report)", ["python3", "tools/money_gap_audit.py"], True),
    ("growth_audit (Report)", ["python3", "tools/growth_audit.py"], True),
    ("interne Links prüfen", ["python3", "tools/check_internal_links.py"], True),
]


def main() -> int:
    print("🛡️  aban Money/SEO-Guard — autonomer Wartungslauf\n")
    fails = []
    for label, cmd, is_report in STEPS:
        print(f"=== {label} ===", flush=True)
        try:
            r = subprocess.run(cmd, cwd=ROOT)
        except FileNotFoundError as e:  # Tool fehlt (z. B. Pillow) → nicht abbrechen
            print(f"  übersprungen: {e}")
            continue
        # Audits/Link-Check dürfen mit !=0 enden (Befunde) → kein Abbruch, nur notieren.
        if r.returncode != 0:
            fails.append((label, r.returncode))
            print(f"  ⚠️ Exit {r.returncode} (bei Reports = Befunde, kein Fehler)")
        print()

    if fails:
        print("Hinweise/Befunde bei:", ", ".join(f"{l} ({c})" for l, c in fails))
    print("✓ Guard-Lauf fertig. (Auto-Fixes idempotent; Reports geschrieben.)")
    return 0  # Guard selbst schlägt nie fehl — der CI-Job entscheidet anhand des Diffs.


if __name__ == "__main__":
    sys.exit(main())
