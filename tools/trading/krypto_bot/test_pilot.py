#!/usr/bin/env python3
"""Tests für den Krypto-Pilot (ohne Netz): python3 tools/trading/krypto_bot/test_pilot.py"""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import random
import sys
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_futures as BF  # noqa: E402
import pilot_kern as K  # noqa: E402
import sperre as _SP0  # noqa: E402
import testumgebung  # noqa: E402

testumgebung.schalter_umbiegen(BF, _SP0)  # echte STOP/PAUSE-Dateien des Nutzers dürfen den Test nicht beeinflussen
BF.NACHFRAGE_WARTEN = (0.0, 0.0, 0.0)  # im Test nicht warten

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


# ── Rechenkern ──
steigend = [100 * 1.001 ** i for i in range(400)]
fallend = steigend[::-1]
pruefe("über 200-Schnitt → long", K.roh_hebel(steigend)[-1] > 0)
pruefe("unter 200-Schnitt → short", K.roh_hebel(fallend)[-1] < 0)
pruefe("nur long: unter Schnitt → flach", K.roh_hebel(fallend, short=False)[-1] == 0)
pruefe("Hebel nie über 2, auch wenn mehr verlangt", max(abs(x) for x in K.roh_hebel(steigend, max_hebel=10)) <= 2.0)
rnd = random.Random(3)
wild = [100.0]
for _ in range(400):
    wild.append(wild[-1] * math.exp(rnd.gauss(0.001, 1.2 / math.sqrt(365))))
pruefe("wilder Markt → kleinere Position", 0 < abs(K.roh_hebel(wild)[-1]) < 0.6, K.roh_hebel(wild)[-1])
p = steigend[:300]
pruefe("Entscheidung hängt nur an der Vergangenheit", K.roh_hebel(p)[-1] == K.roh_hebel(steigend)[299])
sl, ss = K.stop_kurs(wild, 1), K.stop_kurs(wild, -1)
pruefe("Stop long unter, short über dem Kurs", sl < wild[-1] < ss, (sl, wild[-1], ss))
pruefe("kein Stop ohne Position", K.stop_kurs(wild, 0) is None)

# ── Auftragsplanung ──
cfg = BF.einstellungen({"KI_BOT_ANTEIL": "0.5", "KI_BOT_MAX_AUFTRAG": "100000"})
R = {"step": 0.001, "min_qty": 0.001, "tick": 0.1, "min_notional": 100.0}
pruefe("aufbauen: 1× von 0", BF.plane(cfg, 20000, 0.0, 50000, R, 1.0) == [("BUY", 0.2, False)], BF.plane(cfg, 20000, 0.0, 50000, R, 1.0))
pruefe("im Band: nichts", BF.plane(cfg, 20000, 0.19, 50000, R, 1.0) == [])
pruefe("drehen: erst schliessen, dann short", BF.plane(cfg, 20000, 0.2, 50000, R, -1.0) == [("SELL", 0.2, True), ("SELL", 0.2, False)],
       BF.plane(cfg, 20000, 0.2, 50000, R, -1.0))
pruefe("Ziel 0: ganz schliessen (reduceOnly)", BF.plane(cfg, 20000, -0.2, 50000, R, 0.0) == [("BUY", 0.2, True)])
pruefe("verkleinern: nur reduceOnly", BF.plane(cfg, 20000, 0.2, 50000, R, 0.5) == [("SELL", 0.1, True)], BF.plane(cfg, 20000, 0.2, 50000, R, 0.5))
pruefe("Hebel-Deckel greift in der Planung", BF.plane(cfg, 20000, 0.0, 50000, R, 5.0) == [("BUY", 0.2, False)])
cfg2 = BF.einstellungen({"KI_BOT_ANTEIL": "0.5", "KI_BOT_MAX_AUFTRAG": "1000"})
pruefe("Aufbau je Lauf höchstens Max-Auftrag", BF.plane(cfg2, 20000, 0.0, 50000, R, 1.0) == [("BUY", 0.02, False)], BF.plane(cfg2, 20000, 0.0, 50000, R, 1.0))
pruefe("Schliessen wird nie gekappt", BF.plane(cfg2, 20000, 0.2, 50000, R, 0.0) == [("SELL", 0.2, True)])
pruefe("Testnetz ist Standard", cfg["basis"] == BF.TESTNETZ_URL and not cfg["echtgeld"])
pruefe("Echtgeld nur doppelt", not BF.einstellungen({"BINANCE_FUTURES_TESTNET": "false"})["echtgeld"]
       and BF.einstellungen({"BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": BF.ECHTGELD_SATZ})["echtgeld"])
pruefe("eingestellter Hebel 5 → 2", BF.einstellungen({"KRYPTO_MAX_HEBEL": "5"})["max_hebel"] == 2.0 and BF.einstellungen({"KRYPTO_RISIKO": "5"})["max_hebel"] == 2.0)

pruefe("Gewicht 0.5: halbe Position je Markt", BF.plane(cfg, 20000, 0.0, 50000, R, 1.0, gewicht=0.5) == [("BUY", 0.1, False)],
       BF.plane(cfg, 20000, 0.0, 50000, R, 1.0, gewicht=0.5))

# ── Risiko-Stufe (Hebel) ──
import tempfile as _tf  # noqa: E402
pruefe("Standard: Stufe 1, Ziel 40 %, Deckel 1", K.risiko({}) == {"stufe": 1.0, "ziel_vol": 0.40, "max_hebel": 1.0})
pruefe("Stufe 2: Ziel 80 %, Deckel 2", K.risiko({"KRYPTO_RISIKO": "2"}) == {"stufe": 2.0, "ziel_vol": 0.80, "max_hebel": 2.0})
pruefe("Stufe 10 wird auf 2 gekappt", K.risiko({"KRYPTO_RISIKO": "10"})["max_hebel"] == 2.0)
pruefe("Unsinn → Stufe 1", K.risiko({"KRYPTO_RISIKO": "viel"})["stufe"] == 1.0 and K.risiko({"KRYPTO_RISIKO": "-3"})["max_hebel"] == 1.0)
pruefe("altes KRYPTO_MAX_HEBEL wirkt nur als Deckel", K.risiko({"KRYPTO_MAX_HEBEL": "2"}) == {"stufe": 1.0, "ziel_vol": 0.40, "max_hebel": 2.0})
with _tf.TemporaryDirectory() as _td:
    _f = Path(_td) / "e.json"
    _f.write_text('{"risiko": 1.5}')
    pruefe("Cockpit-Einstellung wird gelesen", K.risiko({}, _f)["max_hebel"] == 1.5 and K.risiko({"KRYPTO_RISIKO": "1"}, _f)["stufe"] == 1.0)
    _f.write_text("kaputt")
    pruefe("kaputte Einstellungsdatei → Stufe 1", K.risiko({}, _f)["stufe"] == 1.0)
pruefe("Broker übernimmt den Deckel der Stufe", BF.einstellungen({"KRYPTO_RISIKO": "1.5"})["max_hebel"] == 1.5)
# Stufe 1,75 (Empfehlung des Max-Profit-Prüfstands): Schwankungsziel 70 %, Deckel 1,75; gerundet wird auf die NÄCHSTE Stufe, bei Gleichstand
# auf die kleinere (die Liste ist aufsteigend)
r175 = K.risiko({"KRYPTO_RISIKO": "1.75"})
pruefe("Stufe 1,75: Ziel 70 %, Deckel 1,75", r175["stufe"] == 1.75 and abs(r175["ziel_vol"] - 0.70) < 1e-12 and r175["max_hebel"] == 1.75, r175)
pruefe("Stufen: 1,6 → 1,5 · 1,7 → 1,75 · 1,9 → 2 · Gleichstand 1,625 → 1,5 und 1,875 → 1,75 (die kleinere)",
       [K.risiko({"KRYPTO_RISIKO": x})["stufe"] for x in ("1.6", "1.7", "1.9", "1.625", "1.875")] == [1.5, 1.75, 2.0, 1.5, 1.75])
pruefe("Stufe 1,75 wird nie auf mehr als 2 gehoben, Unsinn bleibt 1",
       K.risiko({"KRYPTO_RISIKO": "3"})["stufe"] == 2.0 and K.risiko({"KRYPTO_RISIKO": "1,75"})["stufe"] == 1.0)
with _tf.TemporaryDirectory() as _td:
    _f = Path(_td) / "e.json"
    _f.write_text('{"risiko": 1.75}')
    pruefe("Cockpit-Einstellung 1,75 wird gelesen", K.risiko({}, _f)["stufe"] == 1.75 and K.risiko({"KRYPTO_RISIKO": "1"}, _f)["stufe"] == 1.0)
pruefe("Broker übernimmt den Deckel 1,75", BF.einstellungen({"KRYPTO_RISIKO": "1.75"})["max_hebel"] == 1.75)
_gerundet = lambda a_: [(x[0], round(x[1], 6), x[2]) for x in a_]  # noqa: E731
_cfg175 = BF.einstellungen({"KI_BOT_ANTEIL": "0.5", "KI_BOT_MAX_AUFTRAG": "100000", "KRYPTO_RISIKO": "1.75"})
pruefe("Stufe 1,75 plant 1,75× (0,35 BTC statt 0,2), mehr als 1,75× wird gekappt; Stufe 1 bleibt bei 1×",
       _gerundet(BF.plane(_cfg175, 20000, 0.0, 50000, R, 1.75)) == [("BUY", 0.35, False)]
       and _gerundet(BF.plane(_cfg175, 20000, 0.0, 50000, R, 3.0)) == [("BUY", 0.35, False)]
       and _gerundet(BF.plane(cfg, 20000, 0.0, 50000, R, 1.75)) == [("BUY", 0.2, False)], BF.plane(_cfg175, 20000, 0.0, 50000, R, 1.75))
mittel = [100 * (1.001 ** i) * (1 + 0.0078 * ((-1) ** i)) for i in range(400)]  # rund 30 % Jahresschwankung
h1, h_deckel, h2 = K.roh_hebel(mittel)[-1], K.roh_hebel(mittel, max_hebel=2.0)[-1], K.roh_hebel(mittel, max_hebel=2.0, ziel_vol=0.8)[-1]
pruefe("Stufe 2 = alles doppelt: 1× → 1, nur Deckel 2 → ~1,3, Stufe 2 → 2", h1 == 1.0 and 1.1 < h_deckel < 1.6 and h2 == 2.0, (h1, h_deckel, h2))
_wild = [100 * (1.001 ** i) * (1 + 0.0157 * ((-1) ** i)) for i in range(400)]  # rund 60 % Jahresschwankung
_h175 = K.roh_hebel(mittel, max_hebel=1.75, ziel_vol=0.7)[-1]
_hw = K.roh_hebel(_wild, max_hebel=1.75, ziel_vol=0.7)[-1]
pruefe("Stufe 1,75 = alles × 1,75: ruhiger Markt → Deckel 1,75, wilder Markt → Schwankungsziel (~1,2)", _h175 == 1.75 and 1.0 < _hw < 1.5, (_h175, _hw))

# ── Backtest-Mischung wie live: jeden Tag neu 50/50 aus dem Gesamtkonto ──
import pilot_pruefung as PP  # noqa: E402
m = PP.mix_taeglich([1.0, 2.0, 1.0], [1.0, 1.0, 1.0])
pruefe("tägliche Neuaufteilung: +100 % dann −50 % auf der Hälfte → 1,5 dann 1,125 (getrennte Töpfe hätten 1,0)",
       abs(m[1] - 1.5) < 1e-12 and abs(m[2] - 1.125) < 1e-12, m)
