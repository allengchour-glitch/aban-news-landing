#!/usr/bin/env python3
"""Tests Pilot-2.0-Ausführung gegen eine STRENGE nachgebaute Binance (Spot + Futures + Verschieben), ohne Netz.
Die Börse zieht Gebühren in Coins ab, sperrt Coins für Stops, lehnt sofort auslösende Stops ab, prüft die Futures-Marge,
löst Stops wirklich aus und hält fremde Coins und fremde Aufträge im Konto.
    python3 tools/trading/krypto_bot/test_pilot2_live.py"""
import hashlib, hmac, json, os, sys, tempfile, threading, urllib.parse
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
            return self._a({"balances": [{"asset": a, "free": repr(X.frei[a]), "locked": repr(X.gesperrt[a])} for a in X.frei]})
        if pfad == "/api/v3/ticker/price": return self._a({"price": repr(X.kurs[p["symbol"]])})
        if pfad == "/api/v3/exchangeInfo":
            step = "0.00001" if p["symbol"] == "BTCUSDT" else "0.0001"
            return self._a({"symbols": [{"symbol": p["symbol"], "orderTypes": ["LIMIT", "MARKET", "STOP_LOSS", "STOP_LOSS_LIMIT"],
                "filters": [{"filterType": "LOT_SIZE", "stepSize": step}, {"filterType": "PRICE_FILTER", "tickSize": "0.01"},
                            {"filterType": "NOTIONAL", "minNotional": "5"}]}]})
        if pfad == "/api/v3/order" and m == "DELETE":
            o = X.orders.get(int(p["orderId"]))
            if not o or o["status"] != "NEW": return self._a({"code": -2011, "msg": "Unknown order sent."}, 400)
            o["status"] = "CANCELED"; coin = o["symbol"][:-4]; X.gesperrt[coin] -= o["qty"]; X.frei[coin] += o["qty"]; return self._a({"status": "CANCELED"})
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
            X.orders[X.next_id] = {"id": X.next_id, "symbol": p["symbol"], "qty": q, "stop": float(p["stopPrice"]), "status": "NEW", "typ": p["type"]}
            return self._a({"orderId": X.next_id})
        if pfad == "/api/v3/order" and p.get("type") == "MARKET":
            sym = p["symbol"]; coin = sym[:-4]; q = float(p["quantity"]); preis = X.kurs[sym]; wert = q * preis
            if p["side"] == "BUY":
                if X.frei["USDT"] < wert - 1e-9: return self._a({"code": -2010, "msg": "Account has insufficient balance"}, 400)
                geb = q * 0.001; X.frei["USDT"] -= wert; X.frei[coin] += q - geb
                fills = [{"price": repr(preis), "qty": repr(q), "commission": repr(geb), "commissionAsset": coin}]
            else:
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
        if pfad == "/fapi/v1/marginType": return self._a({"code": -4046, "msg": "No need to change margin type."}, 400)
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
            return self._a([{"algoId": i, **a} for i, a in X.algos.items() if a["symbol"] == p["symbol"]])
        if pfad == "/fapi/v1/order" and m == "GET": return self._a({"code": -2013, "msg": "Order does not exist."}, 400)
        if pfad == "/fapi/v1/algoOrder" and m == "POST":
            if "closePosition" in p and "quantity" in p: return self._a({"code": -1106}, 400)
            X.next_id += 1; X.algos[X.next_id] = p; return self._a({"algoId": X.next_id})
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
        "PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KRYPTO_PILOT2": "an", "KI_BOT_MAX_AUFTRAG": "100000", "KI_BOT_ANTEIL": "1"}
ECHT = {"PILOT2_API_KEY": "k", "PILOT2_API_SECRET": GEHEIM, "PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KRYPTO_PILOT2": "an",
        "BINANCE_TESTNET": "false", "BINANCE_FUTURES_TESTNET": "false", "KI_BOT_ECHTGELD": "JA, MIT ECHTEM GELD",
        "KI_BOT_MAX_AUFTRAG": "100000", "KRYPTO_PILOT2_KAPITAL": "10000", "KI_BOT_ANTEIL": "1"}
