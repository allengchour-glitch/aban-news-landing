#!/usr/bin/env python3
"""metricool_planer_wache.py — liest den Metricool-Planer und meldet, was NIE erscheint oder doppelt erscheint (18.10.2026).

ANLASS: Die von Hand/ChatGPT angelegten Produkt-Videos (17./18.10.) standen als `draft: true, autoPublish: false` im Planer.
Ein Entwurf wird nie veröffentlicht; `autoPublish: false` schickt nur eine Push-Meldung an die Metricool-App des Betreibers.
Zwei Termine (18.10. 18:30 und 18:45) verstrichen so ohne Post — niemand sah es, weil kein Wächter den Planer las; die
Poster (`metricool_*_post.mjs`) kennen nur ihre eigenen Ledger-Zeilen. Dazu: für dasselbe Produkt lagen zwei Videos
(18:30 und 18:45, später 19.10.) im Planer — das Doppelpost-Verbot (GEHIRN 10) gilt auch für fremd angelegte Posts.

Was gemeldet wird (Fenster: 3 Tage zurück, 14 Tage voraus; Termine sind Zürcher Ortszeit):
  UEBERFAELLIG  Entwurf oder autoPublish=false und der Termin liegt > 15 Min zurück → erscheint nie von selbst
  ENTWURF_BALD  Entwurf mit Termin in den nächsten 72 h → wird nicht gesendet, wenn niemand ihn freigibt
  FEHLER        ein Netzwerk steht auf ERROR/FAILED
  HAENGT        autoPublish=true, Termin > 60 Min zurück, Status noch PENDING
  DOPPELT       dasselbe Produkt (Handle aus dem Link im Text) zweimal auf demselben Netzwerk im Fenster (ohne Stories,
                ohne Entwürfe); Entwürfe zählen nicht, sie werden ohnehin nie gesendet
  ERSETZT       Entwurf, dessen Produkt schon als echter Post im Fenster liegt (Zweitfassung) — nur Info, kein Alarm,
                zählt weder als überfällig noch als «Entwurf bald»; so nörgelt die Wache nicht ewig über Altentwürfe
  INAKTIV       (nur mit --shop) Produkt im Link ist nicht ACTIVE oder fehlt → Poster-Regel «Produkt vorher ACTIVE»

Modi:  (ohne)      eine Zeile «METRICOOL-PLANER: …» (Ampel in der Keepalive-Meldung), Exit 0 immer
       --liste     alle Befunde mit Id, Termin, Netzwerk, Textanfang
       --shop      zusätzlich INAKTIV prüfen (Shopify Admin API, ein Aufruf)
       --selbsttest  prüft die Klassen an gebauten Planer-Einträgen, Exit 1 bei Fehler
Nur lesend: die Wache ändert NIE einen Post. Freigeben oder Verwerfen bleibt Sache der Sitzung/des Betreibers.
ENV: METRICOOL_USER_TOKEN (oder /tmp/metricool.env), METRICOOL_USER_ID (4801419), METRICOOL_BLOG_ID (6227837).
"""
import json, os, re, sys, urllib.error, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

try:   # 18.10.2026: TikTok-Musik im Planer prüfen (Metricool prüft Lautstärken/IDs/Felder selbst nicht)
    import tt_musik_wache as _mw
except ImportError:
    _mw = None

TZ = ZoneInfo("Europe/Zurich")
USER = os.environ.get("METRICOOL_USER_ID", "4801419")
BLOG = os.environ.get("METRICOOL_BLOG_ID", "6227837")
BASE = "https://app.metricool.com/api"
TAGE_ZURUECK, TAGE_VORAUS = 3, 14
UEBERFAELLIG_MIN, HAENGT_MIN, ENTWURF_STD = 15, 60, 72
LINK = re.compile(r"luxestyle\.ch/products/([a-z0-9][a-z0-9\-]*)", re.I)


def token():
    if os.environ.get("METRICOOL_USER_TOKEN"):
        return os.environ["METRICOOL_USER_TOKEN"]
    try:
        m = re.search(r"METRICOOL_USER_TOKEN=([^\s'\"]+)", open("/tmp/metricool.env").read())
        return m.group(1) if m else ""
    except OSError:
        return ""


def holen(jetzt):
    tag = lambda d: d.strftime("%Y-%m-%d")
    von, bis = jetzt - timedelta(days=TAGE_ZURUECK), jetzt + timedelta(days=TAGE_VORAUS)
    url = (f"{BASE}/v2/scheduler/posts?userId={USER}&blogId={BLOG}&start={tag(von)}T00:00:00&end={tag(bis)}T23:59:59"
           f"&timezone={urllib.parse.quote('Europe/Zurich')}")
    req = urllib.request.Request(url, headers={"X-Mc-Auth": token(), "User-Agent": "luxe-planer-wache"})
    j = json.load(urllib.request.urlopen(req, timeout=40))
    return j.get("data", j) if isinstance(j, dict) else j