m = PP.mix_taeglich([1.0, 0.0, 0.0], [1.0, 1.1, 1.21])
pruefe("liquidiertes Teilkonto: Hälfte weg, danach flach, Rest läuft weiter", abs(m[1] - 0.55) < 1e-12 and abs(m[2] - 0.5775) < 1e-12, m)

# ── Lauf-Sperre: nie zwei Läufe gleichzeitig ──
import os as _os  # noqa: E402
import sperre as SP  # noqa: E402
import time as _time  # noqa: E402
with _tf.TemporaryDirectory() as _sd:
    with SP.lauf_sperre(ordner=_sd):
        try:
            with SP.lauf_sperre(ordner=_sd, warten=0):
                zweiter = "lief"
        except SP.Besetzt:
            zweiter = "gesperrt"
    pruefe("Sperre: zweiter Lauf während des ersten wird abgewiesen", zweiter == "gesperrt")
    with SP.lauf_sperre(ordner=_sd, warten=0):
        frei = True
    pruefe("Sperre: nach dem ersten Lauf wieder frei", frei and not (Path(_sd) / "krypto-lauf.lock").exists())
    _lk = Path(_sd) / "krypto-lauf.lock"
    _lk.write_text("1 0")
    _os.utime(_lk, (_time.time() - 2000, _time.time() - 2000))
    with SP.lauf_sperre(ordner=_sd, warten=0):
        verwaist = True
    pruefe("Sperre: verwaiste Sperre (Absturz) wird nach 15 Min. übernommen", verwaist)
    erg_w = []

    def _halten():
        with SP.lauf_sperre(ordner=_sd):
            _time.sleep(0.6)

    _t = threading.Thread(target=_halten)
    _t.start()
    _time.sleep(0.1)
    _t0 = _time.time()
    with SP.lauf_sperre(ordner=_sd, warten=5):
        erg_w.append(_time.time() - _t0)
    _t.join()
    pruefe("Sperre mit Warten: läuft nach dem ersten (nicht gleichzeitig)", 0.3 < erg_w[0] < 3, erg_w)
    # (16. Prüfung) ohne Herzschlag ist der Lauf tot: die Nachkontrolle/der Not-Aus (alt_nach=ALT_NACH_TOT) übernehmen nach 150 s, der Standard erst nach 900 s
    _lk.write_text("1 0")
    _os.utime(_lk, (_time.time() - 200, _time.time() - 200))
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0):
            _std = True
    except SP.Besetzt:
        _std = False
    with SP.lauf_sperre(ordner=_sd, warten=0, alt_nach=SP.ALT_NACH_TOT):
        _tot = True
    pruefe("Sperre ohne Herzschlag seit 200 s: mit alt_nach=ALT_NACH_TOT (Nachkontrolle, Not-Aus) übernommen, der Standard (900 s) wartet noch", _tot and not _std and SP.ALT_NACH_TOT == 150, (_std, _tot))
    _lk.write_text("1 0")
    _os.utime(_lk, (_time.time() - 100, _time.time() - 100))
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0, alt_nach=SP.ALT_NACH_TOT):
            _lebt = False
    except SP.Besetzt:
        _lebt = True
    _lk.unlink(missing_ok=True)
    pruefe("Sperre mit Herzschlag vor 100 s: der Lauf lebt noch, auch mit ALT_NACH_TOT keine Übernahme", _lebt)
    # (19. Prüfung, klein 3) Uhr zurück: starb der Halter und sprang die Uhr danach zurück, trägt die Sperre eine Änderungszeit «aus der Zukunft» — sie galt erst nach Δ + alt_nach als tot (der Tageslauf wurde abgewiesen,
    # die Nachkontrolle übersprang still). Jetzt gilt sie als tot, sobald sie MEHR als alt_nach vorausliegt; eine kleine Abweichung (Uhren-Ungenauigkeit) bleibt eine lebende Sperre.
    for _vor, _alt_n, _tot_erwartet in ((2000, None, True), (200, SP.ALT_NACH_TOT, True), (20, SP.ALT_NACH_TOT, False), (200, None, False), (-200, SP.ALT_NACH_TOT, True)):
        _lk.write_text("1 0")
        _os.utime(_lk, (_time.time() + _vor, _time.time() + _vor))  # (-200: eine ganz gewöhnliche tote Sperre, 200 s alt — die bisherige Regel bleibt)
        _t0 = _time.time()
        try:
            with SP.lauf_sperre(ordner=_sd, warten=0, **({} if _alt_n is None else {"alt_nach": _alt_n})):
                _uebernommen = True
        except SP.Besetzt:
            _uebernommen = False
        _dauer_z = _time.time() - _t0
        _lk.unlink(missing_ok=True)
        # die Dauer gehört zum Urteil: eine zu früh «tote» Sperre aus der Zukunft liesse die Schleife bis zum Einholen der Änderungszeit drehen (Δ Sekunden Dauerlauf, dann Besetzt) — gleiches Ergebnis, aber 20 s Last
        pruefe(f"Sperre aus der Zukunft (Änderungszeit {_vor:+d} s, alt_nach={'900 (Standard)' if _alt_n is None else _alt_n}): {'als tot übernommen' if _tot_erwartet else 'lebt (nicht übernommen)'}, sofort (keine Warteschleife)", _uebernommen is _tot_erwartet and _dauer_z < 5, (_uebernommen, _dauer_z))
    _alt_hz = SP.HERZSCHLAG
    SP.HERZSCHLAG = 0.05
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0):
            _time.sleep(0.6)  # länger als alt_nach unten: nur der Herzschlag hält die Sperre frisch
            try:
                with SP.lauf_sperre(ordner=_sd, warten=0, alt_nach=0.3):
                    _frisch = False
            except SP.Besetzt:
                _frisch = True
    finally:
        SP.HERZSCHLAG = _alt_hz
    pruefe("Herzschlag: ein lange gehaltener Lauf gilt nie als tot (die Sperre bleibt frisch)", _frisch and SP.HERZSCHLAG * 5 <= SP.ALT_NACH_TOT, (_frisch, SP.HERZSCHLAG))
    # (16. Folge-Runde) Härtung der Sperre: der Herzschlag überlebt einen vorübergehend gesperrten Zugriff (Windows: Virenscanner/OneDrive halten die Datei kurz) — vorher endete der Thread beim ersten
    # Fehler, und der lebende Lauf galt nach ALT_NACH_TOT als tot (Übernahme mitten im Lauf)
    _alt_hz, _os_utime = SP.HERZSCHLAG, _os.utime
    _fehl_utime = [4]

    def _utime_zickt(pfad, *a, **k):
        if _fehl_utime[0] > 0:
            _fehl_utime[0] -= 1
            raise PermissionError("kurz gesperrt")
        return _os_utime(pfad, *a, **k)

    SP.HERZSCHLAG, _os.utime = 0.05, _utime_zickt
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0):
            _time.sleep(0.7)  # die ersten vier Schläge scheitern (0,2 s), danach läuft der Herzschlag weiter — länger als alt_nach unten
            try:
                with SP.lauf_sperre(ordner=_sd, warten=0, alt_nach=0.3):
                    _hz_zickt = False
            except SP.Besetzt:
                _hz_zickt = True
    finally:
        SP.HERZSCHLAG, _os.utime = _alt_hz, _os_utime
    pruefe("Herzschlag: vier gescheiterte Schläge (Datei kurz gesperrt) beenden ihn nicht — die Sperre bleibt frisch", _hz_zickt and _fehl_utime[0] == 0, (_hz_zickt, _fehl_utime))
    # hat ein anderer Lauf die Sperre übernommen (z. B. nach dem Ruhezustand des Rechners), löscht der alte Halter die fremde nicht und hält sie nicht am Leben
    _lk.unlink(missing_ok=True)
    SP.HERZSCHLAG = 0.05
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0):
            _lk.unlink()
            _lk.write_text("99999 0 fremd\n")  # der andere Lauf hat die Sperre neu angelegt
            _os_utime(_lk, (_time.time() - 100, _time.time() - 100))
            _time.sleep(0.3)  # mehrere Herzschläge des alten Halters
            _alt_mtime = _time.time() - _lk.stat().st_mtime
    finally:
        SP.HERZSCHLAG = _alt_hz
    pruefe("Sperre übernommen: der alte Halter löscht die fremde Sperre nicht (und hält sie mit seinem Herzschlag nicht am Leben)",
           _lk.exists() and _lk.read_text() == "99999 0 fremd\n" and _alt_mtime > 90, (_lk.exists(), _alt_mtime))
    _lk.unlink(missing_ok=True)
    # Windows: das Löschen der eigenen Sperre scheitert kurz (Virenscanner) — ein erfolgreicher Lauf stürzt daran nicht ab, die Sperre ist danach weg
    _unlink0, _fehl_unlink = Path.unlink, [2]

    def _unlink_zickt(self, *a, **k):
        if self.name.endswith(".lock") and _fehl_unlink[0] > 0:
            _fehl_unlink[0] -= 1
            raise PermissionError("kurz gehalten")
        return _unlink0(self, *a, **k)

    Path.unlink = _unlink_zickt
    try:
        with SP.lauf_sperre(ordner=_sd, warten=0):
            pass
        _unl_ok = True
    except OSError:
        _unl_ok = False
    finally:
        Path.unlink = _unlink0
    pruefe("Sperre freigeben: ein kurz gehaltenes Löschen (PermissionError ×2) wird wiederholt, der Lauf stürzt nicht ab", _unl_ok and not _lk.exists() and _fehl_unlink[0] == 0, (_unl_ok, _lk.exists(), _fehl_unlink))
    # … und die Übernahme einer toten Sperre: lässt sie sich kurz nicht löschen, wird sie innerhalb der Wartezeit nochmals versucht; ohne Wartezeit meldet der Lauf «besetzt» statt abzustürzen
    for _warten_u, _erw_u in ((5, "uebernommen"), (0, "besetzt")):
        _lk.write_text("1 0\n")
        _os_utime(_lk, (_time.time() - 2000, _time.time() - 2000))
        _fehl_unlink[0] = 2
        Path.unlink = _unlink_zickt
        try:
            with SP.lauf_sperre(ordner=_sd, warten=_warten_u):
                _u_erg = "uebernommen"
        except SP.Besetzt:
            _u_erg = "besetzt"
        except OSError:
            _u_erg = "abgestuerzt"
        finally:
            Path.unlink = _unlink0
        pruefe(f"Sperre übernehmen: die tote Sperre lässt sich kurz nicht löschen, Wartezeit {_warten_u} s → {_erw_u}", _u_erg == _erw_u, _u_erg)
        _lk.unlink(missing_ok=True)
    # (Nachprüfung der 16. Folge-Runde) Übernahme einer toten Sperre durch ZWEI Prozesse zugleich: der zweite löschte die FRISCH angelegte Sperre des ersten (er hatte die tote Sperre schon gesehen),
    # und beide hielten sie. Jetzt prüft, löscht und legt nur der Inhaber der Wache (<sperre>.uebernahme) neu an: Prozess A wird zwischen Prüfen und Löschen angehalten, Prozess B kommt dazu.
    import threading as _th  # noqa: E402
    _lk.write_text("1 0\n")
    _os_utime(_lk, (_time.time() - 2000, _time.time() - 2000))
    _a_im_loeschen, _b_fertig, _a_erg, _b_erg = _th.Event(), _th.Event(), [], []
    _haken0 = getattr(SP, "_haken", None)

    def _haken_a(was):
        if was == "vor_loeschen" and _th.current_thread().name == "A":
            _a_im_loeschen.set()
            _b_fertig.wait(5)

    def _lauf_a():
        try:
            with SP.lauf_sperre(ordner=_sd, warten=5):
                _a_erg.append("hat")
                _time.sleep(0.2)
        except SP.Besetzt:
            _a_erg.append("besetzt")

    SP._haken = _haken_a
    try:
        _ta = _th.Thread(target=_lauf_a, name="A")
        _ta.start()
        _a_im_loeschen.wait(5)
        try:
            with SP.lauf_sperre(ordner=_sd, warten=0.3):
                _b_erg.append("hat")
        except SP.Besetzt:
            _b_erg.append("besetzt")
        _b_fertig.set()
        _ta.join(10)
    finally:
        if _haken0 is None:
            del SP._haken
        else:
            SP._haken = _haken0
    pruefe("Sperre übernehmen: übernimmt ein Prozess eine tote Sperre (zwischen Prüfen und Löschen angehalten), kann ein zweiter sie nicht zugleich löschen und neu anlegen — er wird abgewiesen, der erste hält sie",
           _b_erg == ["besetzt"] and _a_erg == ["hat"], (_a_erg, _b_erg))
    _lk.unlink(missing_ok=True)
    # … und die andere Reihenfolge: B hat die tote Sperre gesehen und wird VOR der Wache angehalten; A übernimmt sie unterdessen ganz und hält die neue. B darf sie danach nicht löschen (unter der Wache prüft er nochmals).
    _lk.write_text("1 0\n")
    _os_utime(_lk, (_time.time() - 2000, _time.time() - 2000))
    _b_vor_wache, _a_hat, _b_erg2, _a_erg2 = _th.Event(), _th.Event(), [], []

    def _haken_b(was):
        if was == "vor_wache" and _th.current_thread().name == "B":
            _b_vor_wache.set()
            _a_hat.wait(5)

    def _lauf_b():
        try:
            with SP.lauf_sperre(ordner=_sd, warten=0.3):
                _b_erg2.append("hat")
        except SP.Besetzt:
            _b_erg2.append("besetzt")

    SP._haken = _haken_b
    try:
        _tb = _th.Thread(target=_lauf_b, name="B")
        _tb.start()
        _b_vor_wache.wait(5)
        with SP.lauf_sperre(ordner=_sd, warten=2):
            _a_erg2.append("hat")
            _a_hat.set()
            _tb.join(10)
    finally:
        if _haken0 is None:
            del SP._haken
        else:
            SP._haken = _haken0
    pruefe("Sperre übernehmen: B sah die tote Sperre, A übernahm sie unterdessen und hält die neue — B löscht sie nicht (er prüft unter der Wache nochmals) und wird abgewiesen", _b_erg2 == ["besetzt"] and _a_erg2 == ["hat"], (_a_erg2, _b_erg2))
    _lk.unlink(missing_ok=True)
    # (17. Prüfung W3) pruefen(): vor jedem schreibenden Auftrag — gehört die Sperre dieses Prozesses noch ihm? Ein eingefrorener Lauf (Ruhezustand) merkte sonst nicht, dass seine Sperre als tot übernommen wurde.
    pruefe("Sperre pruefen(): ohne gehaltene Sperre nichts zu prüfen", getattr(SP, "pruefen", lambda: None)() is None)
    with SP.lauf_sperre(ordner=_sd, warten=0):
        _ok_eigene = getattr(SP, "pruefen", lambda: "fehlt")() is None
        _lk.write_text("99999 0 fremd\n")  # ein anderer Lauf hat sie als tot übernommen
        try:
            SP.pruefen()
            _verloren = False
        except getattr(SP, "SperreVerloren", ()):
            _verloren = True
        _lk.unlink()
        try:
            SP.pruefen()
            _weg = False
        except getattr(SP, "SperreVerloren", ()):
            _weg = True
        _lk.write_text("1 0 x\n")  # damit das Freigeben nichts Fremdes löscht
    _lk.unlink(missing_ok=True)
    pruefe("Sperre pruefen(): eigene Sperre → still; fremde Marke → SperreVerloren; Datei weg → SperreVerloren", _ok_eigene and _verloren and _weg, (_ok_eigene, _verloren, _weg))
    _read0 = Path.read_text

    def _read_zickt(self, *a, **k):
        if self.name.endswith(".lock"):
            raise PermissionError("kurz gehalten")
        return _read0(self, *a, **k)

    with SP.lauf_sperre(ordner=_sd, warten=0):
        Path.read_text = _read_zickt
        try:
            _unbekannt = getattr(SP, "pruefen", lambda: "fehlt")() is None
        finally:
            Path.read_text = _read0
    pruefe("Sperre pruefen(): eine kurz nicht lesbare Datei (Virenscanner) zählt als «unbekannt» und lässt den Auftrag zu", _unbekannt)
    pruefe("Sperre pruefen(): nach dem Freigeben ist die Sperre nicht mehr registriert (nichts mehr zu prüfen)", not getattr(SP, "_gehalten", {"x": 1}) and getattr(SP, "pruefen", lambda: None)() is None, getattr(SP, "_gehalten", None))
    # eine liegen gebliebene Wache (der Prozess starb mitten in der Übernahme) blockiert nicht für immer: nach WACHE_ALT Sekunden wird sie gelöscht, die Übernahme gelingt
    _wk = Path(_sd) / "krypto-lauf.lock.uebernahme"
    for _alter_w, _warten_w, _erw_w in ((getattr(SP, "WACHE_ALT", 30) + 60, 5, "uebernommen"), (5, 0, "besetzt"),
                                        (-(getattr(SP, "WACHE_ALT", 30) + 60), 5, "uebernommen"),  # (20. Prüfung, klein 6) eine Wache «aus der Zukunft» (die Uhr sprang zurück) blockierte jede Übernahme
                                        (-3, 0, "besetzt")):  # … eine nur wenige Sekunden vorausgehende (Dateisystem-Granularität) ist keine verwaiste

        _lk.write_text("1 0\n")
        _os_utime(_lk, (_time.time() - 2000, _time.time() - 2000))
        _wk.write_text("")
        _os_utime(_wk, (_time.time() - _alter_w, _time.time() - _alter_w))
        try:
            with SP.lauf_sperre(ordner=_sd, warten=_warten_w):
                _w_erg = "uebernommen"
        except SP.Besetzt:
            _w_erg = "besetzt"
        pruefe(f"Sperre übernehmen: Wache {_alter_w:.0f} s alt, Wartezeit {_warten_w} s → {_erw_w} ({'vergessene Wache wird gelöscht' if _erw_w == 'uebernommen' else 'ein anderer übernimmt gerade'})", _w_erg == _erw_w and (_erw_w == "besetzt" or not _wk.exists()), (_w_erg, _wk.exists()))
        _lk.unlink(missing_ok=True)
        _wk.unlink(missing_ok=True)
    # die Nachkontrolle (pilot.py --nachkontrolle) wartet auf die Übernahme einer toten Sperre, statt nach 120 s still zu überspringen
    import pilot as _PI  # noqa: E402
    import pilot2_live as _P2L  # noqa: E402
    testumgebung.schalter_umbiegen(_PI)  # (Code-Review der R20) `nachkontrolle(einmal=True)` schreibt die Reihe der Durchgänge: nie in die echte data/-Datei des Nutzers (sie würde eine rote Dauerwarnung zurücksetzen)
    _alt_ord, _alt_nk = SP.ORDNER, _P2L.nachkontrolle
    SP.ORDNER = Path(_sd)
    _lief = []
    _P2L.nachkontrolle = lambda *a, **k: (_lief.append(1), {"zeilen": [], "warnung": False, "auftraege": []})[1]
    try:
        _lk.write_text("1 0")
        _os.utime(_lk, (_time.time() - 147, _time.time() - 147))  # noch 3 s bis «tot»
        _t0 = _time.time()
        _rc = _PI.nachkontrolle()
        _dauer = _time.time() - _t0
    finally:
        SP.ORDNER, _P2L.nachkontrolle = _alt_ord, _alt_nk
    pruefe("Nachkontrolle nach hartem Abbruch: wartet auf die tote Sperre (147 s alt), übernimmt sie nach 150 s und läuft", _lief == [1] and _rc == 0 and 1 < _dauer < 20 and not _lk.exists(), (_lief, _rc, _dauer))
    # Tageslauf und Not-Aus-Lauf von pilot.py nehmen dieselbe Übernahme-Regel (ein hart beendeter Lauf hinterlässt die Sperre) — Bauform-Wächter, der Lauf selbst braucht Kursquellen und Börse
    import inspect as _insp
    _quelle_main = _insp.getsource(_PI.main)
    pruefe("pilot.py: Tageslauf und Not-Aus-Lauf übernehmen eine Sperre ohne Herzschlag (alt_nach=ALT_NACH_TOT), beide warten lange genug dafür",
           _quelle_main.count("alt_nach=sperre.ALT_NACH_TOT") == 2 and _quelle_main.count("sperre.ALT_NACH_TOT + 40") == 2, _quelle_main.count("alt_nach=sperre.ALT_NACH_TOT"))

    # ── 18. Prüfung W3′: der 10-Minuten-Takt der Aufgabenplanung macht EINEN Durchgang (`--nachkontrolle --einmal`); der Tageslauf, der die Sperre nicht bekommt, ist LAUT ──
    _kw18 = []
    SP.ORDNER = Path(_sd)
    _P2L.nachkontrolle = lambda *a, **k: (_kw18.append(k), {"zeilen": [], "warnung": False, "auftraege": []})[1]
    try:
        _PI.nachkontrolle(einmal=True)
        _PI.nachkontrolle()
    finally:
        SP.ORDNER, _P2L.nachkontrolle = _alt_ord, _alt_nk
    pruefe("pilot.nachkontrolle(einmal=True) reicht einmal=True an Pilot 2.0 weiter; ohne Argument bleibt es die lange Fassung (einmal=False)", _kw18 == [{"einmal": True}, {"einmal": False}], _kw18)
    _rec18, _alt_pn18, _alt_argv18 = [], _PI.nachkontrolle, sys.argv
    _PI.nachkontrolle = lambda einmal=False: (_rec18.append(einmal), 0)[1]
    try:
        sys.argv = ["pilot.py", "--nachkontrolle", "--einmal"]
        _rc18a = _PI.main()
        sys.argv = ["pilot.py", "--nachkontrolle"]
        _rc18b = _PI.main()
    finally:
        sys.argv, _PI.nachkontrolle = _alt_argv18, _alt_pn18
    pruefe("pilot.py --nachkontrolle --einmal → nachkontrolle(einmal=True); ohne --einmal → False", _rec18 == [True, False] and _rc18a == 0 and _rc18b == 0, (_rec18, _rc18a, _rc18b))
    import signale as _SG18  # noqa: E402
    _gepusht18, _alt_push18 = [], _SG18.push
    _SG18.push = lambda t, *a, **k: _gepusht18.append(t)
    try:
        _rcb18 = _PI.lauf_besetzt(SP.Besetzt("Ein anderer Lauf handelt gerade (seit 12 s)."), False)
        _rct18 = _PI.lauf_besetzt(SP.Besetzt("Ein anderer Lauf handelt gerade (seit 12 s)."), True)
    finally:
        _SG18.push = _alt_push18
    pruefe("Tageslauf, Sperre belegt: ein ECHTER Lauf ist eine Warnung (rc 3) mit Push — nicht mehr still rc 0; ein Probelauf wird einfach abgewiesen (rc 0, kein Push)",
           _rcb18 == 3 and len(_gepusht18) == 1 and "NICHT gehandelt" in _gepusht18[0] and _rct18 == 0, (_rcb18, _rct18, _gepusht18))
    _quelle_main18 = _insp.getsource(_PI.main)
    pruefe("pilot.py main(): der Tageslauf ruft bei belegter Sperre `lauf_besetzt` (rc 3 + Push) — nicht mehr `return 0`", "return lauf_besetzt(ex, a.trocken)" in _quelle_main18, _quelle_main18[-400:])
    # der Push der Nachkontrolle im 10-Minuten-Takt: dieselbe Meldung höchstens einmal je Stunde (sonst ~144 Pushes am Tag bei einem dauerhaft offenen Markt), eine andere sofort, die lange Fassung immer
    _gepusht18.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht18.append(t), True)[1]  # (19. Prüfung W1) `push` gibt True nur bei zugestellter Meldung zurück
    _pd18 = Path(_sd) / "push18.json"
    try:
        _r18 = [_PI._push_nachkontrolle("Meldung A", True, datei=_pd18, jetzt=1000.0),
                _PI._push_nachkontrolle("Meldung A", True, datei=_pd18, jetzt=1600.0),
                _PI._push_nachkontrolle("Meldung B", True, datei=_pd18, jetzt=1700.0),
                _PI._push_nachkontrolle("Meldung B", True, datei=_pd18, jetzt=1700.0 + _PI.PUSH_ABSTAND_S + 1),
                _PI._push_nachkontrolle("Meldung B", False, datei=_pd18, jetzt=1701.0 + _PI.PUSH_ABSTAND_S + 1)]
    finally:
        _SG18.push = _alt_push18
    pruefe("Push der Nachkontrolle im 10-Minuten-Takt: gleiche Meldung nach 10 Min. still, andere Meldung sofort, nach einer Stunde wieder, die lange Fassung (einmal=False) immer",
           _r18 == [True, False, True, True, True] and len(_gepusht18) == 4 and all("Keine Anlageberatung" in t for t in _gepusht18), (_r18, _gepusht18))
    _pd18.write_text("{kaputt")
    _SG18.push = lambda t, *a, **k: (_gepusht18.append(t), True)[1]
    try:
        _r_kaputt18 = _PI._push_nachkontrolle("Meldung C", True, datei=_pd18, jetzt=5000.0)
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung: eine kaputte Drosselungs-Datei verhindert den Push nie", _r_kaputt18 is True and _gepusht18[-1].startswith("Meldung C"), _gepusht18)
    # ── 19. Prüfung W1/K3: nur eine ZUGESTELLTE Meldung drosselt; Uhr zurück und geänderte Meldung pushen wieder ──
    _pd19 = Path(_sd) / "push19.json"
    _gepusht19, _antworten19 = [], [False, False, True, True]
    _SG18.push = lambda t, *a, **k: (_gepusht19.append(t), _antworten19.pop(0))[1]
    try:
        _w1 = [_PI._push_nachkontrolle("Meldung D", True, datei=_pd19, jetzt=1000.0),   # Zustellung scheitert (Netz/Telegram weg) → False
               _PI._push_nachkontrolle("Meldung D", True, datei=_pd19, jetzt=1600.0),   # NICHT gedrosselt: der erste Versuch kam nie an → False (immer noch Fehler)
               _PI._push_nachkontrolle("Meldung D", True, datei=_pd19, jetzt=2200.0),   # kommt an → True
               _PI._push_nachkontrolle("Meldung D", True, datei=_pd19, jetzt=2800.0)]   # jetzt gedrosselt → False, KEIN weiterer push-Aufruf
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (19. W1): eine NICHT zugestellte Meldung (push → False) drosselt nicht; erst die zugestellte Meldung drosselt die nächste",
           len(_gepusht19) == 3 and _w1 == [False, False, True, False] and _antworten19 == [True], (_w1, _gepusht19, _antworten19))
    _gepusht19.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht19.append(t), True)[1]
    try:
        _pd19b = Path(_sd) / "push19b.json"
        _PI._push_nachkontrolle("Meldung E", True, datei=_pd19b, jetzt=10000.0)
        _uhr_zurueck = _PI._push_nachkontrolle("Meldung E", True, datei=_pd19b, jetzt=10000.0 - 3000.0)  # Uhr springt 50 Min. zurück
        _zeile2 = _PI._push_nachkontrolle("Meldung E\n⚠️ Markt ETH nicht gesichert", True, datei=_pd19b, jetzt=10000.0 - 2990.0)  # gleiche erste Zeile, andere zweite → ANDERE Meldung
        _gleich = _PI._push_nachkontrolle("Meldung E\n⚠️ Markt ETH nicht gesichert", True, datei=_pd19b, jetzt=10000.0 - 2980.0)  # dieselbe nochmals → gedrosselt
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (19. K3): Uhr springt zurück → die Meldung geht wieder raus; eine Meldung mit geänderter ZWEITER Zeile ist eine andere Meldung (Kennung = ganzer Text); dieselbe nochmals wird gedrosselt",
           _uhr_zurueck is True and _zeile2 is True and _gleich is False and len(_gepusht19) == 3, (_uhr_zurueck, _zeile2, _gleich, _gepusht19))
    _pd19c = Path(_sd) / "push19c.json"
    _SG18.push = lambda t, *a, **k: (_gepusht19.append(t), True)[1]
    _gepusht19.clear()
    try:
        _abstand19 = [_PI._push_nachkontrolle("Meldung F", True, datei=_pd19c, jetzt=100000.0), _PI._push_nachkontrolle("Meldung F", True, datei=_pd19c, jetzt=100000.0 + 3500),
                      _PI._push_nachkontrolle("Meldung F", True, datei=_pd19c, jetzt=100000.0 + 3700)]
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung: dieselbe Meldung wird nach 58 Min. noch gedrosselt und nach 62 Min. wieder gesendet (die Stunde steht fest, nicht nur als Konstante)", _abstand19 == [True, False, True] and _PI.PUSH_ABSTAND_S == 3600 and len(_gepusht19) == 2, (_abstand19, _PI.PUSH_ABSTAND_S))

    # ── 20. Prüfung klein 5: mehrere Kennungen der letzten Stunde bleiben gemerkt (abwechselnde Texte A, B, A, B kamen vorher alle an) ──
    import hashlib as _hl20  # noqa: E402
    import json as _js20  # noqa: E402
    _gepusht20 = []
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    _pd20 = Path(_sd) / "push20.json"
    try:
        _abab20 = [_PI._push_nachkontrolle(t_, True, datei=_pd20, jetzt=z_) for t_, z_ in
                   (("Meldung A", 1000.0), ("Meldung B", 1600.0), ("Meldung A", 2200.0), ("Meldung B", 2800.0), ("Meldung A", 3400.0))]
        _nach_h20 = _PI._push_nachkontrolle("Meldung A", True, datei=_pd20, jetzt=1000.0 + _PI.PUSH_ABSTAND_S + 1)   # A ist eine Stunde alt → geht wieder raus
        _b_still20 = _PI._push_nachkontrolle("Meldung B", True, datei=_pd20, jetzt=1000.0 + _PI.PUSH_ABSTAND_S + 2)  # B (um 1600 gesendet) noch keine Stunde → still
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (20. klein 5): abwechselnde Meldungen A, B, A, B, A kommen nur je EINMAL je Stunde an (vorher alle fünf); nach einer Stunde geht A wieder raus, das jüngere B bleibt still",
           _abab20 == [True, True, False, False, False] and _nach_h20 is True and _b_still20 is False and len(_gepusht20) == 3, (_abab20, _nach_h20, _b_still20, _gepusht20))
    # … die Datei der früheren Fassung ({kennung, zeit}) wird verstanden; eine Obergrenze hält sie klein; abgelaufene Einträge verschwinden
    _pd20b = Path(_sd) / "push20b.json"
    _pd20b.write_text(_js20.dumps({"kennung": _hl20.sha1("Meldung X".encode("utf-8")).hexdigest()[:16], "zeit": 7000.0}))
    _gepusht20.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    try:
        _alt_fmt20 = _PI._push_nachkontrolle("Meldung X", True, datei=_pd20b, jetzt=7100.0)
        _pd20c = Path(_sd) / "push20c.json"
        _buchst20 = [chr(ord("A") + _i20) for _i20 in range(_PI.PUSH_MERKEN + 4)]   # Buchstaben, keine Zahlen: Zahlen gelten in der Kennung als dieselbe Meldung
        for _i20, _b20 in enumerate(_buchst20):
            _PI._push_nachkontrolle(f"Meldung {_b20}", True, datei=_pd20c, jetzt=100.0 + _i20)
        _inhalt20 = _js20.loads(_pd20c.read_text())["meldungen"]
        _gepusht20.clear()
        _PI._push_nachkontrolle("Meldung A", True, datei=_pd20c, jetzt=200.0)       # die älteste ist über die Obergrenze hinaus vergessen → geht wieder raus
        _PI._push_nachkontrolle(f"Meldung {_buchst20[-1]}", True, datei=_pd20c, jetzt=201.0)  # die jüngste ist noch gemerkt → still
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (20. klein 5): die alte Dateifassung wird verstanden (gleiche Meldung gedrosselt); höchstens PUSH_MERKEN Einträge bleiben; was darüber hinausfällt, geht wieder raus, das Jüngste bleibt still",
           _alt_fmt20 is False and len(_inhalt20) == _PI.PUSH_MERKEN and len(_gepusht20) == 1 and _gepusht20[0].startswith("Meldung A"), (_alt_fmt20, len(_inhalt20), _gepusht20))

    # … (Code-Review der R20) eine ENTWARNUNG («geklärt») beendet die Folge der Warnungen: kehrt dieselbe Warnung zurück, ist das ein neues Ereignis und geht sofort raus (A, C, A, C — vorher stünde «geklärt» auf dem Handy, während der Markt wieder offen ist)
    _pd20e = Path(_sd) / "push20e.json"
    _gepusht20.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    try:
        _folge20 = [_PI._push_nachkontrolle(t_, True, datei=_pd20e, jetzt=z_, warnung=w_) for t_, z_, w_ in
                    (("Meldung A", 1000.0, True), ("Meldung A", 1100.0, True),            # gleiche Warnung: gedrosselt
                     ("Meldung C geklärt", 1200.0, False), ("Meldung C geklärt", 1300.0, False),  # gleiche Entwarnung: gedrosselt
                     ("Meldung A", 1400.0, True),                                           # die Warnung kehrt zurück → neu
                     ("Meldung C geklärt", 1500.0, False),                                  # … und die Entwarnung dazu auch
                     ("Meldung A", 1600.0, True),                                           # wieder eine Warnung → neu
                     ("Meldung B", 1700.0, True), ("Meldung A", 1800.0, True), ("Meldung B", 1900.0, True))]  # innerhalb einer Folge: A, B, A, B → nur je einmal
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (Code-Review R20): eine Entwarnung beendet die Folge der Warnungen — A, A (still), C, C (still), A, C, A, B (alle neu), A, B (still)",
           _folge20 == [True, False, True, False, True, True, True, True, False, False] and len(_gepusht20) == 6, (_folge20, _gepusht20))
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    try:
        _vorab20 = _PI._push_nachkontrolle("Meldung A", True, datei=_pd20e, jetzt=2000.0)   # ohne «warnung» gilt die Meldung als Warnung (Vorgabe, wie bisher)
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung: ohne Angabe gilt eine Meldung als Warnung (Vorgabe warnung=True) — dieselbe Warnung innerhalb der Folge bleibt gedrosselt", _vorab20 is False, _vorab20)

    # … (Code-Review der R20) die Kennung ignoriert ZAHLEN: dieselbe Warnung mit wandernder Zahl («seit 12 s», «Kurs 3636») ist ein und dieselbe Meldung — sonst bekäme jeder Takt eine neue und die Drosselung liesse ~144 Pushes am Tag durch
    _pd20n = Path(_sd) / "push20n.json"
    _gepusht20.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    try:
        _zahl20 = [_PI._push_nachkontrolle(t_, True, datei=_pd20n, jetzt=z_) for t_, z_ in
                   (("Not-Aus: Ein anderer Lauf handelt gerade (seit 12 s).", 100.0), ("Not-Aus: Ein anderer Lauf handelt gerade (seit 87 s).", 700.0),
                    ("Kein Kurs lesbar, zuletzt bekannter Kurs 3636", 800.0), ("Kein Kurs lesbar, zuletzt bekannter Kurs 3'641.5", 1400.0),
                    ("Stop 1.776 @ 4242 fehlt", 1450.0), ("Stop 1.776 @ 4'250.5 fehlt", 1460.0), ("vor 7 Min. nicht gesichert: Markt BTC", 1470.0), ("vor 77 Min. nicht gesichert: Markt BTC", 1480.0),
                    ("Markt BTC nicht gesichert", 1500.0), ("Markt ETH nicht gesichert", 1600.0),
                    ("BTC Perp SELL 0.003: noch immer unklar", 1700.0), ("BTC Perp SELL 0.5: noch immer unklar", 1800.0))]
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung (Code-Review R20): Meldungen, die sich nur durch ein ALTER («seit 12 s», «vor 7 Min.») oder einen KURS («Kurs 3636», «@ 4242») unterscheiden, sind dieselbe Meldung (je einmal je Stunde); ein anderer Markt ist eine andere — und eine andere MENGE auch (0,003 gegenüber 0,5 BTC unklar)",
           _zahl20 == [True, False, True, False, True, False, True, False, True, True, True, True] and len(_gepusht20) == 8, (_zahl20, _gepusht20))
    # … ein Push, der mit einer Ausnahme scheitert (z. B. ein ntfy-Server ohne «https://»: ValueError vor dem Senden), beendet nie den Durchgang
    _SG18.push = lambda t, *a, **k: (_ for _ in ()).throw(ValueError("unknown url type: 'ntfy.sh/abc'"))
    try:
        import io as _io20x  # noqa: E402
        import contextlib as _cl20x  # noqa: E402
        _aus20x = _io20x.StringIO()
        with _cl20x.redirect_stdout(_aus20x):
            _fehl20 = _PI._push_nachkontrolle("Markt BTC nicht gesichert (Ausnahme)", True, datei=Path(_sd) / "push20x.json", jetzt=1.0)
        _fehl20_ok = _fehl20 is False and "Push der Nachkontrolle fehlgeschlagen (ValueError)" in _aus20x.getvalue()
    except Exception as _ex20x:  # noqa: BLE001
        _fehl20_ok = False
        _fehl20 = repr(_ex20x)
    finally:
        _SG18.push = _alt_push18
    pruefe("Push-Drosselung: scheitert der Push mit einer Ausnahme (ValueError), gibt `_push_nachkontrolle` False zurück und meldet es im Protokoll — der Durchgang stürzt nicht ab (vorher: Ausnahme, rc 1 = «Absturz?» im Cockpit)", _fehl20_ok, _fehl20)

    # … übersprungene Durchgänge (die Lauf-Sperre hält ein anderer Lauf): ab BESETZT_PUSH_AB in Folge geht EINE Meldung aufs Handy (höchstens einmal je Stunde) — die Lampe im Cockpit sieht nur, wer es offen hat
    from contextlib import contextmanager as _cm20b  # noqa: E402
    import broker_futures as _BF20b  # noqa: E402

    @_cm20b
    def _besetzt20b(*a, **k):
        raise SP.Besetzt("Ein anderer Lauf handelt gerade (seit 12 s).")
        yield  # pragma: no cover
    _alt20b = (_BF20b.einstellungen, _PI.NK_SERIE, _P2L.nachkontrolle, SP.lauf_sperre, _PI.PUSH_STILL)
    _BF20b.einstellungen = lambda *a, **k: {"stop": False}
    _PI.NK_SERIE, _PI.PUSH_STILL = Path(_sd) / "serie20b2.json", Path(_sd) / "push20b2.json"
    SP.lauf_sperre = _besetzt20b
    _gepusht20.clear()
    _SG18.push = lambda t, *a, **k: (_gepusht20.append(t), True)[1]
    _rc20b = []
    try:
        for _i20b in range(6):
            _rc20b.append((_PI.nachkontrolle(einmal=True), len(_gepusht20)))
    finally:
        _SG18.push = _alt_push18
        _BF20b.einstellungen, _PI.NK_SERIE, _P2L.nachkontrolle, SP.lauf_sperre, _PI.PUSH_STILL = _alt20b
    pruefe("Übersprungene Durchgänge (Lauf-Sperre belegt): Rückgabewert 0 wie bisher; die ersten drei still, ab dem 4. in Folge EIN Push (die Drosselung hält die weiteren zurück: gleiche Meldung, keine Zahl im Text)",
           _rc20b == [(0, 0), (0, 0), (0, 0), (0, 1), (0, 1), (0, 1)] and "Lauf-Sperre hält ein anderer Lauf" in _gepusht20[0] and _PI.BESETZT_PUSH_AB == 4, (_rc20b, _gepusht20))
    # … und ein Push, der mit einer Ausnahme scheitert, macht aus dem Überspringen keinen Absturz (rc 0 bleibt)
    _BF20b.einstellungen = lambda *a, **k: {"stop": False}
    SP.lauf_sperre = _besetzt20b
    _PI.PUSH_STILL = Path(_sd) / "push20b3.json"
    _SG18.push = lambda t, *a, **k: (_ for _ in ()).throw(ValueError("unknown url type"))
    try:
        with _cl20x.redirect_stdout(_io20x.StringIO()):
            _rc20c = _PI.nachkontrolle(einmal=True)
    except Exception as _ex20c:  # noqa: BLE001
        _rc20c = repr(_ex20c)
    finally:
        _SG18.push = _alt_push18
        _BF20b.einstellungen, _PI.NK_SERIE, _P2L.nachkontrolle, SP.lauf_sperre, _PI.PUSH_STILL = _alt20b
    pruefe("Übersprungene Durchgänge: scheitert der Push mit einer Ausnahme, bleibt es beim Rückgabewert 0 (kein Absturz, kein «Absturz?» im Cockpit)", _rc20c == 0, _rc20c)

    # ── 20. Prüfung wichtig 1 / klein 8: die Reihe gleichartiger Durchgänge (Grundlage der Cockpit-Ampel) ──
    _sf20 = Path(_sd) / "serie20.json"

    def _serie20():
        return _js20.loads(_sf20.read_text())
    _PI._serie_merken("ok", datei=_sf20, jetzt=1000.0)
    _s1 = _serie20()
    _PI._serie_merken("warnung", datei=_sf20, jetzt=1600.0)
    _s2 = _serie20()
    _PI._serie_merken("warnung", datei=_sf20, jetzt=2200.0)
    _s3 = _serie20()
    _PI._serie_merken("besetzt", datei=_sf20, jetzt=2800.0)
    _s4 = _serie20()
    _PI._serie_merken("besetzt", datei=_sf20, jetzt=3400.0)
    _s5 = _serie20()
    _PI._serie_merken("besetzt", datei=_sf20, jetzt=3400.0 + _PI.SERIE_LUECKE_S + 1)   # Lücke > 30 Min. (PC aus): «in Folge» heisst im 10-Minuten-Takt
    _s6 = _serie20()
    _PI._serie_merken("besetzt", datei=_sf20, jetzt=3400.0 + _PI.SERIE_LUECKE_S - 100)  # Uhr springt zurück: keine negative Dauer, die Reihe beginnt neu
    _s7 = _serie20()
    pruefe("Reihe der Durchgänge: ok, warnung ×2, besetzt ×2 — «anzahl» zählt gleichartige in Folge, «seit» ist der Beginn der Reihe",
           (_s1["art"], _s1["anzahl"]) == ("ok", 1) and (_s2["art"], _s2["anzahl"], _s2["seit"]) == ("warnung", 1, 1600.0) and (_s3["art"], _s3["anzahl"], _s3["seit"]) == ("warnung", 2, 1600.0)
           and (_s4["art"], _s4["anzahl"], _s4["seit"]) == ("besetzt", 1, 2800.0) and (_s5["anzahl"], _s5["seit"], _s5["zeit"]) == (2, 2800.0, 3400.0), (_s1, _s2, _s3, _s4, _s5))
    pruefe("Reihe der Durchgänge: nach einer Lücke von mehr als SERIE_LUECKE_S (PC aus) und nach einem Zeitsprung zurück beginnt sie neu (anzahl 1)",
           (_s6["anzahl"], _s6["seit"]) == (1, 3400.0 + _PI.SERIE_LUECKE_S + 1) and _s7["anzahl"] == 1 and _PI.SERIE_LUECKE_S == 1800, (_s6, _s7))
    _sf20.write_text("{kaputt")
    _PI._serie_merken("warnung", datei=_sf20, jetzt=9000.0)
    _kaputt20 = _serie20()
    import contextlib as _cl20  # noqa: E402
    import io as _io20  # noqa: E402
    _aus20 = _io20.StringIO()
    try:
        with _cl20.redirect_stdout(_aus20):
            _PI._serie_merken("ok", datei=Path(_sd) / "serie20.json" / "unter" / "datei.json", jetzt=1.0)   # der Ordner ist eine Datei → Schreiben unmöglich
        _fehlerfrei20 = True
    except Exception:  # noqa: BLE001
        _fehlerfrei20 = False
    pruefe("Reihe der Durchgänge: eine kaputte Datei beginnt die Reihe neu; ein Schreibfehler stört den Durchgang nie (keine Ausnahme) — steht aber im Protokoll (sonst bliebe eine Dauerwarnung unbemerkt grau)",
           _kaputt20["anzahl"] == 1 and _kaputt20["art"] == "warnung" and _fehlerfrei20 and "Reihe der Durchgänge nicht gespeichert" in _aus20.getvalue(), (_kaputt20, _fehlerfrei20, _aus20.getvalue()))
    pruefe("Reihe der Durchgänge: nach einem Schreibfehler bleibt keine Zwischendatei liegen", not list(Path(_sd).glob("serie20*.tmp*")), list(Path(_sd).glob("serie20*.tmp*")))
    # … auch dann nicht, wenn die Zwischendatei schon geschrieben ist und erst das UMBENENNEN scheitert (Windows: Datei gehalten) — der Fall oben scheitert vor dem Schreiben und kann das Aufräumen nicht zeigen
    _orig_replace20 = _os.replace

    def _replace_zickt20(a_, b_, *args_, **kw_):
        if "serie20c" in str(b_):
            raise PermissionError("gehalten")
        return _orig_replace20(a_, b_, *args_, **kw_)
    _os.replace = _replace_zickt20
    _aus20c = _io20.StringIO()
    try:
        with _cl20.redirect_stdout(_aus20c):
            _PI._serie_merken("ok", datei=Path(_sd) / "serie20c.json", jetzt=5.0)
    finally:
        _os.replace = _orig_replace20
    pruefe("Reihe der Durchgänge: scheitert erst das Umbenennen (Zwischendatei schon geschrieben), wird sie aufgeräumt und der Fehler gemeldet — keine Ausnahme, kein Rest",
           not list(Path(_sd).glob("serie20c*")) and "Reihe der Durchgänge nicht gespeichert (PermissionError)" in _aus20c.getvalue(), (list(Path(_sd).glob("serie20c*")), _aus20c.getvalue()))
    # `nachkontrolle(einmal=True)` führt die Reihe, die lange Fassung nicht
    from contextlib import contextmanager as _cm20  # noqa: E402

    @_cm20
    def _sperre_besetzt20(*a, **k):
        raise SP.Besetzt("Ein anderer Lauf handelt gerade (seit 12 s).")
        yield  # pragma: no cover

    import broker_futures as _BF20  # noqa: E402
    _alt_ein20 = _BF20.einstellungen
    _BF20.einstellungen = lambda *a, **k: {"stop": False}  # (Code-Review) unabhängig von KI_BOT_STOP=1 in der Umgebung und von einer STOP-Datei: ein aktiver Not-Aus nimmt den Zweig «Sperre besetzt» ganz anders
    _alt_serie20, _alt_push20, _alt_lauf20, _alt_sp20 = _PI.NK_SERIE, _PI._push_nachkontrolle, _P2L.nachkontrolle, SP.lauf_sperre
    _antwort20 = [{"zeilen": [], "warnung": False, "auftraege": []}]
    _PI.NK_SERIE = Path(_sd) / "serie20b.json"
    _pushs20 = []
    _PI._push_nachkontrolle = lambda text_, einmal_, *a, **k: (_pushs20.append((text_, einmal_, k.get("warnung"))), True)[1]
    _P2L.nachkontrolle = lambda *a, **k: _antwort20[0]
    SP.ORDNER = Path(_sd)
    _arten20, _rcs20 = [], []
    try:
        def _lies20():
            return _js20.loads(_PI.NK_SERIE.read_text())
        _antwort20[0] = {"zeilen": ["Nachkontrolle: geklärt, Stops gesetzt."], "warnung": False, "auftraege": []}
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # ok (mit einer Entwarnung: push mit warnung=False)
        _antwort20[0] = {"zeilen": ["⚠️ Markt BTC weiterhin nicht vollständig gesichert"], "warnung": True, "auftraege": []}
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # warnung 1
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # warnung 2
        _vor_lang20 = _PI.NK_SERIE.read_text()
        _rcs20.append(_PI.nachkontrolle(einmal=False)); _nach_lang20 = _PI.NK_SERIE.read_text()          # die lange Fassung (hinter dem Tageslauf) führt keine Reihe
        SP.lauf_sperre = _sperre_besetzt20
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # besetzt 1 (rc 0: der andere Lauf prüft selbst)
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # besetzt 2
        SP.lauf_sperre = _alt_sp20
        _P2L.nachkontrolle = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("Absturz mitten im Durchgang"))
        _rcs20.append(_PI.nachkontrolle(einmal=True)); _arten20.append(_lies20())                       # Ausnahme → Warnung (rc 3)
    finally:
        _PI.NK_SERIE, _PI._push_nachkontrolle, _P2L.nachkontrolle, SP.lauf_sperre, SP.ORDNER = _alt_serie20, _alt_push20, _alt_lauf20, _alt_sp20, _alt_ord
        _BF20.einstellungen = _alt_ein20
    pruefe("nachkontrolle(einmal=True) führt die Reihe: ok → warnung ×2 (rc 3), die lange Fassung ändert sie nicht, «Sperre besetzt» (rc 0) zählt als «besetzt» ×2, eine Ausnahme im Durchgang ist eine Warnung (rc 3)",
           [(a_["art"], a_["anzahl"]) for a_ in _arten20] == [("ok", 1), ("warnung", 1), ("warnung", 2), ("besetzt", 1), ("besetzt", 2), ("warnung", 1)]
           and _rcs20 == [0, 3, 3, 3, 0, 0, 3] and _vor_lang20 == _nach_lang20, (_arten20, _rcs20))
    pruefe("nachkontrolle(einmal=True) meldet der Push-Drosselung die ART des Durchgangs: eine Entwarnung (warnung=False) beendet die Folge der Warnungen, eine Warnung (warnung=True) nicht; die lange Fassung drosselt nicht (einmal=False)",
           [(e_, w_) for _t, e_, w_ in _pushs20[:4]] == [(True, False), (True, True), (True, True), (False, True)], _pushs20)

