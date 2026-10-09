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
mittel = [100 * (1.001 ** i) * (1 + 0.0078 * ((-1) ** i)) for i in range(400)]  # rund 30 % Jahresschwankung
h1, h_deckel, h2 = K.roh_hebel(mittel)[-1], K.roh_hebel(mittel, max_hebel=2.0)[-1], K.roh_hebel(mittel, max_hebel=2.0, ziel_vol=0.8)[-1]
pruefe("Stufe 2 = alles doppelt: 1× → 1, nur Deckel 2 → ~1,3, Stufe 2 → 2", h1 == 1.0 and 1.1 < h_deckel < 1.6 and h2 == 2.0, (h1, h_deckel, h2))

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

# ── Pilot: Märkte, Trendlänge je Coin, Logbuch, Wochenbericht ──
import pilot as PI  # noqa: E402

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

# ── nachgebauter Binance-Futures-Server ──
GEHEIM = "futures-geheim"


class Fake(BaseHTTPRequestHandler):
    log, pos, hedge, rechte = [], 0.0, False, {"enableWithdrawals": False}
    stops, markt_fehler, stop_fehler, mark = [], None, None, "50000"

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
        if pfad == "/fapi/v1/openOrders":
            return self._a([{"orderId": i + 100, "type": "STOP_MARKET", "closePosition": "true", "side": x["side"], "stopPrice": x["stopPrice"]}
                            for i, x in enumerate(Fake.stops)])
        if pfad == "/fapi/v1/allOpenOrders" and methode == "DELETE":
            Fake.stops = []
            return self._a({"code": 200, "msg": "ok"})
        if pfad == "/fapi/v1/order" and p.get("type") == "STOP_MARKET":
            if Fake.stop_fehler and Fake.stop_fehler.get("preis") in (None, p["stopPrice"]):
                return self._a({k: v for k, v in Fake.stop_fehler.items() if k != "preis"}, 400)
            if any(x["side"] == p["side"] for x in Fake.stops):
                return self._a({"code": -4130, "msg": "closePosition in the direction is existing"}, 400)
            Fake.stops.append({"side": p["side"], "stopPrice": p["stopPrice"]})
            return self._a({"orderId": 2, "status": "NEW"})
        if pfad == "/fapi/v1/marginType":
            return self._a({"code": -4046, "msg": "No need to change margin type."}, 400)
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET":
            if Fake.markt_fehler:
                return self._a(Fake.markt_fehler, 503)
            q2 = float(p["quantity"]) * (1 if p["side"] == "BUY" else -1)
            Fake.pos = round(Fake.pos + q2, 6)
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
stops = [x for x in orders if x[2].get("type") == "STOP_MARKET"]
pruefe("Börsen-Stop gesetzt, auf Tick gerundet, Markpreis", stops and stops[-1][2]["stopPrice"] == "45000" and stops[-1][2]["closePosition"] == "true"
       and stops[-1][2]["workingType"] == "MARK_PRICE", stops[-1:])
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


class Abbruch(Fake):
    """Führt den Auftrag aus, schliesst dann die Verbindung ohne Antwort (wie ein Zeitlimit nach Ausführung)."""
    def _route(self, methode):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET" and Fake.abbrechen:
            Fake.pos = round(Fake.pos + float(p["quantity"]) * (1 if p["side"] == "BUY" else -1), 6)
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
pruefe("Netzabbruch nach Ausführung: kein Absturz, Stop passend zur echten Position", absturz is None and Fake.pos == 0.2
       and Fake.stops == [{"side": "SELL", "stopPrice": "45000"}] and e_ab["broker"]["fehler"], (absturz, Fake.pos, Fake.stops))
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
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
