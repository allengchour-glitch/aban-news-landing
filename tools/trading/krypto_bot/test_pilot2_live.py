#!/usr/bin/env python3
"""Tests Pilot-2.0-Ausführung gegen eine nachgebaute Binance (Spot + Futures + Verschieben), ohne Netz.
    python3 tools/trading/krypto_bot/test_pilot2_live.py"""
import hashlib, hmac, json, sys, tempfile, threading, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import broker_futures as BF  # noqa: E402
import pilot2_live as L  # noqa: E402
BF.NACHFRAGE_WARTEN = (0.0, 0.0, 0.0)
GEHEIM = "geheim"
n_ok = n_f = 0
def pruefe(name, c, info=""):
    global n_ok, n_f
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}")); n_ok += c; n_f += not c

class X(BaseHTTPRequestHandler):
    kurs = {"BTCUSDT": 100000.0, "ETHUSDT": 4000.0}
    def reset(**k):
        X.spot = {"USDT": 20000.0, "BTC": 0.0, "ETH": 0.0}; X.fut = 0.0; X.pos = {"BTCUSDT": 0.0, "ETHUSDT": 0.0}
        X.log = []; X.spot_stops = []; X.algos = []; X.cids = {}; X.rechte = {"enableWithdrawals": False, "enableMargin": False,
            "enableInternalTransfer": False, "enableSpotAndMarginTrading": True, "enableFutures": True, "permitsUniversalTransfer": True}
        X.perp_fehler = False; X.spot_503 = False; X.hedge = False
        for a, b in k.items(): setattr(X, a, b)
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
        if pfad == "/api/v3/account": return self._a({"balances": [{"asset": k, "free": str(v), "locked": "0"} for k, v in X.spot.items()]})
        if pfad == "/api/v3/ticker/price": return self._a({"price": str(X.kurs[p["symbol"]])})
        if pfad == "/api/v3/exchangeInfo":
            step = "0.00001" if p["symbol"] == "BTCUSDT" else "0.0001"
            return self._a({"symbols": [{"symbol": p["symbol"], "filters": [{"filterType": "LOT_SIZE", "stepSize": step},
                {"filterType": "PRICE_FILTER", "tickSize": "0.01"}, {"filterType": "NOTIONAL", "minNotional": "5"}]}]})
        if pfad == "/api/v3/openOrders" and m == "DELETE":
            if not any(o["symbol"] == p["symbol"] for o in X.spot_stops): return self._a({"code": -2011, "msg": "Unknown order sent."}, 400)
            X.spot_stops = [o for o in X.spot_stops if o["symbol"] != p["symbol"]]; return self._a([])
        if pfad == "/api/v3/order" and m == "GET":
            st = X.cids.get(p.get("origClientOrderId")); return self._a({"status": st, "executedQty": "0"}) if st else self._a({"code": -2013}, 400)
        if pfad == "/api/v3/order" and p.get("type") == "STOP_LOSS_LIMIT":
            X.spot_stops.append(p); return self._a({"orderId": 9})
        if pfad == "/api/v3/order" and p.get("type") == "MARKET":
            coin = p["symbol"].replace("USDT", ""); q = float(p["quantity"]); wert = q * X.kurs[p["symbol"]]
            if p["side"] == "BUY":
                if X.spot["USDT"] < wert: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                X.spot["USDT"] -= wert; X.spot[coin] += q
            else:
                if X.spot[coin] < q - 1e-12: return self._a({"code": -2010, "msg": "insufficient"}, 400)
                X.spot["USDT"] += wert; X.spot[coin] -= q
            X.cids[p["newClientOrderId"]] = "FILLED"
            if X.spot_503: X.spot_503 = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"status": "FILLED", "executedQty": p["quantity"]})
        if pfad == "/sapi/v1/asset/transfer":
            b = float(p["amount"])
            if p["type"] == "MAIN_UMFUTURE": X.spot["USDT"] -= b; X.fut += b
            else: X.fut -= b; X.spot["USDT"] += b
            return self._a({"tranId": 1})
        if pfad == "/fapi/v1/positionSide/dual": return self._a({"dualSidePosition": X.hedge})
        if pfad == "/fapi/v2/account": return self._a({"totalWalletBalance": str(X.fut), "totalUnrealizedProfit": "0", "maxWithdrawAmount": str(X.fut)})
        if pfad == "/fapi/v2/positionRisk": return self._a([{"symbol": p["symbol"], "positionAmt": str(X.pos[p["symbol"]])}])
        if pfad == "/fapi/v1/exchangeInfo":
            f = [{"filterType": "LOT_SIZE", "stepSize": "0.001", "minQty": "0.001"}, {"filterType": "PRICE_FILTER", "tickSize": "0.10"},
                 {"filterType": "MIN_NOTIONAL", "notional": "20"}]
            return self._a({"symbols": [{"symbol": s, "status": "TRADING", "filters": f} for s in ("BTCUSDT", "ETHUSDT")]})
        if pfad == "/fapi/v1/marginType": return self._a({"code": -4046, "msg": "No need to change margin type."}, 400)
        if pfad == "/fapi/v1/order" and p.get("type") == "MARKET":
            if X.perp_fehler and p["side"] == "SELL" and not p.get("reduceOnly"): return self._a({"code": -2019, "msg": "Margin is insufficient."}, 400)
            q = float(p["quantity"]) * (1 if p["side"] == "BUY" else -1)
            X.pos[p["symbol"]] = round(X.pos[p["symbol"]] + q, 6); X.cids[p["newClientOrderId"]] = "FILLED"
            return self._a({"status": "FILLED", "executedQty": p["quantity"]})
        if pfad == "/fapi/v1/algoOrder":
            X.algos.append(p); return self._a({"algoId": 5})
        if pfad == "/fapi/v1/openAlgoOrders": return self._a([])
        if pfad in ("/fapi/v1/algoOpenOrders", "/fapi/v1/allOpenOrders") and m == "DELETE":
            X.algos = [a for a in X.algos if a["symbol"] != p["symbol"]]; return self._a({"code": 200})
        return self._a({})
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
        "KI_BOT_MAX_AUFTRAG": "100000", "KRYPTO_PILOT2_KAPITAL": "10000"}