# ── Pilot: Märkte, Trendlänge je Coin, Logbuch, Wochenbericht ──
import pilot as PI  # noqa: E402

testumgebung.schalter_umbiegen(PI)

pruefe("Standard: Bitcoin + Ethereum", PI.maerkte({}) == ["BTC", "ETH"])
pruefe("nur BTC einstellbar, Unsinn ignoriert", PI.maerkte({"KRYPTO_PILOT_MAERKTE": "btc, doge"}) == ["BTC"]
       and PI.maerkte({"KRYPTO_PILOT_MAERKTE": "xyz"}) == ["BTC"])
from datetime import date as _d, datetime as _dt, timedelta as _td, timezone as _tz  # noqa: E402
kurse = [((_d(2024, 1, 1) + _td(days=i)).isoformat(), x) for i, x in enumerate(wild)]
j = _dt(2030, 1, 1, tzinfo=_tz.utc)
eb, ee = PI.entscheid("BTC", env={}, jetzt=j, kurse=kurse, mvrv={}), PI.entscheid("ETH", env={}, jetzt=j, kurse=kurse, mvrv={})
pruefe("BTC rechnet mit 150, ETH mit 200 Tagen", eb["trend_tage"] == 150 and ee["trend_tage"] == 200 and eb["symbol"] == "BTCUSDT"
       and ee["symbol"] == "ETHUSDT" and eb["schnitt"] == round(K.sma(wild, 150)[-1], 2))
