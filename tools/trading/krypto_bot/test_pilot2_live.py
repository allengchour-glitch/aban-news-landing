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
        if pfad == "/api/v3/account":
            return self._a({"uid": X.uid, "balances": [{"asset": a, "free": repr(X.frei[a]), "locked": repr(X.gesperrt[a])} for a in X.frei]})
        if pfad == "/api/v3/ticker/price": return self._a({"price": repr(X.kurs[p["symbol"]])})
        if pfad == "/api/v3/exchangeInfo":
            step = "0.00001" if p["symbol"] == "BTCUSDT" else "0.0001"
            return self._a({"symbols": [{"symbol": p["symbol"], "orderTypes": ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT"],
                "filters": [{"filterType": "LOT_SIZE", "stepSize": step}, {"filterType": "PRICE_FILTER", "tickSize": "0.01"},
                            {"filterType": "NOTIONAL", "minNotional": "5"}]}]})
        if pfad == "/api/v3/openOrders":
            return self._a([{"orderId": o["id"], "clientOrderId": o.get("cid", ""), "symbol": o["symbol"], "type": o["typ"]}
                            for o in X.orders.values() if o["symbol"] == p["symbol"] and o["status"] == "NEW" and o.get("typ")])
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
            if X.stop_fehler: return self._a({"code": -1013, "msg": "Filter failure"}, 400)
            if float(p["stopPrice"]) >= X.kurs[p["symbol"]]: return self._a({"code": -2010, "msg": "Stop price would trigger immediately."}, 400)
            if X.frei[coin] < q - 1e-12: return self._a({"code": -2010, "msg": "Account has insufficient balance for requested action."}, 400)
            X.frei[coin] -= q; X.gesperrt[coin] += q; X.next_id += 1
            X.orders[X.next_id] = {"id": X.next_id, "symbol": p["symbol"], "qty": q, "stop": float(p["stopPrice"]), "status": "NEW", "typ": p["type"],
                                   "cid": p.get("newClientOrderId", "")}
            if X.stop_antwort_weg: X.stop_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"orderId": X.next_id})
        if pfad == "/api/v3/order" and p.get("type") == "MARKET":
            sym = p["symbol"]; coin = sym[:-4]; q = float(p["quantity"]); preis = X.kurs[sym]; wert = q * preis
            if p["side"] == "BUY":
                if X.frei["USDT"] < wert - 1e-9: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                geb = q * 0.001; X.frei["USDT"] -= wert; X.frei[coin] += q - geb
                fills = [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": coin}]
            else:
                if X.spot_sell_fehler: return self._a({"code": -1013, "msg": "Filter failure: PERCENT_PRICE_BY_SIDE"}, 400)
                if X.frei[coin] < q - 1e-12: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                geb = wert * 0.001; X.frei[coin] -= q; X.frei["USDT"] += wert - geb
                fills = [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": "USDT"}]
            X.next_id += 1; o = {"id": X.next_id, "symbol": sym, "status": "FILLED", "ausgefuehrt": q, "quote": wert}
            X.orders[X.next_id] = o; X.cids[p["newClientOrderId"]] = o
            if X.nach_order: X.nach_order()
            if X.spot_503: X.spot_503 = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"status": "FILLED", "executedQty": repr(q), "cummulativeQuoteQty": repr(wert), "fills": fills, "orderId": X.next_id})
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
            return self._a({"totalWalletBalance": repr(X.fut), "totalUnrealizedProfit": "0", "maxWithdrawAmount": repr(X.verfuegbar()),
                            "availableBalance": repr(X.verfuegbar())})
        if pfad == "/fapi/v2/positionRisk":
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
            X.pos[sym] = round(X.pos[sym] + q, 6); X.cids[p["newClientOrderId"]] = {"status": "FILLED"}
            if X.perp_503 == "ja" and p.get("reduceOnly") != "true": X.perp_503 = None; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            if X.nach_order: X.nach_order()
            return self._a({"status": "FILLED", "executedQty": p["quantity"]})
        if pfad == "/fapi/v1/openAlgoOrders":
            if X.algo_liste_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 503)
            return self._a([{"algoId": i, **a} for i, a in X.algos.items() if a["symbol"] == p["symbol"]])
        if pfad == "/fapi/v1/order" and m == "GET": return self._a({"code": -2013, "msg": "Order does not exist."}, 400)
        if pfad == "/fapi/v1/algoOrder" and m == "POST":
            if "closePosition" in p and "quantity" in p: return self._a({"code": -1106}, 400)
            X.next_id += 1; X.algos[X.next_id] = p
            if X.algo_antwort_weg: X.algo_antwort_weg = False; return self._a({"code": -1001, "msg": "Unknown"}, 503)
            return self._a({"algoId": X.next_id})
        if pfad == "/fapi/v1/algoOrder" and m == "DELETE":
            if X.algo_del_fehler: return self._a({"code": -1001, "msg": "Internal error"}, 500)
            if int(p["algoId"]) not in X.algos: return self._a({"code": -2011, "msg": "Unknown order"}, 400)
            del X.algos[int(p["algoId"])]; return self._a({"code": 200})
        return self._a({})
    def verfuegbar():
        return X.fut - sum(abs(X.pos[s]) * X.kurs[s] / X.hebel[s] for s in X.pos)
    def ausloesen(sym, preis):
        """Kurs ändern; Spot-Stops (SELL, Stop ≥ Kurs) und Perp-Stops (BUY, Trigger ≤ Kurs) lösen aus."""
        X.kurs[sym] = preis; coin = sym[:-4]
        for o in X.orders.values():
            if o.get("typ") in ("STOP_LOSS", "STOP_LOSS_LIMIT") and o["symbol"] == sym and o["status"] == "NEW" and preis <= o["stop"]:
                X.gesperrt[coin] -= o["qty"]; X.frei["USDT"] += o["qty"] * preis * 0.999
                o.update(status="FILLED", ausgefuehrt=o["qty"], quote=o["qty"] * preis)
        for i, a in list(X.algos.items()):
            if a["symbol"] == sym and a["side"] == "BUY" and preis >= float(a["triggerPrice"]):
                X.pos[sym] = round(X.pos[sym] + min(float(a["quantity"]), -X.pos[sym]), 6); del X.algos[i]
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
pruefe("Buch: nur Start, Konto-ID, Stop-Kennungen — kein Coin- oder USDT-Buch", set(json.loads(d.read_text())["testnetz"]) == {"start", "uid", "stops", "perp_offen"},
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
pruefe("unklarer Kauf → Not-Aus verkauft trotzdem alles (Kontostand), «alles zu» stimmt", coins() * 100000 < 5 and r["alles_zu"] is True, (X.frei, r["zeilen"]))
X.reset(perp_503="ja"); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Short-Antwort unklar, aber ausgeführt → Ernte bleibt (netto ≈ 0), als ausgeführt erkannt", coins() > 0.01
       and abs(netto_btc()) * 100000 < 15 and any("zeigt AUSGEFÜHRT" in z for z in r["zeilen"]), (X.frei, X.pos, r["zeilen"]))
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
r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("alter Perp-Stop nicht löschbar → kein zweiter, Meldung «noch offen»", len(X.algos) == 1 and any("noch offen" in z for z in r["zeilen"]), (X.algos, r["zeilen"]))
X.algo_del_fehler = False
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.spot_del_fehler = True
r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("alter Spot-Stop nicht löschbar → kein zweiter, Meldung, Buch kennt ihn", len(stops_offen()) == 1
       and any("Spot-Stop ist noch offen" in z for z in r["zeilen"]) and L.buch_lesen(d, "testnetz")["stops"]["BTC"]["spot"] == stops_offen()[0]["id"],
       (stops_offen(), r["zeilen"]))
