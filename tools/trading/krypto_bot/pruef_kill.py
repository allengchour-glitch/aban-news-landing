#!/usr/bin/env python3
"""Abbruch-Scan für Pilot 2.0 (aus der 16. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1.

Was passiert, wenn der Tageslauf HART endet (Prozess beendet, Zeitlimit des Cockpits, Stromausfall) — zwischen einem Auftrag und seinem Stop? Die Zufalls-Fuzzer und der
Ausfall-Raster stören einzelne Anfragen, der Lauf selbst lebt aber immer weiter und räumt am Ende auf. Hier stirbt er mitten drin:

  Tag 0 baut eine Lage (Markt, Richtung z0). Tag 1 läuft in einem KIND-Prozess, der mit os._exit(9) endet (kein finally, kein atexit) — direkt NACHDEM die Börse den n-ten SCHREIBENDEN
  Auftrag (POST/DELETE) verarbeitet hat, bevor das Kind die Antwort liest (n = 0: vor dem ersten Auftrag). Danach läuft die Nachkontrolle (wie in krypto-auto.bat nach dem Lauf; die
  Lauf-Sperre übernimmt sie nach ALT_NACH_TOT Sekunden ohne Herzschlag), Störungen gibt es keine. Das Buch des toten Laufs ist so, wie er es zuletzt geschrieben hat.

Gemessen (USDT ohne Stop, wie der Fuzzer rechnet): (a) sofort nach dem Abbruch, (b) nach der Nachkontrolle.
Befund (jeder ist ein Fehler):
  NACH_ABBRUCH_NK     nach Abbruch + Nachkontrolle bleibt etwas ohne Stop (der Vermerk «schutz_offen» vor dem ersten Auftrag fehlt, oder die Nachkontrolle holt ihn nicht nach)
  AUSNAHME            Kind oder Nachkontrolle warfen eine unerwartete Ausnahme
Statistik (kein Befund): `sofort_ungeschuetzt` = Abbruchstellen, an denen DIREKT nach dem Abbruch etwas ohne Stop lag (die Lücke bis zur Nachkontrolle; ohne sie gäbe es kein Problem).

Aufruf:
  python3 -B pruef_kill.py VON BIS [AUSGABE.json]     # Szenario-Index VON..BIS-1 (12 Szenarien wie pruef_raster; je Szenario ein Abbruch nach JEDEM Auftrag des Tages)
  python3 -B pruef_kill.py VON BIS [AUSGABE.json] --stoerungen [--jeder N]
        # Abbruch × Störung: dazu wirkt EINE schreibende Störung (pruef_raster.SCHREIBEN + pruef_raster2.NEU) ab der 1. oder 2. passenden Anfrage des Tages — auch gegen die Aufträge des Kindes, bis es stirbt;
        # danach (ohne Störung) die Nachkontrolle. Misst, ob Vermerk und Nachkontrolle auch dann tragen, wenn der Lauf schon vor dem Abbruch gestört war.
  python3 -B pruef_kill.py VON BIS [AUSGABE.json] --paare [--jeder N]
        # Abbruch × ZWEI Störungen: wie --stoerungen, aber je zwei Störungen zugleich — eine schreibende plus (a) eine zweite schreibende (jedes Paar verschiedener Störungen, beide ab der 1. passenden Anfrage des Tages),
        # (b) eine lesende (Liste/Konto/Kurs dauerhaft oder mehrfach unlesbar) oder (c) ein Kurssprung (±4 %, ±15 %) zur 1. bzw. 7. Anfrage des Tages; Stichprobe mit --jeder N.
  python3 -B pruef_kill.py VON BIS [AUSGABE.json] --nk
        # Abbruch der NACHKONTROLLE: der Tageslauf stirbt nach dem 1., mittleren und letzten Auftrag; die Nachkontrolle (ein Kind-Prozess) stirbt ihrerseits nach dem n2-ten Auftrag (n2 = 0, 1, … bis sie durchläuft);
        # danach die zweite, ungestörte Nachkontrolle — es darf nichts ungeschützt bleiben (der Vermerk bleibt, solange nicht alles gesichert ist).
        # PRUEF_KILL_NK_EINMAL=1: das sterbende Kind ist ein Durchgang `einmal` (10-Minuten-Takt) statt der langen Fassung; mit PRUEF_NK_EINMAL=3 ist auch die zweite Nachkontrolle die Folge von drei Durchgängen.
  python3 -B pruef_kill.py VON BIS [AUSGABE.json] --notaus
        # Abbruch des NOT-AUS: er stirbt nach dem n-ten Auftrag (die Datei STOP liegt); danach die Nachkontrolle im Not-Aus-Modus — sie muss alles schliessen (flach) und nichts ungeschützt lassen.
Intern: pruef_kill.py --kind JSON(env) JSON(ents) BUCHDATEI N TMPDIR [nk|notaus]   (das Kind)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import traceback
from collections import Counter
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.dont_write_bytecode = True


def _kind(argv):
    """Das Kind: Tageslauf gegen die Prüf-Börse des Elternprozesses; os._exit(9), nachdem die Börse den n-ten schreibenden Auftrag verarbeitet hat."""
    import urllib.request

    import broker_futures as BF
    import pilot2_live as L
    env, ents, buch, n, tmp = json.loads(argv[0]), json.loads(argv[1]), argv[2], int(argv[3]), argv[4]
    modus = argv[5] if len(argv) > 5 else "lauf"   # «nk»: das Kind ist die NACHKONTROLLE, «notaus»: der NOT-AUS (er stirbt nach dem n-ten Auftrag)
    L.FREIGEGEBEN = True
    BF.NACHFRAGE_WARTEN = (0.0, 0.0, 0.0)
    L.LESE_WARTEN = (0.0, 0.0)
    L.SCHUTZ_WARTEN = (0.0, 0.0, 0.0, 0.0)
    L.UNKLAR_WARTEN = (0.0, 0.0, 0.0)
    BF.STOP_DATEI = Path(tmp) / "STOP"
    L.PAUSE_DATEI = Path(tmp) / "PAUSE"
    L.BESTAND = Path(tmp) / "bestand.json"
    L.PROTOKOLL = Path(tmp) / "protokoll.json"
    zaehler = [0]
    orig = urllib.request.urlopen

    def urlopen(req, *a, **k):
        schreibend = getattr(req, "method", None) in ("POST", "DELETE") or (getattr(req, "data", None) is not None and getattr(req, "method", None) != "GET")
        if schreibend and n == 0 and zaehler[0] == 0:
            os._exit(9)
        r = orig(req, *a, **k)        # die Börse hat den Auftrag verarbeitet …
        if schreibend:
            zaehler[0] += 1
            if zaehler[0] >= n > 0:
                os._exit(9)           # … und das Kind stirbt, bevor es die Antwort verarbeitet
        return r

    urllib.request.urlopen = urlopen
    if modus == "nk":
        L.UNKLAR_MAX_ALTER_MS = -1      # «10 Minuten später»: unbekannte Aufträge gelten als nie ausgeführt (wie pruef_fuzzer.nachkontrolle)
        zeit = [0.0]

        def schlafen(s):
            zeit[0] += s
        # (20. Folge-Runde) PRUEF_KILL_NK_EINMAL=1: das Kind ist ein Durchgang `einmal` (der 10-Minuten-Takt der Aufgabenplanung), nicht die lange Nachkontrolle — sonst prüft der Scan nur die lange Fassung
        L.nachkontrolle(env=env, datei=buch, schlafen=schlafen, uhr=lambda: zeit[0], einmal=os.environ.get("PRUEF_KILL_NK_EINMAL") == "1")
    elif modus == "notaus":
        L.ausfuehren([], env=env, bestand_datei=buch, notaus=True)
    else:
        L.ausfuehren(ents, env=env, bestand_datei=buch)
    print("FERTIG", zaehler[0])


if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "--kind":
    _kind(sys.argv[2:])
    sys.exit(0)

import pruef_fuzzer as P  # noqa: E402
import pruef_raster as R  # noqa: E402

B = P.B
L = P.L


def _usdt(b):
    """Betrag eines Befunds in USDT: (Name, Symbol, Menge, …, USDT) bzw. (Name, Symbol, Menge)."""
    zahlen = [x for x in b[2:] if isinstance(x, (int, float)) and not isinstance(x, bool)]
    if b[0].startswith("NACH_SPRUNG") or len(zahlen) >= 2:
        return abs(zahlen[-1]) if zahlen else 0.0
    return abs(zahlen[0]) * B.kurs[b[1]] if zahlen else 0.0


def befunde(k, d):
    return P.echte(P.schutz_befunde(k, P.unklar_je_markt(d)) + P.folgeschaden(k))


def betrag(bf):
    """(direkt, nach Kurssprung) — der grösste Betrag ohne Stop in USDT."""
    direkt = [b for b in bf if not b[0].startswith("NACH_SPRUNG")]
    sprung = [b for b in bf if b[0].startswith("NACH_SPRUNG")]
    return round(max([_usdt(b) for b in direkt] or [0.0]), 1), round(max([_usdt(b) for b in sprung] or [0.0]), 1)


def tag0(sz):
    """Tag 0 baut die Lage, ein Prozent Kursbewegung danach (die Stops passen nicht trivial) → (Konto, Buch, Umgebung)."""
    markt, z0, _z1 = sz
    k = P.neues_konto(20000)
    d = P.neu_buch()
    env = P.env_echt(kapital=20000)
    P.lauf([P.E(markt, z0)], env, d)
    for s_ in P.SYMS:
        B.bewegen(s_, round(B.kurs[s_] * 1.01, 2))
    return k, d, env


def schreibende(sz):
    """Wie viele schreibende Aufträge macht Tag 1 ohne Abbruch? (Zahl der Abbruchstellen − 1)"""
    k, d, env = tag0(sz)
    n0 = len(B.log)
    P.lauf([P.E(sz[0], sz[2])], env, d)
    return sum(1 for x in B.log[n0:] if x[1] in ("POST", "DELETE"))


def abbruch(sz, n, stoerung=None, skip=0, weitere=None):
    """Ein Fall: Tag 1 stirbt nach dem n-ten schreibenden Auftrag, danach die Nachkontrolle.
    stoerung: eine schreibende Störung (Tupel wie pruef_raster.SCHREIBEN), die ab der (skip+1)-ten passenden Anfrage wirkt — bis der Lauf stirbt; die Nachkontrolle läuft ohne Störung.
    weitere: optional (w2, skip2): eine zweite Störung — schreibende Regel (Tupel mit 5), lesende Regel (Tupel mit 4) oder Kurssprung (Bruch, z. B. -0.04, zur (skip2+1)-ten Anfrage des Tages) —, die zugleich wirkt.
    → dict(gestorben, schutz_offen (im Buch des toten Laufs), sofort, nach_nk, arten, …)"""
    markt, _z0, z1 = sz
    k, d, env = tag0(sz)
    ents = P.E(markt, z1)
    fertig = None
    if stoerung is not None:
        import pruef_raster2 as X
        ereignisse = [X.ev(X.trig(stoerung), skip, X.a_regel(stoerung))]
        if weitere is not None:
            w2, skip2 = weitere
            if isinstance(w2, float):
                ereignisse.append(X.ev(None, skip2, X.a_kurs(w2)))
            else:
                ereignisse.append(X.ev(X.trig(w2) if len(w2) == 5 else (w2[0], w2[1], None), skip2, X.a_regel(w2)))
        fertig = X.installieren(ereignisse, markt)
    try:
        r = subprocess.run([sys.executable, "-B", str(HIER / "pruef_kill.py"), "--kind", json.dumps(env), json.dumps([ents]), str(d), str(n), str(P.TMP)],
                           capture_output=True, text=True, timeout=180)
    finally:
        B.vor_jeder_anfrage = None
        B.regeln = []
        B.ersetzen_fehlt = False
    if r.returncode not in (0, 9):
        return dict(sz=sz, n=n, fehler=(r.stderr or r.stdout)[-400:])
    if fertig is not None and not all(fertig):
        return dict(sz=sz, n=n, nicht_ausgeloest=True)
    try:
        buch = json.loads(Path(d).read_text()).get("echt") or {}
    except (OSError, ValueError):
        buch = {}
    sofort = betrag(befunde(k, d))
    P.pending_abarbeiten()                 # verspätete Aufträge kommen an …
    B.n_listen += 1000                     # … und alle Listen zeigen jeden Auftrag
    try:
        P.nachkontrolle(env, d)
    except Exception:  # noqa: BLE001
        return dict(sz=sz, n=n, fehler=traceback.format_exc()[-600:])
    bf = befunde(k, d)
    return dict(sz=sz, n=n, stoerung=(stoerung[:2] + stoerung[3:]) if stoerung else None, weitere=(weitere[0] if isinstance(weitere[0], float) else weitere[0][:2] + weitere[0][3:], weitere[1]) if weitere else None, skip=skip, gestorben=r.returncode == 9, schutz_offen=list(buch.get("schutz_offen") or []),
                unklar=len(buch.get("unklar") or []), sofort=sofort, nach_nk=betrag(bf), arten=[b[0] for b in bf], lage=P.zeigen(k))


def abbruch_nk(sz, n1, n2):
    """Tag 1 stirbt nach dem n1-ten Auftrag, die Nachkontrolle (Kind) stirbt nach dem n2-ten, danach läuft eine ungestörte Nachkontrolle.
    → dict(… wie abbruch(); nk_gestorben: starb die erste Nachkontrolle wirklich? (False = sie lief durch, n2 war zu gross))"""
    markt, _z0, z1 = sz
    k, d, env = tag0(sz)
    ents = P.E(markt, z1)
    r1 = subprocess.run([sys.executable, "-B", str(HIER / "pruef_kill.py"), "--kind", json.dumps(env), json.dumps([ents]), str(d), str(n1), str(P.TMP)], capture_output=True, text=True, timeout=180)
    if r1.returncode not in (0, 9):
        return dict(sz=sz, n=n1, n2=n2, fehler=(r1.stderr or r1.stdout)[-400:])
    P.pending_abarbeiten()
    B.n_listen += 1000
    r2 = subprocess.run([sys.executable, "-B", str(HIER / "pruef_kill.py"), "--kind", json.dumps(env), json.dumps([ents]), str(d), str(n2), str(P.TMP), "nk"], capture_output=True, text=True, timeout=180)
    if r2.returncode not in (0, 9):
        return dict(sz=sz, n=n1, n2=n2, fehler=(r2.stderr or r2.stdout)[-400:])
    try:
        buch = json.loads(Path(d).read_text()).get("echt") or {}
    except (OSError, ValueError):
        buch = {}
    zwischen = betrag(befunde(k, d))
    P.pending_abarbeiten()
    B.n_listen += 1000
    try:
        P.nachkontrolle(env, d)
    except Exception:  # noqa: BLE001
        return dict(sz=sz, n=n1, n2=n2, fehler=traceback.format_exc()[-600:])
    bf = befunde(k, d)
    return dict(sz=sz, n=n1, n2=n2, gestorben=r1.returncode == 9, nk_gestorben=r2.returncode == 9, schutz_offen=list(buch.get("schutz_offen") or []), sofort=zwischen,
                nach_nk=betrag(bf), arten=[b[0] for b in bf], lage=P.zeigen(k))


def abbruch_notaus(sz, n):
    """Der Not-Aus (Kind) stirbt nach dem n-ten Auftrag; danach die Nachkontrolle im Not-Aus-Modus (die Datei STOP liegt). → dict(… flach: ist danach alles geschlossen?)"""
    markt, _z0, z1 = sz
    k, d, env = tag0(sz)
    import broker_futures as BF
    BF.STOP_DATEI.write_text("pruef_kill")
    try:
        r = subprocess.run([sys.executable, "-B", str(HIER / "pruef_kill.py"), "--kind", json.dumps(env), json.dumps([P.E(markt, z1)]), str(d), str(n), str(P.TMP), "notaus"],
                           capture_output=True, text=True, timeout=180)
        if r.returncode not in (0, 9):
            return dict(sz=sz, n=n, fehler=(r.stderr or r.stdout)[-400:])
        sofort = betrag(befunde(k, d))
        P.pending_abarbeiten()
        B.n_listen += 1000
        try:
            P.nachkontrolle(env, d)
        except Exception:  # noqa: BLE001
            return dict(sz=sz, n=n, fehler=traceback.format_exc()[-600:])
        bf = befunde(k, d)
        flach = P.flach(k)
        return dict(sz=sz, n=n, gestorben=r.returncode == 9, sofort=sofort, nach_nk=betrag(bf), arten=[b[0] for b in bf] + ([] if flach else ["NICHT_FLACH"]), flach=flach, lage=P.zeigen(k))
    finally:
        BF.STOP_DATEI.unlink(missing_ok=True)


def scan_notaus(von, bis, ausgabe=None, laut=True):
    """Abbruch des Not-Aus nach jedem Auftrag (Szenarien mit gleichem Markt und gleicher Lage gestern zählen einmal)."""
    zaehler, funde = Counter(), []
    gesehen = set()
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if sz[:2] in gesehen:
            continue
        gesehen.add(sz[:2])
        n = 0
        while n < 40:
            m = abbruch_notaus(sz, n)
            zaehler["abbruch"] += 1
            if m.get("fehler"):
                zaehler["AUSNAHME"] += 1
                funde.append(m)
                break
            if m["gestorben"]:
                zaehler["gestorben"] += 1
                if m["sofort"][0] > 0 or m["sofort"][1] > 0:
                    zaehler["sofort_ungeschuetzt"] += 1
            if m["arten"]:
                zaehler["NACH_ABBRUCH_NOTAUS"] += 1
                funde.append(m)
            if laut:
                print(si, sz[:2], "n", n, "gest", m.get("gestorben"), "zwischen", m.get("sofort"), "nach_NK", m.get("nach_nk"), "flach", m.get("flach"), flush=True)
            if not m["gestorben"]:
                break    # der Not-Aus lief durch: grössere n ändern nichts mehr
            n += 1
    if ausgabe:
        Path(ausgabe).write_text(json.dumps(funde, indent=1, default=str))
    return zaehler, funde


def scan_nk(von, bis, ausgabe=None, laut=True):
    """Abbruch der Nachkontrolle: Tageslauf-Abbruch an drei Stellen (erster, mittlerer, vorletzter Auftrag) × Abbruch der Nachkontrolle nach 0, 1, 2, … Aufträgen."""
    zaehler, funde = Counter(), []
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        gesamt = schreibende(sz)
        for n1 in sorted({1, max(1, gesamt // 2), max(1, gesamt - 1)}):
            for n2 in range(0, 14):
                m = abbruch_nk(sz, n1, n2)
                zaehler["abbruch"] += 1
                if m.get("fehler"):
                    zaehler["AUSNAHME"] += 1
                    funde.append(m)
                    break
                if m["gestorben"] and m["nk_gestorben"]:
                    zaehler["beide_gestorben"] += 1
                if m["arten"]:
                    zaehler["NACH_ABBRUCH_NK"] += 1
                    funde.append(m)
                if laut:
                    print(si, sz, "n1", n1, "/", gesamt, "n2", n2, "gest", m.get("gestorben"), m.get("nk_gestorben"), "zwischen", m.get("sofort"), "nach_NK", m.get("nach_nk"), flush=True)
                if not m["nk_gestorben"]:
                    break   # die Nachkontrolle lief durch: grössere n2 ändern nichts mehr
    if ausgabe:
        Path(ausgabe).write_text(json.dumps(funde, indent=1, default=str))
    return zaehler, funde


def scan(von, bis, ausgabe=None, laut=True, stoerungen=False, jeder=1, paare=False):
    """Abbruch nach jedem Auftrag; mit stoerungen=True zusätzlich je EINE schreibende Störung (zwei Beginne), mit paare=True je ZWEI verschiedene Störungen zugleich; jeder N-te Fall (Stichprobe)."""
    zaehler, funde = Counter(), []
    fall_nr = 0
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        gesamt = schreibende(sz)
        if paare:
            import itertools

            import pruef_raster2 as X
            ws = R.SCHREIBEN + X.NEU
            zweite = [(w1, (w2, 0)) for w1, w2 in itertools.combinations(ws, 2)] + [(w1, (le, 0)) for w1 in ws for le in R.LESEN if le is not None] \
                + [(w1, (fr, sk2)) for w1 in ws for fr in (0.04, -0.04, 0.15, -0.15) for sk2 in (0, 6)]
            faelle = [(n, w1, 0, w2) for w1, w2 in zweite for n in range(0, gesamt + 1)]
        elif stoerungen:
            import pruef_raster2 as X
            faelle = [(n, w, skip, None) for w in R.SCHREIBEN + X.NEU for skip in (0, 1) for n in range(0, gesamt + 1)]
        else:
            faelle = [(n, None, 0, None) for n in range(0, gesamt + 1)]
        for n, w, skip, w2 in faelle:
            fall_nr += 1
            if jeder > 1 and fall_nr % jeder:
                continue
            m = abbruch(sz, n, w, skip, w2)
            if m.get("nicht_ausgeloest"):
                zaehler["nicht_ausgeloest"] += 1
                continue
            zaehler["abbruch"] += 1
            if m.get("fehler"):
                zaehler["AUSNAHME"] += 1
                funde.append(m)
            elif m["gestorben"]:
                zaehler["gestorben"] += 1
                if m["sofort"][0] > 0 or m["sofort"][1] > 0:
                    zaehler["sofort_ungeschuetzt"] += 1
                if m["arten"]:
                    zaehler["NACH_ABBRUCH_NK"] += 1
                    funde.append(m)
            if laut:
                print(si, sz, "n", n, "/", gesamt, "gestorben", m.get("gestorben"), "offen", m.get("schutz_offen"), "sofort", m.get("sofort"), "nach_NK", m.get("nach_nk"), flush=True)
    if ausgabe:
        Path(ausgabe).write_text(json.dumps(funde, indent=1, default=str))
    return zaehler, funde


if __name__ == "__main__":
    argv_ = list(sys.argv[1:])
    jeder = 1
    if "--jeder" in argv_:   # Schalter mit Zahlenwert: nicht als Position lesen
        i_ = argv_.index("--jeder")
        jeder = int(argv_[i_ + 1])
        del argv_[i_:i_ + 2]
    args = [x for x in argv_ if not x.startswith("--")]
    von, bis = int(args[0]), int(args[1])
    aus = args[2] if len(args) > 2 else None
    if "--notaus" in argv_:
        z, f = scan_notaus(von, bis, aus, laut="--leise" not in argv_)
    elif "--nk" in argv_:
        z, f = scan_nk(von, bis, aus, laut="--leise" not in argv_)
    else:
        z, f = scan(von, bis, aus, laut="--leise" not in argv_, stoerungen="--stoerungen" in argv_, jeder=jeder, paare="--paare" in argv_)
    print(dict(z))
    print(f"{len(f)} Befunde")
    for x in f[:12]:
        print(json.dumps({k_: v for k_, v in x.items() if k_ in ("sz", "n", "schutz_offen", "sofort", "nach_nk", "arten", "fehler")}, default=str)[:500])
    sys.exit(1 if f else 0)