def termin(p):
    """Zürcher Ortszeit des Eintrags als aware datetime (None, wenn unlesbar)."""
    try:
        return datetime.fromisoformat(p["publicationDate"]["dateTime"]).replace(tzinfo=TZ)
    except (KeyError, TypeError, ValueError):
        return None


def netze(p, status=None):
    return [x.get("network", "?") for x in p.get("providers", []) if status is None or (x.get("status") or "").upper() in status]


def handle(p):
    m = LINK.search(p.get("text") or "")
    return m.group(1).lower() if m else ""


def bewerten(posts, jetzt):
    """Reine Funktion: Planer-Einträge → Befunde je Klasse. `jetzt` aware datetime."""
    b = {k: [] for k in ("UEBERFAELLIG", "ENTWURF_BALD", "FEHLER", "HAENGT", "DOPPELT", "ERSETZT")}
    je_produkt = {}
    echt = {handle(p) for p in posts if not p.get("draft") and handle(p)}
    for p in posts:
        t = termin(p)
        if t is None:
            continue
        entwurf = bool(p.get("draft"))
        auto = bool(p.get("autoPublish", True))
        offen = netze(p, {"PENDING", ""})
        alter_min = (jetzt - t).total_seconds() / 60
        eintrag = {"id": p.get("id"), "termin": t.strftime("%d.%m. %H:%M"), "netze": ",".join(netze(p)) or "?",
                   "text": " ".join((p.get("text") or "").split())[:60], "handle": handle(p)}
        if entwurf and eintrag["handle"] in echt:
            b["ERSETZT"].append(eintrag)
        elif (entwurf or not auto) and offen and alter_min > UEBERFAELLIG_MIN:
            b["UEBERFAELLIG"].append(eintrag)
        elif entwurf and 0 <= -alter_min <= ENTWURF_STD * 60:
            b["ENTWURF_BALD"].append(eintrag)
        if any(s in (x.get("status") or "").upper() for x in p.get("providers", []) for s in ("ERROR", "FAIL")):
            b["FEHLER"].append(eintrag)
        if auto and not entwurf and offen and alter_min > HAENGT_MIN:
            b["HAENGT"].append(eintrag)
        # Doppel: nur echte Posts (keine Entwürfe), keine Stories (kein Text), Produkt aus dem Link
        if not entwurf and eintrag["handle"]:
            for n in netze(p):
                je_produkt.setdefault((eintrag["handle"], n), []).append(eintrag)
    for (h, n), liste in je_produkt.items():
        if len({e["id"] for e in liste}) > 1:
            b["DOPPELT"].append({"handle": h, "netz": n, "termine": ", ".join(e["termin"] for e in liste)})
    if _mw:
        b.update(_mw.musik_befunde(posts, termin, _mw.bekannte_ids() or None))
    return b


