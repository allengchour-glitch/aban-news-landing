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


# Grenzen (per Umgebung nur für Tests verkürzbar) — gleiche Werte wie queue_csv.mjs
STABIL_S = float(os.environ.get("QUEUE_CSV_STABIL_MS", 1000)) / 1000      # fremd geschriebene Datei: so lange unverändert
SCHRUMPF_S = float(os.environ.get("QUEUE_CSV_SCHRUMPF_MS", 10000)) / 1000  # … mit weniger Datensätzen als unser letzter Stand
LESEN_MAX_S = float(os.environ.get("QUEUE_CSV_LESEN_MAX_MS", 20000)) / 1000
LEERE_SPERRE_S = float(os.environ.get("QUEUE_CSV_LEERE_SPERRE_MS", 10000)) / 1000


def _basis_pfad(datei):
    return "/tmp/queuecsv_" + re.sub(r"[^A-Za-z0-9._-]", "_", os.path.abspath(datei))


def sperr_pfad(datei):
    return _basis_pfad(datei) + ".lock"


def _stand_pfad(datei):
    return _basis_pfad(datei) + ".stand"


def _offenes_feld(text):
    return text.count('"') % 2 == 1


def _vollstaendig(t):
    return bool(t) and t.endswith("\n") and not _offenes_feld(t)


def _kennung(datei):
    st = os.stat(datei)
    return {"ino": str(st.st_ino), "size": str(st.st_size), "mtime": str(st.st_mtime_ns)}


