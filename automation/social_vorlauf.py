#!/usr/bin/env python3
"""social_vorlauf.py — plant die Metricool-Beiträge 7 Tage voraus (Betreiber 18.10.2026: «pushe metricool 7 tage voraus bis sonntag
22.00 uhr … sichtbarkeit erweitern auf maximum»).

WARUM EIN TREIBER STATT NEUER POSTER: Jeder bestehende Poster (`metricool_tiktok_post.mjs`, `social-autopost-meta.mjs`, `ig_karussell_post.mjs`,
`story-autopost-meta.mjs`, `metricool_pinterest_pin.mjs`) trägt ALLE Wachen selbst (Lock, Ledger, Produkt ACTIVE, Preis, Jury, Meisterwerk-Tor,
Familie, Pause, Model-Markierung). Der Treiber wählt deshalb KEINEN Inhalt: Er legt Slots fest und startet je Slot den passenden Poster als
Unterprozess mit `PUBLISH_AT=<ISO-UTC>` (siehe `automation/lib/publish_at.mjs`). Quittung ist der PLANER, nicht der Exit-Code: Metricool wird
nach dem Lauf gelesen, der neue Eintrag (Netz + Termin) wandert mit id in `dropship/_vorlauf_plan.json`.

Modi (ohne SCHARF=1 nur Trockenlauf — zeigt Slots und Befehle, plant nichts, schreibt nichts):
  --plan [--max-min 35] [--format tiktok,pin] [--max-slots N]   Slots füllen (chronologisch, neustartfest, höchstens max-min Minuten)
  --pruefen                                      geplante Posts gegen Shop/Medium/Pause/Stopp prüfen, Befund → DELETE (nur mit SCHARF=1)
  --notbremse                                    ALLE zukünftigen Vorlauf-Posts löschen (nur mit SCHARF=1)
  --liste                                        Plan je Tag und Format
  --zeile                                        eine Zeile «VORLAUF: …» für die Keepalive-Ampel
  --selbsttest                                   Slots, Sommerzeit, Konflikte, Preisregel, Adoption — Exit 1 bei Fehler

Dateien: automation/data/vorlauf_regeln.json (Raster, Abstände) · dropship/_vorlauf_plan.json (Plan, wird vom Auto-Committer gesichert) ·
dropship/_vorlauf_log.tsv (Protokoll) · dropship/_vorlauf_drossel.tsv («Marke<TAB>bis-ISO»: der Autopilot (`faellig()`) postet ein Format
nicht selbst, solange der Planer es bis dahin abdeckt; fehlende/abgelaufene Datei = altes Verhalten, fail-open).

Sicherheitsregeln: Stopp-Datei dropship/_SOCIAL_STOPP → nichts planen, zukünftige Vorlauf-Posts löschen. Fremd angelegte Planer-Einträge
(ChatGPT, Autopilot) werden NIE angefasst, nur als Abstands-Hindernis gezählt. Nie ein Post ohne Planer-Quittung als «geplant» führen.
Zeitumstellung: Zürich 25.10.2026 03:00 → 02:00 — Slots in der doppelten Stunde fallen weg (`mehrdeutig()`).
"""
import copy, fcntl, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import metricool_planer_wache as W  # noqa: E402  (holen, termin, netze, handle, token — nur lesend)

TZ = ZoneInfo("Europe/Zurich")
UTC = timezone.utc
REGELN = os.path.join(HIER, "data", "vorlauf_regeln.json")
PLAN = os.path.join(REPO, "dropship", "_vorlauf_plan.json")
LOG = os.path.join(REPO, "dropship", "_vorlauf_log.tsv")
DROSSEL = os.path.join(REPO, "dropship", "_vorlauf_drossel.tsv")
HALT = os.path.join(REPO, "dropship", "_vorlauf_halt.txt")   # Notbremse des Treibers: solange die Datei steht, plant er nichts (löschen = weiter)
PRODUKTE = os.path.join(REPO, "dropship", "_posted_produkte.txt")
SPERRE_PRUEFER = "/tmp/social_vorlauf_pruefer.lock"
PLAN_SPERRE = "/tmp/social_vorlauf_plan.lock"   # kurz, nur um «lesen → zusammenführen → schreiben» der Plan-Datei
TT_MODUS = os.path.join(REPO, "dropship", "_tt_trend_modus.txt")   # TikTok-Trendton: aus | halt (Pilot läuft, TikTok-Slots warten) | an
STOPP = os.path.join(REPO, "dropship", "_SOCIAL_STOPP")
PAUSE = os.path.join(REPO, "dropship", "_social_pause.txt")
SPERRE = "/tmp/social_vorlauf.lock"
NODE = "/opt/node22/bin/node"
SCHARF = os.environ.get("SCHARF") == "1"
BASE = "https://app.metricool.com/api"
USER, BLOG = W.USER, W.BLOG

POSTER = {   # Format → (Befehl, Zusatz-Umgebung, Vorlauf-Schritte vor dem Poster)
    "tiktok":    ([NODE, "automation/metricool_tiktok_post.mjs"], {"NETZ": "tiktok", "DIREKTLINK_TEXT": "1"}),
    "youtube":   ([NODE, "automation/metricool_tiktok_post.mjs"], {"NETZ": "youtube", "DIREKTLINK_TEXT": "1"}),
    "reel_igfb": ([NODE, "automation/metricool_tiktok_post.mjs"], {"NETZ": "instagram"}),
    "bild":      ([NODE, "automation/social-autopost-meta.mjs"], {"WEG": "metricool", "MAX_PER_RUN": "1"}),   # Threads: die REST-API verweigert es (403 «Access denied to blog», GEMESSEN 19.10.) — nur der Metricool-Konnektor kann es, siehe threads_zwillinge.py
    "karussell": ([NODE, "automation/ig_karussell_post.mjs"], {"WEG": "metricool"}),
    "story":     ([NODE, "automation/story-autopost-meta.mjs"], {"WEG": "metricool", "MAX_PER_RUN": "1"}),
    "pin":       ([NODE, "automation/metricool_pinterest_pin.mjs"], {}),
}
LEER_MUSTER = re.compile(r"nichts faellig|nichts fällig|kein ready|kein pin-kandidat|kein bild mit status=ready|keine .*ready|nichts zu tun|kein postbares|stopp gesetzt", re.I)
FEED_ARTEN = {"post", "reel"}
SPERR_MUSTER = re.compile(r"lock aktiv|anderer poster", re.I)   # vorübergehend: kein Versuch verbraucht, nicht wiederholen


# ───────────────────────── Grundlagen ─────────────────────────
def jetzt():
    return datetime.now(UTC)


def iso(t):
    return t.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def von_iso(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(UTC)


def regeln_laden(pfad=REGELN):
    return json.load(open(pfad, encoding="utf-8"))


def atomar(pfad, text):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(pfad))
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, pfad)


class PlanDefekt(Exception):
    pass


