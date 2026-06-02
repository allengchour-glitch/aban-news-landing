#!/usr/bin/env python3
"""Schickt die Zusammenfassung des täglichen Verbesserungs-Scans per Telegram —
mit Inline-Buttons (überall aufs Handy erreichbar).

Liest reports/IMPROVEMENT-REPORT.md, baut eine kurze Nachricht (Telegram-Limit 4096)
und sendet sie via Bot. Buttons (URL): voller Report auf GitHub + „neu scannen"
(Actions-Seite mit Run-Knopf).

Secrets/Env (ohne diese wird sauber übersprungen, kein Fehler):
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
    GITHUB_REPOSITORY  (von Actions gesetzt, z.B. allengchour-glitch/aban-news-landing)

Nutzung:  python3 tools/telegram_report.py
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "reports" / "IMPROVEMENT-REPORT.md"
REPO = os.environ.get("GITHUB_REPOSITORY", "allengchour-glitch/aban-news-landing")


def build_message() -> str:
    if not REPORT.exists():
        return "🔍 Verbesserungs-Scan: kein Report gefunden."
    text = REPORT.read_text(encoding="utf-8")
    # Zähl-Zeile (🔴 .. 🟡 .. 🟢 ..) und Kategorie-Überschriften (## … — N) ziehen.
    counts = ""
    m = re.search(r"\*\*Befunde:\*\*\s*(.+)", text)
    if m:
        counts = m.group(1).strip()
    cats = re.findall(r"^##\s+(.+?)\s+—\s+(\d+)\s*$", text, re.M)
    cats.sort(key=lambda c: -int(c[1]))
    lines = ["🔍 <b>Täglicher Verbesserungs-Scan</b> — abannews.com", ""]
    if counts:
        lines.append(html.escape(counts))
        lines.append("")
    if cats:
        lines.append("<b>Top-Befunde:</b>")
        for name, n in cats[:8]:
            lines.append(f"• {html.escape(name)} — <b>{n}</b>")
    else:
        lines.append("✅ Keine Befunde. Sauber.")
    lines.append("")
    lines.append("Tipp: Befunde sind Heuristik — kurz prüfen, dann fixen.")
    msg = "\n".join(lines)
    return msg[:3900]


def send() -> int:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not (token and chat):
        print("Kein TELEGRAM_BOT_TOKEN/CHAT_ID — Telegram-Report übersprungen.")
        return 0

    report_url = f"https://github.com/{REPO}/blob/main/reports/IMPROVEMENT-REPORT.md"
    actions_url = f"https://github.com/{REPO}/actions/workflows/daily-improvement.yml"
    keyboard = {"inline_keyboard": [[
        {"text": "📋 Voller Report", "url": report_url},
        {"text": "🔄 Neu scannen", "url": actions_url},
    ]]}

    data = urllib.parse.urlencode({
        "chat_id": chat,
        "text": build_message(),
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
        "reply_markup": json.dumps(keyboard),
    }).encode("utf-8")
    api = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        with urllib.request.urlopen(urllib.request.Request(api, data=data), timeout=20) as r:
            ok = r.status == 200
        print("Telegram-Report gesendet." if ok else "Telegram-Antwort nicht OK.")
        return 0 if ok else 1
    except Exception as ex:
        sys.stderr.write(f"Telegram-Fehler: {ex}\n")
        return 1


if __name__ == "__main__":
    sys.exit(send())
