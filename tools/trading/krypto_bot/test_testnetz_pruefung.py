#!/usr/bin/env python3
"""Tests für testnetz_pruefung.py gegen die strenge nachgebaute Börse (pruef_boerse.py, nur 127.0.0.1):
  * normaler Lauf: alle Prüfpunkte wie erwartet, aufgeräumt (keine eigenen Aufträge, Position 0)
  * Börse lehnt reduceOnly-Stops über die Position ab oder kürzt ihre Menge → Abweichung gemeldet
  * A6/A7/A8 (14. Prüfung): Sichtbarkeit eines frisch gesetzten Stops in der Liste (sofort / verzögert / nie), Storno einer unbekannten
    Kennung (−2011 = «weg»; jeder andere Code = Abweichung); lehnt Binance A1 ab, holt das Skript A6/A8 mit offenem Short nach
  * A9/A10 (15. Prüfung W3): Storno unmittelbar nach dem Setzen (Gespenst-Stop, anderer Code) und Storno eines schon ausgelösten Stops
    (löst er nie aus: «nicht geprüft»; verschwindet er ohne Ausführung: Abweichung)
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


A10 = {"ausgeloest": False}   # Haken fürs Prüfen: hat die Test-Zeit den Kurs schon gehoben (A10 wartet auf die Aufwärtsbewegung)?


def warte_bewegt(s):
    """Test-Zeit: Wartet A10 auf die Aufwärtsbewegung (Pause AUSLOESEN_PAUSE_S), steigt der Fake-Kurs um 0,1 % — der Stop löst aus."""
    if s == T.AUSLOESEN_PAUSE_S:
        B.bewegen("BTCUSDT", round(B.kurs["BTCUSDT"] * 1.001, 1))
        A10["ausgeloest"] = True


def warte_still(s):
    """Test-Zeit ohne Kursbewegung: A10 wartet vergeblich."""


def lauf(*args, env=ENV, warte=warte_bewegt):
    datei = TMP / f"bericht{len(list(TMP.iterdir()))}.json"
    out = io.StringIO()
    A10["ausgeloest"] = False
    with redirect_stdout(out):
        rc = T.main(list(args) + ["--spot-url", URL, "--futures-url", URL, "--bericht", str(datei)], env=env, warte=warte)
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
B.voll = []   # volles Protokoll (auch Lese-Anfragen) für die Reihenfolge-Prüfung von A9
try:
    rc, p, out = lauf("--los")
finally:
    voll, B.voll = B.voll, None
pruefe(rc == 0, f"Rückgabe 0 (ist {rc})")
for nr in ("A1", "A2", "A3", "A6", "A7", "A8", "A9", "A10", "B1", "B2", "B3", "B4", "B5", "B6"):
    pruefe(p.get(nr, {}).get("urteil") == "ok", f"{nr} ok ({p.get(nr, {}).get('urteil')}: {p.get(nr, {}).get('ergebnis', '')[:90]})")
pruefe(p["A4"]["urteil"] == "info" and p["A5"]["urteil"] == "info", "A4/A5 nur zur Kenntnis")
pruefe(p["A6"]["roh"]["abfrage"] == 1, "A6: ein frisch gesetzter Stop steht schon bei der 1. Abfrage in der Liste")
pruefe(p["A7"]["roh"]["code"] == -2011 and p["A8"]["roh"]["code"] == -2011, "A7/A8: Storno einer unbekannten bzw. gelöschten Kennung → −2011 («weg»)")
pruefe(p["A9"]["roh"]["code"] is None and p["A9"]["roh"]["gesehen_bei_abfrage"] is None,
       "A9: Storno unmittelbar nach dem Setzen → Erfolg, danach nie in der Liste")
pruefe(p["A10"]["roh"]["code"] == -2011 and "ausgelöst" in p["A10"]["ergebnis"] and A10["ausgeloest"],
       "A10: ausgelöster Stop (Position geschlossen) → Storno −2011 («weg»)")
k9 = p["A9"]["roh"]["kennung"]
i9 = next(i for i, e in enumerate(voll) if e[1] == "POST" and e[2] == "/fapi/v1/algoOrder" and e[3].get("clientAlgoId") == k9)
pruefe(voll[i9 + 1][1:3] == ("DELETE", "/fapi/v1/algoOrder") and voll[i9 + 1][3].get("clientAlgoId") == k9,
       f"A9: das Storno ist die allererste Anfrage nach dem Setzen, die Liste wurde vorher nicht gelesen (danach: {voll[i9 + 1][1:3]})")
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

print("5b) A6: die Liste zeigt den zweiten Stop erst nach 3 Abfragen (Antwort ok, Liste hinkt nach) → Hinweis auf F1, keine Abweichung")
orig_neu = PB.Handler._algo_neu
zaehler6 = [0]


def verzoegert(self, p_, k, art):
    antwort, code = orig_neu(self, p_, k, art)
    zaehler6[0] += 1
    if code == 200 and zaehler6[0] == 2:   # 1. = A1 (steht nach 5 s), 2. = A6
        k.algos[antwort["algoId"]]["sichtbar_ab"] = B.n_listen + 3
    return antwort, code


PB.Handler._algo_neu = verzoegert
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_neu = orig_neu
pruefe(rc == 0 and p["A6"]["urteil"] == "info" and p["A6"]["roh"]["abfrage"] == 3 and "F1" in p["A6"]["hinweis"],
       f"A6: verzögert sichtbar (Abfrage 3) → info mit F1-Hinweis (Rückgabe {rc})")
pruefe(p["A1"]["urteil"] == "ok", "A1 bleibt ok")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt (auch der verzögert sichtbare Stop ist über die Kennung gelöscht)")

print("5c) A6: der Stop wird angenommen, steht aber nie in der Liste → Abweichung")
zaehler6[0] = 0


def nie_sichtbar(self, p_, k, art):
    antwort, code = orig_neu(self, p_, k, art)
    zaehler6[0] += 1
    if code == 200 and zaehler6[0] == 2:
        k.algos[antwort["algoId"]]["sichtbar_ab"] = 10 ** 9
    return antwort, code


PB.Handler._algo_neu = nie_sichtbar
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_neu = orig_neu
pruefe(rc == 1 and p["A6"]["urteil"] == "abweichung" and p["A6"]["roh"]["abfrage"] is None, f"A6: nie sichtbar → Abweichung (Rückgabe {rc})")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5d) A7/A8: Binance meldet für eine unbekannte Kennung einen anderen Code als −2011 → Abweichung (Pilot 2.0 hielte das Löschen für gescheitert)")
orig_ver = PB.Handler._verarbeiten


def anderer_code(self, m, pfad, p_, konto, art):
    if (m == "DELETE" and pfad == "/fapi/v1/algoOrder" and "clientAlgoId" in p_ and konto is not None
            and not any(a.get("clientAlgoId") == p_["clientAlgoId"] for a in konto.algos.values())):
        return {"code": -2013, "msg": "Order does not exist."}, 400
    return orig_ver(self, m, pfad, p_, konto, art)


PB.Handler._verarbeiten = anderer_code
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._verarbeiten = orig_ver
pruefe(rc == 1 and p["A7"]["urteil"] == "abweichung" and p["A7"]["roh"]["code"] == -2013 and p["A8"]["urteil"] == "abweichung",
       f"A7/A8: Code −2013 statt −2011 → Abweichung (Rückgabe {rc})")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5e) A1 abgelehnt (strenge Börse: kein reduceOnly-Stop ohne Position) → A6/A8 werden mit offenem Short nachgeholt")
ks, kf = neu(streng=True)
rc, p, out = lauf("--los", "--nur", "futures")
pruefe(p["A1"]["urteil"] == "abweichung" and p["A7"]["urteil"] == "ok", "A1 abgelehnt, A7 (nie gesetzte Kennung) trotzdem geprüft")
pruefe(p["A6"]["urteil"] == "ok" and "nachgeholt" in p["A6"]["ergebnis"] and p["A6"]["roh"]["abfrage"] == 1,
       f"A6: mit offenem Short nachgeholt und geprüft ({p['A6']['urteil']}: {p['A6']['ergebnis'][:80]})")
pruefe(p["A8"]["urteil"] == "ok" and "nachgeholt" in p["A8"]["ergebnis"] and p["A8"]["roh"]["code"] == -2011,
       "A8: mit offenem Short nachgeholt, schon gelöschte Kennung → −2011")
pruefe(p["A9"]["urteil"] == "ok" and p["A10"]["urteil"] == "ok", "A9/A10 laufen auch dann")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5e2) A1 abgelehnt und auch mit offenem Short kein Stop (Börse lehnt jeden Stop ab) → A6/A8/A9/A10 nicht geprüft")
orig_algo = PB.Handler._algo_neu
PB.Handler._algo_neu = lambda self, p_, k, art: ({"code": -4014, "msg": "Price not increased by tick size."}, 400)
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_neu = orig_algo
pruefe(rc == 2 and all(p[nr]["urteil"] == "nicht_geprueft" for nr in ("A1", "A6", "A9", "A10")),
       f"A1/A6/A9/A10 «nicht geprüft» (Rückgabe {rc})")
pruefe(p["A8"]["urteil"] == "nicht_geprueft" and p["A7"]["urteil"] == "ok", "A8 nicht geprüft (nie ein Stop gesetzt), A7 geprüft")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5e3) Short lässt sich nicht eröffnen (A1 abgelehnt) → A2–A5, A9, A10 und die nachzuholenden A6/A8 «nicht geprüft»")
orig_fauftrag = PB.Handler._fut_auftrag
PB.Handler._fut_auftrag = lambda self, p_, k, art: ({"code": -2019, "msg": "Margin is insufficient."}, 400)
try:
    ks, kf = neu(streng=True)
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._fut_auftrag = orig_fauftrag
pruefe(rc == 1, f"Rückgabe 1 (A1 abgelehnt = Abweichung; ist {rc})")
pruefe(all(p[nr]["urteil"] == "nicht_geprueft" for nr in ("A2", "A3", "A4", "A5", "A6", "A8", "A9", "A10")),
       "A2–A5, A6, A8, A9, A10 «nicht geprüft» (kein Short)")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5f) A9: Binance antwortet «−2011» auf das Storno unmittelbar nach dem Setzen, der Stop steht aber (Gespenst) → Abweichung")
orig_ver = PB.Handler._verarbeiten


def storno_antwort(code_msg, loeschen):
    """Das erste Storno über die Kennung bei OFFENER Position (= A9; A1/A6 stornieren ohne Position, A5 nach dem Schliessen) wird
    verfälscht: code_msg = Antwort der Börse, loeschen = ob sie den Stop dabei wirklich entfernt."""
    zaehler = {"n": 0}

    def v(self, m, pfad, p_, konto, art):
        if (m == "DELETE" and pfad == "/fapi/v1/algoOrder" and "clientAlgoId" in p_ and konto is not None and zaehler["n"] == 0
                and abs(konto.pos["BTCUSDT"]) > 0
                and any(a.get("clientAlgoId") == p_["clientAlgoId"] for a in konto.algos.values())):
            zaehler["n"] += 1
            antwort, code = orig_ver(self, m, pfad, p_, konto, art) if loeschen else (None, None)
            return code_msg
        return orig_ver(self, m, pfad, p_, konto, art)
    return v


for was, patch, erwartet in (
        ("−2011, Stop bleibt", ({"code": -2011, "msg": "Unknown order sent."}, 400, False), "abweichung"),
        ("Erfolg gemeldet, Stop bleibt", ({"algoId": 1, "code": "200", "msg": "success"}, 200, False), "abweichung"),
        ("anderer Code (−2013), Stop weg", ({"code": -2013, "msg": "Order does not exist."}, 400, True), "abweichung"),
        ("−2011, Stop weg", ({"code": -2011, "msg": "Unknown order sent."}, 400, True), "ok")):
    PB.Handler._verarbeiten = storno_antwort(patch[:2], patch[2])
    try:
        ks, kf = neu()
        rc, p, out = lauf("--los", "--nur", "futures")
    finally:
        PB.Handler._verarbeiten = orig_ver
    pruefe(p["A9"]["urteil"] == erwartet, f"A9 «{was}» → {erwartet} (ist {p['A9']['urteil']}: {p['A9']['ergebnis'][:90]})")
    if "bleibt" in was:
        pruefe(p["A9"]["roh"]["gesehen_bei_abfrage"] == 1, "A9: der Stop steht bei der 1. Abfrage nach dem Storno in der Liste")
    pruefe(aufgeraeumt(ks, kf), "aufgeräumt (auch der Gespenst-Stop ist am Ende über die Kennung gelöscht)")

print("5g) A10: Binance antwortet auf das Storno eines ausgelösten Stops mit einem anderen Code → Abweichung (Pilot 2.0 hielte das Löschen für gescheitert)")


def nach_ausloesung_anderer_code(self, m, pfad, p_, konto, art):
    if (m == "DELETE" and pfad == "/fapi/v1/algoOrder" and "clientAlgoId" in p_ and konto is not None and A10["ausgeloest"]
            and not any(a.get("clientAlgoId") == p_["clientAlgoId"] for a in konto.algos.values())):
        return {"code": -4130, "msg": "Order already triggered."}, 400
    return orig_ver(self, m, pfad, p_, konto, art)


PB.Handler._verarbeiten = nach_ausloesung_anderer_code
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._verarbeiten = orig_ver
pruefe(rc == 1 and p["A10"]["urteil"] == "abweichung" and p["A10"]["roh"]["code"] == -4130, f"A10: Code −4130 → Abweichung (Rückgabe {rc})")
pruefe(p["A7"]["urteil"] == "ok" and p["A8"]["urteil"] == "ok", "A7/A8 bleiben ok (der Haken wirkt erst nach dem Auslösen)")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt")

print("5h) A10: der Markt erreicht den Stop nie → «nicht geprüft» (keine Abweichung), der Stop und der Short sind am Ende weg")
ks, kf = neu()
rc, p, out = lauf("--los", "--nur", "futures", warte=warte_still)
pruefe(rc == 2 and p["A10"]["urteil"] == "nicht_geprueft" and p["A10"]["roh"] == {"ausgeloest": False},
       f"A10 «nicht geprüft», Rückgabe 2 (ist {rc}: {p['A10']['urteil']})")
pruefe(all(p[nr]["urteil"] != "abweichung" for nr in p), "keine Abweichung gemeldet")
pruefe(aufgeraeumt(ks, kf), "aufgeräumt (offener Short geschlossen, Stop gelöscht)")

print("5i) A10: der Stop verschwindet aus der Liste, ohne dass die Position schliesst → Abweichung")


def verschwinden(s):
    if s == T.AUSLOESEN_PAUSE_S:
        kf_.algos.clear()   # ohne Ausführung entfernt
        A10["ausgeloest"] = True


ks, kf_ = neu()
rc, p, out = lauf("--los", "--nur", "futures", warte=verschwinden)
pruefe(rc == 1 and p["A10"]["urteil"] == "abweichung" and "verschwunden" in p["A10"]["ergebnis"],
       f"A10: Stop weg, Position offen → Abweichung (Rückgabe {rc})")
pruefe(aufgeraeumt(ks, kf_), "aufgeräumt (Short am Ende geschlossen)")

print("5i2) A10: die Position ist geschlossen, der ausgelöste Stop steht aber noch in der Liste → trotzdem als ausgelöst erkannt")


def bewegt_bleibt_gelistet(s):
    if s == T.AUSLOESEN_PAUSE_S:
        vorher = dict(kf_.algos)
        B.bewegen("BTCUSDT", round(B.kurs["BTCUSDT"] * 1.001, 1))
        kf_.algos.update(vorher)   # Binance zeigt den ausgelösten Stop noch einen Augenblick
        A10["ausgeloest"] = True


ks, kf_ = neu()
rc, p, out = lauf("--los", "--nur", "futures", warte=bewegt_bleibt_gelistet)
pruefe(p["A10"]["urteil"] == "ok" and "ausgelöst" in p["A10"]["ergebnis"] and p["A10"]["roh"]["code"] is None,
       f"A10: ausgelöst erkannt (Position 0), Storno des noch gelisteten Stops → Erfolg ({p['A10']['urteil']}: {p['A10']['ergebnis'][:90]})")
pruefe(aufgeraeumt(ks, kf_), "aufgeräumt")

print("5j) A10: der erste Stop löst sofort aus (−2021) → mit grösserem Abstand nochmals")
orig_neu2 = PB.Handler._algo_neu
a10_posts = {"n": 0}


def zu_nah(self, p_, k, art):
    if abs(k.pos["BTCUSDT"]) > 0 and p_.get("reduceOnly") == "true":
        a10_posts["n"] += 1
        # der Kurs-Test der Börse schlägt nur für den ALLERERSTEN Stop mit offener Position an, der knapp über dem Markt sitzt
        trig = float(p_["triggerPrice"])
        if trig < B.kurs["BTCUSDT"] * 1.01 and a10_posts["n"] >= 2 and a10_posts.get("abgelehnt") is None:
            a10_posts["abgelehnt"] = True
            return {"code": -2021, "msg": "Order would immediately trigger."}, 400
    return orig_neu2(self, p_, k, art)


PB.Handler._algo_neu = zu_nah
try:
    ks, kf = neu()
    rc, p, out = lauf("--los", "--nur", "futures")
finally:
    PB.Handler._algo_neu = orig_neu2
pruefe(a10_posts.get("abgelehnt") and p["A10"]["urteil"] == "ok", f"A10: nach −2021 mit 3× Abstand geprüft ({p['A10']['urteil']})")
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
