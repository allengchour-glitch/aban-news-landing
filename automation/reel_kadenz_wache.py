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
import csv, datetime, json, os, re, sys, urllib.parse, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 05.10.2026 (Prüferbefund): Bei Metricool-Posts ist posted_at die PLANUNGSZEIT (Bestzeit-Posts stehen oft 8 h später im Planer).
# «TikTok 0.3 h» hiess also «vor 0.3 h geplant», die echte Lücke zwischen Veröffentlichungen war ~19 h. Für Zeilen mit
# post_url `metricool:<id>` ohne öffentliche Adresse fragt die Wache den Planer nach publicationDate (Token aus Env oder
# /tmp/metricool.env); ohne Token bleibt die Planungszeit, aber mit dem Zusatz «(Planungszeit)».
MC_BASE = "https://app.metricool.com/api"
MC_USER = os.environ.get("METRICOOL_USER_ID", "4801419")
MC_BLOG = os.environ.get("METRICOOL_BLOG_ID", "6227837")
MC_TZ = os.environ.get("MC_TZ", "Europe/Zurich")


def metricool_token():
    t = os.environ.get("METRICOOL_USER_TOKEN", "").strip()
    if t:
        return t
    try:
        m = re.search(r"METRICOOL_USER_TOKEN=([^\s'\"]+)", open("/tmp/metricool.env").read())
        return m.group(1) if m else ""
    except OSError:
        return ""


def metricool_termine(ids):
    """{metricool-id: publicationDate als UTC-datetime} für die angegebenen Planer-IDs; {} wenn kein Token/Fehler."""
    tok = metricool_token()
    if not tok or not ids:
        return {}
    try:
        from zoneinfo import ZoneInfo
        heute = datetime.datetime.now(datetime.timezone.utc)
        von = (heute - datetime.timedelta(days=4)).strftime("%Y-%m-%d"); bis = (heute + datetime.timedelta(days=2)).strftime("%Y-%m-%d")
        url = (f"{MC_BASE}/v2/scheduler/posts?userId={MC_USER}&blogId={MC_BLOG}&start={von}T00:00:00&end={bis}T23:59:59"
               f"&timezone={urllib.parse.quote(MC_TZ)}")
        j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"X-Mc-Auth": tok, "User-Agent": "luxestyle-kadenz"}), timeout=30))
        posts = j if isinstance(j, list) else (j.get("data") or j.get("posts") or [])
        out = {}
        for p in posts:
            if str(p.get("id")) not in ids:
                continue
            pd = p.get("publicationDate"); pd = pd.get("dateTime") if isinstance(pd, dict) else pd
            if not pd:
                continue
            t = datetime.datetime.fromisoformat(str(pd).replace(" ", "T")[:19])
            out[str(p["id"])] = t.replace(tzinfo=ZoneInfo(MC_TZ)).astimezone(datetime.timezone.utc)
        return out
    except Exception:
        return {}
# Kanal → (Status-Muster, Takt in h). Takt wie social_autopilot.sh (Reel 8 h, TikTok 8 h seit 27.09., YouTube 12 h).
KANAELE = {
    "IG/FB": (re.compile(r"^posted(-ig(-fb)?|-instagram|-facebook)?$"), 8),
    "TikTok": (re.compile(r"^posted-tiktok$"), 8),
    "YouTube": (re.compile(r"^posted-youtube$"), 12),
}
FAKTOR = 1.5


