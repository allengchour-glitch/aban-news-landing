#!/usr/bin/env python3
"""cj_reset_wache.py — misst, wann CJ die API-Punkte zurücksetzt, und ob das Vorrang-Fenster dort liegt (06.10.2026).

ANLASS: Das Vorrang-Fenster (Grind ruht, Videos/Kosten/Bewertungen bekommen die Punkte) stand fest auf 16:00 UTC, weil
am 15.08. ein Reset um 16:00 angenommen wurde. Gemessen am 05./06.10.: Topf leer ab ~04:00, «Remaining: 0» bis 23:08,
um 00:09 liest der Runner wieder — der Reset liegt bei 00:00 UTC. Der Video-Nachfüller fand um 16:14 sofort 16900500.

Quelle: die Grind-Logs /tmp/cj_runner*.log. Jede Runde beginnt mit «HH:MM:SS GRP=…»; danach steht entweder
«16900500 Insufficient API points» (Topf leer) oder eine gelesene Kategorie («total N»). Ein Wechsel leer → gelesen
markiert den Reset; die Stunde dieser ersten gelesenen Runde (minus Runner-Pause) ist die Messung.

Ausgabe: eine Zeile «CJ-RESET: …» für die Keepalive-Ampel; ⚠️ wenn die Mehrheit der Wechsel in einer anderen Stunde
liegt als dropship/_CJ_PUNKTE_RESET_UTC. Dazu «Topf leer ab HH:MM» = erste leere Runde nach dem letzten Reset.
  python3 automation/cj_reset_wache.py            # Ampel-Zeile
  python3 automation/cj_reset_wache.py --test     # Selbsttest an Beispiel-Logs
"""
import collections, glob, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLL_DATEI = os.path.join(REPO, "dropship", "_CJ_PUNKTE_RESET_UTC")
RUNDE = re.compile(r"^(\d\d):(\d\d):\d\d GRP=")
LEER = re.compile(r"16900500|Insufficient API points")
GELESEN = re.compile(r": total \d+|importiert|neu angelegt")


def runden(zeilen):
    """[(minuten_seit_mitternacht, 'leer'|'ok')] in Log-Reihenfolge."""
    out, cur, zust = [], None, None
    for z in zeilen:
        m = RUNDE.match(z)
        if m:
            if cur is not None and zust:
                out.append((cur, zust))
            cur, zust = int(m.group(1)) * 60 + int(m.group(2)), None
            continue
        if cur is None or zust:
            continue
        if LEER.search(z):
            zust = "leer"
        elif GELESEN.search(z):
            zust = "ok"
    if cur is not None and zust:
        out.append((cur, zust))
    return out


def wechsel(rs):
    """Stunden, in denen eine Runde nach einer leeren Runde wieder las (= Reset davor)."""
    h, leer_ab = [], []
    for (t0, z0), (t1, z1) in zip(rs, rs[1:]):
        if z0 == "leer" and z1 == "ok":
            h.append(t1 // 60)
        if z0 == "ok" and z1 == "leer":
            leer_ab.append(t1)
    return h, leer_ab


def soll():
    try:
        return int(re.sub(r"\D", "", open(SOLL_DATEI).read()) or 0) % 24
    except FileNotFoundError:
        return 0


def messen(dateien):
    stunden, leer = collections.Counter(), []
    for f in dateien:
        try:
            rs = runden(open(f, errors="replace").read().splitlines())
        except OSError:
            continue
        h, la = wechsel(rs)
        stunden.update(h)
        leer += la
    return stunden, leer


def zeile(stunden, leer, s):
    if not stunden:
        return f"CJ-RESET: kein Wechsel leer→gelesen in den Runner-Logs · Fenster ab {s:02d}:00 UTC (nicht nachgemessen)"
    top, n = stunden.most_common(1)[0]
    gesamt = sum(stunden.values())
    # Runner pausieren 30–60 min nach «leer»: die erste gelesene Runde liegt in der Reset-Stunde oder eine danach.
    ok = top in (s, (s + 1) % 24)
    letzt = f" · Topf zuletzt leer ab {leer[-1] // 60:02d}:{leer[-1] % 60:02d}" if leer else ""
    if ok:
        return f"CJ-RESET: gemessen {top:02d} UTC ({n}/{gesamt} Wechsel) = Fenster ab {s:02d}:00 ok{letzt}"
    return (f"⚠️ CJ-RESET: gemessen {top:02d} UTC ({n}/{gesamt} Wechsel), Fenster steht auf {s:02d}:00 → "
            f"dropship/_CJ_PUNKTE_RESET_UTC anpassen{letzt}")


def test():
    log = """23:08:23 GRP=a Runde=7
  ⛔ CJ-Fehler 16900500: Insufficient API points. Used today: 124430, Remaining: 0
00:09:46 GRP=a Runde=7
Diamond Painting: total 1 (Zeiger → Seite 79)
03:08:32 GRP=a Runde=7
Lace: total 0 (Zeiger → Seite 7)
04:09:04 GRP=a Runde=7
  ⛔ CJ-Fehler 16900500: Insufficient API points. Used today: 74510, Remaining: 0
05:08:36 GRP=a Runde=7
  ⛔ CJ-Fehler 16900500: Insufficient API points.""".splitlines()
    rs = runden(log)
    assert [z for _, z in rs] == ["leer", "ok", "ok", "leer", "leer"], rs
    h, la = wechsel(rs)
    assert h == [0] and la == [4 * 60 + 9], (h, la)
    st = collections.Counter(h)
    assert zeile(st, la, 0).startswith("CJ-RESET: gemessen 00 UTC"), zeile(st, la, 0)
    assert zeile(st, la, 16).startswith("⚠️ CJ-RESET"), zeile(st, la, 16)
    assert "Topf zuletzt leer ab 04:09" in zeile(st, la, 0)
    assert "kein Wechsel" in zeile(collections.Counter(), [], 0)
    print("Selbsttest 6/6")


if __name__ == "__main__":
    if "--test" in sys.argv:
        test()
        sys.exit(0)
    st, leer = messen(sorted(glob.glob("/tmp/cj_runner*.log")))
    print(zeile(st, leer, soll()))
