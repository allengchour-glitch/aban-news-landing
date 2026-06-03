#!/usr/bin/env python3
"""ABAN Files - Analyst/Grower.

Liest die YouTube-View-Zahlen der hochgeladenen Folgen und sagt, welche
Themen/Formate am besten ziehen -> datengetriebener Wachstums-Loop.

Quelle der Video-IDs:
  1. video_ids.json (ep -> videoId, vom Publisher gepflegt) und/oder
  2. automatische Kanal-Erkennung (channels.list mine -> uploads), falls der
     Token-Scope es erlaubt.

Auth: dieselben Secrets wie der Upload (YT_CLIENT_ID / YT_CLIENT_SECRET /
YT_REFRESH_TOKEN). Reine Lese-Aufrufe.

Aufruf:
  python3 aban_stats.py            # Tabelle in die Konsole
  python3 aban_stats.py --report   # zusaetzlich reports/ABAN-STATS.md schreiben
"""
import os, sys, json, argparse, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
IDS = os.path.join(HERE, "video_ids.json")
SCRIPTS = os.path.join(HERE, "aban_scripts.json")
REPORT = os.path.abspath(os.path.join(HERE, "..", "..", "reports", "ABAN-STATS.md"))


def service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    cid, csec = os.environ.get("YT_CLIENT_ID"), os.environ.get("YT_CLIENT_SECRET")
    rt = os.environ.get("YT_REFRESH_TOKEN") or os.environ.get("ABAN_YT_REFRESH_TOKEN")
    if not (cid and csec and rt):
        sys.exit("FEHLT: YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN")
    # KEINE Scopes erzwingen: das Upload-Token hat nur youtube.upload; ein
    # zusaetzlich verlangter readonly-Scope -> invalid_scope. Public videos.list
    # geht auch mit dem vorhandenen Token.
    creds = Credentials(None, refresh_token=rt, client_id=cid, client_secret=csec,
                        token_uri="https://oauth2.googleapis.com/token")
    creds.refresh(Request())
    return build("youtube", "v3", credentials=creds)


def discover_uploads(svc):
    """Alle Video-IDs des eigenen Kanals (falls Scope es erlaubt)."""
    ids = []
    try:
        ch = svc.channels().list(part="contentDetails", mine=True).execute()
        pl = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        tok = None
        while True:
            r = svc.playlistItems().list(part="contentDetails", playlistId=pl,
                                         maxResults=50, pageToken=tok).execute()
            ids += [i["contentDetails"]["videoId"] for i in r["items"]]
            tok = r.get("nextPageToken")
            if not tok:
                break
    except Exception as e:
        print(f"(Kanal-Auto-Erkennung nicht moeglich: {e}; nutze video_ids.json)")
    return ids


def title_to_ep(title, scripts):
    t = title.upper()
    for ep, sc in scripts.items():
        if sc["title"].upper() in t:
            return ep
    return "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    scripts = json.load(open(SCRIPTS))
    seed = json.load(open(IDS)) if os.path.exists(IDS) else {}
    svc = service()

    ids = list(dict.fromkeys(list(seed.values()) + discover_uploads(svc)))
    if not ids:
        sys.exit("Keine Video-IDs gefunden.")

    rows = []
    for i in range(0, len(ids), 50):
        r = svc.videos().list(part="snippet,statistics", id=",".join(ids[i:i + 50])).execute()
        for it in r["items"]:
            st = it.get("statistics", {})
            rows.append({
                "id": it["id"],
                "title": it["snippet"]["title"],
                "ep": title_to_ep(it["snippet"]["title"], scripts),
                "views": int(st.get("viewCount", 0)),
                "likes": int(st.get("likeCount", 0)),
                "comments": int(st.get("commentCount", 0)),
            })
    rows.sort(key=lambda x: x["views"], reverse=True)

    lines = [f"# ABAN Files — View-Report ({datetime.date.today()})", "",
             f"{len(rows)} Videos. Sortiert nach Views.", "",
             "| # | Ep | Titel | Views | Likes | Kommentare |",
             "|---|----|-------|------:|------:|-----------:|"]
    for n, r in enumerate(rows, 1):
        lines.append(f"| {n} | {r['ep']} | {r['title'][:40]} | {r['views']} | {r['likes']} | {r['comments']} |")
    total = sum(r["views"] for r in rows)
    lines += ["", f"**Gesamt-Views:** {total}"]
    if rows:
        best = rows[0]
        lines += ["", f"**Top-Performer:** {best['ep']} „{best['title'][:40]}" + f"\" mit {best['views']} Views.",
                  "→ Mehr Folgen in diesem Thema/Stil bauen."]
    out = "\n".join(lines)
    print(out)
    if args.report:
        os.makedirs(os.path.dirname(REPORT), exist_ok=True)
        open(REPORT, "w").write(out + "\n")
        print(f"\n-> {REPORT}")


if __name__ == "__main__":
    main()
