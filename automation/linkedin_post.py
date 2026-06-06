#!/usr/bin/env python3
"""aban news — LinkedIn-Autopost (no-op-sicher, reine Standardbibliothek).

Postet den nächsten fälligen Eintrag aus social/linkedin_queue.json auf das
LinkedIn-Profil — ABER nur, wenn die Secrets gesetzt sind. Ohne Token tut das
Skript bewusst nichts (Exit 0), damit der Workflow gefahrlos leerläuft.

⚠️ LinkedIn-Realität: Auto-Posten auf ein PERSÖNLICHES Profil geht nur mit einem
OAuth-Token mit Scope `w_member_social` aus einer eigenen LinkedIn-App
("Share on LinkedIn"-Produkt). Einrichtung: docs/LINKEDIN-AUTOPOST.md.

Secrets / Env:
  LINKEDIN_ACCESS_TOKEN   OAuth-Token (w_member_social)
  LINKEDIN_AUTHOR_URN     z. B. "urn:li:person:xxxxxxxx"

Aufrufe:
  python3 automation/linkedin_post.py --dry-run   # zeigt nur, was gepostet würde
  python3 automation/linkedin_post.py             # postet den nächsten Eintrag
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

QUEUE = Path(__file__).resolve().parent.parent / "social" / "linkedin_queue.json"
API = "https://api.linkedin.com/v2/ugcPosts"


def load_queue():
    if not QUEUE.exists():
        print(f"Keine Queue gefunden: {QUEUE}")
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


def post_to_linkedin(token, author, text):
    body = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.headers.get("x-restli-id", "")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    items = load_queue()
    item = next_due(items)
    if not item:
        print("Nichts Fälliges in der Queue — nichts zu tun.")
        return 0

    preview = item["text"][:80].replace("\n", " ")
    print(f"Nächster Eintrag [{item.get('id','?')}]: {preview}…")

    if args.dry_run:
        print("--dry-run: nicht gepostet.")
        return 0

    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
    author = os.environ.get("LINKEDIN_AUTHOR_URN", "").strip()
    if not token or not author:
        print("LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN nicht gesetzt → no-op (Exit 0).")
        return 0

    try:
        status, post_id = post_to_linkedin(token, author, item["text"])
    except urllib.error.HTTPError as e:
        print(f"::warning::LinkedIn API HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return 0  # nicht den Workflow rot machen
    except Exception as e:  # noqa: BLE001
        print(f"::warning::LinkedIn-Post fehlgeschlagen: {e}")
        return 0

    if status in (200, 201):
        item["status"] = "posted"
        item["posted_at"] = dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"
        item["linkedin_id"] = post_id
        QUEUE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"✓ Gepostet (id={post_id}). Queue aktualisiert.")
    else:
        print(f"::warning::Unerwarteter Status {status} — Queue unverändert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
