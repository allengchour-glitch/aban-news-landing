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

import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def send_telegram(text: str) -> None:
    """Schickt eine Telegram-Nachricht — no-op-sicher (ohne Secrets oder bei Fehler).
    Gleiche Secret-Namen wie die übrigen Telegram-Tools (TELEGRAM_BOT_TOKEN + Chat)."""
    token = (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()
    chat = (os.environ.get("TELEGRAM_CHAT_ID") or os.environ.get("TELEGRAM_CHANNEL") or "").strip()
    if not token or not chat:
        print("  (Telegram: keine Secrets → no-op)")
        return
    try:
        data = urllib.parse.urlencode({
            "chat_id": chat, "text": text, "disable_web_page_preview": "true",
        }).encode()
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=30) as r:
            r.read()
        print("  → Telegram-Alarm gesendet.")
    except Exception as e:  # noqa: BLE001 — Benachrichtigung darf den Guard nie brechen
        print(f"  (Telegram fehlgeschlagen, ignoriert: {e})")

# (Label, Kommando, ist_reiner_Report)
STEPS = [
    ("eBay customid (Attribution)", ["python3", "tools/add_ebay_customid.py"], False),
    ("eBay-Direktlinks → /go/ebay", ["python3", "tools/route_ebay_direct_links.py"], False),
    ("Vergleichs-Querverweise", ["python3", "tools/add_compare_crosslinks.py"], False),
    ("Founding-Nudge (Tool-Seiten)", ["python3", "tools/add_tool_premium_nudge.py"], False),
    ("Money-Gaps dynamisch schliessen", ["python3", "tools/autofix_money_gap.py"], False),
    ("Cross-Session-Status auffrischen", ["python3", "automation/cross_session_sync.py"], False),
    ("Affiliate-Anmelde-Sheet auffrischen", ["python3", "tools/affiliate_signup_sheet.py"], False),
    ("money_gap_audit (Report)", ["python3", "tools/money_gap_audit.py"], True),
    ("growth_audit (Report)", ["python3", "tools/growth_audit.py"], True),
    ("interne Links prüfen", ["python3", "tools/check_internal_links.py"], True),
]


def main() -> int:
    print("🛡️  aban Money/SEO-Guard — autonomer Wartungslauf\n")
    fails = []
    out = {}  # Label -> stdout (für die Befund-Auswertung)
    for label, cmd, is_report in STEPS:
        print(f"=== {label} ===", flush=True)
        try:
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        except FileNotFoundError as e:  # Tool fehlt (z. B. Pillow) → nicht abbrechen
            print(f"  übersprungen: {e}")
            continue
        out[label] = (r.stdout or "") + (r.stderr or "")
        print(out[label].rstrip())
        # Audits/Link-Check dürfen mit !=0 enden (Befunde) → kein Abbruch, nur notieren.
        if r.returncode != 0:
            fails.append((label, r.returncode))
            print(f"  ⚠️ Exit {r.returncode} (bei Reports = Befunde, kein Fehler)")
        print()

    # --- Nur bei echten Handlungs-Befunden einen Telegram-Alarm senden (kein Spam) ---
    alerts = []
    gap_txt = out.get("money_gap_audit (Report)", "")
    m = re.search(r"ohne Geld-Pfad:\s*(\d+)", gap_txt)
    if m and int(m.group(1)) > 0:
        alerts.append(f"💸 {m.group(1)} Kaufabsicht-Seite(n) ohne Geld-Pfad")
    link_txt = out.get("interne Links prüfen", "")
    if link_txt and "Keine defekten" not in link_txt:
        alerts.append("🔗 defekte interne Links gefunden")
    if alerts:
        msg = ("🛡️ aban Money/SEO-Guard\n" + "\n".join("• " + a for a in alerts)
               + "\nDetails: Branch brain/money-seo (PR prüfen).")
        send_telegram(msg)
    else:
        print("Keine Handlungs-Befunde → kein Telegram-Alarm (alles sauber).")

    if fails:
        print("Hinweise/Befunde bei:", ", ".join(f"{l} ({c})" for l, c in fails))
    print("✓ Guard-Lauf fertig. (Auto-Fixes idempotent; Reports geschrieben.)")
    return 0  # Guard selbst schlägt nie fehl — der CI-Job entscheidet anhand des Diffs.


if __name__ == "__main__":
    sys.exit(main())
