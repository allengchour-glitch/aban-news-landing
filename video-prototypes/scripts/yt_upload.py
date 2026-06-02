#!/usr/bin/env python3
"""YouTube-Uploader für die GEHIRN-HACKS-Clips.

Lädt alle in schedule.csv gelisteten Clips als **Shorts** hoch und lässt YouTube
sie terminiert veröffentlichen (privacyStatus=private + publishAt => YouTube
schaltet jeden Clip automatisch zum geplanten Termin öffentlich -> 1 Video / 2 Tage).

Voraussetzung (siehe YOUTUBE-UPLOAD.md):
  pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
  client_secret.json (OAuth-Desktop-Client, YouTube Data API v3 aktiviert) in diesem Ordner.

Aufruf (aus video-prototypes/):
  python3 scripts/yt_upload.py                 # terminiert laut schedule.csv (18:00 Europe/Berlin)
  python3 scripts/yt_upload.py --immediate     # sofort öffentlich statt terminiert
  python3 scripts/yt_upload.py --scenes s1 s2  # nur bestimmte Szenen

Bereits hochgeladene Szenen werden in uploaded.json gemerkt und übersprungen
(idempotent / sicher erneut ausführbar).
"""
import os, sys, csv, json, argparse

CLIENT_SECRET = "client_secret.json"
TOKEN = "token.json"
UPLOADED = "uploaded.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
TZ_OFFSET = "+02:00"   # Europe/Berlin Sommerzeit (CEST); im Winter +01:00
CATEGORY_ID = "27"      # Education


def get_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    creds = None
    if os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRET):
                sys.exit("FEHLT: %s — siehe YOUTUBE-UPLOAD.md" % CLIENT_SECRET)
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
            creds = flow.run_local_server(port=0)   # öffnet einmalig den Browser
        open(TOKEN, "w").write(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--immediate", action="store_true", help="sofort öffentlich statt terminiert")
    ap.add_argument("--scenes", nargs="*", help="nur diese Szenen (z.B. s1 s2)")
    ap.add_argument("--csv", default="schedule.csv")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.csv)))
    if args.scenes:
        rows = [r for r in rows if r["scene"] in args.scenes]
    done = json.load(open(UPLOADED)) if os.path.exists(UPLOADED) else {}

    from googleapiclient.http import MediaFileUpload
    yt = get_service()

    for r in rows:
        sc = r["scene"]
        if sc in done:
            print("[skip] %s bereits hochgeladen -> %s" % (sc, done[sc])); continue
        path = r["file"]
        if not os.path.exists(path):
            print("[warn] %s fehlt, übersprungen" % path); continue
        tags = [t.lstrip("#") for t in r["hashtags"].split()]
        title = (r["title"] + " #Shorts")[:100]
        desc = "%s\n\n%s\n#Shorts" % (r["caption"], r["hashtags"])
        status = {"selfDeclaredMadeForKids": False,
                  "privacyStatus": "public" if args.immediate else "private"}
        if not args.immediate:
            status["publishAt"] = "%sT18:00:00%s" % (r["date"], TZ_OFFSET)
        body = {"snippet": {"title": title, "description": desc, "tags": tags,
                            "categoryId": CATEGORY_ID},
                "status": status}
        print("[up] %s '%s' (%s)" % (sc, title, "sofort" if args.immediate else "geplant " + r["date"]))
        req = yt.videos().insert(part="snippet,status", body=body,
                                 media_body=MediaFileUpload(path, chunksize=-1, resumable=True))
        resp = None
        while resp is None:
            _, resp = req.next_chunk()
        vid = resp["id"]
        done[sc] = vid
        json.dump(done, open(UPLOADED, "w"), indent=2)
        print("    -> https://youtu.be/%s" % vid)

    print("fertig. %d/%d hochgeladen." % (len(done), len(rows)))


if __name__ == "__main__":
    main()
