#!/usr/bin/env python3
"""Zombie-Scan für Pilot 2.0 (aus der 17./18. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1, kein Netz.

Ein EINGEFRORENER Lauf (Ruhezustand des Rechners: Herzschlag UND Lauf stehen) gilt nach `ALT_NACH_TOT` als tot; die Nachkontrolle (oder ein Not-Aus) übernimmt seine Sperre und arbeitet. Wacht der alte Lauf («Zombie») danach auf,
führt er seinen veralteten Plan aus. Seit R17/R18 prüft er VOR jedem schreibenden Auftrag UND vor jedem Schreiben des Buchs die Marke der Sperrdatei (`sperre.pruefen()`) und tut danach nichts mehr. Dieser Scan stellt das nach:

  T (Tageslauf | Not-Aus | Nachkontrolle) friert VOR seinem j-ten `sperre.pruefen()` ein — j läuft über ALLE Prüfstellen, also vor jedem schreibenden Auftrag und vor jedem Schreiben des Buchs. B (die Nachkontrolle)
  übernimmt die Sperre. Dann wacht T auf: ab jetzt wirft jedes `pruefen()` von T `SperreVerloren` (wie nach der Übernahme der Sperre); Lesen geht weiter.

Gemessen (USDT ohne Stop, wie der Fuzzer rechnet): (1) `nach_b` = nach B allein, (2) `sofort` = nachdem der Zombie ausgedient hat (das Fenster bis zur nächsten Nachkontrolle), (3) `final` = nach einer zweiten Nachkontrolle (10 Minuten später).
Befund (jeder ist ein Fehler):
  FINAL_OHNE_STOP   nach der zweiten Nachkontrolle bleibt etwas ohne Stop (trotz Vermerk), bzw. im Not-Aus-Modus ist nicht alles flach
  AUSNAHME          T, B oder die zweite Nachkontrolle werfen eine unerwartete Ausnahme
Statistik (kein Befund): `sofort_ungeschuetzt` = Fälle, in denen DIREKT nach dem Zombie etwas ohne Stop lag (die Lücke bis zur nächsten Nachkontrolle).

Aufruf:
  python3 -B pruef_zombie.py MODUS VON BIS [AUSGABE.json]
      MODUS: tag      T = Tageslauf (VON..BIS-1 = Szenario-Indizes wie pruef_raster, 12 Szenarien)
             notaus   T = Not-Aus (STOP-Datei liegt), B = Nachkontrolle im Not-Aus-Modus
             nk       T = Nachkontrolle, die selbst eingefroren war (der Tageslauf starb zuvor nach dem 1., mittleren, letzten Auftrag)
             aufwachen  T wacht MITTEN in B auf (vor B's k-tem schreibenden Auftrag bzw. k-ter Anfrage) — Beleg W1′: der Zombie darf auch das Buch nicht mehr schreiben
  PRUEF_STRENG=1 für die strenge Prüf-Börse, PRUEF_LUECKEN=1 für Konten ohne STOP_LOSS."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import traceback
import urllib.request
from collections import Counter
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.dont_write_bytecode = True
import pruef_kill as K  # noqa: E402  (importiert pruef_fuzzer + pruef_raster, startet die Prüf-Börse auf 127.0.0.1)
import sperre  # noqa: E402

P = K.P
B = K.B
L = P.L
R = K.R

_orig_urlopen = urllib.request.urlopen
_echte_pruefung = sperre.pruefen          # das echte `sperre.pruefen()` — scan() ersetzt es während eines Laufs und stellt es danach wieder her
VETO = {"an": False, "zaehler": 0}
_ST = {"z": None}


def _pruefen_test():
    """Ersatz für `sperre.pruefen()` während eines Falls: T hält vor seinem j-ten Aufruf an; nach dem Aufwachen wirft jeder Aufruf von T `SperreVerloren`."""
    st = _ST["z"]
    if st is not None and threading.current_thread() is st["t_ref"][0]:
        if st["ort"] == "pruefen":
            st["n"] += 1
            st["t_schreibend"] += 1
            if st["j"] and st["n"] == st["j"] and not st["erreicht"]:
                st["erreicht"] = True
                st["pause"].set()
                st["weiter"].wait()
        if VETO["an"]:
            VETO["zaehler"] += 1
            raise sperre.SperreVerloren("Test: Sperre von B übernommen — kein Auftrag mehr.")


def sperren_altern(sekunden=1000.0):
    """Der eingefrorene Prozess hat auch keinen Herzschlag: die Sperren, die er hält (die kurze Buch-Sperre, wenn er mitten im Schreiben eingefroren ist), altern — sonst würde B im Test an ihr warten, weil ein
    Thread-Herzschlag sie frisch hält (im echten Ruhezustand steht auch dieser Thread). B übernimmt sie dann wie eine tote Sperre (`alt_nach`)."""
    jetzt = time.time()
    with sperre._gehalten_sperre:
        pfade = list(sperre._gehalten)
    for pfad in pfade:
        try:
            os.utime(pfad, (jetzt - sekunden, jetzt - sekunden))
        except OSError:
            pass


def ist_schreibend(req):
    m = getattr(req, "method", None)
    return m in ("POST", "DELETE", "PUT") or (getattr(req, "data", None) is not None and m != "GET")


def eingefroren(fn_t, fn_b, j, ort="pruefen"):
    """T = fn_t() läuft in einem Thread und hält VOR seinem j-ten `pruefen()` (1-basiert; ort='urlopen': vor dem j-ten schreibenden Senden). Dann läuft fn_b() im Hauptthread ganz durch (B übernimmt),
    danach wird T fortgesetzt — mit Veto für jede weitere Prüfstelle. j = 0: kein Einfrieren (Referenzlauf). → dict(erreicht, t, b, t_fehler, b_fehler, t_schreibend)"""
    z = dict(erreicht=False, n=0, t=None, b=None, t_fehler=None, b_fehler=None, t_schreibend=0, j=j, ort=ort,
             pause=threading.Event(), weiter=threading.Event(), t_ref=[None])
    fertig = threading.Event()

    def urlopen(req, *a, **k):
        if ort == "urlopen" and threading.current_thread() is z["t_ref"][0] and ist_schreibend(req):
            z["n"] += 1
            z["t_schreibend"] += 1
            if j and z["n"] == j and not z["erreicht"]:
                z["erreicht"] = True
                z["pause"].set()
                z["weiter"].wait()
        return _orig_urlopen(req, *a, **k)

    def ziel():
        try:
            z["t"] = fn_t()
        except BaseException:  # noqa: BLE001
            z["t_fehler"] = traceback.format_exc()[-1200:]
        finally:
            fertig.set()
            z["pause"].set()

    VETO["an"] = False
    VETO["zaehler"] = 0
    _ST["z"] = z
    urllib.request.urlopen = urlopen
    try:
        t = threading.Thread(target=ziel, daemon=True)
        z["t_ref"][0] = t
        t.start()
        z["pause"].wait()
        if z["erreicht"] and not fertig.is_set():
            sperren_altern()
            try:
                z["b"] = fn_b()
            except BaseException:  # noqa: BLE001
                z["b_fehler"] = traceback.format_exc()[-1200:]
            VETO["an"] = True       # ab jetzt gehört die Sperre B: jede Prüfstelle von T wird abgelehnt
            z["weiter"].set()
        t.join()
    finally:
        urllib.request.urlopen = _orig_urlopen
        VETO["an"] = False
        _ST["z"] = None
    return z


def nk_b(env, d):
    P.pending_abarbeiten()
    B.n_listen += 1000
    return P.nachkontrolle(env, d)


def fall_tag(sz, j):
    markt, z0, z1 = sz
    k, d, env = K.tag0(sz)
    mess = {}

    def fn_b():
        r = nk_b(env, d)
        mess["nach_b"] = K.betrag(K.befunde(k, d))
        return r
    z = eingefroren(lambda: P.lauf([P.E(markt, z1)], env, d), fn_b, j)
    return k, d, env, z, mess


def fall_notaus(sz, j):
    import broker_futures as BF
    markt, z0, z1 = sz
    BF.STOP_DATEI.unlink(missing_ok=True)
    k, d, env = K.tag0(sz)
    mess = {}
    BF.STOP_DATEI.write_text("pruef_zombie")

    def fn_b():
        r = nk_b(env, d)
        mess["nach_b"] = K.betrag(K.befunde(k, d))
        return r
    try:
        z = eingefroren(lambda: P.lauf([P.E(markt, z1)], env, d, notaus=True), fn_b, j)
        return k, d, env, z, mess
    except BaseException:
        BF.STOP_DATEI.unlink(missing_ok=True)
        raise


def fall_nk(sz, n1, j):
    markt, z0, z1 = sz
    k, d, env = K.tag0(sz)
    r1 = subprocess.run([sys.executable, "-B", str(HIER / "pruef_kill.py"), "--kind", json.dumps(env), json.dumps([P.E(markt, z1)]), str(d), str(n1), str(P.TMP)],
                        capture_output=True, text=True, timeout=180)
    if r1.returncode not in (0, 9):
        return None
    P.pending_abarbeiten()
    B.n_listen += 1000
    mess = {}

    def fn_b():
        r = nk_b(env, d)
        mess["nach_b"] = K.betrag(K.befunde(k, d))
        return r

    def fn_t():
        P.pending_abarbeiten()
        B.n_listen += 1000
        return P.nachkontrolle(env, d)
    z = eingefroren(fn_t, fn_b, j)
    return k, d, env, z, mess


def auswerten(si, sz, j, k, d, env, z, mess, modus):
    import broker_futures as BF
    if not z["erreicht"]:
        BF.STOP_DATEI.unlink(missing_ok=True)
        return None
    m = dict(si=si, sz=sz, j=j, modus=modus, t_fehler=z["t_fehler"], b_fehler=z["b_fehler"], nach_b=mess.get("nach_b"))
    m["sofort"] = K.betrag(K.befunde(k, d))
    m["sofort_arten"] = [b[0] for b in K.befunde(k, d)]
    m["vermerkt"] = P.vermerkt_je_markt(d)
    m["veto_n"] = VETO["zaehler"]
    try:
        P.pending_abarbeiten()
        B.n_listen += 1000
        P.nachkontrolle(env, d)
        m["final"] = K.betrag(K.befunde(k, d))
        m["final_arten"] = [b[0] for b in K.befunde(k, d)]
        m["lage"] = P.zeigen(k)
        if modus == "notaus":
            m["flach"] = P.flach(k)
    except BaseException:  # noqa: BLE001
        m["final_fehler"] = traceback.format_exc()[-500:]
    m["vermerkt_final"] = P.vermerkt_je_markt(d)
    if modus == "notaus":
        BF.STOP_DATEI.unlink(missing_ok=True)
    return m


class Zweier:
    """Zwei Threads: A (friert vor dem j-ten `pruefen()` ein) und B (hält vor seinem k-ten schreibenden Auftrag bzw. seiner k-ten Anfrage). A wacht MITTEN in B auf und ist ab dann vetoed."""

    def __init__(self, fn_a, fn_b, j, k, b_art="schreiben"):
        self.fn_a, self.fn_b, self.j, self.k, self.b_art = fn_a, fn_b, j, k, b_art
        self.a_n = 0
        self.b_n = 0
        self.a_pause, self.a_weiter, self.a_fertig = threading.Event(), threading.Event(), threading.Event()
        self.b_pause, self.b_weiter, self.b_fertig = threading.Event(), threading.Event(), threading.Event()
        self.ta = self.tb = None
        self.a_res = self.b_res = None
        self.a_err = self.b_err = None
        self.a_erreicht = self.b_erreicht = False
        self.veto = False
        self.veto_n = 0

    def pruefen(self):
        t = threading.current_thread()
        if t is self.ta:
            self.a_n += 1
            if self.a_n == self.j and not self.a_erreicht:
                self.a_erreicht = True
                self.a_pause.set()
                self.a_weiter.wait()
            if self.veto:
                self.veto_n += 1
                raise sperre.SperreVerloren("Test: A hat die Sperre verloren")
        elif t is self.tb and self.b_art == "schreiben":
            self.b_n += 1
            if self.b_n == self.k and not self.b_erreicht:
                self.b_erreicht = True
                self.b_pause.set()
                self.b_weiter.wait()

    def urlopen(self, req, *a, **kw):
        t = threading.current_thread()
        if t is self.tb and self.b_art == "lesen" and not self.b_erreicht:
            self.b_n += 1
            if self.b_n == self.k:
                self.b_erreicht = True
                self.b_pause.set()
                self.b_weiter.wait()
        return _orig_urlopen(req, *a, **kw)

    def lauf(self):
        sperre.pruefen = self.pruefen
        urllib.request.urlopen = self.urlopen

        def ziel_a():
            try:
                self.a_res = self.fn_a()
            except BaseException:  # noqa: BLE001
                self.a_err = traceback.format_exc()[-900:]
            finally:
                self.a_fertig.set()
                self.a_pause.set()

        def ziel_b():
            try:
                self.b_res = self.fn_b()
            except BaseException:  # noqa: BLE001
                self.b_err = traceback.format_exc()[-900:]
            finally:
                self.b_fertig.set()
                self.b_pause.set()
        try:
            self.ta = threading.Thread(target=ziel_a, daemon=True)
            self.ta.start()
            self.a_pause.wait()
            if not self.a_erreicht:
                return False
            sperren_altern()
            self.tb = threading.Thread(target=ziel_b, daemon=True)
            self.tb.start()
            self.b_pause.wait()
            if self.b_erreicht and not self.b_fertig.is_set():
                self.veto = True          # A wacht auf: ab jetzt gehört die Sperre B
                self.a_weiter.set()
                self.ta.join()            # A läuft ganz zu Ende (liest, versucht zu schreiben — Aufträge UND Buch vetoed)
                self.b_weiter.set()
            else:
                self.veto = True
                self.a_weiter.set()
                self.ta.join()
            self.tb.join()
            return True
        finally:
            urllib.request.urlopen = _orig_urlopen
            sperre.pruefen = _pruefen_test
            self.veto = False


def fall_aufwachen(sz, j, k, b_art):
    markt, z0, z1 = sz
    kk, d, env = K.tag0(sz)
    e1 = P.E(markt, z1)

    def fn_b():
        P.pending_abarbeiten()
        B.n_listen += 1000
        return P.nachkontrolle(env, d)
    zw = Zweier(lambda: P.lauf([e1], env, d), fn_b, j, k, b_art)
    if not zw.lauf():
        return None
    if not zw.b_erreicht:
        return "b_fertig_vorher"
    m = dict(sz=sz, j=j, k=k, b_art=b_art, a_err=zw.a_err, b_err=zw.b_err, veto_n=zw.veto_n, modus="aufwachen")
    m["sofort"] = K.betrag(K.befunde(kk, d))
    m["sofort_arten"] = [b[0] for b in K.befunde(kk, d)]
    m["vermerkt"] = P.vermerkt_je_markt(d)
    try:
        P.pending_abarbeiten()
        B.n_listen += 1000
        P.nachkontrolle(env, d)
        m["final"] = K.betrag(K.befunde(kk, d))
        m["final_arten"] = [b[0] for b in K.befunde(kk, d)]
        m["lage"] = P.zeigen(kk)
    except BaseException:  # noqa: BLE001
        m["final_fehler"] = traceback.format_exc()[-500:]
    m["vermerkt_final"] = P.vermerkt_je_markt(d)
    return m


def scan(modus, von, bis, ausgabe=None, j_max=80, ruhig=False):
    """→ (Zähler, Funde). `ruhig`: keine Zeile je Fall (für die Tests)."""
    sperre.pruefen = _pruefen_test
    alt_herzschlag, sperre.HERZSCHLAG = sperre.HERZSCHLAG, 1e9      # kein Herzschlag-Thread fasst die Sperren des eingefrorenen Laufs an
    alt_warten = L.BUCH_SPERRE_WARTEN
    if modus == "aufwachen":
        L.BUCH_SPERRE_WARTEN = 0.6      # B hält mitten im Schreiben die Buch-Sperre, während A aufwacht: A soll nicht jedes Mal 15 s warten, sondern gleich «Buch gesperrt» bekommen (derselbe Ausgang: nichts geschrieben)
    z = Counter()
    funde = []
    gesehen = set()
    try:
        _scan_faelle(modus, von, bis, j_max, ruhig, z, funde, gesehen)
    finally:
        sperre.HERZSCHLAG = alt_herzschlag
        L.BUCH_SPERRE_WARTEN = alt_warten
        sperre.pruefen = _echte_pruefung
    if ausgabe:
        Path(ausgabe).write_text(json.dumps(funde, indent=1, default=str))
    return z, funde


def _scan_faelle(modus, von, bis, j_max, ruhig, z, funde, gesehen):
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        if modus == "aufwachen":
            for j in range(1, j_max):
                ein_j = False
                for b_art, ks in (("lesen", (1, 2, 4, 8, 16, 32)), ("schreiben", tuple(range(1, 30)))):
                    for k in ks:
                        m = fall_aufwachen(sz, j, k, b_art)
                        if m is None:
                            break
                        if m == "b_fertig_vorher":
                            z["b_fertig_vorher"] += 1
                            break
                        ein_j = True
                        z["faelle"] += 1
                        if m["a_err"] or m["b_err"] or m.get("final_fehler"):
                            z["AUSNAHME"] += 1
                            funde.append(m)
                        if m["sofort"] != (0.0, 0.0):
                            z["sofort_ungeschuetzt"] += 1
                            z["max_sofort"] = max(z["max_sofort"], max(m["sofort"]))
                        if m.get("final") != (0.0, 0.0):
                            z["FINAL_OHNE_STOP"] += 1
                            funde.append(m)
                        if not ruhig:
                            print(si, sz, "j", j, b_art, "k", k, "sofort", m["sofort"], "final", m.get("final"), "vermerkt", m["vermerkt"], "->", m["vermerkt_final"], flush=True)
                    if m is None:
                        break
                # j = 1..3 sind Prüfstellen VOR dem ersten Auftrag (Vermerk speichern): B hat dort noch nichts zu tun
                if not ein_j and j > 3:
                    break
            continue
        if modus == "notaus":
            if sz[:2] in gesehen:
                continue
            gesehen.add(sz[:2])
        if modus == "nk":
            gesamt = K.schreibende(sz)
            n1s = sorted({1, max(1, gesamt // 2), max(1, gesamt - 1)})
        else:
            n1s = [None]
        for n1 in n1s:
            j = 1
            while j < j_max:
                if modus == "tag":
                    k, d, env, zz, mess = fall_tag(sz, j)
                elif modus == "notaus":
                    k, d, env, zz, mess = fall_notaus(sz, j)
                else:
                    r = fall_nk(sz, n1, j)
                    if r is None:
                        z["kind_fehler"] += 1
                        break
                    k, d, env, zz, mess = r
                m = auswerten(si, sz, j, k, d, env, zz, mess, modus)
                if m is None:
                    break              # j größer als die Zahl der Prüfstellen
                if modus == "nk":
                    m["n1"] = n1
                z["faelle"] += 1
                if m["t_fehler"] or m["b_fehler"] or m.get("final_fehler"):
                    z["AUSNAHME"] += 1
                    funde.append(m)
                if m["sofort"] != (0.0, 0.0):
                    z["sofort_ungeschuetzt"] += 1
                    z["max_sofort"] = max(z["max_sofort"], max(m["sofort"]))
                if m.get("final") != (0.0, 0.0) or (modus == "notaus" and not m.get("flach")):
                    z["FINAL_OHNE_STOP"] += 1
                    funde.append(m)
                if not ruhig:
                    print(si, sz, "n1", n1, "j", j, "nach_b", m["nach_b"], "sofort", m["sofort"], "final", m.get("final"), "vermerkt", m["vermerkt"], "->", m["vermerkt_final"], flush=True)
                j += 1


def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ("tag", "notaus", "nk", "aufwachen"):
        print(__doc__)
        return 2
    modus, von, bis = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    z, funde = scan(modus, von, bis, sys.argv[4] if len(sys.argv) > 4 else None)
    echt = z["AUSNAHME"] + z["FINAL_OHNE_STOP"]
    print(dict(z))
    print(f"{echt} Befunde")
    for f in funde[:10]:
        print(json.dumps({x: f.get(x) for x in ("si", "sz", "n1", "j", "k", "b_art", "sofort", "final", "final_arten", "t_fehler", "b_fehler", "final_fehler", "vermerkt", "lage")}, default=str)[:600])
    return 1 if echt else 0


if __name__ == "__main__":
    sys.exit(main())