X.spot_del_fehler = False
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.algo_liste_fehler = True
r = lauf([E("BTC", 1.0)], TEST, d); X.algo_liste_fehler = False
pruefe("Futures-Liste nicht lesbar → Spot-Stop trotzdem da (genau einer), keine falsche «bleibt aktiv»-Meldung", len(stops_offen()) == 1
       and abs(stops_offen()[0]["qty"] - coins()) < 2e-5 and not any("bleibt aktiv" in z for z in r["zeilen"]), (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); X.spot_del_antwort_weg = True
r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("Storno-Antwort verloren → Long hat danach genau einen Stop", len(stops_offen()) == 1, (stops_offen(), r["zeilen"]))
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
for o in stops_offen(): o["status"] = "CANCELED"; X.gesperrt["BTC"] -= o["qty"]; X.frei["BTC"] += o["qty"]
X.next_id += 1; X.orders[X.next_id] = {"id": X.next_id, "symbol": "BTCUSDT", "qty": 0.05, "stop": 1.0, "status": "NEW", "typ": "STOP_LOSS", "cid": "web"}
X.frei["BTC"] -= 0.05; X.gesperrt["BTC"] += 0.05
r = lauf([E("BTC", 1.0)], TEST, d)
eigene = [o for o in stops_offen() if o.get("cid", "").startswith("p2s")]
pruefe("Teil der Coins durch einen anderen Auftrag gesperrt → Stop über den freien Teil + laute Warnung", eigene
       and abs(eigene[0]["qty"] - (coins() - 0.05)) < 2e-5 and any("gegen Stop gesichert" in z for z in r["zeilen"]), (eigene, r["zeilen"]))
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
pruefe("unklarer Ernte-Kauf → Perp-Stop ≤ ungesicherter Short (Absicherung bleibt)", algo_menge() <= max(0.0, -X.pos["BTCUSDT"] - coins()) + 0.001 + 1e-9,
       (coins(), X.pos, X.algos, r["zeilen"]))
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
    L.BESTAND.unlink()
finally:
    os.environ.clear(); os.environ.update(alt)
pruefe("Sperre: ohne FREIGEGEBEN ist KRYPTO_PILOT2=an wirkungslos", SPERRE_WIRKT)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
