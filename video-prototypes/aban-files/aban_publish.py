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
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def get_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    cid, csec = os.environ.get("YT_CLIENT_ID"), os.environ.get("YT_CLIENT_SECRET")
    rt = os.environ.get("ABAN_YT_REFRESH_TOKEN")
    if not (cid and csec and rt):
        sys.exit("FEHLT: YT_CLIENT_ID / YT_CLIENT_SECRET / ABAN_YT_REFRESH_TOKEN")
    creds = Credentials(None, refresh_token=rt, client_id=cid, client_secret=csec,
                        token_uri="https://oauth2.googleapis.com/token", scopes=SCOPES)
    creds.refresh(Request())
    return build("youtube", "v3", credentials=creds)


def load_uploaded():
    if os.path.exists(UPLOADED):
        return json.load(open(UPLOADED))
    return []


def render(ep):
    out = f"/tmp/aban_stock_{ep}.mp4"
    subprocess.run([sys.executable, os.path.join(HERE, "aban_stock.py"), ep],
                   check=True, cwd=HERE)
    if not os.path.exists(out):
        raise RuntimeError(f"Render fehlgeschlagen: {out}")
    return out


def maybe_shrink(path, ep):
    """Clip vor dem Upload klein rendern (kleiner = schneller hochgeladen).
    Steuerbar per Env: ABAN_SHRINK=0 schaltet ab; ABAN_SHRINK_TARGET_MB=N nutzt
    den Zielgrößen-Modus statt CRF. Bei jedem Fehler: Original behalten."""
    if os.environ.get("ABAN_SHRINK", "1") == "0":
        return path
    shrink = os.path.join(HERE, "..", "scripts", "shrink.py")
    if not os.path.exists(shrink):
        return path
    small = f"/tmp/aban_small_{ep}.mp4"
    target = os.environ.get("ABAN_SHRINK_TARGET_MB")
    cmd = [sys.executable, shrink, path, "-o", small]
    cmd += ["--target-mb", target] if target else ["--crf", os.environ.get("ABAN_SHRINK_CRF", "28")]
    try:
        subprocess.run(cmd, check=True)
        if os.path.exists(small) and os.path.getsize(small) > 0:
            return small
    except Exception as exc:
        print(f"[{ep}] shrink übersprungen ({exc}) — nutze Original", flush=True)
    return path


def upload(svc, ep, sc, path, immediate):
    from googleapiclient.http import MediaFileUpload
    title = f"{sc['title']} 🦎 #ABANFiles"
    desc = (f"{sc['hook']}\n\nKING ALLENG spricht. The ABAN Files.\n\n"
            f"#ABANFiles #shorts #scifi #ai #conspiracy #reptilian #kingalleng")
    body = {"snippet": {"title": title[:100], "description": desc,
                        "tags": ["ABAN Files", "KING ALLENG", "sci-fi", "AI", "shorts"],
                        "categoryId": "24"},
            "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False}}
    media = MediaFileUpload(path, chunksize=-1, resumable=True, mimetype="video/mp4")
    req = svc.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    vid = resp["id"]
    print(f"[{ep}] hochgeladen -> https://youtube.com/watch?v={vid}", flush=True)
    return vid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--immediate", action="store_true", default=True)
    args = ap.parse_args()
    scripts = json.load(open(SCRIPTS))
    done = load_uploaded()
    todo = [ep for ep in scripts if ep not in done][:args.count]
    if not todo:
        print("Nichts zu tun — alle Folgen veroeffentlicht.")
        return
    svc = get_service()
    for ep in todo:
        path = maybe_shrink(render(ep), ep)
        upload(svc, ep, scripts[ep], path, args.immediate)
        done.append(ep)
        json.dump(done, open(UPLOADED, "w"), indent=2)


if __name__ == "__main__":
    main()
