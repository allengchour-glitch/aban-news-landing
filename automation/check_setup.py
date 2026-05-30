#!/usr/bin/env python3
"""Verifiziert die Social-Tokens, OHNE etwas zu posten.

Pingt pro konfigurierter Plattform einen leichten Auth-Endpoint an und sagt dir
genau, was funktioniert und was fehlt/falsch ist. Nutzt dieselben Secrets wie
der Poster (siehe automation/SOCIAL-SETUP.md).

    python3 automation/check_setup.py
"""
import os
import json
import importlib.util
import urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("post_daily", HERE / "post_daily.py")
pd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pd)


def ok(msg):  return ("ok", msg)
def err(msg): return ("err", msg)
def skip(msg): return ("skip", msg)


def check_mastodon():
    base = os.environ.get("MASTODON_BASE_URL", "").rstrip("/")
    token = os.environ.get("MASTODON_TOKEN", "")
    if not (base and token):
        return skip("Secrets fehlen")
    try:
        st, body = pd._http(base + "/api/v1/accounts/verify_credentials",
                            headers={"Authorization": "Bearer " + token})
        u = json.loads(body)
        return ok(f"angemeldet als @{u.get('username','?')} auf {base}")
    except urllib.error.HTTPError as e:
        return err(f"HTTP {e.code} — Token/Instanz prüfen")
    except Exception as e:
        return err(str(e))


def check_bluesky():
    handle = os.environ.get("BLUESKY_HANDLE", "")
    pw = os.environ.get("BLUESKY_APP_PASSWORD", "")
    if not (handle and pw):
        return skip("Secrets fehlen")
    try:
        st, body = pd._http("https://bsky.social/xrpc/com.atproto.server.createSession",
                            json.dumps({"identifier": handle, "password": pw}).encode(),
                            {"Content-Type": "application/json"}, "POST")
        s = json.loads(body)
        return ok(f"Login OK als {s.get('handle', handle)}")
    except urllib.error.HTTPError as e:
        return err(f"HTTP {e.code} — Handle/App-Passwort prüfen (kein Login-Passwort!)")
    except Exception as e:
        return err(str(e))


def check_telegram():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not (token and chat):
        return skip("Secrets fehlen")
    try:
        st, body = pd._http(f"https://api.telegram.org/bot{token}/getMe")
        me = json.loads(body)["result"]
        st, body = pd._http(f"https://api.telegram.org/bot{token}/getChat?chat_id={chat}")
        ch = json.loads(body).get("result", {})
        return ok(f"Bot @{me.get('username','?')} sieht Kanal „{ch.get('title', chat)}\"")
    except urllib.error.HTTPError as e:
        return err(f"HTTP {e.code} — Token prüfen, und Bot als Admin im Kanal?")
    except Exception as e:
        return err(str(e) + " — ist der Bot Admin im Kanal?")


def check_linkedin():
    token = os.environ.get("LINKEDIN_TOKEN", "")
    author = os.environ.get("LINKEDIN_AUTHOR_URN", "")
    if not (token and author):
        return skip("Secrets fehlen")
    try:
        st, body = pd._http("https://api.linkedin.com/v2/userinfo",
                            headers={"Authorization": "Bearer " + token})
        u = json.loads(body)
        return ok(f"Token gültig (name: {u.get('name','?')}), URN={author}")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return err(f"HTTP {e.code} — Token abgelaufen/falscher Scope (w_member_social)")
        return ok(f"Secrets gesetzt (Profil-Check HTTP {e.code}, beim Posten zählt w_member_social)")
    except Exception as e:
        return err(str(e))


def check_x():
    ck = os.environ.get("X_API_KEY", ""); cs = os.environ.get("X_API_SECRET", "")
    tk = os.environ.get("X_ACCESS_TOKEN", ""); ts = os.environ.get("X_ACCESS_SECRET", "")
    if not (ck and cs and tk and ts):
        return skip("Secrets fehlen")
    url = "https://api.twitter.com/2/users/me"
    try:
        st, body = pd._http(url, headers={"Authorization": pd._oauth1_header("GET", url, ck, cs, tk, ts)})
        u = json.loads(body).get("data", {})
        return ok(f"angemeldet als @{u.get('username','?')}")
    except urllib.error.HTTPError as e:
        return err(f"HTTP {e.code} — Keys prüfen; App-Permission Read-and-write + Access-Token danach neu erzeugt?")
    except Exception as e:
        return err(str(e))


CHECKS = [("Mastodon", check_mastodon), ("Bluesky", check_bluesky),
          ("Telegram", check_telegram), ("LinkedIn", check_linkedin), ("X/Twitter", check_x)]

ICON = {"ok": "✅", "err": "❌", "skip": "—"}


def main():
    print("Social-Setup-Check (es wird NICHTS gepostet)\n")
    any_ok = False
    for name, fn in CHECKS:
        status, msg = fn()
        any_ok = any_ok or status == "ok"
        print(f"{ICON[status]} {name:12} {msg}")
    print()
    if any_ok:
        print("Mindestens ein Kanal ist startklar. Test-Post: Actions → Daily Social Post → dryrun:false")
    else:
        print("Noch kein Kanal konfiguriert. Secrets setzen — siehe automation/SOCIAL-SETUP.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
