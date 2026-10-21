#!/usr/bin/env python3
"""Tests Pilot-2.0-Ausführung gegen eine STRENGE nachgebaute Binance (Spot + Futures + Verschieben), ohne Netz.
Die Börse zieht Gebühren in Coins ab, sperrt Coins für Stops, lehnt sofort auslösende Stops ab, prüft die Futures-Marge,
löst Stops wirklich aus und kann Antworten verlieren (Aufträge, Stops, Stornos, Verschieben).
Grundsatz der Ausführung: «Konto = Wahrheit» — Pilot 2.0 handelt nur in seinem eigenen (Unter-)Konto.
    python3 tools/trading/krypto_bot/test_pilot2_live.py"""
import hashlib, hmac, json, os, re, sys, tempfile, threading, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import broker_futures as BF  # noqa: E402
import pilot2_live as L  # noqa: E402
SPERRE_WIRKT = L.FREIGEGEBEN or not L.aktiv({"KRYPTO_PILOT2": "an"})  # solange FREIGEGEBEN False, ist KRYPTO_PILOT2=an wirkungslos
L.FREIGEGEBEN = True  # für die Tests freischalten (ausgeliefert ist Pilot 2.0 gesperrt)
BF.NACHFRAGE_WARTEN = (0.0, 0.0, 0.0)
L.LESE_WARTEN = (0.0, 0.0)
L.SCHUTZ_WARTEN = (0.0, 0.0, 0.0, 0.0)
L.UNKLAR_WARTEN = (0.0, 0.0, 0.0)
GEHEIM = "geheim"
n_ok = n_f = 0
def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c); print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}")); n_ok += c; n_f += not c