def _stand_lesen(datei):
    try:
        import json
        with open(_stand_pfad(datei), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _stand_schreiben(datei, n):
    try:
        import json
        tmp = f"{_stand_pfad(datei)}.{os.getpid()}"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({**_kennung(datei), "n": n}, f)
        os.replace(tmp, _stand_pfad(datei))
    except Exception:
        pass


def frisch_lesen(datei, max_s=None):
    """Nur eine VOLLSTÄNDIGE Datei zählt (Stresstest 14.10.: git merge/checkout und O_TRUNC-Schreiber machen die Datei
    zeitweise halb sichtbar; eine halbe Datei, die zufällig auf einer Satzgrenze endet, sieht vollständig aus).
    1. Stimmt die Datei mit dem Stand überein, den der Helfer zuletzt geschrieben hat (Inode, Grösse, mtime) → sofort gültig.
    2. Sonst hat ein Fremder geschrieben: gültig erst, wenn sie vollständig ist UND STABIL_S unverändert war; mit weniger
       Datensätzen als unser letzter Stand (Queues sind Anhänge-Listen) erst nach SCHRUMPF_S.
    Ungültiges UTF-8 (Schnitt mitten im Zeichen) zählt als unvollständig. Nach LESEN_MAX_S None."""
    ende = time.time() + (LESEN_MAX_S if max_s is None else max_s)
    letzt, seit = None, 0.0
    while True:
        k = text = None
        try:
            k = _kennung(datei)
            with open(datei, "rb") as f:
                roh = f.read()
            text = roh.decode("utf-8") if len(roh) == int(k["size"]) else None
        except (OSError, ValueError):
            text = None
        if k is not None and text is not None:
            marke = _stand_lesen(datei)
            if marke and all(marke.get(x) == k[x] for x in ("ino", "size", "mtime")):
                return parse_csv(text)
            sig = f"{k['ino']}:{k['size']}:{k['mtime']}"
            if sig != letzt:
                letzt, seit = sig, time.time()
            if _vollstaendig(text):
                rows = parse_csv(text)
                schrumpft = bool(marke) and max(0, len(rows) - 1) < int(marke.get("n", 0))
                if time.time() - seit >= (SCHRUMPF_S if schrumpft else STABIL_S):
                    return rows
        else:
            letzt = None
        if time.time() > ende:
            return None
        time.sleep(0.05)


def lesen(datei):
    """Lesen für Leser/Poster am Anfang: dieselbe Prüfung wie frisch_lesen. Datei fehlt → []. Bleibt sie unvollständig →
    RuntimeError (lieber kein Lauf als ein Lauf auf halben Daten — eine abgeschnittene letzte Zeile kam sonst als Stummel zurück)."""
    if not os.path.exists(datei):
        return []
    r = frisch_lesen(datei)
    if r is not None:
        return r
    raise RuntimeError(f"queue_csv: {datei} bleibt unvollständig (halb geschrieben?) — nicht gelesen")


def _lebt(pid):
    try:
        os.kill(pid, 0)
        return True
    except PermissionError:
        return True
    except (OSError, ValueError):
        return False


def _sperre_nehmen(lp):
    """Inhalt «pid zeit» entsteht atomar (Hilfsdatei + link) — eine leere Sperrdatei gibt es dadurch nicht mehr."""
    tmp = f"{lp}.{os.getpid()}.{random.randrange(1 << 30):x}"
    with open(tmp, "w") as f:
        f.write(f"{os.getpid()} {int(time.time() * 1000)}")
    try:
        os.link(tmp, lp)
        return True
    except FileExistsError:
        return False
    finally:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass


def _sperre_inhalt(lp):
    try:
        with open(lp) as f:
            return f.read().strip(), os.stat(lp).st_mtime
    except OSError:
        return None


def _veraltet(inh):
    txt, mt = inh
    teile = txt.split()
    try:
        pid, t = int(teile[0]), int(teile[1])
    except (IndexError, ValueError):
        return time.time() - mt > LEERE_SPERRE_S   # leer/kaputt (alte Fassung, Absturz beim Anlegen)
    return not _lebt(pid) or time.time() * 1000 - t > SPERRE_ALT_S * 1000


def _veraltet_wegraeumen(lp, inh):
    weg = f"{lp}.weg.{os.getpid()}.{random.randrange(1 << 30):x}"
    try:
        os.rename(lp, weg)
    except OSError:
        return
    try:
        with open(weg) as f:
            jetzt = f.read().strip()
    except OSError:
        jetzt = ""
    if jetzt != inh[0]:   # inzwischen eine neue (lebende) Sperre → zurücklegen
        try:
            os.link(weg, lp)
        except OSError:
            pass
    try:
        os.unlink(weg)
    except OSError:
        pass


class mit_sperre:
    def __init__(self, datei):
        self.lp = sperr_pfad(datei)

    def __enter__(self):
        ende = time.time() + SPERRE_WARTEN_S
        while True:
            if _sperre_nehmen(self.lp):
                return self
            inh = _sperre_inhalt(self.lp)
            if inh and _veraltet(inh):
                _veraltet_wegraeumen(self.lp, inh)
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
    """Atomar (Nachbardatei + os.replace) und den eigenen Stand merken (für frisch_lesen). Nur unter der Sperre aufrufen."""
    tmp = os.path.join(os.path.dirname(datei) or ".", f".{os.path.basename(datei)}.tmp-{os.getpid()}")
    with open(tmp, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    os.replace(tmp, datei)
    _stand_schreiben(datei, max(0, len(parse_csv(text)) - 1))


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


POST = re.compile(r"^post(ed|ing)")
POST_FELDER = {"status", "posted_at", "post_url"}


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
    stat = dict(fremd_behalten=0, eigen_geaendert=0, eigen_neu=0, eigen_geloescht=0, fremd_fehlend_behalten=0,
                fremd_gepostet_behalten=0)
    aus = []
    for s in f_reihe:
        f, m, b = F[s], M.get(s), B.get(s)
        if m is not None and b is not None:
            # Posten ist unumkehrbar: fremd gesetztes posting/posted* gewinnt samt posted_at/post_url, ausser ich setze selbst
            # einen Post-Status (gleiche Regel wie queue_csv.mjs).
            fremd_gepostet = ("status" in kopf and POST.match(_w(f, "status")) and _w(f, "status") != _w(b, "status")
                              and not POST.match(_w(m, "status")))
            if fremd_gepostet:
                stat["fremd_gepostet_behalten"] += 1
            o, eigen = {}, False
            for c in kopf:
                mv, bv = _w(m, c), _w(b, c)
                if fremd_gepostet and c in POST_FELDER:
                    o[c] = _w(f, c)
                elif m.get(c) is not None and mv != bv:
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
            # 20.10.2026: kürzere Zeile auf Kopfbreite auffüllen. Der Poster (ig_karussell_post.mjs) hängt dem Kopf nachträglich `posted_at,post_url`
            # an; ein Schreiber, der nur die alten 7 Felder kennt, hinterliess 7 Zeilen mit 7 statt 9 Feldern (QUEUE-STRUKTUR ⚠️ 7 Befunde).
            if len(z) < len(rows[0]):
                z = z + [""] * (len(rows[0]) - len(z))
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
    global STABIL_S, SCHRUMPF_S, LESEN_MAX_S, LEERE_SPERRE_S
    alt = (STABIL_S, SCHRUMPF_S, LESEN_MAX_S, LEERE_SPERRE_S)
    STABIL_S, SCHRUMPF_S, LESEN_MAX_S, LEERE_SPERRE_S = 0.2, 1.5, 2.5, 0.3
    try:
        return _selbsttest_innen()
    finally:
        STABIL_S, SCHRUMPF_S, LESEN_MAX_S, LEERE_SPERRE_S = alt


def _fremd_schreiben(pfad, teil1, teil2, ms):
    """Fremder Schreiber mit O_TRUNC: erst teil1, nach ms den Rest (eigener Prozess)."""
    import subprocess
    import base64
    code = ("import sys,base64,time;p=sys.argv[1];open(p,'wb').write(base64.b64decode(sys.argv[2]));"
            f"time.sleep({ms / 1000});open(p,'ab').write(base64.b64decode(sys.argv[3]))")
    return subprocess.Popen([sys.executable, "-c", code, pfad, base64.b64encode(teil1).decode(), base64.b64encode(teil2).decode()])


def _selbsttest_innen():
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
    b6 = [K, ["a", "1", "u1", "c", "ready", ""]]
    m6, f6 = schnappschuss(b6), schnappschuss(b6)
    m6[1][4], f6[1][4], f6[1][5] = "jury-skip", "posted-ig-fb", "T9"
    r6, s6 = zusammenfuehren(b6, m6, f6)
    pruef(r6[1][4] == "posted-ig-fb" and r6[1][5] == "T9" and s6["fremd_gepostet_behalten"] == 1, f"fremd gepostet {r6[1]}")
    m7, f7 = schnappschuss(b6), schnappschuss(b6)
    m7[1][4], m7[1][5], f7[1][4] = "posted-tiktok", "T1", "posting"
    r7 = zusammenfuehren(b6, m7, f7)[0][1]
    pruef(r7[4] == "posted-tiktok" and r7[5] == "T1", f"eigener Post gewinnt {r7}")
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
    # 20.10.2026: kürzere Zeile wird auf Kopfbreite aufgefüllt (7-Feld-Schreiber gegen 9-Feld-Kopf); längere bleibt unangetastet
    q_kurz = os.path.join(d, "q_kurz.csv")                   # eigene Datei: der Folgetest erwartet den Bestand von q unverändert
    with open(q_kurz, "w") as f:
        f.write(serialisieren(basis))
    pruef(anhaengen(q_kurz, [["kurz", "2", "u5", "x"]]) == 1, "anhaengen kurze Zeile")
    breit = frisch_lesen(q_kurz)
    pruef(len(breit[-1]) == len(breit[0]) and breit[-1][0] == "kurz", f"kurze Zeile auf Kopfbreite {len(breit[0])}, ist {len(breit[-1])}")
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
    # Stresstest 14.10. A/B: O_TRUNC-Schreiber, halbe Datei endet auf einer Satzgrenze, Rest 400 ms später
    os.unlink(q)
    atomar_schreiben(q, ganz)                       # eigener Stand (Marke) = 100 Datensätze
    gb = ganz.encode()
    grenze = gb.index(b"\n", len(gb) // 2) + 1
    kind = _fremd_schreiben(q, gb[:grenze], gb[grenze:], 400)
    time.sleep(0.25)
    pruef(anhaengen(q, [["neuA", "1", "u", "c", "ready", ""]]) == 1, "A: anhaengen während Fremdschreiben")
    kind.wait()
    na = lesen(q)
    pruef(len(na) == 102 and na[101][0] == "neuA", f"A: halbe Datei auf Satzgrenze — {len(na) - 1} statt 101 Datensätze")
    kind = _fremd_schreiben(q, gb[:grenze], gb[grenze:], 400)
    time.sleep(0.25)
    lb = lesen(q)
    kind.wait()
    pruef(len(lb) == 101, f"B: lesen() während Fremdschreiben — {len(lb) - 1} statt 100")
    # C: Schnitt mitten in einem UTF-8-Zeichen (früher UnicodeDecodeError)
    et = serialisieren([K, ["e1", "1", "u", "Herbst 🍂 Deko", "ready", ""]]).encode()
    sc = et.index("🍂".encode()) + 2
    kind = _fremd_schreiben(q, et[:sc], et[sc:], 400)
    time.sleep(0.25)
    lc = lesen(q)
    kind.wait()
    pruef(len(lc) == 2 and lc[1][3] == "Herbst 🍂 Deko", f"C: UTF-8-Schnitt — {lc[1:] }")
    # D: leere Sperrdatei: nicht sofort übernehmen, nach LEERE_SPERRE_S schon
    with open(q, "w") as f:
        f.write(ganz)
    open(sperr_pfad(q), "w").close()
    t0 = time.time()
    pruef(anhaengen(q, [["neuD", "1", "u", "c", "ready", ""]]) == 1, "D: leere Sperre übernommen")
    dauer = time.time() - t0
    pruef(0.28 <= dauer < 5, f"D: leere Sperre nach {dauer:.2f} s übernommen (soll ≥ 0.3 s, < 5 s)")
    pruef(not os.path.exists(sperr_pfad(q)), "D: keine Sperrdatei liegengeblieben")
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
    for x in (_stand_pfad(q), sperr_pfad(q)):
        try:
            os.unlink(x)
        except OSError:
            pass
    return fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        f = selbsttest()
        print(f"❌ queue_csv.py: {len(f)} Fehler\n - " + "\n - ".join(f) if f else "✅ queue_csv.py Selbsttest ok")
        sys.exit(1 if f else 0)
    print(__doc__)
