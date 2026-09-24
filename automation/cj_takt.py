"""cj_takt.py — EIN Takt für ALLE CJ-Verbraucher (21.09.2026, «schneller automation»).

Gemessen: acht CJ-Aufrufe hintereinander OHNE Takt → jeder zweite 1600200 (QPS), obwohl kein
anderer Prozess lief; die Helfer antworten darauf mit 8/16/24 s Strafschlaf. So kostete der
Varianten-Wächter ~12 s je Produkt, obwohl CJ selbst in 0,6 s antwortet. Zweite Messung: ein
EINZELNER Prozess mit 1,05 s Start-zu-Start wird noch in 1 von 6 Fällen gedrosselt, mit 2,1 s
nie — CJ zählt offenbar ab ANTWORT-ENDE. Deshalb misst diese Uhr Ende-zu-Start.

Dritte Messung (Python 0/8, Node 8/8 gedrosselt): wer sich am Start-Stempel einreiht, kommt
0,4 s nach dem ENDE des anderen dran. Darum RESERVIERTE Startzeiten: `takt()` holt unter der
Sperre den nächsten freien Startpunkt (letzter reservierter Start + ABSTAND), trägt ihn ein,
gibt die Sperre frei und schläft bis dahin. Der Abstand ist Start-zu-Start und enthält die
Antwortdauer (~0,6 s) — 1,8 s lässt ≥0,9 s Ruhe zwischen Antwort-Ende und nächstem Start.
`frei()` bleibt als Aufrufkompatibilität, tut nichts mehr.
Sperre: atomares mkdir (dasselbe Protokoll wie cj_takt.mjs, damit Python- und Node-Prozesse
EINE Uhr teilen); eine Sperre älter als 5 s gilt als Leiche. Kein Prozess kann sie dauerhaft
blockieren.
"""
import os, time

LOCKDIR = "/tmp/cj_takt.lockdir"
STEMPEL = "/tmp/cj_takt.stempel"        # naechster reservierter Start (Epoche, s)
ABSTAND = float(os.environ.get("CJ_TAKT_S", "1.8"))


def _sperren():
    while True:
        try:
            os.mkdir(LOCKDIR); return
        except FileExistsError:
            try:
                if time.time() - os.stat(LOCKDIR).st_mtime > 5:
                    os.rmdir(LOCKDIR); continue
            except FileNotFoundError:
                continue
            time.sleep(0.02)


def _frei_sperre():
    try: os.rmdir(LOCKDIR)
    except FileNotFoundError: pass


def _lesen():
    try:
        return float(open(STEMPEL).read().split()[0])
    except Exception:
        return 0.0


def takt(abstand=None):
    """Reserviert den naechsten freien Startpunkt und blockiert bis dahin (Start-zu-Start ABSTAND)."""
    abstand = ABSTAND if abstand is None else abstand
    _sperren()
    try:
        start = max(time.time(), _lesen() + abstand)
        with open(STEMPEL, "w") as f:
            f.write(f"{start:.3f}")
    finally:
        _frei_sperre()
    _protokoll(start)
    warte = start - time.time()
    if warte > 0:
        time.sleep(warte)


def _protokoll(start):
    """24.09.2026: WER verbraucht das CJ-Tagesbudget? Je Aufruf eine Zeile (Epoche, Skript) in
    /tmp/cj_takt_<Datum>.log — sonst ist «der Kosten-Nachtrag bekommt nur 500 Produkte/Tag» nicht zu
    klären (30 Verbraucher, ein Budget). Fehler hier dürfen den Aufruf nie stören."""
    try:
        import sys
        name = os.path.basename(sys.argv[0] or "?") or "?"
        with open(time.strftime("/tmp/cj_takt_%Y-%m-%d.log", time.gmtime(start)), "a") as f:
            f.write(f"{int(start)}\t{name}\n")
    except Exception:
        pass


def frei():
    """Kompatibilitaet: frueher Ende-Stempel, seit der dritten Messung ohne Wirkung."""
    return None


if __name__ == "__main__":
    n = int(os.environ.get("N", "5")); t = []
    for _ in range(n):
        takt(); t.append(time.time())
    d = [round(b - a, 3) for a, b in zip(t, t[1:])]
    print("Start-Abstaende:", d, "| ok" if all(x >= ABSTAND - 0.02 for x in d) else "| ZU DICHT")