pruefe("laufender Tag zählt nicht", PI.entscheid("BTC", env={}, jetzt=_dt(2024, 1, 11, tzinfo=_tz.utc), kurse=kurse, mvrv={})["stand"] == "2024-01-10")
lb = {"entscheide": [{"stand": "2026-10-01", "hebel": 0.5}, {"markt": "ETH", "stand": "2026-10-02", "hebel": -0.3}], "kontostand": []}
pruefe("altes Logbuch (ohne Markt) zählt als Bitcoin", PI.letzter(lb, "BTC")["stand"] == "2026-10-01" and PI.letzter(lb, "ETH")["hebel"] == -0.3)
PI.kontostand_merken(lb, "2026-10-01", 10000)
PI.kontostand_merken(lb, "2026-10-01", 10100)
pruefe("ein Kontostand je Tag", lb["kontostand"] == [{"tag": "2026-10-01", "kapital": 10100.0}])
w1 = PI.wochenbericht(lb, "2026-10-01")
pruefe("erster Bericht kommt sofort", w1 and "10'100.00" in w1 and lb["letzter_bericht"] == "2026-10-01", w1)
PI.kontostand_merken(lb, "2026-10-05", 10500)
pruefe("vor 7 Tagen kein zweiter Bericht", PI.wochenbericht(lb, "2026-10-07") is None)
PI.kontostand_merken(lb, "2026-10-08", 9595)
w2 = PI.wochenbericht(lb, "2026-10-08")
pruefe("Wochenbericht: seit Start, Vorwoche, unter Höchststand", w2 and "-5.0 %" in w2 and "seit Vorwoche: -5.0 %" in w2
       and "unter Höchststand: -8.6 %" in w2, w2)

