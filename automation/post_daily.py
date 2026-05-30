#!/usr/bin/env python3
"""Post one aban news item per day to every platform that is configured AND
where automated posting is legal/ToS-compliant for your OWN channels.

Design principles (deliberate):
- Official APIs only, your own accounts/channels only, ONE post per run.
- A platform is attempted ONLY if its secrets are present in the environment.
- DRY-RUN by default: prints what it would post and changes nothing. Live
  posting needs --post (the GitHub Action passes it, with secrets).
- No tracking, no scraping, no mass actions, no follower-buying.
- Intentionally NOT included: Reddit daily self-promo (breaks most subreddit /
  anti-spam rules), any unofficial/automation-of-personal-account hacks.

Secrets (set as env vars / GitHub Secrets) — each platform optional:
  MASTODON_BASE_URL, MASTODON_TOKEN
  BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  LINKEDIN_TOKEN, LINKEDIN_AUTHOR_URN        (e.g. urn:li:person:xxxx or urn:li:organization:xxxx)
  X_BEARER_TOKEN                              (OAuth2 *user* token with tweet.write; X API is paid)

Usage:
  python3 automation/post_daily.py             # dry-run, shows next item + targets
  python3 automation/post_daily.py --post      # actually post to configured platforms
"""
import os
import re
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUEUE = ROOT / "automation" / "social_queue.json"
STATE = ROOT / "automation" / ".social_posted.json"

LIMITS = {"mastodon": 500, "bluesky": 300, "x": 280, "linkedin": 3000, "telegram": 4000}


def _http(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8", "replace")


def fit(text, limit):
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


# ----------------------- platform posters -----------------------
# Each returns (ok: bool, detail: str). They raise nothing to the caller.

def post_mastodon(item):
    base = os.environ.get("MASTODON_BASE_URL", "").rstrip("/")
    token = os.environ.get("MASTODON_TOKEN", "")
    if not (base and token):
        return None
    body = json.dumps({"status": fit(item["long"], LIMITS["mastodon"]), "visibility": "public"}).encode()
    try:
        st, _ = _http(base + "/api/v1/statuses", body,
                      {"Authorization": "Bearer " + token, "Content-Type": "application/json"}, "POST")
        return (200 <= st < 300, f"HTTP {st}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}")
    except Exception as e:
        return (False, str(e))


def post_telegram(item):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not (token and chat):
        return None
    body = json.dumps({"chat_id": chat, "text": fit(item["long"], LIMITS["telegram"]),
                       "disable_web_page_preview": False}).encode()
    try:
        st, _ = _http(f"https://api.telegram.org/bot{token}/sendMessage", body,
                      {"Content-Type": "application/json"}, "POST")
        return (200 <= st < 300, f"HTTP {st}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}")
    except Exception as e:
        return (False, str(e))


def post_bluesky(item):
    handle = os.environ.get("BLUESKY_HANDLE", "")
    pw = os.environ.get("BLUESKY_APP_PASSWORD", "")
    if not (handle and pw):
        return None
    host = "https://bsky.social"
    try:
        st, body = _http(host + "/xrpc/com.atproto.server.createSession",
                         json.dumps({"identifier": handle, "password": pw}).encode(),
                         {"Content-Type": "application/json"}, "POST")
        sess = json.loads(body)
        jwt, did = sess["accessJwt"], sess["did"]
        text = fit(item["short"], LIMITS["bluesky"])
        # make the URL a clickable facet
        facets = []
        b = text.encode("utf-8")
        m = re.search(rb"https?://\S+", b)
        if m:
            facets = [{"index": {"byteStart": m.start(), "byteEnd": m.end()},
                       "features": [{"$type": "app.bsky.richtext.facet#link",
                                     "uri": m.group(0).decode()}]}]
        record = {"$type": "app.bsky.feed.post", "text": text,
                  "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
        if facets:
            record["facets"] = facets
        st, _ = _http(host + "/xrpc/com.atproto.repo.createRecord",
                      json.dumps({"repo": did, "collection": "app.bsky.feed.post", "record": record}).encode(),
                      {"Authorization": "Bearer " + jwt, "Content-Type": "application/json"}, "POST")
        return (200 <= st < 300, f"HTTP {st}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}")
    except Exception as e:
        return (False, str(e))


def post_linkedin(item):
    token = os.environ.get("LINKEDIN_TOKEN", "")
    author = os.environ.get("LINKEDIN_AUTHOR_URN", "")
    if not (token and author):
        return None
    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": fit(item["long"], LIMITS["linkedin"])},
            "shareMediaCategory": "NONE"}},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    try:
        st, _ = _http("https://api.linkedin.com/v2/ugcPosts", json.dumps(payload).encode(),
                      {"Authorization": "Bearer " + token, "Content-Type": "application/json",
                       "X-Restli-Protocol-Version": "2.0.0"}, "POST")
        return (200 <= st < 300, f"HTTP {st}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}")
    except Exception as e:
        return (False, str(e))


