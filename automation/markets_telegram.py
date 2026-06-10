#!/usr/bin/env python3
"""Aban News — täglicher Markt-Digest per Telegram (no-op-sicher, reine stdlib).

Liest data/markets.json und postet eine kompakte Markt-Zusammenfassung (Kurse,
24h-Bewegung, KI-Sentiment, 1-2 Schlagzeilen) in den Telegram-Kanal — nur wenn
TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL gesetzt sind. Ohne Secrets: Exit 0, no-op.

Gleiche Secret-Namen wie automation/telegram_post.py (kein neues Setup nötig).

Aufrufe:
  python3 automation/markets_telegram.py --dry-run
  python3 automation/markets_telegram.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "markets.json"

SENT_EMOJI = {"bullish": "🟢", "neutral": "⚪️", "bearish": "🔴"}


def arrow(chg):
    if chg is None:
        return "•"
    return "▲" if chg > 0.04 else ("▼" if chg < -0.04 else "→")


def fmt_price(v, cur):
    if v is None:
        return "n/a"
    c = (cur or "usd").upper()
    if v >= 1000:
        return f"{v:,.0f} {c}".replace(",", "'")
    if v >= 1:
        return f"{v:,.2f} {c}".replace(",", "'")
    return f"{v:.4f} {c}"


def build_text(data: dict) -> str:
    lines = ["📊 *Märkte-Digest* — aban news", ""]
    crypto = [a for a in data.get("assets", []) if a.get("type") == "crypto"]
    stocks = [a for a in data.get("assets", []) if a.get("type") == "stock"]

    def block(title, assets):
        out = [f"*{title}*"]
        for a in assets:
            chg = a.get("change_24h")
            chg_txt = f"{chg:+.2f}%" if chg is not None else "n/a"
            emo = SENT_EMOJI.get(a.get("sentiment", "neutral"), "⚪️")
            out.append(f"{emo} {a.get('symbol')}  {fmt_price(a.get('price'), a.get('currency'))}  "
                       f"{arrow(chg)} {chg_txt}")
        return out

    if crypto:
        lines += block("Krypto", crypto) + [""]
    if stocks:
        lines += block("Aktien", stocks) + [""]

    news = data.get("news", [])[:2]
    if news:
        lines.append("*Schlagzeilen*")
        for n in news:
            lines.append(f"• {n.get('title')}")
        lines.append("")

    lines.append("Keine Anlageberatung. → https://abannews.com/maerkte.html")
    return "\n".join(lines)


def send(token, chat, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": "true",
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not DATA.exists():
        sys.stderr.write(f"Fehlt: {DATA}\n")
        return 0
    data = json.loads(DATA.read_text(encoding="utf-8"))
    text = build_text(data)

    if args.dry_run:
        print(text)
        return 0

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHANNEL", "").strip()
    if not token or not chat:
        print("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL nicht gesetzt → no-op (Exit 0).")
        return 0

    try:
        res = send(token, chat, text)
        print("Telegram-Digest gesendet." if res.get("ok") else f"Telegram-Fehler: {res}")
    except Exception as ex:
        sys.stderr.write(f"Telegram-Versand fehlgeschlagen ({ex}) → ignoriert.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
