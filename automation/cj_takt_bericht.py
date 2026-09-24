#!/usr/bin/env python3
"""cj_takt_bericht.py — wer verbraucht die CJ-Punkte? (24.09.2026)

ANLASS: Der Kosten-Nachtrag fand den geteilten CJ-Eimer fast immer leer (16900500, «Eimer knapp»), obwohl
der Container in der Stunde nur ~185 CJ-Aufrufe machte (~30 Punkte/min bei ~165 Nachfluss). Den Rest
verbraucht eine Maschine, die der Container nicht sieht: der Hetzner-Server teilt das CJ-Konto.
`cj_takt` protokolliert je Maschine jeden Aufruf mit Skriptnamen in /tmp/cj_takt_<Datum>.log — dieses
Skript fasst die letzte Stunde zusammen und legt sie ins Repo, wo die andere Maschine sie liest:
  dropship/_cj_takt_<hostname>.json  {"host", "stand", "fenster_min", "summe", "skripte": {name: n}}
Einmal je Stunde geschrieben (Stundenstempel), damit der Autocommitter nicht alle 10 Minuten committet.
Aufrufe ausserhalb von cj_takt (Skripte ohne den Takt) sieht der Bericht NICHT — er ist eine Untergrenze.
"""
import collections, json, os, socket, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
FENSTER = int(os.environ.get("FENSTER_MIN", "60"))


def main():
    jetzt = time.time()
    ab = jetzt - FENSTER * 60
    n = collections.Counter()
    for tag in {time.strftime("%Y-%m-%d", time.gmtime(ab)), time.strftime("%Y-%m-%d", time.gmtime(jetzt)),
                time.strftime("%Y-%m-%d", time.localtime(ab)), time.strftime("%Y-%m-%d", time.localtime(jetzt))}:
        pfad = f"/tmp/cj_takt_{tag}.log"
        if not os.path.exists(pfad):
            continue
        for z in open(pfad, errors="replace"):
            t = z.rstrip("\n").split("\t", 1)
            try:
                if float(t[0]) >= ab:
                    n[t[1] if len(t) > 1 else "?"] += 1
            except ValueError:
                continue
    host = socket.gethostname().split(".")[0] or "unbekannt"
    ziel = os.path.join(REPO, "dropship", f"_cj_takt_{host}.json")
    stunde = time.strftime("%Y-%m-%dT%H:00Z", time.gmtime(jetzt))
    if os.path.exists(ziel) and "--immer" not in sys.argv:
        try:
            if json.load(open(ziel)).get("stunde") == stunde:
                return
        except (ValueError, OSError):
            pass
    d = {"host": host, "stunde": stunde, "stand": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(jetzt)),
         "fenster_min": FENSTER, "summe": sum(n.values()), "skripte": dict(n.most_common())}
    tmp = ziel + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    os.replace(tmp, ziel)
    print(f"CJ-TAKT {host}: {d['summe']} Aufrufe/{FENSTER} min · " +
          ", ".join(f"{k} {v}" for k, v in list(n.most_common())[:4]))


if __name__ == "__main__":
    main()
