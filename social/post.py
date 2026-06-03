#!/usr/bin/env python3
"""Mehrkanal-Publisher — sendet vorgeschriebene Posts aus posts.json automatisch.

Kanäle (alle optional, jeder per Secret aktiviert; nicht gesetzt = übersprungen):
    DISCORD_WEBHOOK_URL   = https://discord.com/api/webhooks/....
    TELEGRAM_BOT_TOKEN    = 123456:ABC...
    TELEGRAM_CHAT_ID      = @deinkanal   (oder numerische Chat-ID)
    MASTODON_INSTANCE     = https://mastodon.social   (deine Instanz)
    MASTODON_TOKEN        = Access-Token (Einstellungen → Entwicklung → Anwendung)
    PUBLISH_WEBHOOK_URL   = generischer Webhook (POST JSON) — DER "überall"-Hebel:
                            häng ihn an Make / n8n / Zapier und fächere von dort an
                            LinkedIn, X, Instagram & Co. (deren APIs lassen sich nicht
                            sauber direkt aus einem Skript bedienen).

SICHERHEIT: Tokens/URLs stehen NIE im Code — nur aus Umgebungsvariablen bzw.
GitHub-Actions-Secrets. So gelangt nichts versehentlich ins Git.

Nutzung:
    python social/post.py                  # nächsten ungesendeten Post senden
    python social/post.py --id p2-top5     # bestimmten Post senden
    python social/post.py --all            # alle ungesendeten senden (Vorsicht)
    python social/post.py --dry-run        # nur anzeigen, was gesendet würde
    python social/post.py --add "Text" --link https://abannews.com/...  # Post anhängen

Pro Post wird gemerkt, an welche Kanäle er schon ging (sent_channels), damit ein
erneuter Lauf nicht doppelt postet. "sent": true sobald mindestens ein Kanal klappte.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
POSTS = HERE / "posts.json"


# --- Kanäle (geben True/False zurück; False = nicht konfiguriert oder Fehler) -----

def _post_json(url, payload, headers=None, ok=(200, 201, 204)):
    data = json.dumps(payload).encode("utf-8")
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h),
                                timeout=20) as r:
        return r.status in ok


def send_discord(text, link=None):
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        return None
    body = text + (f"\n{link}" if link else "")
    return _post_json(url, {"content": body})


def send_telegram(text, link=None):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return None
    body = text + (f"\n{link}" if link else "")
    api = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat, "text": body, "disable_web_page_preview": "false",
    }).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(api, data=data), timeout=20) as r:
        return r.status == 200


def send_mastodon(text, link=None):
    inst = (os.environ.get("MASTODON_INSTANCE") or "").rstrip("/")
    token = os.environ.get("MASTODON_TOKEN")
    if not (inst and token):
        return None
    body = text + (f"\n{link}" if link else "")
    api = f"{inst}/api/v1/statuses"
    data = urllib.parse.urlencode({"status": body, "visibility": "public"}).encode("utf-8")
    req = urllib.request.Request(api, data=data,
                                 headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status == 200


def send_webhook(text, link=None, post=None):
    """Generischer Fan-out: schickt das Post-JSON an einen Webhook (Make/n8n/Zapier)."""
    url = os.environ.get("PUBLISH_WEBHOOK_URL")
    if not url:
        return None
    payload = {"id": (post or {}).get("id"), "text": text, "url": link,
               "tags": (post or {}).get("tags", [])}
    return _post_json(url, payload)


CHANNELS = {
    "discord": send_discord,
    "telegram": send_telegram,
    "mastodon": send_mastodon,
    "webhook": send_webhook,
}


def _is_set(name):
    return {
        "discord": bool(os.environ.get("DISCORD_WEBHOOK_URL")),
        "telegram": bool(os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID")),
        "mastodon": bool(os.environ.get("MASTODON_INSTANCE") and os.environ.get("MASTODON_TOKEN")),
        "webhook": bool(os.environ.get("PUBLISH_WEBHOOK_URL")),
    }[name]


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (s[:24] or "post")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="bestimmten Post senden")
    ap.add_argument("--all", action="store_true", help="alle ungesendeten senden")
    ap.add_argument("--dry-run", action="store_true", help="nur anzeigen")
    ap.add_argument("--add", metavar="TEXT", help="neuen Post an die Warteschlange anhängen")
    ap.add_argument("--link", help="optionaler Link für --add")
    args = ap.parse_args()

    db = json.loads(POSTS.read_text(encoding="utf-8"))
    posts = db["posts"]

    # Schnelles Einreihen eines neuen Posts (Veröffentlichungs-Gewohnheit).
    if args.add:
        pid = f"{slugify(args.add)}-{int(time.time())}"
        new = {"id": pid, "text": args.add, "sent": False, "sent_channels": []}
        if args.link:
            new["url"] = args.link
        posts.append(new)
        POSTS.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Post {pid} eingereiht.")
        return 0

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

    active = [n for n in CHANNELS if _is_set(n)]
    if not active and not args.dry_run:
        sys.stderr.write(
            "Kein Kanal konfiguriert. Setze mindestens einen: DISCORD_WEBHOOK_URL, "
            "TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID, MASTODON_INSTANCE+MASTODON_TOKEN "
            "oder PUBLISH_WEBHOOK_URL.\n")
        return 2
    if not args.dry_run:
        print(f"Aktive Kanäle: {', '.join(active)}")

    changed = False
    for p in todo:
        link = p.get("url")
        print(f"\n— Post {p['id']} —\n{p['text']}" + (f"\n{link}" if link else "") + "\n")
        if args.dry_run:
            continue
        already = set(p.get("sent_channels", []))
        results = []
        for name in active:
            if name in already:
                results.append(f"{name}: schon gesendet")
                continue
            try:
                ok = CHANNELS[name](p["text"], link, post=p) if name == "webhook" \
                    else CHANNELS[name](p["text"], link)
                if ok:
                    already.add(name)
                results.append(f"{name}: {'gesendet' if ok else 'fehlgeschlagen'}")
            except Exception as ex:
                results.append(f"{name}: Fehler ({ex})")
        print("  " + " · ".join(results))
        p["sent_channels"] = sorted(already)
        if already:
            p["sent"] = True
            changed = True

    if changed:
        POSTS.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        print("\nposts.json aktualisiert (sent + sent_channels).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
