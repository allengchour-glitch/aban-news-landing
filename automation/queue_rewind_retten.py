#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""queue_rewind_retten.py — Queue-Zeilen über `repo_vorspulen.sh` (stash + reset --hard) retten (14.10.2026)

ANLASS (dropship/QUEUE-SCHREIBER-2026-10-14.md, OFFEN 1): `repo_vorspulen.sh` setzt nach einem Snapshot-Rewind den Baum per
`git reset --hard` auf origin. Die Ledger in dropship/ werden danach vereinigt, die Social-Queues (automation/reels_seed.csv,
social/*.csv) NICHT. Eine Zeile, die ein Motor angehängt hat und die noch in keinem Commit stand (fertiges Reel, neuer
Bild-Post), lag danach nur noch im Stash. Der Tageslauf `queue_schreiber_wache --zurueckholen` holt nur, was einmal
committet war.

REGEL: Nach dem Reset kommt nur zurück, was NIE in einem Commit dieser Datei stand (`git log -S<id>` leer).
Eine Zeile, die schon einmal im Repo war und jetzt fehlt, wurde bewusst entfernt (Säuberer, Doppel). Sie bleibt draussen,
sonst entstehen Zombie-Zeilen (Lehre 15.08.). Angehängt wird über `queue_csv.anhaengen` (Sperre, frisch, atomar), die
Spalten nach Kopfnamen. Jede zurückgeholte Zeile steht in dropship/_queue_zurueckgeholt.tsv (Grund «rewind»).

    python3 automation/queue_rewind_retten.py --sichern DIR     vor stash/reset: Queues nach DIR kopieren
    python3 automation/queue_rewind_retten.py --zurueck DIR     nach reset: nie committete Zeilen anhängen
    python3 automation/queue_rewind_retten.py --selbsttest
"""
import csv
import datetime as dt
import io
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from queue_csv import anhaengen, lesen  # noqa: E402
from queue_schreiber_wache import QUEUES  # noqa: E402

LOG_REL = "dropship/_queue_zurueckgeholt.tsv"


def _name(rel):
    return rel.replace("/", "__")


def sichern(ziel, repo="."):
    os.makedirs(ziel, exist_ok=True)
    n = 0
    for rel in QUEUES:
        q = os.path.join(repo, rel)
        if os.path.exists(q):
            shutil.copy2(q, os.path.join(ziel, _name(rel)))   # Kopie NACH ziel — die Queue selbst bleibt unberührt
            n += 1
    return n


def nie_committet(repo, rel, wert):
    r = subprocess.run(["git", "-C", repo, "log", "-S", wert, "--format=%h", "-1", "--", rel],
                       capture_output=True, text=True, timeout=120)
    return r.returncode == 0 and not r.stdout.strip()


def zurueck(quelle, repo="."):
    bericht, stempel = [], dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    for rel in QUEUES:
        alt_pfad, neu_pfad = os.path.join(quelle, _name(rel)), os.path.join(repo, rel)
        if not (os.path.exists(alt_pfad) and os.path.exists(neu_pfad)):
            continue
        try:
            alt, neu = lesen(alt_pfad), lesen(neu_pfad)
        except RuntimeError as e:
            bericht.append(f"{rel}: übersprungen ({e})")
            continue
        if not alt or not neu:
            continue
        ka, kn = [h.strip() for h in alt[0]], [h.strip() for h in neu[0]]
        ia = ka.index("id") if "id" in ka else 0
        da = {r[kn.index("id") if "id" in kn else 0] for r in neu[1:] if r}
        kand = [r for r in alt[1:] if r and len(r) > ia and r[ia] and r[ia] not in da]
        retten = [r for r in kand if nie_committet(repo, rel, r[ia])]
        if not retten:
            continue
        zeilen = [[(r[ka.index(h)] if h in ka and ka.index(h) < len(r) else "") for h in kn] for r in retten]
        n = anhaengen(neu_pfad, zeilen)
        with open(os.path.join(repo, LOG_REL), "a", encoding="utf-8") as f:
            for r in retten:
                f.write(f"{stempel}\t{rel}\t{r[ia]}\trewind (nie committet, nach reset --hard)\n")
        bericht.append(f"{rel}: {n} Zeile(n) zurück ({len(kand) - len(retten)} bewusst entfernte bleiben draussen)")
    for b in bericht:
        print("QUEUE-REWIND:", b)
    return 0


def selbsttest():
    import tempfile
    ok = True
    with tempfile.TemporaryDirectory() as t:
        repo = os.path.join(t, "r")
        os.makedirs(os.path.join(repo, "automation"))
        os.makedirs(os.path.join(repo, "dropship"))
        g = lambda *a: subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True, check=True)
        g("init", "-q"); g("config", "user.email", "t@t"); g("config", "user.name", "t")
        q = os.path.join(repo, "automation", "reels_seed.csv")
        open(q, "w", encoding="utf-8").write("id,status\nalt-1,ready\nweg-2,ready\n")
        g("add", "-A"); g("commit", "-qm", "c1")
        # origin entfernt weg-2 bewusst (Säuberer), lokal kam neu-3 dazu (nie committet)
        open(q, "w", encoding="utf-8").write("id,status\nalt-1,posted\n")
        g("commit", "-qam", "c2 säubern")
        lokal = "id,status\nalt-1,ready\nweg-2,ready\nneu-3,ready\n"
        open(q, "w", encoding="utf-8").write(lokal)
        sich = os.path.join(t, "s")
        sichern(sich, repo)
        g("checkout", "-q", "--", ".")                      # «reset --hard»
        zurueck(sich, repo)
        ids = [r[0] for r in csv.reader(io.StringIO(open(q, encoding="utf-8").read()))][1:]
        stat = {r[0]: r[1] for r in csv.reader(io.StringIO(open(q, encoding="utf-8").read())) if r}
        for name, bed in [("neu-3 zurück", "neu-3" in ids), ("weg-2 bleibt draussen", "weg-2" not in ids),
                          ("alt-1 posted bleibt", stat.get("alt-1") == "posted"),
                          ("Log geschrieben", "neu-3" in open(os.path.join(repo, LOG_REL), encoding="utf-8").read())]:
            print(f"  {'OK  ' if bed else 'FEHL'} {name}")
            ok &= bed
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--sichern" in a:
        print(f"QUEUE-REWIND: {sichern(a[a.index('--sichern') + 1])} Queues gesichert")
        sys.exit(0)
    if "--zurueck" in a:
        sys.exit(zurueck(a[a.index("--zurueck") + 1]))
    sys.exit(__doc__)
