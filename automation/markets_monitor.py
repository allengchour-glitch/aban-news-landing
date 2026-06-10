#!/usr/bin/env python3
"""Aban News — Märkte-Monitoring (Daten-Wächter, no-op-sicher).

Prüft data/markets.json auf Frische & Vollständigkeit und schlägt per Telegram
Alarm, wenn der Daten-Job offenbar hängt:
  • letzter Lauf (fetched_at) älter als MAX_AGE_H Stunden, ODER
  • mehr als die Hälfte der Werte ohne Preis.

Alarm geht bevorzugt privat an TELEGRAM_OWNER_ID (vorhandenes abannews-Secret),
sonst TELEGRAM_ALERT_CHAT, sonst den öffentlichen TELEGRAM_CHANNEL. Ohne Token/Chat:
Exit 0, no-op. Nutzt also dieselben Telegram-Secrets wie der Rest von abannews.

Aufrufe:
  python3 automation/markets_monitor.py --dry-run
  python3 automation/markets_monitor.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "markets.json"
MAX_AGE_H = 30


def problems():
    if not DATA.exists():
        return ["markets.json fehlt komplett."]
    data = json.loads(DATA.read_text(encoding="utf-8"))
    issues = []
    fa = data.get("fetched_at")
    if fa:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(fa)).total_seconds() / 3600
            if age > MAX_AGE_H:
                issues.append(f"Daten sind {age:.0f} h alt (> {MAX_AGE_H} h) — Job hängt?")
        except ValueError:
            issues.append("fetched_at nicht lesbar.")
    else:
        issues.append("fetched_at fehlt.")
    assets = data.get("assets", [])
    missing = [a.get("symbol") for a in assets if a.get("price") in (None, 0)]
    if assets and len(missing) > len(assets) / 2:
        issues.append(f"{len(missing)}/{len(assets)} Werte ohne Preis: {', '.join(filter(None, missing))}")
    return issues


def send(token, chat, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = urllib.parse.urlencode({"chat_id": chat, "text": text}).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(url, data=body), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    issues = problems()
    if not issues:
        print("Märkte-Daten OK (frisch & vollständig).")
        return 0

    msg = "🚨 aban news Märkte-Alarm:\n• " + "\n• ".join(issues)
    if args.dry_run:
        print(msg)
        return 0

    print(msg, file=sys.stderr)
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    # Alarm bevorzugt privat an den Owner (abannews-Secret TELEGRAM_OWNER_ID),
    # sonst Override TELEGRAM_ALERT_CHAT, sonst der öffentliche Kanal.
    chat = (os.environ.get("TELEGRAM_ALERT_CHAT")
            or os.environ.get("TELEGRAM_OWNER_ID")
            or os.environ.get("TELEGRAM_CHANNEL") or "").strip()
    if not token or not chat:
        print("Kein Telegram-Token/Chat → Alarm nur im Log (no-op).")
        return 0
    try:
        send(token, chat, msg)
        print("Alarm per Telegram gesendet.")
    except Exception as ex:
        sys.stderr.write(f"Alarm-Versand fehlgeschlagen ({ex}).\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