def E(m, h): return {"markt": m, "hebel": h, "stop_long": X.kurs[m + "USDT"] * 0.9, "stop_short": X.kurs[m + "USDT"] * 1.1, "stand": "2026-10-13"}
tmp = Path(tempfile.mkdtemp()); zaehler = [0]
# nie die echten Schalter-Dateien anfassen (der Selbsttest läuft auch auf dem PC, wo Cockpit/Telegram mitlesen)
BF.STOP_DATEI = tmp / "STOP"; L.PAUSE_DATEI = tmp / "PAUSE"
def neu_buch(): zaehler[0] += 1; return tmp / f"b{zaehler[0]}.json"
def lauf(ents, env, datei, trocken=False, notaus=False):
    return L.ausfuehren(ents, trocken=trocken, env=env, bestand_datei=datei, notaus=notaus)
def markt_orders(): return [(x[1], x[2].get("side"), float(x[2]["quantity"]), x[2].get("symbol")) for x in X.log if x[0] == "POST" and x[2].get("type") == "MARKET"]
def netto(sym): return L.buch_lesen  # Platzhalter
def mein(datei, modus, m): return L.buch_lesen(datei, modus)["coins"].get(m, 0.0)

# ── Schalter ──
pruefe("Echtgeld nur mit allen Freigaben", L.einstellungen(ECHT)["echtgeld"] and not L.einstellungen({**ECHT, "KRYPTO_PILOT2": ""})["echtgeld"]
       and not L.einstellungen({**ECHT, "BINANCE_FUTURES_TESTNET": "true"})["echtgeld"] and not L.einstellungen({**ECHT, "KI_BOT_ECHTGELD": "ja"})["echtgeld"])
pruefe("fremde Adresse im Echtgeld-Modus wird abgelehnt", L.einstellungen({**ECHT, "PILOT2_SPOT_URL": "https://boese.example"})["fehler"] != "")
# ── Trocken ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d, trocken=True)
pruefe("trocken: nichts gesendet", not markt_orders() and not [x for x in X.log if x[1] == "/sapi/v1/asset/transfer"], markt_orders())
# ── S1: voll long, Gebühr in Coins → Buch netto, Stop passt in den Bestand ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("voll long: Spot gekauft, kein Perp", X.frei["BTC"] + X.gesperrt["BTC"] > 0.08 and X.pos["BTCUSDT"] == 0, (X.frei, X.pos))
pruefe("Buch = Bestand nach Gebühr (in Coins)", abs(mein(d, "testnetz", "BTC") - (X.frei["BTC"] + X.gesperrt["BTC"])) < 1e-9, (L.buch_lesen(d, "testnetz"), X.frei, X.gesperrt))
st = [o for o in X.orders.values() if o.get("typ") == "STOP_LOSS"]
pruefe("Spot-Stop gesetzt (STOP_LOSS = Markt beim Auslösen) über die GANZE Richtung", len(st) == 1 and abs(st[0]["qty"] - mein(d, "testnetz", "BTC")) < 2e-5, st)
pruefe("keine Warnung", not r["warnung"], r["zeilen"])
# ── zweiter Lauf am selben Tag: idempotent (nichts kaufen), Stop ersetzt, nicht doppelt ──
n0 = len(markt_orders()); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("zweiter Lauf: kein neuer Kauf, genau EIN offener Stop", len(markt_orders()) == n0 and sum(o["status"] == "NEW" for o in X.orders.values()) == 1, (markt_orders()[n0:], X.orders))
# ── Echt, Ernte (z=0): Verschieben, marktneutral, Kapital passt (kein -2019) ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte: Pfand verschoben, Spot ≈ −Short (marktneutral), keine Warnung",
       X.fut > 0 and abs((X.frei["BTC"] + X.gesperrt["BTC"]) + X.pos["BTCUSDT"]) * 100000 < 10 and X.pos["BTCUSDT"] < 0 and not r["warnung"], (X.fut, X.frei, X.pos, r["zeilen"]))