# ── Tageslauf: abgewählter Markt mit offener Position wird geschlossen, Lagebild erst nach den Aufträgen ──
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import signale as _SG  # noqa: E402
with _tf.TemporaryDirectory() as _hd:
    alt_lb, alt_ausf, alt_push = PI.LOGBUCH, BF.ausfuehren, _SG.push
    PI.LOGBUCH = Path(_hd) / "pilot.json"
    reihenfolge, gesendet = [], []

    def _ausf(e_, trocken=False, symbol=None, gewicht=1.0, **k_):
        reihenfolge.append(("auftrag", symbol))
        if symbol == "ETHUSDT":
            e_["broker"] = {"position": 0.0, "hinweis": "", "fehler": False, "modus": "testnetz"}
            return [{"seite": "SELL", "menge": 1.5, "reduce_only": True, "id": 7}]
        e_["broker"] = {"position": 0.1, "hinweis": "", "fehler": False, "modus": "testnetz"}
        return []

    def _lage():
        reihenfolge.append(("lage", None))
        return "Lagebild: test"

    BF.ausfuehren, _SG.push = _ausf, gesendet.append
    try:
        rc = PI.handeln([dict(eb)], _lage, trocken=False)
    finally:
        PI.LOGBUCH, BF.ausfuehren, _SG.push = alt_lb, alt_ausf, alt_push
    pruefe("abgewählter Markt (nur BTC gewählt): offene ETH-Position wird geschlossen und gemeldet",
           ("auftrag", "ETHUSDT") in reihenfolge and gesendet and "ETH ist abgewählt" in gesendet[0] and "SELL 1.5" in gesendet[0], (reihenfolge, gesendet))
    pruefe("Lagebild erst NACH allen Aufträgen geholt", reihenfolge[-1] == ("lage", None) and "Lagebild: test" in gesendet[0], reihenfolge)

