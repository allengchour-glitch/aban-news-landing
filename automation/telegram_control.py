#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Telegram-Steuerbot (Polling, no-op-sicher).

Steuere den autonomen Loop vom Handy. Reagiert NUR auf deinen Chat (TELEGRAM_OWNER_ID).
Läuft per GitHub-Action-Cron (alle paar Minuten) — kein Dauer-Server nötig.

Befehle:
  /status   Queues, Keys, wartende Entwürfe
  /next     nächsten geplanten Telegram-Post zeigen
  /skip     nächsten Post überspringen (status=skipped)
  /post     jetzt den nächsten Post veröffentlichen
  /gen      neue Posts erzeugen (Gemini → Linter → Queue)
  /draft    Ausgaben-Entwurf erzeugen (Gemini)
  /help     diese Liste

ENV: TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_ID (deine numerische Chat-ID).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

AUT = Path(__file__).resolve().parent
sys.path.insert(0, str(AUT))
REPO = AUT.parent
STATE = AUT / "tg_state.json"
TG_Q = REPO / "social" / "telegram_queue.json"
LI_Q = REPO / "social" / "linkedin_queue.json"


def api(token, method, **params):
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = urllib.parse.urlencode(params).encode("utf-8")
    with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def reply(token, chat, text):
    try:
        api(token, "sendMessage", chat_id=chat, text=text, disable_web_page_preview="true")
    except Exception as e:  # noqa: BLE001
        print("reply-Fehler:", e)


def ready_line(q):
    if not q.exists():
        return "—"
    items = json.loads(q.read_text(encoding="utf-8"))
    r = sum(1 for e in items if e.get("status") == "ready")
    return f"{r} ready / {len(items)} gesamt"


def status_text():
    drafts = sorted(AUT.glob("entwurf-gemini-*.md"))
    keys = [k for k in ("GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "LINKEDIN_ACCESS_TOKEN") if os.environ.get(k)]
    return ("📊 aban news\n"
            f"Telegram: {ready_line(TG_Q)}\n"
            f"LinkedIn: {ready_line(LI_Q)}\n"
            f"Entwürfe wartend: {len(drafts)}\n"
            f"Keys aktiv: {', '.join(keys) or '—'}")


def next_item(q):
    if not q.exists():
        return None
    for e in json.loads(q.read_text(encoding="utf-8")):
        if e.get("status") == "ready":
            return e
    return None


def skip_next(q):
    items = json.loads(q.read_text(encoding="utf-8")) if q.exists() else []
    for e in items:
        if e.get("status") == "ready":
            e["status"] = "skipped"
            q.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            return e.get("id")
    return None


def handle(cmd, token, chat):
    cmd = cmd.strip().lower().split("@")[0]
    if cmd in ("/start", "/help"):
        reply(token, chat, __doc__.split("Befehle:")[1].split("ENV:")[0].strip())
    elif cmd == "/status":
        reply(token, chat, status_text())
    elif cmd == "/next":
        it = next_item(TG_Q)
        reply(token, chat, ("Nächster Post [%s]:\n\n%s" % (it.get("id"), it["text"][:600])) if it else "Queue leer.")
    elif cmd == "/skip":
        sid = skip_next(TG_Q)
        reply(token, chat, f"Übersprungen: {sid}" if sid else "Nichts zu überspringen.")
    elif cmd == "/post":
        import telegram_post
        telegram_post.main()
        reply(token, chat, "✓ Post-Versuch ausgeführt.\n" + status_text())
    elif cmd == "/gen":
        import gemini_generate_posts
        gemini_generate_posts.main()
        reply(token, chat, "✓ Generierung ausgeführt.\n" + status_text())
    elif cmd == "/draft":
        import draft_with_gemini
        draft_with_gemini.main()
        reply(token, chat, "✓ Entwurfs-Lauf ausgeführt.\n" + status_text())
    else:
        reply(token, chat, "Unbekannt. /help zeigt alle Befehle.")


def main() -> int:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    owner = os.environ.get("TELEGRAM_OWNER_ID", "").strip()
    if not token or not owner:
        print("TELEGRAM_BOT_TOKEN / TELEGRAM_OWNER_ID nicht gesetzt → no-op (Exit 0).")
        return 0

    offset = 0
    if STATE.exists():
        try:
            offset = json.loads(STATE.read_text())["offset"]
        except Exception:  # noqa: BLE001
            offset = 0
    try:
        upd = api(token, "getUpdates", offset=offset, timeout=0, allowed_updates=json.dumps(["message"]))
    except Exception as e:  # noqa: BLE001
        print("getUpdates-Fehler:", e)
        return 0

    results = upd.get("result", [])
    last = offset
    for u in results:
        last = max(last, u["update_id"] + 1)
        msg = u.get("message") or {}
        chat = str((msg.get("chat") or {}).get("id", ""))
        text = (msg.get("text") or "").strip()
        if chat != owner:  # nur der Besitzer darf steuern
            continue
        if text.startswith("/"):
            print(f"Befehl von {chat}: {text}")
            try:
                handle(text, token, chat)
            except Exception as e:  # noqa: BLE001
                reply(token, chat, f"Fehler: {e}")
    STATE.write_text(json.dumps({"offset": last}) + "\n", encoding="utf-8")
    print(f"Verarbeitet: {len(results)} Update(s), Offset {last}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