def letzte(rows, termine=None, jetzt=None):
    """Kanal → (ISO-Zeit des letzten VERÖFFENTLICHTEN Posts, Zusatz, ISO-Zeit des nächsten GEPLANTEN Posts oder "").
    Metricool-Zeilen ohne öffentliche Adresse: Planer-Termin statt Planungszeit; Termin in der Zukunft = geplant, nicht veröffentlicht."""
    out = {}
    jetzt_iso = (jetzt or datetime.datetime.now(datetime.timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for k, (rx, _) in KANAELE.items():
        kand = [r for r in rows if rx.match((r.get("status") or "").strip()) and r.get("posted_at")]
        beste, zusatz, geplant = "", "", ""
        for r in kand:
            iso, z = r["posted_at"], ""
            m = re.match(r"^metricool:(\d+)$", (r.get("post_url") or "").strip())   # geplant, noch ohne öffentliche Adresse
            if m:
                t = (termine or {}).get(m.group(1))
                if t is not None:
                    iso = t.strftime("%Y-%m-%dT%H:%M:%SZ"); z = "Planer-Termin"
                    if iso > jetzt_iso:
                        geplant = min(geplant, iso) if geplant else iso; continue
                else:
                    z = "Planungszeit"
            if iso > beste:
                beste, zusatz = iso, z
        out[k] = (beste, zusatz, geplant)
    return out


def alter_h(iso, jetzt):
    try:
        t = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    return (jetzt - t).total_seconds() / 3600


def befunde(rows, jetzt, alle=False, termine=None):
    zeilen = []
    for k, (iso, zusatz, geplant) in letzte(rows, termine, jetzt).items():
        takt = KANAELE[k][1]
        h = alter_h(iso, jetzt) if iso else None
        g = alter_h(geplant, jetzt) if geplant else None
        plan = f" · nächster geplant in {-g:.1f} h" if g is not None and g < 0 else ""
        if h is None:
            zeilen.append(f"{k} nie{plan}"); continue
        if alle or h > FAKTOR * takt:
            zeilen.append(f"{k} {h:.1f} h (Takt {takt} h)" + (f" · {zusatz}" if zusatz else "") + plan)
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
    # Metricool: Planungszeit 02:12, Planer-Termin 08:05 UTC → um 05:00 «geplant in 3.1 h»; ohne Termin «Planungszeit»
    # Metricool: letzter veröffentlichter TikTok 04.10. 13:11 (öffentliche Adresse), neuer um 02:12 nur GEPLANT für 08:05 UTC
    # → um 05:00: «TikTok 15.8 h (Takt 8 h) · nächster geplant in 3.1 h» (die Lücke zählt ab der Veröffentlichung, nicht ab der Planung).
    # Ohne Planer-Antwort zählt die Planungszeit, aber ausgewiesen («Planungszeit»). Termin in der Vergangenheit = veröffentlicht.
    rows3 = [{"status": "posted-tiktok", "posted_at": "2026-10-04T13:11:12Z", "post_url": "metricool:387791623 tiktok:https://www.tiktok.com/x"},
             {"status": "posted-tiktok", "posted_at": "2026-10-05T02:12:57Z", "post_url": "metricool:388146074"}]
    j3 = datetime.datetime(2026, 10, 5, 5, 0, tzinfo=datetime.timezone.utc)
    termin = {"388146074": datetime.datetime(2026, 10, 5, 8, 5, tzinfo=datetime.timezone.utc)}
    b3 = befunde(rows3, j3, False, termin)
    ok &= "TikTok 15.8 h (Takt 8 h) · nächster geplant in 3.1 h" in b3 and not any(x.startswith("TikTok") and x != "TikTok 15.8 h (Takt 8 h) · nächster geplant in 3.1 h" for x in b3)
    b4 = befunde(rows3, j3, True, {})
    ok &= any(x.startswith("TikTok 2.8 h") and x.endswith("Planungszeit") for x in b4)
    b5 = befunde(rows3, j3 + datetime.timedelta(hours=4), True, termin)      # 09:00: Termin 08:05 vorbei → veröffentlicht vor 0.9 h
    ok &= any(x.startswith("TikTok 0.9 h") and "Planer-Termin" in x for x in b5)
    print("TEST", "BESTANDEN" if ok else "GESCHEITERT", b2, b3, b4, b5)
    return 0 if ok else 1


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(test())
    rows = list(csv.DictReader(open(os.path.join(REPO, "automation/reels_seed.csv"))))
    ids = {m.group(1) for r in rows for m in [re.match(r"^metricool:(\d+)$", (r.get("post_url") or "").strip())] if m}
    b = befunde(rows, datetime.datetime.now(datetime.timezone.utc), "--alle" in sys.argv, metricool_termine(ids))
    if b:
        print("REEL-KADENZ: " + " · ".join(b) + ("" if "--alle" in sys.argv else " → Poster-Log /tmp/social_autopilot.log prüfen"))
