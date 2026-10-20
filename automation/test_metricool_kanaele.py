"""Gegenprobe in BEIDE Richtungen für die Ampelzeile «METRICOOL 24 h … still: …» (20.10.2026).

Fehlalarm, den es zu verhindern gilt: `posted_at` im Ledger ist seit dem 7-Tage-Vorlauf nur die PLANUNGSZEIT; Metricool
veröffentlicht zum Slot-Termin. Die Ampel meldete «still: TikTok, YouTube», obwohl gepostet wurde. Eine Prüfung, die nur
«nicht still» kann, ist aber keine — deshalb Kanarienvögel: Planende, zurückgezogene Slots, fehlerhafte Slots, Plan-Loch.

Aufruf: python3 automation/test_metricool_kanaele.py   (Exit 0 = alle grün; ohne Netz, ohne Schreibzugriff aufs Repo)."""
import datetime, importlib, json, os, shutil, sys, tempfile

REAL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REAL, "automation"))
b = importlib.import_module("betreiber_ampel")

RealDT = datetime.datetime
TMP = tempfile.mkdtemp(prefix="metricool_test_")


def zeit(jetzt):
    class F(RealDT):
        @classmethod
        def utcnow(cls):
            return jetzt
    datetime.datetime = F


def zurueck():
    datetime.datetime = RealDT


def plan_laden():
    return json.load(open(os.path.join(REAL, "dropship/_vorlauf_plan.json"), encoding="utf-8"))


def fake_repo(name, plan_mut=None, ledger_extra=None, ohne_plan=False):
    d = os.path.join(TMP, name)
    os.makedirs(d + "/automation"); os.makedirs(d + "/dropship")
    for rel in ("automation/reels_seed.csv", "automation/social_autopilot.sh", "dropship/_pinterest_pins.txt"):
        if os.path.exists(os.path.join(REAL, rel)):
            shutil.copy(os.path.join(REAL, rel), os.path.join(d, rel))
    if not ohne_plan:
        p = plan_laden()
        if plan_mut:
            plan_mut(p)
        json.dump(p, open(d + "/dropship/_vorlauf_plan.json", "w"))
    if ledger_extra:
        with open(d + "/automation/reels_seed.csv", "a") as f:
            f.write(ledger_extra)
    return d


def lauf(repo, jetzt):
    b.REPO = repo
    zeit(jetzt)
    try:
        return b.metricool_kanaele()
    finally:
        zurueck(); b.REPO = REAL


def still(txt, kanal=None):
    if "still:" not in txt:
        return False
    return True if kanal is None else kanal in txt.split("still:", 1)[1]


# Der Test braucht den echten Plan als Muster: Slots für tiktok/youtube/pin, status=geplant, Termine 19.–25.10.
slots = plan_laden().get("slots") or {}
fehlt = [f for f in ("tiktok", "youtube", "pin") if not any(s["format"] == f for s in slots.values())]
if fehlt:
    print(f"ÜBERSPRUNGEN: _vorlauf_plan.json trägt keine Slots für {fehlt} (Plan abgelaufen/ersetzt) — Test braucht ein Muster")
    sys.exit(0)

termine = sorted(s["termin_utc"] for s in slots.values() if s["format"] == "youtube" and s.get("status") == "geplant")
if len(termine) < 4:
    print("ÜBERSPRUNGEN: zu wenige YouTube-Slots im Plan für die Szenarien"); sys.exit(0)
# Szenarien relativ zum Plan: «mitten im Plan» = nach dem 3. YouTube-Slot und vor dem letzten.
mitte = RealDT.fromisoformat(termine[2].replace("Z", "")) + datetime.timedelta(hours=2)
nach_ende = RealDT.fromisoformat(termine[-1].replace("Z", "")) + datetime.timedelta(hours=14)
erster_nach_mitte = [t for t in termine if RealDT.fromisoformat(t.replace("Z", "")) > mitte]

ok = True


def pruefe(name, bedingung, detail=""):
    global ok
    ok &= bool(bedingung)
    print(f"  {'ok  ' if bedingung else 'FEHL'} {name}" + (f"\n        → {detail}" if detail and not bedingung else ""))


print("A) Mitten im Plan, Ledger alt: darf NICHT «still» melden (der Fehlalarm vom 20.10.)")
r = lauf(REAL, mitte)
pruefe("A: Ist-Plan, mitten im Plan → kein still", not still(r), r)