class X(BaseHTTPRequestHandler):
    def reset(**k):
        X.kurs = {"BTCUSDT": 100000.0, "ETHUSDT": 4000.0}
        X.frei = {"USDT": 20000.0, "BTC": 0.0, "ETH": 0.0}; X.gesperrt = {"USDT": 0.0, "BTC": 0.0, "ETH": 0.0}
        X.fut = 0.0; X.pos = {"BTCUSDT": 0.0, "ETHUSDT": 0.0}; X.hebel = {"BTCUSDT": 1, "ETHUSDT": 1}
        X.log = []; X.orders = {}; X.next_id = 100; X.algos = {}; X.cids = {}
        X.rechte = {"enableWithdrawals": False, "enableMargin": False, "enableInternalTransfer": False,
                    "enableSpotAndMarginTrading": True, "enableFutures": True, "permitsUniversalTransfer": True}
        X.perp_fehler = False; X.spot_503 = False; X.nachfrage_kaputt = False; X.hedge = False; X.stop_fehler = False
        X.nach_order = None; X.perp_503 = None; X.perp_reduce_fehler = False; X.algo_del_fehler = False
        X.stop_antwort_weg = False; X.algo_antwort_weg = False; X.marge = {}; X.spot_del_fehler = False; X.spot_sell_fehler = False; X.uid = 4711
        X.algo_liste_fehler = False; X.spot_del_antwort_weg = False; X.transfer_antwort_weg = False
        X.einstand = {"BTCUSDT": 0.0, "ETHUSDT": 0.0}  # Einstandspreis je Perp → offener Gewinn/Verlust wie bei Binance
        X.teil = None; X.spot_sell_429 = False; X.konto_fehler_ab = None; X.n_konto = 0; X.pos_fehler_ab = None; X.n_pos = 0
        X.fkonto_fehler = False; X.konto_fehler_anzahl = None; X.pos_fehler_anzahl = None; X.vor_stop = None
        X.fcids = {}; X.perp_spaet = False; X.spaet = []; X.storno_kaputt = False; X.abfrage_kaputt = False
        X.ersetzen_fehlt = False  # True: Binance kennt cancelReplace nicht (404) → alter Weg (stornieren, dann neu)
        for a, b in k.items(): setattr(X, a, b)
    def gestoert(n, ab, anzahl):  # n-ter Aufruf im Störfenster [ab, ab+anzahl) (anzahl None = für immer)
        return ab is not None and n >= ab and (anzahl is None or n < ab + anzahl)
    def _a(self, o, code=200):
        b = json.dumps(o).encode(); self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def _r(self, m):
        pfad, _, q = self.path.partition("?"); p = dict(urllib.parse.parse_qsl(q))
        if "signature" in q:
            roh, _, s = q.rpartition("&signature=")
            if s != hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest(): return self._a({"code": -1022}, 400)
        X.log.append((m, pfad, p))
        if pfad in ("/api/v3/time", "/fapi/v1/time"): return self._a({"serverTime": 0})
        if pfad == "/sapi/v1/account/apiRestrictions": return self._a(X.rechte)
        if pfad == "/api/v3/account":
            X.n_konto += 1
            if X.gestoert(X.n_konto, X.konto_fehler_ab, X.konto_fehler_anzahl): return self._a({"code": -1001, "msg": "Internal error"}, 503)
            return self._a({"uid": X.uid, "balances": [{"asset": a, "free": repr(X.frei[a]), "locked": repr(X.gesperrt[a])} for a in X.frei]})
        if pfad == "/api/v3/ticker/price": return self._a({"price": repr(X.kurs[p["symbol"]])})
        if pfad == "/api/v3/exchangeInfo":
            step = "0.00001" if p["symbol"] == "BTCUSDT" else "0.0001"
            return self._a({"symbols": [{"symbol": p["symbol"], "orderTypes": ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT"],
                "filters": [{"filterType": "LOT_SIZE", "stepSize": step}, {"filterType": "PRICE_FILTER", "tickSize": "0.01"},
                            {"filterType": "NOTIONAL", "minNotional": "5"}]}]})
        if pfad == "/api/v3/openOrders":
            return self._a([{"orderId": o["id"], "clientOrderId": o.get("cid", ""), "symbol": o["symbol"], "type": o["typ"], "side": "SELL",
                             "origQty": repr(o["qty"]), "stopPrice": repr(o["stop"])}
                            for o in X.orders.values() if o["symbol"] == p["symbol"] and o["status"] == "NEW" and o.get("typ")])
        if pfad == "/api/v3/order/cancelReplace":  # wie Binance: Filter des neuen Auftrags vorher, dann Storno, dann neuer Auftrag
            if X.ersetzen_fehlt: return self._a({"code": -1100, "msg": "Not found"}, 404)
            o = X.orders.get(int(p["cancelOrderId"]))
            gescheitert = {"code": -2022, "msg": "Order cancel-replace failed.", "data": {"cancelResult": "FAILURE", "newOrderResult": "NOT_ATTEMPTED"}}
            if not o or o["status"] != "NEW" or X.spot_del_fehler: return self._a(gescheitert, 400)
            neu = {kk: v for kk, v in p.items() if not kk.startswith("cancel") and kk not in ("signature", "timestamp", "recvWindow")}
            if neu.get("type") == "MARKET" and neu.get("side") == "SELL" and X.spot_sell_fehler:
                return self._a({"code": -1013, "msg": "Filter failure: PERCENT_PRICE_BY_SIDE"}, 400)
            if neu.get("type") == "MARKET" and neu.get("side") == "SELL" and X.spot_sell_429:
                if X.spot_sell_429 is not True: X.spot_sell_429 -= 1
                return self._a({"code": -1003, "msg": "Too many requests"}, 429)
            if neu.get("type", "").startswith("STOP") and X.stop_fehler: return self._a({"code": -1013, "msg": "Filter failure"}, 400)
            o["status"] = "CANCELED"; coin = o["symbol"][:-4]; X.gesperrt[coin] -= o["qty"]; X.frei[coin] += o["qty"]
            antwort, echt_a, pfad_alt = [], self._a, self.path
            self._a = lambda obj, code=200: antwort.append((obj, code))
            try:
                self.path = "/api/v3/order?" + urllib.parse.urlencode(neu); self._r("POST")
            finally:
                self._a, self.path = echt_a, pfad_alt
            obj, code = antwort[-1]
            if code >= 500: return self._a({"code": -1001, "msg": "Unknown"}, 503)
            if code != 200: return self._a({"code": -2021, "msg": "Order cancel-replace partially failed.", "data": {"cancelResult": "SUCCESS",
                                            "newOrderResult": "FAILURE", "newOrderResponse": obj}}, 409)
            return self._a({"cancelResult": "SUCCESS", "newOrderResult": "SUCCESS", "newOrderResponse": obj})
        if pfad == "/api/v3/order" and m == "DELETE":
            if X.spot_del_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 500)
            o = X.orders.get(int(p["orderId"]))
            if not o or o["status"] != "NEW": return self._a({"code": -2011, "msg": "Unknown order sent."}, 400)
            o["status"] = "CANCELED"; coin = o["symbol"][:-4]; X.gesperrt[coin] -= o["qty"]; X.frei[coin] += o["qty"]
            if X.spot_del_antwort_weg: X.spot_del_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"status": "CANCELED"})
        if pfad == "/api/v3/order" and m == "GET":
            o = X.orders.get(int(p["orderId"])) if "orderId" in p else X.cids.get(p.get("origClientOrderId"))
            if X.nachfrage_kaputt: return self._a({"code": -1001}, 503)
            if not o: return self._a({"code": -2013, "msg": "Order does not exist."}, 400)
            return self._a({"status": o["status"], "executedQty": repr(o.get("ausgefuehrt", 0.0)), "cummulativeQuoteQty": repr(o.get("quote", 0.0)), "orderId": o.get("id")})
        if pfad == "/api/v3/order" and p.get("type") in ("STOP_LOSS", "STOP_LOSS_LIMIT"):
            coin = p["symbol"][:-4]; q = float(p["quantity"])
            if X.vor_stop: X.vor_stop()
            if any(o.get("cid") == p.get("newClientOrderId") and o["status"] == "NEW" for o in X.orders.values()):
                return self._a({"code": -2010, "msg": "Duplicate order sent."}, 400)
            if X.stop_fehler: return self._a({"code": -1013, "msg": "Filter failure"}, 400)
            if float(p["stopPrice"]) >= X.kurs[p["symbol"]]: return self._a({"code": -2010, "msg": "Stop price would trigger immediately."}, 400)
            if X.frei[coin] < q - 1e-12: return self._a({"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400)
            X.frei[coin] -= q; X.gesperrt[coin] += q; X.next_id += 1
            X.orders[X.next_id] = {"id": X.next_id, "symbol": p["symbol"], "qty": q, "stop": float(p["stopPrice"]), "status": "NEW", "typ": p["type"],
                                   "cid": p.get("newClientOrderId", "")}
            if X.stop_antwort_weg: X.stop_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"orderId": X.next_id})
        if pfad == "/api/v3/order" and p.get("type") == "MARKET":
            sym = p["symbol"]; coin = sym[:-4]; q = float(p["quantity"]); preis = X.kurs[sym]
            if p["side"] == "SELL" and X.spot_sell_429:
                if X.spot_sell_429 is not True: X.spot_sell_429 -= 1  # Zahl = so viele 429, dann geht es wieder
                return self._a({"code": -1003, "msg": "Too many requests"}, 429)
            status = "FILLED"
            if X.teil: q = float(f"{q * X.teil:.5f}"); status = "EXPIRED"; X.teil = None  # Rest nicht ausgeführt (dünner Markt)
            wert = q * preis
            if p["side"] == "BUY":
                if X.frei["USDT"] < wert - 1e-9: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                geb = q * 0.001; X.frei["USDT"] -= wert; X.frei[coin] += q - geb
                fills = [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": coin}]
            else:
                if X.spot_sell_fehler: return self._a({"code": -1013, "msg": "Filter failure: PERCENT_PRICE_BY_SIDE"}, 400)
                if X.frei[coin] < q - 1e-12: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                geb = wert * 0.001; X.frei[coin] -= q; X.frei["USDT"] += wert - geb
                fills = [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": "USDT"}]
            X.next_id += 1; o = {"id": X.next_id, "symbol": sym, "status": status, "ausgefuehrt": q, "quote": wert}
            X.orders[X.next_id] = o; X.cids[p["newClientOrderId"]] = o
            if X.nach_order: X.nach_order()
            if X.spot_503: X.spot_503 = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"status": status, "executedQty": repr(q), "cummulativeQuoteQty": repr(wert), "fills": fills, "orderId": X.next_id})
        if pfad == "/sapi/v1/asset/transfer":
            b = float(p["amount"])
            if p["type"] == "MAIN_UMFUTURE":
                if X.frei["USDT"] < b: return self._a({"code": -5013}, 400)
                X.frei["USDT"] -= b; X.fut += b
            else:
                if X.verfuegbar() < b: return self._a({"code": -5013}, 400)
                X.fut -= b; X.frei["USDT"] += b
            if X.transfer_antwort_weg: X.transfer_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"tranId": 1})
        if pfad == "/fapi/v1/positionSide/dual": return self._a({"dualSidePosition": X.hedge})
        if pfad == "/fapi/v2/account":
            if X.fkonto_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 503)
            return self._a({"totalWalletBalance": repr(X.fut), "totalUnrealizedProfit": repr(X.upnl()), "maxWithdrawAmount": repr(max(0.0, X.verfuegbar())),
                            "availableBalance": repr(X.verfuegbar())})
        if pfad == "/fapi/v2/positionRisk":
            X.n_pos += 1
            if X.gestoert(X.n_pos, X.pos_fehler_ab, X.pos_fehler_anzahl): return self._a({"code": -1001, "msg": "Internal error"}, 503)
            return self._a([{"symbol": p["symbol"], "positionAmt": repr(X.pos[p["symbol"]]), "leverage": str(X.hebel[p["symbol"]])}])
        if pfad == "/fapi/v1/exchangeInfo":
            def f(s): return [{"filterType": "LOT_SIZE", "stepSize": "0.001", "minQty": "0.001"}, {"filterType": "PRICE_FILTER", "tickSize": "0.10"},
                              {"filterType": "MIN_NOTIONAL", "notional": "100" if s == "BTCUSDT" else "20"}]  # wie bei Binance
            return self._a({"symbols": [{"symbol": s, "status": "TRADING", "filters": f(s)} for s in ("BTCUSDT", "ETHUSDT")]})
        if pfad == "/fapi/v1/marginType":
            if X.marge.get(p["symbol"]) == p["marginType"]: return self._a({"code": -4046, "msg": "No need to change margin type."}, 400)
            if X.pos[p["symbol"]]: return self._a({"code": -4048, "msg": "Margin type cannot be changed if there exists position."}, 400)
            X.marge[p["symbol"]] = p["marginType"]; return self._a({"code": 200})
        if pfad == "/fapi/v1/leverage":
            if X.pos[p["symbol"]] and int(p["leverage"]) < X.hebel[p["symbol"]]:
                return self._a({"code": -4161, "msg": "Leverage reduction is not supported in Isolated Margin Mode with open positions."}, 400)
            X.hebel[p["symbol"]] = int(p["leverage"]); return self._a({"leverage": int(p["leverage"])})
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET":
            sym = p["symbol"]; q = float(p["quantity"]) * (1 if p["side"] == "BUY" else -1)
            if p.get("reduceOnly") == "true":
                if X.perp_reduce_fehler: return self._a({"code": -4131, "msg": "The counterparty's best price does not meet the PERCENT_PRICE filter limit."}, 400)
                if abs(X.pos[sym] + q) > abs(X.pos[sym]) + 1e-12: return self._a({"code": -2022, "msg": "ReduceOnly Order is rejected."}, 400)
            else:
                if X.perp_fehler: return self._a({"code": -2019, "msg": "Margin is insufficient."}, 400)
                noetig = abs(q) * X.kurs[sym] / X.hebel[sym]
                if X.verfuegbar() < noetig - 1e-6: return self._a({"code": -2019, "msg": "Margin is insufficient."}, 400)
            if X.perp_503 == "nein" and p.get("reduceOnly") != "true": X.perp_503 = None; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            if X.perp_spaet and p.get("reduceOnly") != "true":
                X.perp_spaet = False; o = {"status": "NEW", "executedQty": "0", "sym": sym, "q": q}
                X.fcids[p["newClientOrderId"]] = o; X.spaet.append(o)
                return self._a({"code": -1001, "msg": "Unknown"}, 503)
            X.buchen(sym, q); X.cids[p["newClientOrderId"]] = {"status": "FILLED"}
            X.fcids[p["newClientOrderId"]] = {"status": "FILLED", "executedQty": p["quantity"]}
            if X.perp_503 == "ja" and p.get("reduceOnly") != "true": X.perp_503 = None; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            if X.nach_order: X.nach_order()
            return self._a({"status": "FILLED", "executedQty": p["quantity"]})
        if pfad == "/fapi/v1/openAlgoOrders":
            if X.algo_liste_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 503)
            return self._a([{"algoId": i, **a} for i, a in X.algos.items() if a["symbol"] == p["symbol"]])
        if pfad == "/fapi/v1/order" and m == "GET":
            if X.abfrage_kaputt: return self._a({"code": -1001, "msg": "Internal error"}, 503)
            o = X.fcids.get(p.get("origClientOrderId"))
            if not o: return self._a({"code": -2013, "msg": "Order does not exist."}, 400)
            return self._a({"status": o["status"], "executedQty": o["executedQty"]})
        if pfad == "/fapi/v1/order" and m == "DELETE":
            o = X.fcids.get(p.get("origClientOrderId"))
            if X.storno_kaputt or not o or o["status"] != "NEW": return self._a({"code": -2011, "msg": "Unknown order sent."}, 400)
            o["status"] = "CANCELED"; return self._a({"status": "CANCELED"})
        if pfad == "/fapi/v1/algoOrder" and m == "POST":
            if "closePosition" in p and "quantity" in p: return self._a({"code": -1106}, 400)
            if X.vor_stop: X.vor_stop()
            if (p["side"] == "BUY") == (float(p["triggerPrice"]) <= X.kurs[p["symbol"]]):
                return self._a({"code": -2021, "msg": "Order would immediately trigger."}, 400)
            if any(a.get("clientAlgoId") == p.get("clientAlgoId") for a in X.algos.values()):
                return self._a({"code": -4116, "msg": "ClientOrderId is duplicated."}, 400)
            X.next_id += 1; X.algos[X.next_id] = p
            if X.algo_antwort_weg: X.algo_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"algoId": X.next_id})
        if pfad == "/fapi/v1/algoOrder" and m == "DELETE":
            if X.algo_del_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 500)
            if int(p["algoId"]) not in X.algos: return self._a({"code": -2011, "msg": "Unknown order"}, 400)
            del X.algos[int(p["algoId"])]; return self._a({"code": 200})
        return self._a({})
    def spaet_ausfuehren():
        """Unklare Perp-Aufträge, die Binance erst später ausführt."""
        for o in X.spaet:
            if o["status"] == "NEW":
                X.buchen(o["sym"], o["q"]); o.update(status="FILLED", executedQty=repr(abs(o["q"])))
        X.spaet = []
    def upnl():
        return sum(X.pos[s] * (X.kurs[s] - X.einstand[s]) for s in X.pos)
    def verfuegbar():
        return X.fut + X.upnl() - sum(abs(X.pos[s]) * X.kurs[s] / X.hebel[s] for s in X.pos)
    def buchen(sym, q):
        """Perp-Position ändern: Einstand mitteln (vergrössern) bzw. Gewinn/Verlust realisieren (verkleinern)."""
        if not q: return
        alt = X.pos[sym]; neu = round(alt + q, 6)
        if alt == 0 or (alt > 0) == (q > 0):
            X.einstand[sym] = (abs(alt) * X.einstand[sym] + abs(q) * X.kurs[sym]) / (abs(alt) + abs(q))
        else:
            zu = min(abs(q), abs(alt)); X.fut += zu * (X.kurs[sym] - X.einstand[sym]) * (1 if alt > 0 else -1)
            if abs(q) > abs(alt): X.einstand[sym] = X.kurs[sym]
        X.pos[sym] = neu
    def ausloesen(sym, preis):
        """Kurs ändern; Spot-Stops (SELL, Stop ≥ Kurs) und Perp-Stops (BUY, Trigger ≤ Kurs) lösen aus."""
        X.kurs[sym] = preis; coin = sym[:-4]
        for o in X.orders.values():
            if o.get("typ") in ("STOP_LOSS", "STOP_LOSS_LIMIT") and o["symbol"] == sym and o["status"] == "NEW" and preis <= o["stop"]:
                X.gesperrt[coin] -= o["qty"]; X.frei["USDT"] += o["qty"] * preis * 0.999
                o.update(status="FILLED", ausgefuehrt=o["qty"], quote=o["qty"] * preis)
        for i, a in list(X.algos.items()):
            if a["symbol"] == sym and a["side"] == "BUY" and preis >= float(a["triggerPrice"]):
                if X.pos[sym] < 0: X.buchen(sym, min(float(a["quantity"]), -X.pos[sym]))
                del X.algos[i]
    def do_GET(self): self._r("GET")
    def do_POST(self): self._r("POST")
    def do_DELETE(self): self._r("DELETE")
    def log_message(self, *a): pass

srv = HTTPServer(("127.0.0.1", 0), X); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_port}"
TEST = {"BINANCE_API_KEY": "s", "BINANCE_API_SECRET": GEHEIM, "BINANCE_FUTURES_API_KEY": "f", "BINANCE_FUTURES_API_SECRET": GEHEIM,
        "PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KRYPTO_PILOT2": "an", "KI_BOT_MAX_AUFTRAG": "100000"}