pruefe("Ernte: kein Stop", not [o for o in X.orders.values() if o.get("typ")] and not X.algos)
# ── Wechsel auf voll short: Stop nur auf den Richtungsteil ──
r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("voll short: eigene Spot-Coins verkauft, Perp short", mein(d, "echt", "BTC") < 1e-4 and X.pos["BTCUSDT"] < -0.05, (L.buch_lesen(d, "echt"), X.pos))
a = list(X.algos.values())[-1] if X.algos else {}
pruefe("Short-Stop: Menge + reduceOnly, kein closePosition, Menge ≤ Short", a.get("reduceOnly") == "true" and "closePosition" not in a
       and float(a.get("quantity", 9)) <= -X.pos["BTCUSDT"] + 1e-9, a)
# ── B4: z 0 → 0.5 mit Ernte: Perp-Stop darf die Ernte nicht treffen (nur Spot-Stop über die NETTO-Richtung) ──
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); r = lauf([E("BTC", 0.6)], ECHT, d)
spot_ist = X.frei["BTC"] + X.gesperrt["BTC"]; net = spot_ist + X.pos["BTCUSDT"]
st = [o for o in X.orders.values() if o.get("typ") == "STOP_LOSS" and o["status"] == "NEW"]
pruefe("teil long mit Ernte: Spot-Stop nur über die Netto-Richtung, kein Perp-Stop", st and st[0]["qty"] <= net + 2e-5 and not X.algos, (st, net, X.algos))
X.ausloesen("BTCUSDT", st[0]["stop"] - 1 if st else 1)
pruefe("nach Stop-Auslösung: Ernte bleibt abgesichert (|Spot + Perp| klein)", abs((X.frei["BTC"] + X.gesperrt["BTC"]) + X.pos["BTCUSDT"]) * X.kurs["BTCUSDT"] < 15, (X.frei, X.pos))
# ── S3: fremde Coins + ausgelöster Stop → Buch abgezogen, Not-Aus verkauft nie fremde Coins ──
X.reset(); X.frei["BTC"] = 1.0; d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
X.ausloesen("BTCUSDT", 89000.0)
r = lauf([], TEST, d, notaus=True)
pruefe("S3: ausgelöster Stop vom Buch abgezogen, Not-Aus lässt die fremden 1.0 BTC stehen (nur Bot-Rest < Minimum)",
       1.0 - 1e-12 <= X.frei["BTC"] + X.gesperrt["BTC"] < 1.0001 and mein(d, "testnetz", "BTC") < 1e-4, (X.frei, X.gesperrt, r["zeilen"]))
# ── Fremder Auftrag des Nutzers bleibt unberührt ──
X.reset(); X.frei["BTC"] = 0.5; X.next_id += 1; X.orders[X.next_id] = {"id": X.next_id, "symbol": "BTCUSDT", "qty": 0.2, "stop": 50000, "status": "NEW", "typ": "STOP_LOSS"}
X.frei["BTC"] -= 0.2; X.gesperrt["BTC"] += 0.2; fremd = X.next_id; d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d); lauf([E("BTC", 1.0)], TEST, d)
pruefe("fremder Stop-Auftrag des Nutzers nie storniert", X.orders[fremd]["status"] == "NEW")
# ── S2/S7: Not-Aus hat Vorrang vor Pause, Konflikt, fehlendem Deckel ──
for name, env_extra, pause in (("Pause", {}, True), ("ETH-Sparplan", {"ETH_SPARPLAN_BETRAG": "50"}, False), ("ohne Deckel", {"KRYPTO_PILOT2_KAPITAL": ""}, False)):
    X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
    pd = L.PAUSE_DATEI; existierte = pd.exists()
    try:
        if pause: pd.parent.mkdir(parents=True, exist_ok=True); pd.write_text("")
        r = lauf([], {**ECHT, **env_extra, "KI_BOT_STOP": "1"}, d)
    finally:
        if pause and not existierte: pd.unlink()
    pruefe(f"Not-Aus trotz {name}: beide Konten geschlossen", X.pos["BTCUSDT"] == 0 and mein(d, "echt", "BTC") * 100000 < 5 and r["alles_zu"], (X.pos, L.buch_lesen(d, "echt"), r["zeilen"]))
