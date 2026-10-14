#!/usr/bin/env python3
"""queue_csv.py — EIN Weg, eine geteilte Social-Queue-CSV zu schreiben (14.10.2026).

Gegenstück zu automation/lib/queue_csv.mjs — GLEICHE Sperrdatei (/tmp/queuecsv_<pfad>.lock), gleiche 3-Wege-Regel.
ANLASS: Poster und Wächter lasen automation/reels_seed.csv bzw. social/*.csv, arbeiteten Minuten und schrieben die GANZE
Datei aus der alten Kopie zurück → Zeilen, die ein anderer Prozess dazwischen angehängt/geändert hatte, verschwanden
(GEMESSEN 14.10.: 8 fertige Reels ohne Queue-Zeile).

    from queue_csv import lesen, schnappschuss, schreiben, anhaengen, umbauen
    rows = lesen(CSV); basis = schnappschuss(rows)
    ... rows[i][status_i] = "posted"
    schreiben(CSV, basis, rows); basis = schnappschuss(rows)
    umbauen(CSV, lambda frisch: [r for r in frisch if ...])   # Säuberer: Filter auf den FRISCHEN Stand unter der Sperre

Regel je Feld: die eigene Änderung (meine ≠ basis) gewinnt, sonst gilt der frische Stand. Fremd angehängte Zeilen bleiben,
selbst gelöschte bleiben weg (ausser fremd geändert). Atomar über Nachbardatei + os.replace.

    python3 automation/queue_csv.py --selbsttest
"""
import csv
import io
import os
import random
import re
import sys
import time

SPERRE_WARTEN_S = 60
SPERRE_ALT_S = 120


def parse_csv(text):
    # gleiche Lesart wie parseCsv() in queue_csv.mjs: \r ausserhalb von Anführungszeichen fällt weg
    return [list(r) for r in csv.reader(io.StringIO(text.replace("\r\n", "\n")))]


def _esc(v):
    v = "" if v is None else str(v)
    return '"' + v.replace('"', '""') + '"' if re.search(r'[",\n\r]', v) else v


def serialisieren(rows):
    return "".join(",".join(_esc(v) for v in r) + "\n" for r in rows)


def schnappschuss(rows):
    return [list(r) for r in rows]


def lesen(datei):
    if not os.path.exists(datei):
        return []
    with open(datei, encoding="utf-8", newline="") as f:
        return parse_csv(f.read())


def _offenes_feld(text):
    return text.count('"') % 2 == 1


def frisch_lesen(datei, versuche=50):
    """Nur eine VOLLSTÄNDIGE Datei zählt (Prüfer 14.10.: git merge/checkout und nicht umgestellte Schreiber legen die Datei
    neu an bzw. schreiben mit O_TRUNC). Gültig = nicht leer, endet auf Zeilenumbruch, kein offenes Anführungszeichen,
    zweimal im Abstand von 30 ms gleich gelesen. Sonst bis ~4 s neu versuchen; danach None."""
    for _ in range(versuche):
        try:
            with open(datei, encoding="utf-8", newline="") as f:
                a = f.read()
            time.sleep(0.03)
            with open(datei, encoding="utf-8", newline="") as f:
                b = f.read()
            if a == b and a and a.endswith("\n") and not _offenes_feld(a):
                return parse_csv(a)
        except OSError:
            pass
        time.sleep(0.05)
    return None


def sperr_pfad(datei):
    return "/tmp/queuecsv_" + re.sub(r"[^A-Za-z0-9._-]", "_", os.path.abspath(datei)) + ".lock"


def _lebt(pid):
    try:
        os.kill(pid, 0)
        return True
    except PermissionError:
        return True
    except (OSError, ValueError):
        return False


def _veraltet(lp):
    try:
        with open(lp) as f:
            pid, t = f.read().split()[:2]
        return not _lebt(int(pid)) or time.time() * 1000 - int(t) > SPERRE_ALT_S * 1000
    except Exception:
        return True


