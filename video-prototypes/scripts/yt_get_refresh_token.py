#!/usr/bin/env python3
"""EINMALIG lokal ausführen, um ein langlebiges YouTube-Refresh-Token zu erhalten
(für die GitHub-Action). Voraussetzung: client_secret.json (Desktop-OAuth-Client)
in video-prototypes/ und `pip install google-auth-oauthlib`.

  python3 scripts/yt_get_refresh_token.py

Gibt CLIENT_ID, CLIENT_SECRET und REFRESH_TOKEN aus -> als Repo-Secrets
YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN hinterlegen.
"""
import json, sys, os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CS = "client_secret.json"
if not os.path.exists(CS):
    sys.exit("FEHLT: client_secret.json (siehe YOUTUBE-UPLOAD.md)")

flow = InstalledAppFlow.from_client_secrets_file(CS, SCOPES)
creds = flow.run_local_server(port=0, prompt="consent")   # erzwingt Refresh-Token
conf = json.load(open(CS))
c = conf.get("installed") or conf.get("web")
print("\n==== als GitHub-Repo-Secrets hinterlegen ====")
print("YT_CLIENT_ID     =", c["client_id"])
print("YT_CLIENT_SECRET =", c["client_secret"])
print("YT_REFRESH_TOKEN =", creds.refresh_token)
if not creds.refresh_token:
    print("\n(Kein Refresh-Token erhalten — OAuth-Client-Zugriff unter "
          "myaccount.google.com/permissions entfernen und erneut ausführen.)")
