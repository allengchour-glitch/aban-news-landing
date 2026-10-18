#!/usr/bin/env python3
"""tt_musik_wache.py — Prüfung der TikTok-Musik im Metricool-Planer (18.10.2026, Betreiber «tiktok trends musik»).

Von automation/metricool_planer_wache.py eingebunden: `musik_befunde` (reine Funktion, Klassen MUSIK_*), `tiktok_ton` und
`ton_befund` (nach der Veröffentlichung: was spielt TikTok wirklich?).

So erkennt der Wächter einen Beitrag mit Musik: GEMESSEN am 18.10. liefert die Listenabfrage GET /v2/scheduler/posts je Eintrag
`tiktokData.music = {musicId,title,author,previewUrl,thumbnailUrl,soundVolume,originalVolume,startMillis,endMillis}`; ohne Musik
fehlt der Schlüssel `music`.

Was Metricool selbst NICHT prüft (alles GEMESSEN mit Entwürfen, 18.10.): Lautstärken ausserhalb 0..100 (150, -5 gespeichert),
fehlende title/author/previewUrl/thumbnailUrl (gespeichert, leer), erfundene musicId «1», Start jenseits der Titeldauer,
Fenster von 90 s, end == start. Geprüft wird nur: musicId + soundVolume Pflicht, start >= 0, end >= start.
"""
import glob, json, os, re, urllib.request
from datetime import datetime, timedelta

ID_FORM = re.compile(r"^\d{6,}$")
MAX_FENSTER_MS = 60_000      # laenger als ein Reel nie sinnvoll (Reels sind 8-20 s)
LEDGER_FENSTER = 30          # Rotationsregel: kein Titel zweimal in den letzten 30 TikTok-Beitraegen


def bekannte_ids(tage=7):
    """IDs aus den Tagescaches /tmp/_tt_trend_<datum>_CH.json (Poster-Cache) der letzten `tage` Tage."""
    ids, grenze = set(), datetime.now() - timedelta(days=tage)
    for f in glob.glob("/tmp/_tt_trend_????-??-??_CH.json"):
        try:
            d = json.load(open(f))
            if datetime.fromisoformat(d["geholt"].replace("Z", "+00:00")).replace(tzinfo=None) < grenze:
                continue
            for liste in d["listen"].values():
                ids.update(str(t["commercialMusicId"]) for t in liste)
        except (OSError, KeyError, ValueError):
            continue
    return ids


def musik_befunde(posts, termin, bekannt=None):
    """Reine Funktion. posts = Planer-Eintraege, termin(p) = aware datetime oder None. Gibt {Klasse: [Eintrag, …]} zurueck."""
    b = {k: [] for k in ("MUSIK_AUTO", "MUSIK_WERTE", "MUSIK_FELDER", "MUSIK_UNBEKANNT", "MUSIK_DOPPELT")}
    tt = sorted((p for p in posts if any(x.get("network") == "tiktok" for x in p.get("providers", [])) and termin(p)),
                key=lambda p: termin(p))
    letzte = []   # (musicId, eintrag) der echten (Nicht-Entwurf-)Posts in Terminreihenfolge
    for p in tt:
        m = (p.get("tiktokData") or {}).get("music")
        if not m:
            continue
        e = {"id": p.get("id"), "termin": termin(p).strftime("%d.%m. %H:%M"), "titel": (m.get("title") or "?")[:30], "musicId": str(m.get("musicId"))}
        entwurf, auto = bool(p.get("draft")), bool(p.get("autoPublish", True))
        # Metricool-Hilfe: «Music can only be added when the post publishes automatically»
        if not entwurf and not auto:
            b["MUSIK_AUTO"].append(e)
        sv, ov, s, en = m.get("soundVolume"), m.get("originalVolume"), m.get("startMillis"), m.get("endMillis")
        if (not isinstance(sv, int) or not 0 <= sv <= 100 or (ov is not None and (not isinstance(ov, int) or not 0 <= ov <= 100))
                or (s is not None and s < 0) or (en is not None and s is not None and en <= s)
                or (en is not None and s is not None and en - s > MAX_FENSTER_MS)):
            b["MUSIK_WERTE"].append({**e, "werte": f"sv={sv} ov={ov} {s}-{en}"})
        fehlt = [k for k in ("title", "author", "previewUrl", "thumbnailUrl") if not m.get(k)]
        if fehlt:
            b["MUSIK_FELDER"].append({**e, "fehlt": ",".join(fehlt)})
        if not ID_FORM.match(e["musicId"]) or (bekannt and e["musicId"] not in bekannt):
            b["MUSIK_UNBEKANNT"].append(e)
        if not entwurf:
            letzte.append((e["musicId"], e))
    # Rotation: derselbe Titel innerhalb von 30 aufeinanderfolgenden TikTok-Posts MIT Musik
    for i, (mid, e) in enumerate(letzte):
        if any(mid == m2 for m2, _ in letzte[max(0, i - LEDGER_FENSTER + 1):i]):
            b["MUSIK_DOPPELT"].append(e)
    return b


