#!/usr/bin/env python3
"""Tests für den Krypto-Bot (ohne Netz, ohne pytest): python3 tools/trading/krypto_bot/test_krypto.py"""
from __future__ import annotations

import json
import math
import random
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import broker_alpaca as B  # noqa: E402
import krypto as KR  # noqa: E402
import analyse as AN  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def markt(n, vol, seed=1):
    rnd, p = random.Random(seed), [100.0]
    for _ in range(n):
        p.append(p[-1] * math.exp(rnd.gauss(0, vol / math.sqrt(365))))
    return p


# Regel
q_ruhig, _ = KR.quote(markt(400, 0.20), "schwankungsziel")
q_wild, info = KR.quote(markt(400, 1.20), "schwankungsziel")
pruefe("ruhiger Markt: voll investiert", q_ruhig == 1.0, q_ruhig)
pruefe("wilder Markt: deutlich weniger", 0.2 < q_wild < 0.5, (q_wild, info))
pruefe("halten = 100 %", KR.quote([1, 2], "halten")[0] == 1.0)
steigend = [100 + i for i in range(250)]
pruefe("trend200 steigend = 100 %", KR.quote(steigend, "trend200")[0] == 1.0)
pruefe("trend200 fallend = 0 %", KR.quote(steigend[::-1], "trend200")[0] == 0.0)
pruefe("zu wenig Kurse = 0 %", KR.quote([100, 101, 99], "schwankungsziel")[0] == 0.0)

# Kausalität: der heutige, laufende Tag zählt nicht
jetzt = datetime(2026, 10, 4, 12, tzinfo=timezone.utc)
reihe = [("2026-10-02", 1.0), ("2026-10-03", 2.0), ("2026-10-04", 999.0)]
pruefe("laufender Tag weggelassen", KR.abgeschlossen(reihe, jetzt)[-1] == ("2026-10-03", 2.0))

# Analyse: Gegenprobe und Kostenlogik
R = {"BTC-USD": [0.0, 0.1, -0.1, 0.1]}
W = [{"BTC-USD": 1.0}] * 4
x = AN.lauf(W, R, 1, 4)
pruefe("Halten: einmal Einstiegskosten, dann frei", abs(x[0] - (0.1 - AN.KOSTEN)) < 1e-12 and abs(x[1] + 0.1) < 1e-12, x)
ziel = {"BTC-USD": 0.5}
x = AN.lauf([ziel, ziel, ziel, ziel], R, 1, 4)
pruefe("Gewichte laufen zwischen Handelstagen frei", abs(x[1] - (0.5 * 1.1 / 1.05) * -0.1) < 1e-12, x)

# Futures-Mechanik
import futures as FU
c = [100.0, 100.0, 100.0, 100.0]
h = [100.0, 101.0, 101.0, 101.0]
l = [100.0, 99.0, 60.0, 99.0]
x, liq, geb, fund = FU.lauf([3.0] * 4, h, l, c, 1, 4, 0.0)
pruefe("Futures: 3× Long, Tagestief −40 % → Konto weg", liq == 2, (liq, x))
x, liq, geb, fund = FU.lauf([1.0] * 4, h, l, c, 1, 4, 0.0001)
pruefe("Futures: 1× Long übersteht −40 %, zahlt Funding", liq is None and fund > 0 and abs(fund - 3 * 0.0003) < 1e-9, (liq, fund))
x, liq, geb, fund = FU.lauf([-1.0] * 4, h, l, c, 1, 4, 0.0001)
pruefe("Futures: Short bekommt Funding", fund < 0, fund)
c2 = [100.0, 110.0, 121.0]
x, liq, _, _ = FU.lauf([0.0, 1.0, 1.0], [100, 110, 121], [100, 110, 121], c2, 1, 3, 0.0)
pruefe("Futures: Signal gilt erst ab dem Folgetag", abs(x[0]) < 1e-12 and x[1] > 0.09, x)

# Broker gegen nachgebauten Alpaca-Server
class Fake(BaseHTTPRequestHandler):
    log, positionen = [], []

    def _a(self, o):
        b = json.dumps(o).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        Fake.log.append(("GET", self.path))
        self._a({"equity": "10000", "cash": "10000", "crypto_status": "ACTIVE"} if self.path == "/v2/account" else Fake.positionen)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        Fake.log.append(("POST", self.path, json.loads(self.rfile.read(n))))
        self._a({"id": "a1", "status": "accepted"})

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()
tmp = Path(tempfile.mkdtemp())
B.PROTOKOLL = tmp / "broker.json"
env = {"ALPACA_KEY_ID": "ID-1", "ALPACA_SECRET_KEY": "GEHEIM-9", "ALPACA_BASIS_URL": f"http://127.0.0.1:{srv.server_port}", "KI_BOT_MAX_AUFTRAG": "1000"}
e = {"strategie": "schwankungsziel", "quote": 0.6}
KR.ausfuehren(e, trocken=True, env=env)
pruefe("trocken: kein Auftrag", not [x for x in Fake.log if x[0] == "POST"])
plan = KR.ausfuehren(e, env=env)
posts = [x for x in Fake.log if x[0] == "POST"]
pruefe("Kauf BTC/USD, gtc, höchstens Max-Auftrag", posts and posts[0][2]["symbol"] == "BTC/USD" and posts[0][2]["time_in_force"] == "gtc"
       and float(posts[0][2]["notional"]) <= 1000, posts)
Fake.positionen = [{"symbol": "BTCUSD", "market_value": "3000"}]
KR.ausfuehren({"strategie": "schwankungsziel", "quote": 0.0}, env=env)
verkauf = [x for x in Fake.log if x[0] == "POST"][-1][2]
pruefe("Ziel 0 → verkauft, nie mehr als vorhanden", verkauf["side"] == "sell" and float(verkauf["notional"]) <= 1000, verkauf)
vorher = len([x for x in Fake.log if x[0] == "POST"])
KR.ausfuehren(e, env=dict(env, KI_BOT_STOP="1"))
pruefe("Not-Aus: keine Aufträge", len([x for x in Fake.log if x[0] == "POST"]) == vorher)
prot = B.PROTOKOLL.read_text()
pruefe("keine Schlüssel im Protokoll", "GEHEIM-9" not in prot and "ID-1" not in prot)
pruefe("Papier ist Standard", B.einstellungen({"ALPACA_PAPER": "false"})["echtgeld"] is False)
srv.shutdown()

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