# ── Not-Aus je Konto einzeln: Spot-Fehler verhindert das Schliessen des Perps nicht ──
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
alt_frei = dict(X.frei); X.frei["BTC"] = 0.0  # Spot-Verkauf scheitert (Coins «weg»)
r = lauf([], ECHT, d, notaus=True)
pruefe("Not-Aus: Perp zu, auch wenn Spot-Teil scheitert; ehrliche Meldung", X.pos["BTCUSDT"] == 0, (X.pos, r["zeilen"]))
# ── S4: unklarer Spot-Kauf → gemerkt, am nächsten Lauf geklärt, kein Doppelkauf ──
X.reset(spot_503=True, nachfrage_kaputt=True); d = neu_buch(); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("unklarer Kauf: gemerkt + Warnung", L.buch_lesen(d, "testnetz")["unklar"] and r["warnung"], (L.buch_lesen(d, "testnetz"), r["zeilen"]))
X.nachfrage_kaputt = False; n0 = len(markt_orders()); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("nächster Lauf: geklärt, ins Buch, KEIN zweiter Kauf", not L.buch_lesen(d, "testnetz")["unklar"] and mein(d, "testnetz", "BTC") > 0.08
       and not [o for o in markt_orders()[n0:] if o[1] == "BUY"], (L.buch_lesen(d, "testnetz"), markt_orders()[n0:]))
# ── S5/S9: Futures-Marge fehlt (Testnetz ohne Verschieben) → keine ungesicherte Ernte ──
X.reset(); d = neu_buch(); r = lauf([E("BTC", 0.0)], TEST, d)
pruefe("keine Marge: keine Ernte-Coins ohne Short (netto ≈ 0)", abs((X.frei["BTC"] + X.gesperrt["BTC"]) + X.pos["BTCUSDT"]) * 100000 < 10, (X.frei, X.pos, r["zeilen"]))
# ── Short scheitert nach dem Spot-Kauf → Ernte-Spot zurückverkauft ──
X.reset(perp_fehler=True); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Ernte-Short abgelehnt → Spot zurückverkauft (netto ≈ 0), Warnung", abs((X.frei["BTC"] + X.gesperrt["BTC"]) + X.pos["BTCUSDT"]) * 100000 < 10 and r["warnung"], (X.frei, X.pos, r["zeilen"]))
# ── S6: Kurs schon jenseits des Stops → kein Long ──
X.reset(); d = neu_buch(); e = E("BTC", 1.0); e["stop_long"] = 101000.0; r = lauf([e], TEST, d)
pruefe("Kurs unter Stop → kein Kauf", not [o for o in markt_orders() if o[1] == "BUY"], markt_orders())
e = E("BTC", 1.0); e["stop_long"] = None; X.reset(); r = lauf([e], TEST, neu_buch())
pruefe("kein Stop-Kurs → kein Long, Warnung", not markt_orders() and r["warnung"])
# ── S8: Deckel = Verlustgrenze, kein Nachfüllen mit Nutzer-Geld ──
X.reset(); X.frei["USDT"] = 100000.0; d = neu_buch(); lauf([E("BTC", 1.0)], {**TEST, "KRYPTO_PILOT2_KAPITAL": "2000"}, d)
gekauft = X.frei["BTC"] + X.gesperrt["BTC"]
for o in X.orders.values():
    if o.get("typ") == "STOP_LOSS": o["stop"] = 1.0  # Stop tief, damit er beim Kurssturz nicht auslöst
