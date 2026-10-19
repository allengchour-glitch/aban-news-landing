#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ergebnis_alter.py — Alter des ERGEBNISSES eines Tageswächters in ganzen Stunden (Entwurf 19.10.2026).

Wozu: der Aufseher entschied bisher nach dem Alter des LOGS (touch VOR dem Lauf). Ein Lauf, der beim Container-Neustart starb,
liess das Log frisch und das Ergebnis alt. Hier zählt nur, was der Lauf am ENDE schreibt.

  python3 tools/ergebnis_alter.py mtime PFAD                 Datei-mtime (nur /tmp-Dateien, die ein Lauf selbst schreibt)
  python3 tools/ergebnis_alter.py json  PFAD [FELD=stand]    JSON-Feld mit Zeitstempel (%Y-%m-%dT%H:%MZ | …:%SZ | %Y-%m-%d %H:%M)
  python3 tools/ergebnis_alter.py tsv   PFAD [SPALTE=1] [FILTER=13=0]   letzte Zeile (mit Filter «Spalte=Wert», 1-basiert)
  python3 tools/ergebnis_alter.py md    PFAD                 Zeile «Stand: JJJJ-MM-TT HH:MM UTC» (Berichte in dropship/)
  python3 tools/ergebnis_alter.py git   PFAD                 Zeit des letzten Commits (mtime von Repo-Dateien ist wertlos: git reset setzt sie neu)
  python3 tools/ergebnis_alter.py --selbsttest

Mehrere Quellen: «a|b» im Pfad → das ÄLTESTE zählt. Ausgabe: eine ganze Zahl; 999 = fehlt/unlesbar (nie «0» aus Nicht-Messung).
Repo-Pfade (ohne führenden /) werden gegen das Repo aufgelöst. Exit immer 0.
"""
import datetime as dt, json, os, re, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORMATE = ("%Y-%m-%dT%H:%MZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S.%fZ")


def pfad_(p):
    return p if os.path.isabs(p) else os.path.join(REPO, p)


def parse(s):
    s = str(s).strip()
    for f in FORMATE:
        try:
            return dt.datetime.strptime(s, f).replace(tzinfo=dt.timezone.utc).timestamp()
        except ValueError:
            pass
    raise ValueError("Zeitformat unbekannt: " + s[:30])


def zeit_von(typ, p, *arg, jetzt=None):
    p = pfad_(p)
    if typ == "mtime":
        return os.path.getmtime(p)
    if typ == "json":
        feld = arg[0] if arg else "stand"
        return parse(json.load(open(p, encoding="utf-8"))[feld])
    if typ == "md":
        t = open(p, encoding="utf-8").read()
        m = re.search(r"^Stand: (\d{4}-\d\d-\d\d \d\d:\d\d) UTC", t, re.M)
        if not m:   # 19.10.: Überschrift «… — Stand 2026-10-19T06:24Z» (GOOGLE-BILD-ABRUF.md)
            m = re.search(r"^#.*?Stand (\d{4}-\d\d-\d\dT\d\d:\d\dZ)", t, re.M)
        return parse(m.group(1))
    if typ == "tsv":
        sp = int(arg[0]) if arg and arg[0].isdigit() else 1
        filt = next((a for a in arg if "=" in a), None)
        letzte = None
        for z in open(p, encoding="utf-8").read().splitlines()[1:]:
            c = z.split("\t")
            if len(c) < sp:
                continue
            if filt:
                k, _, v = filt.partition("=")
                if len(c) < int(k) or c[int(k) - 1] != v:
                    continue
            letzte = c[sp - 1]
        return parse(letzte)
    if typ == "git":
        t = subprocess.run(["git", "-C", REPO, "log", "-1", "--format=%ct", "--", p], capture_output=True, text=True).stdout.strip()
        return float(t)
    raise ValueError("Typ " + typ)


def alter_h(typ, pfade, *arg, jetzt=None):
    jetzt = jetzt or time.time()
    ts = []
    for p in pfade.split("|"):
        try:
            ts.append(zeit_von(typ, p, *arg))
        except Exception:
            return 999
    return max(0, int((jetzt - min(ts)) // 3600))


def selbsttest():
    import tempfile
    d = tempfile.mkdtemp(prefix="ea_")
    j = time.time()
    ok = True
    def pr(name, ist, soll):
        nonlocal ok
        gut = ist == soll
        ok &= gut
        print(("ok   " if gut else "FEHL ") + f"{name}: {ist} (soll {soll})")
    f = os.path.join(d, "a.json")
    json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime(j - 5 * 3600 - 60)), "zeit": "kaputt"}, open(f, "w"))
    pr("json stand 5 h", alter_h("json", f), 5)
    pr("json Feld kaputt → 999", alter_h("json", f, "zeit"), 999)
    pr("json fehlt → 999", alter_h("json", os.path.join(d, "nix.json")), 999)
    t = os.path.join(d, "g.tsv")
    zt = lambda h: time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime(j - h * 3600 - 60))
    open(t, "w").write("zeit\tx\tcache\n" + f"{zt(30)}\t1\t0\n" + f"{zt(2)}\t1\t1\n")
    pr("tsv letzte Zeile (Cache-Kopie zählt)", alter_h("tsv", t, "1"), 2)
    pr("tsv mit Filter 3=0 (echte Messung)", alter_h("tsv", t, "1", "3=0"), 30)
    m = os.path.join(d, "m.txt"); open(m, "w").write("x"); os.utime(m, (j - 7 * 3600, j - 7 * 3600))
    pr("mtime 7 h", alter_h("mtime", m), 7)
    pr("Mehrquellen: ältestes zählt", alter_h("mtime", m + "|" + f), 7)
    pr("Mehrquellen mit fehlender → 999", alter_h("mtime", m + "|" + os.path.join(d, "nix")), 999)
    b = os.path.join(d, "b.md"); open(b, "w").write("# x\n\nStand: " + time.strftime("%Y-%m-%d %H:%M", time.gmtime(j - 49 * 3600)) + " UTC · …\n")
    pr("md Stand 49 h", alter_h("md", b), 49)
    print("SELBSTTEST", "OK" if ok else "ROT")
    import shutil
    shutil.rmtree(d, ignore_errors=True)   # 19.10.: Tempordner nicht liegen lassen (/tmp-Leichen-Klasse)
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["--selbsttest"]:
        sys.exit(selbsttest())
    if len(a) < 2:
        print(999); sys.exit(0)
    try:
        print(alter_h(a[0], a[1], *a[2:]))
    except Exception:
        print(999)