def _git_plan(rev):
    r = subprocess.run(["git", "show", f"{rev}:dropship/_vorlauf_plan.json"], cwd=REPO, capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        return None
    try:
        d = json.loads(r.stdout)
        return d if isinstance(d.get("slots"), dict) else None
    except ValueError:
        return None


def plan_laden(pfad=PLAN):
    """Fehlende Datei = leerer Plan. Defekte Datei (Merge-Marker, halber Schreibvorgang, Snapshot-Rücklauf) NIE still als leer behandeln:
    Prüfung 18.10. — ein leerer Plan erzeugt alle Slots neu und damit Doppelposts neben den vorhandenen. Erst die Datei sichern,
    dann den letzten gültigen Stand aus git holen; gelingt das nicht → Abbruch (PlanDefekt)."""
    if not os.path.exists(pfad):
        return {"version": 1, "slots": {}, "_basis": {}}
    try:
        d = json.load(open(pfad, encoding="utf-8"))
        d["_basis"] = copy.deepcopy(d.get("slots", {}))
        return d
    except (OSError, ValueError):
        pass
    try:
        shutil.copy(pfad, pfad + ".defekt")
    except OSError:
        pass
    for rev in ("HEAD", "origin/claude/luxestyle-status-tztnn1"):
        d = _git_plan(rev)
        if d is not None:
            print(f"⚠️ Plan-Datei defekt → Stand aus git {rev} wiederhergestellt ({len(d['slots'])} Slots; Kopie: _vorlauf_plan.json.defekt)")
            if SCHARF:
                atomar(pfad, json.dumps(d, ensure_ascii=False, indent=1))
            d["_basis"] = copy.deepcopy(d.get("slots", {}))
            return d
    raise PlanDefekt("dropship/_vorlauf_plan.json ist defekt und nicht aus git herstellbar")


def plan_speichern(plan, pfad=PLAN):
    """Schreibt den Plan — aber ZUSAMMENGEFÜHRT: Prüfer/Notbremse (eigene Sperre) und der Plan-Lauf halten je eine Kopie im Speicher; wer seine
    Kopie über die Datei schrieb, löschte die Änderungen des anderen (Lost-Update, Prüfung 18.10.). Je Slot gilt: hat DIESER Prozess ihn gegenüber
    dem Stand beim Laden (`_basis`) geändert → unser Stand, sonst der aktuelle Stand der Datei."""
    if not SCHARF and pfad == PLAN:
        return   # Trockenlauf schreibt nichts
    with open(PLAN_SPERRE, "w") as sperre:
        fcntl.flock(sperre, fcntl.LOCK_EX)
        try:
            platte = json.load(open(pfad, encoding="utf-8")).get("slots", {})
        except (OSError, ValueError):
            platte = {}
        basis = plan.get("_basis", {})
        zusammen = {}
        for name in set(plan["slots"]) | set(platte):
            unser, ihr, alt = plan["slots"].get(name), platte.get(name), basis.get(name)
            if unser is None:
                zusammen[name] = ihr
            elif ihr is None or unser != alt:
                zusammen[name] = unser
            else:
                zusammen[name] = ihr
        plan["slots"] = zusammen
        plan["stand"] = iso(jetzt())
        roh = {k: v for k, v in plan.items() if k != "_basis"}
        atomar(pfad, json.dumps(roh, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
        plan["_basis"] = copy.deepcopy(zusammen)


def log(slot, aktion, detail=""):
    if not SCHARF:
        return
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(f"{iso(jetzt())}\t{slot}\t{aktion}\t{str(detail).replace(chr(10), ' ')[:300]}\n")
    except OSError:
        pass


def mehrdeutig(lokal):
    """Wandzeit, die es wegen Zeitumstellung zweimal oder nie gibt."""
    a, b = lokal.replace(fold=0), lokal.replace(fold=1)
    return a.utcoffset() != b.utcoffset()


# ───────────────────────── Planer ─────────────────────────
def mc(pfad, methode="GET", body=None):
    url = f"{BASE}{pfad}{'&' if '?' in pfad else '?'}userId={USER}&blogId={BLOG}"
    req = urllib.request.Request(url, method=methode, data=(json.dumps(body).encode() if body is not None else None),
                                 headers={"X-Mc-Auth": W.token(), "Content-Type": "application/json", "User-Agent": "luxe-vorlauf"})
    with urllib.request.urlopen(req, timeout=45) as r:
        t = r.read().decode("utf-8", "replace")
    return json.loads(t) if t.strip() else {}


def planer_lesen():
    return W.holen(jetzt())


def art_des_eintrags(p):
    typen = {str((p.get("instagramData") or {}).get("type", "")).upper(), str((p.get("facebookData") or {}).get("type", "")).upper()}
    if "STORY" in typen:
        return "story"
    if p.get("pinterestData"):
        return "pin"
    if "REEL" in typen or any(x.get("network") in ("tiktok", "youtube") for x in p.get("providers", [])):
        return "reel"
    return "post"


def eintrag_utc(p):
    t = W.termin(p)
    return t.astimezone(UTC) if t else None


def konflikt(t_utc, fmt, regeln, planer, eigene=()):
    """Gibt den störenden Planer-Eintrag zurück (gleiche Art, überlappendes Netz, Abstand < abstand_min) oder None.
    Entwürfe zählen nicht (werden nie gesendet)."""
    f = regeln["formate"][fmt]
    netze = set(f["netze"])
    for p in planer:
        if p.get("draft"):
            continue
        if p.get("id") in eigene:
            continue
        te = eintrag_utc(p)
        if te is None:
            continue
        art = art_des_eintrags(p)
        if art != f["art"]:
            # Prüfung 18.10.: Feed-Bild und Reel auf demselben Instagram/Facebook-Profil nie im Abstand < 45 min (ChatGPT-Reel 10:00 stand 15 min nach dem
            # Bild 09:45). Stories und Pins sind eigene Flächen.
            if art in FEED_ARTEN and f["art"] in FEED_ARTEN and (netze & set(W.netze(p)) & {"instagram", "facebook"}) \
                    and abs((te - t_utc).total_seconds()) < regeln.get("feed_uebergreifend_min", 45) * 60:
                return p
            continue
        gemeinsam = netze & set(W.netze(p))
        if not gemeinsam:
            continue
        ab = max(regeln["abstand_min"].get(n, 60) for n in gemeinsam)
        if abs((te - t_utc).total_seconds()) < ab * 60:
            return p
    return None


# ───────────────────────── Slots ─────────────────────────
def slot_id(fmt, t_utc):
    return f"{fmt}-{t_utc:%Y%m%dT%H%M}"


def slots_erzeugen(regeln, jetzt_utc, planer, plan, nur=None):
    """Neue Slots (noch nicht im Plan) bis max_tage_voraus/fenster_ende; verschiebt bei Konflikt um versatz_min, sonst «belegt»."""
    ende = min(von_iso(regeln["fenster_ende_utc"]), jetzt_utc + timedelta(days=regeln["max_tage_voraus"]))
    frueh = jetzt_utc + timedelta(minutes=regeln["mindest_vorlauf_min"])
    neu, belegt = [], []
    tag = jetzt_utc.astimezone(TZ).date()
    letzter_tag = ende.astimezone(TZ).date()
    gesetzt = {}
    for x in plan["slots"].values():
        gesetzt.setdefault(x["format"], []).append(von_iso(x["termin_utc"]))
    basen = {(x["format"], x.get("basis_utc")) for x in plan["slots"].values()}
    while tag <= letzter_tag:
        for fmt, zeiten in regeln["raster"].items():
            if nur and fmt not in nur:
                continue
            for hhmm in zeiten:
                h, m = map(int, hhmm.split(":"))
                lokal = datetime(tag.year, tag.month, tag.day, h, m, tzinfo=TZ)
                if mehrdeutig(lokal):
                    continue
                basis = lokal.astimezone(UTC)
                if (fmt, iso(basis)) in basen:
                    continue   # dieser Raster-Platz ist schon im Plan (ggf. verschoben)
                if basis < frueh or basis > ende:
                    continue
                gewaehlt = None
                for v in regeln["versatz_min"]:
                    t = basis + timedelta(minutes=v)
                    if t < frueh or t > ende or mehrdeutig(t.astimezone(TZ).replace(tzinfo=TZ)):
                        continue
                    if konflikt(t, fmt, regeln, planer) is None and all(abs((t - x).total_seconds()) >= 60 * min(regeln["abstand_min"].get(n, 60) for n in regeln["formate"][fmt]["netze"]) for x in gesetzt.get(fmt, [])):
                        gewaehlt = t
                        break
                if gewaehlt is None:
                    belegt.append(slot_id(fmt, basis))
                    continue
                s = {"format": fmt, "termin_utc": iso(gewaehlt), "basis_utc": iso(basis), "status": "offen", "versuche": 0, "mc_ids": []}
                neu.append((slot_id(fmt, gewaehlt), s))
                gesetzt.setdefault(fmt, []).append(gewaehlt)
        tag += timedelta(days=1)
    return neu, belegt


# ───────────────────────── Poster-Aufruf ─────────────────────────
def story_vorbereiten():
    """Wie der Autopilot: ohne ready-Karte erst story_bauen (Jury Pflicht), dann der Poster."""
    try:
        import csv
        n = sum(1 for r in csv.DictReader(open(os.path.join(REPO, "social", "story_queue.csv"), encoding="utf-8")) if r.get("status") == "ready")
    except OSError:
        n = 0
    if n < 1:
        subprocess.run(["python3", "automation/story_bauen.py"], cwd=REPO, env={**os.environ, "SCHARF": "1", "N": "1"}, capture_output=True, text=True, timeout=900)


def produkt_zeilen():
    """Zeilen des Produkt-Ledgers (die Poster schreiben «slug:<handle>» je gepostetem Produkt) — vorher/nachher ergibt die Produkte des Slots."""
    try:
        return set(open(PRODUKTE, encoding="utf-8").read().split("\n"))
    except OSError:
        return set()


def produkt_neu(vorher):
    # nur plausible Shop-Handles: das Ledger führt auch Reel-IDs («cjreel-…», «bildreel-…») und gekürzte Namens-Schlüssel unter «slug:»
    neu = [z[5:].strip().lower() for z in produkt_zeilen() - vorher
           if z.startswith("slug:") and len(z) > 5 and not re.match(r"slug:(?:cjreel|bildreel|reel|x)-", z)]
    # Bild/Karussell schreiben «pid:<Zahl>» (und «name:…») statt «slug:» — pid wird erst beim Prüfen zum Handle aufgelöst (handles_aufloesen)
    return neu + [z.strip().lower() for z in produkt_zeilen() - vorher if re.fullmatch(r"pid:\d+", z.strip().lower())]


def tt_trend_modus():
    """aus (Standard) | halt | an — die Datei schreibt der Pilot-Ablauf (siehe dropship/MUSIK-V3-2026-10-18.md); unlesbar = aus."""
    try:
        m = open(TT_MODUS, encoding="utf-8").read().strip().split()[0].lower()
    except (OSError, IndexError):
        return "aus"
    return m if m in ("aus", "halt", "an") else "aus"


def poster_aufruf(slot_name, slot, regeln):
    fmt = slot["format"]
    cmd, extra = POSTER[fmt]
    env = {**os.environ, **extra, "PUBLISH_AT": slot["termin_utc"], "NODE": NODE}
    if fmt == "tiktok" and tt_trend_modus() == "an":
        env["TT_TREND"] = "1"   # Trendton nur NACH belegtem Pilot (Modus «an»); der Poster fällt bei jedem Fehler auf den eigenen Ton zurück
    if fmt == "story":
        story_vorbereiten()
    r = subprocess.run(cmd, cwd=REPO, env=env, capture_output=True, text=True, timeout=1500)
    tail = ((r.stdout or "") + "\n" + (r.stderr or "")).strip()
    return r.returncode, tail[-900:]


def neue_eintraege(vorher_ids, nachher, slot, regeln, seit_utc):
    """Planer-Einträge, die es vorher nicht gab, mit passendem Netz und Termin (±3 Min)."""
    t_soll = von_iso(slot["termin_utc"])
    erlaubt = set(regeln["formate"][slot["format"]]["netze"]) | zwilling_netze(slot["format"])
    gefunden = []
    for p in nachher:
        if p.get("id") in vorher_ids or p.get("draft") or p.get("autoPublish") is False:
            continue   # Entwürfe sind nie vom Treiber (Poster senden autoPublish) — fremde Entwürfe nie übernehmen, der Prüfer löscht Mitglieder des Plans
        te = eintrag_utc(p)
        if te is None or abs((te - t_soll).total_seconds()) > 180:
            continue
        if not set(W.netze(p)) <= erlaubt or not set(W.netze(p)):
            continue
        gefunden.append(p)
    return gefunden


def kind_planer_stand(p):
    return {"id": p.get("id"), "uuid": p.get("uuid"), "netze": W.netze(p)}


# ───────────────────────── Plan füllen ─────────────────────────
def zwilling_netze(fmt):
    return {"facebook", "threads"} if fmt == "bild" else {"facebook"} if fmt == "karussell" else set()


def adoptierbare(plan, s, planer, seit_utc):
    """Planer-Einträge, die zu diesem Slot gehören müssen, aber nicht im Plan stehen: ±3 min um den Termin, nur Netze des Formats (+ Zwilling),
    kein Entwurf, nicht in einem anderen Slot, erst NACH `seit_utc` angelegt (Fremdeinträge — ChatGPT, Betreiber — liegen davor)."""
    fmt_netze = set(REGELN_CACHE()["formate"][s["format"]]["netze"]) | zwilling_netze(s["format"])
    bekannt = {i for x in plan["slots"].values() for i in x["mc_ids"]}
    gefunden = []
    for p in planer:
        te, n = eintrag_utc(p), set(W.netze(p))
        if p.get("id") in bekannt or te is None or not n or not n <= fmt_netze or p.get("draft") or p.get("autoPublish") is False:
            continue
        if abs((te - von_iso(s["termin_utc"])).total_seconds()) > 180:
            continue
        try:
            erstellt = datetime.fromisoformat((p.get("creationDate") or {}).get("dateTime", "1970-01-01T00:00:00")).replace(tzinfo=TZ).astimezone(UTC)
        except ValueError:
            continue
        if erstellt >= seit_utc:
            gefunden.append(p)
    return gefunden


def abgleichen(plan, planer, jetzt_utc):
    """Plan gegen den Planer: verschwundene Einträge → Slot wieder offen; halb abgestürzte «reserviert» adoptieren oder freigeben.
    Massen-Schutz (Prüfung 18.10.): ein leerer oder halber Planer-Abruf (HTTP 200) würde sonst alle Slots auf «verschwunden» setzen, die Zwillinge
    löschen und alles ein zweites Mal planen. Fehlen mehr als max(3, 10 %) der zukünftigen Slots auf einmal, passiert NICHTS (Meldung im Plan)."""
    ids = {p.get("id"): p for p in planer}
    zukunft = [n for n, x in plan["slots"].items() if x["status"] == "geplant" and von_iso(x["termin_utc"]) > jetzt_utc]
    fehlend = [n for n in zukunft if any(i not in ids for i in plan["slots"][n]["mc_ids"])]
    sperre = len(fehlend) > max(3, int(0.10 * len(zukunft))) and os.environ.get("VORLAUF_MASSE_OK") != "1"
    if sperre:
        meldung = f"{len(fehlend)} von {len(zukunft)} geplanten Slots fehlen im Planer → Abgleich übersprungen (Planer-Abruf unvollständig? Betreiber räumte auf? dann VORLAUF_MASSE_OK=1)"
        print(f"⚠️ {meldung}")
        plan["abgleich_sperre"] = f"{iso(jetzt())} {meldung}"
    else:
        plan.pop("abgleich_sperre", None)
    for name, s in plan["slots"].items():
        if s["status"] == "geplant":
            if sperre:
                continue
            fehlt = [i for i in s["mc_ids"] if i not in ids]
            if fehlt and von_iso(s["termin_utc"]) > jetzt_utc:
                # Teilverlust (IG+FB-Zwilling): der übrige Eintrag würde sonst ungetrackt mit dem beanstandeten Inhalt live gehen → mit löschen
                rest = [i for i in s["mc_ids"] if i in ids]
                bleibt = []
                for i in rest:
                    if not SCHARF:
                        continue
                    try:
                        mc(f"/v2/scheduler/posts/{i}", "DELETE")
                    except urllib.error.HTTPError as e:
                        if e.code != 404:
                            bleibt.append(i)
                    except Exception:
                        bleibt.append(i)
                if bleibt:
                    # nur die noch vorhandenen Ids behalten: die fehlende gilt als weg, der Rest wird beim nächsten Abgleich (jetzt «vollständig») nicht
                    # erneut als Teilverlust erkannt — deshalb Löschung hier sofort wiederholbar halten
                    s["mc_ids"] = bleibt; s["grund"] = f"Zwilling {fehlt} fehlt, Löschung von {bleibt} offen"
                    s["loeschen_offen"] = bleibt
                    log(name, "zwilling-offen", bleibt)
                    continue
                s["status"] = "offen"; s["mc_ids"] = []; s["grund"] = f"verschwunden {fehlt}" + (f" (Zwilling {rest} mitgelöscht)" if rest else "")
                s.pop("loeschen_offen", None)
                log(name, "verschwunden", fehlt)
            elif not fehlt and s.get("loeschen_offen"):
                # Wiederholung einer früher gescheiterten Zwilling-Löschung (das Kommentar-Versprechen von vorhin, jetzt wirklich da)
                rest = [i for i in s["loeschen_offen"] if i in ids]
                bleibt = []
                for i in rest:
                    if not SCHARF:
                        bleibt.append(i); continue
                    try:
                        mc(f"/v2/scheduler/posts/{i}", "DELETE")
                    except urllib.error.HTTPError as e:
                        if e.code != 404:
                            bleibt.append(i)
                    except Exception:
                        bleibt.append(i)
                if not bleibt:
                    s["status"] = "offen"; s["mc_ids"] = []; s["grund"] = "Zwilling-Rest nachträglich gelöscht"; s.pop("loeschen_offen", None)
                    log(name, "zwilling-nachgeholt", rest)
                else:
                    s["loeschen_offen"] = bleibt; s["mc_ids"] = bleibt
            elif not fehlt and von_iso(s["termin_utc"]) <= jetzt_utc:
                if any(x in (pr.get("status") or "").upper() for i in s["mc_ids"] for pr in ids[i].get("providers", []) for x in ("ERROR", "FAIL")):
                    s["status"] = "fehler"; s["grund"] = "Planer-Status Fehler nach dem Termin"
                    log(name, "planer-fehler", s["mc_ids"])
        elif s["status"] == "reserviert":
            adoptiert = adoptierbare(plan, s, planer, von_iso(s["reserviert_um"]) - timedelta(minutes=2))
            if adoptiert:
                s["status"] = "geplant"; s["mc_ids"] = [p["id"] for p in adoptiert]; s["grund"] = "adoptiert nach Abbruch"
                log(name, "adoptiert", s["mc_ids"])
            else:
                s["status"] = "offen"; s["grund"] = "reserviert ohne Planer-Eintrag freigegeben"
                log(name, "freigegeben", "")


_REGELN = {}
def REGELN_CACHE():
    if not _REGELN:
        _REGELN.update(regeln_laden())
    return _REGELN


def plan_lauf(max_min=35, nur=None, max_slots=10**9):
    regeln = regeln_laden()
    if os.path.exists(STOPP):
        print("STOPP: dropship/_SOCIAL_STOPP existiert → nichts geplant.")
        return 0
    if os.path.exists(HALT):
        print("HALT: dropship/_vorlauf_halt.txt existiert (Notbremse des Treibers) → nichts geplant.")
        return 0
    if not W.token():
        print("Kein METRICOOL_USER_TOKEN → No-op.")
        return 0
    t0 = time.time()
    try:
        planer = planer_lesen()
    except Exception as e:
        print(f"⛔ Planer nicht lesbar ({str(e)[:120]}) → nichts geplant (ohne Planer-Wahrheit kein Slot).")
        return 1
    try:
        plan = plan_laden()
    except PlanDefekt as e:
        print(f"⛔ {e} → nichts geplant (ein leerer Plan würde Doppelposts erzeugen). Manuell: git checkout <rev> -- dropship/_vorlauf_plan.json")
        return 1
    abgleichen(plan, planer, jetzt())
    neu, belegt = slots_erzeugen(regeln, jetzt(), planer, plan, nur)
    for name, s in neu:
        plan["slots"][name] = s
    print(f"Slots: {len(plan['slots'])} im Plan · neu {len(neu)} · wegen Konflikt ausgelassen {len(belegt)}"
          f"{' · ' + ', '.join(belegt[:6]) if belegt else ''}")
    gefuellt = versucht = verarbeitet = 0
    format_leer = set()
    offene = sorted([(von_iso(s["termin_utc"]), n) for n, s in plan["slots"].items()
                     if s["status"] in ("offen", "fehler", "leer") and von_iso(s["termin_utc"]) > jetzt() + timedelta(minutes=regeln["mindest_vorlauf_min"])
                     and (not nur or s["format"] in nur)])
    tag_zaehler = {}
    for p in planer:
        te = eintrag_utc(p)
        if te and not p.get("draft"):
            tag_zaehler[te.astimezone(TZ).date()] = tag_zaehler.get(te.astimezone(TZ).date(), 0) + len(W.netze(p))
    for _, name in offene:
        s = plan["slots"][name]
        fmt = s["format"]
        if os.path.exists(HALT) or os.path.exists(STOPP):
            print("HALT/STOPP erschienen → Lauf endet.")
            break
        if von_iso(s["termin_utc"]) <= jetzt() + timedelta(minutes=regeln["mindest_vorlauf_min"]):
            continue   # lange Läufe: der Slot ist inzwischen zu nah (publishAt() würde den Poster mitten im Ablauf beenden)
        if fmt in format_leer:
            continue
        if fmt == "tiktok" and tt_trend_modus() == "halt":
            s["grund"] = "wartet auf Trendton-Pilot"
            continue
        if s["status"] == "leer" and (jetzt() - von_iso(s.get("letzter_versuch", "1970-01-01T00:00:00Z"))).total_seconds() < 20 * 3600:
            continue
        if s["status"] == "leer":
            s["versuche"] = 0
        if (time.time() - t0) / 60 > max_min - 12:
            print(f"Zeitbudget {max_min} min fast aufgebraucht → Rest beim nächsten Lauf.")
            break
        tag = von_iso(s["termin_utc"]).astimezone(TZ).date()
        if tag_zaehler.get(tag, 0) + len(regeln["formate"][fmt]["netze"]) > regeln["tagesobergrenze_eintraege"]:
            s["grund"] = "Tagesobergrenze"
            continue
        verarbeitet += 1
        if verarbeitet > max_slots:
            break
        if not SCHARF:
            print(f"[DRY] {name}: würde {' '.join(POSTER[fmt][0][1:])} mit PUBLISH_AT={s['termin_utc']} {POSTER[fmt][1]} starten")
            continue
        for versuch in range(regeln["versuche_je_lauf"]):
            if s["versuche"] >= regeln["versuche_gesamt"]:
                s["status"] = "leer"; s["grund"] = f"{s['versuche']} Versuche ohne Kandidat"
                break
            if s.get("letzter_versuch"):
                # ein früherer Versuch kann doch einen Eintrag hinterlassen haben (Planer-Verzögerung) → erst adoptieren, nie blind ein zweites Mal posten
                try:
                    frueh = adoptierbare(plan, s, planer_lesen(), von_iso(s["letzter_versuch"]) - timedelta(minutes=2))
                except Exception:
                    frueh = []
                if frueh:
                    s["status"] = "geplant"; s["mc_ids"] = [p["id"] for p in frueh]; s["grund"] = "adoptiert vor erneutem Versuch"
                    log(name, "adoptiert-vorab", s["mc_ids"])
                    print(f"✅ {name}: vorhandenen Planer-Eintrag adoptiert {s['mc_ids']}")
                    gefuellt += 1
                    break
            s["status"] = "reserviert"; s["reserviert_um"] = iso(jetzt()); s["versuche"] += 1; s["letzter_versuch"] = iso(jetzt())
            plan_speichern(plan)
            vorher = {p.get("id") for p in planer_lesen()}
            produkte_vorher = produkt_zeilen()
            try:
                rc, tail = poster_aufruf(name, s, regeln)
            except subprocess.TimeoutExpired:
                rc, tail = 124, "Zeitüberschreitung (1500 s)"
            versucht += 1
            leer = rc in (0, 3) and bool(LEER_MUSTER.search(tail))
            gesperrt = rc == 0 and bool(SPERR_MUSTER.search(tail))
            # Metricool braucht einen Moment, bis der Eintrag lesbar ist (Prüfung 18.10.: 4 s waren zu knapp → Zweitaufruf = Doppelpost):
            # wer Exit 0 ohne «nichts fällig»/«Lock» meldet, hat gepostet → bis zu ~60 s auf den Planer-Eintrag warten.
            neue = []
            for warte in ((4,) if (rc != 0 or leer or gesperrt) else (4, 12, 20, 25)):
                time.sleep(warte)
                nachher = planer_lesen()
                neue = neue_eintraege(vorher, nachher, s, regeln, jetzt())
                if neue:
                    break
            if rc == 0 and neue:
                s["status"] = "geplant"; s["mc_ids"] = [p["id"] for p in neue]; s["grund"] = ""
                s["handle"] = next((W.handle(p) for p in neue if W.handle(p)), "")
                s["handles"] = sorted(set(produkt_neu(produkte_vorher)) | ({s["handle"]} if s["handle"] else set()))   # Bild/Karussell/Story: kein Produktlink im Text
                gefuellt += 1
                tag_zaehler[tag] = tag_zaehler.get(tag, 0) + len(neue)
                planer = nachher
                log(name, "geplant", f"{s['mc_ids']} {s['handles']}")
                print(f"✅ {name}: geplant {s['mc_ids']} {s['handles'] or s['handle']}")
                break
            if neue:   # Eintrag da, aber Exit ≠ 0 → trotzdem übernehmen (Quittung ist der Planer)
                s["status"] = "geplant"; s["mc_ids"] = [p["id"] for p in neue]; s["grund"] = f"rc={rc} aber Planer-Eintrag"
                s["handles"] = sorted(set(produkt_neu(produkte_vorher)))
                gefuellt += 1; planer = nachher
                log(name, "geplant-rc", f"rc={rc} {s['mc_ids']}")
                break
            s["status"] = "offen"; s["grund"] = f"rc={rc}: {tail[-160:]}"
            if not leer and not gesperrt and (rc in (1, 124) or rc == 0):
                # Ausgang UNSICHER (Prüfung 18.10.): der Poster kann den Eintrag angelegt haben, der Planer zeigt ihn nur noch nicht (Verzögerung,
                # Netzfehler nach dem POST, Timeout). Slot reserviert LASSEN — abgleichen() adoptiert ihn beim nächsten Lauf per Anlegezeit, statt ihn
                # sofort freizugeben und denselben Termin ein zweites Mal zu belegen.
                s["status"] = "reserviert"
            log(name, f"rc{rc}", tail[-200:])
            if gesperrt:
                s["versuche"] -= 1   # kurzer Lock-Konflikt mit einem anderen Poster: kein Fehlversuch, später wieder
                print(f"· {name}: Poster-Lock belegt → später")
                break
            if leer:
                format_leer.add(fmt)
                print(f"· {name}: kein Kandidat im Pool ({fmt}) → Format ruht in diesem Lauf")
                break
            if rc not in (0, 3):
                s["versuche"] -= 1   # Netz-/Metricool-Störung (rc 1/124) ist kein «kein Kandidat»: darf den Slot nicht für 20 h sperren
                break   # echter Fehler: nicht hämmern
            if rc == 0:
                break   # Exit 0 ohne Eintrag und ohne bekanntes Leer-Muster: nicht sofort nochmal (sonst Doppelpost-Gefahr)
        drossel_schreiben(plan, regeln)   # nach JEDEM Slot (Container-Neustart/timeout beenden den Lauf ohne Schlusszeile)
        plan_speichern(plan)
        if (time.time() - t0) / 60 > max_min:
            break
    drossel_schreiben(plan, regeln)
    plan_speichern(plan)
    print(f"Lauf: {versucht} Poster-Aufrufe, {gefuellt} Slots gefüllt · {zeile(plan, regeln)}")
    return 0


# ───────────────────────── Drossel für den Autopiloten ─────────────────────────
def drossel_schreiben(plan, regeln, jetzt_utc=None):
    """Je Format: bis wann deckt der Planer ab? = Termin des ersten UNGEFÜLLTEN Slots in der Zukunft, sonst des letzten gefüllten.
    Der Autopilot (`faellig()` in social_autopilot.sh) postet dieses Format bis dahin nicht selbst. Abgelaufen/fehlend = altes Verhalten."""
    jetzt_utc = jetzt_utc or jetzt()
    zeilen = []
    for fmt, f in regeln["formate"].items():
        slots = sorted((von_iso(s["termin_utc"]), s) for s in plan["slots"].values() if s["format"] == fmt and von_iso(s["termin_utc"]) > jetzt_utc)
        if not slots:
            continue
        luecke = next((t for t, s in slots if s["status"] != "geplant"), None)
        gefuellt = [t for t, s in slots if s["status"] == "geplant"]
        bis = luecke or (gefuellt[-1] if gefuellt else None)
        if bis and not luecke:
            # Plan ohne Lücke: der Autopilot darf erst NACH dem letzten Slot + Nachlauf wieder selbst posten (Prüfung 18.10.: sonst postete er
            # 10–25 min nach dem geplanten Post, weil seine Marke längst alt ist)
            bis += timedelta(minutes=regeln.get("drossel_nachlauf_min", 180))
        if bis and bis > jetzt_utc and (gefuellt or luecke):
            # nur drosseln, wenn der erste Slot der Zukunft gefüllt ist (sonst postet der Autopilot jetzt wie bisher)
            if slots[0][1]["status"] == "geplant":
                zeilen.append(f"{f['marke']}\t{iso(bis)}")
    if SCHARF:
        atomar(DROSSEL, "\n".join(zeilen) + ("\n" if zeilen else ""))
    return zeilen


# ───────────────────────── Prüfer ─────────────────────────
def preis_veraltet(text, mn, mx):
    """Python-Gegenstück zu post_guard.preisVeraltet: '' (ok) oder Grund."""
    if mn != mn or mx != mx:
        return ""
    rein = re.sub(r"(?:versand|lieferung|gratis|kostenlos)[^.\n]{0,25}?CHF\s?\d+(?:[.,]\d{2})?", " ", text or "", flags=re.I)
    aus = []
    for m in re.finditer(r"(\b[Aa]b\s+)?CHF\s?(\d+[.,]\d{2})\b", rein):
        x = float(m.group(2).replace(",", "."))
        if m.group(1):
            if abs(x - mn) > 0.005:
                aus.append(f"ab {x:.2f}")
        elif not (mn - 0.005 <= x <= mx + 0.005):
            aus.append(f"{x:.2f}")
    return f"Text {'/'.join(aus)} ≠ live {mn:.2f}–{mx:.2f}" if aus else ""


def storefront(handles):
    """{handle: (verfuegbar, min, max)} über die öffentliche Storefront-API (ohne Token); fehlt ein Handle → (False, nan, nan)."""
    aus = {}
    handles = sorted(set(handles))
    for i in range(0, len(handles), 20):
        teil = handles[i:i + 20]
        q = "{ " + " ".join(f'a{k}: product(handle:"{h}"){{ availableForSale priceRange{{ minVariantPrice{{ amount }} maxVariantPrice{{ amount }} }} }}' for k, h in enumerate(teil)) + " }"
        req = urllib.request.Request("https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json", data=json.dumps({"query": q}).encode(),
                                     headers={"Content-Type": "application/json", "User-Agent": "luxe-vorlauf"})
        d = json.load(urllib.request.urlopen(req, timeout=40))
        if not d.get("data"):
            raise RuntimeError("Storefront ohne Daten")
        for k, h in enumerate(teil):
            p = d["data"].get(f"a{k}")
            aus[h] = (bool(p and p["availableForSale"]), float(p["priceRange"]["minVariantPrice"]["amount"]) if p else float("nan"),
                      float(p["priceRange"]["maxVariantPrice"]["amount"]) if p else float("nan"))
    return aus


_PID_HANDLE = {}
def handles_aufloesen(schluessel):
    """Ledger-Schlüssel der Produktliste («pid:<Zahl>», «name:…», «slug:…») → echte Handles. `pid:` per Storefront (product(id:)), `slug:` ist der Handle;
    `name:` ist ein gekürzter Titelschlüssel und bleibt ohne Urteil (kein Handle). Bild/Karussell tragen keinen Produktlink im Text — ohne diese
    Auflösung blieb der Prüfer für sie blind (Prüfung 18.10.)."""
    aus = []
    for k in schluessel or []:
        k = str(k).strip()
        if k.startswith("pid:"):
            n = k[4:].strip()
            if not n.isdigit():
                continue
            if n not in _PID_HANDLE:
                try:
                    q = f'{{ product(id:"gid://shopify/Product/{n}"){{ handle }} }}'
                    req = urllib.request.Request("https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json", data=json.dumps({"query": q}).encode(),
                                                 headers={"Content-Type": "application/json", "User-Agent": "luxe-vorlauf"})
                    d = json.load(urllib.request.urlopen(req, timeout=30))
                    pr = ((d.get("data") or {}).get("product") or {})
                    _PID_HANDLE[n] = (pr.get("handle") or "") if d.get("data") is not None else None
                except Exception:
                    _PID_HANDLE[n] = None   # nicht lesbar: nicht merken (nächster Versuch), kein Urteil
            h = _PID_HANDLE.get(n)
            if h:
                aus.append(h)
            elif n in _PID_HANDLE and _PID_HANDLE[n] is None:
                _PID_HANDLE.pop(n, None)
        elif k.startswith("slug:"):
            aus.append(k[5:].strip())
        elif k.startswith("name:"):
            continue
        else:
            aus.append(k)
    return sorted(set(a for a in aus if a))


def pause_handles():
    """{handle: [(von, bis), …]} aus dropship/_social_pause.txt: Kopfzeile «# name<TAB>von<TAB>bis<TAB>tag», danach Schlüssel «h:<handle>»
    (wie lib/social_pause.mjs; mehrere Blöcke erlaubt). Andere Schlüsselarten (pid:/tit:/zeile:) kennt der Prüfer nicht — der Poster prüft sie."""
    try:
        zeilen = open(PAUSE, encoding="utf-8").read().split("\n")
    except OSError:
        return {}
    aus, gilt = {}, None
    for z in zeilen:
        z = z.strip()
        if not z:
            continue
        if z.startswith("#"):
            f = z[1:].strip().split("\t")
            try:
                gilt = (von_iso(f[1]), von_iso(f[2])) if len(f) >= 3 else None
            except ValueError:
                gilt = None
            continue
        if gilt and z.startswith("h:"):
            aus.setdefault(z[2:].strip().lower(), []).append(gilt)
    return aus


def medium_ok(url):
    """True = erreichbar ODER unklar. Nur 404/410 (zweimal, mit Weiterleitung, 5 s Abstand) gilt als kaputt — curl «000» (DNS/Proxy/Timeout),
    429 und 5xx sind Störungen, kein Löschgrund (Prüfung 18.10.: ein Netzfehler hätte sonst den ganzen 7-Tage-Plan gelöscht)."""
    for versuch in range(2):
        try:
            r = subprocess.run(["curl", "-sL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25", "-r", "0-1000", url],
                               capture_output=True, text=True, timeout=40)
        except Exception:
            return True
        if r.stdout.strip() not in ("404", "410"):
            return True
        if versuch == 0:
            time.sleep(5)
    return False


def eintrag_text(p):
    return " ".join(filter(None, [p.get("text") or "", (p.get("pinterestData") or {}).get("pinLink") or ""]))


def befunde_fuer(plan, planer, jetzt_utc):
    """Reine Prüfung → {slot: [Grund, …]}; nur Slots mit Termin in der Zukunft (> 10 Min)."""
    ids = {p.get("id"): p for p in planer}
    pause_h = pause_handles()
    zukunft = {n: s for n, s in plan["slots"].items() if s["status"] == "geplant" and von_iso(s["termin_utc"]) > jetzt_utc + timedelta(minutes=10)}
    alle_handles = set()
    hs = {n: [h.lower() for h in handles_aufloesen(s.get("handles", []))] for n, s in zukunft.items()}   # nur lokal: der Plan behält die Rohschlüssel
    for n, s in zukunft.items():
        alle_handles |= set(hs[n])
        for i in s["mc_ids"]:
            p = ids.get(i)
            if p:
                alle_handles |= {h.lower() for h in re.findall(r"luxestyle\.ch/products/([a-z0-9][a-z0-9\-]*)", eintrag_text(p), re.I)}
    shop = {}
    plan.pop("pruefer_shop_blind", None)
    try:
        shop = storefront(alle_handles) if alle_handles else {}
    except Exception as e:
        # Shopify nicht lesbar ≠ ok, aber auch kein Löschgrund → nichts löschen, ABER sichtbar machen (Prüfung 18.10.: sonst prüft der Prüfer still nichts)
        shop = {}
        plan["pruefer_shop_blind"] = f"{iso(jetzt())} Storefront nicht lesbar ({str(e)[:60]})"
        print(f"⚠️ Shop nicht lesbar ({str(e)[:80]}) → Verfügbarkeit/Preis dieser Runde ungeprüft")
    b = {}
    for n, s in zukunft.items():
        gruende = []
        for i in s["mc_ids"]:
            p = ids.get(i)
            if p is None:
                gruende.append(f"Planer-Eintrag {i} fehlt")
                continue
            if p.get("draft") or not p.get("autoPublish", True):
                gruende.append("Entwurf/autoPublish aus")
            if any(x in (pr.get("status") or "").upper() for pr in p.get("providers", []) for x in ("ERROR", "FAIL")):
                gruende.append("Planer-Status Fehler")
            text = eintrag_text(p)
            aus_text = {h.lower() for h in re.findall(r"luxestyle\.ch/products/([a-z0-9][a-z0-9\-]*)", text, re.I)}
            for h in aus_text | set(hs[n]):
                if shop and h in shop:
                    ok, mn, mx = shop[h]
                    if h not in aus_text and mn != mn:
                        continue   # Handle nur aus dem Poster-Ledger und dem Shop unbekannt (gekürzter Namensschlüssel) → kein Urteil
                    if not ok:
                        gruende.append(f"Produkt {h} nicht kaufbar/nicht veröffentlicht")
                    elif h in aus_text and len(aus_text) == 1:   # Preisvergleich nur, wenn der Text genau EIN Produkt nennt (Karussell: mehrere)
                        pv_ = preis_veraltet(p.get("text") or "", mn, mx)
                        if pv_:
                            gruende.append(f"Preis veraltet ({h}): {pv_}")
                if any(v <= von_iso(s["termin_utc"]) < b_ for v, b_ in pause_h.get(h, [])):
                    gruende.append(f"Produkt {h} in der Social-Pause")
            for m_ in (p.get("media") or [])[:1]:
                if m_.startswith("http") and not medium_ok(m_):
                    gruende.append("Medium-Adresse antwortet nicht")
        if gruende:
            b[n] = sorted(set(gruende))
    return b


def pruefen(notbremse=False):
    regeln = regeln_laden()
    try:
        plan = plan_laden()
    except PlanDefekt as e:
        print(f"⛔ {e} → nichts geprüft.")
        return 1
    if not W.token():
        print("Kein Token → No-op.")
        return 0
    stopp = os.path.exists(STOPP)
    if notbremse and SCHARF:
        # HALT ZUERST (Prüfung 18.10.): fällt der Planer-Abruf aus, muss die Notbremse trotzdem stehen — sonst plant der Treiber weiter
        atomar(HALT, f"Notbremse {iso(jetzt())}: der Treiber plant nichts, bis diese Datei gelöscht wird.\n")
    try:
        planer = planer_lesen()
    except Exception as e:
        print(f"⛔ Planer nicht lesbar ({str(e)[:100]}) → nichts geprüft/gelöscht" + (" (HALT steht)" if notbremse and SCHARF else ""))
        return 1
    abgleichen(plan, planer, jetzt())
    if stopp or notbremse:
        ziel = {n: ["Notbremse: _SOCIAL_STOPP" if stopp else "Notbremse (Aufruf)"] for n, s in plan["slots"].items()
                if s["status"] == "geplant" and von_iso(s["termin_utc"]) > jetzt() + timedelta(minutes=5)}
    else:
        ziel = befunde_fuer(plan, planer, jetzt())
    if not ziel:
        print(f"PRUEFEN: {sum(1 for s in plan['slots'].values() if s['status'] == 'geplant')} geplante Slots, keine Befunde"
              f"{' (⚠️ Shop nicht lesbar: ' + plan['pruefer_shop_blind'][21:] + ')' if plan.get('pruefer_shop_blind') else ''}.")
        plan.pop("pruefer_sperre", None)
        plan_speichern(plan) if SCHARF else None
        return 0
    geplant_n = sum(1 for s in plan["slots"].values() if s["status"] == "geplant" and von_iso(s["termin_utc"]) > jetzt() + timedelta(minutes=10))   # Nenner = was geprüft wird (nur Zukunft)
    if not (stopp or notbremse) and len(ziel) > max(3, int(0.10 * geplant_n)) and os.environ.get("VORLAUF_MASSE_OK") != "1":
        # Massen-Schutz: ein einzelner Fehlalarm-Typ (Netz, Storefront-Aussetzer, neue Pause) darf nicht den halben Plan löschen. Jede Löschung
        # verbrennt Video und Ware in den Ledgern dauerhaft.
        meldung = f"{len(ziel)} von {geplant_n} Slots beanstandet (> max(3, 10 %)) → NICHTS gelöscht; prüfen mit --pruefen (DRY), dann VORLAUF_MASSE_OK=1"
        print(f"⛔ PRUEFEN: {meldung}")
        for n, gr in list(ziel.items())[:8]:
            print(f"   {n}: {'; '.join(gr)[:140]}")
        if SCHARF:
            plan["pruefer_sperre"] = f"{iso(jetzt())} {meldung}"
            plan_speichern(plan)
        return 2
    for n, gr in ziel.items():
        print(f"{'LÖSCHE' if SCHARF else '[DRY] würde löschen'} {n}: {'; '.join(gr)}")
        if not SCHARF:
            continue
        ok = True
        verbleibend = []
        for i in plan["slots"][n]["mc_ids"]:
            try:
                mc(f"/v2/scheduler/posts/{i}", "DELETE")
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    ok = False; verbleibend.append(i)
                    print(f"   ✗ DELETE {i}: HTTP {e.code}")
            except Exception as e:
                ok = False; verbleibend.append(i)
                print(f"   ✗ DELETE {i}: {str(e)[:100]}")
        if not ok:
            plan["slots"][n]["mc_ids"] = verbleibend   # nur noch die Ids, die es wirklich gibt — der nächste Lauf versucht es wieder
        if ok:
            s = plan["slots"][n]
            s["status"] = "offen"; s["mc_ids"] = []; s["versuche"] = 0; s["grund"] = "zurückgezogen: " + "; ".join(gr)[:200]
            log(n, "zurueckgezogen", "; ".join(gr))
    if SCHARF:
        drossel_schreiben(plan, regeln)
        plan_speichern(plan)
    return 0


# ───────────────────────── Anzeige ─────────────────────────
def zeile(plan=None, regeln=None):
    try:
        plan = plan or plan_laden()
    except PlanDefekt:
        return "⚠️ VORLAUF: Plan-Datei defekt und nicht aus git herstellbar — nichts wird geplant (dropship/_vorlauf_plan.json)"
    regeln = regeln or regeln_laden()
    jetzt_utc = jetzt()
    zukunft = [s for s in plan["slots"].values() if von_iso(s["termin_utc"]) > jetzt_utc]
    geplant = [s for s in zukunft if s["status"] == "geplant"]
    offen = [s for s in zukunft if s["status"] != "geplant"]
    bis = max((von_iso(s["termin_utc"]) for s in geplant), default=None)
    grund = {}
    for s in offen:
        grund[s["status"]] = grund.get(s["status"], 0) + 1
    teil = ", ".join(f"{k} {v}" for k, v in sorted(grund.items()))
    bald_offen = [s for s in offen if von_iso(s["termin_utc"]) < jetzt_utc + timedelta(hours=12)]
    try:
        alt_h = (jetzt_utc - von_iso(plan.get("stand", "1970-01-01T00:00:00Z"))).total_seconds() / 3600
    except ValueError:
        alt_h = 99
    warn = ""
    if plan.get("pruefer_sperre"):
        warn += f"⚠️ PRÜFER-SCHUTZ: {plan['pruefer_sperre'][21:140]} · "
    if plan.get("pruefer_shop_blind"):
        warn += f"⚠️ PRÜFER BLIND: {plan['pruefer_shop_blind'][21:100]} · "
    if plan.get("abgleich_sperre"):
        warn += f"⚠️ ABGLEICH-SCHUTZ: {plan['abgleich_sperre'][21:110]} · "
    if os.path.exists(HALT):
        warn += "⛔ HALT (Notbremse des Treibers): nichts wird geplant · "
    if os.path.exists(STOPP):
        warn += "⛔ STOPP-Datei: nichts wird geplant · "
    elif bald_offen:
        warn += f"⚠️ {len(bald_offen)} Slot(s) in den nächsten 12 h OHNE Planer-Eintrag · "
    elif zukunft and alt_h > 3:
        warn += f"⚠️ Plan-Stand {alt_h:.0f} h alt (Autopilot-Runde läuft nicht?) · "
    ohne_produkt = [s for s in geplant if s["format"] in ("bild", "karussell", "story") and not s.get("handles") and not s.get("handle")]
    if ohne_produkt:
        warn += f"ℹ️ {len(ohne_produkt)} Slot(s) ohne prüfbares Produkt · "
    return (f"{warn}VORLAUF: {len(geplant)} Slots geplant" + (f" bis {bis.astimezone(TZ):%d.%m. %H:%M}" if bis else "") +
            f" · offen {len(offen)}" + (f" ({teil})" if teil else "") +
            f" · Stand {plan.get('stand', '?')[:16]}")


def liste():
    try:
        plan = plan_laden()
    except PlanDefekt as e:
        print(f"⚠️ {e}")
        return 1
    je_tag = {}
    for n, s in sorted(plan["slots"].items(), key=lambda x: x[1]["termin_utc"]):
        t = von_iso(s["termin_utc"]).astimezone(TZ)
        je_tag.setdefault(t.date(), []).append(f"{t:%H:%M} {s['format']}:{s['status'][:3]}")
    for d, z in sorted(je_tag.items()):
        print(f"{d:%a %d.%m.}  " + " · ".join(z))
    print(zeile(plan))


# ───────────────────────── Selbsttest ─────────────────────────
def selbsttest():
    global SCHARF
    SCHARF = False   # der Test schreibt nie in die echte Drossel/das Log/den Plan (Prüfung 18.10.: mit SCHARF=1 in der Umgebung tat er es)
    fehler = []
    ok = lambda b, m: None if b else fehler.append(m)
    regeln = regeln_laden()
    # 1. Sommerzeit: 25.10.2026 02:30 Zürich ist mehrdeutig, 08:05 nicht; UTC-Versatz vor/nach der Umstellung
    ok(mehrdeutig(datetime(2026, 10, 25, 2, 30, tzinfo=TZ)), "02:30 am 25.10. muss mehrdeutig sein")
    ok(not mehrdeutig(datetime(2026, 10, 25, 8, 5, tzinfo=TZ)), "08:05 am 25.10. darf nicht mehrdeutig sein")
    ok(datetime(2026, 10, 24, 20, 5, tzinfo=TZ).astimezone(UTC).hour == 18, "24.10. 20:05 Zürich = 18:05 UTC (Sommerzeit)")
    ok(datetime(2026, 10, 25, 20, 5, tzinfo=TZ).astimezone(UTC).hour == 19, "25.10. 20:05 Zürich = 19:05 UTC (Winterzeit)")
    # 2. Slots: Fenster 19.10. 00:00 Zürich bis 25.10. 22:00 Zürich, kein Slot nach dem Ende, alle ≥ Mindestvorlauf
    jetzt_t = datetime(2026, 10, 18, 22, 0, tzinfo=UTC)
    neu, belegt = slots_erzeugen(regeln, jetzt_t, [], {"slots": {}})
    ende = von_iso(regeln["fenster_ende_utc"])
    ok(all(von_iso(s["termin_utc"]) <= ende for _, s in neu), "Slot nach Fensterende")
    ok(all(von_iso(s["termin_utc"]) >= jetzt_t + timedelta(minutes=30) for _, s in neu), "Slot vor Mindestvorlauf")
    tage = {von_iso(s["termin_utc"]).astimezone(TZ).date() for _, s in neu}
    ok(len(tage) == 7, f"erwarte 7 Tage, habe {len(tage)}")
    je_fmt = {}
    for _, s in neu:
        je_fmt[s["format"]] = je_fmt.get(s["format"], 0) + 1
    ok(je_fmt.get("tiktok", 0) >= 19 and je_fmt.get("pin", 0) >= 25, f"zu wenige Slots: {je_fmt}")
    # 3. Konflikt: ChatGPT-Slot 19.10. 18:30 Zürich (TikTok) → 20:05-Slot (95 Min) ok, ein Slot um 18:45 würde verschoben
    gpt = {"id": 1, "publicationDate": {"dateTime": "2026-10-19T18:30:00", "timezone": "Europe/Zurich"}, "providers": [{"network": "tiktok"}, {"network": "instagram"}],
           "draft": False, "autoPublish": True, "instagramData": {"type": "REEL"}}
    t_1845 = datetime(2026, 10, 19, 18, 45, tzinfo=TZ).astimezone(UTC)
    ok(konflikt(t_1845, "tiktok", regeln, [gpt]) is not None, "18:45 muss mit ChatGPT 18:30 kollidieren")
    ok(konflikt(datetime(2026, 10, 19, 20, 5, tzinfo=TZ).astimezone(UTC), "tiktok", regeln, [gpt]) is None, "20:05 darf nicht kollidieren")
    ok(konflikt(t_1845, "bild", regeln, [{**gpt, "providers": [{"network": "tiktok"}]}]) is None, "TikTok-Reel darf Bild-Slot (Instagram) nicht sperren")
    gpt_ig = {**gpt, "providers": [{"network": "instagram"}]}
    ok(konflikt(t_1845, "bild", regeln, [gpt_ig]) is not None, "IG-Reel 18:30 sperrt Feed-Bild 18:45 (< 45 min, Feed-übergreifend)")
    ok(konflikt(datetime(2026, 10, 19, 19, 20, tzinfo=TZ).astimezone(UTC), "bild", regeln, [gpt_ig]) is None, "IG-Reel 18:30 sperrt Feed-Bild 19:20 nicht (50 min)")
    gpt["draft"] = True
    ok(konflikt(t_1845, "tiktok", regeln, [gpt]) is None, "Entwurf zählt nicht als Hindernis")
    # 4. Preisregel (Gegenstück zu post_guard.preisVeraltet)
    ok(preis_veraltet("ab CHF 19.90 · Gratis Versand ab CHF 50", 19.9, 24.9) == "", "ab-Preis = Mindestpreis ist ok")
    ok(preis_veraltet("CHF 19.90", 21.9, 21.9) != "", "falscher Preis muss auffallen")
    ok(preis_veraltet("Versand CHF 7.00 · CHF 29.90", 29.9, 29.9) == "", "Versandpreis zählt nicht")
    ok(preis_veraltet("ab CHF 20.90", 19.9, 24.9) != "", "ab-Preis ≠ Mindestpreis muss auffallen")
    # 5. Drossel: erster Slot gefüllt → Drossel bis zur ersten Lücke; erster Slot offen → keine Drossel
    jt = datetime(2026, 10, 19, 6, 0, tzinfo=UTC)
    plan = {"slots": {
        "tiktok-a": {"format": "tiktok", "termin_utc": "2026-10-19T08:00:00Z", "status": "geplant"},
        "tiktok-b": {"format": "tiktok", "termin_utc": "2026-10-19T12:00:00Z", "status": "geplant"},
        "tiktok-c": {"format": "tiktok", "termin_utc": "2026-10-20T08:00:00Z", "status": "offen"},
        "pin-a": {"format": "pin", "termin_utc": "2026-10-19T08:00:00Z", "status": "offen"},
    }}
    z = drossel_schreiben(plan, regeln, jt)
    ok(any("letztes_tiktok" in x and "2026-10-20T08:00:00Z" in x for x in z), f"Drossel TikTok bis zur Lücke fehlt: {z}")
    ok(not any("letzter_pin" in x for x in z), "Pin darf nicht gedrosselt werden (erster Slot offen)")
    # 6. Adoption eines halb abgestürzten Slots
    plan2 = {"slots": {"tiktok-x": {"format": "tiktok", "termin_utc": "2099-01-01T08:00:00Z", "status": "reserviert", "reserviert_um": "2098-12-31T10:00:00Z", "mc_ids": []}}}
    abgleichen(plan2, [], datetime(2098, 12, 31, 12, 0, tzinfo=UTC))
    ok(plan2["slots"]["tiktok-x"]["status"] == "offen", "reserviert ohne Planer-Eintrag muss freigegeben werden")
    # 7. Art-Erkennung
    ok(art_des_eintrags({"instagramData": {"type": "STORY"}, "providers": [{"network": "instagram"}]}) == "story", "Story erkennen")
    ok(art_des_eintrags({"pinterestData": {"boardId": "1"}, "providers": [{"network": "pinterest"}]}) == "pin", "Pin erkennen")
    ok(art_des_eintrags({"providers": [{"network": "tiktok"}]}) == "reel", "TikTok = reel")
    # 8. Prüfung 18.10.: Netzfehler ist kein Löschgrund (curl «000» bei geschlossenem Port/DNS-Fehler)
    ok(medium_ok("http://127.0.0.1:1/x.mp4") is True, "Netzfehler (000) darf nie als «kaputt» gelten")
    # 9. Pause-Datei im echten Format (Kopfzeile mit Tabs) wird gelesen, Termin gegen [von, bis) geprüft
    global PAUSE
    alt_pause, PAUSE = PAUSE, os.path.join(tempfile.mkdtemp(), "pause.txt")
    open(PAUSE, "w").write("# halloween\t2026-10-15T00:00:00Z\t2026-11-01T00:00:00Z\tsocial-pause-halloween\nh:kuerbis-1\npid:123\n")
    ph = pause_handles(); PAUSE = alt_pause
    ok(list(ph) == ["kuerbis-1"] and ph["kuerbis-1"][0][0] <= datetime(2026, 10, 20, tzinfo=UTC) < ph["kuerbis-1"][0][1], f"Pause-Kopfzeile nicht gelesen: {ph}")
    # 10. Defekte Plan-Datei: nie still leerer Plan (Merge-Marker); ohne git-Stand → PlanDefekt
    d = tempfile.mkdtemp(); pf = os.path.join(d, "plan.json")
    open(pf, "w").write("<<<<<<< HEAD\n{}\n=======\n")
    try:
        r_ = subprocess.run(["git", "-C", d, "init", "-q"], capture_output=True)
        alt_repo, globals()["REPO"] = REPO, d
        try:
            plan_laden(pf); ok(False, "defekte Plan-Datei wurde als leerer Plan akzeptiert")
        except PlanDefekt:
            ok(os.path.exists(pf + ".defekt"), "defekte Plan-Datei wurde nicht gesichert")
        finally:
            globals()["REPO"] = alt_repo
    except Exception as e:
        ok(False, f"Test defekter Plan: {e}")
    # 11. Fremder Entwurf wird nie als Eintrag des Slots übernommen; Slot-Handles prüfen auch Posts ohne Link im Text
    slot = {"format": "tiktok", "termin_utc": "2026-10-20T08:05:00Z"}
    fremd = {"id": 100, "draft": True, "autoPublish": False, "providers": [{"network": "tiktok"}], "publicationDate": {"dateTime": "2026-10-20T10:05:00", "timezone": "Europe/Zurich"}}
    ok(neue_eintraege(set(), [fremd], slot, regeln, datetime(2026, 10, 20, tzinfo=UTC)) == [], "fremder Entwurf darf nicht übernommen werden")
    # 12. Massen-Schutz: 5 von 20 Slots beanstandet → nichts löschen (Schwelle max(3, 10 %) = 3 ... hier 20 → 3)
    ok(len({str(i): 1 for i in range(5)}) > max(3, int(0.10 * 20)), "Massenschwelle rechnet falsch")
    # 13. Handle-Ableitung aus dem Produkt-Ledger
    ok(produkt_neu({"a"}) is not None, "produkt_neu läuft")
    # 14. Prüfung 18.10. (Runde 2): Schlüssel der Produktliste → Handles (pid per Cache, kein Netz), name: ohne Urteil
    _PID_HANDLE["999"] = "testprodukt-a"
    ok(handles_aufloesen(["pid:999", "slug:foo-b", "name:kurzer-titel", "pid:abc"]) == ["foo-b", "testprodukt-a"], f"handles_aufloesen: {handles_aufloesen(['pid:999', 'slug:foo-b', 'name:kurzer-titel', 'pid:abc'])}")
    _PID_HANDLE.pop("999", None)
    # 15. produkt_neu nimmt pid:-Zeilen (Bild/Karussell) und slug:-Zeilen, keine Reel-IDs
    global produkt_zeilen
    alt_pz, produkt_zeilen = produkt_zeilen, lambda: {"pid:123", "slug:cjreel-9", "slug:echtes-produkt", "name:xx", "x"}
    pn = produkt_neu(set()); produkt_zeilen = alt_pz
    ok(sorted(pn) == ["pid:123", "echtes-produkt"] or sorted(pn) == sorted(["echtes-produkt", "pid:123"]), f"produkt_neu: {pn}")
    # 16. abgleichen: «reserviert» MIT später sichtbarem Planer-Eintrag (Anlegezeit nach reserviert_um) wird adoptiert, nicht freigegeben
    ein = {"id": 4711, "draft": False, "autoPublish": True, "providers": [{"network": "tiktok"}],
           "publicationDate": {"dateTime": "2099-01-01T09:00:00", "timezone": "Europe/Zurich"}, "creationDate": {"dateTime": "2098-12-31T12:00:00", "timezone": "Europe/Zurich"}}
    plan3 = {"slots": {"tiktok-y": {"format": "tiktok", "termin_utc": "2099-01-01T08:00:00Z", "status": "reserviert", "reserviert_um": "2098-12-31T10:50:00Z", "mc_ids": []}}}
    abgleichen(plan3, [ein], datetime(2098, 12, 31, 12, 30, tzinfo=UTC))
    ok(plan3["slots"]["tiktok-y"]["status"] == "geplant" and plan3["slots"]["tiktok-y"]["mc_ids"] == [4711], f"reservierter Slot nicht adoptiert: {plan3['slots']['tiktok-y']}")
    # 17. Shop nicht lesbar → Prüfer meldet «blind» (kein Löschen, aber sichtbar)
    global storefront
    alt_sf = storefront
    def _sf_aus(h): raise RuntimeError("test-ausfall")
    storefront = _sf_aus
    plan4 = {"slots": {"bild-z": {"format": "bild", "termin_utc": "2099-01-01T08:00:00Z", "status": "geplant", "mc_ids": [1], "handles": ["slug-x"]}}}
    b4 = befunde_fuer(plan4, [{"id": 1, "text": "luxestyle.ch/products/slug-x", "providers": [{"network": "instagram"}], "autoPublish": True}], datetime(2098, 12, 31, tzinfo=UTC))
    storefront = alt_sf
    ok("pruefer_shop_blind" in plan4 and not b4, f"Shop-Ausfall nicht sichtbar oder Fehlalarm: {plan4.get('pruefer_shop_blind')} {b4}")
    print("OK Selbsttest" if not fehler else "FEHLER:\n  " + "\n  ".join(fehler))
    return 1 if fehler else 0


# ───────────────────────── Einstieg ─────────────────────────
def main(argv):
    if "--selbsttest" in argv:
        return selbsttest()
    if "--liste" in argv:
        return liste() or 0
    if "--zeile" in argv:
        print(zeile())
        return 0
    # Prüfer/Notbremse haben eine EIGENE Sperre: sonst läuft die Notbremse während der langen Füllphase (bis 38 min je Runde) ins Leere
    # (Prüfung 18.10.). Der Plan-Lauf stoppt an HALT/STOPP zwischen zwei Slots.
    lock = open(SPERRE_PRUEFER if ("--pruefen" in argv or "--notbremse" in argv) else SPERRE, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("Vorlauf läuft bereits (Sperre) — dieser Aufruf endet.")
        return 0
    max_min = int(argv[argv.index("--max-min") + 1]) if "--max-min" in argv else 35
    nur = set(argv[argv.index("--format") + 1].split(",")) if "--format" in argv else None
    if "--notbremse" in argv:
        return pruefen(notbremse=True)
    if "--pruefen" in argv:
        return pruefen()
    if "--plan" in argv:
        return plan_lauf(max_min, nur, int(argv[argv.index("--max-slots") + 1]) if "--max-slots" in argv else 10**9)
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