def tiktok_ton(url):
    """Nach der Veroeffentlichung: was spielt TikTok wirklich? Liest die Videoseite (GEMESSEN 18.10. an einem unserer Posts:
    music.title «Originalton», music.original true, video.volumeInfo.Loudness -15.6). Gibt dict oder None."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                                                "Accept-Language": "de-CH,de;q=0.9"})
    try:
        h = urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "replace")
        j = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', h, re.S)
        item = json.loads(j.group(1))["__DEFAULT_SCOPE__"]["webapp.video-detail"]["itemInfo"]["itemStruct"]
        m, v = item.get("music") or {}, item.get("video") or {}
        return {"id": str(m.get("id")), "titel": m.get("title"), "original": m.get("original"), "kommerziell": m.get("is_commerce_music"),
                "lautheit": (v.get("volumeInfo") or {}).get("Loudness")}
    except Exception:
        return None


def ton_befund(post_music_id, ton):
    """None = in Ordnung; sonst Text. TikTok hat die gewaehlte Musik NICHT uebernommen, wenn die Seite 'Originalton' zeigt."""
    if ton is None:
        return "Videoseite nicht lesbar"
    if ton["original"]:
        return "Musik nicht angekommen (TikTok zeigt Originalton)"
    return None


def selbsttest():
    from datetime import timezone
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Europe/Zurich")
    t = lambda p: datetime.fromisoformat(p["publicationDate"]["dateTime"]).replace(tzinfo=TZ)
    def post(i, wann, music=None, draft=False, auto=True, netz="tiktok"):
        d = {"id": i, "draft": draft, "autoPublish": auto, "publicationDate": {"dateTime": wann}, "providers": [{"network": netz}], "tiktokData": {}}
        if music is not None:
            d["tiktokData"]["music"] = music
        return d
    ok = dict(musicId="7348963992872175618", title="Vintage Vibe", author="Dutrex", previewUrl="u", thumbnailUrl="t", soundVolume=60, originalVolume=0, startMillis=0, endMillis=11000)
    posts = [
        post(1, "2026-10-20T10:00:00", ok),                                                         # in Ordnung
        post(2, "2026-10-20T16:00:00", {**ok, "musicId": "7210840458547857410"}, auto=False),       # AUTO
        post(3, "2026-10-20T22:00:00", {**ok, "musicId": "7210840458547857411", "soundVolume": 150}),# WERTE
        post(4, "2026-10-21T10:00:00", {**ok, "musicId": "7210840458547857412", "title": ""}),      # FELDER
        post(5, "2026-10-21T16:00:00", {**ok, "musicId": "1"}),                                     # UNBEKANNT
        post(6, "2026-10-21T22:00:00", ok),                                                         # DOPPELT (wie Post 1)
        post(7, "2026-10-22T10:00:00", {**ok, "musicId": "7210840458547857413", "endMillis": 90000}),# WERTE (90 s)
        post(8, "2026-10-22T16:00:00", None),                                                       # ohne Musik: ignoriert
        post(9, "2026-12-01T03:30:00", {**ok, "musicId": "7210840458547857414"}, draft=True),       # Entwurf: zaehlt nicht fuer DOPPELT/AUTO
        post(10, "2026-10-22T20:00:00", ok, netz="instagram"),                                      # anderes Netz: ignoriert
    ]
    bek = {"7348963992872175618", "7210840458547857410", "7210840458547857411", "7210840458547857412", "7210840458547857413", "7210840458547857414"}
    b = musik_befunde(posts, t, bek)
    ids = lambda k: sorted(e["id"] for e in b[k])
    erw = {"MUSIK_AUTO": [2], "MUSIK_WERTE": [3, 7], "MUSIK_FELDER": [4], "MUSIK_UNBEKANNT": [5], "MUSIK_DOPPELT": [6]}
    fehler = [f"{k}: erwartet {w}, gemessen {ids(k)}" for k, w in erw.items() if ids(k) != w]
    print("SELBSTTEST tt_musik_wache:", "OK (5 Klassen)" if not fehler else "FEHLER " + "; ".join(fehler))
    return 0 if not fehler else 1


if __name__ == "__main__":
    import sys
    sys.exit(selbsttest())
