#!/usr/bin/env python3
"""Tests für den Binance-Anschluss (ohne Netz): python3 tools/trading/krypto_bot/test_binance.py"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import broker_binance as BB  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


GEHEIM = "geheim-123"
REGELN = {"step": 0.00001, "min_qty": 0.00001, "min_notional": 5.0}
cfg = BB.einstellungen({"BINANCE_API_KEY": "k", "BINANCE_API_SECRET": "s"})
pruefe("Testnetz ist Standard", cfg["basis"] == BB.TESTNETZ_URL and not cfg["echtgeld"])
pruefe("echtes Geld nur doppelt", not BB.einstellungen({"BINANCE_TESTNET": "false"})["echtgeld"]
       and BB.einstellungen({"BINANCE_TESTNET": "false", "KI_BOT_ECHTGELD": BB.ECHTGELD_SATZ})["echtgeld"])
pruefe("Paar aus Quote", BB.einstellungen({"KRYPTO_QUOTE": "usdc"})["symbol"] == "BTCUSDC")

konto = {"balances": [{"asset": "USDT", "free": "10000", "locked": "0"}, {"asset": "BTC", "free": "0", "locked": "0"}]}
a = BB.plane(cfg, konto, 50000.0, REGELN, 0.6)
pruefe("Kauf: Anteil 50 % × Ziel 60 %, gedeckelt auf 1000", a["seite"] == "buy" and a["quote_betrag"] == 1000.0 and a["soll"] == 3000.0, a)
konto2 = {"balances": [{"asset": "USDT", "free": "5000", "locked": "0"}, {"asset": "BTC", "free": "0.1", "locked": "0"}]}
a = BB.plane(cfg, konto2, 50000.0, REGELN, 0.0)
pruefe("Verkauf: Menge auf Schrittweite abgerundet, max 1000", a["seite"] == "sell" and a["menge"] == 0.02 and a["ca_betrag"] <= 1000, a)
konto3 = {"balances": [{"asset": "USDT", "free": "0", "locked": "0"}, {"asset": "BTC", "free": "0.0003", "locked": "0"}]}
pruefe("unter Mindestbetrag: nichts", BB.plane(cfg, konto3, 50000.0, REGELN, 0.0) is None)
konto4 = {"balances": [{"asset": "USDT", "free": "30", "locked": "9970"}, {"asset": "BTC", "free": "0", "locked": "0"}]}
a = BB.plane(cfg, konto4, 50000.0, REGELN, 1.0)
pruefe("nie mehr kaufen als freies Geld", a["quote_betrag"] == 30.0, a)
konto5 = {"balances": [{"asset": "USDT", "free": "0", "locked": "0"}, {"asset": "BTC", "free": "0.001", "locked": "0.099"}]}
a = BB.plane(cfg, konto5, 50000.0, REGELN, 0.0)
pruefe("nie mehr verkaufen als frei", a is None or a["menge"] <= 0.001, a)


class Fake(BaseHTTPRequestHandler):
    log, rechte = [], {"enableWithdrawals": False, "enableSpotAndMarginTrading": True}

    def _a(self, o, code=200):
        b = json.dumps(o).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b)

    def _signatur_ok(self, q):
        roh, _, sig = q.rpartition("&signature=")
        return sig == hmac.new(GEHEIM.encode(), roh.encode(), hashlib.sha256).hexdigest()

    def do_GET(self):
        pfad, _, q = self.path.partition("?")
        Fake.log.append(("GET", pfad, q, self.headers.get("X-MBX-APIKEY")))
        if pfad == "/api/v3/account":
            if not self._signatur_ok(q):
                return self._a({"code": -1022}, 401)
            return self._a({"canTrade": True, "balances": konto["balances"]})
        if pfad == "/sapi/v1/account/apiRestrictions":
            return self._a(Fake.rechte)
        if pfad == "/api/v3/ticker/price":
            return self._a({"symbol": "BTCUSDT", "price": "50000.00"})
        if pfad == "/api/v3/exchangeInfo":
            return self._a({"symbols": [{"status": "TRADING", "filters": [
                {"filterType": "LOT_SIZE", "stepSize": "0.00001000", "minQty": "0.00001000"},
                {"filterType": "MARKET_LOT_SIZE", "stepSize": "0.00000000", "minQty": "0"},
                {"filterType": "NOTIONAL", "minNotional": "5.00000000"}]}]})
        self._a({}, 404)

    def do_POST(self):
        pfad, _, q = self.path.partition("?")
        Fake.log.append(("POST", pfad, q, self._signatur_ok(q)))
        self._a({"orderId": 7, "status": "FILLED"})

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
prot = []
env = {"BINANCE_API_KEY": "SCHLUESSEL-X", "BINANCE_API_SECRET": GEHEIM, "BINANCE_BASIS_URL": f"http://127.0.0.1:{srv.server_port}"}
e = {"strategie": "schwankungsziel", "quote": 0.6}
BB.ausfuehren(e, trocken=True, env=env, protokolliere=prot.append)
pruefe("trocken: kein Auftrag", not [x for x in Fake.log if x[0] == "POST"])
BB.ausfuehren(e, env=env, protokolliere=prot.append)
posts = [x for x in Fake.log if x[0] == "POST"]
q = dict(urllib.parse.parse_qsl(posts[0][2])) if posts else {}
pruefe("Marktauftrag mit gültiger Signatur", posts and posts[0][3] and q.get("type") == "MARKET" and q.get("side") == "BUY"
       and q.get("quoteOrderQty") == "1000.00" and q.get("symbol") == "BTCUSDT", q)
pruefe("Schlüssel nur im Header", all(x[3] == "SCHLUESSEL-X" for x in Fake.log if x[0] == "GET" and x[1] == "/api/v3/account"))
pruefe("keine Schlüssel im Protokoll", GEHEIM not in json.dumps(prot) and "SCHLUESSEL-X" not in json.dumps(prot))
pruefe("Testnetz: Rechte nicht abgefragt", not [x for x in Fake.log if x[1] == "/sapi/v1/account/apiRestrictions"])
vorher = len(posts)
echt = dict(env, BINANCE_TESTNET="false", KI_BOT_ECHTGELD=BB.ECHTGELD_SATZ)
Fake.rechte = {"enableWithdrawals": True}
BB.ausfuehren(e, env=echt, protokolliere=prot.append)
pruefe("Echtgeld + Auszahlungsrecht: verweigert", len([x for x in Fake.log if x[0] == "POST"]) == vorher and "Auszahlungen" in prot[-1]["hinweis"])
Fake.rechte = {"enableWithdrawals": False}
BB.ausfuehren(e, env=echt, protokolliere=prot.append)
pruefe("Echtgeld + nur Spot: handelt", len([x for x in Fake.log if x[0] == "POST"]) == vorher + 1 and prot[-1]["modus"] == "ECHTGELD")
vorher = len([x for x in Fake.log if x[0] == "POST"])
BB.ausfuehren(e, env=dict(env, KI_BOT_STOP="1"), protokolliere=prot.append)
pruefe("Not-Aus: keine Aufträge", len([x for x in Fake.log if x[0] == "POST"]) == vorher)
pruefe("ohne Schlüssel: nichts", BB.ausfuehren(e, env={}, protokolliere=prot.append) == [])
import urllib.error as UE
class Gesperrt(BB.Binance):
    def konto(self):
        raise UE.HTTPError("x", 451, "", {}, None)
BB.ausfuehren(e, env=env, client=Gesperrt(BB.einstellungen(env)), protokolliere=prot.append)
pruefe("HTTP 451 klar gemeldet", "451" in prot[-1]["hinweis"] and "Standort" in prot[-1]["hinweis"], prot[-1])
srv.shutdown()
print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