E = lambda m, h: {"markt": m, "hebel": h, "stop_long": X.kurs[m + "USDT"] * 0.9, "stop_short": X.kurs[m + "USDT"] * 1.1, "stand": "2026-10-13"}
tmp = Path(tempfile.mkdtemp())
def lauf(ents, env, trocken=False, datei="b.json"):
    return L.ausfuehren(ents, trocken=trocken, env=env, bestand_datei=tmp / datei)
def orders(): return [(x[1], x[2].get("side"), x[2].get("quantity"), x[2].get("type")) for x in X.log if x[1] in ("/api/v3/order", "/fapi/v1/order") and x[0] == "POST"]

# 1. Echtgeld-Schalter: nur mit ALLEN Freigaben echt
pruefe("Echtgeld nur mit allen Freigaben", L.einstellungen(ECHT)["echtgeld"] and not L.einstellungen({**ECHT, "KRYPTO_PILOT2": ""})["echtgeld"]
       and not L.einstellungen({**ECHT, "BINANCE_FUTURES_TESTNET": "true"})["echtgeld"] and not L.einstellungen({**ECHT, "KI_BOT_ECHTGELD": "ja"})["echtgeld"])
pruefe("fremde Adresse im Echtgeld-Modus wird abgelehnt", L.einstellungen({**ECHT, "PILOT2_SPOT_URL": "https://boese.example"})["fehler"] != "")
# 2. Trockenlauf: keine Aufträge, kein Verschieben
X.reset(); r = lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, trocken=True)
pruefe("trocken: nichts gesendet", not orders() and not [x for x in X.log if x[1] == "/sapi/v1/asset/transfer"], orders())
# 3. Testnetz, voll long: nur Spot kaufen, Spot-Stops auf die ganze Richtung, kein Perp, Buch geführt
X.reset(); r = lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST)
o = [x for x in orders() if x[3] == "MARKET"]
pruefe("voll long = nur Spot-Käufe (je 5000 USDT)", sorted(o) == sorted([("/api/v3/order", "BUY", "0.05", "MARKET"), ("/api/v3/order", "BUY", "1.25", "MARKET")]), o)
pruefe("Spot-Stops (Stop-Limit) auf die Richtungsmenge", sorted(s["quantity"] for s in X.spot_stops) == ["0.05", "1.25"]
       and all(s["type"] == "STOP_LOSS_LIMIT" for s in X.spot_stops), X.spot_stops)