# ── nachgebauter Binance-Futures-Server ──
GEHEIM = "futures-geheim"


class Fake(BaseHTTPRequestHandler):
    log, pos, hedge, rechte = [], 0.0, False, {"enableWithdrawals": False}
    stops, markt_fehler, stop_fehler, mark = [], None, None, "50000"
    nach_markt = None  # wird nach jedem ausgeführten Marktauftrag aufgerufen (z. B. Not-Aus mitten im Lauf)
    cids, ausgefuehrt_503, hebel_fehler = {}, False, False  # Auftragskennungen; «503 aber ausgeführt»; −4161 beim Hebel

    def _a(self, o, code=200):
        b = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b)

    def _sig(self, q):
        roh, _, s = q.rpartition("&signature=")
        return s == hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest()

    def _route(self, methode):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        Fake.log.append((methode, pfad, p, self._sig(q) if "signature" in q else None))
        if "signature" in q and not self._sig(q):
            return self._a({"code": -1022, "msg": "Signature"}, 400)
        if pfad == "/fapi/v1/time":
            import time as _t
            return self._a({"serverTime": int(_t.time() * 1000)})
        if pfad == "/fapi/v1/positionSide/dual":
            return self._a({"dualSidePosition": Fake.hedge})
        if pfad == "/sapi/v1/account/apiRestrictions":
            return self._a(Fake.rechte)
        if pfad == "/fapi/v1/exchangeInfo":
            return self._a({"symbols": [{"symbol": "BTCUSDT", "status": "TRADING", "filters": [
                {"filterType": "PRICE_FILTER", "tickSize": "0.10"}, {"filterType": "LOT_SIZE", "stepSize": "0.001", "minQty": "0.001"},
                {"filterType": "MARKET_LOT_SIZE", "stepSize": "0.001", "minQty": "0.001"}, {"filterType": "MIN_NOTIONAL", "notional": "100"}]}]})
        if pfad == "/fapi/v2/account":
            return self._a({"totalWalletBalance": "20000", "totalUnrealizedProfit": "0"})
        if pfad == "/fapi/v2/positionRisk":
            return self._a([{"symbol": "BTCUSDT", "positionAmt": str(Fake.pos)}])
        if pfad == "/fapi/v1/premiumIndex":
            return self._a({"markPrice": Fake.mark, "lastFundingRate": "0.0001"})
        # Binance seit 09.12.2025: bedingte Aufträge nur noch im Algo-Service
        if pfad == "/fapi/v1/openAlgoOrders":
            return self._a([{"algoId": i + 100, "algoType": "CONDITIONAL", "orderType": "STOP_MARKET", "closePosition": True,
                             "side": x["side"], "triggerPrice": x["stopPrice"], "algoStatus": "NEW"} for i, x in enumerate(Fake.stops)])
        if pfad == "/fapi/v1/openOrders":
            return self._a([])
        if pfad == "/fapi/v1/algoOpenOrders" and methode == "DELETE":
            Fake.stops = []
            return self._a({"code": 200, "msg": "The operation of cancel all open order is done."})
        if pfad == "/fapi/v1/allOpenOrders" and methode == "DELETE":
            return self._a({"code": 200, "msg": "ok"})
        if pfad == "/fapi/v1/order" and p.get("type") == "STOP_MARKET":
            return self._a({"code": -4120, "msg": "Order type not supported for this endpoint. Please use the Algo Order API endpoints instead."}, 400)
        if pfad == "/fapi/v1/algoOrder" and methode == "POST":
            if p.get("algoType") != "CONDITIONAL" or p.get("type") != "STOP_MARKET" or "quantity" in p:
                return self._a({"code": -1102, "msg": "falsche Parameter"}, 400)
            if Fake.stop_fehler and Fake.stop_fehler.get("preis") in (None, p["triggerPrice"]):
                return self._a({k: v for k, v in Fake.stop_fehler.items() if k != "preis"}, 400)
            if any(x["side"] == p["side"] for x in Fake.stops):
                return self._a({"code": -4130, "msg": "closePosition in the direction is existing"}, 400)
            Fake.stops.append({"side": p["side"], "stopPrice": p["triggerPrice"]})
            return self._a({"algoId": 2, "algoStatus": "NEW"})
        if pfad == "/fapi/v1/marginType":
            return self._a({"code": -4046, "msg": "No need to change margin type."}, 400)
        if pfad == "/fapi/v1/order" and methode == "GET" and p.get("origClientOrderId"):
            if p["origClientOrderId"] in Fake.cids:
                return self._a({"orderId": 1, "status": Fake.cids[p["origClientOrderId"]]})
            return self._a({"code": -2013, "msg": "Order does not exist."}, 400)
        if pfad == "/fapi/v1/leverage" and Fake.hebel_fehler:
            return self._a({"code": -4161, "msg": "Leverage reduction is not supported in Isolated Margin Mode with open positions."}, 400)
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET":
            if Fake.ausgefuehrt_503:
                Fake.pos = round(Fake.pos + float(p["quantity"]) * (1 if p["side"] == "BUY" else -1), 6)
                Fake.cids[p.get("newClientOrderId")] = "FILLED"
                return self._a({"code": -1001, "msg": "Unknown error, please check your request or try again later."}, 503)
            if Fake.markt_fehler:
                return self._a(Fake.markt_fehler, 503)
            q2 = float(p["quantity"]) * (1 if p["side"] == "BUY" else -1)
            Fake.pos = round(Fake.pos + q2, 6)
            Fake.cids[p.get("newClientOrderId")] = "FILLED"
            if Fake.nach_markt:
                Fake.nach_markt()
            return self._a({"orderId": 1, "status": "FILLED"})
        return self._a({"ok": True})

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_DELETE(self):
        self._route("DELETE")

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_port}"
env = {"BINANCE_FUTURES_API_KEY": "KEY-F", "BINANCE_FUTURES_API_SECRET": GEHEIM, "BINANCE_FUTURES_URL": url, "BINANCE_SPOT_URL": url,
       "KI_BOT_MAX_AUFTRAG": "100000"}