def post_x(item):
    token = os.environ.get("X_BEARER_TOKEN", "")
    if not token:
        return None
    body = json.dumps({"text": fit(item["short"], LIMITS["x"])}).encode()
    try:
        st, _ = _http("https://api.twitter.com/2/tweets", body,
                      {"Authorization": "Bearer " + token, "Content-Type": "application/json"}, "POST")
        return (200 <= st < 300, f"HTTP {st}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}")
    except Exception as e:
        return (False, str(e))


PLATFORMS = {
    "mastodon": post_mastodon,
    "bluesky": post_bluesky,
    "telegram": post_telegram,
    "linkedin": post_linkedin,
    "x": post_x,
}


# ----------------------- selection / state -----------------------

def load_json(p, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default


def pick_item(queue, posted):
    """Newest never-posted item; if all posted, recycle the least-recently-posted."""
    never = [i for i in queue if i["id"] not in posted]
    if never:
        return never[0]  # queue is newest-first
    if not queue:
        return None
    return min(queue, key=lambda i: posted.get(i["id"], ""))


def main():
    live = "--post" in sys.argv
    queue = load_json(QUEUE, [])
    if not queue:
        print("Queue leer — erst 'python3 automation/build_social_queue.py' laufen lassen.")
        return 0
    posted = load_json(STATE, {})
    item = pick_item(queue, posted)
    if not item:
        print("Nichts zu posten.")
        return 0

    # Determine configured platforms by env presence (no network in dry-run).
    env_present = {
        "mastodon": bool(os.environ.get("MASTODON_TOKEN") and os.environ.get("MASTODON_BASE_URL")),
        "bluesky": bool(os.environ.get("BLUESKY_HANDLE") and os.environ.get("BLUESKY_APP_PASSWORD")),
        "telegram": bool(os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CHAT_ID")),
        "linkedin": bool(os.environ.get("LINKEDIN_TOKEN") and os.environ.get("LINKEDIN_AUTHOR_URN")),
        "x": bool(os.environ.get("X_BEARER_TOKEN")),
    }
    targets = [n for n, on in env_present.items() if on]

    print(f"Ausgewählt: {item['id']} — {item['title']}")
    print(f"Konfigurierte Plattformen: {', '.join(targets) if targets else '— keine (Secrets fehlen)'}")
    print("--- short ---\n" + item["short"] + "\n--- long ---\n" + item["long"])

    if not live:
        print("\n[DRY-RUN] Es wurde nichts gepostet. Mit --post live posten (Secrets nötig).")
        return 0
    if not targets:
        print("\nKeine Plattform konfiguriert — nichts gepostet (Exit 0).")
        return 0

    any_ok = False
    for name in targets:
        res = PLATFORMS[name](item)
        if res is None:
            continue
        ok, detail = res
        any_ok = any_ok or ok
        print(f"[{name}] {'OK' if ok else 'FEHLER'} — {detail}")
        time.sleep(1)

    if any_ok:
        posted[item["id"]] = datetime.now(timezone.utc).isoformat()
        STATE.write_text(json.dumps(posted, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"State aktualisiert: {item['id']} als gepostet markiert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