print("B) Kanarienvogel: lange nach Planende, Autopilot postet nicht → MUSS «still» melden")
r = lauf(REAL, nach_ende)
pruefe("B: nach Planende → still YouTube", still(r, "YouTube"), r)

print("C) Kanarienvogel: alle YouTube-Slots nach der Mitte zurückgezogen (status offen, keine mc_ids) → «still»")


def mut_c(p):
    for v in p["slots"].values():
        if v["format"] == "youtube" and v["termin_utc"] > termine[2]:
            v["status"] = "offen"; v["mc_ids"] = []
r = lauf(fake_repo("C", mut_c), nach_ende - datetime.timedelta(hours=1))
pruefe("C: zurückgezogene Slots → still YouTube", still(r, "YouTube"), r)

print("D) Plan-Datei fehlt → altes Verhalten (Ledger), kein Absturz")
r = lauf(fake_repo("D", ohne_plan=True), mitte)
pruefe("D: kein Plan → Zeile entsteht, kein 'unklar'", r.startswith("METRICOOL 24 h:"), r)

print("E) Autopilot postet nach Planende selbst (Ledger frischer als Plan) → NICHT «still»")
ende_tag = (nach_ende + datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
led = (f"x-tt-neu,2026-10-26,https://example.invalid/a.mp4,cap,tags,tiktok,posted-tiktok,{ende_tag},metricool:1\n"
       f"x-yt-neu,2026-10-26,https://example.invalid/b.mp4,cap,tags,youtube,posted-youtube,{ende_tag},metricool:2\n")
r = lauf(fake_repo("E", None, led), nach_ende + datetime.timedelta(hours=2))
pruefe("E: frisches Ledger nach Planende → kein still für YouTube/TikTok", not (still(r, "YouTube") or still(r, "TikTok")), r)

print("F) Alle vergangenen YouTube-Slots im Planer fehlgeschlagen → «still»")


def mut_f(p):
    for v in p["slots"].values():
        if v["format"] == "youtube" and v["termin_utc"] <= termine[2]:
            v["status"] = "fehler"
r = lauf(fake_repo("F", mut_f), mitte)
pruefe("F: vergangene Slots fehlerhaft → still YouTube", still(r, "YouTube"), r)

print("H) Nur der jüngste vergangene YouTube-Slot fehlgeschlagen, Zukunft gefüllt → «still» durch die Lückenregel")
if len(termine) >= 5:
    def mut_h(p):
        for v in p["slots"].values():
            if v["format"] == "youtube" and v["termin_utc"] == termine[2]:
                v["status"] = "fehler"
    # Zeitpunkt: so spät nach dem Ausfall-Slot, dass die Lücke > grösster Abstand + 2 h ist
    luecke = max((RealDT.fromisoformat(b2.replace("Z", "")) - RealDT.fromisoformat(a2.replace("Z", ""))).total_seconds()
                 for a2, b2 in zip(termine, termine[1:]))
    spaet = RealDT.fromisoformat(termine[1].replace("Z", "")) + datetime.timedelta(seconds=luecke + 7200 + 3600)
    if spaet < RealDT.fromisoformat(termine[3].replace("Z", "")):
        r = lauf(fake_repo("H", mut_h), spaet)
        pruefe("H: jüngster Slot fehlerhaft → still YouTube", still(r, "YouTube"), r)
    else:
        print("  --   H übersprungen (Plan zu dicht für den Zeitpunkt)")

print("I) Sweep: alle 10 Minuten über den ganzen Plan (zwischen 1. und letztem Slot) → null Fehlalarme")
von = RealDT.fromisoformat(termine[1].replace("Z", "")) + datetime.timedelta(hours=1)
bis = RealDT.fromisoformat(termine[-1].replace("Z", ""))
t = von; n = 0; alarme = []
while t <= bis:
    r = lauf(REAL, t); n += 1
    if still(r):
        alarme.append((t.isoformat(), r))
    t += datetime.timedelta(minutes=10)
pruefe(f"I: {n} Stichproben, {len(alarme)} Fehlalarme", not alarme, str(alarme[:1]))

shutil.rmtree(TMP, ignore_errors=True)
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