prot = []
ent = {"hebel": 1.0, "stop_long": 45000.04, "stop_short": 55000.0, "stand": "2026-10-06"}
BF.ausfuehren(ent, trocken=True, env=env, protokolliere=prot.append)
pruefe("trocken: keine Aufträge", not [x for x in Fake.log if x[1] == "/fapi/v1/order"])
BF.ausfuehren(ent, env=env, protokolliere=prot.append)
orders = [x for x in Fake.log if x[1] == "/fapi/v1/order"]
pruefe("Kauf 0.2 BTC mit gültiger Signatur", orders and orders[0][2]["side"] == "BUY" and orders[0][2]["quantity"] == "0.2" and orders[0][3], orders[:1])
pruefe("ISOLATED-Margin und Hebel 1 gesetzt", any(x[1] == "/fapi/v1/leverage" and x[2]["leverage"] == "1" for x in Fake.log))
stops = [x for x in Fake.log if x[1] == "/fapi/v1/algoOrder"]
pruefe("Börsen-Stop als Algo-Auftrag gesetzt, auf Tick gerundet, Markpreis", stops and stops[-1][2]["triggerPrice"] == "45000"
       and stops[-1][2]["closePosition"] == "true" and stops[-1][2]["workingType"] == "MARK_PRICE" and stops[-1][2]["algoType"] == "CONDITIONAL"
       and stops[-1][3], stops[-1:])
pruefe("kein Stop mehr über den alten Weg (/fapi/v1/order, Binance −4120)", not [x for x in orders if x[2].get("type") == "STOP_MARKET"])
pruefe("ohne alten Stop wird nichts gelöscht", not any(x[0] == "DELETE" for x in Fake.log) and len(Fake.stops) == 1)
n_lev = len(Fake.log)
n0 = len([x for x in Fake.log if x[1] == "/fapi/v1/order" and x[2].get("type") == "MARKET"])
BF.ausfuehren(dict(ent, hebel=-1.0), env=env, protokolliere=prot.append)
neu = [x[2] for x in Fake.log if x[1] == "/fapi/v1/order" and x[2].get("type") == "MARKET"][n0:]
pruefe("Richtungswechsel: alter Stop ersetzt, neuer Stop auf der Short-Seite", Fake.stops == [{"side": "BUY", "stopPrice": "55000"}], Fake.stops)
wechsel_log = [x[1] for x in Fake.log[n_lev:] if x[1] in ("/fapi/v1/order", "/fapi/v1/leverage", "/fapi/v1/marginType")]
pruefe("Richtungswechsel: vor der Gegenposition Margin-Art und Hebel neu gesetzt", wechsel_log[:4] == ["/fapi/v1/order", "/fapi/v1/marginType", "/fapi/v1/leverage", "/fapi/v1/order"],
       wechsel_log)
pruefe("Richtungswechsel: schliessen (reduceOnly) + short", len(neu) == 2 and neu[0].get("reduceOnly") == "true" and neu[1]["side"] == "SELL"
       and Fake.pos == -0.2, (neu, Fake.pos))
BF.ausfuehren(ent, env=dict(env, KI_BOT_STOP="1"), protokolliere=prot.append)
pruefe("Not-Aus schliesst die Position", Fake.pos == 0.0, Fake.pos)
Fake.hedge = True
n1 = len(Fake.log)
BF.ausfuehren(ent, env=env, protokolliere=prot.append)
pruefe("Hedge-Modus: verweigert", "Hedge" in prot[-1]["hinweis"] and not [x for x in Fake.log[n1:] if x[1] == "/fapi/v1/order"])
Fake.hedge = False
Fake.rechte = {"enableWithdrawals": True}
echt = dict(env, BINANCE_FUTURES_TESTNET="false", KI_BOT_ECHTGELD=BF.ECHTGELD_SATZ)
n2 = len(Fake.log)
BF.ausfuehren(ent, env=echt, protokolliere=prot.append)
pruefe("Echtgeld + Auszahlungsrecht: verweigert", "Auszahlungen" in prot[-1]["hinweis"] and not [x for x in Fake.log[n2:] if x[1] == "/fapi/v1/order"])
pruefe("keine Schlüssel im Protokoll", GEHEIM not in json.dumps(prot) and "KEY-F" not in json.dumps(prot))
Fake.rechte = {"enableWithdrawals": False}

# ── Funde der Code-Prüfung: Not-Aus bei Börsenfehler, Netzabbruch, Kurs jenseits des Stops, Stop abgelehnt, Adresse ──
Fake.pos, Fake.stops = 0.0, []
BF.ausfuehren(ent, env=env, protokolliere=prot.append)  # long 0.2 mit Stop 45000
Fake.markt_fehler = {"code": -1001, "msg": "Internal error"}
e_na = {"hebel": 0.0, "stand": "2026-10-07"}
BF.ausfuehren(e_na, env=dict(env, KI_BOT_STOP="1"), protokolliere=prot.append)
Fake.markt_fehler = None
pruefe("Not-Aus scheitert an Börse: Position bleibt, alter Stop BLEIBT stehen", Fake.pos == 0.2 and Fake.stops == [{"side": "SELL", "stopPrice": "45000"}],
       (Fake.pos, Fake.stops))
pruefe("…und das Ergebnis sagt es (Position 0.2, Fehler)", e_na["broker"]["position"] == 0.2 and e_na["broker"]["fehler"] and not e_na["broker"]["ohne_stop"],
       e_na["broker"])
# Binance: «Unknown error» (503) heisst Status UNBEKANNT — der Auftrag kann ausgeführt sein
Fake.pos, Fake.stops, Fake.ausgefuehrt_503 = 0.0, [], True
e_503 = dict(ent)
BF.ausfuehren(e_503, env=env, protokolliere=prot.append)
Fake.ausgefuehrt_503 = False
pruefe("503 «Unknown error», aber ausgeführt: nachgefragt, Position mit Stop, kein falscher Fehler", Fake.pos == 0.2
       and Fake.stops == [{"side": "SELL", "stopPrice": "45000"}] and not e_503["broker"]["fehler"], (Fake.pos, Fake.stops, e_503["broker"]))
Fake.pos, Fake.stops = 0.0, [{"side": "SELL", "stopPrice": "44000"}]
Fake.markt_fehler = {"code": -1001, "msg": "Unknown error"}
e_unk = dict(ent)
BF.ausfuehren(e_unk, env=env, protokolliere=prot.append)
Fake.markt_fehler = None
pruefe("Status bleibt unklar und Position (noch) 0: Stops werden NICHT gelöscht, laut gemeldet", Fake.stops == [{"side": "SELL", "stopPrice": "44000"}]
       and e_unk["broker"]["fehler"] and "unklar" in e_unk["broker"]["hinweis"], (Fake.stops, e_unk["broker"]))
Fake.pos, Fake.stops, Fake.hebel_fehler = 0.1, [], True
e_hb = dict(ent)
BF.ausfuehren(e_hb, env=env, protokolliere=prot.append)
Fake.hebel_fehler = False
pruefe("Hebel senken bei offener Position (−4161) blockiert das Aufstocken nicht", Fake.pos == 0.2 and not e_hb["broker"]["fehler"], (Fake.pos, e_hb["broker"]))
pruefe("Komma in Einstellungen legt nichts lahm", BF.einstellungen({"KI_BOT_ANTEIL": "0,4", "KI_BOT_MAX_AUFTRAG": "1'500"})["anteil"] == 0.4
       and BF.einstellungen({"KI_BOT_MAX_AUFTRAG": "1'500"})["max_auftrag"] == 1500.0 and BF.einstellungen({"KI_BOT_ANTEIL": "viel"})["anteil"] == 0.5)


class Abbruch(Fake):
    """Führt den Auftrag aus, schliesst dann die Verbindung ohne Antwort (wie ein Zeitlimit nach Ausführung)."""
    def _route(self, methode):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET" and Fake.abbrechen:
            Fake.pos = round(Fake.pos + float(p["quantity"]) * (1 if p["side"] == "BUY" else -1), 6)
            Fake.cids[p.get("newClientOrderId")] = "FILLED"
            self.close_connection = True
            return
        return super()._route(methode)