X.kurs["BTCUSDT"] = 50000.0
lauf([E("BTC", 1.0)], {**TEST, "KRYPTO_PILOT2_KAPITAL": "2000"}, d)
nach = X.frei["BTC"] + X.gesperrt["BTC"]
pruefe("Deckel 2000: nach −50 % kein Nachkauf mit fremdem Geld", gekauft <= 0.02 and nach - gekauft < 0.0011, (gekauft, nach))
# ── abgewählter Markt wird abgebaut ──
X.reset(); d = neu_buch(); lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, d); r = lauf([E("BTC", 1.0)], TEST, d)
pruefe("ETH abgewählt → eigene ETH verkauft", mein(d, "testnetz", "ETH") * 4000 < 5, (L.buch_lesen(d, "testnetz"), r["zeilen"]))
# ── Hebel > 1 bei offener Position → kein neuer Short ──
X.reset(); X.fut = 20000.0; X.pos["BTCUSDT"] = -0.01; X.hebel["BTCUSDT"] = 2; d = neu_buch(); r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("Hebel 2 offen → kein neuer Short, Warnung", X.pos["BTCUSDT"] == -0.01 and r["warnung"], (X.pos, r["zeilen"]))
# ── Not-Aus mitten im Lauf → kein weiterer Aufbau ──
X.reset(); d = neu_buch()
def stop_setzen(): BF.STOP_DATEI.parent.mkdir(parents=True, exist_ok=True); BF.STOP_DATEI.write_text("")
X.nach_order = stop_setzen; existierte = BF.STOP_DATEI.exists()
try:
    r = lauf([E("BTC", 1.0), E("ETH", 1.0)], TEST, d)
finally:
    if not existierte and BF.STOP_DATEI.exists(): BF.STOP_DATEI.unlink()
pruefe("Not-Aus während des Laufs: nach dem ersten Auftrag nichts mehr", len([o for o in markt_orders() if o[1] == "BUY"]) == 1, markt_orders())
# ── Stop abgelehnt → laute Warnung ──
X.reset(stop_fehler=True); r = lauf([E("BTC", 1.0)], TEST, neu_buch())
pruefe("Stop abgelehnt → Warnung «OHNE Stop»", r["warnung"] and any("OHNE Stop" in z or "ohne Stop" in z for z in r["zeilen"]), r["zeilen"])
# ── Rechte / Konflikt / Hedge ──
X.reset(); X.rechte["enableWithdrawals"] = True; r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("Schlüssel mit Auszahlungsrecht → kein Auftrag", not markt_orders() and r["warnung"])
X.reset(); X.rechte["permitsUniversalTransfer"] = False; r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("ohne Universal Transfer → kein Auftrag", not markt_orders() and r["warnung"])
X.reset(hedge=True); r = lauf([E("BTC", 1.0)], ECHT, neu_buch())
pruefe("Hedge-Modus → kein Auftrag", not markt_orders() and r["warnung"])
X.reset(); r = lauf([E("BTC", 1.0)], {**TEST, "CALLS_MODUS": "echtgeld"}, neu_buch())
pruefe("Telegram-Calls aktiv → kein Aufbau", not markt_orders() and r["warnung"])

