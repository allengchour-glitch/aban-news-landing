"""mediakit/pexels.py — Pexels-Stockvideo-Client (optional, für den B-Roll-Look).

Portiert aus video-prototypes/aban-files/aban_stock.py. Liest den Key aus
`PEXELS` ODER `PEXELS_API_KEY` (beide Secret-Namen im Repo gebräuchlich). Ohne Key
gibt alles None zurück → der Reel-Render fällt sauber auf den ruhigen Zoom zurück.
Pexels-Lizenz: kostenlos nutzbar, keine Attribution nötig.
"""
import json
import os
import urllib.parse
import urllib.request

KEY = os.environ.get("PEXELS") or os.environ.get("PEXELS_API_KEY")
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/120 Safari/537.36")


def have_key():
    return bool(KEY)


def _search(params):
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": KEY, "User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=60)).get("videos", [])


def download(query, out):
    """Bestes portrait-Stockvideo zu `query` nach `out` laden. None bei Key-/Netzfehler."""
    if not KEY:
        return None
    try:
        vids = _search({"query": query, "orientation": "portrait", "per_page": 8, "size": "medium"})
        if not vids:
            vids = _search({"query": query, "per_page": 8})
    except Exception as e:
        print(f"  Pexels-Suche fehlgeschlagen ({e})")
        return None
    if not vids:
        return None
    best, score = None, -1
    for v in vids:
        for f in v.get("video_files", []):
            h, w = f.get("height", 0), f.get("width", 0)
            s = h + (5000 if h >= w else 0) + min(h, 1920)
            if s > score:
                score, best = s, f.get("link")
    if not best:
        return None
    try:
        req = urllib.request.Request(best, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as fo:
            fo.write(r.read())
        return out
    except Exception as e:
        print(f"  Pexels-Download fehlgeschlagen ({e})")
        return None
