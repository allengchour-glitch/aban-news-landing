#!/usr/bin/env python3
"""reel_kadenz_wache.py — hält jeder Reel-Kanal seine Kadenz? (28.09.2026)

Anlass: meta_reel_post.mjs zählte für seine 6-h-Sperre JEDES «posted…» in reels_seed.csv, auch posted-tiktok und posted-youtube
(Metricool schreibt in dieselbe CSV). IG/FB bekam dadurch 1 Reel in 24 h statt 3; der Autopilot meldete stündlich «Reel fällig»,
aber keine Stelle sagte, dass seit 8 h nichts ging. Der Wächter meldet einen Kanal, dessen letzter Post älter ist als 1,5× seine
Kadenz, im Keepalive. Still, wenn alle Kanäle im Takt sind.

  python3 automation/reel_kadenz_wache.py          → «REEL-KADENZ: IG/FB 13.2 h (Takt 8 h) …» oder nichts
  python3 automation/reel_kadenz_wache.py --alle   → jede Zeile, auch die im Takt
  python3 automation/reel_kadenz_wache.py --test   → Kanarienvögel

20.10.2026 (Runde 16:25): DIE WACHE MASS PLAN STATT WIRKLICHKEIT — zweiter Leser derselben Daten wie die Betreiber-Ampel (Fix 12:25).
Seit dem 7-Tage-Vorlauf (18.10.) schreibt der Planer-Lauf jede Metricool-Zeile mit posted_at = PLANUNGSZEIT (18.10. ~22:00) in
reels_seed.csv; veröffentlicht wird zum Slot-Termin (dropship/_vorlauf_plan.json). Folge: «IG/FB 42 h, YouTube 42 h (Takt 8/12 h)» im
Keepalive, obwohl IG/FB um 10:15 UTC und YouTube um 05:20 UTC gepostet hatten. Zwei Ursachen, beide behoben:
  (a) die Planer-Auflösung verlangte `^metricool:(\d+)$` — die IG/FB-Zeilen tragen «metricool:ID fb:ID» (nie aufgelöst, Planungszeit
      galt als Sendezeit, ohne Zusatz); ausserdem deckt das Planer-Fenster nur -4/+2 Tage, die Zeilen planen bis +7 Tage voraus;
  (b) Zeilen, deren Metricool-ID im Vorlauf-Plan steht, zählen NICHT mehr als Post: die Sendezeit liefert der Slot (status=geplant UND
      mc_ids; vergangen = zuletzt veröffentlicht, künftig = «nächster geplant»). Ein zurückgezogener/fehlerhafter Slot liefert nichts —
      die Stille bleibt sichtbar. Läuft der Planer-Plan aus (nach dem letzten Slot), zählt wieder nur, was der Autopilot selbst schreibt.
Gegenprobe in beide Richtungen: `--test` (Fall 6–9, Mutationsbeweis: die Fassung vom 28.09. fällt bei 6).
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
# 20.10.2026 (Runde 22:00, Befund «Kadenz-Wache nachts»): der Vorlauf-Plan lässt NACHTS bewusst Lücken (IG/FB 18:15 → 10:15 = 16 h,
# TikTok bis 13 h, im Plan bis 25.10. gemessen: IG/FB 17,0 h, TikTok 13,0 h) — die Wache meldete jede Nacht ab 12 h «IG/FB 12.8 h
# (Takt 8 h)», obwohl der nächste Slot planmässig bevorstand. Ist der letzte Post ein Vorlauf-Slot UND der nächste Slot geplant, gilt die
# GEPLANTE Lücke + 1,5 h als Schwelle, höchstens VORLAUF_LUECKE_MAX (SETZUNG: länger darf auch ein Plan nicht schweigen).
VORLAUF_LUECKE_MAX = 20.0
VORLAUF_TOLERANZ = 1.5
# Vorlauf-Format → Kanal dieser Wache (social_vorlauf.py, automation/data/vorlauf_regeln.json)
PLAN_FORMAT = {"reel_igfb": "IG/FB", "tiktok": "TikTok", "youtube": "YouTube"}
PLAN_DATEI = os.path.join(REPO, "dropship", "_vorlauf_plan.json")
ID_RE = re.compile(r"(?:^|\s)(?:metricool|fb):(\d+)")
# Zeile OHNE öffentliche Adresse (noch nicht veröffentlicht): «metricool:ID» oder «metricool:ID fb:ID» (IG/FB-Reel); mit «tiktok:https://…» ist es veröffentlicht
OHNE_URL_RE = re.compile(r"^metricool:(\d+)(?:\s+fb:\d+)?$")


def plan_lesen(pfad=None):
    """(slots, ids): slots = {kanal: [(termin_iso, status, hat_mc_ids), …]}, ids = alle Metricool-IDs des Plans (Strings). ({}, set()) bei Fehler."""
    try:
        plan = json.load(open(pfad or PLAN_DATEI, encoding="utf-8"))
        slots, ids = {}, set()
        for s in (plan.get("slots") or {}).values():
            for i in s.get("mc_ids") or []:
                ids.add(str(i))
            k = PLAN_FORMAT.get(s.get("format"))
            if k and s.get("termin_utc"):
                slots.setdefault(k, []).append((s["termin_utc"], s.get("status"), bool(s.get("mc_ids"))))
        return slots, ids
    except (OSError, ValueError, AttributeError):
        return {}, set()


def zeilen_ids(row):
    return set(ID_RE.findall((row.get("post_url") or "")))


def letzte(rows, termine=None, jetzt=None, plan=None):
    """Kanal → (ISO-Zeit des letzten VERÖFFENTLICHTEN Posts, Zusatz, ISO-Zeit des nächsten GEPLANTEN Posts oder "").
    Metricool-Zeilen ohne öffentliche Adresse: Planer-Termin statt Planungszeit; Termin in der Zukunft = geplant, nicht veröffentlicht."""
    out = {}
    jetzt_iso = (jetzt or datetime.datetime.now(datetime.timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ")
    plan_slots, plan_ids = plan if plan else ({}, set())
    for k, (rx, _) in KANAELE.items():
        # Zeilen des Vorlauf-Plans zählen nicht (posted_at = Planungszeit): ihre Sendezeit steht im Slot
        kand = [r for r in rows if rx.match((r.get("status") or "").strip()) and r.get("posted_at")
                and not (zeilen_ids(r) & plan_ids)]
        beste, zusatz, geplant = "", "", ""
        for termin, status, mit_ids in plan_slots.get(k, []):
            if status != "geplant" or not mit_ids:
                continue            # zurückgezogen/fehlerhaft/ohne Planer-Eintrag = kein Post
            if termin <= jetzt_iso:
                if termin > beste:
                    beste, zusatz = termin, "Vorlauf-Slot"
            elif not geplant or termin < geplant:
                geplant = termin
        for r in kand:
            iso, z = r["posted_at"], ""
            m = OHNE_URL_RE.match((r.get("post_url") or "").strip())   # geplant, noch ohne öffentliche Adresse
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


def befunde(rows, jetzt, alle=False, termine=None, plan=None):
    zeilen = []
    for k, (iso, zusatz, geplant) in letzte(rows, termine, jetzt, plan).items():
        takt = KANAELE[k][1]
        h = alter_h(iso, jetzt) if iso else None
        g = alter_h(geplant, jetzt) if geplant else None
        plan = f" · nächster geplant in {-g:.1f} h" if g is not None and g < 0 else ""
        if h is None:
            zeilen.append(f"{k} nie{plan}"); continue
        schwelle = FAKTOR * takt
        if zusatz == "Vorlauf-Slot" and g is not None and g < 0:
            schwelle = max(schwelle, min(h + (-g) + VORLAUF_TOLERANZ, VORLAUF_LUECKE_MAX))
        if alle or h > schwelle:
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
    # --- 20.10.2026: Vorlauf-Plan als Quelle der Sendezeit (Fall 6–9) ---------------------------------------------------------
    UTC = datetime.timezone.utc

    def slot(t, status="geplant", ids=True):
        return (t, status, ids)
    zeilen6 = [{"status": "posted-instagram", "posted_at": "2026-10-18T22:00:00Z", "post_url": "metricool:111 fb:112"},      # IG/FB: zwei IDs
               {"status": "posted-tiktok", "posted_at": "2026-10-20T11:00:00Z", "post_url": "metricool:221"},                    # Planungszeit NEUER als der letzte Slot
               {"status": "posted-youtube", "posted_at": "2026-10-18T22:10:00Z", "post_url": "metricool:331"}]
    ids6 = {"111", "112", "221", "331"}
    plan6 = ({"IG/FB": [slot("2026-10-20T10:15:00Z"), slot("2026-10-20T18:15:00Z")],
              "TikTok": [slot("2026-10-20T05:00:00Z"), slot("2026-10-21T06:05:00Z")],
              "YouTube": [slot("2026-10-20T05:20:00Z"), slot("2026-10-21T05:20:00Z")]}, ids6)
    j6 = datetime.datetime(2026, 10, 20, 12, 0, tzinfo=UTC)
    # Fall 6: Plan trägt die Sendezeit → mitten im Plan KEIN Befund (die Fassung vom 28.09. meldete IG/FB 37 h und YouTube 37 h)
    b6 = befunde(zeilen6, j6, False, {}, plan6)
    ok &= b6 == []
    # Fall 6b: TikTok-Planungszeit 11:00 (Zeile für einen späteren Slot) darf die echte Lücke (letzter Slot 05:00) NICHT verdecken
    j6b = datetime.datetime(2026, 10, 20, 20, 0, tzinfo=UTC)
    b6b = befunde(zeilen6, j6b, True, {}, plan6)
    ok &= any(x.startswith("TikTok 15.0 h") for x in b6b) and not any(x.startswith("TikTok 9.0") for x in b6b)
    # Fall 7: Slot zurückgezogen (status offen, keine mc_ids) → zählt nicht → «still»-Befund bleibt sichtbar
    plan7 = ({"IG/FB": [slot("2026-10-20T10:15:00Z", "offen", False)]}, set())
    b7 = befunde([zeilen6[0]], j6, False, {}, plan7)
    ok &= any(x.startswith("IG/FB") for x in b7)
    # Fall 8: Plan ist ausgelaufen (14 h nach dem letzten Slot), der Autopilot schreibt nichts → Befund
    j8 = datetime.datetime(2026, 10, 21, 8, 30, tzinfo=UTC)
    b8 = befunde(zeilen6, j8, False, {}, ({"IG/FB": [slot("2026-10-20T18:15:00Z")]}, ids6))
    ok &= any(x.startswith("IG/FB 14.2 h") for x in b8)
    # Fall 8b: ... und schreibt der Autopilot danach selbst eine veröffentlichte Zeile (öffentliche Adresse), ist wieder Ruhe
    zeile8b = {"status": "posted-instagram", "posted_at": "2026-10-21T07:00:00Z", "post_url": "metricool:999 instagram:https://www.instagram.com/reel/x"}
    ok &= not any(x.startswith("IG/FB") for x in befunde(zeilen6 + [zeile8b], j8, False, {}, ({"IG/FB": [slot("2026-10-20T18:15:00Z")]}, ids6)))
    # Fall 9: Slot im Planer fehlgeschlagen (status fehler) → kein Post (Zeile gehört zum Plan und zählt auch nicht)
    plan9 = ({"IG/FB": [slot("2026-10-20T10:15:00Z", "fehler", True)]}, {"111", "112"})
    b9 = befunde([zeilen6[0]], j6, False, {}, plan9)
    ok &= any(x.startswith("IG/FB") for x in b9)
    # Fall 10: «metricool:ID fb:ID» (zwei IDs, ohne Adresse) löst über den Planer auf; mit «tiktok:https://…» bleibt die Zeile veröffentlicht
    ok &= bool(OHNE_URL_RE.match("metricool:111 fb:112") and OHNE_URL_RE.match("metricool:5") and not OHNE_URL_RE.match("metricool:5 tiktok:https://t.co/x"))
    # Fall 11: Planer-Datei fehlt/kaputt → plan_lesen() liefert leer, Wache fällt auf das Ledger zurück (kein Absturz)
    ok &= plan_lesen("/nicht/da.json") == ({}, set())
    # --- 20.10.2026 (Runde 22:00): geplante Lücke des Vorlauf-Plans ist KEIN Befund (Fall 12–14) -------------------------------
    nacht = {"IG/FB": [slot("2026-10-20T10:15:00Z"), slot("2026-10-20T18:15:00Z"), slot("2026-10-21T10:15:00Z")],
             "TikTok": [slot("2026-10-20T20:00:00Z"), slot("2026-10-21T07:00:00Z")], "YouTube": [slot("2026-10-20T20:00:00Z"), slot("2026-10-21T05:20:00Z")]}
    j12 = datetime.datetime(2026, 10, 21, 7, 0, tzinfo=UTC)       # IG/FB: 12.75 h nach 18:15, nächster Slot 10:15 geplant (Lücke 16 h)
    b12 = befunde([], j12, False, {}, (nacht, set()))
    ok &= not any(x.startswith("IG/FB") for x in b12)             # vor der Änderung: «IG/FB 12.8 h (Takt 8 h)» jede Nacht
    # Fall 13: auch ein PLAN darf nicht länger als VORLAUF_LUECKE_MAX schweigen (Lücke 25 h → ab 20 h Meldung, davor Ruhe)
    lang = {"IG/FB": [slot("2026-10-20T10:15:00Z")], "TikTok": [slot("2026-10-20T05:00:00Z"), slot("2026-10-21T06:05:00Z")], "YouTube": [slot("2026-10-20T05:20:00Z")]}
    ok &= not any(x.startswith("TikTok") for x in befunde([], datetime.datetime(2026, 10, 20, 23, 0, tzinfo=UTC), False, {}, (lang, set())))   # 18 h < 20
    b13 = befunde([], datetime.datetime(2026, 10, 21, 1, 30, tzinfo=UTC), False, {}, (lang, set()))                                              # 20.5 h > 20
    ok &= any(x.startswith("TikTok 20.5 h") and "nächster geplant" in x for x in b13)
    # Fall 14: nur ein Vorlauf-Slot als LETZTER Post bekommt die Toleranz — fehlt der nächste Slot (Plan aus), gilt die alte Schwelle 12 h
    plan14 = ({"IG/FB": [slot("2026-10-20T18:15:00Z")], "TikTok": [], "YouTube": []}, set())
    ok &= any(x.startswith("IG/FB 12.8 h") for x in befunde([], j12, False, {}, plan14))
    print("TEST", "BESTANDEN" if ok else "GESCHEITERT", b2, b3, b4, b5, "| plan:", b6, b6b, b7, b8, b9)
    return 0 if ok else 1


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(test())
    rows = list(csv.DictReader(open(os.path.join(REPO, "automation/reels_seed.csv"))))
    ids = {m.group(1) for r in rows for m in [OHNE_URL_RE.match((r.get("post_url") or "").strip())] if m}
    b = befunde(rows, datetime.datetime.now(datetime.timezone.utc), "--alle" in sys.argv, metricool_termine(ids), plan_lesen())
    if b:
        print("REEL-KADENZ: " + " · ".join(b) + ("" if "--alle" in sys.argv else " → Poster-Log /tmp/social_autopilot.log prüfen"))
