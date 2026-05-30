#!/usr/bin/env python3
"""1-Klick-Poster für Telegram & Discord — sendet vorgeschriebene Posts aus posts.json.

SICHERHEIT: Tokens/Webhook-URLs stehen NIE im Code. Sie kommen aus Umgebungs-
variablen (lokal) bzw. GitHub-Actions-Secrets. So kann nichts versehentlich ins
Git gelangen.

Setze (eine oder beide):
    DISCORD_WEBHOOK_URL   = https://discord.com/api/webhooks/....
    TELEGRAM_BOT_TOKEN    = 123456:ABC...
    TELEGRAM_CHAT_ID      = @deinkanal   (oder numerische Chat-ID)

Nutzung:
    python social/post.py            # sendet den nächsten ungesendeten Post
    python social/post.py --id p2-top5   # sendet einen bestimmten Post
    python social/post.py --all      # sendet ALLE ungesendeten (Vorsicht)
    python social/post.py --dry-run  # zeigt nur, was gesendet würde

Nach erfolgreichem Versand wird "sent": true in posts.json gesetzt.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
POSTS = HERE / "posts.json"


def send_discord(text: str) -> bool:
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        return False
    data = json.dumps({"content": text}).encode("utf-8")
    req = urllib.request.Request(url, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status in (200, 204)


def send_telegram(text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return False
    api = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat, "text": text, "disable_web_page_preview": "false",
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(api, data=data), timeout=20) as r:
        return r.status == 200


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="bestimmten Post senden")
    ap.add_argument("--all", action="store_true", help="alle ungesendeten senden")
    ap.add_argument("--dry-run", action="store_true", help="nur anzeigen")
    args = ap.parse_args()

    db = json.loads(POSTS.read_text(encoding="utf-8"))
    posts = db["posts"]

    if args.id:
        todo = [p for p in posts if p["id"] == args.id]
    elif args.all:
        todo = [p for p in posts if not p.get("sent")]
    else:
        nxt = next((p for p in posts if not p.get("sent")), None)
        todo = [nxt] if nxt else []

    if not todo or todo == [None]:
        print("Nichts zu senden (alle gesendet oder ID nicht gefunden).")
        return 0

    have_channel = bool(os.environ.get("DISCORD_WEBHOOK_URL")
                        or (os.environ.get("TELEGRAM_BOT_TOKEN")
                            and os.environ.get("TELEGRAM_CHAT_ID")))
    if not have_channel and not args.dry_run:
        sys.stderr.write(
            "Kein Kanal konfiguriert. Setze DISCORD_WEBHOOK_URL und/oder "
            "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID als Umgebungsvariablen.\n")
        return 2

    changed = False
    for p in todo:
        print(f"\n— Post {p['id']} —\n{p['text']}\n")
        if args.dry_run:
            continue
        ok = False
        try:
            d = send_discord(p["text"])
            t = send_telegram(p["text"])
            ok = d or t
            print(f"  Discord: {'gesendet' if d else 'übersprungen'} · "
                  f"Telegram: {'gesendet' if t else 'übersprungen'}")
        except Exception as ex:
            sys.stderr.write(f"  Fehler: {ex}\n")
        if ok:
            p["sent"] = True
            changed = True

    if changed:
        POSTS.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        print("\nposts.json aktualisiert (sent=true).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
