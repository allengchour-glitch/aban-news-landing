#!/usr/bin/env python3
"""Tests für testnetz_pruefung.py gegen die strenge nachgebaute Börse (pruef_boerse.py, nur 127.0.0.1):
  * normaler Lauf: alle Prüfpunkte wie erwartet, aufgeräumt (keine eigenen Aufträge, Position 0)
  * Börse lehnt reduceOnly-Stops über die Position ab oder kürzt ihre Menge → Abweichung gemeldet
  * Börse meldet nach dem Storno einen Fehler OHNE «cancelResult» → Pilot 2.0 läse «alter steht» → Abweichung
  * Börse kennt cancelReplace nicht (404) → nur Hinweis, nichts angefasst
  * Stop aus anderem Grund abgelehnt → «nicht geprüft» statt falscher Abweichung
  * Sicherheit: echte Binance-Adressen, http, fehlende/falsche Schlüssel, Symbol nicht leer, ohne --los → nichts gesendet
Aufruf: python3 -B tools/trading/krypto_bot/test_testnetz_pruefung.py"""
from __future__ import annotations

import io
import json
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import pruef_boerse as PB  # noqa: E402
import testnetz_pruefung as T  # noqa: E402

URL = PB.starten()
B = PB.B
ENV = {"BINANCE_API_KEY": "sk", "BINANCE_API_SECRET": "ss", "BINANCE_FUTURES_API_KEY": "fk", "BINANCE_FUTURES_API_SECRET": "fs"}
TMP = Path(tempfile.mkdtemp())
n_ok = n_f = 0


def pruefe(bed, text):
    global n_ok, n_f
    print(("✅ " if bed else "❌ ") + text)
    n_ok += bool(bed)
    n_f += not bed


def neu(streng=False):
    B.reset()
    ks = B.konto_anlegen(["sk"], "ss", uid=11, usdt=20000)
    kf = B.konto_anlegen(["fk"], "fs", uid=12, usdt=0)
    kf.fut = 5000.0
    B.reduce_algo_streng = streng
    return ks, kf


def lauf(*args, env=ENV):
    datei = TMP / f"bericht{len(list(TMP.iterdir()))}.json"
    out = io.StringIO()
    with redirect_stdout(out):
        rc = T.main(list(args) + ["--spot-url", URL, "--futures-url", URL, "--bericht", str(datei)], env=env, warte=lambda s: None)
    bericht = json.loads(datei.read_text()) if datei.exists() else {"punkte": []}
    return rc, {p["nr"]: p for p in bericht["punkte"]}, out.getvalue()


def schreibend():
    return [e for e in B.log if e[1] in ("POST", "DELETE")]


def aufgeraeumt(ks, kf):
    eigene_spot = [o for o in ks.orders.values() if str(o.get("cid", "")).startswith(T.KENNUNG) and o["status"] in T.OFFEN]
    eigene_algos = [a for a in kf.algos.values() if str(a.get("clientAlgoId", "")).startswith(T.KENNUNG)]
    return not eigene_spot and not eigene_algos and abs(kf.pos["BTCUSDT"]) < 1e-12


print("1) normaler Lauf")
ks, kf = neu()
rc, p, out = lauf("--los")
pruefe(rc == 0, f"Rückgabe 0 (ist {rc})")
for nr in ("A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "B6"):
    pruefe(p.get(nr, {}).get("urteil") == "ok", f"{nr} ok ({p.get(nr, {}).get('urteil')}: {p.get(nr, {}).get('ergebnis', '')[:90]})")
pruefe(p["A4"]["urteil"] == "info" and p["A5"]["urteil"] == "info", "A4/A5 nur zur Kenntnis")
pruefe("abgelehnt" in p["A5"]["ergebnis"] and p["A5"]["roh"]["nachher"] < 0, "A5: Prüf-Börse lehnt reduceOnly über die Position ab (−2022)")
pruefe(p["B1"]["roh"]["klasse"] == "nur_storno" and p["B1"]["roh"]["alt"] == "CANCELED", "B1: «würde sofort auslösen» = nur Storno")
pruefe(p["B2"]["roh"]["klasse"] == "nichts" and p["B2"]["roh"]["alt"] == "NEW", "B2: Filter vor dem Storno → alter steht")
pruefe(p["B3"]["roh"]["klasse"] == "nur_storno", "B3: zu wenig Coins → nur Storno")
pruefe(p["B4"]["roh"]["klasse"] == "nur_storno" and p["B4"]["roh"]["neu"] is None,
       "B4: alter schon weg (−2011) → Pilot 2.0 liest «weg», kein neuer Auftrag")
pruefe(p["B6"]["roh"]["neu"] == "FILLED", "B6: Not-Aus-Verkauf ausgeführt")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt (keine eigenen Aufträge, Futures-Position 0)")
pruefe("ERGEBNIS: alles wie von Pilot 2.0 erwartet" in out, "Fazit «alles wie erwartet»")

print("2) Börse lehnt reduceOnly-Stops über die Position ab")
ks, kf = neu(streng=True)
rc, p, out = lauf("--los")
pruefe(rc == 1, f"Rückgabe 1 (ist {rc})")
pruefe(p["A1"]["urteil"] == "abweichung" and p["A2"]["urteil"] == "abweichung", "A1 und A2 als Abweichung gemeldet")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")
pruefe("ABWEICHUNG" in out, "Fazit nennt die Abweichung")

print("2b) Börse zeigt den Stop nur noch über die Position (Menge gekürzt)")
orig_json = PB.Handler._algo_json
PB.Handler._algo_json = lambda self, i, a: dict(orig_json(self, i, a), quantity="0.002")
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_json = orig_json
pruefe(rc == 1 and p["A2"]["urteil"] == "abweichung" and p["A1"]["urteil"] == "ok", f"A2: gekürzte Menge erkannt (Rückgabe {rc})")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("3) Börse meldet den Teil-Fehler ohne cancelResult (Pilot 2.0 läse «alter Stop steht noch»)")
orig = PB.Handler._ersetzen


def ohne_daten(self, p_, k, art):
    antwort, code = orig(self, p_, k, art)
    if code == 409:
        return {"code": -2021, "msg": "Order cancel-replace partially failed."}, 400
    return antwort, code


PB.Handler._ersetzen = ohne_daten
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "spot")
finally:
    PB.Handler._ersetzen = orig