ECHT = {"PILOT2_API_KEY": "k", "PILOT2_API_SECRET": GEHEIM, "PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KRYPTO_PILOT2": "an",
        "BINANCE_TESTNET": "false", "BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD",
        "KI_BOT_MAX_AUFTRAG": "100000", "KRYPTO_PILOT2_KAPITAL": "20000"}
def E(m, h): return {"markt": m, "hebel": h, "stop_long": X.kurs[m + "USDT"] * 0.9, "stop_short": X.kurs[m + "USDT"] * 1.1, "stand": "2026-10-13"}
tmp = Path(tempfile.mkdtemp()); zaehler = [0]
# nie die echten Schalter-Dateien anfassen (der Selbsttest läuft auch auf dem PC, wo Cockpit/Telegram mitlesen)
BF.STOP_DATEI = tmp / "STOP"; L.PAUSE_DATEI = tmp / "PAUSE"
def neu_buch(): zaehler[0] += 1; return tmp / f"b{zaehler[0]}.json"
def lauf(ents, env, datei, trocken=False, notaus=False):
    return L.ausfuehren(ents, trocken=trocken, env=env, bestand_datei=datei, notaus=notaus)
def markt_orders(): return [(x[1], x[2].get("side"), float(x[2]["quantity"]), x[2].get("symbol")) for x in X.log if x[0] == "POST" and x[2].get("type") == "MARKET"]
def coins(m="BTC"): return X.frei[m] + X.gesperrt[m]
def netto_btc(): return coins("BTC") + X.pos["BTCUSDT"]
def algo_menge(): return sum(float(a["quantity"]) for a in X.algos.values())
def stops_offen(sym="BTCUSDT"): return [o for o in X.orders.values() if o.get("typ") and o["symbol"] == sym and o["status"] == "NEW"]
def schreib_auftraege(): return [x for x in X.log if x[0] in ("POST", "DELETE")]

# ── Schalter ──
pruefe("Echtgeld nur mit allen Freigaben", L.einstellungen(ECHT)["echtgeld"] and not L.einstellungen({**ECHT, "KRYPTO_PILOT2": ""})["echtgeld"]
       and not L.einstellungen({**ECHT, "BINANCE_FUTURES_TESTNET": "true"})["echtgeld"] and not L.einstellungen({**ECHT, "KI_BOT_ECHTGELD": "ja"})["echtgeld"])
pruefe("fremde Adresse im Echtgeld-Modus wird abgelehnt", L.einstellungen({**ECHT, "PILOT2_SPOT_URL": "https://boese.example"})["fehler"] != "")
# ── Probelauf ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d, trocken=True)
pruefe("trocken: nichts gesendet, kein Buch geschrieben", not schreib_auftraege() and not d.exists(), (schreib_auftraege(), d.exists()))
# ── voll long (Testnetz): Gebühr in Coins, Stop über den ganzen Kontostand ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("voll long: Spot gekauft, kein Perp", coins() > 0.08 and X.pos["BTCUSDT"] == 0, (X.frei, X.pos))
st = stops_offen()
pruefe("Spot-Stop (STOP_LOSS = Markt beim Auslösen) über den GANZEN Bestand nach Gebühr", len(st) == 1 and abs(st[0]["qty"] - coins()) < 2e-5
       and st[0]["typ"] == "STOP_LOSS", st)
pruefe("keine Warnung", not r["warnung"], r["zeilen"])
pruefe("Buch: nur Start, Konto-ID, Stop-Kennungen, unklare Aufträge, Märkte ohne vollständigen Stop, Not-Aus offen — kein "
       "Coin- oder USDT-Buch",
       set(json.loads(d.read_text())["testnetz"]) == {"start", "uid", "stops", "perp_offen", "unklar", "schutz_offen", "notaus_offen", "paar_pause"},
       json.loads(d.read_text()))
n0 = len(markt_orders()); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("zweiter Lauf: kein neuer Kauf, genau EIN offener Stop", len(markt_orders()) == n0 and len(stops_offen()) == 1, (markt_orders()[n0:], stops_offen()))
# ── Echtgeld-Unterkonto: Ernte (z=0) ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte: Pfand verschoben, Spot ≈ −Short (marktneutral), keine Warnung",
       X.fut > 0 and abs(netto_btc()) * 100000 < 10 and X.pos["BTCUSDT"] < 0 and not r["warnung"], (X.fut, X.frei, X.pos, r["zeilen"]))
pruefe("Ernte: kein Stop", not stops_offen() and not X.algos)
pruefe("Start: Binance-Konto-ID gemerkt", L.buch_lesen(d, "echt")["uid"] == 4711, L.buch_lesen(d, "echt"))
r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("voll short: Spot-Coins verkauft, Perp short", coins() < 1e-4 and X.pos["BTCUSDT"] < -0.05, (X.frei, X.pos))
a = list(X.algos.values())[-1] if X.algos else {}
pruefe("Short-Stop: Menge + reduceOnly, kein closePosition, Menge ≤ Short", a.get("reduceOnly") == "true" and "closePosition" not in a
       and float(a.get("quantity", 9)) <= -X.pos["BTCUSDT"] + 1e-9, a)
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); r = lauf([E("BTC", 0.6)], ECHT, d)
st = stops_offen()
pruefe("teil long mit Ernte: Spot-Stop nur über die Netto-Richtung, kein Perp-Stop", st and st[0]["qty"] <= netto_btc() + 2e-5 and not X.algos, (st, netto_btc(), X.algos))
X.ausloesen("BTCUSDT", st[0]["stop"] - 1 if st else 1)
pruefe("nach Stop-Auslösung: Ernte bleibt abgesichert (|Spot + Perp| klein)", abs(netto_btc()) * X.kurs["BTCUSDT"] < 15, (X.frei, X.pos))
# ── Konto = Wahrheit ──
X.reset(); X.frei["BTC"] = 1.0; d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("Konto = Wahrheit: vorhandene Coins zählen mit, über das Ziel hinaus wird verkauft (Deckel 10'000)", abs(coins() - 0.0995) < 0.0005, (coins(), r["zeilen"]))
X.next_id += 1; fremd = X.next_id
X.orders[fremd] = {"id": fremd, "symbol": "BTCUSDT", "qty": 0.0, "stop": 1.0, "status": "NEW", "typ": "STOP_LOSS", "cid": "web_meins"}
lauf([E("BTC", 1.0)], TEST, d)
pruefe("normaler Lauf storniert nie einen Auftrag ohne eigene Kennung", X.orders[fremd]["status"] == "NEW")
r = lauf([], TEST, d, notaus=True)
pruefe("Not-Aus: ALLE Aufträge auf BTC weg und ALLE Coins des Pilot-Kontos verkauft, «alles zu»", coins() * 100000 < 5
       and X.orders[fremd]["status"] == "CANCELED" and r["alles_zu"] is True, (X.frei, X.orders[fremd], r["zeilen"]))
pruefe("… danach ist Pilot 2.0 nicht mehr gestartet und die Buch-Datei weg (krypto-auto.bat startet nichts mehr dafür)",
       not L.hat_bestand(d) and not d.exists())
# ── Not-Aus hat Vorrang vor Pause, Konflikt, fehlendem Deckel ──
for name, env_extra, pause in (("Pause", {}, True), ("ETH-Sparplan", {"ETH_SPARPLAN_BETRAG": "50"}, False), ("ohne Deckel", {"KRYPTO_PILOT2_KAPITAL": ""}, False)):
    X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
    pd = L.PAUSE_DATEI; existierte = pd.exists()
    try:
        if pause: pd.parent.mkdir(parents=True, exist_ok=True); pd.write_text("")
        r = lauf([], {**ECHT, **env_extra, "KI_BOT_STOP": "1"}, d)
    finally:
        if pause and not existierte: pd.unlink()
    pruefe(f"Not-Aus trotz {name}: beide Konten geschlossen", X.pos["BTCUSDT"] == 0 and coins() * 100000 < 5 and r["alles_zu"], (X.pos, X.frei, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.frei["BTC"] = 0.0
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus: Perp zu, auch wenn der Spot-Teil nichts mehr findet", X.pos["BTCUSDT"] == 0, (X.pos, r["zeilen"]))
# ── unklare Antworten ──
X.reset(spot_503=True, nachfrage_kaputt=True); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("unklarer Kauf: Warnung, Stop über die tatsächlich gekauften Coins", r["warnung"] and stops_offen()
       and abs(stops_offen()[0]["qty"] - coins()) < 2e-5, (r["zeilen"], stops_offen(), coins()))
X.nachfrage_kaputt = False; n0 = len(markt_orders()); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("nächster Lauf liest den Kontostand: KEIN zweiter Kauf", not [o for o in markt_orders()[n0:] if o[1] == "BUY"], markt_orders()[n0:])
X.reset(spot_503=True, nachfrage_kaputt=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
r = lauf([], TEST, d, notaus=True)
pruefe("unklarer Kauf → Not-Aus verkauft trotzdem alles (Kontostand), aber NICHT «alles zu», solange der Kauf unklar ist "
       "(käme er verspätet an, lägen wieder Coins da)", coins() * 100000 < 5 and r["alles_zu"] is False
       and any("unklar" in z for z in r["zeilen"]), (X.frei, r["zeilen"]))
X.nachfrage_kaputt = False; r = lauf([], TEST, d, notaus=True)
pruefe("… sobald Binance den Kauf bestätigt (Abfrage geht wieder): geklärt, jetzt «alles zu»", r["alles_zu"] is True and coins() * 100000 < 5,
       r["zeilen"])
X.reset(perp_503="ja"); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Short-Antwort verloren, aber ausgeführt → per Kennung als ausgeführt erkannt, Ernte bleibt (netto ≈ 0)", coins() > 0.01
       and abs(netto_btc()) * 100000 < 15 and not L.buch_lesen(d, "echt")["unklar"], (X.frei, X.pos, r["zeilen"]))
X.reset(perp_503="ja", abfrage_kaputt=True); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)  # Nachfrage per Kennung: keine Antwort
pruefe("… ist die Kennung nicht abfragbar: Position nachlesen zeigt AUSGEFÜHRT", coins() > 0.01 and abs(netto_btc()) * 100000 < 15
       and any("zeigt AUSGEFÜHRT" in z for z in r["zeilen"]), (X.frei, X.pos, r["zeilen"]))
X.reset(perp_503="nein"); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
st = stops_offen()
pruefe("Short-Antwort unklar, Position zeigt nichts → KEIN Rückverkauf, der Spot bekommt als Long einen Stop", X.pos["BTCUSDT"] == 0
       and coins() > 0.01 and st and abs(st[0]["qty"] - coins()) < 2e-5, (X.frei, X.pos, st, r["zeilen"]))
X.reset(perp_fehler=True); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte-Short sicher abgelehnt → Spot zurückverkauft (netto ≈ 0), Warnung", abs(netto_btc()) * 100000 < 10 and r["warnung"], (X.frei, X.pos, r["zeilen"]))
X.reset(spot_503=True, perp_fehler=True); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Kauf nur «nachgefragt» (ohne Gebühr in der Antwort), Short abgelehnt → Rückverkauf trotzdem", coins() * 100000 < 15
       and X.pos["BTCUSDT"] == 0, (X.frei, X.pos, r["zeilen"]))
