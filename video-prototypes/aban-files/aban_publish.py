#!/usr/bin/env python3
"""ABAN Files - Auto-Publisher (CI).

Wählt die nächste noch nicht veröffentlichte Folge aus aban_scripts.json,
rendert sie mit aban_stock.py (Pexels-Footage + ElevenLabs-Stimme + Untertitel)
und lädt sie als YouTube-Short auf den ABAN-Files-Kanal.

Auth: gleicher OAuth-Client wie die Bunny-Pipeline (YT_CLIENT_ID/YT_CLIENT_SECRET),
aber EIGENES Refresh-Token fuer den ABAN-Kanal: ABAN_YT_REFRESH_TOKEN.
Render-Keys: XI (ElevenLabs), PEXELS.

Fortschritt: uploaded.json (Liste schon veroeffentlichter ep-Keys) im selben Ordner.

Aufruf:  python3 aban_publish.py [--count N] [--immediate]
"""
import os, sys, json, subprocess, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "aban_scripts.json")
UPLOADED = os.path.join(HERE, "uploaded.json")
VIDEO_IDS = os.path.join(HERE, "video_ids.json")
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.force-ssl"]  # force-ssl = deutsche CC hochladen


def get_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    cid, csec = os.environ.get("YT_CLIENT_ID"), os.environ.get("YT_CLIENT_SECRET")
    # eigenes ABAN-Token bevorzugen; sonst das vorhandene (Bunny-)Token wiederverwenden,
    # da es zum selben Konto/Kanal gehoert.
    rt = os.environ.get("ABAN_YT_REFRESH_TOKEN") or os.environ.get("YT_REFRESH_TOKEN")
    if not (cid and csec and rt):
        sys.exit("FEHLT: YT_CLIENT_ID / YT_CLIENT_SECRET / (ABAN_YT_REFRESH_TOKEN|YT_REFRESH_TOKEN)")
    creds = Credentials(None, refresh_token=rt, client_id=cid, client_secret=csec,
                        token_uri="https://oauth2.googleapis.com/token", scopes=SCOPES)
    creds.refresh(Request())
    return build("youtube", "v3", credentials=creds)


def load_uploaded():
    if os.path.exists(UPLOADED):
        return json.load(open(UPLOADED))
    return []


def render(ep):
    # 1) fertig vorgerenderten Clip nehmen, falls vorhanden (kein XI/PEXELS noetig)
    pre = os.path.join(HERE, "clips", f"{ep}.mp4")
    if os.path.exists(pre):
        return pre
    # 2) sonst frisch rendern (braucht XI + PEXELS)
    out = f"/tmp/aban_stock_{ep}.mp4"
    subprocess.run([sys.executable, os.path.join(HERE, "aban_stock.py"), ep],
                   check=True, cwd=HERE)
    if not os.path.exists(out):
        raise RuntimeError(f"Render fehlgeschlagen: {out}")
    return out


def upload(svc, ep, sc, path, privacy):
    from googleapiclient.http import MediaFileUpload
    # SEO (Recherche 2026): Haupt-Keyword vorn (nur ~40 Zeichen sichtbar vor Truncation),
    # #Shorts fuer Klassifizierung, 3-5 Hashtags in der Beschreibung (erste 3 = klickbar),
    # 6-8 relevante Tags, Abo-CTA in die BESCHREIBUNG (nicht ins Video -> stoert den Loop nicht).
    topic = sc["title"].title()                       # "PUMA PUNKU" -> "Puma Punku"
    topictag = "".join(c for c in sc["title"].title() if c.isalnum())  # "PumaPunku"
    hook = sc.get("hook", "").rstrip(" .")
    title = f"{topic} — {hook} #Shorts" if hook else f"{topic} #Shorts"
    if len(title) > 100:
        title = f"{topic} #Shorts"
    hashtags = f"#Shorts #ancientaliens #conspiracy #mystery #{topictag}"
    desc = (f"{sc.get('hook','')}\n\n"
            f"{topic}: what they buried, decoded by ABAN. Watch to the very end.\n\n"
            f"▶ Subscribe to the ABAN Files — before they erase the next transmission.\n\n"
            f"{hashtags}")
    tags = ["ABAN Files", "ancient aliens", "conspiracy theory", "unexplained",
            "ancient mysteries", "paranormal", "shorts", topic][:10]
    body = {"snippet": {"title": title[:100], "description": desc[:4900], "tags": tags,
                        "categoryId": "24", "defaultLanguage": "en", "defaultAudioLanguage": "en"},
            "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False}}
    media = MediaFileUpload(path, chunksize=-1, resumable=True, mimetype="video/mp4")
    req = svc.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    vid = resp["id"]
    print(f"[{ep}] hochgeladen -> https://youtube.com/watch?v={vid}", flush=True)
    upload_caption_de(svc, ep, vid)
    return vid


def upload_caption_de(svc, ep, vid):
    """Deutsche CC-Spur hochladen, falls srt/<ep>.de.srt existiert. Best-effort:
    braucht youtube.force-ssl-Scope; bei fehlendem Scope nur Hinweis, kein Abbruch."""
    from googleapiclient.http import MediaFileUpload
    srt = os.path.join(HERE, "srt", f"{ep}.de.srt")
    if not os.path.exists(srt):
        return
    try:
        body = {"snippet": {"videoId": vid, "language": "de", "name": "Deutsch", "isDraft": False}}
        media = MediaFileUpload(srt, mimetype="application/octet-stream", resumable=False)
        svc.captions().insert(part="snippet", body=body, media_body=media).execute()
        print(f"[{ep}] deutsche CC-Spur hochgeladen.", flush=True)
    except Exception as e:
        print(f"[{ep}] CC-Upload uebersprungen ({str(e)[:80]}). "
              f"-> YouTube force-ssl-Scope noetig oder .srt manuell in Studio hochladen.", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--privacy", default="public",
                    choices=["public", "unlisted", "private"])
    args = ap.parse_args()
    scripts = json.load(open(SCRIPTS))
    done = load_uploaded()
    todo = [ep for ep in scripts if ep not in done][:args.count]
    if not todo:
        print("Nichts zu tun — alle Folgen veroeffentlicht.")
        return
    svc = get_service()
    ids = json.load(open(VIDEO_IDS)) if os.path.exists(VIDEO_IDS) else {}
    for ep in todo:
        path = render(ep)
        vid = upload(svc, ep, scripts[ep], path, args.privacy)
        done.append(ep)
        json.dump(done, open(UPLOADED, "w"), indent=2)
        ids[ep] = vid
        json.dump(ids, open(VIDEO_IDS, "w"), indent=2)


if __name__ == "__main__":
    main()
