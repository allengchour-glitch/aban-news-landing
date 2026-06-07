#!/usr/bin/env python3
"""ABAN Files - Analyst/Grower.

Liest die YouTube-View-Zahlen der hochgeladenen Folgen und sagt, welche
Themen/Formate am besten ziehen -> datengetriebener Wachstums-Loop.

Zwei Wege (automatisch):
  1. **API-Key** (YT_API_KEY / GOOGLE_API_KEY / GEMINI_API_KEY, YouTube Data API v3
     im Projekt aktiviert + Key nicht auf andere APIs beschraenkt) -> Views+Likes+Komm.
  2. **Scrape-Fallback** (kein Key noetig): liest die View-Zahl von der oeffentlichen
     Watch-Seite. Funktioniert auf sauberen IPs (GitHub-Runner); auf manchen
     Cloud-/Sandbox-IPs blockt Google mit CAPTCHA.

Video-IDs aus video_ids.json (vom Publisher gepflegt). Reine stdlib.

Aufruf:
  python3 aban_stats.py            # Tabelle (Key wenn vorhanden, sonst Scrape)
  python3 aban_stats.py --report   # + reports/ABAN-STATS.md
"""
import os, sys, re, json, argparse, datetime, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
IDS = os.path.join(HERE, "video_ids.json")
SCRIPTS = os.path.join(HERE, "aban_scripts.json")
REPORT = os.path.abspath(os.path.join(HERE, "..", "..", "reports", "ABAN-STATS.md"))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def api_key():
    return (os.environ.get("YT_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("GEMINI_API_KEY"))


def parse_count(s):
    """'1.2K subscribers' / '12 subscribers' / '3.4M' -> int, sonst None."""
    s = (s or "").lower().replace("subscribers", "").replace("subscriber", "").replace(",", "").strip()
    mult = 1
    if s and s[-1] in "kmb":
        mult = {"k": 1e3, "m": 1e6, "b": 1e9}[s[-1]]
        s = s[:-1]
    try:
        return int(float(s) * mult)
    except ValueError:
        return None


def channel_subs(ids, key=None):
    """Best-effort Abonnentenzahl des Kanals. API (channelId aus 1. Video) oder Scrape.
    None, wenn versteckt/unlesbar. Kein Owner-Name hartcodiert (channelId aus Video)."""
    if not ids:
        return None
    if key:
        try:
            q = urllib.parse.urlencode({"part": "snippet", "id": ids[0], "key": key})
            with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{q}", timeout=60) as r:
                cid = json.load(r)["items"][0]["snippet"]["channelId"]
            q2 = urllib.parse.urlencode({"part": "statistics", "id": cid, "key": key})
            with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/channels?{q2}", timeout=60) as r:
                st = json.load(r)["items"][0]["statistics"]
            if st.get("hiddenSubscriberCount"):
                return None
            return int(st.get("subscriberCount", 0))
        except Exception:
            pass
    try:
        url = f"https://www.youtube.com/watch?v={ids[0]}&hl=en&bpctr=9999999999&has_verified=1"
        req = urllib.request.Request(url, headers={
            "User-Agent": UA, "Accept-Language": "en-US,en", "Cookie": "CONSENT=YES+1; SOCS=CAI"})
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
        m = (re.search(r'"subscriberCountText":\{[^}]*"simpleText":"([^"]+)"', html)
             or re.search(r'([\d.,]+\s*[KMB]?)\s+subscribers', html))
        if m:
            return parse_count(m.group(1))
    except Exception:
        pass
    return None


def title_to_ep(title, scripts):
    t = (title or "").upper()
    for ep, sc in scripts.items():
        if sc["title"].upper() in t:
            return ep
    return "?"


def via_api(ids, key, scripts):
    rows = []
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"part": "snippet,statistics",
                                    "id": ",".join(ids[i:i + 50]), "key": key})
        with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{q}", timeout=60) as r:
            d = json.load(r)
        if "error" in d:
            raise RuntimeError(d["error"].get("message", "API-Fehler"))
        for it in d.get("items", []):
            st = it.get("statistics", {})
            rows.append({"title": it["snippet"]["title"], "ep": title_to_ep(it["snippet"]["title"], scripts),
                         "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)),
                         "comments": int(st.get("commentCount", 0))})
    return rows


def via_scrape(ids, scripts):
    rows, ok = [], 0
    for vid in ids:
        # hl=en + bpctr + CONSENT-Cookie -> umgeht die EU-Consent-Zwischenseite
        url = f"https://www.youtube.com/watch?v={vid}&hl=en&bpctr=9999999999&has_verified=1"
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA, "Accept-Language": "en-US,en",
                "Cookie": "CONSENT=YES+1; SOCS=CAI"})
            html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
        except Exception:
            continue
        if "/sorry/" in html:
            raise RuntimeError("Google blockt diese IP (CAPTCHA) — Scrape hier nicht moeglich")
        m = re.search(r'"viewCount":"(\d+)"', html)
        tm = (re.search(r'<meta property="og:title" content="([^"]*)"', html)
              or re.search(r'<meta name="title" content="([^"]*)"', html)
              or re.search(r'"title":"([^"]{3,80})"', html)
              or re.search(r"<title>([^<]*)</title>", html))
        title = tm.group(1).replace(" - YouTube", "") if tm else vid
        if m or (tm and title != vid):
            ok += 1
        rows.append({"title": title, "ep": title_to_ep(title, scripts),
                     "views": int(m.group(1)) if m else 0, "likes": -1, "comments": -1})
    if ok == 0:
        raise RuntimeError("Seiten geladen, aber keine View-/Titel-Daten gefunden "
                           "(Consent-/Bot-Seite?) — Scrape hier nicht verwertbar")
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    seed = json.load(open(IDS)) if os.path.exists(IDS) else {}
    ids = list(dict.fromkeys(seed.values()))
    if not ids:
        print("Keine Video-IDs in video_ids.json."); return
    scripts = json.load(open(SCRIPTS))

    rows, mode = None, ""
    key = api_key()
    if key:
        try:
            rows, mode = via_api(ids, key, scripts), "API-Key"
        except Exception as e:
            print(f"(API-Key nicht nutzbar: {e}; versuche Scrape)")
    if rows is None:
        try:
            rows, mode = via_scrape(ids, scripts), "Scrape"
        except Exception as e:
            print(f"View-Zahlen nicht lesbar: {e}\n"
                  "-> Im woechentlichen GitHub-Workflow (saubere IP) klappt der Scrape;"
                  " oder einen unbeschraenkten YT_API_KEY hinterlegen.")
            return  # Exit 0: Workflow bleibt gruen

    rows.sort(key=lambda x: x["views"], reverse=True)
    def cell(n):
        return "—" if n < 0 else str(n)
    lines = [f"# ABAN Files — View-Report ({datetime.date.today()}, Quelle: {mode})", "",
             f"{len(rows)} Videos, sortiert nach Views.", "",
             "| # | Ep | Titel | Views | Likes | Kommentare |",
             "|---|----|-------|------:|------:|-----------:|"]
    for n, r in enumerate(rows, 1):
        lines.append(f"| {n} | {r['ep']} | {r['title'][:40]} | {r['views']} | {cell(r['likes'])} | {cell(r['comments'])} |")
    subs = channel_subs(ids, key)
    lines += ["", f"**Abonnenten:** {subs if subs is not None else '— (versteckt/unlesbar)'}  ·  "
              f"**Gesamt-Views:** {sum(r['views'] for r in rows)}"]
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