X.reset(transfer_antwort_weg=True); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("verlorene Antwort beim Verschieben → weiter mit dem Kontostand: Ernte steht marktneutral", X.fut > 0 and X.pos["BTCUSDT"] < 0
       and abs(netto_btc()) * 100000 < 15, (X.fut, X.frei, X.pos, r["zeilen"]))
pruefe("… Kontowert = was im Pilot-Konto liegt (nichts doppelt gezählt)", abs(L.kontowert(L.Spot(L.einstellungen(ECHT)["spot"]),
       L.Fut(L.einstellungen(ECHT)["futures"])) - 20000) < 60, r["kapital"])
# ── Marge, Stop-Kurs, Deckel ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 0.0)], TEST, d)
pruefe("Testnetz ohne Futures-Guthaben: keine Ernte-Coins ohne Short (netto ≈ 0)", abs(netto_btc()) * 100000 < 10, (X.frei, X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); e = E("BTC", 1.0); e["stop_long"] = 101000.0; r = lauf([e], TEST, d)
pruefe("Kurs unter Stop → kein Kauf", not [o for o in markt_orders() if o[1] == "BUY"], markt_orders())
e = E("BTC", 1.0); e["stop_long"] = None; X.reset(); r = lauf([e], TEST, neu_buch())
pruefe("kein Stop-Kurs → kein Long, Warnung", not markt_orders() and r["warnung"])
X.reset(); X.frei["USDT"] = 2000.0; d = neu_buch(); env2k = {**ECHT, "KRYPTO_PILOT2_KAPITAL": "2000"}
lauf([E("BTC", 1.0)], env2k, d); gekauft = coins()
for o in X.orders.values():
    if o.get("typ") == "STOP_LOSS": o["stop"] = 1.0  # Stop tief, damit er beim Kurssturz nicht auslöst
X.kurs["BTCUSDT"] = 50000.0; lauf([E("BTC", 1.0)], env2k, d)
pruefe("Deckel = Verlustgrenze: nach −50 % kein Nachkauf (im Pilot-Konto liegt nichts nach)", gekauft <= 0.02 and coins() - gekauft < 0.0011, (gekauft, coins()))
X.reset(); X.frei["USDT"] = 50000.0; d = neu_buch(); r = lauf([E("BTC", 0.0)], {**ECHT, "KRYPTO_PILOT2_KAPITAL": "3000"}, d)
pruefe("Pilot-Konto mehr wert als der Deckel → kein Start, Warnung", not markt_orders() and not L.buch_lesen(d, "echt")["start"]
       and any("mehr als der Deckel" in z for z in r["zeilen"]), r["zeilen"])
X.reset(); X.frei["USDT"] = 150.0; d = neu_buch(); r = lauf([E("BTC", 0.0)], {**ECHT, "KRYPTO_PILOT2_KAPITAL": "150"}, d)
pruefe("Ernte unter dem BTC-Futures-Minimum → kein Spot-Kauf, kein Short", not markt_orders() and X.pos["BTCUSDT"] == 0, (markt_orders(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, d); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("ETH abgewählt → ETH verkauft", coins("ETH") * 4000 < 5, (X.frei, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", -0.5)], ECHT, d); X.hebel["BTCUSDT"] = 2; pos0 = X.pos["BTCUSDT"]; r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("Futures-Hebel steht auf 2 → kein grösserer Short, Warnung", X.pos["BTCUSDT"] == pos0 and r["warnung"], (X.pos, r["zeilen"]))
X.reset(); d = neu_buch()
def stop_setzen(): BF.STOP_DATEI.parent.mkdir(parents=True, exist_ok=True); BF.STOP_DATEI.write_text("")
X.nach_order = stop_setzen; existierte = BF.STOP_DATEI.exists()
try:
    r = lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, d)
finally:
    if not existierte and BF.STOP_DATEI.exists(): BF.STOP_DATEI.unlink()
pruefe("Not-Aus während des Laufs: nach dem ersten Auftrag nichts mehr", len([o for o in markt_orders() if o[1] == "BUY"]) == 1, markt_orders())
# Code-Review der R20: das Protokoll des unterbrochenen Laufs kommt NACH dem Schliessen — es wartet auf eine Sperre und wiederholt bei gesperrter Datei, das darf den Not-Aus nie aufhalten
X.reset(); d = neu_buch(); X.nach_order = stop_setzen; existierte = BF.STOP_DATEI.exists(); folge = []; orig_na = L.notaus_alle


def na_folge(*a, **k):
    folge.append("schliessen")
    return orig_na(*a, **k)


L.notaus_alle = na_folge
try:
    L.ausfuehren([E("BTC", 1.0), E("ETH", 1.0)], env=TEST, bestand_datei=d, protokolliere=lambda e: folge.append("protokoll:notaus" if e.get("notaus") else "protokoll:lauf"))
finally:
    L.notaus_alle = orig_na
    if not existierte and BF.STOP_DATEI.exists(): BF.STOP_DATEI.unlink()
pruefe("Not-Aus während des Laufs: erst wird geschlossen, dann das Protokoll des Laufs geschrieben (ein langsames Protokoll hielte sonst das Schliessen auf)", folge == ["schliessen", "protokoll:notaus", "protokoll:lauf"], folge)
# … wirft der Not-Aus eine Ausnahme, steht der Eintrag des Laufs trotzdem im Protokoll (die Aufträge sind raus; Code-Review der R20)
X.reset(); d = neu_buch(); X.nach_order = stop_setzen; existierte = BF.STOP_DATEI.exists(); folge2 = []


def na_wirft(*a, **k):
    folge2.append("schliessen:wirft")
    raise OSError("Buch kurz gesperrt")


L.notaus_alle = na_wirft
fehler_na = None
try:
    L.ausfuehren([E("BTC", 1.0), E("ETH", 1.0)], env=TEST, bestand_datei=d, protokolliere=lambda e: folge2.append("protokoll:lauf" if not e.get("notaus") else "protokoll:notaus"))
except OSError as ex_na:
    fehler_na = str(ex_na)
finally:
    L.notaus_alle = orig_na
    if not existierte and BF.STOP_DATEI.exists(): BF.STOP_DATEI.unlink()
pruefe("Not-Aus während des Laufs wirft eine Ausnahme: sie läuft weiter nach oben, der Eintrag des Laufs (mit den schon gesendeten Aufträgen) steht trotzdem im Protokoll", fehler_na == "Buch kurz gesperrt" and folge2 == ["schliessen:wirft", "protokoll:lauf"], (fehler_na, folge2))
X.reset(stop_fehler=True); r = lauf([E("BTC", 1.0)], TEST, neu_buch())
pruefe("Stop abgelehnt → Warnung «OHNE Stop»", r["warnung"] and any("OHNE Stop" in z for z in r["zeilen"]), r["zeilen"])
# ── Rechte, Konto-ID, Konflikte ──
X.reset(); X.rechte["enableWithdrawals"] = True; r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("Schlüssel mit Auszahlungsrecht → kein Auftrag", not markt_orders() and r["warnung"])
X.reset(); X.rechte["permitsUniversalTransfer"] = False; r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("ohne «Universal Transfer»: Long über Spot geht trotzdem", coins() > 0.08 and not [x for x in X.log if x[1] == "/sapi/v1/asset/transfer"], r["zeilen"])
X.reset(); X.rechte["permitsUniversalTransfer"] = False; r = lauf([E("BTC", 0.0)], ECHT, neu_buch())
pruefe("ohne «Universal Transfer»: kein Verschieben, Hinweis von Hand, keine ungesicherte Ernte", not [x for x in X.log if x[1] == "/sapi/v1/asset/transfer"]
       and any("von Hand" in z for z in r["zeilen"]) and abs(netto_btc()) * 100000 < 10, r["zeilen"])
X.reset(hedge=True); r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("Hedge-Modus → kein Auftrag", not markt_orders() and r["warnung"])
X.reset(); X.uid = None; d = neu_buch(); r = lauf([E("BTC", 1.0)], ECHT, d)
pruefe("Binance meldet keine Konto-ID → kein Start (nie ungebunden handeln)", not markt_orders() and r["warnung"] and not L.buch_lesen(d, "echt")["start"], r["zeilen"])
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], ECHT, d); X.uid = 999; X.frei["BTC"] += 0.5; n0 = len(markt_orders())
r = lauf([E("BTC", 1.0)], ECHT, d)
pruefe("anderes Binance-Konto (UID) → kein Auftrag, Warnung", len(markt_orders()) == n0 and any("ANDERES" in z for z in r["zeilen"]), r["zeilen"])
n0 = len(schreib_auftraege()); r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus im fremden Konto: NICHTS angefasst, nicht «alles zu», Buch bleibt", len(schreib_auftraege()) == n0 and r["alles_zu"] is False
       and L.hat_bestand(d) and any("NICHTS angefasst" in z for z in r["zeilen"]), r["zeilen"])
X.uid = 4711; r = lauf([], ECHT, d, notaus=True)
pruefe("… mit dem richtigen Schlüssel schliesst der Not-Aus (auch eingelegte Coins des Pilot-Kontos)", r["alles_zu"] is True and coins() * 100000 < 5, r["zeilen"])
X.reset(); r = lauf([E("BTC", 1.0)], {**TEST, "CALLS_MODUS": "echtgeld"}, neu_buch())
pruefe("Telegram-Calls im selben Konto → kein Aufbau", not markt_orders() and r["warnung"])
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.frei["BTC"] += 0.5; r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Coins, die ins Pilot-Konto gelegt werden, gehören Pilot 2.0: der Überschuss wird nach Plan verkauft", coins() < 0.2 and abs(netto_btc()) * 100000 < 15,
       (X.frei, X.pos, r["zeilen"]))
