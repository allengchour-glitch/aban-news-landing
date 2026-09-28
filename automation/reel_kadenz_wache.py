#!/usr/bin/env python3
"""reel_kadenz_wache.py — hält jeder Reel-Kanal seine Kadenz? (28.09.2026)

Anlass: meta_reel_post.mjs zählte für seine 6-h-Sperre JEDES «posted…» in reels_seed.csv, auch posted-tiktok und posted-youtube
(Metricool schreibt in dieselbe CSV). IG/FB bekam dadurch 1 Reel in 24 h statt 3; der Autopilot meldete stündlich «Reel fällig»,
aber keine Stelle sagte, dass seit 8 h nichts ging. Der Wächter meldet einen Kanal, dessen letzter Post älter ist als 1,5× seine
Kadenz, im Keepalive. Still, wenn alle Kanäle im Takt sind.

  python3 automation/reel_kadenz_wache.py          → «REEL-KADENZ: IG/FB 13.2 h (Takt 8 h) …» oder nichts
  python3 automation/reel_kadenz_wache.py --alle   → jede Zeile, auch die im Takt
  python3 automation/reel_kadenz_wache.py --test   → Kanarienvögel
"""
import csv, datetime, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Kanal → (Status-Muster, Takt in h). Takt wie social_autopilot.sh (Reel 8 h, TikTok 8 h seit 27.09., YouTube 12 h).
KANAELE = {
    "IG/FB": (re.compile(r"^posted(-ig(-fb)?|-instagram|-facebook)?$"), 8),
    "TikTok": (re.compile(r"^posted-tiktok$"), 8),
    "YouTube": (re.compile(r"^posted-youtube$"), 12),
}
FAKTOR = 1.5


def letzte(rows):
    out = {}
    for k, (rx, _) in KANAELE.items():
        ts = [r.get("posted_at", "") for r in rows if rx.match((r.get("status") or "").strip()) and r.get("posted_at")]
        out[k] = max(ts) if ts else ""
    return out


def alter_h(iso, jetzt):
    try:
        t = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    return (jetzt - t).total_seconds() / 3600


def befunde(rows, jetzt, alle=False):
    zeilen = []
    for k, iso in letzte(rows).items():
        takt = KANAELE[k][1]
        h = alter_h(iso, jetzt) if iso else None
        if h is None:
            zeilen.append(f"{k} nie"); continue
        if alle or h > FAKTOR * takt:
            zeilen.append(f"{k} {h:.1f} h (Takt {takt} h)")
    return zeilen


def test():
    j = datetime.datetime(2026, 9, 28, 12, 34, tzinfo=datetime.timezone.utc)
    rows = [{"status": "posted-ig-fb", "posted_at": "2026-09-28T04:09:45Z"}, {"status": "posted-tiktok", "posted_at": "2026-09-28T05:10:20Z"},
            {"status": "posted-youtube", "posted_at": "2026-09-28T08:11:49Z"}, {"status": "posted-dup-skip", "posted_at": "2026-09-28T12:00:00Z"}]
    ok = befunde(rows, j) == []                       # 8.4 h < 12 h → still
    j2 = j + datetime.timedelta(hours=5)              # IG 13.4 h > 12 h → Meldung; TikTok 12.4 > 12 → Meldung
    b2 = befunde(rows, j2)
    ok &= any(x.startswith("IG/FB 13.4") for x in b2) and any(x.startswith("TikTok") for x in b2) and not any(x.startswith("YouTube") for x in b2)
    ok &= befunde([], j) == ["IG/FB nie", "TikTok nie", "YouTube nie"]
    print("TEST", "BESTANDEN" if ok else "GESCHEITERT", b2)
    return 0 if ok else 1


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(test())
    rows = list(csv.DictReader(open(os.path.join(REPO, "automation/reels_seed.csv"))))
    b = befunde(rows, datetime.datetime.now(datetime.timezone.utc), "--alle" in sys.argv)
    if b:
        print("REEL-KADENZ: " + " · ".join(b) + ("" if "--alle" in sys.argv else " → Poster-Log /tmp/social_autopilot.log prüfen"))