# ════════ Funde der 2. Prüfung ════════
import time as _t  # noqa: E402
# Not-Aus nach Umschalten: Bestand im Echtgeld-Buch, Schalter stehen jetzt auf Testnetz → trotzdem ECHT geschlossen
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
nur_schluessel = {k: v for k, v in ECHT.items() if k.startswith("PILOT2_")}
r = lauf([], {**nur_schluessel, "KI_BOT_STOP": "1"}, d)
pruefe("Not-Aus nach Ausschalten: Echtgeld-Bestand trotzdem geschlossen", X.pos["BTCUSDT"] == 0 and r["alles_zu"] is True and "echt" in r["modus"], (X.pos, r))
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
r = lauf([], {"PILOT2_SPOT_URL": url, "PILOT2_FUTURES_URL": url, "KI_BOT_STOP": "1"}, d)
pruefe("Not-Aus ohne Echtgeld-Schlüssel: NICHT «alles zu», laute Warnung", r["alles_zu"] is False and r["warnung"] and X.pos["BTCUSDT"] < 0, r["zeilen"])
# Probelauf-Not-Aus: nichts senden, nicht «alles zu»
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); n0 = len(X.log)
r = lauf([], {**ECHT, "KI_BOT_STOP": "1"}, d, trocken=True)
pruefe("Not-Aus trocken: kein Auftrag, alles_zu = None", r["alles_zu"] is None and not [x for x in X.log[n0:] if x[0] in ("POST", "DELETE")], r)
# unklarer Kauf aus einem früheren Lauf → Not-Aus meldet NICHT «alles zu»
X.reset(spot_503=True, nachfrage_kaputt=True); d = neu_buch(); lauf([E("BTC", 1.0)], TEST, d)
r = lauf([], TEST, d, notaus=True)
pruefe("unklarer Kauf offen → Not-Aus nicht «alles zu»", r["alles_zu"] is False and L.hat_bestand(d), r["zeilen"])
# Perp lässt sich im Not-Aus nicht schliessen → Ernte-Spot bleibt als Absicherung, kein nackter Short
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d); X.perp_reduce_fehler = True
r = lauf([], ECHT, d, notaus=True)
spot_ist = X.frei["BTC"] + X.gesperrt["BTC"]
pruefe("Not-Aus: Short bleibt offen → Spot bleibt als Absicherung (netto ≈ 0), nicht «alles zu»",
       X.pos["BTCUSDT"] < 0 and abs(spot_ist + X.pos["BTCUSDT"]) * 100000 < 15 and r["alles_zu"] is False, (X.frei, X.pos, r["zeilen"]))
pruefe("… und das Buch bleibt bestehen (nächster Not-Aus versucht es wieder)", L.hat_bestand(d) and L.buch_lesen(d, "echt")["perp_offen"])
X.perp_reduce_fehler = False; r = lauf([], ECHT, d, notaus=True)
pruefe("zweiter Not-Aus: jetzt alles zu, Buch neu (Startprüfung beim nächsten Einschalten)", r["alles_zu"] is True and X.pos["BTCUSDT"] == 0
       and not L.hat_bestand(d) and not L.buch_lesen(d, "echt")["start"], (X.pos, r["zeilen"], L.buch_lesen(d, "echt")))
# Doppel-Stop: Storno des alten Perp-Stops scheitert → KEIN zweiter Stop
X.reset(); d = neu_buch(); lauf([E("BTC", -1.0)], ECHT, d); vor = len(X.algos); X.algo_del_fehler = True
r = lauf([E("BTC", -1.0)], ECHT, d)
pruefe("alter Perp-Stop nicht löschbar → kein zweiter Stop, Warnung", vor == 1 and len(X.algos) == 1 and r["warnung"], (X.algos, r["zeilen"]))
X.algo_del_fehler = False
# Startprüfung Echtgeld: Konto muss bis auf USDT leer sein
for name, vorher in (("BTC im Spot", lambda: X.frei.update(BTC=0.5)), ("Futures-Guthaben", lambda: setattr(X, "fut", 500.0)),
                     ("alte Pilot-Position + closePosition-Stop", lambda: (X.pos.update(BTCUSDT=-0.01), setattr(X, "fut", 0.0),
                      X.algos.update({999: {"symbol": "BTCUSDT", "side": "BUY", "closePosition": "true", "triggerPrice": "120000"}})))):
    X.reset(); vorher(); d = neu_buch(); r = lauf([E("BTC", 0.5)], ECHT, d)
    pruefe(f"Startprüfung echt ({name}) → kein Auftrag, Warnung", not markt_orders() and r["warnung"] and not L.buch_lesen(d, "echt")["start"], r["zeilen"])
