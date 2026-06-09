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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visuals import build_visual  # gemeinsame KI-Bild/Karten-Logik

QUEUE = Path(__file__).resolve().parent.parent / "social" / "linkedin_queue.json"
API = "https://api.linkedin.com/v2/ugcPosts"
REGISTER = "https://api.linkedin.com/v2/assets?action=registerUpload"
USERINFO = "https://api.linkedin.com/v2/userinfo"  # OpenID Connect → sub = Member-ID
ME = "https://api.linkedin.com/v2/me"              # Fallback (r_liteprofile) → id


def resolve_author_urn(token):
    """Holt die KORREKTE Member-URN direkt vom Token (selbstheilend).
    Erst OpenID `/userinfo` (sub), dann Legacy `/me` (id). Gibt z. B.
    'urn:li:person:782bXyz' zurück oder None, wenn beides scheitert.
    So kann eine falsch eingetippte LINKEDIN_AUTHOR_URN nichts mehr kaputt machen."""
    for url, key in ((USERINFO, "sub"), (ME, "id")):
        try:
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {token}",
                "X-Restli-Protocol-Version": "2.0.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.loads(r.read().decode("utf-8"))
            mid = data.get(key)
            if mid:
                return f"urn:li:person:{mid}"
        except Exception as e:  # noqa: BLE001
            print(f"  (Author-Resolve über {url.rsplit('/',1)[-1]} ging nicht: {e})")
    return None


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


def _hdrs(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"}


def register_upload(token, author):
    body = {"registerUploadRequest": {
        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
        "owner": author,
        "serviceRelationships": [{"relationshipType": "OWNER",
                                  "identifier": "urn:li:userGeneratedContent"}]}}
    req = urllib.request.Request(REGISTER, data=json.dumps(body).encode("utf-8"),
                                 method="POST", headers=_hdrs(token))
    with urllib.request.urlopen(req, timeout=30) as r:
        v = json.loads(r.read().decode("utf-8"))["value"]
    asset = v["asset"]
    upload_url = v["uploadMechanism"][
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
    return upload_url, asset


def upload_image(upload_url, token, path):
    data = Path(path).read_bytes()
    req = urllib.request.Request(upload_url, data=data, method="PUT",
                                 headers={"Authorization": f"Bearer {token}",
                                          "Content-Type": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.status


def post_to_linkedin_image(token, author, text, asset):
    body = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {"com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": text},
            "shareMediaCategory": "IMAGE",
            "media": [{"status": "READY", "media": asset,
                       "title": {"text": "aban news"},
                       "description": {"text": "aban news — KI in 5 Minuten"}}]}},
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    req = urllib.request.Request(API, data=json.dumps(body).encode("utf-8"),
                                 method="POST", headers=_hdrs(token))
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.headers.get("x-restli-id", "")


def post_one(token, author, text, img):
    """Postet einen Beitrag für GENAU EIN Ziel (Person ODER Organisation).
    Versucht Bild-Post, fällt auf Text-Post zurück. Gibt (status, post_id) zurück
    oder (None, "") bei Fehler — wirft nicht, damit ein Ziel das andere nicht killt."""
    try:
        if img:
            try:
                upload_url, asset = register_upload(token, author)
                upload_image(upload_url, token, img)
                return post_to_linkedin_image(token, author, text, asset)
            except Exception as ie:  # noqa: BLE001 — Bild-Pfad scheitert → Text-Post
                print(f"::warning::[{author}] Bild-Upload fehlgeschlagen ({ie}); poste als Text.")
                return post_to_linkedin(token, author, text)
        return post_to_linkedin(token, author, text)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        print(f"::warning::[{author}] LinkedIn API HTTP {e.code}: {detail}")
        if e.code == 403 and "organization" in author:
            print("  → Für die Unternehmensseite fehlt vermutlich der Scope "
                  "'w_organization_social' (Community Management API). Siehe docs/LINKEDIN-AUTOPOST.md.")
    except Exception as e:  # noqa: BLE001
        print(f"::warning::[{author}] LinkedIn-Post fehlgeschlagen: {e}")
    return None, ""


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
    if not token:
        print("LINKEDIN_ACCESS_TOKEN nicht gesetzt → no-op (Exit 0).")
        return 0

    # Selbstheilung: die korrekte Member-URN IMMER vom Token holen — das ist die
    # einzige Quelle der Wahrheit. Eine falsch eingetippte LINKEDIN_AUTHOR_URN
    # (z. B. die Zahl aus der Profil-URL statt der API-Member-ID) verursacht sonst
    # genau den 403 "processing fields [/author]". Env-Wert nur als Fallback.
    resolved = resolve_author_urn(token)
    if resolved:
        if author and author != resolved:
            print(f"ℹ️ LINKEDIN_AUTHOR_URN ({author}) weicht von der echten Token-URN ab "
                  f"→ nutze die echte: {resolved}")
        author = resolved
    elif author and not author.startswith("urn:li:person:"):
        # Nur eine ID eingetragen → in volle URN packen
        author = f"urn:li:person:{author}"
    # Ziele zusammenstellen: persönliches Profil (immer, wenn ermittelbar) +
    # optional die Unternehmensseite, wenn LINKEDIN_ORG_URN/LINKEDIN_ORG_ID gesetzt
    # ist UND der Token den Scope w_organization_social hat (Community Management API).
    targets = []  # (label, author_urn)
    if author:
        targets.append(("Profil", author))
    org = os.environ.get("LINKEDIN_ORG_URN", "").strip() or os.environ.get("LINKEDIN_ORG_ID", "").strip()
    if org:
        if not org.startswith("urn:li:organization:"):
            org = f"urn:li:organization:{org}"
        targets.append(("Unternehmensseite", org))
    if not targets:
        print("Kein Post-Ziel ermittelbar (weder Person noch Organisation) → no-op (Exit 0).")
        return 0
    print("Post-Ziele: " + ", ".join(f"{lbl} ({urn})" for lbl, urn in targets))

    text = item["text"]
    img = build_visual(text, aspect="16:9", channel="linkedin")  # KI-Bild → Karte → None

    posted_any = False
    ids = {}
    for label, target in targets:
        status, post_id = post_one(token, target, text, img)
        if status in (200, 201):
            posted_any = True
            ids[label] = post_id
            print(f"✓ {label} gepostet (id={post_id}).")
        else:
            print(f"::warning::{label} nicht gepostet.")

    # Queue nur markieren, wenn MINDESTENS ein Ziel erfolgreich war (so wird ein
    # Eintrag nicht „verbraucht", wenn alles scheitert).
    if posted_any:
        item["status"] = "posted"
        item["posted_at"] = dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"
        item["linkedin_id"] = ids
        QUEUE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"✓ Queue aktualisiert ({len(ids)}/{len(targets)} Ziel(e) live).")
    else:
        print("::warning::Kein Ziel erfolgreich — Queue unverändert (Eintrag bleibt fällig).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