def _secret_datei():
    import subprocess
    try:
        return subprocess.run(["bash", "-c", '. /tmp/secrets_env.sh >/dev/null 2>&1; printf %s "${SHOPIFY_CLIENT_SECRET:-}"'],
                              capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return ""


def shop_inaktiv(handles):
    """Handles, die nicht ACTIVE sind (None bei Lesefehler → «unklar», nie «alles ok»)."""
    if not handles:
        return []
    cid = os.environ.get("SHOPIFY_CLIENT_ID", "")
    shop = "au3j0y-hq.myshopify.com"
    try:
        def post(u, d, h):
            return json.load(urllib.request.urlopen(urllib.request.Request(u, data=json.dumps(d).encode(), headers=h), timeout=30))
        tok = None
        # Umgebungswert zuerst; lehnt Shopify ihn ab (15.10.: 60 statt 38 Zeichen), den Wert aus /tmp/secrets_env.sh versuchen
        for sec in (os.environ.get("SHOPIFY_CLIENT_SECRET", ""), _secret_datei()):
            if not sec:
                continue
            try:
                tok = post(f"https://{shop}/admin/oauth/access_token",
                           {"client_id": cid, "client_secret": sec, "grant_type": "client_credentials"},
                           {"Content-Type": "application/json", "User-Agent": "x"})["access_token"]
                break
            except urllib.error.HTTPError:
                continue
        if not tok:
            return None
        hs = sorted(handles)
        q = "{" + " ".join(f'p{i}: productByHandle(handle:"{h}"){{status}}' for i, h in enumerate(hs)) + "}"
        r = post(f"https://{shop}/admin/api/2025-01/graphql.json", {"query": q},
                 {"Content-Type": "application/json", "X-Shopify-Access-Token": tok, "User-Agent": "x"})["data"]
        return [h for i, h in enumerate(hs) if not r.get(f"p{i}") or r[f"p{i}"].get("status") != "ACTIVE"]
    except Exception:
        return None


def zeile(b, geplant, inaktiv=()):
    teile = []
    if b["UEBERFAELLIG"]:
        teile.append(f"{len(b['UEBERFAELLIG'])} überfällig (Entwurf/ohne Auto-Versand, nie erschienen)")
    if b["ENTWURF_BALD"]:
        teile.append(f"{len(b['ENTWURF_BALD'])} Entwurf ≤ 72 h (wird nicht gesendet)")
    if b["FEHLER"]:
        teile.append(f"{len(b['FEHLER'])} Fehler")
    if b["HAENGT"]:
        teile.append(f"{len(b['HAENGT'])} hängt")
    if b["DOPPELT"]:
        teile.append(f"{len(b['DOPPELT'])} Produkt doppelt")
    musik = sum(len(b.get(k, [])) for k in ("MUSIK_AUTO", "MUSIK_WERTE", "MUSIK_FELDER", "MUSIK_UNBEKANNT", "MUSIK_DOPPELT"))
    if musik:
        teile.append(f"{musik} TikTok-Musik auffällig")
    if inaktiv:
        teile.append(f"{len(inaktiv)} Produkt nicht aktiv")
    if teile:
        return f"⚠️ METRICOOL-PLANER: {' · '.join(teile)} · {geplant} geplant — `python3 automation/metricool_planer_wache.py --liste`"
    info = f", {len(b['ERSETZT'])} Altentwurf ersetzt" if b["ERSETZT"] else ""
    return f"METRICOOL-PLANER: ok · {geplant} geplant (14 T), nichts überfällig, kein Produkt doppelt{info}"


def selbsttest():
    jetzt = datetime(2026, 10, 18, 22, 0, tzinfo=TZ)
    def post(i, wann, text="", draft=False, auto=True, status="PENDING", netz=("instagram",)):
        return {"id": i, "draft": draft, "autoPublish": auto, "text": text,
                "publicationDate": {"dateTime": wann, "timezone": "Europe/Zurich"},
                "providers": [{"network": n, "status": status} for n in netz]}
    L = "https://luxestyle.ch/products/"
    posts = [
        post(1, "2026-10-18T18:30:00", "A " + L + "lampe-5", draft=True, auto=False),               # überfällig
        post(2, "2026-10-19T18:30:00", "B " + L + "wecker-2", draft=True, auto=False),             # Entwurf bald
        post(3, "2026-10-20T10:00:00", "C " + L + "projektor-3"),                                  # ok
        post(4, "2026-10-18T22:20:00", "D " + L + "tasche-1", netz=("instagram",)),                # ok, erstes echtes tasche-1
        post(5, "2026-10-20T11:00:00", "E " + L + "tasche-1", netz=("instagram", "tiktok")),       # doppelt auf instagram
        post(6, "2026-10-18T20:00:00", "F " + L + "x-9", status="ERROR"),                          # Fehler
        post(7, "2026-10-18T20:30:00", "G " + L + "y-8"),                                          # hängt (90 Min)
        post(8, "2026-10-18T21:55:00", "", draft=False, auto=True),                                # Story ohne Link: nie Doppel
        post(9, "2026-10-18T21:50:00", "H " + L + "z-7", status="PUBLISHED"),                      # veröffentlicht: ok
        post(10, "2026-10-18T21:50:00", "I " + L + "wecker-2", draft=True, auto=False),            # Entwurf zählt nicht als Doppel
        post(11, "2026-10-18T21:50:00", "J " + L + "q-6", auto=False),                             # Termin erst 10 Min her: noch nicht überfällig
        post(13, "2026-10-19T09:00:00", "K " + L + "tasche-1", draft=True, auto=False),            # ersetzt (tasche-1 hat echte Posts)
        {"id": 12, "text": "kaputt"},                                                              # ohne Termin: übersprungen
    ]
    b = bewerten(posts, jetzt)
    ids = lambda k: sorted(e["id"] for e in b[k])
    erw = [("UEBERFAELLIG", [1]), ("ENTWURF_BALD", [2]), ("FEHLER", [6]), ("HAENGT", [7]), ("ERSETZT", [13])]
    fehler = [f"{k}: erwartet {w}, gemessen {ids(k)}" for k, w in erw if ids(k) != w]
    if [(d["handle"], d["netz"]) for d in b["DOPPELT"]] != [("tasche-1", "instagram")]:
        fehler.append(f"DOPPELT: {b['DOPPELT']}")
    # Sommer-/Winterzeit: derselbe Ortszeit-Eintrag am 26.10. (MEZ) liegt eine Stunde später in UTC als am 18.10. (MESZ)
    sommer = datetime(2026, 10, 18, 12, 0, tzinfo=TZ).astimezone(timezone.utc).hour
    winter = datetime(2026, 10, 26, 12, 0, tzinfo=TZ).astimezone(timezone.utc).hour
    if (sommer, winter) != (10, 11):
        fehler.append(f"Zeitzone: {sommer}/{winter}")
    if not zeile(b, 11).startswith("⚠️ METRICOOL-PLANER: 1 überfällig"):
        fehler.append("Zeile mit Befunden")
    if not zeile({k: [] for k in b}, 5).startswith("METRICOOL-PLANER: ok"):
        fehler.append("Zeile ohne Befunde")
    if _mw is None:
        fehler.append("tt_musik_wache nicht importierbar")
    elif _mw.selbsttest() != 0:
        fehler.append("tt_musik_wache Selbsttest")
    print("SELBSTTEST metricool_planer_wache:", "OK (7 Klassen + Zeitzone + Zeilen + 5 Musikklassen)" if not fehler else "FEHLER " + "; ".join(fehler))
    return 0 if not fehler else 1


def musik_pruefen(max_posts=6):
    """Täglich: veröffentlichte TikTok-Posts MIT Musik → Videoseite lesen. `music.original == true` heisst: TikTok hat die
    gewählte Musik nicht übernommen (Konto-Art / Titel stummgeschaltet). Ausgabe eine Zeile + Befunde."""
    if _mw is None or not token():
        print("TIKTOK-MUSIK: unklar (Modul/Token fehlt)")
        return 0
    jetzt = datetime.now(TZ)
    try:
        posts = holen(jetzt)
    except Exception as e:
        print(f"TIKTOK-MUSIK: unklar (Planer nicht lesbar: {type(e).__name__})")
        return 0
    kandidaten = []
    for p in sorted(posts, key=lambda q: termin(q) or jetzt, reverse=True):
        m = (p.get("tiktokData") or {}).get("music")
        if not m or p.get("draft"):
            continue
        for x in p.get("providers", []):
            if x.get("network") == "tiktok" and (x.get("status") or "").upper() == "PUBLISHED" and x.get("publicUrl"):
                kandidaten.append((p, m, x["publicUrl"]))
    if not kandidaten:
        print("TIKTOK-MUSIK: noch kein veröffentlichter TikTok-Post mit Musik")
        return 0
    schlecht = []
    for p, m, url in kandidaten[:max_posts]:
        ton = _mw.tiktok_ton(url)
        urteil = _mw.ton_befund(str(m.get("musicId")), ton)
        if urteil is None and ton and ton.get("id") and str(ton["id"]) != str(m.get("musicId")):
            urteil = f"andere Musik-ID auf TikTok ({ton['id']})"
        print(f"  {'✓' if urteil is None else '✗'} {m.get('title', '?')[:28]:28} {url.rsplit('/', 1)[-1]} original={ton and ton.get('original')} "
              f"Lautheit={ton and ton.get('lautheit')} {urteil or ''}")
        if urteil:
            schlecht.append(url)
    print(f"{'⚠️ ' if schlecht else ''}TIKTOK-MUSIK: {len(kandidaten[:max_posts])} geprüft, {len(schlecht)} ohne die gewählte Musik")
    return 0


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--musik-pruefen" in sys.argv:
        sys.exit(musik_pruefen())
    if not token():
        print("METRICOOL-PLANER: unklar (kein METRICOOL_USER_TOKEN)")
        return
    jetzt = datetime.now(TZ)
    try:
        posts = holen(jetzt)
    except Exception as e:
        print(f"METRICOOL-PLANER: unklar (Planer nicht lesbar: {type(e).__name__})")
        return
    b = bewerten(posts, jetzt)
    geplant = sum(1 for p in posts if (t := termin(p)) and t > jetzt and not p.get("draft"))
    inaktiv = []
    if "--shop" in sys.argv:
        hs = {handle(p) for p in posts if handle(p) and not p.get("draft") and (termin(p) or jetzt) > jetzt - timedelta(hours=1)}
        res = shop_inaktiv(hs)
        if res is None:
            print("METRICOOL-PLANER: Produktstatus unklar (Shopify nicht lesbar)")
        else:
            inaktiv = res
    print(zeile(b, geplant, inaktiv))
    if "--liste" in sys.argv:
        for k, liste in b.items():
            for e in liste:
                print(f"  {k:13} " + " · ".join(f"{a}={v}" for a, v in e.items() if v))
        for h in inaktiv:
            print(f"  INAKTIV       handle={h}")


if __name__ == "__main__":
    main()
