#!/usr/bin/env python3
"""get_yt_refresh_token.py — neuen YouTube-OAuth-Refresh-Token erzeugen.

Brauchst du, wenn YT_REFRESH_TOKEN verloren ist (GitHub zeigt gespeicherte Secrets nicht an).
Laeuft LOKAL auf deinem PC (oeffnet den Browser zum Einloggen). Gibt am Ende den Token aus,
den du dann als Secret/Variable (GitHub, GitLab) oder Env auf dem PC hinterlegst.

Voraussetzung:
  pip install google-auth-oauthlib
  Client-ID + Secret deines Google-OAuth-Clients (Typ "Desktop App") als Env:
    export YT_CLIENT_ID=...    export YT_CLIENT_SECRET=...
  (oder eine client_secret.json daneben legen)

Start:  python3 get_yt_refresh_token.py
"""
import os, sys, json

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

def main():
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        sys.exit("Fehlt: pip install google-auth-oauthlib")

    cid = os.environ.get("YT_CLIENT_ID")
    csec = os.environ.get("YT_CLIENT_SECRET")
    here = os.path.dirname(os.path.abspath(__file__))
    secret_file = os.path.join(here, "client_secret.json")

    if cid and csec:
        cfg = {"installed": {
            "client_id": cid, "client_secret": csec,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }}
        flow = InstalledAppFlow.from_client_config(cfg, SCOPES)
    elif os.path.exists(secret_file):
        flow = InstalledAppFlow.from_client_secrets_file(secret_file, SCOPES)
    else:
        sys.exit("Kein YT_CLIENT_ID/SECRET (Env) und keine client_secret.json gefunden.")

    # Oeffnet den Browser; bei Headless-PC: console-Fallback
    try:
        creds = flow.run_local_server(port=0)
    except Exception:
        creds = flow.run_console()

    print("\n================ FERTIG ================")
    print("YT_REFRESH_TOKEN =", creds.refresh_token)
    print("========================================")
    print("Diesen Wert als Secret (GitHub/GitLab) bzw. Env auf dem PC setzen.")

if __name__ == "__main__":
    main()