# ── Not-Aus-Fälle ──
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
r = lauf([], {**{k: v for k, v in ECHT.items() if k.startswith("PILOT2_")}, "KI_BOT_STOP": "1"}, d)
pruefe("Not-Aus nach Ausschalten: Echtgeld-Pilot trotzdem geschlossen", X.pos["BTCUSDT"] == 0 and r["alles_zu"] is True and "echt" in r["modus"], (X.pos, r))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
r = lauf([], {"PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KI_BOT_STOP": "1"}, d)
pruefe("Not-Aus ohne Echtgeld-Schlüssel: NICHT «alles zu», laute Warnung", r["alles_zu"] is False and r["warnung"] and X.pos["BTCUSDT"] < 0, r["zeilen"])
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); n0 = len(X.log)
r = lauf([], {**ECHT, "KI_BOT_STOP": "1"}, d, trocken=True)
pruefe("Not-Aus trocken: kein Auftrag, alles_zu = None", r["alles_zu"] is None and not [x for x in X.log[n0:] if x[0] in ("POST", "DELETE")], r)
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.perp_reduce_fehler = True
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus: Short lässt sich nicht schliessen → Spot bleibt als Absicherung (netto ≈ 0), nicht «alles zu»",
       X.pos["BTCUSDT"] < 0 and abs(netto_btc()) * 100000 < 15 and r["alles_zu"] is False, (X.frei, X.pos, r["zeilen"]))
pruefe("… Buch bleibt (nächster Not-Aus versucht es wieder), Perp-Stop schützt den Short weiter", L.hat_bestand(d) and L.buch_lesen(d, "echt")["perp_offen"])
X.perp_reduce_fehler = False; r = lauf([], ECHT, d, notaus=True)
pruefe("zweiter Not-Aus: jetzt alles zu, Futures-Geld zurück, Buch neu", r["alles_zu"] is True and X.pos["BTCUSDT"] == 0 and X.fut < 1
       and not L.hat_bestand(d), (X.pos, X.fut, r["zeilen"]))