Fake.abbrechen = False
srv2 = HTTPServer(("127.0.0.1", 0), Abbruch)
threading.Thread(target=srv2.serve_forever, daemon=True).start()
env2 = dict(env, BINANCE_FUTURES_URL=f"http://127.0.0.1:{srv2.server_port}", BINANCE_SPOT_URL=f"http://127.0.0.1:{srv2.server_port}")
Fake.pos, Fake.stops, Fake.abbrechen = 0.0, [], True
e_ab = dict(ent)
try:
    BF.ausfuehren(e_ab, env=env2, protokolliere=prot.append)
    absturz = None
except Exception as ex:  # noqa: BLE001
    absturz = ex
Fake.abbrechen = False
pruefe("Netzabbruch nach Ausführung: per Kennung nachgefragt → ausgeführt, Stop passend, ehrlich gemeldet", absturz is None and Fake.pos == 0.2
       and Fake.stops == [{"side": "SELL", "stopPrice": "45000"}] and not e_ab["broker"]["fehler"] and "nachgefragt" in e_ab["broker"]["hinweis"],
       (absturz, Fake.pos, Fake.stops, e_ab.get("broker")))
srv2.shutdown()
Fake.pos, Fake.stops, Fake.mark = 0.0, [], "44000"
e_tief = dict(ent)
BF.ausfuehren(e_tief, env=env, protokolliere=prot.append)
Fake.mark = "50000"
pruefe("Kurs schon unter dem Stop: kein Long (Stop würde sofort auslösen)", Fake.pos == 0.0 and "kein Long" in e_tief["broker"]["hinweis"], e_tief["broker"])
Fake.pos, Fake.stops = 0.2, [{"side": "SELL", "stopPrice": "44000"}]
Fake.stop_fehler = {"code": -2021, "msg": "Order would immediately trigger.", "preis": "45000"}  # nur der neue Preis
e_sf = dict(ent, hebel=1.0)
BF.ausfuehren(e_sf, env=env, protokolliere=prot.append)
Fake.stop_fehler = None
pruefe("Neuer Stop abgelehnt: alter Stop wird wieder gesetzt, nicht schutzlos", Fake.stops == [{"side": "SELL", "stopPrice": "44000"}]
       and not e_sf["broker"]["ohne_stop"] and "wieder gesetzt" in e_sf["broker"]["hinweis"], (Fake.stops, e_sf["broker"]))
Fake.stops, Fake.stop_fehler = [], {"code": -1001, "msg": "Internal error"}
e_os = dict(ent, hebel=1.0)
BF.ausfuehren(e_os, env=env, protokolliere=prot.append)
Fake.stop_fehler = None
pruefe("Stop unmöglich und kein alter da: laut gemeldet (OHNE Stop)", e_os["broker"]["ohne_stop"] and "OHNE Stop" in e_os["broker"]["hinweis"], e_os["broker"])
n_url = len(Fake.log)
e_url = dict(ent)
BF.ausfuehren(e_url, env=dict(env, BINANCE_FUTURES_URL="https://fapi.binance.com"), protokolliere=prot.append)
pruefe("Adresse allein schaltet nie auf echtes Geld: echte Binance-Adresse ohne Doppel-Freigabe → abgelehnt",
       "BINANCE_FUTURES_URL" in e_url["broker"]["hinweis"] and len(Fake.log) == n_url)
pruefe("Demo-Adresse im Testnetz erlaubt, echte Adresse bei Echtgeld erlaubt",
       not BF.einstellungen({"BINANCE_FUTURES_URL": "https://demo-fapi.binance.com"})["url_fehler"]
       and not BF.einstellungen({"BINANCE_FUTURES_URL": "https://fapi.binance.com", "BINANCE_FUTURES_TESTNET": "false",
                                 "KI_BOT_ECHTGELD": BF.ECHTGELD_SATZ})["url_fehler"]
       and BF.einstellungen({"BINANCE_FUTURES_URL": "https://demo-fapi.binance.com", "BINANCE_FUTURES_TESTNET": "false",
                             "KI_BOT_ECHTGELD": BF.ECHTGELD_SATZ})["url_fehler"])
pruefe("Abbruch ist immer eine Warnung (Fehler-Flag) und nennt den Modus", e_url["broker"]["fehler"] and e_url["broker"]["modus"] == "testnetz")
pruefe("ohne Schlüssel: keine Warnung", (lambda x: (BF.ausfuehren(x, env={}, protokolliere=prot.append), x["broker"])[1])(dict(ent))["fehler"] is False)

# Not-Aus kommt WÄHREND des Laufs (nach dem Schliessen, vor dem Gegen-Auftrag): nichts Neues mehr aufbauen
Fake.pos, Fake.stops = -0.2, [{"side": "BUY", "stopPrice": "55000"}]
Fake.nach_markt = lambda: BF.STOP_DATEI.write_text("x")
e_mitten = dict(ent, hebel=1.0)
n_m = len(Fake.log)
BF.ausfuehren(e_mitten, env=env, protokolliere=prot.append)
Fake.nach_markt = None
BF.STOP_DATEI.unlink()
markt_m = [x[2] for x in Fake.log[n_m:] if x[1] == "/fapi/v1/order" and x[2].get("type") == "MARKET"]
pruefe("Not-Aus mitten im Lauf: Short geschlossen, KEIN Long mehr eröffnet", Fake.pos == 0.0 and len(markt_m) == 1
       and markt_m[0].get("reduceOnly") == "true" and "Not-Aus während des Laufs" in e_mitten["broker"]["hinweis"], (Fake.pos, markt_m))
pruefe("…ohne Position kein Stop übrig, Warnung gesetzt", Fake.stops == [] and "⚠️" in e_mitten["broker"]["hinweis"], (Fake.stops, e_mitten["broker"]))

# ── Not-Aus aus dem Pilot: schliesst ALLE bekannten Märkte, sagt ehrlich, was zu ist ──
aufrufe_na = []


def _zu(e, symbol, gewicht):
    aufrufe_na.append(symbol)
    e["broker"] = {"position": 0.0, "hinweis": ""}
    return [{"seite": "SELL", "menge": 0.1, "id": 5}]


_env_alt = __import__("os").environ.get("KRYPTO_PILOT_MAERKTE")
__import__("os").environ["KRYPTO_PILOT_MAERKTE"] = "BTC"  # ETH wurde abgewählt, hat aber vielleicht noch eine Position
zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-10-08")
pruefe("Not-Aus schliesst auch abgewählte Märkte (BTC und ETH)", zu and aufrufe_na == ["BTCUSDT", "ETHUSDT"]
       and sum(z.startswith("✅") for z in zeilen_na) == 2, (aufrufe_na, zeilen_na))
if _env_alt is None:
    del __import__("os").environ["KRYPTO_PILOT_MAERKTE"]
else:
    __import__("os").environ["KRYPTO_PILOT_MAERKTE"] = _env_alt


def _teil(e, symbol, gewicht):
    if symbol == "ETHUSDT":
        raise TimeoutError("weg")
    e["broker"] = {"position": 0.3, "hinweis": "Binance lehnt ab"}
    return []


zu, zeilen_na = PI.schliessen_alle(_teil, heute="2026-10-08")
pruefe("Not-Aus scheitert: nie «geschlossen», Stop bleibt erwähnt", not zu and "NICHT geschlossen" in zeilen_na[0] and "Stop bleibt" in zeilen_na[0]
       and "Fehler TimeoutError" in zeilen_na[1] and not any(z.startswith("✅") for z in zeilen_na), zeilen_na)

# Cockpit-Not-Aus, während ein anderer Lauf die Sperre hält (12. Prüfung B3): Pilot 2.0 NICHT parallel schliessen (zwei Not-Aus
# auf demselben Konto und Buch) — der andere Lauf sieht die STOP-Datei; ehrlich «nicht alles zu» melden
import pilot2_live as P2L  # noqa: E402

_p2_alt, _na_alt, _na_aufrufe = P2L.BESTAND, P2L.notaus_alle, []
with _tf.TemporaryDirectory() as _p2d:
    try:
        P2L.notaus_alle = lambda *a, **kw: _na_aufrufe.append(1) or {"modus": None, "alles_zu": True, "zeilen": []}
        P2L.BESTAND = Path(_p2d) / "krypto-pilot2-bestand.json"
        P2L.BESTAND.write_text(json.dumps({"echt": {"start": {"usdt": 1000.0}, "uid": 1}}), encoding="utf-8")
        zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-10-08", ohne_p2=True)
        pruefe("Not-Aus während eines anderen Laufs: Pilot 2.0 nicht parallel geschlossen, ehrlich «nicht alles zu»",
               not zu and not _na_aufrufe and any(z.startswith("⏳ Pilot 2.0") for z in zeilen_na), (zu, _na_aufrufe, zeilen_na))
        P2L.BESTAND.unlink()
        zu, zeilen_na = PI.schliessen_alle(_zu, heute="2026-10-08", ohne_p2=True)
        pruefe("…ohne Buch von Pilot 2.0 keine Sperr-Meldung, der alte Pilot schliesst wie sonst",
               zu and not _na_aufrufe and not any("Pilot 2.0" in z for z in zeilen_na), (zu, zeilen_na))
    finally:
        P2L.BESTAND, P2L.notaus_alle = _p2_alt, _na_alt

# ── Logbuch: letzter echter Lauf, kaputte Datei, atomar, Testnetz/Echtgeld getrennt ──
with _tf.TemporaryDirectory() as _ld:
    _lb = Path(_ld) / "pilot.json"
    PI.lauf_merken(False, ["", "❌ BTC: unklar"], logbuch=_lb)
    PI.lauf_merken(True, ["x"], trocken=True, logbuch=_lb)
    _ll = json.loads(_lb.read_text(encoding="utf-8"))["letzter_lauf"]
    pruefe("letzter echter Lauf gemerkt, Probelauf überschreibt ihn nicht", _ll["ok"] is False and _ll["hinweise"] == ["❌ BTC: unklar"], _ll)
    _lb.write_text('{"entscheide": [ {"stand"')  # Strom weg beim Schreiben
    _neu = PI.lies(_lb)
    pruefe("kaputtes Logbuch: beiseitegelegt, neues begonnen (kein Absturz bei jedem Lauf)", _neu["entscheide"] == []
           and len(list(Path(_ld).glob("pilot.json.kaputt-*"))) == 1 and not _lb.exists())
    PI.schreiben({"a": 1}, _lb)
    pruefe("atomar geschrieben, keine Zwischendatei übrig", json.loads(_lb.read_text(encoding="utf-8")) == {"a": 1} and not list(Path(_ld).glob("*.tmp*")))
lb_m = {"entscheide": [], "kontostand": []}
PI.kontostand_merken(lb_m, "2026-10-01", 10000)            # alter Eintrag ohne Modus = Testnetz
PI.kontostand_merken(lb_m, "2026-10-02", 15000, "testnetz")
PI.kontostand_merken(lb_m, "2026-10-03", 500, "echtgeld")   # Wechsel auf echtes Geld
PI.kontostand_merken(lb_m, "2026-10-10", 520, "echtgeld")
pruefe("Kontostand je Modus: Echtgeld nie mit Testnetz vermischt", [x["kapital"] for x in PI.kontostand_modus(lb_m["kontostand"])] == [500.0, 520.0])
w_m = PI.wochenbericht(lb_m, "2026-10-10", erzwingen=True)
pruefe("Wochenbericht: Echtgeld-Start statt −97 %, ehrlich «inkl. Ein-/Auszahlungen»", "+4.0 %" in w_m and "Echtgeld" in w_m
       and "inkl. Ein-/Auszahlungen" in w_m and "-96" not in w_m and "/profit" in w_m, w_m)

srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
