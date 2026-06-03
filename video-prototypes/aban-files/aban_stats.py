#!/usr/bin/env python3
"""ABAN Files - Analyst/Grower.

Liest die YouTube-View-Zahlen der hochgeladenen Folgen und sagt, welche
Themen/Formate am besten ziehen -> datengetriebener Wachstums-Loop.

Braucht einen **API-Key** (YouTube Data API v3 im Projekt aktiviert):
  YT_API_KEY  (empfohlen)  |  GOOGLE_API_KEY  |  GEMINI_API_KEY
Das Upload-OAuth-Token darf `videos.list` NICHT lesen (Scope-403), daher API-Key.
Reine stdlib (urllib) — keine google-Client-Lib, proxy-robust.

Video-IDs kommen aus video_ids.json (vom Publisher gepflegt).

Aufruf:
  YT_API_KEY=AIza... python3 aban_stats.py            # Tabelle
  YT_API_KEY=AIza... python3 aban_stats.py --report   # + reports/ABAN-STATS.md
"""
import os, sys, json, argparse, datetime, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
IDS = os.path.join(HERE, "video_ids.json")
SCRIPTS = os.path.join(HERE, "aban_scripts.json")
REPORT = os.path.abspath(os.path.join(HERE, "..", "..", "reports", "ABAN-STATS.md"))


def api_key():
    return (os.environ.get("YT_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("GEMINI_API_KEY"))


def title_to_ep(title, scripts):
    t = title.upper()
    for ep, sc in scripts.items():
        if sc["title"].upper() in t:
            return ep
    return "?"


def fetch(ids, key):
    out = []
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"part": "snippet,statistics",
                                    "id": ",".join(ids[i:i + 50]), "key": key})
        with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{q}", timeout=60) as r:
            d = json.load(r)
        if "error" in d:
            raise RuntimeError(d["error"].get("message", "API-Fehler"))
        out += d.get("items", [])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    key = api_key()
    if not key:
        print("Kein API-Key (YT_API_KEY / GOOGLE_API_KEY / GEMINI_API_KEY) gesetzt —\n"
              "View-Zahlen koennen nicht gelesen werden. Uebersprungen (kein Fehler).")
        return  # Exit 0: Workflow bleibt gruen

    seed = json.load(open(IDS)) if os.path.exists(IDS) else {}
    ids = list(dict.fromkeys(seed.values()))
    if not ids:
        print("Keine Video-IDs in video_ids.json."); return

    scripts = json.load(open(SCRIPTS))
    try:
        items = fetch(ids, key)
    except Exception as e:
        print(f"API-Fehler (YouTube Data API v3 fuer den Key aktiviert?): {e}")
        return  # Exit 0: kein roter Workflow

    rows = []
    for it in items:
        st = it.get("statistics", {})
        rows.append({"title": it["snippet"]["title"],
                     "ep": title_to_ep(it["snippet"]["title"], scripts),
                     "views": int(st.get("viewCount", 0)),
                     "likes": int(st.get("likeCount", 0)),
                     "comments": int(st.get("commentCount", 0))})
    rows.sort(key=lambda x: x["views"], reverse=True)

    lines = [f"# ABAN Files — View-Report ({datetime.date.today()})", "",
             f"{len(rows)} Videos, sortiert nach Views.", "",
             "| # | Ep | Titel | Views | Likes | Kommentare |",
             "|---|----|-------|------:|------:|-----------:|"]
    for n, r in enumerate(rows, 1):
        lines.append(f"| {n} | {r['ep']} | {r['title'][:40]} | {r['views']} | {r['likes']} | {r['comments']} |")
    lines += ["", f"**Gesamt-Views:** {sum(r['views'] for r in rows)}"]
    if rows:
        b = rows[0]
        lines += ["", f"**Top-Performer:** {b['ep']} ({b['views']} Views) — mehr Folgen in diesem Thema/Stil bauen."]
    out = "\n".join(lines)
    print(out)
    if args.report:
        os.makedirs(os.path.dirname(REPORT), exist_ok=True)
        open(REPORT, "w").write(out + "\n")
        print(f"\n-> {REPORT}")


if __name__ == "__main__":
    main()