X.reset(); X.fut = 20000.0; d = neu_buch(); lauf([E("BTC", 0.5)], TEST, d)
X.spot_del_fehler = True; r = lauf([], TEST, d, notaus=True)
pruefe("Not-Aus: Storno scheitert → freie Coins trotzdem verkauft, ehrlich nicht «alles zu»", X.frei["BTC"] * 100000 < 5 and r["alles_zu"] is False, (X.frei, X.gesperrt, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); d.write_text("{kaputt")
r = lauf([], {**ECHT, "KI_BOT_STOP": "1"}, d)
pruefe("Buch kaputt → Not-Aus meldet NICHT «alles zu»", r["alles_zu"] is False and r["warnung"], r["zeilen"])
pruefe("Buch kaputt → zählt als gestartet (alter Pilot handelt nicht)", L.hat_bestand(d))
try:
    L.buch_schreiben(d, "testnetz", L.leer_buch()); ueberschrieben = True
except L.BuchKaputt:
    ueberschrieben = False
pruefe("kaputtes Buch wird nie überschrieben", not ueberschrieben and d.read_text() == "{kaputt")
n0 = len(markt_orders()); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("kaputtes Buch → kein Handel", r["warnung"] and len(markt_orders()) == n0, r["zeilen"])
d.unlink(); n0 = len(markt_orders()); r = lauf([], {**ECHT, "KI_BOT_STOP": "1"}, d)
pruefe("Buch fehlt + Positionen im Pilot-Konto → nicht «alles zu», gemeldet, nichts blind verkauft", r["alles_zu"] is False
       and len(markt_orders()) == n0 and any("Buch kennt es nicht" in z and re.search(r"\d BTC", z) for z in r["zeilen"]), r["zeilen"])
L.FREIGEGEBEN = False; n0 = len(X.log); r = L.notaus_alle({**ECHT}, neu_buch()); L.FREIGEGEBEN = True
pruefe("gesperrt (FREIGEGEBEN=False): Not-Aus ohne Pilot-2.0-Buch liest das Pilot-Konto nicht (kein Fehlalarm)", len(X.log) == n0 and r["alles_zu"] is True, r)
# ── Startprüfung ──
for name, vorher in (("BTC im Spot", lambda: X.frei.update(BTC=0.5)), ("Futures-Guthaben", lambda: setattr(X, "fut", 500.0)),
                     ("alte Pilot-Position + closePosition-Stop", lambda: (X.pos.update(BTCUSDT=-0.01),
                      X.algos.update({999: {"symbol": "BTCUSDT", "side": "BUY", "closePosition": "true", "triggerPrice": "120000"}})))):
    X.reset(); vorher(); d = neu_buch(); r = lauf([E("BTC", 0.5)], ECHT, d)
    pruefe(f"Startprüfung echt ({name}) → kein Auftrag, Warnung", not markt_orders() and r["warnung"] and not L.buch_lesen(d, "echt")["start"], r["zeilen"])
X.reset(); X.pos["BTCUSDT"] = -0.01; X.fut = 2000.0; d = neu_buch(); r = lauf([E("BTC", 0.5)], TEST, d)
pruefe("Startprüfung Testnetz: alte Position → kein Auftrag", not markt_orders() and r["warnung"], r["zeilen"])
X.reset(); d = neu_buch(); r = lauf([E("BTC", 0.5)], ECHT, d, trocken=True)
pruefe("Probelauf setzt keinen Start", not L.buch_lesen(d, "echt")["start"], L.buch_lesen(d, "echt"))
X.frei["BTC"] = 0.5; r = lauf([E("BTC", 0.5)], ECHT, d)
pruefe("… der echte Lauf danach prüft das Konto wieder (BTC drin → kein Start)", not markt_orders() and X.frei["BTC"] == 0.5 and r["warnung"], r["zeilen"])
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
pruefe("gestartet = Pilot-Konto gehört Pilot 2.0 (alter Pilot gesperrt), auch ohne Coins", L.hat_bestand(d))
# ── Stops ──
X.reset(); X.frei["USDT"] = 1000.0; X.fut = 20000.0; d = neu_buch(); r = lauf([E("BTC", 0.0)], TEST, d)
pruefe("Kauf gekürzt → Short ≤ gekaufte Coins (kein nackter Short)", -X.pos["BTCUSDT"] <= coins() + 1e-9, (coins(), X.pos, r["zeilen"]))
pruefe("wenig USDT: Kauf wird auf das freie USDT gekürzt (nicht abgelehnt), Ernte entsprechend kleiner", 0.0095 < coins() < 0.0101
       and X.pos["BTCUSDT"] < 0 and any("reicht nur" in z for z in r["zeilen"]), (coins(), X.pos, r["zeilen"]))
X.reset(); X.frei["USDT"] = 3.0; X.fut = 20000.0; d = neu_buch(); r = lauf([E("BTC", 0.3)], TEST, d)
pruefe("kein Spot gekauft → auch kein Ernte-Short", X.pos["BTCUSDT"] == 0, (X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); env7 = {**ECHT, "KRYPTO_PILOT2_KAPITAL": "700"}; X.frei["USDT"] = 700.0
lauf([E("BTC", 1.0)], env7, d); r = lauf([E("BTC", -1.0)], env7, d)
pruefe("Perp-Stop ≥ Short − Spot-Absicherung (Gebühren-Staub rundet nichts weg)", -X.pos["BTCUSDT"] > 0
       and algo_menge() + 1e-9 >= -X.pos["BTCUSDT"] - coins(), (X.pos, coins(), X.algos, r["zeilen"]))
X.reset(algo_antwort_weg=True); d = neu_buch(); lauf([E("BTC", -0.5)], ECHT, d); vor = len(X.algos); r = lauf([E("BTC", -0.5)], ECHT, d)
pruefe("verlorene Perp-Stop-Antwort → danach genau EIN Stop", vor == 1 and len(X.algos) == 1, (vor, X.algos, r["zeilen"]))
X.reset(stop_antwort_weg=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); vor = len(stops_offen()); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("verlorene Spot-Stop-Antwort → danach genau EIN Stop, und zwar der im Buch, über den ganzen Bestand", vor == 1 and len(stops_offen()) == 1
       and stops_offen()[0]["id"] == L.buch_lesen(d, "testnetz")["stops"]["BTC"]["spot"] and abs(stops_offen()[0]["qty"] - coins()) < 2e-5,
       (vor, stops_offen(), r["zeilen"]))
X.reset(stop_antwort_weg=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); r = lauf([E("BTC", 0.5)], TEST, d)
pruefe("verwaister Spot-Stop mit alter (zu grosser) Menge wird ersetzt", len(stops_offen()) == 1 and abs(stops_offen()[0]["qty"] - coins()) < 2e-5, (stops_offen(), coins()))
X.reset(algo_antwort_weg=True); d = neu_buch(); lauf([E("BTC", -1.0)], ECHT, d); r = lauf([E("BTC", -0.5)], ECHT, d)
pruefe("verwaister Perp-Stop mit alter (zu grosser) Menge wird ersetzt", len(X.algos) == 1 and abs(algo_menge() + netto_btc()) < 0.0011, (X.algos, X.pos))
X.reset(); d = neu_buch(); lauf([E("BTC", -1.0)], ECHT, d); X.algo_del_fehler = True
e2 = E("BTC", -1.0); e2["stop_short"] = 108000.0
r = lauf([e2], ECHT, d)
pruefe("alter Perp-Stop nicht löschbar (neuer Stop-Kurs) → der neue steht trotzdem (erst setzen, dann löschen), laute Meldung "
       "«zwei Stops»", len(X.algos) == 2 and any(float(a["triggerPrice"]) == 108000.0 for a in X.algos.values())
       and any("zwei Stops" in z for z in r["zeilen"]) and r["warnung"], (X.algos, r["zeilen"]))
X.algo_del_fehler = False
r = lauf([e2], ECHT, d)
pruefe("… der nächste Lauf räumt auf: nur noch der neue", len(X.algos) == 1 and float(list(X.algos.values())[0]["triggerPrice"]) == 108000.0,
       (X.algos, r["zeilen"]))
X.algo_del_fehler = False
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.spot_del_fehler = True
e2 = E("BTC", 1.0); e2["stop_long"] = 92000.0
r = lauf([e2], TEST, d)
pruefe("alter Spot-Stop nicht löschbar (neuer Stop-Kurs) → kein zweiter, Meldung, Buch kennt ihn", len(stops_offen()) == 1
       and any("Spot-Stop ist noch offen" in z or "bisherige bleibt stehen" in z for z in r["zeilen"])
       and L.buch_lesen(d, "testnetz")["stops"]["BTC"]["spot"] == stops_offen()[0]["id"],
       (stops_offen(), r["zeilen"]))
X.spot_del_fehler = False
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.algo_liste_fehler = True
r = lauf([E("BTC", 1.0)], TEST, d); X.algo_liste_fehler = False
pruefe("Futures-Liste nicht lesbar → Spot-Stop trotzdem da (genau einer), keine falsche «bleibt aktiv»-Meldung", len(stops_offen()) == 1
       and abs(stops_offen()[0]["qty"] - coins()) < 2e-5 and not any("bleibt aktiv" in z for z in r["zeilen"]), (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.spot_del_antwort_weg = True
e2 = E("BTC", 1.0); e2["stop_long"] = 92000.0
r = lauf([e2], TEST, d)
pruefe("Storno-Antwort verloren → Long hat danach genau einen Stop, zum neuen Kurs", len(stops_offen()) == 1
       and stops_offen()[0]["stop"] == 92000.0, (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); n0 = len(X.log); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("passender Stop bleibt stehen: kein Storno, kein neuer Stop (nie ersatzlos löschen)", len(stops_offen()) == 1
       and not [x for x in X.log[n0:] if x[0] in ("POST", "DELETE")] and any("bleibt" in z for z in r["zeilen"]),
       ([x[:2] for x in X.log[n0:] if x[0] in ("POST", "DELETE")], r["zeilen"]))
e2 = E("BTC", 1.0); e2["stop_long"] = 93000.0; r = lauf([e2], TEST, d)
pruefe("Stop-Kurs nachgezogen → alter weg, neuer da (genau einer)", len(stops_offen()) == 1 and stops_offen()[0]["stop"] == 93000.0,
       (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
for o in stops_offen(): o["status"] = "CANCELED"; X.gesperrt["BTC"] -= o["qty"]; X.frei["BTC"] += o["qty"]
X.next_id += 1; X.orders[X.next_id] = {"id": X.next_id, "symbol": "BTCUSDT", "qty": 0.05, "stop": 1.0, "status": "NEW", "typ": "STOP_LOSS", "cid": "web"}
X.frei["BTC"] -= 0.05; X.gesperrt["BTC"] += 0.05
r = lauf([E("BTC", 1.0)], TEST, d)
eigene = [o for o in stops_offen() if o.get("cid", "").startswith("p2s")]
pruefe("Coins durch einen Auftrag ausserhalb der Liste gesperrt → gilt als Stop, neuer Stop nur über den Rest (nie doppelt) + laute Warnung",
       eigene and abs(eigene[0]["qty"] - (coins() - 0.05)) < 2e-5 and any("nicht in der Auftragsliste" in z for z in r["zeilen"]),
       (eigene, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte mit Gebühren-Staub → kein Perp-Stop", not X.algos, X.algos)
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte-Short mit CROSS-Marge (Puffer im Futures-Konto schützt)", X.marge.get("BTCUSDT") == "CROSSED", X.marge)
X.reset(); d = neu_buch(); env1k = {**ECHT, "KI_BOT_MAX_AUFTRAG": "1000"}
for _ in range(5): lauf([E("BTC", -0.4)], env1k, d)
r = lauf([E("BTC", 1.0)], env1k, d)
pruefe("halber Wechsel short→long, Rest netto short → Perp-Stop deckt ihn", netto_btc() < -0.005 and algo_menge() + 1e-9 >= -netto_btc(), (netto_btc(), X.algos, r["zeilen"]))
X.reset(); d = neu_buch()
for _ in range(5): lauf([E("BTC", 0.4)], {**TEST, "KI_BOT_MAX_AUFTRAG": "1000"}, d)
X.fut = 20000.0; r = lauf([E("BTC", -1.0)], {**TEST, "KI_BOT_MAX_AUFTRAG": "1000"}, d)
pruefe("halber Wechsel long→short, Rest netto long → Spot-Stop deckt ihn", netto_btc() > 0.005 and sum(o["qty"] for o in stops_offen()) + 2e-5 >= netto_btc(),
       (netto_btc(), stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.spot_sell_fehler = True
r = lauf([E("BTC", -1.0)], TEST, d); X.spot_sell_fehler = False
pruefe("Verkauf beim Wechsel abgelehnt → Long behält einen Stop", stops_offen() and abs(stops_offen()[0]["qty"] - coins()) < 2e-5, (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, d); X.spot_sell_fehler = True
r = lauf([E("BTC", 1.0)], TEST, d); X.spot_sell_fehler = False
pruefe("abgewählter Markt, Verkauf scheitert → ETH behält einen Stop zum bisherigen Stop-Kurs", stops_offen("ETHUSDT")
       and abs(stops_offen("ETHUSDT")[0]["stop"] - 3600.0) < 0.02, (stops_offen("ETHUSDT"), r["zeilen"]))
X.reset(spot_503=True, nachfrage_kaputt=True); d = neu_buch(); r = lauf([E("BTC", 1.0)], ECHT, d)
pruefe("unklarer Kauf (echt) → die gekauften Coins haben einen Stop", coins() > 0.05 and stops_offen() and abs(stops_offen()[0]["qty"] - coins()) < 2e-5,
       (coins(), stops_offen(), r["zeilen"]))
X.reset(); X.fut = 20000.0; d = neu_buch(); lauf([E("BTC", -0.5)], TEST, d)
X.spot_503 = True; X.nachfrage_kaputt = True; r = lauf([E("BTC", 0.0)], TEST, d)
pruefe("unklarer Ernte-Kauf → beidseitig gesichert: Spot-Stop über alle Coins, Perp-Stop über den ganzen Short",
       stops_offen() and abs(sum(o["qty"] for o in stops_offen()) - coins()) < 2e-5 and algo_menge() >= -X.pos["BTCUSDT"] - 1e-9,
       (coins(), X.pos, X.algos, r["zeilen"]))
# ── 7. Prüfung: Not-Aus darf nie ein Long ohne Absicherung UND ohne Stop hinterlassen (B1) ──
def gestoppt(sym="BTCUSDT"): return sum(o["qty"] for o in stops_offen(sym))
for name, stoerung in (("Verkauf abgelehnt (Filter)", {"spot_sell_fehler": True}), ("Verkauf: Rate-Limit 429", {"spot_sell_429": True})):
    for z in (0.0, 0.5):
        X.reset(); d = neu_buch(); lauf([E("BTC", z)], ECHT, d)
        for k_, v_ in stoerung.items(): setattr(X, k_, v_)
        r = lauf([], ECHT, d, notaus=True)
        for k_ in stoerung: setattr(X, k_, False)
        pruefe(f"Not-Aus, {name}, Richtung {z}: Verkaufen geht nicht → das Paar (Coins + Short) bleibt abgesichert stehen, nie ein "
               "Bein allein; was netto ungesichert ist, steht unter Stop; nicht «alles zu» (10. Prüfung B1)",
               -X.pos["BTCUSDT"] - coins() < 0.0005 and max(0.0, coins() + X.pos["BTCUSDT"]) <= gestoppt() + 2e-5
               and coins() > 0.01 and r["alles_zu"] is False and any("Paar" in x for x in r["zeilen"]),
               (coins(), gestoppt(), X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); X.teil = 0.5
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus: Verkauf nur teilweise ausgeführt (EXPIRED) → Rest im nächsten Versuch verkauft, «alles zu»",
       coins() * 100000 < 5 and X.pos["BTCUSDT"] == 0 and r["alles_zu"] is True, (coins(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.pos_fehler_ab = X.n_pos + 2
r = lauf([], ECHT, d, notaus=True); X.pos_fehler_ab = None
pruefe("Not-Aus: Position nach dem Schliessen nicht lesbar, Antwort «ganz ausgeführt» → Spot trotzdem verkauft (nichts ungesichert)",
       X.pos["BTCUSDT"] == 0 and coins() * 100000 < 5 and r["alles_zu"] is False, (coins(), X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); vor = (coins(), X.pos["BTCUSDT"], gestoppt()); X.pos_fehler_ab = X.n_pos + 1
n0 = len(schreib_auftraege()); r = lauf([], ECHT, d, notaus=True); X.pos_fehler_ab = None
pruefe("Not-Aus: Position von Anfang an nicht lesbar → NICHTS angefasst (Absicherung und Stop bleiben)", len(schreib_auftraege()) == n0
       and (coins(), X.pos["BTCUSDT"], gestoppt()) == vor and r["alles_zu"] is False, (vor, schreib_auftraege()[n0:], r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); X.konto_fehler_ab = X.n_konto + 3
r = lauf([], ECHT, d, notaus=True); X.konto_fehler_ab = None
pruefe("Not-Aus: Spot-Konto nach dem Lesen nicht mehr lesbar → verkauft nach dem zuletzt bekannten Stand, nie ein Bein allein, "
       "nichts bleibt ungesichert", -X.pos["BTCUSDT"] - coins() < 0.0005 and max(0.0, coins() + X.pos["BTCUSDT"]) <= gestoppt() + 2e-5
       and r["alles_zu"] is False, (coins(), gestoppt(), X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.spot_sell_fehler = True; X.konto_fehler_ab = X.n_konto + 3
r = lauf([], ECHT, d, notaus=True); X.spot_sell_fehler = False; X.konto_fehler_ab = None
pruefe("Not-Aus: Verkauf abgelehnt UND Konto nicht lesbar → Paar bleibt, Schutz-Stop nach dem zuletzt bekannten Stand",
       -X.pos["BTCUSDT"] - coins() < 0.0005 and max(0.0, coins() + X.pos["BTCUSDT"]) <= gestoppt() + 2e-5 and coins() > 0.01,
       (coins(), gestoppt(), X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); vor = (coins(), X.pos["BTCUSDT"], gestoppt()); X.konto_fehler_ab = X.n_konto + 2
n0 = len(schreib_auftraege()); r = lauf([], ECHT, d, notaus=True); X.konto_fehler_ab = None
pruefe("Not-Aus: Spot-Konto von Anfang an nicht lesbar → auch den Short NICHT schliessen (Absicherung bleibt)", len(schreib_auftraege()) == n0
       and (coins(), X.pos["BTCUSDT"], gestoppt()) == vor and r["alles_zu"] is False, (vor, schreib_auftraege()[n0:], r["zeilen"]))
for name, attr, nr in (("Spot-Konto", "konto", 2), ("Futures-Position", "pos", 1)):  # nr: welche Abfrage im Not-Aus (Konto: 1 = UID)
    X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d)
    setattr(X, attr + "_fehler_ab", getattr(X, "n_" + attr) + nr); setattr(X, attr + "_fehler_anzahl", 1)
    r = lauf([], ECHT, d, notaus=True)
    pruefe(f"Not-Aus: {name} einmal kurz nicht erreichbar (503) → Wiederholung, trotzdem alles zu", r["alles_zu"] is True
           and coins() * 100000 < 5 and X.pos["BTCUSDT"] == 0, (coins(), X.pos, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); X.spot_sell_429 = 1
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus: Verkauf einmal Rate-Limit (429) → nach kurzer Pause verkauft, alles zu", r["alles_zu"] is True and coins() * 100000 < 5,
       (coins(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus ohne Störung: weiterhin «alles zu», kein Schutz-Stop nötig", r["alles_zu"] is True and not stops_offen() and not X.algos, r["zeilen"])
# ── Stops: nie ersatzlos weg, Kurs schon jenseits des Stops (W1) ──
X.reset(); d = neu_buch()
def sturz():
    if X.frei["BTC"] > 0: X.kurs["BTCUSDT"] = 89000.0; X.nach_order = None
X.nach_order = sturz; r = lauf([E("BTC", 1.0)], TEST, d); X.nach_order = None
pruefe("Kurs fällt im Lauf unter den Stop → wie ein ausgelöster Stop sofort verkauft (nicht stundenlang ohne Stop)",
       coins() * X.kurs["BTCUSDT"] < 5 and any("unter dem Stop" in z for z in r["zeilen"]), (coins(), stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); X.spot_sell_fehler = True
def sturz2():
    if X.frei["BTC"] > 0: X.kurs["BTCUSDT"] = 89000.0; X.nach_order = None
X.nach_order = sturz2; r = lauf([E("BTC", 1.0)], TEST, d); X.nach_order = None; X.spot_sell_fehler = False
st = stops_offen()
pruefe("… und lässt sich nicht verkaufen → Not-Stop 5 % unter dem frischen Kurs", st and abs(st[0]["stop"] - 89000 * 0.95) < 1
       and abs(st[0]["qty"] - coins()) < 2e-5, (st, r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", -0.5)], ECHT, d)
def anstieg():
    X.kurs["BTCUSDT"] = 111000.0
e2 = E("BTC", -0.5); e2["stop_short"] = 110000.0; X.nach_order = None
X.kurs["BTCUSDT"] = 111000.0; r = lauf([e2], ECHT, d)
pruefe("Kurs schon über dem Short-Stop → Richtungs-Short sofort zurückgekauft, Ernte bleibt abgesichert", abs(netto_btc()) * 111000 < 120
       and any("über dem Stop" in z for z in r["zeilen"]), (netto_btc(), X.pos, coins(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
def sprung():
    X.kurs["BTCUSDT"] = 89000.0; X.vor_stop = None
e2 = E("BTC", 1.0); e2["stop_long"] = 92000.0; X.vor_stop = sprung; r = lauf([e2], TEST, d); X.vor_stop = None
pruefe("Kurs springt genau beim Stop-Setzen unter den Stop (Binance −2010 «würde sofort auslösen») → sofort verkauft",
       coins() * X.kurs["BTCUSDT"] < 5 and any("würde sofort auslösen" in z or "schon unter dem Stop" in z for z in r["zeilen"]),
       (coins(), stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", -1.0)], ECHT, d)
def sprung_hoch():
    X.kurs["BTCUSDT"] = 109000.0; X.vor_stop = None
e2 = E("BTC", -1.0); e2["stop_short"] = 108000.0; X.vor_stop = sprung_hoch; r = lauf([e2], ECHT, d); X.vor_stop = None
pruefe("Kurs springt beim Perp-Stop über den Auslöser (−2021) → Short sofort zurückgekauft", abs(X.pos["BTCUSDT"]) < 1e-9
       and any("würde sofort auslösen" in z for z in r["zeilen"]), (X.pos, X.algos, r["zeilen"]))
erfasst = []
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); X.konto_fehler_ab = X.n_konto + 2
try:
    r = L.ausfuehren([E("BTC", 0.0)], env=ECHT, bestand_datei=d, protokolliere=erfasst.append)
except Exception as ex:  # noqa: BLE001
    r = {"zeilen": [f"AUSNAHME {ex!r}"], "auftraege": [], "warnung": False}
X.konto_fehler_ab = None
pruefe("Konto fällt mitten im Lauf aus (nach einem Verkauf) → keine Ausnahme: Meldungen + Aufträge bleiben, Protokoll geschrieben",
       r["warnung"] and r["auftraege"] and erfasst and any("unterbrochen" in z for z in r["zeilen"]), (r["zeilen"], erfasst))
# ── Pfand nach Eigenkapital (W2) ──
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.kurs["BTCUSDT"] = 200000.0; r = lauf([E("BTC", 0.0)], ECHT, d)
ek = X.fut + X.upnl(); vol = -X.pos["BTCUSDT"] * X.kurs["BTCUSDT"]
pruefe("Kurs verdoppelt → Pfand nach dem Eigenkapital (offene Verluste zählen) wieder auf ≥ 105 % des Shorts", vol > 0 and ek / vol >= 1.05,
       (round(ek, 2), round(vol, 2), r["zeilen"]))
# ── nie still unverwaltet (W3), Start gespeichert (W6) ──
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], ECHT, d); n0 = len(markt_orders())
r = lauf([E("BTC", 0.5)], {**TEST, **{k: v for k, v in ECHT.items() if k.startswith("PILOT2_")}}, d)
pruefe("echt gestartet, Schalter auf Testnetz → laute Warnung, KEIN zweiter Modus gestartet", r["warnung"] and len(markt_orders()) == n0
       and not L.buch_lesen(d, "testnetz")["start"] and any("«echt» gestartet" in z for z in r["zeilen"]), r["zeilen"])
r = lauf([E("BTC", 0.5)], {k: v for k, v in ECHT.items() if k != "PILOT2_API_KEY"}, d)
pruefe("echt gestartet, PILOT2_API_KEY fehlt → laute Warnung «NICHT verwaltet» (nicht nur eine Zeile)", r["warnung"]
       and any("NICHT verwaltet" in z for z in r["zeilen"]), r["zeilen"])
schreiben_alt = L._buch_schreiben_roh  # unterste Stelle: Lauf und Not-Aus speichern (zusammenführend) über sie
def gesperrt_(*a, **k): raise PermissionError("Datei gesperrt")
L._buch_schreiben_roh = gesperrt_
try:
    X.reset(); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
finally:
    L._buch_schreiben_roh = schreiben_alt
pruefe("Start lässt sich nicht speichern → KEIN Auftrag (sonst kennte der Not-Aus die Positionen nicht)", not markt_orders() and r["warnung"]
       and any("Start nicht gespeichert" in z for z in r["zeilen"]), r["zeilen"])
# ── Ernte zurück, nie die Richtung (W7) ──
X.reset(); X.frei["USDT"] = 3000.0; X.fut = 20000.0; d = neu_buch(); r = lauf([E("BTC", 0.5)], TEST, d)
pruefe("Testnetz Spot knapp: nur die Richtung gekauft, nichts zurückverkauft (keine tägliche Kauf-Verkauf-Schleife)", coins() > 0.02
       and not [o for o in markt_orders() if o[1] == "SELL"] and X.pos["BTCUSDT"] == 0, (coins(), markt_orders(), r["zeilen"]))
X.reset(); X.frei["USDT"] = 5050.0; X.fut = 20000.0; d = neu_buch(); r = lauf([E("BTC", 0.5)], TEST, d)
pruefe("Spot reicht knapp über die Richtung: Ernte-Rest unter dem Short-Minimum → gar nicht erst gekauft (kein Kauf-Verkauf)",
       0.0496 < coins() < 0.0498 and not [o for o in markt_orders() if o[1] == "SELL"] and X.pos["BTCUSDT"] == 0, (coins(), markt_orders(), r["zeilen"]))
X.reset(perp_fehler=True); d = neu_buch(); r = lauf([E("BTC", 0.5)], ECHT, d)
pruefe("Ernte-Short abgelehnt → nur die Ernte-Coins zurück, der Richtungs-Long bleibt (mit Stop)", 0.098 < coins() < 0.1
       and stops_offen() and abs(stops_offen()[0]["qty"] - coins()) < 2e-5, (coins(), stops_offen(), r["zeilen"]))
# ── unklare Perp-Aufträge: per Kennung klären; was offen bleibt → Markt BEIDSEITIG sichern (8. Prüfung p3/p9 + Fuzzer) ──
X.reset(perp_503="nein"); d = neu_buch(); r = lauf([E("BTC", -0.5)], ECHT, d)
b8 = L.buch_lesen(d, "echt")
q8 = b8["unklar"][0]["menge"] if b8["unklar"] else 0.0
perp8 = sum(float(a["quantity"]) for a in X.algos.values() if a["side"] == "BUY" and a.get("reduceOnly") == "true")
pruefe("Short mit unklarer Antwort (bleibt unklar) → Auftrag im Buch, laut gemeldet, BEIDE Seiten ganz gesichert: Spot-Stop über alle "
       "Coins, reduceOnly-Perp-Stop über Short + unklaren Short", len(b8["unklar"]) == 1 and b8["unklar"][0]["cid"] and r["warnung"]
       and stops_offen() and abs(sum(o["qty"] for o in stops_offen()) - coins()) < 2e-5
       and abs(perp8 - (abs(min(X.pos["BTCUSDT"], 0.0)) + q8)) < 1e-9, (X.algos, b8["unklar"], r["zeilen"]))
pruefe("… die gekauften Ernte-Coins sind ohne Short ein Long — und haben einen Stop", stops_offen() and abs(stops_offen()[0]["qty"] - coins()) < 2e-5,
       (stops_offen(), coins()))
n0 = len([o for o in markt_orders() if o[3] == "BTCUSDT"]); r = lauf([E("BTC", -0.5)], ECHT, d)
pruefe("nächster Lauf: noch unklar (jung) → Markt BTC gesperrt, kein neuer BTC-Auftrag", len([o for o in markt_orders() if o[3] == "BTCUSDT"]) == n0
       and any("noch immer unklar" in z for z in r["zeilen"]), r["zeilen"])
alter_max = L.UNKLAR_MAX_ALTER_MS; L.UNKLAR_MAX_ALTER_MS = -1
r = lauf([E("BTC", -0.5)], ECHT, d); L.UNKLAR_MAX_ALTER_MS = alter_max
pruefe("… nach 10 Minuten kennt Binance ihn immer noch nicht → «nie ausgeführt», Buch leer, Handel geht weiter",
       not L.buch_lesen(d, "echt")["unklar"] and any("nie ausgeführt" in z for z in r["zeilen"]) and X.pos["BTCUSDT"] < -0.05, (r["zeilen"], X.pos))
ungesichert8 = max(0.0, -(coins() + X.pos["BTCUSDT"]))
perp8 = sum(float(a["quantity"]) for a in X.algos.values() if a["side"] == "BUY")
pruefe("… danach wieder normale Stops: der beidseitige Perp-Stop ist weg, nur noch einer über den ungesicherten Short (Spot-Stop "
       "höchstens über den Coin-Rest unter einem Futures-Schritt)", len(X.algos) == 1 and abs(perp8 - ungesichert8) <= 0.001 + 1e-9
       and sum(o["qty"] for o in stops_offen()) < 0.001, (X.algos, ungesichert8, stops_offen()))
X.reset(perp_spaet=True); d = neu_buch(); r = lauf([E("BTC", -0.5)], ECHT, d)
pruefe("unklarer Short noch offen (NEW) → am Laufende storniert → geklärt «nie ausgeführt», nichts im Buch",
       not L.buch_lesen(d, "echt")["unklar"] and any("nie ausgeführt" in z for z in r["zeilen"]), r["zeilen"])
X.spaet_ausfuehren()
pruefe("… storniert heisst: er kommt auch später nicht mehr an", X.pos["BTCUSDT"] == 0, X.pos)
X.reset(perp_spaet=True, storno_kaputt=True); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus mit noch unklarem Auftrag → NICHT «alles zu», Buch bleibt (8. Prüfung p9)", r["alles_zu"] is False and L.hat_bestand(d)
       and any("noch unklar" in z for z in r["zeilen"]), r["zeilen"])
X.spaet_ausfuehren()  # … der Short kommt verspätet doch an
r = lauf([], ECHT, d, notaus=True)
pruefe("… der nächste Not-Aus findet den verspäteten Short über die Kennung und schliesst ihn: jetzt «alles zu»",
       r["alles_zu"] is True and X.pos["BTCUSDT"] == 0 and not L.hat_bestand(d), (X.pos, r["zeilen"]))
# ── Kleinigkeiten: Konflikte nur im selben Konto (K2), Testnetz-Adressen (K6), Hedge-Modus auch im Testnetz (K7) ──
pruefe("echt: ETH-Sparplan mit EIGENEM Schlüssel (anderes Konto) ist kein Konflikt", not L.konflikte({**ECHT, "ETH_SPARPLAN_BETRAG": "50",
       "BINANCE_API_KEY": "haupt"}, True) and L.konflikte({**ECHT, "ETH_SPARPLAN_BETRAG": "50", "BINANCE_API_KEY": "k"}, True)
       and L.konflikte({**TEST, "ETH_SPARPLAN_BETRAG": "50"}, False))
pruefe("Testnetz: auch die Spot-Adresse der Futures-Verbindung zeigt aufs Testnetz", L.einstellungen({k: v for k, v in TEST.items()
       if k != "PILOT2_SPOT_URL"})["futures"]["spot"] == L.SPOT_TEST)
X.reset(hedge=True); r = lauf([E("BTC", 1.0)], TEST, neu_buch())
pruefe("Hedge-Modus im Testnetz → kein Auftrag", not markt_orders() and r["warnung"], r["zeilen"])
X.reset(); d = neu_buch(); lauf([E("BTC", 0.5)], TEST, d)
r = lauf([], {**TEST, "BINANCE_API_SECRET": "falsch", "BINANCE_FUTURES_API_SECRET": "falsch"}, d, notaus=True)
pruefe("Testnetz-Buch, Schlüssel passen nicht mehr (z. B. echte in BINANCE_*) → Testnetz-Stand verworfen, sperrt nichts mehr",
       not L.hat_bestand(d) and any("verworfen" in z for z in r["zeilen"]), r["zeilen"])
# ── Bot-Schalter + alter Pilot + schliessen_alle (Cockpit/Telegram/stop.bat) ──
import pilot as PI  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ki_bot"))
import signale as SG  # noqa: E402
SG.push = lambda *a, **k: None  # der Selbsttest läuft täglich auf dem PC → nie eine echte Nachricht senden
PI.LOGBUCH = tmp / "pilot-log.json"; L.BESTAND = tmp / "schalter.json"; L.PROTOKOLL = tmp / "protokoll.json"
alt = dict(os.environ)
voll = dict(E("BTC", 1.0), symbol="BTCUSDT", kurs=100000.0, schnitt=90000.0, trend_tage=150, schwankung=0.4,
            mvrv={"tag": "2026-10-12", "wert": 2.0}, bremse=None, detektor={"ok": True, "skill_2j": 0.8, "einbruch_1j": -0.2})
nur_p2 = {k: v for k, v in ECHT.items() if k.startswith("PILOT2_")}
try:
    # nur die Test-Werte: Schalter vom PC (ETH-Sparplan, Calls, Echtgeld …) dürfen den Selbsttest nicht beeinflussen
    os.environ.clear(); os.environ.update({k: v for k, v in alt.items() if k.upper() in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "USERPROFILE")})
    os.environ.update(TEST); X.reset()
    PI.handeln([voll], "Lage", trocken=False)
    pruefe("KRYPTO_PILOT2=an: Bot kauft über Spot, kein Futures-Auftrag", any(o[0] == "/api/v3/order" for o in markt_orders()) and not X.pos["BTCUSDT"])
    os.environ.pop("KRYPTO_PILOT2")
    pruefe("Pilot 2.0 aus, aber gestartet → alter Pilot handelt nicht", PI.handeln([voll], "Lage", trocken=True) == 3 and L.hat_bestand())
    def alter_pilot(e, symbol, gewicht):  # alter Pilot im selben (Testnetz-)Konto: nach dem P2-Not-Aus leer
        e["broker"] = {"position": X.pos[symbol]}; return []
    zu, zeilen = PI.schliessen_alle(alter_pilot)
    pruefe("Cockpit/Telegram-Not-Aus (schliessen_alle) schliesst Pilot 2.0", zu and coins() * 100000 < 5, zeilen)
    def anderes_konto(e, symbol, gewicht):  # alter Pilot in seinem eigenen (leeren) Konto
        e["broker"] = {"position": 0.0}; return []
    X.reset(); lauf([E("BTC", 0.0)], ECHT, L.BESTAND); X.perp_reduce_fehler = True
    zu, zeilen = PI.schliessen_alle(anderes_konto, env=nur_p2)
    pruefe("schliessen_alle: Pilot 2.0 nicht ganz zu → NICHT «alles zu»", zu is False and X.pos["BTCUSDT"] < 0, zeilen)
    X.perp_reduce_fehler = False; X.uid = 999; n0 = len(schreib_auftraege())
    zu, zeilen = PI.schliessen_alle(anderes_konto, env=nur_p2)
    pruefe("schliessen_alle mit Schlüssel eines anderen Kontos → nichts angefasst, NICHT «alles zu»", zu is False
           and len(schreib_auftraege()) == n0 and X.pos["BTCUSDT"] < 0, zeilen)
    X.uid = 4711
    zu, zeilen = PI.schliessen_alle(alter_pilot, env=nur_p2)
    pruefe("schliessen_alle: mit dem richtigen Schlüssel schliesst es", zu is True and X.pos["BTCUSDT"] == 0, zeilen)
    L.BESTAND.write_text("{kaputt")
    zu, zeilen = PI.schliessen_alle(anderes_konto, env=nur_p2)
    pruefe("schliessen_alle bei kaputtem Buch: nicht «alles zu» UND die Erklärung steht in der Meldung", zu is False
           and any("unlesbar" in z for z in zeilen), zeilen)
    aufrufe = []
    def alt_anders(e, symbol, gewicht):  # alter Pilot mit echtem Geld in SEINEM Konto (anderer Schlüssel als Pilot 2.0)
        aufrufe.append(symbol); e["broker"] = {"position": 0.0}; return []
    env_w5 = {**nur_p2, "BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD", "BINANCE_FUTURES_API_KEY": "anderer"}
    zu, zeilen = PI.schliessen_alle(alt_anders, env=env_w5)
    pruefe("kaputtes Pilot-2.0-Buch, alter Pilot in einem ANDEREN Konto → der alte Pilot wird trotzdem geschlossen (beschriftet)",
           sorted(aufrufe) == ["BTCUSDT", "ETHUSDT"] and zu is False and any("(alter Pilot)" in z for z in zeilen), (aufrufe, zeilen))
    L.BESTAND.unlink()
    pruefe("teilt_konto: echt nur mit demselben Schlüssel, Testnetz mit Testnetz", PI.teilt_konto({**ECHT, "BINANCE_FUTURES_API_KEY": "k"}, "echt")
           and not PI.teilt_konto({**ECHT, "BINANCE_FUTURES_API_KEY": "anders"}, "echt") and PI.teilt_konto(TEST, "testnetz")
           and not PI.teilt_konto(ECHT, "testnetz"))
    X.reset(); X.pos["BTCUSDT"] = 0.01
    env_alt = {**ECHT, "BINANCE_FUTURES_API_KEY": "alt", "BINANCE_FUTURES_API_SECRET": GEHEIM, "BINANCE_FUTURES_URL": url}
    pruefe("alter Pilot (eigenes Konto) mit offener Position wird gefunden; im selben Konto zählt sie als Pilot 2.0",
           PI.alter_pilot_offen(env_alt) == (["BTC +0.01"], None) and PI.alter_pilot_offen({**env_alt, "BINANCE_FUTURES_API_KEY": "k"}) == ([], None),
           PI.alter_pilot_offen(env_alt))
    X.reset(); os.environ.update(TEST)
    rc = PI.handeln2([voll], "Lage", trocken=False, alt_offen=["BTC +0.01"])
    pruefe("alter Pilot hat noch Positionen → Pilot 2.0 startet nicht (laute Warnung), sonst verwaiste der alte Pilot", rc == 3
           and not markt_orders() and not L.hat_bestand())
    lb_w = {"kontostand": [{"tag": "2026-10-01", "kapital": 100.0, "modus": "pilot2-echt"}, {"tag": "2026-10-13", "kapital": 110.0, "modus": "pilot2-echt"}]}
    pruefe("Wochenbericht nennt das Echtgeld-Unterkonto richtig («Pilot 2.0, Echtgeld», nicht «Testnetz»)",
           "Konto (Pilot 2.0, Echtgeld)" in (PI.wochenbericht(lb_w, "2026-10-13", erzwingen=True) or ""))
finally:
    os.environ.clear(); os.environ.update(alt)
X.reset(ersetzen_fehlt=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
e2 = E("BTC", 1.0); e2["stop_long"] = 93000.0; r = lauf([e2], TEST, d)
pruefe("Binance kennt cancelReplace nicht (404) → Stop-Nachzug wie früher (stornieren, dann neu): genau ein Stop, neuer Kurs",
       len(stops_offen()) == 1 and stops_offen()[0]["stop"] == 93000.0, (stops_offen(), r["zeilen"]))
r = lauf([], TEST, d, notaus=True)
pruefe("… und der Not-Aus verkauft trotzdem alles (stornieren, dann verkaufen)", r["alles_zu"] is True and coins() * 100000 < 5, r["zeilen"])
X.reset(spot_sell_fehler=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); vor = stops_offen()
r = lauf([], TEST, d, notaus=True)
pruefe("Not-Aus, reiner Long, Verkauf abgelehnt (PERCENT_PRICE) → Stop und Verkauf in EINER Anfrage: der Stop bleibt stehen",
       len(stops_offen()) == 1 and vor and stops_offen()[0]["id"] == vor[0]["id"] and r["alles_zu"] is False, (vor, stops_offen(), r["zeilen"]))
pruefe("Sperre: ohne FREIGEGEBEN ist KRYPTO_PILOT2=an wirkungslos", SPERRE_WIRKT)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