pruefe(rc == 1, f"Rückgabe 1 (ist {rc})")
pruefe(p["B1"]["urteil"] == "abweichung" and p["B3"]["urteil"] == "abweichung", "B1/B3: falsch verstandene Antwort erkannt")
pruefe("A1" not in p, "--nur spot: Futures nicht angefasst")
pruefe(not [e for e in schreibend() if e[0] == "fk"], "kein schreibender Futures-Aufruf")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("3b) Börse meldet «alter storniert», storniert aber nicht (Pilot 2.0 setzte einen zweiten Stop)")
PB.Handler._ersetzen = lambda self, p_, k, art: ({"code": -2021, "msg": "Order cancel-replace partially failed.",
                                                  "data": {"cancelResult": "SUCCESS", "newOrderResult": "FAILURE"}}, 409)
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "spot")
finally:
    PB.Handler._ersetzen = orig
pruefe(rc == 1 and p["B1"]["urteil"] == "abweichung", f"B1: «nur_storno» bei stehendem Stop erkannt (Rückgabe {rc})")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("4) Börse kennt cancelReplace nicht (404)")
PB.Handler._ersetzen = lambda self, p_, k, art: ({"code": -1, "msg": "Not Found"}, 404)
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "spot")
finally:
    PB.Handler._ersetzen = orig
pruefe(rc == 0, f"Rückgabe 0 (ist {rc})")
pruefe(all(p[nr]["roh"]["klasse"] == "fehlt" and p[nr]["urteil"] == "info" for nr in ("B1", "B2", "B3", "B5", "B6")),
       "alle cancelReplace-Punkte: «fehlt», nur Hinweis")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5) Stop aus anderem Grund abgelehnt (nicht reduceOnly) → «nicht geprüft», keine falsche Abweichung")
orig_algo = PB.Handler._algo_neu
PB.Handler._algo_neu = lambda self, p_, k, art: ({"code": -4014, "msg": "Price not increased by tick size."}, 400)
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_neu = orig_algo
pruefe(rc == 2, f"Rückgabe 2 (ist {rc})")
pruefe(all(p[nr]["urteil"] == "nicht_geprueft" for nr in ("A1", "A2", "A3")), "A1–A3 «nicht geprüft»")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("6) Sicherheit")
for args, was in ((["--spot-url", "https://api.binance.com"], "echte Spot-Adresse"),
                  (["--futures-url", "https://fapi.binance.com"], "echte Futures-Adresse"),
                  (["--spot-url", "http://testnet.binance.vision"], "Testnetz ohne https")):
    ks, kf = neu()
    out = io.StringIO()
    with redirect_stdout(out):
        rc = T.main(["--los", "--spot-url", URL, "--futures-url", URL, *args, "--bericht", str(TMP / "x.json")], env=ENV,
                    warte=lambda s: None)
    pruefe(rc == 2 and not B.log and "kein Binance-Testnetz" in out.getvalue(), f"{was}: abgelehnt, nichts gesendet")
ks, kf = neu()
rc, p, out = lauf("--los", env={})
pruefe(rc == 2 and not B.log, "ohne Schlüssel: abgelehnt, nichts gesendet")
ks, kf = neu()
rc, p, out = lauf("--los", env=dict(ENV, BINANCE_FUTURES_API_SECRET="falsch"))
pruefe(rc == 2 and not schreibend() and "Schlüssel passt nicht" in out, "falscher Schlüssel: abgelehnt, nichts geschrieben")
ks, kf = neu()
kf.pos["BTCUSDT"] = -0.01
rc, p, out = lauf("--los")
pruefe(rc == 2 and not schreibend() and "schon eine Position" in out, "Futures-Symbol nicht leer: abgelehnt, nichts geschrieben")
ks, kf = neu()
rc, p, out = lauf()
pruefe(rc == 0 and not schreibend() and "nichts gesendet" in out, "ohne --los: nur gelesen")
ks, kf = neu()
kf.pos["BTCUSDT"] = -0.01
rc, p, out = lauf()
pruefe(rc == 2 and "schon eine Position" in out, "ohne --los, Symbol nicht leer: «nicht bereit»")
ks, kf = neu()
kf.algos[1] = {"symbol": "BTCUSDT", "side": "BUY", "quantity": "0.001", "triggerPrice": "130000", "reduceOnly": "true",
               "clientAlgoId": "fremd1", "algoType": "CONDITIONAL", "type": "STOP_MARKET"}
fut = T.P2.Fut({"key": "fk", "secret": "fs", "basis": URL, "spot": URL})
try:
    with redirect_stdout(io.StringIO()):
        T.pruefe_futures(fut, "BTCUSDT", T.Bericht(), warte=lambda s: None)
    abgebrochen = False
except T.Abbruch:
    abgebrochen = True
pruefe(abgebrochen and not schreibend() and 1 in kf.algos, "Futures-Prüfung selbst: fremder Stop → Abbruch, nichts angefasst")

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