class mit_sperre:
    def __init__(self, datei):
        self.lp = sperr_pfad(datei)

    def __enter__(self):
        ende = time.time() + SPERRE_WARTEN_S
        while True:
            try:
                fd = os.open(self.lp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
                os.write(fd, f"{os.getpid()} {int(time.time() * 1000)}".encode())
                os.close(fd)
                return self
            except FileExistsError:
                if _veraltet(self.lp):
                    time.sleep(0.03)
                    if _veraltet(self.lp):
                        try:
                            os.unlink(self.lp)
                        except FileNotFoundError:
                            pass
                    continue
                if time.time() > ende:
                    raise RuntimeError(f"queue_csv: Sperre {self.lp} seit {SPERRE_WARTEN_S} s belegt — nichts geschrieben")
                time.sleep(0.025 + random.random() * 0.05)

    def __exit__(self, *a):
        try:
            with open(self.lp) as f:
                mein = f.read().startswith(f"{os.getpid()} ")
            if mein:
                os.unlink(self.lp)
        except FileNotFoundError:
            pass
        return False


def atomar_schreiben(datei, text):
    tmp = os.path.join(os.path.dirname(datei) or ".", f".{os.path.basename(datei)}.tmp-{os.getpid()}")
    with open(tmp, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    os.replace(tmp, datei)


def _schluessel(rows, id_i):
    n, aus = {}, []
    for r in rows[1:]:
        i = r[id_i] if id_i < len(r) else ""
        c = n.get(i, 0)
        n[i] = c + 1
        aus.append(f"{i}\0{c}")
    return aus


def _karte(rows, kopf):
    k, reihe = {}, []
    if not rows:
        return k, reihe
    h = rows[0]
    id_i = h.index("id") if "id" in h else 0
    reihe = _schluessel(rows, id_i)
    for s, r in zip(reihe, rows[1:]):
        k[s] = {c: ((r[h.index(c)] if h.index(c) < len(r) else "") if c in h else None) for c in kopf}
    return k, reihe


def _w(o, c):
    v = o.get(c)
    return "" if v is None else v


def _gleich(a, b, kopf):
    return all(_w(a, c) == _w(b, c) for c in kopf)


def zusammenfuehren(basis, meine, frisch):
    kopf = list(frisch[0] if frisch else (meine[0] if meine else (basis[0] if basis else [])))
    for h in (meine[0] if meine else []):
        if h not in kopf:
            kopf.append(h)
    B, _ = _karte(basis, kopf)
    M, m_reihe = _karte(meine, kopf)
    F, f_reihe = _karte(frisch, kopf)
    stat = dict(fremd_behalten=0, eigen_geaendert=0, eigen_neu=0, eigen_geloescht=0, fremd_fehlend_behalten=0)
    aus = []
    for s in f_reihe:
        f, m, b = F[s], M.get(s), B.get(s)
        if m is not None and b is not None:
            o, eigen = {}, False
            for c in kopf:
                mv, bv = _w(m, c), _w(b, c)
                if m.get(c) is not None and mv != bv:
                    o[c] = mv
                    eigen = eigen or mv != _w(f, c)
                else:
                    o[c] = _w(f, c)
            if eigen:
                stat["eigen_geaendert"] += 1
            aus.append(o)
        elif m is not None:
            aus.append(f)
        elif b is not None:
            if _gleich(f, b, kopf):
                stat["eigen_geloescht"] += 1
            else:
                aus.append(f)
        else:
            aus.append(f)
            stat["fremd_behalten"] += 1
    for s in m_reihe:
        if s in F:
            continue
        m, b = M[s], B.get(s)
        aus.append(m)
        if b is None:
            stat["eigen_neu"] += 1
        elif not _gleich(m, b, kopf):
            stat["eigen_geaendert"] += 1
        else:
            # gelesen, nicht selbst gelöscht, fehlt jetzt: Queues sind Anhänge-Listen → gekürzte/zurückgesetzte Datei, bleibt
            stat["fremd_fehlend_behalten"] += 1
    return [kopf] + [[_w(o, c) for c in kopf] for o in aus], stat


def schreiben(datei, basis, meine):
    """Eigene Änderungen (meine gegenüber basis) in den FRISCHEN Stand schreiben. Danach basis = schnappschuss(meine)."""
    with mit_sperre(datei):
        frisch = frisch_lesen(datei)
        if frisch is None:
            # keine gültige frische Datei: eigene vollständige Fassung schreiben (so heilte der alte Weg, nichts geht verloren)
            print(f"[queue_csv] {datei}: frische Datei leer/halb geschrieben — schreibe die eigene vollständige Fassung", file=sys.stderr)
            frisch = basis
        rows, stat = zusammenfuehren(basis, meine, frisch)
        atomar_schreiben(datei, serialisieren(rows))
        return stat


def anhaengen(datei, zeilen):
    with mit_sperre(datei):
        rows = frisch_lesen(datei)
        if not rows:
            raise RuntimeError(f"queue_csv: {datei} fehlt/leer/halb geschrieben — nichts angehängt")
        id_i = rows[0].index("id") if "id" in rows[0] else 0
        da = {r[id_i] for r in rows[1:] if id_i < len(r)}
        neu = 0
        for z in zeilen:
            z = ["" if v is None else str(v) for v in z]
            if z[id_i] in da:
                continue
            rows.append(z)
            da.add(z[id_i])
            neu += 1
        if neu:
            atomar_schreiben(datei, serialisieren(rows))
        return neu


def umbauen(datei, fn):
    """fn(frische_rows) → neue rows oder None (nichts schreiben). Läuft unter der Sperre auf dem FRISCHEN Stand."""
    with mit_sperre(datei):
        frisch = frisch_lesen(datei)
        if not frisch:
            raise RuntimeError(f"queue_csv: {datei} fehlt/leer/halb geschrieben — nichts umgebaut")
        neu = fn(frisch)
        if neu is not None:
            atomar_schreiben(datei, serialisieren(neu))
        return neu is not None


def selbsttest():
    import tempfile
    import shutil
    fehler = []

    def pruef(ok, was):
        if not ok:
            fehler.append(was)
    K = ["id", "scheduled_date", "video_url", "caption", "status", "posted_at"]
    basis = [K, ["a", "1", "u1", "c,1", "ready", ""], ["b", "1", "u2", "c2", "ready", ""], ["c", "1", "u3", "c3", "ready", ""]]
    meine = schnappschuss(basis)
    meine[1][4], meine[1][5] = "posted", "T1"
    del meine[3]
    frisch = schnappschuss(basis)
    frisch.append(["d", "2", "u4", 'neu "x"', "ready", ""])
    frisch[2][3] = "c2-neu"
    rows, stat = zusammenfuehren(basis, meine, frisch)
    pruef("".join(r[0] for r in rows[1:]) == "abd", f"Bestand abd, ist {[r[0] for r in rows[1:]]}")
    pruef(rows[1][4] == "posted" and rows[1][5] == "T1", "eigene Statusänderung")
    pruef(rows[2][3] == "c2-neu", "fremde Caption behalten")
    pruef(rows[3][3] == 'neu "x"', "fremde Zeile behalten")
    pruef(stat["fremd_behalten"] == 1 and stat["eigen_geloescht"] == 1 and stat["eigen_geaendert"] == 1, f"Statistik {stat}")
    b2 = [K, ["a", "1", "u1", "c", "ready", ""]]
    m2, f2 = schnappschuss(b2), schnappschuss(b2)
    m2[1][4], f2[1][4], f2[1][3] = "posted", "skip", "neu"
    r2 = zusammenfuehren(b2, m2, f2)[0][1]
    pruef(r2[4] == "posted" and r2[3] == "neu", f"feldweise {r2}")
    b3 = [K, ["a", "1", "u", "c", "ready", ""], ["b", "1", "u", "c", "ready", ""]]
    m3 = schnappschuss(b3)
    m3[2][4] = "posted"
    r3, s3 = zusammenfuehren(b3, m3, [K])
    pruef(len(r3) == 3 and r3[2][4] == "posted" and s3["fremd_fehlend_behalten"] == 1, f"gekürzte Datei {r3} {s3}")
    f4 = [K + ["neu_spalte"], ["a", "1", "u1", "c", "ready", "", "x"]]
    b4 = [K, ["a", "1", "u1", "c", "ready", ""]]
    m4 = schnappschuss(b4)
    m4[1][4] = "posted"
    r4 = zusammenfuehren(b4, m4, f4)[0]
    pruef(len(r4[0]) == 7 and r4[1][6] == "x" and r4[1][4] == "posted", f"Spaltenabbildung {r4}")
    txt = 'id,caption\nx,"a,b\nzweite ""Zeile"""\ny,z\n'
    pruef(serialisieren(parse_csv(txt)) == txt, "Rundlauf parse/serialisieren")
    # Gleichlauf mit der Node-Fassung: gleiche Sperrdatei, gleiche Ausgabe
    d = tempfile.mkdtemp(prefix="queuecsv-test-")
    q = os.path.join(d, "q.csv")
    with open(q, "w") as f:
        f.write(serialisieren(basis))
    pruef(anhaengen(q, [["d", "2", "u4", "x", "ready", ""]]) == 1 and anhaengen(q, [["d", "2", "u4", "x", "ready", ""]]) == 0, "anhaengen ohne Doppel")
    st = schreiben(q, basis, meine)
    pruef("".join(r[0] for r in lesen(q)[1:]) == "abd" and st["fremd_behalten"] == 1, f"schreiben auf Datei {st}")
    pruef(not any(".tmp-" in x for x in os.listdir(d)), "keine Nachbardatei liegengeblieben")
    voll = [K] + [[f"z{i}", "1", "u", "c,x", "ready", ""] for i in range(100)]
    mv = schnappschuss(voll)
    mv[5][4] = "posted"
    open(q, "w").close()
    schreiben(q, voll, mv)
    nl = lesen(q)
    pruef(len(nl) == 101 and nl[5][4] == "posted", f"leere Datei: {len(nl) - 1} Zeilen")
    ganz = serialisieren(voll)
    with open(q, "w") as f:
        f.write(ganz[: int(len(ganz) * 0.3)])
    schreiben(q, voll, mv)
    nh = lesen(q)
    pruef(len(nh) == 101 and all(len(r) == len(K) for r in nh), f"30-%-Datei: {len(nh) - 1} Zeilen")
    with open(q, "w") as f:
        f.write(ganz[: int(len(ganz) * 0.3)])
    try:
        anhaengen(q, [["neu", "1", "u", "c", "ready", ""]])
        pruef(False, "anhaengen an halbe Datei bricht ab statt zu kürzen")
    except RuntimeError:
        pass
    with open(q, "w") as f:
        f.write(ganz)
    with open(sperr_pfad(q), "w") as f:
        f.write(f"999999 {int(time.time() * 1000)}")
    pruef(anhaengen(q, [["e", "3", "u", "x", "ready", ""]]) == 1, "tote Sperre übernommen")
    js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib", "queue_csv.mjs")
    if os.path.exists(js):
        import subprocess
        code = ("import('" + js + "').then(m => process.stdout.write(m.sperrPfad(process.argv[1]) + '\\n' + "
                "m.serialisieren(m.parseCsv(require('fs').readFileSync(process.argv[1], 'utf8')))))")
        r = subprocess.run(["/opt/node22/bin/node", "-e", code, q], capture_output=True, text=True, timeout=30)
        sp, _, ser = r.stdout.partition("\n")
        pruef(sp == sperr_pfad(q), f"gleiche Sperrdatei wie Node ({sp} ≠ {sperr_pfad(q)})")
        with open(q, encoding="utf-8") as f:
            pruef(ser == f.read(), "Node liest+schreibt die Datei identisch")
    shutil.rmtree(d, ignore_errors=True)
    return fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        f = selbsttest()
        print(f"❌ queue_csv.py: {len(f)} Fehler\n - " + "\n - ".join(f) if f else "✅ queue_csv.py Selbsttest ok")
        sys.exit(1 if f else 0)
    print(__doc__)