X.reset(); X.pos["BTCUSDT"] = -0.01; X.fut = 2000.0; d = neu_buch(); r = lauf([E("BTC", 0.5)], TEST, d)
pruefe("Startprüfung Testnetz: alte Position → kein Auftrag", not markt_orders() and r["warnung"], r["zeilen"])
# Deckel: USDT des Nutzers ausserhalb des Deckels werden nie benutzt
X.reset(); X.frei["USDT"] = 50000.0; d = neu_buch(); lauf([E("BTC", 0.0)], {**ECHT, "KRYPTO_PILOT2_KAPITAL": "3000"}, d)
pruefe("Deckel 3000 bei 50000 USDT: höchstens 3000 im Spiel", 50000 - X.frei["USDT"] <= 3000 + 1e-6, X.frei)
# Unklarer Short: tatsächlich ausgeführt → kein Rückverkauf; nicht ausgeführt → Rückverkauf
X.reset(perp_503="ja"); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
spot_ist = X.frei["BTC"] + X.gesperrt["BTC"]
pruefe("Short-Antwort unklar, aber ausgeführt → Ernte bleibt (netto ≈ 0, Spot > 0), als ausgeführt erkannt", spot_ist > 0.01
       and abs(spot_ist + X.pos["BTCUSDT"]) * 100000 < 15 and any("zeigt AUSGEFÜHRT" in z for z in r["zeilen"]), (X.frei, X.pos, r["zeilen"]))
X.reset(perp_503="nein"); d = neu_buch(); r = lauf([E("BTC", 0.0)], ECHT, d)
pruefe("Short-Antwort unklar, NICHT ausgeführt → Spot zurückverkauft (netto ≈ 0)", X.pos["BTCUSDT"] == 0
       and (X.frei["BTC"] + X.gesperrt["BTC"]) * 100000 < 15, (X.frei, X.pos, r["zeilen"]))
# perp_offen bleibt im Buch, auch ohne Coins
X.reset(); d = neu_buch(); lauf([E("BTC", 0.0)], ECHT, d)
b = json.loads(d.read_text()); b["echt"]["coins"] = {}; d.write_text(json.dumps(b))
pruefe("offene Perp-Position allein zählt als Bestand (alter Pilot bleibt gesperrt)", L.hat_bestand(d))
# BTC-Futures-Minimum 100 USDT: zu kleine Ernte wird gar nicht erst begonnen (kein ungesicherter Spot)
X.reset(); X.frei["USDT"] = 150.0; d = neu_buch(); r = lauf([E("BTC", 0.0)], {**ECHT, "KRYPTO_PILOT2_KAPITAL": "150"}, d)
pruefe("Ernte unter dem BTC-Futures-Minimum → kein Spot-Kauf, kein Short", not markt_orders() and X.pos["BTCUSDT"] == 0, (markt_orders(), r["zeilen"]))
# −2013: «Auftrag existiert nicht» erst nach einem Tag als «nie ausgeführt» abschliessen
X.reset(); X.fut = 20000.0; d = neu_buch(); lauf([E("BTC", 0.0)], TEST, d); n_vor = len(markt_orders())
b = json.loads(d.read_text())
b["testnetz"]["unklar"] = [{"markt": "BTC", "sym": "BTCUSDT", "cid": "alt", "seite": "BUY", "zeit": int(_t.time()) - 2 * 86400},
                           {"markt": "ETH", "sym": "ETHUSDT", "cid": "jung", "seite": "BUY", "zeit": int(_t.time())}]
