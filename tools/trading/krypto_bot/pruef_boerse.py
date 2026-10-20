#!/usr/bin/env python3
"""Strenge nachgebaute Binance (Spot + USDⓈ-M Futures + Universal Transfer) für die Prüfung von Pilot 2.0 — nur 127.0.0.1.

Stammt aus der 8. unabhängigen Prüfung (Oktober 2026) und ist bewusst STRENGER als die Fake-Börse in test_pilot2_live.py
(Lehre: eine zu gutmütige Fake-Börse übersah Blocker). Benutzt von test_pilot2_streng.py und pruef_fuzzer.py.
  * mehrere Konten (Schlüssel → Konto mit eigener UID), Signaturprüfung je Konto
  * LOT_SIZE / PRICE_FILTER / NOTIONAL mit Decimal (wie Binance: −1013)
  * doppelte clientOrderId / clientAlgoId unter OFFENEN Aufträgen werden abgelehnt (Spot −2010, Futures −4116)
  * Futures-Auftrag per origClientOrderId abfragbar und stornierbar (auch «spaet» = NEW, später ausgeführt)
  * Störungsregeln je Anfrage: vor503 (nicht ausgeführt), nach503 (ausgeführt, Antwort weg), abriss / abriss_vor (Verbindung
    reisst ab), 429, 418, kurs (Kurssprung vor der Anfrage), unsichtbar (ausgeführt, Antwort weg UND in den Listen erst nach
    n Listen-Abfragen sichtbar), spaet (Futures-Marktauftrag als NEW sichtbar, erst nach n weiteren Anfragen ausgeführt),
    spaet_u (Futures- oder Spot-Marktauftrag bis zur verspäteten Ankunft UNBEKANNT: Abfrage −2013, Storno −2011 — wie Binance
    bei unklarem Status; aus der 9. Prüfung), teil (Teilausführung), ablehnen (−1013 PERCENT_PRICE). cancelReplace: Filter
    vor dem Storno (Doku); in einer Phase «nur Stornieren» scheitert die ganze Anfrage — mit ersetzen_storno_zuerst=True
    die ungünstige Lesart: erst Storno, dann Ablehnung (409)
  * exchangeInfo-Status je Symbol einstellbar (symbol_status, z. B. BREAK/HALT; Standard TRADING — 11. Prüfung)
  * STOP_LOSS (Markt) und STOP_LOSS_LIMIT (bleibt bei Kurslücke unausgeführt liegen)
  * Futures: CROSS-Marge, Einstand, offener Gewinn, Liquidation, Funding (ADL nicht nachgebaut)
  * Protokoll aller schreibenden Anfragen je Konto (fremdes Konto angefasst? falscher Transfer-Typ?)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import threading
import urllib.parse
from decimal import Decimal, InvalidOperation
from http.server import BaseHTTPRequestHandler, HTTPServer

SYMS = ("BTCUSDT", "ETHUSDT")
SPOT_STEP = {"BTCUSDT": "0.00001", "ETHUSDT": "0.0001"}
SPOT_TICK = {"BTCUSDT": "0.01", "ETHUSDT": "0.01"}
SPOT_MIN_NOTIONAL = 5.0
FUT_STEP = {"BTCUSDT": "0.001", "ETHUSDT": "0.001"}
FUT_TICK = {"BTCUSDT": "0.10", "ETHUSDT": "0.01"}
FUT_MIN_NOTIONAL = {"BTCUSDT": 100.0, "ETHUSDT": 20.0}
GEB_SPOT = 0.001
GEB_FUT = 0.0005
MM_RATE = 0.004
MAX_SPOT_STOPS = 5


def vielfaches(s, schritt):
    try:
        d = Decimal(str(s))
    except InvalidOperation:
        return False
    return d >= 0 and (d % Decimal(schritt)) == 0


class Konto:
    def __init__(self, uid, usdt=20000.0):
        self.uid = uid
        self.frei = {"USDT": float(usdt), "BTC": 0.0, "ETH": 0.0, "BNB": 0.0}
        self.gesperrt = {"USDT": 0.0, "BTC": 0.0, "ETH": 0.0, "BNB": 0.0}
        self.fut = 0.0
        self.pos = {s: 0.0 for s in SYMS}
        self.einstand = {s: 0.0 for s in SYMS}
        self.hebel = {s: 1 for s in SYMS}
        self.marge = {s: "CROSSED" for s in SYMS}
        self.orders = {}
        self.cids = {}
        self.fcids = {}
        self.algos = {}
        self.hedge = False
        self.bnb_gebuehr = False
        self.rechte = {"enableWithdrawals": False, "enableMargin": False, "enableInternalTransfer": False,
                       "enableSpotAndMarginTrading": True, "enableFutures": True, "permitsUniversalTransfer": True,
                       "enableReading": True}

    # ---- Futures-Rechnung
    def upnl(self, kurs):
        return sum(self.pos[s] * (kurs[s] - self.einstand[s]) for s in SYMS)

    def im(self, kurs):
        return sum(abs(self.pos[s]) * kurs[s] / self.hebel[s] for s in SYMS)

    def verfuegbar(self, kurs):
        return self.fut + self.upnl(kurs) - self.im(kurs)

    def max_abzug(self, kurs):
        return max(0.0, min(self.verfuegbar(kurs), self.fut + min(0.0, self.upnl(kurs)) - self.im(kurs)))

    def buchen(self, sym, q, preis):
        if not q:
            return
        alt = self.pos[sym]
        neu = round(alt + q, 9)
        if alt == 0 or (alt > 0) == (q > 0):
            self.einstand[sym] = (abs(alt) * self.einstand[sym] + abs(q) * preis) / (abs(alt) + abs(q))
        else:
            zu = min(abs(q), abs(alt))
            self.fut += zu * (preis - self.einstand[sym]) * (1 if alt > 0 else -1)
            if abs(q) > abs(alt):
                self.einstand[sym] = preis
        self.fut -= abs(q) * preis * GEB_FUT
        self.pos[sym] = 0.0 if abs(neu) < 1e-12 else neu
        if self.pos[sym] == 0:
            self.einstand[sym] = 0.0


class Boerse:
    def __init__(self):
        self.lock = threading.RLock()
        self.reset()

    def reset(self, kurs=None):
        self.kurs = dict(kurs or {"BTCUSDT": 100000.0, "ETHUSDT": 4000.0})
        self.konten = {}          # key -> (secret, Konto)
        self.log = []             # (key, methode, pfad, params, ergebnis)
        self.regeln = []          # Stoerungsregeln
        self.n_req = 0
        self.n_listen = 0
        self.next_id = 1000
        self.pending = []         # (faellig_bei_n_req, funktion)
        self.verletzungen = []
        self.stop_typen = ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"]
        self.vor_jeder_anfrage = None   # Haken: f(methode, pfad, params)
        self.reduce_algo_streng = False  # True: reduceOnly-Stop über mehr als die offene Position wird abgelehnt (−2022)
        self.symbol_status = {}  # Symbol → exchangeInfo-Status (Standard TRADING; z. B. BREAK/HALT = keine neuen Aufträge)
        self.ersetzen_fehlt = False  # True: dieser Binance-Cluster kennt cancelReplace nicht (HTTP 404) — Pilot 2.0 fällt auf den alten Weg zurück
        self.ersetzen_storno_zuerst = False  # True: cancelReplace in einer Phase «nur Stornieren» storniert den alten Auftrag
        #                                     und lehnt erst DANN den neuen ab (409, −2021) — ungünstigste Lesart (10. Prüfung)
        self.nach_jeder_anfrage = None
        # Ereignis-Takt (12. Prüfung): letzte Kursbewegung und letzte GELESENE Spot-Auftragsliste je Symbol — ein hängender
        # STOP_LOSS_LIMIT ist nur dann eine unvermeidbare Lücke, wenn Pilot 2.0 die Liste seit dem Sprung nicht mehr gesehen hat
        self.takt = 0
        self.bewegt_takt = {}
        self.liste_takt = {}
        self.liste_verborgen = {}  # Symbol → IDs der Spot-Aufträge, die die LETZTE gelesene Auftragsliste wegen der Verzögerung («sichtbar_ab») nicht zeigte

    def konto_anlegen(self, keys, secret, uid, usdt=20000.0):
        k = Konto(uid, usdt)
        for key in keys:
            self.konten[key] = (secret, k)
        return k

    def neue_id(self):
        self.next_id += 1
        return self.next_id

    # ---- Markt
    def bewegen(self, sym, preis):
        with self.lock:
            self.kurs[sym] = float(preis)
            self.takt += 1
            self.bewegt_takt[sym] = self.takt
            for k in self.alle_konten():
                self._ausloesen(k, sym)
            for k in self.alle_konten():
                self._liquidation(k)

    def alle_konten(self):
        out = []
        for _, k in self.konten.values():
            if k not in out:
                out.append(k)
        return out

    def _ausloesen(self, k, sym):
        preis = self.kurs[sym]
        coin = sym[:-4]
        for o in list(k.orders.values()):
            if o["symbol"] != sym or o["status"] not in ("NEW", "PARTIALLY_FILLED"):
                continue
            if o["typ"] == "STOP_LOSS" and preis <= o["stop"]:
                rest = o["qty"] - o["ausgefuehrt"]
                k.gesperrt[coin] -= rest
                k.frei["USDT"] += rest * preis * (1 - GEB_SPOT)
                o.update(status="FILLED", ausgefuehrt=o["qty"], quote=o["quote"] + rest * preis)
            elif o["typ"] == "STOP_LOSS_LIMIT":
                if not o.get("aktiv") and preis <= o["stop"]:
                    o["aktiv"] = True
                if o.get("aktiv") and preis < o["preis"] and "haengt_takt" not in o:
                    o["haengt_takt"] = self.takt  # ab jetzt hängt er (Limit über dem Kurs) — fürs Prüfwerkzeug _limit_luecke
                if o.get("aktiv") and preis >= o["preis"]:
                    rest = o["qty"] - o["ausgefuehrt"]
                    k.gesperrt[coin] -= rest
                    k.frei["USDT"] += rest * o["preis"] * (1 - GEB_SPOT)
                    o.update(status="FILLED", ausgefuehrt=o["qty"], quote=o["quote"] + rest * o["preis"])
            elif o["typ"] == "LIMIT" and o["side"] == "BUY" and preis <= o["preis"]:
                rest = o["qty"] - o["ausgefuehrt"]
                k.gesperrt["USDT"] -= rest * o["preis"]
                k.frei[coin] += rest * (1 - GEB_SPOT)
                o.update(status="FILLED", ausgefuehrt=o["qty"], quote=o["quote"] + rest * o["preis"])
        for aid, a in list(k.algos.items()):
            if a["symbol"] != sym:
                continue
            trig = float(a["triggerPrice"])
            if (a["side"] == "BUY" and preis >= trig) or (a["side"] == "SELL" and preis <= trig):
                del k.algos[aid]
                pos = k.pos[sym]
                if a.get("closePosition") == "true":
                    q = -pos if ((a["side"] == "BUY" and pos < 0) or (a["side"] == "SELL" and pos > 0)) else 0.0
                else:
                    q = float(a["quantity"]) * (1 if a["side"] == "BUY" else -1)
                    if a.get("reduceOnly") == "true":
                        if a["side"] == "BUY":
                            q = min(q, max(0.0, -pos))
                        else:
                            q = -min(-q, max(0.0, pos))
                if q:
                    k.buchen(sym, q, preis)

    def _liquidation(self, k):
        if not any(k.pos.values()):
            return
        eq = k.fut + k.upnl(self.kurs)
        mm = sum(abs(k.pos[s]) * self.kurs[s] * MM_RATE for s in SYMS)
        if eq < mm:
            for s in SYMS:
                if k.pos[s]:
                    notional = abs(k.pos[s]) * self.kurs[s]
                    k.buchen(s, -k.pos[s], self.kurs[s])
                    k.fut -= notional * 0.005
                    for aid in [i for i, a in k.algos.items() if a["symbol"] == s]:
                        del k.algos[aid]
            k.fut = max(0.0, k.fut)
            self.verletzungen.append(("LIQUIDATION", k.uid, dict(self.kurs)))

    def funding(self, rate):
        with self.lock:
            for k in self.alle_konten():
                for s in SYMS:
                    k.fut -= k.pos[s] * self.kurs[s] * rate


B = Boerse()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def _a(self, o, code=200):
        b = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _abriss(self):
        self.close_connection = True
        try:
            self.connection.shutdown(2)
        except OSError:
            pass

    def do_GET(self):
        self._r("GET")

    def do_POST(self):
        self._r("POST")

    def do_DELETE(self):
        self._r("DELETE")

    def _r(self, m):
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            self.rfile.read(n)
        with B.lock:
            self._r2(m)

    def _r2(self, m):
        pfad, _, q = self.path.partition("?")
        p = dict(urllib.parse.parse_qsl(q))
        B.n_req += 1
        for faellig, f in list(B.pending):
            if B.n_req >= faellig:
                B.pending.remove((faellig, f))
                f()
        key = self.headers.get("X-MBX-APIKEY", "")
        konto = None
        if "signature" in q:
            if key not in B.konten:
                return self._a({"code": -2015, "msg": "Invalid API-key, IP, or permissions for action."}, 401)
            secret, konto = B.konten[key]
            roh, _, s = q.rpartition("&signature=")
            if s != hmac.new(secret.encode(), roh.encode(), hashlib.sha256).hexdigest():
                return self._a({"code": -1022, "msg": "Signature for this request is not valid."}, 400)
        if B.vor_jeder_anfrage:
            B.vor_jeder_anfrage(m, pfad, p)
        # Stoerungsregeln
        art = self._regel(m, pfad, p)
        if art and art["art"] == "kurs":
            if getattr(B, "voll", None) is not None:
                B.voll.append((B.n_req, "KURS", art["sym"], art["preis"], None, "kurs", "", {}))
            B.bewegen(art["sym"], art["preis"])
            art = None
        if art and art["art"] in ("429", "418", "vor503", "abriss_vor") and getattr(B, "voll", None) is not None:
            # auch abgewiesene Anfragen ins volle Protokoll (11. Prüfung K3): sonst fehlt in Belegen, was Binance ablehnte
            B.voll.append((B.n_req, m, pfad, {kk: v for kk, v in p.items() if kk not in ("signature", "timestamp", "recvWindow")},
                           {"429": 429, "418": 418, "vor503": 503}.get(art["art"], 0), art["art"], "abgewiesen vor der Verarbeitung",
                           dict(B.kurs)))
        if art and art["art"] in ("429", "418"):
            return self._a({"code": -1003, "msg": "Too many requests"}, int(art["art"]))
        if art and art["art"] == "vor503":
            return self._a({"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503)
        if art and art["art"] == "abriss_vor":
            return self._abriss()
        schreibend = m in ("POST", "DELETE")
        try:
            antwort, code = self._verarbeiten(m, pfad, p, konto, art)
        except Exception as ex:  # noqa: BLE001
            antwort, code = {"code": -1000, "msg": f"Fake-Fehler {type(ex).__name__}: {ex}"}, 500
        if schreibend:
            B.log.append((key, m, pfad, p, code, konto.uid if konto else None, str(antwort.get("msg", "")) if isinstance(antwort, dict) else ""))
        if getattr(B, "voll", None) is not None:
            B.voll.append((B.n_req, m, pfad, {kk: v for kk, v in p.items() if kk not in ("signature", "timestamp", "recvWindow")},
                           code, (art or {}).get("art"), str(antwort)[:160], dict(B.kurs)))
        if (m == "GET" and pfad == "/api/v3/openOrders" and code == 200
                and not (art and art["art"] in ("nach503", "unsichtbar", "abriss"))):  # Antwort kam an: die Liste ist gesehen
            B.takt += 1
            for s in ([p["symbol"]] if p.get("symbol") else SYMS):
                B.liste_takt[s] = B.takt
        if B.nach_jeder_anfrage:
            B.nach_jeder_anfrage(m, pfad, p, code)
        if art and art["art"] in ("nach503", "unsichtbar") and code == 200:
            return self._a({"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503)
        if art and art["art"] == "abriss" and code == 200:
            return self._abriss()
        return self._a(antwort, code)

    @staticmethod
    def _regel(m, pfad, p, ohne_kurs=False):
        """Erste passende Störungsregel (wird verbraucht) oder None."""
        for r in B.regeln:
            if r.get("anzahl", 1) <= 0 or (ohne_kurs and r.get("art") == "kurs"):
                continue
            if r.get("methode") and r["methode"] != m:
                continue
            if r.get("pfad") and r["pfad"] != pfad:
                continue
            if r.get("pred") and not r["pred"](m, pfad, p):
                continue
            if r.get("ab_req") and B.n_req < r["ab_req"]:
                continue
            if r.get("zufall") is not None and r["zufall"]() >= r.get("p", 1.0):
                continue
            r["anzahl"] = r.get("anzahl", 1) - 1
            return r
        return None

    # ------------------------------------------------------------------
    def _verarbeiten(self, m, pfad, p, k, art):
        kurs = B.kurs
        if pfad in ("/api/v3/time", "/fapi/v1/time"):
            return {"serverTime": 0}, 200
        if pfad == "/sapi/v1/account/apiRestrictions":
            return dict(k.rechte), 200
        if pfad == "/api/v3/account":
            return {"uid": k.uid, "canTrade": True,
                    "balances": [{"asset": a, "free": repr(k.frei[a]), "locked": repr(k.gesperrt[a])} for a in k.frei]}, 200
        if pfad == "/api/v3/ticker/price":
            return {"symbol": p["symbol"], "price": repr(kurs[p["symbol"]])}, 200
        if pfad == "/api/v3/exchangeInfo":
            s = p["symbol"]
            return {"symbols": [{"symbol": s, "status": B.symbol_status.get(s, "TRADING"), "orderTypes": list(B.stop_typen),
                                 "filters": [{"filterType": "PRICE_FILTER", "tickSize": SPOT_TICK[s], "minPrice": SPOT_TICK[s]},
                                             {"filterType": "LOT_SIZE", "stepSize": SPOT_STEP[s], "minQty": SPOT_STEP[s]},
                                             {"filterType": "MARKET_LOT_SIZE", "stepSize": "0.00000000", "minQty": "0.00000000"},
                                             {"filterType": "NOTIONAL", "minNotional": "5.00000000", "applyMinToMarket": True}]}]}, 200
        if pfad == "/api/v3/openOrders":
            B.n_listen += 1
            B.liste_verborgen[p["symbol"]] = {o["id"] for o in k.orders.values() if o["symbol"] == p["symbol"]
                                              and o["status"] in ("NEW", "PARTIALLY_FILLED") and o.get("sichtbar_ab", 0) > B.n_listen}
            return [self._spot_order_json(o) for o in k.orders.values()
                    if o["symbol"] == p["symbol"] and o["status"] in ("NEW", "PARTIALLY_FILLED")
                    and o.get("sichtbar_ab", 0) <= B.n_listen], 200
        if pfad == "/api/v3/order" and m == "GET":
            o = k.orders.get(int(p["orderId"])) if "orderId" in p else k.cids.get(p.get("origClientOrderId"))
            if not o or o.get("sichtbar_ab", 0) > B.n_listen + 1:
                return {"code": -2013, "msg": "Order does not exist."}, 400
            return self._spot_order_json(o), 200
        if pfad == "/api/v3/order" and m == "DELETE":
            o = k.orders.get(int(p["orderId"])) if "orderId" in p else k.cids.get(p.get("origClientOrderId"))
            if not o or o["status"] not in ("NEW", "PARTIALLY_FILLED"):
                return {"code": -2011, "msg": "Unknown order sent."}, 400
            p["_haengend"] = bool(o.get("aktiv")) and o.get("preis", 0.0) > kurs[o["symbol"]]  # nur fürs Protokoll (der Fuzzer: ein hängender schützt nicht)
            coin = o["symbol"][:-4]
            rest = o["qty"] - o["ausgefuehrt"]
            if o["side"] == "SELL":
                k.gesperrt[coin] -= rest
                k.frei[coin] += rest
            else:
                k.gesperrt["USDT"] -= rest * o["preis"]
                k.frei["USDT"] += rest * o["preis"]
            o["status"] = "CANCELED"
            return {"orderId": o["id"], "status": "CANCELED"}, 200
        if pfad == "/api/v3/order" and m == "POST":
            return self._spot_auftrag(p, k, art)
        if pfad == "/api/v3/order/cancelReplace" and m == "POST":
            if B.ersetzen_fehlt:
                return {"code": 0, "msg": "Not Found"}, 404
            return self._ersetzen(p, k, art)
        if pfad == "/sapi/v1/asset/transfer":
            typ, b = p.get("type"), float(p["amount"])
            if typ not in ("MAIN_UMFUTURE", "UMFUTURE_MAIN"):
                B.verletzungen.append(("TRANSFER-TYP", typ, b))
                return {"code": -1102, "msg": "verboten im Fake"}, 400
            if not k.rechte.get("permitsUniversalTransfer"):
                return {"code": -2015, "msg": "Invalid API-key, IP, or permissions for action."}, 401
            if typ == "MAIN_UMFUTURE":
                if k.frei["USDT"] < b - 1e-9:
                    return {"code": -5013, "msg": "Asset transfer failed: insufficient balance"}, 400
                k.frei["USDT"] -= b
                k.fut += b
            else:
                if k.max_abzug(kurs) < b - 1e-9:
                    return {"code": -5013, "msg": "Asset transfer failed: insufficient balance"}, 400
                k.fut -= b
                k.frei["USDT"] += b
            return {"tranId": B.neue_id()}, 200
        # ---------------- Futures
        if pfad == "/fapi/v1/positionSide/dual":
            return {"dualSidePosition": k.hedge}, 200
        if pfad == "/fapi/v2/account":
            return {"totalWalletBalance": repr(k.fut), "totalUnrealizedProfit": repr(k.upnl(kurs)),
                    "availableBalance": repr(k.verfuegbar(kurs)), "maxWithdrawAmount": repr(k.max_abzug(kurs)),
                    "totalMarginBalance": repr(k.fut + k.upnl(kurs))}, 200
        if pfad == "/fapi/v2/positionRisk":
            s = p["symbol"]
            return [{"symbol": s, "positionAmt": repr(k.pos[s]), "leverage": str(k.hebel[s]), "entryPrice": repr(k.einstand[s]),
                     "markPrice": repr(kurs[s]), "marginType": k.marge[s].lower(), "positionSide": "BOTH"}], 200
        if pfad == "/fapi/v1/exchangeInfo":
            return {"symbols": [{"symbol": s, "status": "TRADING",
                                 "filters": [{"filterType": "PRICE_FILTER", "tickSize": FUT_TICK[s]},
                                             {"filterType": "LOT_SIZE", "stepSize": FUT_STEP[s], "minQty": FUT_STEP[s]},
                                             {"filterType": "MARKET_LOT_SIZE", "stepSize": FUT_STEP[s], "minQty": FUT_STEP[s]},
                                             {"filterType": "MIN_NOTIONAL", "notional": str(FUT_MIN_NOTIONAL[s])}]} for s in SYMS]}, 200
        if pfad == "/fapi/v1/marginType":
            s = p["symbol"]
            if k.marge[s] == p["marginType"]:
                return {"code": -4046, "msg": "No need to change margin type."}, 400
            if k.pos[s]:
                return {"code": -4048, "msg": "Margin type cannot be changed if there exists position."}, 400
            k.marge[s] = p["marginType"]
            return {"code": 200, "msg": "success"}, 200
        if pfad == "/fapi/v1/leverage":
            s = p["symbol"]
            k.hebel[s] = int(p["leverage"])
            return {"symbol": s, "leverage": int(p["leverage"])}, 200
        if pfad == "/fapi/v1/order" and m == "POST":
            return self._fut_auftrag(p, k, art)
        if pfad == "/fapi/v1/order" and m == "GET":
            o = k.fcids.get(p.get("origClientOrderId"))
            if not o:
                return {"code": -2013, "msg": "Order does not exist."}, 400
            return dict(o), 200
        if pfad == "/fapi/v1/order" and m == "DELETE":
            o = k.fcids.get(p.get("origClientOrderId"))
            if not o or o.get("status") != "NEW":
                return {"code": -2011, "msg": "Unknown order sent."}, 400
            o["status"] = "CANCELED"  # ein noch nicht ausgeführter («spaet») Auftrag kommt dann nie mehr an
            return dict(o), 200
        if pfad == "/fapi/v1/openOrders":
            return [], 200
        if pfad == "/fapi/v1/allOpenOrders":
            return {"code": 200, "msg": "The operation of cancel all open order is done."}, 200
        if pfad == "/fapi/v1/openAlgoOrders":
            B.n_listen += 1
            return [self._algo_json(i, a) for i, a in k.algos.items() if a["symbol"] == p.get("symbol", a["symbol"])
                    and a.get("sichtbar_ab", 0) <= B.n_listen], 200
        if pfad == "/fapi/v1/algoOrder" and m == "POST":
            return self._algo_neu(p, k, art)
        if pfad == "/fapi/v1/algoOrder" and m == "DELETE":
            if "algoId" in p:
                aid = int(p["algoId"])
            else:  # Storno über die eigene Kennung (clientAlgoId)
                aid = next((i for i, a in k.algos.items() if a.get("clientAlgoId") == p.get("clientAlgoId")), None)
            if aid not in k.algos:
                return {"code": -2011, "msg": "Unknown order sent."}, 400
            p["_symbol"] = k.algos[aid]["symbol"]  # nur fürs Protokoll (der Fuzzer ordnet Löschungen dem Markt zu)
            del k.algos[aid]
            return {"algoId": aid, "code": "200", "msg": "success"}, 200
        if pfad == "/fapi/v1/algoOpenOrders" and m == "DELETE":
            for aid in [i for i, a in k.algos.items() if a["symbol"] == p["symbol"]]:
                del k.algos[aid]
            return {"code": 200}, 200
        if pfad == "/fapi/v1/premiumIndex":
            return {"markPrice": repr(kurs[p["symbol"]]), "lastFundingRate": "0.0001"}, 200
        return {"code": -1100, "msg": f"Fake kennt {m} {pfad} nicht"}, 400

    def _spot_order_json(self, o):
        return {"symbol": o["symbol"], "orderId": o["id"], "clientOrderId": o["cid"], "origQty": repr(o["qty"]),
                "executedQty": repr(o["ausgefuehrt"]), "cummulativeQuoteQty": repr(o["quote"]), "status": o["status"],
                "type": o["typ"], "side": o["side"], "stopPrice": repr(o.get("stop", 0.0)), "price": repr(o.get("preis", 0.0)),
                "isWorking": bool(o.get("aktiv")) if o["typ"].startswith("STOP") else True}

    def _algo_json(self, i, a):
        return {"algoId": i, "clientAlgoId": a.get("clientAlgoId", ""), "algoType": "CONDITIONAL", "orderType": a.get("type"),
                "symbol": a["symbol"], "side": a["side"], "positionSide": "BOTH", "quantity": a.get("quantity", "0"),
                "algoStatus": "NEW", "triggerPrice": a["triggerPrice"], "workingType": a.get("workingType"),
                "closePosition": a.get("closePosition") == "true", "reduceOnly": a.get("reduceOnly") == "true"}

    # ---- Spot-Auftrag
    def _spot_auftrag(self, p, k, art):
        sym = p["symbol"]
        coin = sym[:-4]
        typ = p.get("type")
        if typ not in B.stop_typen:
            return {"code": -1116, "msg": "Invalid orderType."}, 400
        if "quantity" not in p:
            return {"code": -1102, "msg": "Mandatory parameter 'quantity' was not sent."}, 400
        if not vielfaches(p["quantity"], SPOT_STEP[sym]) or float(p["quantity"]) < float(SPOT_STEP[sym]):
            return {"code": -1013, "msg": "Filter failure: LOT_SIZE"}, 400
        cid = p.get("newClientOrderId") or f"web_{B.neue_id()}"
        alt = k.cids.get(cid)
        if alt and alt["status"] in ("NEW", "PARTIALLY_FILLED"):
            return {"code": -2010, "msg": "Duplicate order sent."}, 400
        q = float(p["quantity"])
        preis = B.kurs[sym]
        if typ == "MARKET" and art and art["art"] == "spaet_u":
            # Antwort 503, Auftrag bis zur verspäteten Ankunft unbekannt (Abfrage −2013), dann zum dann gültigen Kurs ausgeführt
            p2 = dict(p)
            B.pending.append((B.n_req + art.get("nach", 10 ** 12), lambda: self._spot_auftrag(p2, k, None)))
            return {"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503
        if typ == "MARKET":
            if q * preis < SPOT_MIN_NOTIONAL:
                return {"code": -1013, "msg": "Filter failure: NOTIONAL"}, 400
            status = "FILLED"
            if art and art["art"] == "teil":
                q = float(Decimal(str(q * art.get("anteil", 0.5))).quantize(Decimal(SPOT_STEP[sym])))
                status = "EXPIRED"
            if art and art["art"] == "ablehnen":
                return {"code": -1013, "msg": "Filter failure: PERCENT_PRICE_BY_SIDE"}, 400
            wert = q * preis
            if p["side"] == "BUY":
                if k.frei["USDT"] < wert - 1e-9:
                    return {"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400
                k.frei["USDT"] -= wert
                if k.bnb_gebuehr and k.frei["BNB"] > 0:
                    geb, geb_asset = wert * GEB_SPOT * 0.75 / 600.0, "BNB"
                    k.frei["BNB"] -= geb
                    k.frei[coin] += q
                else:
                    geb, geb_asset = q * GEB_SPOT, coin
                    k.frei[coin] += q - geb
            else:
                if k.frei[coin] < q - 1e-12:
                    return {"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400
                k.frei[coin] -= q
                if k.bnb_gebuehr and k.frei["BNB"] > 0:
                    geb, geb_asset = wert * GEB_SPOT * 0.75 / 600.0, "BNB"
                    k.frei["BNB"] -= geb
                    k.frei["USDT"] += wert
                else:
                    geb, geb_asset = wert * GEB_SPOT, "USDT"
                    k.frei["USDT"] += wert - geb
            oid = B.neue_id()
            o = {"id": oid, "cid": cid, "symbol": sym, "side": p["side"], "typ": "MARKET", "qty": float(p["quantity"]),
                 "ausgefuehrt": q, "quote": wert, "status": status}
            k.orders[oid] = o
            k.cids[cid] = o
            return {"symbol": sym, "orderId": oid, "clientOrderId": cid, "status": status, "executedQty": repr(q),
                    "cummulativeQuoteQty": repr(wert), "origQty": p["quantity"], "side": p["side"], "type": "MARKET",
                    "fills": [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": geb_asset}]}, 200
        if typ in ("STOP_LOSS", "STOP_LOSS_LIMIT"):
            if p.get("side") != "SELL":
                return {"code": -1013, "msg": "Fake: nur SELL-Stops erwartet"}, 400
            if not vielfaches(p["stopPrice"], SPOT_TICK[sym]):
                return {"code": -1013, "msg": "Filter failure: PRICE_FILTER"}, 400
            stop = float(p["stopPrice"])
            if typ == "STOP_LOSS_LIMIT":
                if not vielfaches(p.get("price", "x"), SPOT_TICK[sym]):
                    return {"code": -1013, "msg": "Filter failure: PRICE_FILTER"}, 400
            if stop >= preis:
                return {"code": -2010, "msg": "Stop price would trigger immediately."}, 400
            if q * stop < SPOT_MIN_NOTIONAL:
                return {"code": -1013, "msg": "Filter failure: NOTIONAL"}, 400
            offen = [o for o in k.orders.values() if o["symbol"] == sym and o["status"] in ("NEW", "PARTIALLY_FILLED")
                     and o["typ"].startswith("STOP")]
            if len(offen) >= MAX_SPOT_STOPS:
                return {"code": -1013, "msg": "Filter failure: MAX_NUM_ALGO_ORDERS"}, 400
            if k.frei[coin] < q - 1e-12:
                return {"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400
            k.frei[coin] -= q
            k.gesperrt[coin] += q
            oid = B.neue_id()
            o = {"id": oid, "cid": cid, "symbol": sym, "side": "SELL", "typ": typ, "qty": q, "ausgefuehrt": 0.0, "quote": 0.0,
                 "status": "NEW", "stop": stop, "preis": float(p.get("price") or 0.0)}
            if art and art["art"] == "unsichtbar":
                o["sichtbar_ab"] = B.n_listen + art.get("listen", 2)
            k.orders[oid] = o
            k.cids[cid] = o
            return {"symbol": sym, "orderId": oid, "clientOrderId": cid, "transactTime": 0}, 200
        if typ == "LIMIT":
            pr = float(p["price"])
            if p["side"] == "BUY":
                if k.frei["USDT"] < q * pr:
                    return {"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400
                k.frei["USDT"] -= q * pr
                k.gesperrt["USDT"] += q * pr
            else:
                if k.frei[coin] < q:
                    return {"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400
                k.frei[coin] -= q
                k.gesperrt[coin] += q
            oid = B.neue_id()
            o = {"id": oid, "cid": cid, "symbol": sym, "side": p["side"], "typ": "LIMIT", "qty": q, "ausgefuehrt": 0.0, "quote": 0.0,
                 "status": "NEW", "preis": pr}
            k.orders[oid] = o
            k.cids[cid] = o
            return {"orderId": oid}, 200
        return {"code": -1116, "msg": "Invalid orderType."}, 400

    # ---- Spot: Storno + neuer Auftrag in einer Anfrage (cancelReplace, wie Binance dokumentiert)
    def _ersetzen(self, p, k, art):
        """Filter und Auftragszahl des neuen Auftrags werden VOR dem Storno geprüft (Binance-Doku) — lehnt er dort ab, bleibt
        der alte. Danach Storno, dann der neue Auftrag; scheitert erst der (z. B. «würde sofort auslösen», Guthaben), ist der
        alte weg: «teilweise gescheitert» (−2021, HTTP 409). Störungsregeln auf POST /api/v3/order gelten für den neuen
        Auftrag: 503/429 (Phase «nur Stornieren») → die ganze Anfrage scheitert, «ablehnen» (Filter) → nichts passiert.
        Eigene Störung auf diesem Pfad: «nur_storno» = Storno gelingt, der neue Auftrag wird abgelehnt; «nur_storno_verloren» = dasselbe, aber die
        ANTWORT geht verloren (503) — der Aufrufer weiss nicht, ob der Stop weg ist (16. Prüfung H7)."""
        if art and art["art"] == "nur_storno_verloren":
            antwort, code = self._ersetzen(p, k, dict(art, art="nur_storno"))
            if code == 409:  # der Storno ist durch (der neue Auftrag abgelehnt): die Antwort kommt nie an
                return {"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503
            return antwort, code
        sym = p["symbol"]
        if p.get("cancelReplaceMode") not in ("STOP_ON_FAILURE", "ALLOW_FAILURE"):
            return {"code": -1102, "msg": "Mandatory parameter 'cancelReplaceMode' was not sent."}, 400
        alt = k.orders.get(int(p["cancelOrderId"])) if "cancelOrderId" in p else k.cids.get(p.get("cancelOrigClientOrderId"))
        if not alt or alt["status"] not in ("NEW", "PARTIALLY_FILLED"):
            return {"code": -2022, "msg": "Order cancel-replace failed.",
                    "data": {"cancelResult": "FAILURE", "newOrderResult": "NOT_ATTEMPTED",
                             "cancelResponse": {"code": -2011, "msg": "Unknown order sent."}, "newOrderResponse": None}}, 400
        neu = {kk: v for kk, v in p.items() if kk not in ("cancelReplaceMode", "cancelOrderId", "cancelOrigClientOrderId",
                                                         "cancelNewClientOrderId", "signature", "timestamp", "recvWindow")}
        typ = neu.get("type")
        if typ not in B.stop_typen or "quantity" not in neu:
            return {"code": -1116, "msg": "Invalid orderType."}, 400
        if not vielfaches(neu["quantity"], SPOT_STEP[sym]) or float(neu["quantity"]) < float(SPOT_STEP[sym]):
            return {"code": -1013, "msg": "Filter failure: LOT_SIZE"}, 400
        q = float(neu["quantity"])
        bezug = float(neu["stopPrice"]) if typ.startswith("STOP") else B.kurs[sym]
        if typ.startswith("STOP") and not vielfaches(neu["stopPrice"], SPOT_TICK[sym]):
            return {"code": -1013, "msg": "Filter failure: PRICE_FILTER"}, 400
        if q * bezug < SPOT_MIN_NOTIONAL:
            return {"code": -1013, "msg": "Filter failure: NOTIONAL"}, 400
        regel_neu = self._regel("POST", "/api/v3/order", neu, ohne_kurs=True)
        if regel_neu and regel_neu["art"] in ("vor503", "429", "418", "abriss_vor") and not B.ersetzen_storno_zuerst:
            if regel_neu["art"] in ("429", "418"):
                return {"code": -1003, "msg": "Too many requests."}, int(regel_neu["art"])
            return {"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503
        if regel_neu and regel_neu["art"] == "ablehnen" and typ == "MARKET":
            return {"code": -1013, "msg": "Filter failure: PERCENT_PRICE_BY_SIDE"}, 400
        coin = sym[:-4]
        rest = alt["qty"] - alt["ausgefuehrt"]
        p["_haengend"] = bool(alt.get("aktiv")) and alt.get("preis", 0.0) > B.kurs[sym]  # nur fürs Protokoll (der Fuzzer: ein hängender schützt nicht)
        if alt["side"] == "SELL":
            k.gesperrt[coin] -= rest
            k.frei[coin] += rest
        else:
            k.gesperrt["USDT"] -= rest * alt.get("preis", 0.0)
            k.frei["USDT"] += rest * alt.get("preis", 0.0)
        alt["status"] = "CANCELED"
        storno = {"orderId": alt["id"], "status": "CANCELED"}
        if (art and art["art"] == "nur_storno") or (regel_neu and regel_neu["art"] in ("vor503", "429", "418", "abriss_vor")):
            antwort, code = {"code": -1013, "msg": "Fake: neuer Auftrag abgelehnt (nur Stornieren möglich)"}, 400
        else:
            art_neu = regel_neu if regel_neu and regel_neu["art"] in ("teil", "unsichtbar") else None
            antwort, code = self._spot_auftrag(neu, k, art_neu)
        if code != 200:
            return {"code": -2021, "msg": "Order cancel-replace partially failed.",
                    "data": {"cancelResult": "SUCCESS", "newOrderResult": "FAILURE", "cancelResponse": storno,
                             "newOrderResponse": antwort}}, 409
        return {"cancelResult": "SUCCESS", "newOrderResult": "SUCCESS", "cancelResponse": storno, "newOrderResponse": antwort}, 200

    # ---- Futures-Auftrag
    def _fut_auftrag(self, p, k, art):
        sym = p["symbol"]
        if p.get("type") != "MARKET":
            return {"code": -1116, "msg": "Invalid orderType."}, 400
        if not vielfaches(p["quantity"], FUT_STEP[sym]) or float(p["quantity"]) <= 0:
            return {"code": -1111, "msg": "Precision is over the maximum defined for this asset."}, 400
        cid = p.get("newClientOrderId") or f"web_{B.neue_id()}"
        if cid in k.fcids:
            return {"code": -4015, "msg": "Client order id is not valid."}, 400
        q = float(p["quantity"]) * (1 if p["side"] == "BUY" else -1)
        reduce = p.get("reduceOnly") == "true"

        def pruefen():
            pos = k.pos[sym]
            if reduce:  # strenger als nötig: ob Binance eine zu grosse Menge kürzt oder ablehnt, ist nicht dokumentiert → ablehnen
                if pos == 0 or (pos > 0) == (q > 0) or abs(q) > abs(pos) + 1e-12:
                    return {"code": -2022, "msg": "ReduceOnly Order is rejected."}
                return None
            if abs(q) * B.kurs[sym] < FUT_MIN_NOTIONAL[sym]:
                return {"code": -4164, "msg": "Order's notional must be no smaller than %g" % FUT_MIN_NOTIONAL[sym]}
            # nur der Teil, der die Position vergroessert, braucht Marge
            neu = abs(pos + q) - abs(pos)
            if neu > 0 and k.verfuegbar(B.kurs) < neu * B.kurs[sym] / k.hebel[sym] * (1 + GEB_FUT) - 1e-6:
                return {"code": -2019, "msg": "Margin is insufficient."}
            return None

        def ausfuehren(anteil=1.0):
            pos = k.pos[sym]
            qq = q * anteil
            if anteil != 1.0:  # Teilausfuehrung: Binance fuellt nur ganze Mengenschritte
                schritt = float(FUT_STEP[sym])
                qq = (1 if qq > 0 else -1) * (int(abs(qq) / schritt + 1e-9) * schritt)
                qq = round(qq, 9)
            if reduce:
                qq = max(qq, -pos) if q < 0 else min(qq, -pos)
            k.buchen(sym, qq, B.kurs[sym])
            return qq

        fehler = pruefen()
        if fehler:
            return fehler, 400
        oid = B.neue_id()
        if art and art["art"] == "spaet_u":
            # wie Binance bei unklarem Status: Antwort 503, der Auftrag ist bis zu seiner (verspäteten) Ankunft UNBEKANNT
            # (Abfrage −2013, Storno −2011) und wird erst dann ausgeführt — nach «nach» Anfragen oder bei pending_abarbeiten()
            rec = {"orderId": oid, "clientOrderId": cid, "symbol": sym, "status": "NEW", "executedQty": "0", "side": p["side"],
                   "origQty": p["quantity"], "reduceOnly": reduce}

            def ankunft_u():
                k.fcids[cid] = rec
                f2 = pruefen()
                if f2:
                    rec["status"] = "EXPIRED"
                    return
                qq = ausfuehren()
                rec.update(status="FILLED", executedQty=repr(abs(qq)))
                B.verletzungen.append(("SPAET-AUSGEFUEHRT", sym, qq))
            B.pending.append((B.n_req + art.get("nach", 10 ** 12), ankunft_u))
            return {"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503
        if art and art["art"] == "spaet":
            rec = {"orderId": oid, "clientOrderId": cid, "symbol": sym, "status": "NEW", "executedQty": "0", "side": p["side"],
                   "origQty": p["quantity"], "reduceOnly": reduce}
            k.fcids[cid] = rec

            def spaeter():
                if rec["status"] == "CANCELED":
                    return
                f2 = pruefen()
                if f2:
                    rec["status"] = "EXPIRED"
                    return
                qq = ausfuehren()
                rec.update(status="FILLED", executedQty=repr(abs(qq)))
                B.verletzungen.append(("SPAET-AUSGEFUEHRT", sym, qq))
            B.pending.append((B.n_req + art.get("nach", 3), spaeter))
            return {"code": -1001, "msg": "Internal error; unable to process your request. Please try again."}, 503
        anteil = art.get("anteil", 0.5) if art and art["art"] == "teil" else 1.0
        qq = ausfuehren(anteil)
        status = "FILLED" if anteil == 1.0 else "EXPIRED"
        rec = {"orderId": oid, "clientOrderId": cid, "symbol": sym, "status": status, "executedQty": repr(abs(qq)),
               "origQty": p["quantity"], "side": p["side"], "reduceOnly": reduce, "avgPrice": repr(B.kurs[sym])}
        k.fcids[cid] = rec
        return dict(rec), 200

    def _algo_neu(self, p, k, art):
        sym = p["symbol"]
        if p.get("algoType") != "CONDITIONAL":
            return {"code": -1102, "msg": "algoType"}, 400
        if "closePosition" in p and "quantity" in p:
            return {"code": -1106, "msg": "Parameter 'quantity' sent when not required."}, 400
        if "quantity" in p and (not vielfaches(p["quantity"], FUT_STEP[sym]) or float(p["quantity"]) <= 0):
            return {"code": -1111, "msg": "Precision is over the maximum defined for this asset."}, 400
        if not vielfaches(p["triggerPrice"], FUT_TICK[sym]):
            return {"code": -4014, "msg": "Price not increased by tick size."}, 400
        cid = p.get("clientAlgoId") or f"web_{B.neue_id()}"
        if any(a.get("clientAlgoId") == cid for a in k.algos.values()):
            return {"code": -4116, "msg": "ClientOrderId is duplicated."}, 400
        if B.reduce_algo_streng and p.get("reduceOnly") == "true" and "quantity" in p:
            pos = k.pos[sym]
            offen = -pos if p["side"] == "BUY" else pos
            if float(p["quantity"]) > max(0.0, offen) + 1e-12:
                return {"code": -2022, "msg": "ReduceOnly Order is rejected."}, 400
        trig = float(p["triggerPrice"])
        mark = B.kurs[sym]
        if (p["side"] == "BUY" and trig <= mark) or (p["side"] == "SELL" and trig >= mark):
            return {"code": -2021, "msg": "Order would immediately trigger."}, 400
        if len([a for a in k.algos.values() if a["symbol"] == sym]) >= 10:
            return {"code": -4045, "msg": "Reach max stop order limit."}, 400
        aid = B.neue_id()
        a = dict(p)
        a["clientAlgoId"] = cid
        if art and art["art"] == "unsichtbar":
            a["sichtbar_ab"] = B.n_listen + art.get("listen", 2)
        k.algos[aid] = a
        return {"algoId": aid, "clientAlgoId": cid, "algoType": "CONDITIONAL", "algoStatus": "NEW"}, 200


SRV = None
URL = None


def starten():
    global SRV, URL
    if SRV is None:
        SRV = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=SRV.serve_forever, daemon=True).start()
        URL = f"http://127.0.0.1:{SRV.server_port}"
    return URL
