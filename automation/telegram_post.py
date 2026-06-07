#!/usr/bin/env python3
"""aban news — Telegram-Autopost (no-op-sicher, reine Standardbibliothek).

Postet den nächsten fälligen Eintrag aus social/telegram_queue.json in einen
Telegram-Kanal — nur wenn die Secrets gesetzt sind. Ohne Token: Exit 0, no-op.

Telegram ist der einfachste autonom+gratis Kanal:
  - Bot in 2 Min via @BotFather → TELEGRAM_BOT_TOKEN
  - Bot als Admin in den Kanal → TELEGRAM_CHANNEL (z. B. "@abannews")
  Kein OAuth, keine Company Page, kein Token-Ablauf. Setup: docs/TELEGRAM-SETUP.md

Aufrufe:
  python3 automation/telegram_post.py --dry-run
  python3 automation/telegram_post.py
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # Geschwister-Module
from visuals import build_visual  # gemeinsame KI-Bild/Karten-Logik

QUEUE = Path(__file__).resolve().parent.parent / "social" / "telegram_queue.json"


def load_queue():
    if not QUEUE.exists():
        print(f"Keine Queue: {QUEUE}")
        return []
    return json.loads(QUEUE.read_text(encoding="utf-8"))


def next_due(items):
    today = dt.date.today().isoformat()
    for it in items:
        if it.get("status") == "posted":
            continue
        if it.get("date") and it["date"] > today:
            continue
        return it
    return None


def send(token, chat, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat,
        "text": text,
        "disable_web_page_preview": "false",
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def send_photo(token, chat, image_path, caption):
    """sendPhoto via multipart/form-data (reine stdlib). Caption max 1024 Zeichen."""
    boundary = "----aban" + uuid.uuid4().hex
    with open(image_path, "rb") as f:
        img = f.read()

    def field(name, val):
        return (f"--{boundary}\r\nContent-Disposition: form-data; "
                f'name="{name}"\r\n\r\n{val}\r\n').encode("utf-8")

    body = field("chat_id", chat) + field("caption", caption[:1024])
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; "
             f"filename=\"card.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").encode("utf-8")
    body += img + b"\r\n" + f"--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendPhoto", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    items = load_queue()
    item = next_due(items)
    if not item:
        print("Nichts Fälliges in der Queue — nichts zu tun.")
        return 0

    print(f"Nächster Eintrag [{item.get('id','?')}]: " + item["text"][:80].replace("\n", " ") + "…")
    if args.dry_run:
        print("--dry-run: nicht gepostet.")
        return 0

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHANNEL", "").strip()
    if not token or not chat:
        print("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL nicht gesetzt → no-op (Exit 0).")
        return 0

    text = item["text"]
    img = build_visual(text, aspect="1:1", channel="telegram")  # KI-Bild → Karte → None
    try:
        if img and len(text) <= 1024:
            res = send_photo(token, chat, img, text)
        elif img:
            # Bild mit kurzer Caption, danach voller Text (Caption-Limit 1024)
            send_photo(token, chat, img, text.splitlines()[0][:1024])
            res = send(token, chat, text)
        else:
            res = send(token, chat, text)
    except urllib.error.HTTPError as e:
        print(f"::warning::Telegram HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Telegram-Post fehlgeschlagen: {e}")
        return 0

    if res.get("ok"):
        item["status"] = "posted"
        item["posted_at"] = dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"
        item["telegram_message_id"] = res.get("result", {}).get("message_id")
        QUEUE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("✓ Gepostet. Queue aktualisiert.")
    else:
        print(f"::warning::Telegram-Antwort nicht ok: {res}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