d.write_text(json.dumps(b)); r = lauf([E("BTC", 0.0), E("ETH", 0.0)], TEST, d)
u = L.buch_lesen(d, "testnetz")["unklar"]
pruefe("−2013: alter Eintrag abgeschlossen, junger bleibt + Markt gesperrt", [x["cid"] for x in u] == ["jung"]
       and not [o for o in markt_orders() if o[3] == "ETHUSDT"] and n_vor > 0, (u, r["zeilen"]))
# ── Bot-Schalter + alter Pilot + schliessen_alle ──
import pilot as PI  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ki_bot"))
import signale as SG  # noqa: E402
SG.push = lambda *a, **k: None  # der Selbsttest läuft täglich auf dem PC → nie eine echte Nachricht senden
PI.LOGBUCH = tmp / "pilot-log.json"; L.BESTAND = tmp / "schalter.json"; L.PROTOKOLL = tmp / "protokoll.json"
alt = dict(os.environ)
voll = dict(E("BTC", 1.0), symbol="BTCUSDT", kurs=100000.0, schnitt=90000.0, trend_tage=150, schwankung=0.4,
            mvrv={"tag": "2026-10-12", "wert": 2.0}, bremse=None, detektor={"ok": True, "skill_2j": 0.8, "einbruch_1j": -0.2})
try:
    # nur die Test-Werte: Schalter vom PC (ETH-Sparplan, Calls, Echtgeld …) dürfen den Selbsttest nicht beeinflussen
    os.environ.clear(); os.environ.update({k: v for k, v in alt.items() if k.upper() in ("PATH", "SYSTEMROOT", "TEMP", "TMP", "HOME", "USERPROFILE")})
    os.environ.update(TEST); X.reset()
    PI.handeln([voll], "Lage", trocken=False)
    pruefe("KRYPTO_PILOT2=an: Bot kauft über Spot, kein Futures-Auftrag", any(o[0] == "/api/v3/order" for o in markt_orders()) and not X.pos["BTCUSDT"])
    os.environ.pop("KRYPTO_PILOT2")
    pruefe("Pilot 2.0 aus, aber Bestand da → alter Pilot handelt nicht", PI.handeln([voll], "Lage", trocken=True) == 3 and L.hat_bestand())
    def alter_pilot(e, symbol, gewicht):  # alter Pilot: Konto ist nach dem P2-Not-Aus leer
        e["broker"] = {"position": X.pos[symbol]}; return []
    zu, zeilen = PI.schliessen_alle(alter_pilot)
    pruefe("Cockpit/Telegram-Not-Aus (schliessen_alle) schliesst Pilot 2.0", zu and mein(L.BESTAND, "testnetz", "BTC") * 100000 < 5, zeilen)
    X.reset(); lauf([E("BTC", 0.0)], ECHT, L.BESTAND); X.perp_reduce_fehler = True
    def anderes_konto(e, symbol, gewicht):  # alter Pilot im (leeren) Testnetz-Konto
        e["broker"] = {"position": 0.0}; return []
    zu, zeilen = PI.schliessen_alle(anderes_konto, env={k: v for k, v in ECHT.items() if k.startswith("PILOT2_")})
    pruefe("schliessen_alle: Pilot 2.0 nicht ganz zu → NICHT «alles zu»", zu is False and X.pos["BTCUSDT"] < 0, zeilen)
    X.perp_reduce_fehler = False
    zu, zeilen = PI.schliessen_alle(alter_pilot, env={k: v for k, v in ECHT.items() if k.startswith("PILOT2_")})
    pruefe("schliessen_alle: zweiter Versuch schliesst", zu is True and X.pos["BTCUSDT"] == 0, zeilen)
finally:
    os.environ.clear(); os.environ.update(alt)
pruefe("Sperre: ohne FREIGEGEBEN ist KRYPTO_PILOT2=an wirkungslos", SPERRE_WIRKT)
print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen"); sys.exit(1 if n_f else 0)