pruefe("Buch: eigene Coins gemerkt", L.bestand_lesen(tmp / "b.json", "testnetz") == {"BTC": 0.05, "ETH": 1.25}, L.bestand_lesen(tmp / "b.json", "testnetz"))
pruefe("kein Fehler, keine Warnung", not r["warnung"], r["zeilen"])
# 4. Echtgeld, Ernte (z=0): Geld verschoben, Spot und Short GLEICH gross, kein Stop
X.reset(); r = lauf([E("BTC", 0.0)], ECHT, datei="e.json")
tr = [x[2] for x in X.log if x[1] == "/sapi/v1/asset/transfer"]
pruefe("Pfand (5000 + 10 % Puffer) ins Futures-Konto verschoben", tr and tr[0]["type"] == "MAIN_UMFUTURE" and abs(X.fut - 5500) < 1e-6, (tr, X.fut))
pruefe("Ernte marktneutral: Spot 0.05 = −Short, Kapital vollständig belegt", X.spot["BTC"] == 0.05 and X.pos["BTCUSDT"] == -0.05 and abs(X.spot["USDT"] - 9500) < 1e-6, (X.spot, X.pos))
pruefe("Ernte: kein Stop", not X.spot_stops and not X.algos, (X.spot_stops, X.algos))
pruefe("Reihenfolge: erst Spot, dann Short", [k[0] for k in orders() if k[3] == "MARKET"] == ["/api/v3/order", "/fapi/v1/order"], orders())
# 5. Wechsel auf voll short: Spot (nur eigene) verkauft, Short vergrössert, Stop mit Menge + reduceOnly (nicht closePosition)
X.log = []; r = lauf([E("BTC", -1.0)], ECHT, datei="e.json")
pruefe("voll short: Spot leer, Short 0.1 (Basis 10000)", X.spot["BTC"] == 0 and X.pos["BTCUSDT"] == -0.1, (X.spot, X.pos))
st = X.algos[-1] if X.algos else {}
pruefe("Short-Stop: Menge + reduceOnly, kein closePosition", st.get("quantity") == "0.1" and st.get("reduceOnly") == "true" and "closePosition" not in st, st)
# 6. Fremde Coins im Konto bleiben unberührt (Not-Aus verkauft nur eigene)
X.reset(spot={"USDT": 20000.0, "BTC": 1.0, "ETH": 0.0}); L.bestand_schreiben(tmp / "f.json", "testnetz", {"BTC": 0.05})
r = lauf([E("BTC", 1.0)], {**TEST, "KI_BOT_STOP": "1"}, datei="f.json")
pruefe("Not-Aus: nur die 0.05 eigenen BTC verkauft, 0.95 bleiben", abs(X.spot["BTC"] - 0.95) < 1e-9, X.spot)
X.reset(spot={"USDT": 20000.0, "BTC": 1.0, "ETH": 0.0}); r = lauf([E("BTC", 1.0)], TEST, datei="leer.json")
pruefe("fremde 1 BTC zählen nicht als eigene → kauft eigene 0.1 dazu", abs(X.spot["BTC"] - 1.1) < 1e-9, (X.spot, orders()))
# 7. Anderer Bot im Konto → nichts
X.reset(); r = lauf([E("BTC", 1.0)], {**TEST, "ETH_SPARPLAN_BETRAG": "50"})
pruefe("ETH-Sparplan aktiv → kein Auftrag, Warnung", not orders() and r["warnung"], r["zeilen"])
X.reset(); r = lauf([E("BTC", 1.0)], {**TEST, "CALLS_MODUS": "echtgeld"})
pruefe("Telegram-Calls aktiv → kein Auftrag", not orders() and r["warnung"])
# 8. Echtgeld ohne Deckel / falsche Rechte → nichts
X.reset(); r = lauf([E("BTC", 1.0)], {**ECHT, "KRYPTO_PILOT2_KAPITAL": ""})
pruefe("Echtgeld ohne KRYPTO_PILOT2_KAPITAL → kein Auftrag", not orders() and r["warnung"], r["zeilen"])
X.reset(); X.rechte["enableWithdrawals"] = True; r = lauf([E("BTC", 1.0)], ECHT)
pruefe("Schlüssel mit Auszahlungsrecht → kein Auftrag", not orders() and r["warnung"])
X.reset(); X.rechte["permitsUniversalTransfer"] = False; r = lauf([E("BTC", 1.0)], ECHT)
pruefe("Schlüssel ohne Universal Transfer → kein Auftrag", not orders() and r["warnung"])
X.reset(hedge=True); r = lauf([E("BTC", 1.0)], ECHT)
pruefe("Hedge-Modus → kein Auftrag", not orders() and r["warnung"])
# 9. Short abgelehnt → Warnung, kein Absturz, Spot-Teil der Ernte bleibt (wird gemeldet)
X.reset(perp_fehler=True); r = lauf([E("BTC", 0.0)], ECHT, datei="g.json")
pruefe("Short abgelehnt → Warnung statt Absturz", r["warnung"] and any("abgelehnt" in z for z in r["zeilen"]), r["zeilen"])
# 10. Spot 503, aber ausgeführt → per Kennung nachgefragt, nicht doppelt gekauft
X.reset(spot_503=True); r = lauf([E("BTC", 1.0)], TEST, datei="h.json")
kaeufe = [x for x in orders() if x[0] == "/api/v3/order" and x[3] == "MARKET"]
pruefe("unklarer Spot-Auftrag: nachgefragt, genau EIN Kauf", len(kaeufe) == 1 and abs(X.spot["BTC"] - 0.1) < 1e-9, (kaeufe, X.spot))
# 11. Deckel: verwaltet höchstens KRYPTO_PILOT2_KAPITAL
X.reset(spot={"USDT": 100000.0, "BTC": 0.0, "ETH": 0.0}); r = lauf([E("BTC", 1.0)], {**TEST, "KRYPTO_PILOT2_KAPITAL": "2000"}, datei="i.json")
pruefe("Deckel 2000 USDT: kauft nur 0.02 BTC", abs(X.spot["BTC"] - 0.02) < 1e-9, X.spot)
# 12. Testnetz: kein Verschieben (getrennte Konten), Hinweis statt Fehler
X.reset(); r = lauf([E("BTC", 0.0)], TEST, datei="j.json")
pruefe("Testnetz: kein Verschieben, Hinweis", not [x for x in X.log if x[1] == "/sapi/v1/asset/transfer"] and any("Testnetz" in z for z in r["zeilen"]), r["zeilen"])
# 13. Schalter im Bot: KRYPTO_PILOT2=an → pilot.handeln geht über Pilot 2.0 (Spot), aus → alter Weg (Futures)
import os, pilot as PI  # noqa: E402
PI.LOGBUCH = tmp / "pilot-log.json"
alt = dict(os.environ)
try:
    os.environ.update(TEST)
    X.reset(); L.BESTAND = tmp / "schalter.json"; L.PROTOKOLL = tmp / "protokoll.json"
    voll = dict(E("BTC", 1.0), symbol="BTCUSDT", kurs=100000.0, schnitt=90000.0, trend_tage=150, schwankung=0.4,
                mvrv={"tag": "2026-10-12", "wert": 2.0}, bremse=None, detektor={"ok": True, "skill_2j": 0.8, "einbruch_1j": -0.2})
    PI.handeln([voll], "Lage", trocken=False)
    pruefe("KRYPTO_PILOT2=an: Bot kauft über Spot, kein Futures-Auftrag", any(x[0] == "/api/v3/order" and x[3] == "MARKET" for x in orders())
           and not any(x[0] == "/fapi/v1/order" for x in orders()), orders())
    os.environ.pop("KRYPTO_PILOT2")
    pruefe("ohne Schalter: Pilot 2.0 aus", not L.aktiv())
finally:
    os.environ.clear(); os.environ.update(alt)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
